import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { AIService } from '../src/services/ai.service.js';

describe('AI Shopping Assistant Service & Endpoint', () => {
  it('deterministic parser extracts structured requirements correctly', () => {
    const parsed = AIService.parseRequirementsDeterministically(
      'I need a laptop for college coding and AI projects under ₹60,000. Prioritize RAM, battery life, and upgradeability.'
    );

    expect(parsed.targetUseCase).toBe('ai-ml');
    expect(parsed.maxBudget).toBe(60000);
    expect(parsed.minRam).toBe(16);
    expect(parsed.prioritizeBattery).toBe(true);
    expect(parsed.prioritizeUpgradability).toBe(true);
  });

  it('POST /api/assistant/chat processes natural language request with grounded catalog recommendations', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({
        message: 'Looking for a coding laptop under ₹70,000 with 16GB RAM'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data).toHaveProperty('interpretedRequirements');
    expect(data.interpretedRequirements.maxBudget).toBeLessThanOrEqual(70000);

    expect(data).toHaveProperty('primaryRecommendation');
    expect(data.primaryRecommendation).toHaveProperty('product');
    expect(data.primaryRecommendation.product).toHaveProperty('id');
    expect(data.primaryRecommendation.product).toHaveProperty('priceINR');
    expect(data.primaryRecommendation).toHaveProperty('matchScore');
    expect(data.primaryRecommendation).toHaveProperty('aiExplanation');

    expect(Array.isArray(data.alternatives)).toBe(true);
    expect(data).toHaveProperty('groundingMeta');
    expect(data.groundingMeta.isDeterministicVerificationPassed).toBe(true);
  }, 30000);

  it('POST /api/assistant/chat caches identical queries to preserve quota', async () => {
    const query = 'Fast coding machine under ₹55,000';
    const firstRes = await request(app)
      .post('/api/assistant/chat')
      .send({ message: query });
    expect(firstRes.status).toBe(200);

    const secondRes = await request(app)
      .post('/api/assistant/chat')
      .send({ message: query });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.groundingMeta.cached).toBe(true);
  }, 30000);

  it('POST /api/assistant/chat rejects empty or too short requests', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .send({ message: 'hi' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
