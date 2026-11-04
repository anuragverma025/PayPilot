/**
 * decision-report-grounding.test.js
 *
 * Focused tests for:
 * 1. Match score calculation, tie-breaking, and image-independence
 * 2. Savings validation (catalog-grounded original price vs budget delta)
 * 3. Concrete alternative trade-offs generation
 * 4. Catalog claim sanitization (RAM upgradeability, GPU, savings)
 */

import { describe, it, expect } from 'vitest';
import { RankingService } from '../src/services/ranking.service.js';
import {
  computeConcreteTradeOffs,
  sanitizeAndVerifyClaims,
  hasHardwareContradiction
} from '../src/services/ai.service.js';

describe('Shopping Decision Report — Scoring, Savings & Grounding Suite', () => {
  const baseLaptop = {
    id: 'test-primary',
    name: 'Pro Laptop 14',
    brand: 'TestBrand',
    priceINR: 60000,
    priceUSD: 720,
    processor: { brand: 'AMD', model: 'Ryzen 7 7730U', cores: 8, tier: 'high' },
    ram: { capacityGB: 16, type: 'DDR4', isUpgradable: false },
    storage: { capacityGB: 512, isUpgradable: true, extraSlot: false },
    gpu: { type: 'integrated', brand: 'AMD', model: 'Radeon', vramGB: 0 },
    battery: { realWorldHoursEstimate: 8.5 },
    weightKg: 1.38,
    strengths: ['Compact 1.38kg chassis', '8-core processor'],
    tradeOffs: ['Integrated GPU only', 'Soldered RAM'],
    imageUrl: 'https://images.unsplash.com/photo-laptop',
    hasVerifiedImage: true
  };

  // -------------------------------------------------------------------------
  // 1. Match score calculation and image independence
  // -------------------------------------------------------------------------
  describe('Match score calculation and image independence', () => {
    it('produces identical match scores regardless of image presence or verification', () => {
      const laptopWithImage = { ...baseLaptop, hasVerifiedImage: true, imageUrl: 'https://images.unsplash.com/photo-1' };
      const laptopWithoutImage = { ...baseLaptop, hasVerifiedImage: false, imageUrl: null };

      const scoreWith = RankingService.scoreProduct(laptopWithImage, { maxBudget: 70000, minRam: 16 });
      const scoreWithout = RankingService.scoreProduct(laptopWithoutImage, { maxBudget: 70000, minRam: 16 });

      expect(scoreWith.score).toBe(scoreWithout.score);
      expect(scoreWith.breakdown).toEqual(scoreWithout.breakdown);
    });

    it('ranks products strictly descending by match score, breaking ties by lower price', () => {
      const productA = { ...baseLaptop, id: 'a', priceINR: 60000 };
      const productB = { ...baseLaptop, id: 'b', priceINR: 52000 }; // Same specs, lower price -> should tie on score, win tie-breaker

      const ranked = RankingService.rankProducts([productA, productB], { maxBudget: 70000, minRam: 16 });

      // If scores are equal, lower price must rank first
      if (ranked[0].matchScore === ranked[1].matchScore) {
        expect(ranked[0].priceINR).toBeLessThan(ranked[1].priceINR);
        expect(ranked[0].id).toBe('b');
      } else {
        expect(ranked[0].matchScore).toBeGreaterThanOrEqual(ranked[1].matchScore);
      }
    });

    it('documents the deterministic tie-breaker rule', () => {
      expect(typeof RankingService.TIE_BREAKER_RULE).toBe('string');
      expect(RankingService.TIE_BREAKER_RULE.toLowerCase()).toContain('lower price');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Savings: verified original price vs user budget
  // -------------------------------------------------------------------------
  describe('Savings verification', () => {
    it('never uses user budget delta as a "saves" claim in ranking matchedRequirements', () => {
      const result = RankingService.scoreProduct(baseLaptop, { maxBudget: 80000, minRam: 16 });

      // Budget delta is ₹20,000, but matchedRequirements must not claim "saves ₹20,000"
      for (const req of result.matchedRequirements) {
        expect(req.toLowerCase()).not.toMatch(/saves?\s+[₹$]/);
      }
    });

    it('sanitizes hallucinated savings claims when catalog has no verified original price', () => {
      const unverifiedClaims = [
        'Saves ₹10,000 compared to budget',
        '8-core high-speed CPU',
        'Instant discount applied'
      ];

      const { verifiedAdvantages } = sanitizeAndVerifyClaims(baseLaptop, unverifiedClaims, []);

      // Fake savings claims must be stripped
      expect(verifiedAdvantages.some((adv) => adv.includes('Saves'))).toBe(false);
      expect(verifiedAdvantages.some((adv) => adv.includes('discount'))).toBe(false);
      expect(verifiedAdvantages.some((adv) => adv.includes('8-core'))).toBe(true);
    });

    it('allows savings claims only when catalog has a verified originalPriceINR > priceINR', () => {
      const discountedLaptop = {
        ...baseLaptop,
        originalPriceINR: 75000,
        priceINR: 60000
      };

      const claims = ['Saves ₹15,000 off original list price', '8-core CPU'];
      const { verifiedAdvantages } = sanitizeAndVerifyClaims(discountedLaptop, claims, []);

      expect(verifiedAdvantages.some((adv) => adv.includes('Saves ₹15,000'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Alternative trade-offs: concrete and verified
  // -------------------------------------------------------------------------
  describe('Alternative trade-offs calculation', () => {
    const alternativeLaptop = {
      ...baseLaptop,
      id: 'test-alt',
      name: 'Gaming PowerBook',
      priceINR: 65000,
      gpu: { type: 'dedicated', model: 'RTX 4050', vramGB: 6 },
      ram: { capacityGB: 16, isUpgradable: true },
      battery: { realWorldHoursEstimate: 5.0 },
      weightKg: 2.1
    };

    it('identifies concrete advantages and drawbacks relative to top pick', () => {
      const { advantages, drawbacks, comparisonText } = computeConcreteTradeOffs(alternativeLaptop, baseLaptop);

      // Advantage: dedicated GPU, upgradable RAM
      expect(advantages.some((a) => a.includes('Dedicated RTX 4050') || a.includes('Upgradable'))).toBe(true);

      // Drawback: costs more, shorter battery, heavier weight
      expect(drawbacks.some((d) => d.includes('Costs') || d.includes('Shorter battery') || d.includes('Heavier'))).toBe(true);

      expect(comparisonText).toContain('Advantage:');
      expect(comparisonText).toContain('Drawback:');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Specification claims verification (RAM upgradeability & GPU)
  // -------------------------------------------------------------------------
  describe('Specification claims verification', () => {
    it('removes RAM upgradeability claims when catalog specifies isUpgradable: false', () => {
      const solderedLaptop = {
        ...baseLaptop,
        ram: { capacityGB: 16, isUpgradable: false }
      };

      const rawClaims = [
        'Upgradable RAM up to 32GB',
        'Modular expandable memory',
        'Crisp display'
      ];

      const { verifiedAdvantages, verifiedTradeOffs } = sanitizeAndVerifyClaims(solderedLaptop, rawClaims, []);

      // Upgradable claims must be stripped
      expect(verifiedAdvantages.some((a) => a.toLowerCase().includes('upgradable'))).toBe(false);
      expect(verifiedAdvantages.some((a) => a.toLowerCase().includes('expandable'))).toBe(false);

      // Honest trade-off must note soldered RAM
      expect(verifiedTradeOffs.some((t) => t.toLowerCase().includes('soldered'))).toBe(true);
    });

    it('preserves RAM upgradeability claims when catalog confirms isUpgradable: true', () => {
      const upgradableLaptop = {
        ...baseLaptop,
        ram: { capacityGB: 16, isUpgradable: true }
      };

      const rawClaims = ['Upgradable RAM slots for future expansion', 'Long battery runtime'];
      const { verifiedAdvantages } = sanitizeAndVerifyClaims(upgradableLaptop, rawClaims, []);

      expect(verifiedAdvantages.some((a) => a.toLowerCase().includes('upgradable'))).toBe(true);
    });

    it('strips dedicated GPU claims when laptop has integrated graphics', () => {
      const igpuLaptop = {
        ...baseLaptop,
        gpu: { type: 'integrated', vramGB: 0 }
      };

      const rawClaims = ['Dedicated GPU with RTX ray tracing', 'Quiet cooling'];
      const { verifiedAdvantages } = sanitizeAndVerifyClaims(igpuLaptop, rawClaims, []);

      expect(verifiedAdvantages.some((a) => a.toLowerCase().includes('dedicated gpu'))).toBe(false);
      expect(verifiedAdvantages.some((a) => a.toLowerCase().includes('rtx'))).toBe(false);
      expect(verifiedAdvantages.some((a) => a.includes('Quiet cooling'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Hardware CPU & GPU Grounding Regression Suite (HP Victus Mismatch Fix)
  // -------------------------------------------------------------------------
  describe('Hardware CPU & GPU Grounding Regression Suite', () => {
    const hpVictus = {
      id: 'lap-hp-victus-16',
      name: 'HP Victus 16 (Ryzen 7, RTX 3050)',
      brand: 'HP',
      model: '16-s0093AX',
      priceINR: 68990,
      processor: {
        brand: 'AMD',
        model: 'Ryzen 7 7840HS',
        cores: 8,
        tier: 'high'
      },
      ram: { capacityGB: 16, isUpgradable: true },
      gpu: {
        type: 'dedicated',
        brand: 'NVIDIA',
        model: 'GeForce RTX 3050 6GB',
        vramGB: 6
      },
      battery: { realWorldHoursEstimate: 5.5 },
      weightKg: 2.3,
      strengths: [
        'Powerful Ryzen 7 7840HS processor with 8 Zen4 cores and Ryzen AI built-in',
        'Spacious 16.1-inch 144Hz screen and dual-channel DDR5-5600 RAM'
      ],
      tradeOffs: ['Weighs 2.3kg which is noticeably heavy in a backpack']
    };

    it('detects CPU and GPU contradictions when explanation claims 13th Gen Intel + RTX 4050 for HP Victus', () => {
      const mismatchedClaim = 'HP Victus 16 is powered by a 13th Gen Intel Core i5 and NVIDIA RTX 4050 graphics.';
      expect(hasHardwareContradiction(mismatchedClaim, hpVictus)).toBe(true);
    });

    it('detects CPU contradiction when explanation claims Intel CPU on AMD laptop', () => {
      expect(hasHardwareContradiction('Features latest 13th Gen Intel Core i7 processor', hpVictus)).toBe(true);
      expect(hasHardwareContradiction('Intel Core i5 architecture for fast compiling', hpVictus)).toBe(true);
    });

    it('detects GPU contradiction when explanation claims RTX 4050 on RTX 3050 laptop', () => {
      expect(hasHardwareContradiction('Comes equipped with NVIDIA RTX 4050 6GB for neural networks', hpVictus)).toBe(true);
      expect(hasHardwareContradiction('RTX 4060 graphics card for heavy 3D rendering', hpVictus)).toBe(true);
    });

    it('accepts explanations that match the verified CPU and GPU catalog fields', () => {
      const validText = 'HP Victus 16 features an AMD Ryzen 7 7840HS processor and GeForce RTX 3050 GPU for strong multitasking.';
      expect(hasHardwareContradiction(validText, hpVictus)).toBe(false);
    });

    it('sanitizes and purges mismatched CPU/GPU claims from advantages', () => {
      const rawClaims = [
        'NVIDIA RTX 4050 with 6GB VRAM for high-end rendering',
        '13th Gen Intel Core processor for fast single-core speed',
        'Spacious 16.1-inch 144Hz screen'
      ];

      const { verifiedAdvantages } = sanitizeAndVerifyClaims(hpVictus, rawClaims, []);

      // Contradictory claims must be purged
      expect(verifiedAdvantages.some((a) => a.includes('RTX 4050'))).toBe(false);
      expect(verifiedAdvantages.some((a) => a.includes('Intel'))).toBe(false);
      // Valid catalog claim must be preserved
      expect(verifiedAdvantages.some((a) => a.includes('144Hz screen'))).toBe(true);
    });

    it('detects AMD CPU contradiction on an Intel laptop', () => {
      const intelLaptop = {
        id: 'lap-acer-nitro-v15',
        name: 'Acer Nitro V 15',
        processor: { brand: 'Intel', model: 'Core i5-13420H', cores: 8 },
        gpu: { type: 'dedicated', model: 'GeForce RTX 4050', vramGB: 6 }
      };

      expect(hasHardwareContradiction('Powered by AMD Ryzen 7 processor', intelLaptop)).toBe(true);
      expect(hasHardwareContradiction('Features Core i5-13420H and RTX 4050', intelLaptop)).toBe(false);
    });
  });
});

