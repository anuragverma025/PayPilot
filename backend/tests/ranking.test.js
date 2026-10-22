import { describe, it, expect } from 'vitest';
import { RankingService } from '../src/services/ranking.service.js';

describe('Deterministic Ranking Service', () => {
  const mockProduct = {
    id: 'test-laptop',
    name: 'Test Dev Book',
    brand: 'DevCorp',
    priceINR: 55000,
    processor: { model: 'AMD Ryzen 7', cores: 8, tier: 'high' },
    ram: { capacityGB: 16, isUpgradable: true },
    storage: { capacityGB: 512, extraSlot: true },
    gpu: { type: 'integrated', vramGB: 0 },
    battery: { realWorldHoursEstimate: 8.0 },
    weightKg: 1.4
  };

  it('scores product accurately within budget', () => {
    const result = RankingService.scoreProduct(mockProduct, {
      maxBudget: 60000,
      minRam: 16,
      targetUseCase: 'coding'
    });

    expect(result.satisfiesBudget).toBe(true);
    expect(result.budgetDelta).toBe(5000);
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.matchedRequirements.length).toBeGreaterThan(0);
  });

  it('penalizes products exceeding user budget limit', () => {
    const withinBudget = RankingService.scoreProduct(mockProduct, {
      maxBudget: 60000,
      minRam: 16
    });

    const overBudget = RankingService.scoreProduct(mockProduct, {
      maxBudget: 40000,
      minRam: 16
    });

    expect(overBudget.satisfiesBudget).toBe(false);
    expect(overBudget.score).toBeLessThan(withinBudget.score);
    expect(overBudget.tradeOffsIdentified.some((t) => t.includes('Exceeds budget'))).toBe(true);
  });

  it('prioritizes dedicated GPU when targetUseCase is ai-ml', () => {
    const aiLaptop = {
      ...mockProduct,
      id: 'ai-laptop',
      gpu: { type: 'dedicated', model: 'RTX 4050', vramGB: 6 }
    };

    const regularLaptop = {
      ...mockProduct,
      id: 'igpu-laptop',
      gpu: { type: 'integrated', vramGB: 0 }
    };

    const aiScore = RankingService.scoreProduct(aiLaptop, { targetUseCase: 'ai-ml', maxBudget: 70000 });
    const regularScore = RankingService.scoreProduct(regularLaptop, { targetUseCase: 'ai-ml', maxBudget: 70000 });

    expect(aiScore.breakdown.workloadScore).toBeGreaterThan(regularScore.breakdown.workloadScore);
    expect(aiScore.score).toBeGreaterThan(regularScore.score);
  });
});
