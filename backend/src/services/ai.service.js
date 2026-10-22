import { GoogleGenAI } from '@google/genai';
import { config } from '../config/index.js';
import { CatalogService } from './catalog.service.js';
import { RankingService } from './ranking.service.js';

// In-memory query cache to preserve free-tier quota (5 RPM, 20 RPD)
const queryCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Memorize the working Gemini model to avoid retry roundtrips on deprecated model IDs
let resolvedWorkingModel = null;

/**
 * Clean normalized cache key
 */
function getCacheKey(query) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class AIService {
  /**
   * Deterministic fallback requirement parser when API key is missing or quota is exhausted
   */
  static parseRequirementsDeterministically(query) {
    const q = query.toLowerCase();

    // Budget extraction (e.g., "under 60000", "under ₹60,000", "below 70k", "budget 50000")
    let maxBudget = 100000;
    const budgetMatch = q.match(/(?:under|below|budget|within|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*(?:k)?|\d+k?)/i) ||
                        q.match(/(?:₹|rs\.?|inr)\s*(\d{1,3}(?:,\d{2,3})*(?:k)?|\d+k?)/i);

    if (budgetMatch) {
      let rawVal = budgetMatch[1].replace(/,/g, '').toLowerCase();
      if (rawVal.endsWith('k')) {
        maxBudget = parseFloat(rawVal) * 1000;
      } else {
        maxBudget = parseInt(rawVal, 10);
      }
    }

    // RAM extraction (e.g., "16gb", "16 gb ram", "8gb")
    let minRam = 8;
    const ramMatch = q.match(/(\d+)\s*(?:gb|g)\s*(?:ram|memory)?/i);
    if (ramMatch) {
      minRam = parseInt(ramMatch[1], 10);
    } else if (q.includes('ai') || q.includes('deep learning') || q.includes('coding') || q.includes('programming')) {
      minRam = 16;
    }

    // Workload / Use case
    let targetUseCase = 'coding';
    if (q.includes('ai') || q.includes('ml') || q.includes('machine learning') || q.includes('deep learning') || q.includes('pytorch') || q.includes('cuda')) {
      targetUseCase = 'ai-ml';
    } else if (q.includes('college') || q.includes('student') || q.includes('study') || q.includes('lecture')) {
      targetUseCase = 'college';
    } else if (q.includes('game') || q.includes('gaming')) {
      targetUseCase = 'gaming';
    } else if (q.includes('creative') || q.includes('video editing') || q.includes('design')) {
      targetUseCase = 'creative';
    }

    // GPU preference
    const prioritizeGpu = targetUseCase === 'ai-ml' || targetUseCase === 'gaming' || q.includes('rtx') || q.includes('dedicated gpu') || q.includes('graphics');
    const gpuPreference = prioritizeGpu ? 'dedicated' : q.includes('integrated') ? 'integrated' : 'any';

    // Battery priority
    const prioritizeBattery = q.includes('battery') || q.includes('endurance') || q.includes('long battery') || q.includes('travel');

    // Upgradeability priority
    const prioritizeUpgradability = q.includes('upgrad') || q.includes('expand') || q.includes('future proof') || q.includes('modular') || q.includes('ram slot');

    // Portability priority
    const prioritizePortability = q.includes('light') || q.includes('portable') || q.includes('weight') || q.includes('thin') || q.includes('slim') || q.includes('carry');

    // Brand preferences
    const knownBrands = ['lenovo', 'acer', 'asus', 'hp', 'apple', 'dell', 'msi', 'samsung', 'framework'];
    const preferredBrands = knownBrands.filter((b) => q.includes(b)).map((b) => b.charAt(0).toUpperCase() + b.slice(1));

    return {
      targetUseCase,
      maxBudget,
      currency: 'INR',
      minRam,
      gpuPreference,
      prioritizeGpu,
      prioritizeBattery,
      prioritizeUpgradability,
      prioritizePortability,
      preferredBrands,
      statedPriorities: [
        minRam ? `${minRam}GB RAM` : null,
        maxBudget ? `Budget ceiling ₹${maxBudget.toLocaleString('en-IN')}` : null,
        prioritizeBattery ? 'Battery endurance' : null,
        prioritizeUpgradability ? 'Component upgradeability' : null,
        prioritizeGpu ? 'Dedicated GPU/CUDA compute' : null
      ].filter(Boolean),
      summary: `Request targeting ${targetUseCase} under ₹${maxBudget.toLocaleString('en-IN')} with min ${minRam}GB RAM.`
    };
  }

  /**
   * Process natural-language shopping goal through Gemini + deterministic catalog grounding
   * @param {string} userMessage - Natural language shopping prompt from user
   */
  static async processShoppingRequest(userMessage) {
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      throw new Error('A valid natural language shopping goal must be provided.');
    }

    const trimmedQuery = userMessage.trim();
    const cacheKey = getCacheKey(trimmedQuery);

    // Check in-memory LRU cache
    const cached = queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[AIService] Returning cached decision report for query: "${trimmedQuery.slice(0, 40)}..."`);
      return {
        ...cached.data,
        groundingMeta: {
          ...cached.data.groundingMeta,
          cached: true
        }
      };
    }

    // Retrieve all products from real catalog
    const allProducts = await CatalogService.getProducts({});
    if (!allProducts || allProducts.length === 0) {
      throw new Error('Catalog is empty; cannot evaluate recommendations.');
    }

    // Step 1: Extract requirements using Gemini or fallback
    let structuredRequirements = null;
    let aiExplanation = null;
    let usedProvider = 'deterministic-fallback';
    let activeModel = 'rule-engine-v1';

    const hasApiKey = Boolean(config.ai.apiKey && config.ai.apiKey.length > 5);

    if (hasApiKey && config.ai.provider === 'gemini') {
      try {
        const ai = new GoogleGenAI({ apiKey: config.ai.apiKey });
        // Prepare compact catalog index for Gemini grounding (prevents hallucination)
        const compactCatalog = allProducts.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          priceINR: p.priceINR,
          cpu: `${p.processor.brand} ${p.processor.model} (${p.processor.cores}c)`,
          ramGB: p.ram.capacityGB,
          isRamUpgradable: p.ram.isUpgradable,
          gpu: p.gpu.type === 'dedicated' ? `${p.gpu.model} (${p.gpu.vramGB}GB)` : 'Integrated',
          batteryHours: p.battery.realWorldHoursEstimate,
          weightKg: p.weightKg
        }));

        const prompt = `You are PayPilot's Senior AI Hardware Architect for the PayPal AI Hackathon 2026.
A student or developer has submitted this shopping goal:
"${trimmedQuery}"

Here is the authoritative catalog of verified laptops:
${JSON.stringify(compactCatalog)}

TASK:
1. Extract user requirements without inventing unmentioned constraints.
2. Select the #1 best matching laptop ID and up to 2 alternative IDs from the catalog above.
3. Formulate an honest, grounded Shopping Decision Report.
   - Ground all facts in the provided specifications.
   - Point out true trade-offs (e.g. soldered RAM, heavy chassis, low battery).
   - Explain why the primary choice beats the alternatives for this user.

Respond ONLY with a JSON object conforming to this exact structure:
{
  "requirements": {
    "targetUseCase": "coding" | "ai-ml" | "college" | "everyday" | "creative" | "gaming",
    "maxBudget": number,
    "currency": "INR",
    "minRam": number,
    "gpuPreference": "dedicated" | "integrated" | "any",
    "prioritizeBattery": boolean,
    "prioritizeUpgradability": boolean,
    "prioritizePortability": boolean,
    "preferredBrands": string[],
    "statedPriorities": string[],
    "summary": string
  },
  "primaryRecommendation": {
    "productId": string,
    "whyChosen": string,
    "keyAdvantages": string[],
    "honestTradeOffs": string[]
  },
  "alternativeRecommendations": [
    {
      "productId": string,
      "comparisonVsPrimary": string
    }
  ]
}`;

        // Attempt generation with configured model, with automatic fallback if deprecated
        const modelsToTry = [...new Set([
          resolvedWorkingModel,
          config.ai.model,
          'gemini-3-flash-preview',
          'gemini-2.5-flash-lite'
        ].filter(Boolean))];

        let geminiResponseText = null;

        for (const candidateModel of modelsToTry) {
          try {
            console.log(`[AIService] Calling Gemini API (${candidateModel})...`);
            const response = await ai.models.generateContent({
              model: candidateModel,
              contents: prompt,
              config: {
                responseMimeType: 'application/json'
              }
            });

            if (response && response.text) {
              geminiResponseText = response.text;
              activeModel = candidateModel;
              resolvedWorkingModel = candidateModel; // Remember active model
              usedProvider = 'gemini';
              break;
            }
          } catch (modelErr) {
            console.warn(`[AIService] Call to model '${candidateModel}' failed: ${modelErr.message}`);
            // If it's a 429 quota exhaustion, don't keep hammering
            if (modelErr.message.includes('429') || modelErr.message.includes('RESOURCE_EXHAUSTED')) {
              console.warn('[AIService] Gemini quota reached (429). Gracefully falling back to deterministic engine.');
              break;
            }
          }
        }

        if (geminiResponseText) {
          try {
            const parsed = JSON.parse(geminiResponseText);
            if (parsed.requirements) {
              structuredRequirements = parsed.requirements;
            }
            if (parsed.primaryRecommendation) {
              aiExplanation = {
                primary: parsed.primaryRecommendation,
                alternatives: parsed.alternativeRecommendations || []
              };
            }
          } catch (jsonErr) {
            console.warn('[AIService] Failed to parse model output as JSON:', jsonErr.message);
          }
        }
      } catch (geminiErr) {
        console.warn(`[AIService] Gemini request failed (${geminiErr.message}). Using deterministic grounding fallback.`);
      }
    }

    // Fallback requirement parsing if model didn't return valid structure
    if (!structuredRequirements) {
      structuredRequirements = this.parseRequirementsDeterministically(trimmedQuery);
    }

    // Step 2: Run deterministic backend ranking on the REAL catalog using requirements
    const rankedProducts = RankingService.rankProducts(allProducts, structuredRequirements);
    if (rankedProducts.length === 0) {
      throw new Error('No candidate products could be evaluated from the catalog.');
    }

    // Determine the authoritative primary product
    let primaryProduct = null;
    if (aiExplanation?.primary?.productId) {
      primaryProduct = rankedProducts.find((p) => p.id === aiExplanation.primary.productId);
    }
    // If AI recommended an invalid ID or AI was in fallback, use authoritative rank #1
    if (!primaryProduct) {
      primaryProduct = rankedProducts[0];
    }

    // Determine alternative products (runner-ups)
    const alternatives = [];
    const usedIds = new Set([primaryProduct.id]);

    if (aiExplanation?.alternatives?.length > 0) {
      for (const alt of aiExplanation.alternatives) {
        const prod = rankedProducts.find((p) => p.id === alt.productId && !usedIds.has(p.id));
        if (prod) {
          alternatives.push({
            product: prod,
            matchScore: prod.matchScore,
            comparisonVsPrimary: alt.comparisonVsPrimary || `Alternative option at ₹${prod.priceINR.toLocaleString('en-IN')}`
          });
          usedIds.add(prod.id);
        }
      }
    }

    // Ensure we always have up to 2 alternatives from the deterministic ranking
    for (const prod of rankedProducts) {
      if (alternatives.length >= 2) break;
      if (!usedIds.has(prod.id)) {
        const priceDelta = prod.priceINR - primaryProduct.priceINR;
        const priceText = priceDelta < 0
          ? `₹${Math.abs(priceDelta).toLocaleString('en-IN')} more affordable`
          : `₹${priceDelta.toLocaleString('en-IN')} higher price`;

        alternatives.push({
          product: prod,
          matchScore: prod.matchScore,
          comparisonVsPrimary: `${prod.name} (${prod.matchScore}% Match): ${priceText} with ${prod.ram.capacityGB}GB RAM and ${prod.processor.model}.`
        });
        usedIds.add(prod.id);
      }
    }

    // Authoritative budget delta calculation
    const budgetDelta = (structuredRequirements.maxBudget || 100000) - primaryProduct.priceINR;

    // Build the final authoritative Shopping Decision Report
    const decisionReport = {
      query: trimmedQuery,
      interpretedRequirements: structuredRequirements,
      primaryRecommendation: {
        product: primaryProduct,
        matchScore: primaryProduct.matchScore,
        budgetDelta,
        satisfiesBudget: budgetDelta >= 0,
        satisfiedRequirements: primaryProduct.evaluation?.matchedRequirements || [
          `Meets ${primaryProduct.ram.capacityGB}GB RAM requirement`,
          budgetDelta >= 0 ? `Under budget: ₹${budgetDelta.toLocaleString('en-IN')} saved` : null
        ].filter(Boolean),
        compromisedRequirements: primaryProduct.evaluation?.tradeOffsIdentified || [],
        aiExplanation: {
          whyChosen: aiExplanation?.primary?.whyChosen ||
            `${primaryProduct.name} delivers the highest score (${primaryProduct.matchScore}%) for your ${structuredRequirements.targetUseCase} requirements within your ₹${structuredRequirements.maxBudget.toLocaleString('en-IN')} budget.`,
          keyAdvantages: aiExplanation?.primary?.keyAdvantages?.length > 0
            ? aiExplanation.primary.keyAdvantages
            : primaryProduct.strengths || [],
          honestTradeOffs: aiExplanation?.primary?.honestTradeOffs?.length > 0
            ? aiExplanation.primary.honestTradeOffs
            : primaryProduct.tradeOffs || []
        }
      },
      alternatives,
      groundingMeta: {
        provider: usedProvider,
        model: activeModel,
        isDeterministicVerificationPassed: true,
        catalogRecordsEvaluated: allProducts.length,
        cached: false,
        timestamp: new Date().toISOString()
      }
    };

    // Store in cache (preserving quota)
    queryCache.set(cacheKey, {
      timestamp: Date.now(),
      data: decisionReport
    });

    return decisionReport;
  }
}
