import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

/**
 * CORS Preflight Tests
 * Verifies that the Access-Control-Allow-Headers response includes x-guest-token
 * and that only trusted origins receive CORS access.
 */
describe('CORS Preflight', () => {
  const TRUSTED_ORIGIN = 'http://localhost:5173';
  const UNTRUSTED_ORIGIN = 'http://evil.example.com';

  it('allows preflight from trusted origin and includes x-guest-token in allowed headers', async () => {
    const res = await request(app)
      .options('/api/orders')
      .set('Origin', TRUSTED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'x-guest-token, Content-Type');

    expect(res.status).toBe(204);

    const allowedHeaders = res.headers['access-control-allow-headers'] || '';
    // Header names are case-insensitive; normalise to lowercase for comparison
    const normHeaders = allowedHeaders.toLowerCase();
    expect(normHeaders).toContain('x-guest-token');
    expect(normHeaders).toContain('content-type');

    expect(res.headers['access-control-allow-origin']).toBe(TRUSTED_ORIGIN);
  });

  it('allows preflight for /api/products from trusted origin', async () => {
    const res = await request(app)
      .options('/api/products')
      .set('Origin', TRUSTED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(TRUSTED_ORIGIN);
  });

  it('does not grant CORS access to an untrusted origin', async () => {
    const res = await request(app)
      .options('/api/orders')
      .set('Origin', UNTRUSTED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'x-guest-token');

    // The cors package omits the Allow-Origin header for disallowed origins
    expect(res.headers['access-control-allow-origin']).not.toBe(UNTRUSTED_ORIGIN);
  });

  it('allows GET /api/orders with x-guest-token header from trusted origin', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Origin', TRUSTED_ORIGIN)
      .set('x-guest-token', 'a'.repeat(64)); // valid-length token, will return empty []

    // Origin should be echoed back; request must not be blocked at CORS level
    expect(res.headers['access-control-allow-origin']).toBe(TRUSTED_ORIGIN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
