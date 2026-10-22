import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 with service health and catalog transparency metadata', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('PayPilot Backend API');
    expect(res.body.catalog.isSampleData).toBe(true);
    expect(res.body.catalog.totalProducts).toBeGreaterThanOrEqual(30);
  });
});
