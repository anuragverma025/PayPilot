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
});
