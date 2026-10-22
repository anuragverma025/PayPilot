import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('POST /api/compare', () => {
  it('compares 2 products and generates spec difference matrix', async () => {
    const res = await request(app)
      .post('/api/compare')
      .send({
        productIds: ['lap-lenovo-e14-g5', 'lap-acer-nitro-v15']
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBe(2);
    expect(res.body.data.matrix.length).toBeGreaterThan(5);
    expect(res.body.data.differences.length).toBeGreaterThan(0);
    expect(res.body.data.verdict).toHaveProperty('budgetWinner');
  });

  it('rejects comparison with less than 2 products', async () => {
    const res = await request(app)
      .post('/api/compare')
      .send({
        productIds: ['lap-lenovo-e14-g5']
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects comparison with more than 3 products', async () => {
    const res = await request(app)
      .post('/api/compare')
      .send({
        productIds: ['lap-lenovo-e14-g5', 'lap-acer-nitro-v15', 'lap-asus-zenbook-14', 'lap-hp-pavilion-15']
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
