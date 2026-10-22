import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Products Endpoints', () => {
  it('GET /api/products returns all catalog laptops with sample data notice', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isSampleData).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(30);

    const firstProduct = res.body.data[0];
    expect(firstProduct).toHaveProperty('id');
    expect(firstProduct).toHaveProperty('name');
    expect(firstProduct).toHaveProperty('priceINR');
    expect(firstProduct).toHaveProperty('processor');
    expect(firstProduct).toHaveProperty('ram');
    expect(firstProduct).toHaveProperty('strengths');
    expect(firstProduct).toHaveProperty('tradeOffs');
  });

  it('GET /api/products filters by budget correctly', async () => {
    const maxBudget = 55000;
    const res = await request(app).get(`/api/products?maxBudget=${maxBudget}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((product) => {
      expect(product.priceINR).toBeLessThanOrEqual(maxBudget);
    });
  });

  it('GET /api/products filters by minimum RAM', async () => {
    const minRam = 16;
    const res = await request(app).get(`/api/products?minRam=${minRam}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((product) => {
      expect(product.ram.capacityGB).toBeGreaterThanOrEqual(minRam);
    });
  });

  it('GET /api/products/:id returns specific product', async () => {
    const res = await request(app).get('/api/products/lap-lenovo-e14-g5');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('lap-lenovo-e14-g5');
    expect(res.body.data.brand).toBe('Lenovo');
    expect(res.body.data.ram.capacityGB).toBe(16);
  });

  it('GET /api/products returns verified image flags and transparent metadata', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    res.body.data.forEach((product) => {
      expect(product).toHaveProperty('hasVerifiedImage');
      expect(typeof product.hasVerifiedImage).toBe('boolean');
      expect(product).toHaveProperty('imageAlt');
    });

    // Check photographic product has valid URL
    const photoProduct = res.body.data.find((p) => p.id === 'lap-lenovo-e14-g5');
    expect(photoProduct.hasVerifiedImage).toBe(true);
    expect(photoProduct.imageUrl).toContain('images.unsplash.com');

    // Check placeholder-backed product has null imageUrl
    const placeholderProduct = res.body.data.find((p) => p.id === 'lap-framework-13');
    expect(placeholderProduct.hasVerifiedImage).toBe(false);
    expect(placeholderProduct.imageUrl).toBeNull();
  });
});
