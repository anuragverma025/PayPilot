/**
 * Auth, User Isolation, Hide Order, and Guest Claim Test Suite
 *
 * Covers:
 * 1. POST /api/auth/register
 * 2. POST /api/auth/login
 * 3. GET /api/auth/me
 * 4. POST /api/auth/logout
 * 5. User order isolation (cross-user access denied)
 * 6. PATCH /api/orders/:id/hide
 * 7. POST /api/orders/claim
 * 8. Hidden orders excluded from list; payment records preserved
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { AuthService } from '../src/services/auth.service.js';
import { OrderService } from '../src/services/order.service.js';
import { PayPalService } from '../src/services/paypal.service.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

async function registerUser(name, email, password = 'ValidPass123!') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password });
  return res;
}

async function loginUser(email, password = 'ValidPass123!') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res;
}

async function createDraftAsGuest(productId = 'lap-lenovo-e14-g5', guestToken) {
  const req = request(app)
    .post('/api/orders/draft')
    .send({ productId, quantity: 1 });
  if (guestToken) req.set('x-guest-token', guestToken);
  return req;
}

// ─── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  AuthService.clearMemoryUsers();
  OrderService.clearMemoryOrders();
  PayPalService.resetMockTransport();
});

afterEach(() => {
  AuthService.clearMemoryUsers();
  OrderService.clearMemoryOrders();
  PayPalService.resetMockTransport();
});

// ──────────────────────────────────────────────────────────────────────────────
// 1. Registration
// ──────────────────────────────────────────────────────────────────────────────

describe('Auth — Registration', () => {
  it('1a. Registers a new user and returns token + user profile', async () => {
    const res = await registerUser('Anurag Verma', 'anurag@example.com');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('anurag@example.com');
    expect(res.body.data.user.name).toBe('Anurag Verma');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(20);
    // passwordHash must NEVER be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('1b. Rejects duplicate email registration with 409', async () => {
    await registerUser('Anurag Verma', 'anurag@example.com');
    const res2 = await registerUser('Anurag Again', 'anurag@example.com');
    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('1c. Rejects registration with missing name (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'ValidPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('1d. Rejects registration with invalid email format (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'ValidPass123!' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('1e. Rejects registration with short password (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@example.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('1f. Email is stored and matched case-insensitively', async () => {
    await registerUser('Alice', 'ALICE@EXAMPLE.COM');
    // Try to register with lowercase version — must conflict
    const res = await registerUser('Alice2', 'alice@example.com');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. Login
// ──────────────────────────────────────────────────────────────────────────────

describe('Auth — Login', () => {
  it('2a. Login with correct credentials returns token + user', async () => {
    await registerUser('Bob Smith', 'bob@example.com', 'MySecret99!');
    const res = await loginUser('bob@example.com', 'MySecret99!');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('bob@example.com');
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('2b. Login with wrong password returns 401 INVALID_CREDENTIALS', async () => {
    await registerUser('Carol', 'carol@example.com', 'Correct1!');
    const res = await loginUser('carol@example.com', 'WrongPassword!');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('2c. Login with unknown email returns 401 INVALID_CREDENTIALS', async () => {
    const res = await loginUser('nobody@example.com', 'AnyPassword1!');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('2d. Login is case-insensitive on email', async () => {
    await registerUser('Dave', 'Dave@Example.Com', 'Pass1234!');
    const res = await loginUser('dave@example.com', 'Pass1234!');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('dave@example.com');
  });

  it('2e. Login with missing email or password returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' }); // no password
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. GET /api/auth/me
// ──────────────────────────────────────────────────────────────────────────────

describe('Auth — GET /api/auth/me', () => {
  it('3a. Returns user profile with valid token', async () => {
    const reg = await registerUser('Eve', 'eve@example.com');
    const token = reg.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('eve@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('3b. Returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3c. Returns 401 with a tampered or invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken.invalidsig');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. POST /api/auth/logout
// ──────────────────────────────────────────────────────────────────────────────

describe('Auth — Logout', () => {
  it('4a. Logout always returns 200 (stateless)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('4b. Logout with a token also returns 200', async () => {
    const reg = await registerUser('Frank', 'frank@example.com');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${reg.body.data.token}`);
    expect(res.status).toBe(200);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. User order isolation
// ──────────────────────────────────────────────────────────────────────────────

describe('Auth — User Order Isolation', () => {
  it('5a. Authenticated user can list only their own orders', async () => {
    // User A registers and creates an order
    const regA = await registerUser('UserA', 'usera@example.com');
    const tokenA = regA.body.data.token;

    const draftA = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    expect(draftA.status).toBe(201);

    // User B registers and creates an order
    const regB = await registerUser('UserB', 'userb@example.com');
    const tokenB = regB.body.data.token;

    const draftB = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ productId: 'lap-acer-nitro-v15', quantity: 1 });
    expect(draftB.status).toBe(201);

    // User A lists — must see only their own order
    const listA = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listA.status).toBe(200);
    expect(listA.body.data.length).toBe(1);
    expect(listA.body.data[0].orderNumber).toBe(draftA.body.data.orderNumber);

    // User B lists — must see only their own order
    const listB = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data.length).toBe(1);
    expect(listB.body.data[0].orderNumber).toBe(draftB.body.data.orderNumber);
  });

  it('5b. User A cannot read User B order details by ID', async () => {
    const regA = await registerUser('UserA2', 'usera2@example.com');
    const tokenA = regA.body.data.token;

    const regB = await registerUser('UserB2', 'userb2@example.com');
    const tokenB = regB.body.data.token;

    const draftB = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderIdB = draftB.body.data._id;

    // User A tries to read User B's order
    const attackRes = await request(app)
      .get(`/api/orders/${orderIdB}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(attackRes.status).toBe(403);
    expect(attackRes.body.error.code).toBe('ORDER_FORBIDDEN');

    // User B can read their own order
    const legitRes = await request(app)
      .get(`/api/orders/${orderIdB}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(legitRes.status).toBe(200);
    expect(legitRes.body.data._id).toBe(orderIdB);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. PATCH /api/orders/:id/hide
// ──────────────────────────────────────────────────────────────────────────────

describe('Order Hide (Soft-Delete)', () => {
  it('6a. Guest can hide their own order and it disappears from list', async () => {
    const draft = await createDraftAsGuest();
    const guestToken = draft.body.data.guestToken;
    const orderId = draft.body.data._id;

    // Hide it
    const hideRes = await request(app)
      .patch(`/api/orders/${orderId}/hide`)
      .set('x-guest-token', guestToken);
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.success).toBe(true);
    expect(hideRes.body.data.isHidden).toBe(true);

    // Order no longer appears in list
    const list = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestToken);
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);
  });

  it('6b. Guest A cannot hide Guest B order (returns 403)', async () => {
    const draftB = await createDraftAsGuest();
    const tokenB = draftB.body.data.guestToken;
    const orderIdB = draftB.body.data._id;

    const draftA = await createDraftAsGuest();
    const tokenA = draftA.body.data.guestToken;

    const attackRes = await request(app)
      .patch(`/api/orders/${orderIdB}/hide`)
      .set('x-guest-token', tokenA);
    expect(attackRes.status).toBe(403);
    expect(attackRes.body.error.code).toBe('ORDER_FORBIDDEN');

    // Order B is still visible to Guest B
    const list = await request(app)
      .get('/api/orders')
      .set('x-guest-token', tokenB);
    expect(list.body.data.length).toBe(1);
  });

  it('6c. Authenticated user can hide their own order', async () => {
    const reg = await registerUser('Hider', 'hider@example.com');
    const token = reg.body.data.token;

    const draft = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderId = draft.body.data._id;

    const hideRes = await request(app)
      .patch(`/api/orders/${orderId}/hide`)
      .set('Authorization', `Bearer ${token}`);
    expect(hideRes.status).toBe(200);
    expect(hideRes.body.data.isHidden).toBe(true);

    // Not in list anymore
    const list = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data).toEqual([]);
  });

  it('6d. Hide without any auth returns 401', async () => {
    const draft = await createDraftAsGuest();
    const orderId = draft.body.data._id;

    const res = await request(app)
      .patch(`/api/orders/${orderId}/hide`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('6e. Payment records and timeline are preserved after hide', async () => {
    PayPalService.setMockTransport({
      createOrder: () => ({ id: 'PAYPAL-HIDE-TEST', status: 'CREATED' }),
      captureOrder: () => ({
        id: 'PAYPAL-HIDE-TEST',
        status: 'COMPLETED',
        purchase_units: [{
          payments: {
            captures: [{
              id: 'CAP-HIDE-001',
              status: 'COMPLETED',
              amount: { currency_code: 'USD', value: '660.00' }
            }]
          }
        }],
        payer: {
          payer_id: 'PAYER-HIDE',
          email_address: 'hider@example.com',
          name: { given_name: 'Hider', surname: 'Test' }
        }
      })
    });

    const draftRes = await createDraftAsGuest();
    const guestToken = draftRes.body.data.guestToken;
    const orderId = draftRes.body.data._id;

    // Complete payment
    const createPayRes = await request(app)
      .post('/api/paypal/create-order')
      .set('x-guest-token', guestToken)
      .send({
        orderId,
        productId: 'lap-lenovo-e14-g5',
        quantity: 1,
        approvalConfirmed: true
      });
    expect(createPayRes.status).toBe(200);
    const paypalOrderId = createPayRes.body.data.paypalOrderId;

    const captureRes = await request(app)
      .post('/api/paypal/capture-order')
      .set('x-guest-token', guestToken)
      .send({ orderId, paypalOrderId });
    expect(captureRes.status).toBe(200);
    expect(captureRes.body.data.order.isPaid).toBe(true);

    // Hide the order
    const hideRes = await request(app)
      .patch(`/api/orders/${orderId}/hide`)
      .set('x-guest-token', guestToken);
    expect(hideRes.status).toBe(200);

    // Order does not appear in list
    const list = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestToken);
    expect(list.body.data).toEqual([]);

    // But direct detail still works for the owner (payment record preserved)
    const detail = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('x-guest-token', guestToken);
    expect(detail.status).toBe(200);
    expect(detail.body.data.isPaid).toBe(true);
    expect(detail.body.data.paypalCaptureId).toBe('CAP-HIDE-001');
    // Internal timeline contains payment record
    expect(detail.body.data.timeline).toBeDefined();
    expect(detail.body.data.timeline.length).toBeGreaterThan(0);
    const paymentAction = detail.body.data.timeline.find(
      t => t.action === 'ORDER_PAYMENT_VERIFIED'
    );
    expect(paymentAction).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. POST /api/orders/claim
// ──────────────────────────────────────────────────────────────────────────────

describe('Guest Order Claiming', () => {
  it('7a. Authenticated user claims guest orders by providing raw guest token', async () => {
    // 1. Guest creates orders
    const draft1 = await createDraftAsGuest();
    const guestToken = draft1.body.data.guestToken;

    const draft2 = await createDraftAsGuest('lap-acer-nitro-v15', guestToken);
    // Both orders must belong to the same guest
    expect(draft2.body.data.guestToken).toBe(guestToken);

    // 2. User registers
    const reg = await registerUser('Claimer', 'claimer@example.com');
    const authToken = reg.body.data.token;

    // 3. Claim the guest orders
    const claimRes = await request(app)
      .post('/api/orders/claim')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ guestToken });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.data.claimedCount).toBe(2);

    // 4. Claimed orders now appear in user's list
    const list = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${authToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(2);
  });

  it('7b. Claim without auth token returns 401', async () => {
    const draft = await createDraftAsGuest();
    const guestToken = draft.body.data.guestToken;

    const res = await request(app)
      .post('/api/orders/claim')
      .send({ guestToken });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('7c. Claim with a wrong / non-matching guest token claims 0 orders', async () => {
    // Create a real guest order
    const draft = await createDraftAsGuest();
    expect(draft.body.data.guestToken).toBeDefined();

    // Authenticated user provides a different (fake) guest token
    const reg = await registerUser('NotOwner', 'notowner@example.com');
    const authToken = reg.body.data.token;

    const fakeToken = 'a'.repeat(32); // Valid length but doesn't match any order
    const res = await request(app)
      .post('/api/orders/claim')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ guestToken: fakeToken });
    expect(res.status).toBe(200);
    expect(res.body.data.claimedCount).toBe(0);
  });

  it('7d. Claim without guestToken body returns 400', async () => {
    const reg = await registerUser('NoToken', 'notoken@example.com');
    const authToken = reg.body.data.token;

    const res = await request(app)
      .post('/api/orders/claim')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8. Hidden orders excluded from list; backward compat
// ──────────────────────────────────────────────────────────────────────────────

describe('Hidden Order Isolation and Backward Compatibility', () => {
  it('8a. Hidden orders are excluded from GET /api/orders but visible orders remain', async () => {
    const draft1 = await createDraftAsGuest();
    const guestToken = draft1.body.data.guestToken;
    const orderId1 = draft1.body.data._id;

    const draft2 = await createDraftAsGuest('lap-acer-nitro-v15', guestToken);
    const orderId2 = draft2.body.data._id;

    // Hide first order
    await request(app)
      .patch(`/api/orders/${orderId1}/hide`)
      .set('x-guest-token', guestToken);

    // Only second order should appear
    const list = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestToken);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(1);
    expect(list.body.data[0]._id).toBe(orderId2);
  });

  it('8b. Guest token header is required; query param guestToken is strictly ignored', async () => {
    const draft = await createDraftAsGuest();
    const guestToken = draft.body.data.guestToken;

    // guestToken in query param must be ignored
    const queryParamRes = await request(app)
      .get(`/api/orders?guestToken=${guestToken}`);
    expect(queryParamRes.status).toBe(200);
    expect(queryParamRes.body.data).toEqual([]);
  });

  it('8c. Hiding a non-existent order returns 404', async () => {
    const reg = await registerUser('NotFound', 'notfound@example.com');
    const token = reg.body.data.token;

    const res = await request(app)
      .patch('/api/orders/nonexistent-order-id-xyz/hide')
      .set('Authorization', `Bearer ${token}`);
    expect([404, 403]).toContain(res.status);
  });

  it('8d. Old guest orders without userId remain accessible to the original guest', async () => {
    // Simulate backward compatibility: an order created without userId
    const draft = await createDraftAsGuest();
    const guestToken = draft.body.data.guestToken;
    const orderId = draft.body.data._id;

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('x-guest-token', guestToken);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(orderId);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 9. Regression — Order Isolation & Deduplication
// ──────────────────────────────────────────────────────────────────────────────

describe('Regression — Order Isolation & Deduplication', () => {
  it('9a. Guests cannot list orders belonging to registered users even if possessing the guest token', async () => {
    // 1. Registered user creates an order
    const reg = await registerUser('IsoUser', 'isouser@example.com');
    const authToken = reg.body.data.token;

    const draft = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    expect(draft.status).toBe(201);
    const guestToken = draft.body.data.guestToken;
    expect(guestToken).toBeDefined();

    // 2. An unauthenticated guest uses that guest token to fetch orders
    const guestList = await request(app)
      .get('/api/orders')
      .set('x-guest-token', guestToken);

    expect(guestList.status).toBe(200);
    // MUST NOT reveal the registered user's order to the guest
    expect(guestList.body.data).toEqual([]);
    expect(guestList.body.count).toBe(0);
  });

  it('9b. Guests cannot access registered user order details by ID even with guest token', async () => {
    const reg = await registerUser('IsoUser2', 'isouser2@example.com');
    const authToken = reg.body.data.token;

    const draft = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderId = draft.body.data._id;
    const guestToken = draft.body.data.guestToken;

    // Guest attempts to view user's order details using guest token
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('x-guest-token', guestToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORDER_FORBIDDEN');
  });

  it('9c. Guests cannot hide orders belonging to registered users', async () => {
    const reg = await registerUser('IsoUser3', 'isouser3@example.com');
    const authToken = reg.body.data.token;

    const draft = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderId = draft.body.data._id;
    const guestToken = draft.body.data.guestToken;

    // Guest attempts to hide registered user's order
    const res = await request(app)
      .patch(`/api/orders/${orderId}/hide`)
      .set('x-guest-token', guestToken);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORDER_FORBIDDEN');
  });

  it('9d. User B cannot access User A order details even if presenting User A guest token', async () => {
    const regA = await registerUser('UserAlpha', 'alpha@example.com');
    const tokenA = regA.body.data.token;

    const regB = await registerUser('UserBeta', 'beta@example.com');
    const tokenB = regB.body.data.token;

    const draftA = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const orderIdA = draftA.body.data._id;
    const guestTokenA = draftA.body.data.guestToken;

    // User B sends their auth token PLUS User A's guest token
    const res = await request(app)
      .get(`/api/orders/${orderIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-guest-token', guestTokenA);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ORDER_FORBIDDEN');
  });

  it('9e. getOrders deduplicates orders and never returns duplicate entries for the same order', async () => {
    const reg = await registerUser('DedupUser', 'dedup@example.com');
    const token = reg.body.data.token;

    const draft = await request(app)
      .post('/api/orders/draft')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'lap-lenovo-e14-g5', quantity: 1 });
    const order = draft.body.data;

    // Simulate multiple entries in memory store under different keys/copies
    OrderService.setMemoryOrder(`${order._id}_alias`, { ...order });

    const listRes = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    // Must contain exactly 1 order, not duplicated
    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].orderNumber).toBe(order.orderNumber);
  });
});

