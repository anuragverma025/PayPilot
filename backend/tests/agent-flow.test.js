/**
 * agent-flow.test.js
 *
 * Focused tests for the end-to-end shopping-agent flow:
 *   1. User describes goal → clarification when vague
 *   2. User selects profile → forceRecommend bypasses clarification
 *   3. Specific budget/spec queries go straight to decision report
 *   4. Clarification options carry a `.query` field for re-submission
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AIService } from '../src/services/ai.service.js';
import { chatRequestSchema } from '../src/validators/assistant.validator.js';
import { assistantValidator } from '../src/validators/assistant.validator.js';

// ---------------------------------------------------------------------------
// Unit tests for isClarificationNeeded
// ---------------------------------------------------------------------------
describe('AIService.isClarificationNeeded', () => {
  it('returns true for a bare vague query ("best laptop")', () => {
    expect(AIService.isClarificationNeeded('best laptop')).toBe(true);
  });

  it('returns true for a vague query with no budget or spec ("good laptop for college")', () => {
    expect(AIService.isClarificationNeeded('good laptop for college')).toBe(true);
  });

  it('returns true for "I need a laptop" with no budget or spec', () => {
    expect(AIService.isClarificationNeeded('I need a laptop')).toBe(true);
  });

  it('returns false when budget is specified in rupees shorthand ("laptop under 50k")', () => {
    expect(AIService.isClarificationNeeded('laptop under 50k')).toBe(false);
  });

  it('returns false when budget is specified with ₹ symbol ("laptop under ₹60,000")', () => {
    expect(AIService.isClarificationNeeded('laptop under ₹60,000 for coding')).toBe(false);
  });

  it('returns false when budget keyword "below" is present', () => {
    expect(AIService.isClarificationNeeded('laptop below 45000 for students')).toBe(false);
  });

  it('returns false when RAM spec is present ("16GB RAM")', () => {
    expect(AIService.isClarificationNeeded('laptop with 16GB RAM for development')).toBe(false);
  });

  it('returns false when GPU keyword "RTX" is present', () => {
    expect(AIService.isClarificationNeeded('gaming laptop with RTX GPU')).toBe(false);
  });

  it('returns false when a brand/model name is present ("MacBook")', () => {
    expect(AIService.isClarificationNeeded('best MacBook for programming')).toBe(false);
  });

  it('returns false when "dedicated" GPU keyword is present', () => {
    expect(AIService.isClarificationNeeded('laptop with dedicated graphics card')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration tests for POST /api/assistant/chat
// ---------------------------------------------------------------------------
describe('POST /api/assistant/chat — agent flow', () => {
  // Use a short timeout; the AI call is mocked via the in-memory cache or
  // will attempt Gemini. For integration tests with vague queries, the
  // clarification path never calls Gemini, so it is fast.

  describe('vague query (no budget, no spec) — unit-level via processShoppingRequest', () => {
    let result;
    beforeAll(async () => {
      result = await AIService.processShoppingRequest('best laptop');
    }, 5000);

    it('returns needsClarification: true', () => {
      expect(result.needsClarification).toBe(true);
    });

    it('returns the original query', () => {
      expect(result.query).toBe('best laptop');
    });

    it('includes a clarification question string', () => {
      expect(typeof result.clarification?.question).toBe('string');
      expect(result.clarification.question.length).toBeGreaterThan(5);
    });

    it('includes a clarification explanation string', () => {
      expect(typeof result.clarification?.explanation).toBe('string');
    });

    it('includes exactly 3 profile options', () => {
      expect(Array.isArray(result.clarification?.options)).toBe(true);
      expect(result.clarification.options).toHaveLength(3);
    });

    it('each option has a non-empty .query field', () => {
      for (const option of result.clarification.options) {
        expect(typeof option.query).toBe('string');
        expect(option.query.length).toBeGreaterThan(0);
      }
    });

    it('each option has a label and description', () => {
      for (const option of result.clarification.options) {
        expect(typeof option.label).toBe('string');
        expect(typeof option.description).toBe('string');
      }
    });

    it('option queries embed the original query text', () => {
      for (const option of result.clarification.options) {
        expect(option.query.toLowerCase()).toContain('best laptop');
      }
    });
  });

  describe('vague query with forceRecommend: true — unit-level', () => {
    // This path calls Gemini — skip in pure unit-test environments
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

    it('does NOT return needsClarification when forceRecommend is true', { timeout: 30000, skip: !hasApiKey }, async () => {
      const result = await AIService.processShoppingRequest('best laptop', { forceRecommend: true });
      expect(result.needsClarification).toBeFalsy();
    });
  });

  describe('specific query with budget — unit-level', () => {
    const hasApiKey = Boolean(process.env.GEMINI_API_KEY);

    it('returns a full decision report when budget is provided', { timeout: 30000, skip: !hasApiKey }, async () => {
      const result = await AIService.processShoppingRequest('laptop under ₹60,000 for software development with 16GB RAM');
      expect(result.needsClarification).toBeFalsy();
      const hasPrimary = result.primaryRecommendation || result.recommendations;
      expect(hasPrimary).toBeTruthy();
    });
  });

  describe('missing message validation', () => {
    it('Zod schema rejects a missing message', () => {
      const result = chatRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('Zod schema rejects an empty string message', () => {
      const result = chatRequestSchema.safeParse({ message: '' });
      expect(result.success).toBe(false);
    });

    it('Zod schema rejects a message shorter than 3 characters', () => {
      const result = chatRequestSchema.safeParse({ message: 'hi' });
      expect(result.success).toBe(false);
    });

    it('Zod schema accepts a valid message without forceRecommend', () => {
      const result = chatRequestSchema.safeParse({ message: 'best laptop' });
      expect(result.success).toBe(true);
    });

    it('Zod schema accepts a valid message with forceRecommend: true', () => {
      const result = chatRequestSchema.safeParse({ message: 'best laptop', forceRecommend: true });
      expect(result.success).toBe(true);
      expect(result.data.forceRecommend).toBe(true);
    });

    it('Zod schema accepts a valid message with forceRecommend omitted (optional)', () => {
      const result = chatRequestSchema.safeParse({ message: 'laptop for coding' });
      expect(result.success).toBe(true);
      expect(result.data.forceRecommend).toBeUndefined();
    });
  });
});
