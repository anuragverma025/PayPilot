import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { OrderService } from '../src/services/order.service.js';
import { PayPalService } from '../src/services/paypal.service.js';

describe('Orders Security, Guest Ownership & Isolation Suite', () => {
  beforeEach(() => {
    PayPalService.resetMockTransport();
    OrderService.clearMemoryOrders();
  });

  afterEach(() => {
    PayPalService.resetMockTransport();
    OrderService.clearMemoryOrders();
  });

  it('1. Returns empty list if no guest token is provided to GET /api/orders', async () => {
    // Create an order without linking to this caller
    await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1, buyer: { name: 'Alice', email: 'alice@example.com' } });

    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('2. A guest can list only their own orders via x-guest-token', async () => {
    // Guest A creates Order A
    const resA = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1, buyer: { name: 'Guest A', email: 'guestA@example.com' } });
    const guestTokenA = resA.body.data.guestToken;
    expect(guestTokenA).toBeDefined();

    // Guest B creates Order B with a different session token
    const resB = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 2, buyer: { name: 'Guest B', email: 'guestB@example.com' } });
    const guestTokenB = resB.body.data.guestToken;
    expect(guestTokenB).toBeDefined();
    expect(guestTokenA).not.toBe(guestTokenB);

    // Guest A lists orders using x-guest-token header
    const listA = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestTokenA);

    expect(listA.status).toBe(200);
    expect(listA.body.data.length).toBe(1);
    expect(listA.body.data[0].orderNumber).toBe(resA.body.data.orderNumber);
    // Crucial: guestTokenHash must NEVER be returned in public responses
    expect(listA.body.data[0].guestTokenHash).toBeUndefined();

    // Guest B lists orders
    const listB = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestTokenB);

    expect(listB.status).toBe(200);
    expect(listB.body.data.length).toBe(1);
    expect(listB.body.data[0].orderNumber).toBe(resB.body.data.orderNumber);
  });

  it('3. Another guest cannot access orders using email query parameter or order reference', async () => {
    const resA = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1, buyer: { name: 'Victim', email: 'victim@target.com' } });

    const orderIdA = resA.body.data._id;
    const orderNumberA = resA.body.data.orderNumber;
    const guestTokenA = resA.body.data.guestToken;

    // Attacker tries to query orders using email parameter without guest token
    const attackerEmailQuery = await request(app)
      .get('/api/orders?email=victim@target.com');
    expect(attackerEmailQuery.status).toBe(200);
    expect(attackerEmailQuery.body.data).toEqual([]); // Refused: empty list

    // Caller attempts to pass guestToken via query parameter instead of x-guest-token header
    const queryParamQuery = await request(app)
      .get(`/api/orders?guestToken=${guestTokenA}`);
    expect(queryParamQuery.status).toBe(200);
    expect(queryParamQuery.body.data).toEqual([]); // Refused: query-parameter token is strictly ignored

    // Attacker generates their own guest token
    const resAttacker = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    const attackerToken = resAttacker.body.data.guestToken;

    // Attacker queries victim order by ID with attacker's token
    const attackerDirectQuery = await request(app)
      .get(`/api/orders/${orderIdA}`)
      .set('x-guest-token', attackerToken);
    expect(attackerDirectQuery.status).toBe(403);
    expect(attackerDirectQuery.body.error.code).toBe('ORDER_FORBIDDEN');

    // Attacker queries victim order by orderNumber with attacker's token
    const attackerRefQuery = await request(app)
      .get(`/api/orders/${orderNumberA}`)
      .set('x-guest-token', attackerToken);
    expect(attackerRefQuery.status).toBe(403);
    expect(attackerRefQuery.body.error.code).toBe('ORDER_FORBIDDEN');

    // Legitimate guest A can retrieve their own order details
    const legitimateQuery = await request(app)
      .get(`/api/orders/${orderIdA}`)
      .set('x-guest-token', guestTokenA);
    expect(legitimateQuery.status).toBe(200);
    expect(legitimateQuery.body.data.orderNumber).toBe(orderNumberA);
  });

  it('4. Rejects missing or invalid guest tokens with appropriate HTTP codes', async () => {
    const res = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderId = res.body.data._id;

    // Call without token
    const missingRes = await request(app).get('/api/orders');
    expect(missingRes.status).toBe(200);
    expect(missingRes.body.data).toEqual([]);

    // Call with invalid/short token to detail
    const invalidDetailRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('x-guest-token', 'short-invalid');
    expect(invalidDetailRes.status).toBe(403);
    expect(invalidDetailRes.body.error.code).toBe('ORDER_FORBIDDEN');
  });

  it('5. Allows one guest to bind multiple orders using the same guest token', async () => {
    // 1st order creates guest token
    const res1 = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const token = res1.body.data.guestToken;

    // 2nd order passes the same guest token in request
    const res2 = await request(app)
      .post('/api/orders/draft')
      .set('x-guest-token', token)
      .send({ productId: 'lap-acer-nitro-v15', quantity: 2, guestToken: token });

    expect(res2.body.data.guestToken).toBe(token);

    // List orders for this guest
    const list = await request(app)
      .get('/api/orders')
      .set('x-guest-token', token);

    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(2);
    const orderNumbers = list.body.data.map(o => o.orderNumber);
    expect(orderNumbers).toContain(res1.body.data.orderNumber);
    expect(orderNumbers).toContain(res2.body.data.orderNumber);
  });

  it('6. Guest A cannot create a PayPal order against Guest B draft', async () => {
    PayPalService.setMockTransport({
      createOrder: () => ({ id: 'PAYPAL-MOCK-TEST-6', status: 'CREATED' })
    });

    // Guest B creates draft
    const draftResB = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1, buyer: { name: 'Guest B', email: 'b@example.com' } });
    const draftIdB = draftResB.body.data._id;
    const tokenB = draftResB.body.data.guestToken;

    // Guest A creates their own draft
    const draftResA = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    const tokenA = draftResA.body.data.guestToken;

    // Attacker Guest A attempts to create a PayPal order bound to Guest B's draftId
    const attackRes = await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', tokenA)
      .send({
        orderId: draftIdB,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    expect(attackRes.status).toBe(403);
    expect(attackRes.body.success).toBe(false);
    expect(attackRes.body.error.code).toBe('ORDER_FORBIDDEN');

    // Legitimate Guest B can create PayPal order for draft B
    const legitRes = await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', tokenB)
      .send({
        orderId: draftIdB,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    expect(legitRes.status).toBe(200);
    expect(legitRes.body.success).toBe(true);
    expect(legitRes.body.data.paypalOrderId).toBe('PAYPAL-MOCK-TEST-6');
  });

  it('7. Guest A cannot capture Guest B order', async () => {
    const mockPaypalOrderId = 'PAYPAL-MOCK-ORD-GUEST-B';
    const mockCaptureId = 'CAPTURE-MOCK-GUEST-B';

    PayPalService.setMockTransport({
      createOrder: () => ({ id: mockPaypalOrderId, status: 'CREATED' }),
      captureOrder: (id) => ({
        id,
        status: 'COMPLETED',
        purchase_units: [
          {
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
        ]
      })
    });

    // Guest B initiates order
    const draftB = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const tokenB = draftB.body.data.guestToken;
    const orderIdB = draftB.body.data._id;

    const createB = await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', tokenB)
      .send({
        orderId: orderIdB,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });
    expect(createB.status).toBe(200);

    // Guest A has their own token
    const draftA = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    const tokenA = draftA.body.data.guestToken;

    // Attacker Guest A attempts to capture Guest B's order
    const attackCapture = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', tokenA)
      .send({
        orderId: orderIdB,
        paypalOrderId: mockPaypalOrderId
      });

    expect(attackCapture.status).toBe(403);
    expect(attackCapture.body.success).toBe(false);
    expect(attackCapture.body.error.code).toBe('ORDER_FORBIDDEN');

    // Legitimate Guest B captures successfully
    const legitCapture = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', tokenB)
      .send({
        orderId: orderIdB,
        paypalOrderId: mockPaypalOrderId
      });

    expect(legitCapture.status).toBe(200);
    expect(legitCapture.body.success).toBe(true);
    expect(legitCapture.body.data.order.status).toBe('COMPLETED');
    expect(legitCapture.body.data.order.isPaid).toBe(true);
  });

  it('8. Guest A cannot cancel Guest B order', async () => {
    PayPalService.setMockTransport({
      createOrder: () => ({ id: 'PAYPAL-CANCEL-TARGET', status: 'CREATED' })
    });

    // Guest B initiates order
    const draftB = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const tokenB = draftB.body.data.guestToken;
    const orderIdB = draftB.body.data._id;

    await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', tokenB)
      .send({
        orderId: orderIdB,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    // Attacker Guest A has their own token
    const draftA = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    const tokenA = draftA.body.data.guestToken;

    // Attacker Guest A attempts to cancel Guest B's order
    const attackCancel = await request(app)
      .post('/api/paypal/cancel-order')
      .set('x-guest-token', tokenA)
      .send({
        orderId: orderIdB,
        paypalOrderId: 'PAYPAL-CANCEL-TARGET',
        reason: 'Malicious cancellation attempt'
      });

    expect(attackCancel.status).toBe(403);
    expect(attackCancel.body.success).toBe(false);
    expect(attackCancel.body.error.code).toBe('ORDER_FORBIDDEN');

    // Legitimate Guest B can cancel their own order
    const legitCancel = await request(app)
      .post('/api/paypal/cancel-order')
      .set('x-guest-token', tokenB)
      .send({
        orderId: orderIdB,
        paypalOrderId: 'PAYPAL-CANCEL-TARGET',
        reason: 'Legitimate buyer cancellation'
      });

    expect(legitCancel.status).toBe(200);
    expect(legitCancel.body.success).toBe(true);
    expect(legitCancel.body.data.order.status).toBe('CANCELLED');
  });

  it('9. Capture requests with mismatched paypalOrderId and orderId are rejected', async () => {
    const mockPaypalOrderId = 'PAYPAL-LEGIT-123';

    PayPalService.setMockTransport({
      createOrder: () => ({ id: mockPaypalOrderId, status: 'CREATED' })
    });

    const draft = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const token = draft.body.data.guestToken;
    const orderId = draft.body.data._id;

    await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', token)
      .send({
        orderId,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });

    // Caller attempts capture with mismatched PayPal order ID
    const mismatchRes = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', token)
      .send({
        orderId,
        paypalOrderId: 'PAYPAL-TAMPERED-999'
      });

    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.success).toBe(false);
    expect(mismatchRes.body.error.code).toBe('PAYPAL_ORDER_MISMATCH');
  });

  it('10. Customer endpoints reject missing or invalid guest tokens with 401', async () => {
    const draft = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderId = draft.body.data._id;

    // 1. Missing token on create-order with orderId
    const noTokenCreate = await request(app)
      .post('/api/paypal/create-order')
      .set('x-enforce-auth', 'true')
      .send({
        orderId,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });
    expect(noTokenCreate.status).toBe(401);
    expect(noTokenCreate.body.error.code).toBe('UNAUTHORIZED_GUEST');

    // 2. Missing token on capture-order
    const noTokenCapture = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-enforce-auth', 'true')
      .send({
        orderId,
        paypalOrderId: 'ANY-ID'
      });
    expect(noTokenCapture.status).toBe(401);
    expect(noTokenCapture.body.error.code).toBe('UNAUTHORIZED_GUEST');

    // 3. Missing token on cancel-order
    const noTokenCancel = await request(app)
      .post('/api/paypal/cancel-order')
      .set('x-enforce-auth', 'true')
      .send({
        orderId,
        paypalOrderId: 'ANY-ID'
      });
    expect(noTokenCancel.status).toBe(401);
    expect(noTokenCancel.body.error.code).toBe('UNAUTHORIZED_GUEST');

    // 4. Invalid/short token on capture-order
    const invalidTokenCapture = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', 'short-invalid')
      .send({
        orderId,
        paypalOrderId: 'ANY-ID'
      });
    expect(invalidTokenCapture.status).toBe(401);
    expect(invalidTokenCapture.body.error.code).toBe('UNAUTHORIZED_GUEST');
  });

  it('11. Legacy orders without guestTokenHash securely reject unauthorized PayPal operations with 403', async () => {
    // Simulate legacy order without guestTokenHash directly in memory store
    const legacyOrder = {
      _id: 'legacy_order_12345',
      orderNumber: 'ORD-LEGACY-001',
      total: 660,
      currency: 'USD',
      status: 'PENDING_APPROVAL',
      isPaid: false,
      product: {
        productId: 'lap-lenovo-e14-g5',
        unitPrice: 660
      },
      // guestTokenHash is undefined
      guestTokenHash: undefined
    };
    OrderService.setMemoryOrder(legacyOrder._id, legacyOrder);
    OrderService.setMemoryOrder(legacyOrder.orderNumber, legacyOrder);

    // Guest with a new token tries to create PayPal order for legacy order
    const candidateGuestRes = await request(app)
      .post('/api/orders/draft')
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    const guestToken = candidateGuestRes.body.data.guestToken;

    const createRes = await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', guestToken)
      .send({
        orderId: legacyOrder._id,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe('ORDER_FORBIDDEN');

    // Guest tries to capture legacy order
    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', guestToken)
      .send({
        orderId: legacyOrder._id,
        paypalOrderId: 'PAYPAL-LEGACY-ANY'
      });
    expect(captureRes.status).toBe(403);
    expect(captureRes.body.error.code).toBe('ORDER_FORBIDDEN');

    // Guest tries to cancel legacy order
    const cancelRes = await request(app)
      .post('/api/paypal/cancel-order')
      .set('x-guest-token', guestToken)
      .send({
        orderId: legacyOrder._id
      });
    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.error.code).toBe('ORDER_FORBIDDEN');
  });

  it('12. Test helpers setMemoryOrder, clearMemoryOrders, and setMockTransport strictly throw in production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      expect(() => OrderService.setMemoryOrder('test_key', {})).toThrow(
        'Test helper setMemoryOrder cannot be used in production.'
      );
      expect(() => OrderService.clearMemoryOrders()).toThrow(
        'Test helper clearMemoryOrders cannot be used in production.'
      );
      expect(() => PayPalService.setMockTransport({})).toThrow(
        'Mock transport cannot be used in production.'
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
