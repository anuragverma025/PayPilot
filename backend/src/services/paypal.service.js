import { config } from '../config/index.js';

let cachedToken = null;
let tokenExpiresAt = 0;
let mockTransport = null;

export class PayPalService {
  /**
   * Check whether real PayPal Sandbox credentials are configured
   */
  static isConfigured() {
    const { clientId, clientSecret } = config.paypal;
    if (!clientId || !clientSecret) return false;
    const cleanId = String(clientId).trim();
    const cleanSecret = String(clientSecret).trim();
    if (cleanId === '' || cleanSecret === '') return false;
    if (cleanId.includes('your_paypal') || cleanSecret.includes('your_paypal')) return false;
    if (cleanId.includes('your_') || cleanSecret.includes('your_')) return false;
    return true;
  }

  /**
   * Set mock transport for automated test isolation
   */
  static setMockTransport(transport) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock transport cannot be used in production.');
    }
    mockTransport = transport;
  }

  /**
   * Reset mock transport
   */
  static resetMockTransport() {
    mockTransport = null;
    cachedToken = null;
    tokenExpiresAt = 0;
  }

  /**
   * Fetch OAuth 2.0 access token from PayPal Sandbox
   */
  static async getAccessToken() {
    if (mockTransport?.getAccessToken) {
      return mockTransport.getAccessToken();
    }

    if (!this.isConfigured()) {
      const error = new Error('PayPal credentials missing or unconfigured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env.');
      error.code = 'PAYPAL_CONFIG_ERROR';
      error.status = 503;
      throw error;
    }

    // Reuse non-expired token
    if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
      return cachedToken;
    }

    const { clientId, clientSecret, baseUrl } = config.paypal;
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const error = new Error(`PayPal OAuth authentication failed (HTTP ${res.status}): ${errText}`);
      error.code = 'PAYPAL_AUTH_ERROR';
      error.status = 502;
      throw error;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return cachedToken;
  }

  /**
   * Build the PayPal Orders v2 API request body for a given internal order.
   * Extracted as a pure function so the payload structure can be unit-tested
   * independently of the live PayPal network call.
   *
   * @param {object} order - Internal order document with product, quantity, currency, buyer fields.
   * @returns {object} PayPal Orders v2 create-order request body.
   */
  static buildCreateOrderPayload(order) {
    const unitAmount = Number(order.product.unitPrice).toFixed(2);
    // Recompute item_total from unitAmount × quantity to match PayPal's own server-side validation.
    // PayPal independently checks: unit_amount × quantity === item_total (to 2 decimal places).
    // Using order.total directly can diverge by floating-point rounding; recomputing ensures consistency.
    const itemTotal = (parseFloat(unitAmount) * order.quantity).toFixed(2);
    // amount.value must also equal item_total (no tax/shipping in sandbox demo).
    const totalAmount = itemTotal;

    const purchaseUnit = {
      reference_id: order.orderNumber,
      custom_id: order._id?.toString() || order.orderNumber,
      description: `${order.product.name} (Qty: ${order.quantity})`.substring(0, 127),
      amount: {
        currency_code: order.currency,
        value: totalAmount,
        breakdown: {
          item_total: {
            currency_code: order.currency,
            value: itemTotal
          }
        }
      },
      items: [
        {
          name: order.product.name.substring(0, 127),
          unit_amount: {
            currency_code: order.currency,
            value: unitAmount
          },
          quantity: order.quantity.toString(),
          category: 'PHYSICAL_GOODS'
        }
      ]
    };

    // Configure shipping recipient name and order-specific delivery address.
    // Recipient name precedence: order.shippingAddress.recipientName -> order.buyer.name -> ''
    const recipientName =
      order.shippingAddress?.recipientName?.trim() || order.buyer?.name?.trim() || '';
    const addr = order.shippingAddress;
    const hasAddress = Boolean(addr?.addressLine1 && String(addr.addressLine1).trim().length > 0);

    if (recipientName || hasAddress) {
      purchaseUnit.shipping = {};
      if (recipientName) {
        purchaseUnit.shipping.name = {
          full_name: recipientName.substring(0, 300)
        };
      }
      if (hasAddress) {
        purchaseUnit.shipping.address = {
          address_line_1: String(addr.addressLine1).trim().substring(0, 300),
          ...(addr.addressLine2 && String(addr.addressLine2).trim().length > 0
            ? { address_line_2: String(addr.addressLine2).trim().substring(0, 300) }
            : {}),
          admin_area_2: addr.city ? String(addr.city).trim().substring(0, 120) : '',
          admin_area_1: addr.state ? String(addr.state).trim().substring(0, 120) : '',
          postal_code: addr.postalCode ? String(addr.postalCode).trim().substring(0, 20) : '',
          country_code: addr.countryCode ? String(addr.countryCode).trim().substring(0, 2).toUpperCase() : 'US'
        };
      }
    }

    return {
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        brand_name: 'PayPilot AI',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW'
      }
    };
  }

  /**
   * Create PayPal Sandbox Order (POST /v2/checkout/orders)
   */
  static async createOrder(order) {
    if (mockTransport?.createOrder) {
      return mockTransport.createOrder(order);
    }

    const token = await this.getAccessToken();
    const { baseUrl } = config.paypal;

    const payload = this.buildCreateOrderPayload(order);
    const { value: totalAmount, breakdown } = payload.purchase_units[0].amount;
    const itemTotal = breakdown.item_total.value;
    const unitAmount = payload.purchase_units[0].items[0].unit_amount.value;

    const shipping = payload.purchase_units[0].shipping;
    console.log(`[PayPal Service] createOrder shipping: orderRef=${order._id || order.orderNumber}, recipient=${shipping?.name?.full_name || '(none)'}, hasAddress=${Boolean(shipping?.address)}, country=${shipping?.address?.country_code || 'N/A'}`);

    // Log the amounts we are sending so mismatches are visible in backend output
    console.log(`[PayPal Service] createOrder payload amounts: unitAmount=${unitAmount}, qty=${order.quantity}, itemTotal=${itemTotal}, totalAmount=${totalAmount}, currency=${order.currency}`);

    const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const debugId = res.headers.get('paypal-debug-id');
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Log PayPal's validation details without exposing tokens or secrets
      console.error(`[PayPal Service] createOrder failed: HTTP ${res.status} | debug_id=${debugId} | name=${data.name} | message=${data.message}`);
      if (Array.isArray(data.details) && data.details.length > 0) {
        console.error('[PayPal Service] createOrder validation details:', JSON.stringify(data.details));
      }
      const error = new Error(
        data.message || `PayPal order creation failed with status HTTP ${res.status}`
      );
      error.code = data.name || 'PAYPAL_ORDER_CREATION_FAILED';
      error.details = data.details || [];
      error.debugId = debugId;
      error.status = res.status >= 500 ? 502 : 400;
      throw error;
    }

    const approveLink = data.links?.find((l) => l.rel === 'approve')?.href;
    console.log(`[PayPal Service] createOrder success: PayPal Order ID=${data.id}, status=${data.status}, debug_id=${debugId}`);
    if (approveLink) {
      console.log(`[PayPal Service] approve link host: ${new URL(approveLink).origin}${new URL(approveLink).pathname}`);
    }
    return data;
  }

  /**
   * Capture PayPal Sandbox Order (POST /v2/checkout/orders/{id}/capture)
   */
  static async captureOrder(paypalOrderId) {
    if (mockTransport?.captureOrder) {
      return mockTransport.captureOrder(paypalOrderId);
    }

    const token = await this.getAccessToken();
    const { baseUrl } = config.paypal;

    const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({})
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(
        data.message || `PayPal order capture failed with status HTTP ${res.status}`
      );
      error.code = data.name || 'PAYPAL_CAPTURE_FAILED';
      error.details = data.details || [];
      error.status = res.status >= 500 ? 502 : 400;
      throw error;
    }

    return data;
  }

  /**
   * Get PayPal Order Details (GET /v2/checkout/orders/{id})
   */
  static async getOrderDetails(paypalOrderId) {
    if (mockTransport?.getOrderDetails) {
      return mockTransport.getOrderDetails(paypalOrderId);
    }

    const token = await this.getAccessToken();
    const { baseUrl } = config.paypal;

    const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.message || 'Failed to fetch PayPal order status');
      error.code = data.name || 'PAYPAL_GET_ORDER_FAILED';
      error.status = res.status;
      throw error;
    }

    return data;
  }

  /**
   * Rigorous server-side verification of PayPal capture response
   */
  static verifyCaptureResult(order, captureResult) {
    if (!captureResult) {
      const error = new Error('No capture data received from PayPal.');
      error.code = 'EMPTY_CAPTURE_RESPONSE';
      error.status = 400;
      throw error;
    }

    // Top-level status check
    if (captureResult.status !== 'COMPLETED') {
      const error = new Error(
        `PayPal order status is '${captureResult.status}', expected 'COMPLETED'.`
      );
      error.code = 'PAYMENT_NOT_COMPLETED';
      error.status = 400;
      throw error;
    }

    // Purchase unit & capture object extraction
    const unit = captureResult.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];

    if (!capture) {
      const error = new Error('No payments/captures object present in PayPal response.');
      error.code = 'NO_CAPTURE_OBJECT';
      error.status = 400;
      throw error;
    }

    if (capture.status !== 'COMPLETED') {
      const error = new Error(
        `PayPal capture record status is '${capture.status}', expected 'COMPLETED'.`
      );
      error.code = 'CAPTURE_NOT_COMPLETED';
      error.status = 400;
      throw error;
    }

    // Amount & Currency verification against authoritative database order
    const capturedCurrency = capture.amount?.currency_code;
    const capturedValue = parseFloat(capture.amount?.value || '0');
    const expectedValue = parseFloat(Number(order.total).toFixed(2));

    if (capturedCurrency !== order.currency) {
      const error = new Error(
        `Payment currency mismatch: captured '${capturedCurrency}' but expected '${order.currency}'.`
      );
      error.code = 'PAYMENT_CURRENCY_MISMATCH';
      error.status = 400;
      throw error;
    }

    if (Math.abs(capturedValue - expectedValue) > 0.01) {
      const error = new Error(
        `Payment amount mismatch: captured ${capturedValue} but expected ${expectedValue}.`
      );
      error.code = 'PAYMENT_AMOUNT_MISMATCH';
      error.status = 400;
      throw error;
    }

    return {
      isValid: true,
      captureId: capture.id,
      capturedAmount: capturedValue,
      capturedCurrency,
      payer: captureResult.payer,
      shippingAddress: this.extractShippingAddress(captureResult)
    };
  }

  /**
   * Safely extract and normalize authoritative shipping destination from PayPal capture or order details.
   * Returns null if no valid shipping address data is present.
   */
  static extractShippingAddress(paypalData) {
    if (!paypalData) return null;

    // Check purchase_units[0].shipping or direct shipping
    const shipping = paypalData.purchase_units?.[0]?.shipping || paypalData.shipping;
    if (!shipping) return null;

    const address = shipping.address;
    if (!address || !address.address_line_1 || String(address.address_line_1).trim().length === 0) {
      return null;
    }

    const recipientName = shipping.name?.full_name ? String(shipping.name.full_name).trim() : '';

    return {
      recipientName: recipientName.substring(0, 300),
      addressLine1: String(address.address_line_1).trim().substring(0, 300),
      addressLine2: address.address_line_2 ? String(address.address_line_2).trim().substring(0, 300) : '',
      city: address.admin_area_2 ? String(address.admin_area_2).trim().substring(0, 120) : '',
      state: address.admin_area_1 ? String(address.admin_area_1).trim().substring(0, 120) : '',
      postalCode: address.postal_code ? String(address.postal_code).trim().substring(0, 20) : '',
      countryCode: (address.country_code ? String(address.country_code).trim().substring(0, 2) : 'US').toUpperCase(),
      source: 'PAYPAL_TRANSACTION'
    };
  }
}
