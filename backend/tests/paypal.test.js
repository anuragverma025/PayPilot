import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { PayPalService } from '../src/services/paypal.service.js';
import { OrderService } from '../src/services/order.service.js';

describe('PayPal Sandbox Checkout & Order Verification', () => {
  beforeEach(() => {
    PayPalService.resetMockTransport();
    OrderService.clearMemoryOrders();
  });

  afterEach(() => {
    PayPalService.resetMockTransport();
    OrderService.clearMemoryOrders();
  });

  it('1. Calculates prices strictly on the server and rejects spoofed client amounts', async () => {
    // Attempt to spoof price and total by sending price: 1 and total: 2
    const res = await request(app)
      .post('/api/orders/draft')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 2,
        price: 1, // Spoofed!
        total: 2  // Spoofed!
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const draft = res.body.data;
    // lap-lenovo-e14-g5 has priceUSD = 660. For qty = 2, total must be 1320
    expect(draft.quantity).toBe(2);
    expect(draft.product.unitPrice).toBe(660);
    expect(draft.subtotal).toBe(1320);
    expect(draft.total).toBe(1320);
    expect(draft.status).toBe('PENDING_APPROVAL');
    expect(draft.isPaid).toBe(false);
  });

  it('2. Detects missing or invalid PayPal credentials when creating order', async () => {
    // Mock transport unconfigured error simulation
    PayPalService.setMockTransport({
      createOrder: () => {
        const error = new Error('PayPal credentials missing or unconfigured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env.');
        error.code = 'PAYPAL_CONFIG_ERROR';
        error.status = 503;
        throw error;
      }
    });

    const res = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PAYPAL_CONFIG_ERROR');
  });

  it('3. Rejects order creation without explicit buyer approval', async () => {
    const res = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: false
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('4. Handles PayPal order creation failure gracefully and records timeline error', async () => {
    PayPalService.setMockTransport({
      createOrder: () => {
        const error = new Error('PayPal Sandbox API refused order creation (UNPROCESSABLE_ENTITY)');
        error.code = 'UNPROCESSABLE_ENTITY';
        error.status = 400;
        throw error;
      }
    });

    const res = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('PayPal Sandbox API refused');
  });

  it('5. Successfully captures PayPal order and verifies amount & currency on server', async () => {
    const mockPaypalOrderId = 'PAYPAL-MOCK-ORD-123';
    const mockCaptureId = 'CAPTURE-MOCK-999';

    // Mock create order
    PayPalService.setMockTransport({
      createOrder: (order) => ({
        id: mockPaypalOrderId,
        status: 'CREATED',
        links: [{ href: 'https://sandbox.paypal.com/checkout', rel: 'approve' }]
      }),
      captureOrder: (paypalOrderId) => ({
        id: paypalOrderId,
        status: 'COMPLETED',
        purchase_units: [
          {
            reference_id: 'REF-1',
            payments: {
              captures: [
                {
                  id: mockCaptureId,
                  status: 'COMPLETED',
                  amount: {
                    currency_code: 'USD',
                    value: '660.00' // Matches lap-lenovo-e14-g5 (660 * 1)
                  }
                }
              ]
            }
          }
        ],
        payer: {
          payer_id: 'PAYER-XYZ-1',
          email_address: 'sb-buyer@example.com',
          name: { given_name: 'Test', surname: 'Buyer' }
        }
      })
    });

    // 1. Create order
    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    expect(createRes.status).toBe(200);
    const { orderId, paypalOrderId } = createRes.body.data;
    expect(paypalOrderId).toBe(mockPaypalOrderId);

    // 2. Capture and verify order
    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({
        orderId,
        paypalOrderId
      });

    expect(captureRes.status).toBe(200);
    expect(captureRes.body.success).toBe(true);
    expect(captureRes.body.data.verified).toBe(true);

    const verifiedOrder = captureRes.body.data.order;
    expect(verifiedOrder.status).toBe('COMPLETED');
    expect(verifiedOrder.isPaid).toBe(true);
    expect(verifiedOrder.paypalCaptureId).toBe(mockCaptureId);
    expect(verifiedOrder.paidAt).toBeTruthy();
    expect(verifiedOrder.payer.payerId).toBe('PAYER-XYZ-1');
  });

  it('6. Rejects capture when amount or currency is tampered/mismatched', async () => {
    const mockPaypalOrderId = 'PAYPAL-MISMATCH-123';

    PayPalService.setMockTransport({
      createOrder: () => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: () => ({
        id: mockPaypalOrderId,
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAP-MISMATCH',
                  status: 'COMPLETED',
                  amount: {
                    currency_code: 'USD',
                    value: '10.00' // Expected 660.00, returned 10.00!
                  }
                }
              ]
            }
          }
        ]
      })
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    const { orderId, paypalOrderId } = createRes.body.data;

    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });

    expect(captureRes.status).toBe(400);
    expect(captureRes.body.success).toBe(false);
    expect(captureRes.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');

    // Confirm database order is marked FAILED and NOT paid
    const checkOrderRes = await request(app).get(`/api/orders/${orderId}`);
    expect(checkOrderRes.status).toBe(200);
    expect(checkOrderRes.body.data.status).toBe('FAILED');
    expect(checkOrderRes.body.data.isPaid).toBe(false);
  });

  it('7. Handles duplicate capture requests idempotently without double-calling PayPal', async () => {
    let callCount = 0;
    const mockPaypalOrderId = 'PAYPAL-IDEMPOTENT-123';

    PayPalService.setMockTransport({
      createOrder: () => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: () => {
        callCount++;
        return {
          id: mockPaypalOrderId,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAP-IDEMPOTENT',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '660.00' }
                  }
                ]
              }
            }
          ]
        };
      }
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    const { orderId, paypalOrderId } = createRes.body.data;

    // First capture
    const firstRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });
    expect(firstRes.status).toBe(200);
    expect(callCount).toBe(1);

    // Second capture (idempotent retry)
    const secondRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.alreadyCaptured).toBe(true);
    expect(secondRes.body.data.order.status).toBe('COMPLETED');
    expect(callCount).toBe(1); // Did not execute duplicate PayPal API call!
  });

  it('8. Handles cancelled checkout and marks order as CANCELLED', async () => {
    PayPalService.setMockTransport({
      createOrder: () => ({ id: 'PAYPAL-CANCEL-123', status: 'CREATED' })
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    const { orderId, paypalOrderId } = createRes.body.data;

    const cancelRes = await request(app)
      .post('/api/paypal/cancel-order')
      .send({
        orderId,
        paypalOrderId,
        reason: 'User closed the PayPal checkout popup modal.'
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.status).toBe('CANCELLED');
    expect(cancelRes.body.data.order.isPaid).toBe(false);

    // Check order status
    const orderRes = await request(app).get(`/api/orders/${orderId}`);
    expect(orderRes.body.data.status).toBe('CANCELLED');
    expect(orderRes.body.data.isPaid).toBe(false);
  });

  it('9. Ensures unpaid orders never appear as paid', async () => {
    const draftRes = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });

    const orderId = draftRes.body.data._id;

    const checkRes = await request(app).get(`/api/orders/${orderId}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.isPaid).toBe(false);
    expect(checkRes.body.data.status).toBe('PENDING_APPROVAL');
    expect(checkRes.body.data.paidAt).toBeNull();
    expect(checkRes.body.data.paypalCaptureId).toBeUndefined();
  });

  it('11. buildCreateOrderPayload includes shipping.name.full_name when buyer name is provided', () => {
    // Tests the ACTUAL outgoing PayPal API payload structure, not just the
    // order object passed into a mock. buildCreateOrderPayload is the pure
    // function whose return value is JSON.stringified into the live fetch body.
    const order = {
      _id: 'test-id-001',
      orderNumber: 'ORD-TEST-0001',
      currency: 'INR',
      quantity: 1,
      product: { name: 'Test Laptop', unitPrice: 75000 },
      buyer: { name: 'Alice Smith', email: 'alice@example.com' }
    };

    const payload = PayPalService.buildCreateOrderPayload(order);

    // Verify shipping.name.full_name is set in the purchase unit
    expect(payload.purchase_units[0].shipping).toBeDefined();
    expect(payload.purchase_units[0].shipping.name.full_name).toBe('Alice Smith');
  });

  it('11b. buildCreateOrderPayload preserves multi-part names like "Anurag Kumar Verma"', () => {
    const order = {
      _id: 'test-id-002',
      orderNumber: 'ORD-TEST-0002',
      currency: 'INR',
      quantity: 2,
      product: { name: 'Test Laptop', unitPrice: 75000 },
      buyer: { name: 'Anurag Kumar Verma', email: 'anurag@example.com' }
    };

    const payload = PayPalService.buildCreateOrderPayload(order);

    expect(payload.purchase_units[0].shipping.name.full_name).toBe('Anurag Kumar Verma');
  });

  it('12. buildCreateOrderPayload omits shipping when buyer name is absent or empty', () => {
    // No buyer at all
    const orderNoBuyer = {
      _id: 'test-id-003',
      orderNumber: 'ORD-TEST-0003',
      currency: 'INR',
      quantity: 1,
      product: { name: 'Test Laptop', unitPrice: 75000 }
    };
    const payloadNoBuyer = PayPalService.buildCreateOrderPayload(orderNoBuyer);
    expect(payloadNoBuyer.purchase_units[0].shipping).toBeUndefined();

    // Buyer present but name is empty string
    const orderEmptyName = {
      ...orderNoBuyer,
      buyer: { name: '   ', email: 'x@example.com' }
    };
    const payloadEmptyName = PayPalService.buildCreateOrderPayload(orderEmptyName);
    expect(payloadEmptyName.purchase_units[0].shipping).toBeUndefined();
  });

  it('12b. buildCreateOrderPayload enforces 300-char limit on buyer name', () => {
    const longName = 'A'.repeat(350);
    const order = {
      _id: 'test-id-004',
      orderNumber: 'ORD-TEST-0004',
      currency: 'INR',
      quantity: 1,
      product: { name: 'Test Laptop', unitPrice: 75000 },
      buyer: { name: longName }
    };

    const payload = PayPalService.buildCreateOrderPayload(order);
    expect(payload.purchase_units[0].shipping.name.full_name.length).toBe(300);
  });

  it('12c. buildCreateOrderPayload amount arithmetic is correct for multi-quantity orders', () => {
    const order = {
      _id: 'test-id-005',
      orderNumber: 'ORD-TEST-0005',
      currency: 'INR',
      quantity: 3,
      product: { name: 'Test Laptop', unitPrice: 75000 }
    };

    const payload = PayPalService.buildCreateOrderPayload(order);
    const pu = payload.purchase_units[0];

    expect(pu.amount.value).toBe('225000.00');
    expect(pu.amount.breakdown.item_total.value).toBe('225000.00');
    expect(pu.items[0].unit_amount.value).toBe('75000.00');
    expect(pu.items[0].quantity).toBe('3');
    expect(pu.amount.currency_code).toBe('INR');
  });

  it('10. Validates buyer information and updates order draft with buyer details on order creation', async () => {
    PayPalService.setMockTransport({
      createOrder: () => ({ id: 'PAYPAL-BUYER-TEST-10', status: 'CREATED' })
    });

    // 1. Create draft
    const draftRes = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-asus-zenbook-14', quantity: 2 });

    expect(draftRes.status).toBe(201);
    const draftId = draftRes.body.data._id;
    const expectedUnitPrice = draftRes.body.data.product.unitPrice;
    const expectedTotal = expectedUnitPrice * 2;
    expect(draftRes.body.data.total).toBe(expectedTotal);

    // 2. Create PayPal order with buyer details
    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        orderId: draftId,
        productId: 'lap-asus-zenbook-14',
        quantity: 2,
        buyer: {
          name: 'Jane Doe',
          email: 'jane.doe@sandbox.example.com'
        },
        approvalConfirmed: true
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.paypalOrderId).toBe('PAYPAL-BUYER-TEST-10');

    // 3. Verify buyer was attached to the order and authoritative total is preserved
    const orderRes = await request(app).get(`/api/orders/${draftId}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.data.buyer.name).toBe('Jane Doe');
    expect(orderRes.body.data.buyer.email).toBe('jane.doe@sandbox.example.com');
    expect(orderRes.body.data.total).toBe(expectedTotal);
    expect(orderRes.body.data.status).toBe('CREATED');
  });

  it('13. buildCreateOrderPayload includes full order-specific shipping address in outgoing PayPal payload', () => {
    const order = {
      _id: 'test-id-100',
      orderNumber: 'ORD-TEST-0100',
      currency: 'USD',
      quantity: 1,
      product: { name: 'ThinkPad E14', unitPrice: 660 },
      buyer: { name: 'Anurag', email: 'anurag@example.com' },
      shippingAddress: {
        recipientName: 'Anurag Verma',
        addressLine1: '742 Evergreen Terrace',
        addressLine2: 'Apt 4B',
        city: 'Springfield',
        state: 'OR',
        postalCode: '97477',
        countryCode: 'US'
      }
    };

    const payload = PayPalService.buildCreateOrderPayload(order);
    const shipping = payload.purchase_units[0].shipping;

    expect(shipping).toBeDefined();
    // Recipient name should prioritize shippingAddress.recipientName
    expect(shipping.name.full_name).toBe('Anurag Verma');
    expect(shipping.address).toBeDefined();
    expect(shipping.address.address_line_1).toBe('742 Evergreen Terrace');
    expect(shipping.address.address_line_2).toBe('Apt 4B');
    expect(shipping.address.admin_area_2).toBe('Springfield'); // City
    expect(shipping.address.admin_area_1).toBe('OR');          // State
    expect(shipping.address.postal_code).toBe('97477');
    expect(shipping.address.country_code).toBe('US');
  });

  it('14. Two orders with different addresses generate distinct PayPal shipping payloads', () => {
    const orderA = {
      _id: 'order-A',
      orderNumber: 'ORD-TEST-000A',
      currency: 'INR',
      quantity: 1,
      product: { name: 'Laptop A', unitPrice: 50000 },
      buyer: { name: 'Buyer A', email: 'a@example.com' },
      shippingAddress: {
        recipientName: 'Recipient A',
        addressLine1: '123 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        postalCode: '560001',
        countryCode: 'IN'
      }
    };

    const orderB = {
      _id: 'order-B',
      orderNumber: 'ORD-TEST-000B',
      currency: 'USD',
      quantity: 1,
      product: { name: 'Laptop B', unitPrice: 800 },
      buyer: { name: 'Buyer B', email: 'b@example.com' },
      shippingAddress: {
        recipientName: 'Recipient B',
        addressLine1: '456 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        countryCode: 'US'
      }
    };

    const payloadA = PayPalService.buildCreateOrderPayload(orderA);
    const payloadB = PayPalService.buildCreateOrderPayload(orderB);

    const shipA = payloadA.purchase_units[0].shipping;
    const shipB = payloadB.purchase_units[0].shipping;

    expect(shipA.name.full_name).toBe('Recipient A');
    expect(shipA.address.address_line_1).toBe('123 MG Road');
    expect(shipA.address.country_code).toBe('IN');

    expect(shipB.name.full_name).toBe('Recipient B');
    expect(shipB.address.address_line_1).toBe('456 Market St');
    expect(shipB.address.country_code).toBe('US');

    // Confirm payload A is completely unaffected by payload B
    expect(shipA.address.address_line_1).not.toBe(shipB.address.address_line_1);
  });

  it('15. POST /api/paypal/create-order saves shippingAddress to the internal order', async () => {
    let capturedPayload = null;
    PayPalService.setMockTransport({
      createOrder: (order) => {
        capturedPayload = order;
        return { id: 'PAYPAL-SHIP-ORDER-15', status: 'CREATED' };
      }
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        buyer: {
          name: 'Anurag',
          email: 'anurag@example.com'
        },
        shippingAddress: {
          recipientName: 'Anurag Verma',
          addressLine1: '404 Innovation Drive',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          countryCode: 'US'
        },
        approvalConfirmed: true
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);

    const orderId = createRes.body.data.orderId;
    const orderRes = await request(app).get(`/api/orders/${orderId}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.data.shippingAddress).toBeDefined();
    expect(orderRes.body.data.shippingAddress.recipientName).toBe('Anurag Verma');
    expect(orderRes.body.data.shippingAddress.addressLine1).toBe('404 Innovation Drive');
    expect(orderRes.body.data.shippingAddress.city).toBe('Austin');
    expect(orderRes.body.data.shippingAddress.countryCode).toBe('US');
  });

  it('16. Rejects create-order when required shipping address fields are missing or invalid', async () => {
    // Missing addressLine1
    const resMissingField = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        shippingAddress: {
          recipientName: 'Anurag',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          countryCode: 'US'
        },
        approvalConfirmed: true
      });
    expect(resMissingField.status).toBe(400);
    expect(resMissingField.body.success).toBe(false);

    // Invalid country code (not 2 chars)
    const resBadCountry = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        shippingAddress: {
          recipientName: 'Anurag',
          addressLine1: '123 Test St',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          countryCode: 'USA' // Invalid! Must be 2 chars
        },
        approvalConfirmed: true
      });
    expect(resBadCountry.status).toBe(400);
    expect(resBadCountry.body.success).toBe(false);
  });

  it('17. Existing orders without shippingAddress remain fully compatible with payload generation', () => {
    const legacyOrder = {
      _id: 'legacy-order-999',
      orderNumber: 'ORD-LEGACY-0999',
      currency: 'USD',
      quantity: 1,
      product: { name: 'Legacy Laptop', unitPrice: 500 },
      buyer: { name: 'Legacy Customer', email: 'legacy@example.com' }
      // No shippingAddress property
    };

    const payload = PayPalService.buildCreateOrderPayload(legacyOrder);
    expect(payload.purchase_units[0].shipping).toBeDefined();
    expect(payload.purchase_units[0].shipping.name.full_name).toBe('Legacy Customer');
    expect(payload.purchase_units[0].shipping.address).toBeUndefined();
  });

  it('18. Captures authoritative final shipping address returned by PayPal and persists alongside requested address', async () => {
    const mockPaypalOrderId = 'PAYPAL-SHIP-CAPTURE-18';
    const mockCaptureId = 'CAPTURE-SHIP-18';

    PayPalService.setMockTransport({
      createOrder: (order) => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: (paypalOrderId) => ({
        id: paypalOrderId,
        status: 'COMPLETED',
        purchase_units: [
          {
            reference_id: 'REF-18',
            shipping: {
              name: { full_name: 'Anurag Verma' },
              address: {
                address_line_1: 'Shambhuganj',
                address_line_2: 'Near Post Office',
                admin_area_2: 'Sultanpur',
                admin_area_1: 'Uttar Pradesh',
                postal_code: '227304',
                country_code: 'IN'
              }
            },
            payments: {
              captures: [
                {
                  id: mockCaptureId,
                  status: 'COMPLETED',
                  amount: { currency_code: 'USD', value: '660.00' }
                }
              ]
            }
          }
        ],
        payer: {
          payer_id: 'PAYER-ANURAG-18',
          email_address: 'anurag.buyer@example.com',
          name: { given_name: 'Anurag', surname: 'Verma' }
        }
      })
    });

    // 1. Create order with original requested address in Dharwad
    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        buyer: { name: 'Anurag', email: 'anurag@example.com' },
        shippingAddress: {
          recipientName: 'Anurag',
          addressLine1: 'Line Bazar, Dharwad',
          city: 'Hubli-Dharwad',
          state: 'Karnataka',
          postalCode: '580001',
          countryCode: 'IN'
        },
        approvalConfirmed: true
      });

    expect(createRes.status).toBe(200);
    const { orderId, paypalOrderId } = createRes.body.data;

    // 2. Capture payment where buyer selected Sultanpur address in PayPal popup
    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });

    expect(captureRes.status).toBe(200);
    expect(captureRes.body.success).toBe(true);
    expect(captureRes.body.data.verified).toBe(true);

    // 3. Verify order in DB has BOTH requested address and final PayPal address
    const checkOrder = await request(app).get(`/api/orders/${orderId}`);
    expect(checkOrder.status).toBe(200);
    const orderData = checkOrder.body.data;

    // Original requested address is preserved
    expect(orderData.shippingAddress.addressLine1).toBe('Line Bazar, Dharwad');
    expect(orderData.shippingAddress.city).toBe('Hubli-Dharwad');
    expect(orderData.shippingAddress.postalCode).toBe('580001');

    // Final authoritative address from PayPal is captured
    expect(orderData.finalShippingAddress).toBeDefined();
    expect(orderData.finalShippingAddress.recipientName).toBe('Anurag Verma');
    expect(orderData.finalShippingAddress.addressLine1).toBe('Shambhuganj');
    expect(orderData.finalShippingAddress.addressLine2).toBe('Near Post Office');
    expect(orderData.finalShippingAddress.city).toBe('Sultanpur');
    expect(orderData.finalShippingAddress.state).toBe('Uttar Pradesh');
    expect(orderData.finalShippingAddress.postalCode).toBe('227304');
    expect(orderData.finalShippingAddress.countryCode).toBe('IN');
    expect(orderData.finalShippingAddress.source).toBe('PAYPAL_TRANSACTION');
  });

  it('19. Preserves original requested address without corruption when PayPal capture omits shipping', async () => {
    const mockPaypalOrderId = 'PAYPAL-NO-SHIP-19';

    PayPalService.setMockTransport({
      createOrder: (order) => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: (paypalOrderId) => ({
        id: paypalOrderId,
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAP-19',
                  status: 'COMPLETED',
                  amount: { currency_code: 'USD', value: '660.00' }
                }
              ]
            }
          }
        ]
      })
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        buyer: { name: 'Customer 19', email: 'c19@example.com' },
        shippingAddress: {
          recipientName: 'Customer 19',
          addressLine1: '99 Preserved Road',
          city: 'Mumbai',
          state: 'MH',
          postalCode: '400001',
          countryCode: 'IN'
        },
        approvalConfirmed: true
      });

    const { orderId, paypalOrderId } = createRes.body.data;

    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });

    expect(captureRes.status).toBe(200);

    const checkOrder = await request(app).get(`/api/orders/${orderId}`);
    expect(checkOrder.status).toBe(200);
    // Original address must NOT be erased or overwritten with nulls
    expect(checkOrder.body.data.shippingAddress.addressLine1).toBe('99 Preserved Road');
    expect(checkOrder.body.data.shippingAddress.city).toBe('Mumbai');
    expect(checkOrder.body.data.finalShippingAddress).toBeFalsy();
  });

  it('20. Unsuccessful or unverified captures do not update final shipping address', async () => {
    const mockPaypalOrderId = 'PAYPAL-FAILED-20';

    PayPalService.setMockTransport({
      createOrder: () => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: () => {
        const err = new Error('INSTRUMENT_DECLINED');
        err.status = 400;
        throw err;
      }
    });

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .send({
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        shippingAddress: {
          recipientName: 'Declined Buyer',
          addressLine1: '10 Failure Lane',
          city: 'Delhi',
          state: 'DL',
          postalCode: '110001',
          countryCode: 'IN'
        },
        approvalConfirmed: true
      });

    const { orderId, paypalOrderId } = createRes.body.data;

    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .send({ orderId, paypalOrderId });

    expect(captureRes.status).toBe(400);

    const checkOrder = await request(app).get(`/api/orders/${orderId}`);
    expect(checkOrder.status).toBe(200);
    expect(checkOrder.body.data.status).toBe('FAILED');
    expect(checkOrder.body.data.isPaid).toBe(false);
    expect(checkOrder.body.data.finalShippingAddress).toBeFalsy();
  });
});
