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

/**
 * Computes concrete, catalog-grounded advantages and drawbacks of an alternative product
 * relative to the top pick (primaryProduct).
 */
export function computeConcreteTradeOffs(altProduct, primaryProduct) {
  const advantages = [];
  const drawbacks = [];

  // 1. Price comparison
  const priceDelta = altProduct.priceINR - primaryProduct.priceINR;
  if (priceDelta < 0) {
    advantages.push(`₹${Math.abs(priceDelta).toLocaleString('en-IN')} more affordable (₹${altProduct.priceINR.toLocaleString('en-IN')} vs ₹${primaryProduct.priceINR.toLocaleString('en-IN')})`);
  } else if (priceDelta > 0) {
    drawbacks.push(`Costs ₹${priceDelta.toLocaleString('en-IN')} more (₹${altProduct.priceINR.toLocaleString('en-IN')} vs ₹${primaryProduct.priceINR.toLocaleString('en-IN')})`);
  }

  // 2. RAM capacity & upgradability
  const altRam = altProduct.ram?.capacityGB || 0;
  const primRam = primaryProduct.ram?.capacityGB || 0;
  if (altRam > primRam) {
    advantages.push(`More RAM: ${altRam}GB vs ${primRam}GB`);
  } else if (altRam < primRam) {
    drawbacks.push(`Less RAM: ${altRam}GB vs ${primRam}GB`);
  }

  const altRamUp = altProduct.ram?.isUpgradable === true;
  const primRamUp = primaryProduct.ram?.isUpgradable === true;
  if (altRamUp && !primRamUp) {
    advantages.push('Upgradable SO-DIMM RAM (primary has soldered non-upgradable RAM)');
  } else if (!altRamUp && primRamUp) {
    drawbacks.push('Soldered non-upgradable RAM (primary has upgradable RAM)');
  }

  // 3. GPU / Graphics comparison
  const altGpuType = altProduct.gpu?.type || 'integrated';
  const primGpuType = primaryProduct.gpu?.type || 'integrated';
  const altVram = altProduct.gpu?.vramGB || 0;
  const primVram = primaryProduct.gpu?.vramGB || 0;

  if (altGpuType === 'dedicated' && primGpuType === 'integrated') {
    advantages.push(`Dedicated ${altProduct.gpu.model} with ${altVram}GB VRAM for GPU compute/gaming`);
  } else if (altGpuType === 'integrated' && primGpuType === 'dedicated') {
    drawbacks.push(`Integrated graphics only (lacks primary's dedicated ${primaryProduct.gpu.model})`);
  } else if (altGpuType === 'dedicated' && primGpuType === 'dedicated') {
    if (altVram > primVram) {
      advantages.push(`Higher VRAM: ${altVram}GB on ${altProduct.gpu.model} (vs ${primVram}GB)`);
    } else if (altVram < primVram) {
      drawbacks.push(`Lower VRAM: ${altVram}GB on ${altProduct.gpu.model} (vs ${primVram}GB)`);
    }
  }

  // 4. Battery runtime
  const altBattery = altProduct.battery?.realWorldHoursEstimate || 0;
  const primBattery = primaryProduct.battery?.realWorldHoursEstimate || 0;
  if (altBattery >= primBattery + 1.5) {
    advantages.push(`Longer battery endurance: ~${altBattery}h vs ~${primBattery}h estimated`);
  } else if (altBattery <= primBattery - 1.5) {
    drawbacks.push(`Shorter battery runtime: ~${altBattery}h vs ~${primBattery}h estimated`);
  }

  // 5. Weight / Portability
  const altWeight = altProduct.weightKg || 0;
  const primWeight = primaryProduct.weightKg || 0;
  if (altWeight > 0 && primWeight > 0) {
    if (altWeight <= primWeight - 0.2) {
      advantages.push(`Lighter weight: ${altWeight}kg vs ${primWeight}kg`);
    } else if (altWeight >= primWeight + 0.2) {
      drawbacks.push(`Heavier chassis: ${altWeight}kg vs ${primWeight}kg`);
    }
  }

  // 6. Processor cores
  const altCores = altProduct.processor?.cores || 0;
  const primCores = primaryProduct.processor?.cores || 0;
  if (altCores >= primCores + 4) {
    advantages.push(`More CPU cores: ${altCores}c vs ${primCores}c (${altProduct.processor.model})`);
  } else if (altCores <= primCores - 4) {
    drawbacks.push(`Fewer CPU cores: ${altCores}c vs ${primCores}c (${altProduct.processor.model})`);
  }

  const advText = advantages.length > 0 ? `Advantage: ${advantages.slice(0, 2).join('; ')}.` : '';
  const drawText = drawbacks.length > 0 ? `Drawback: ${drawbacks.slice(0, 2).join('; ')}.` : '';
  const comparisonText = [advText, drawText].filter(Boolean).join(' ') ||
    `${altProduct.name} offers alternative trade-offs at ₹${altProduct.priceINR.toLocaleString('en-IN')}.`;

  return {
    advantages,
    drawbacks,
    comparisonText
  };
}

/**
 * Detects whether a text (explanation, advantage, or trade-off) claims a CPU or GPU
 * that contradicts the selected product's verified specifications.
 * @param {string} text - The claim or explanation to verify
 * @param {object} product - The selected catalog product record
 * @returns {boolean} true if the text contradicts the product's CPU or GPU
 */
export function hasHardwareContradiction(text, product) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();

  const prodCpuBrand = (product.processor?.brand || '').toLowerCase(); // 'amd', 'intel', 'apple', 'qualcomm'
  const prodCpuModel = (product.processor?.model || '').toLowerCase(); // e.g. 'ryzen 7 7840hs', 'core i5-13420h'
  const prodGpuType = (product.gpu?.type || 'integrated').toLowerCase(); // 'dedicated', 'integrated'
  const prodGpuModel = (product.gpu?.model || '').toLowerCase(); // e.g. 'geforce rtx 3050 6gb', 'radeon graphics'

  // --- CPU Verification ---
  if (prodCpuBrand === 'amd') {
    // If product is AMD, reject claims mentioning Intel, Core i3/i5/i7/i9/Ultra, 11th/12th/13th/14th Gen, Apple, Snapdragon
    if (/\bintel\b|\bcore\s*(?:i[3579]|ultra|\d)\b|\b(?:1[1234]th\s*gen)\b|\b(?:m[1234]|apple\s*silicon)\b|\bsnapdragon\b/i.test(lower)) {
      return true;
    }
  } else if (prodCpuBrand === 'intel') {
    // If product is Intel, reject claims mentioning AMD, Ryzen, Apple Silicon, Snapdragon
    if (/\bamd\b|\bryzen\b|\b(?:m[1234]|apple\s*silicon)\b|\bsnapdragon\b/i.test(lower)) {
      return true;
    }
  } else if (prodCpuBrand === 'apple') {
    if (/\bintel\b|\bamd\b|\bryzen\b|\bcore\b|\bsnapdragon\b/i.test(lower)) {
      return true;
    }
  } else if (prodCpuBrand === 'qualcomm') {
    if (/\bintel\b|\bamd\b|\bryzen\b|\bcore\b|\bapple\b/i.test(lower)) {
      return true;
    }
  }

  // CPU Tier / family checks
  if (/\bryzen\s*7\b/i.test(lower) && !prodCpuModel.includes('ryzen 7')) return true;
  if (/\bryzen\s*5\b/i.test(lower) && !prodCpuModel.includes('ryzen 5')) return true;
  if (/\bryzen\s*3\b/i.test(lower) && !prodCpuModel.includes('ryzen 3')) return true;
  if (/\bryzen\s*9\b/i.test(lower) && !prodCpuModel.includes('ryzen 9')) return true;

  if (/\bcore\s*i7\b/i.test(lower) && !prodCpuModel.includes('i7')) return true;
  if (/\bcore\s*i5\b/i.test(lower) && !prodCpuModel.includes('i5')) return true;
  if (/\bcore\s*i3\b/i.test(lower) && !prodCpuModel.includes('i3')) return true;
  if (/\bcore\s*ultra\s*7\b/i.test(lower) && !prodCpuModel.includes('ultra 7')) return true;
  if (/\bcore\s*ultra\s*5\b/i.test(lower) && !prodCpuModel.includes('ultra 5')) return true;

  // --- GPU Verification ---
  if (prodGpuType === 'integrated') {
    // If product has integrated graphics, reject dedicated GPU claims
    if (/\b(?:dedicated\s*gpu|rtx\s*\d{4}|geforce|gtx|discrete\s*gpu|cuda\s*cores?)\b/i.test(lower)) {
      return true;
    }
  } else if (prodGpuType === 'dedicated') {
    // If product has dedicated GPU, check for specific mismatched RTX/GTX models
    const rtxMatch = lower.match(/\brtx\s*(4090|4080|4070|4060|4050|3080|3070|3060|3050|2050)\b/i);
    if (rtxMatch) {
      const claimedRtxNumber = rtxMatch[1];
      if (!prodGpuModel.includes(claimedRtxNumber)) {
        return true; // Contradiction: e.g. text mentions RTX 4050, but product has RTX 3050!
      }
    }
  }

  return false;
}

/**
 * Validates and sanitizes specification claims against verified catalog attributes.
 * Removes or qualifies claims that the catalog does not support (e.g. RAM upgradeability,
 * dedicated GPU, fake savings, or mismatched CPU/GPU).
 */
export function sanitizeAndVerifyClaims(product, rawAdvantages = [], rawTradeOffs = []) {
  const isRamUpgradable = product.ram?.isUpgradable === true;
  const ramGB = product.ram?.capacityGB || 0;
  const isDedicatedGpu = product.gpu?.type === 'dedicated';
  const batteryHours = product.battery?.realWorldHoursEstimate || 0;
  const weightKg = product.weightKg || 0;

  const verifiedAdvantages = [];
  const verifiedTradeOffs = [];

  for (const adv of rawAdvantages) {
    if (!adv || typeof adv !== 'string') continue;
    const lower = adv.toLowerCase();

    // Hardware CPU/GPU consistency check
    if (hasHardwareContradiction(adv, product)) {
      continue;
    }

    // RAM upgradeability claim verification
    if (/upgrad(?:able|ability)|expandable(?:\s+(?:ram|memory))?|modular\s+ram|so-dimm|ram\s+slot/i.test(lower)) {
      if (!isRamUpgradable) {
        // Discard unsupported RAM upgrade claim when RAM is soldered
        continue;
      }
    }

    // Dedicated GPU claim verification
    if (/dedicated\s+gpu|nvidia|rtx|cuda/i.test(lower)) {
      if (!isDedicatedGpu) {
        continue;
      }
    }

    // Savings claim verification (must never use user budget as savings)
    if (/saves?\s+[₹$]|saved|discount/i.test(lower)) {
      const listPrice = product.originalPriceINR || product.listPriceINR;
      if (!listPrice || listPrice <= product.priceINR) {
        continue;
      }
    }

    // Battery endurance claim
    if (/1[2-9]h|all-day\s+battery/i.test(lower) && batteryHours < 9) {
      continue;
    }

    // Weight claim
    if (/ultra-?light|featherweight/i.test(lower) && weightKg > 1.6) {
      continue;
    }

    verifiedAdvantages.push(adv);
  }

  // Fallback to verified catalog strengths if empty
  if (verifiedAdvantages.length === 0) {
    if (product.strengths?.length > 0) {
      verifiedAdvantages.push(...product.strengths);
    } else {
      verifiedAdvantages.push(`${product.processor.model} (${product.processor.cores} cores) compute engine`);
      verifiedAdvantages.push(`${ramGB}GB ${product.ram?.type || 'RAM'} installed`);
    }
  }

  // Filter trade-offs
  for (const tro of rawTradeOffs) {
    if (!tro || typeof tro !== 'string') continue;
    const lower = tro.toLowerCase();

    // Hardware CPU/GPU consistency check
    if (hasHardwareContradiction(tro, product)) {
      continue;
    }

    // If claim says "non-upgradable RAM" but RAM IS upgradable, skip false trade-off
    if (/non-upgradable\s+ram|soldered\s+ram/i.test(lower) && isRamUpgradable) {
      continue;
    }
    // If claim says "lacks dedicated GPU" but GPU IS dedicated, skip
    if (/lacks?\s+dedicated|no\s+dedicated\s+gpu|integrated\s+only/i.test(lower) && isDedicatedGpu) {
      continue;
    }

    verifiedTradeOffs.push(tro);
  }

  // If RAM is soldered, ensure honest trade-offs explicitly notes it
  if (!isRamUpgradable) {
    const hasSolderedNote = verifiedTradeOffs.some(t => /soldered|upgrad/i.test(t));
    if (!hasSolderedNote) {
      verifiedTradeOffs.push(`Soldered RAM (${ramGB}GB): memory is non-upgradable after purchase`);
    }
  }

  // Fallback to verified catalog trade-offs if empty
  if (verifiedTradeOffs.length === 0 && product.tradeOffs?.length > 0) {
    verifiedTradeOffs.push(...product.tradeOffs);
  }

  return {
    verifiedAdvantages: [...new Set(verifiedAdvantages)],
    verifiedTradeOffs: [...new Set(verifiedTradeOffs)]
  };
}

export class AIService {
  /**
   * Deterministic fallback requirement parser when API key is missing or quota is exhausted
   */
  static parseRequirementsDeterministically(query, previousRequirements = null) {
    const q = query.toLowerCase();
    const prev = previousRequirements || {};

    // Budget extraction (e.g., "under 60000", "under ₹60,000", "below 70k", "budget 50000")
    let maxBudget = prev.maxBudget || 100000;
    const budgetMatch = q.match(/(?:under|below|budget|within|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*k?)/i) ||
                        q.match(/(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*k?)/i);

    if (budgetMatch) {
      let rawVal = budgetMatch[1].replace(/,/g, '').toLowerCase();
      if (rawVal.endsWith('k')) {
        maxBudget = parseFloat(rawVal) * 1000;
      } else {
        maxBudget = parseInt(rawVal, 10);
      }
    }

    // RAM extraction (e.g., "16gb", "16 gb ram", "8gb")
    let minRam = prev.minRam || 8;
    const ramMatch = q.match(/(\d+)\s*(?:gb|g)\s*(?:ram|memory)?/i);
    if (ramMatch) {
      minRam = parseInt(ramMatch[1], 10);
    } else if (!prev.minRam && (q.includes('ai') || q.includes('deep learning') || q.includes('coding') || q.includes('programming'))) {
      minRam = 16;
    }

    // Workload / Use case
    let targetUseCase = prev.targetUseCase || 'coding';
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
    let prioritizeGpu = prev.prioritizeGpu || targetUseCase === 'ai-ml' || targetUseCase === 'gaming' || q.includes('rtx') || q.includes('dedicated gpu') || q.includes('graphics');
    if (q.includes('integrated') || q.includes('no gpu') || q.includes('without gpu')) {
      prioritizeGpu = false;
    }
    const gpuPreference = prioritizeGpu ? 'dedicated' : (prev.gpuPreference === 'dedicated' && !q.includes('integrated') ? 'dedicated' : q.includes('integrated') ? 'integrated' : prev.gpuPreference || 'any');

    // Battery priority
    const prioritizeBattery = prev.prioritizeBattery || q.includes('battery') || q.includes('endurance') || q.includes('long battery') || q.includes('travel');

    // Upgradeability priority
    const prioritizeUpgradability = prev.prioritizeUpgradability || q.includes('upgrad') || q.includes('expand') || q.includes('future proof') || q.includes('modular') || q.includes('ram slot');

    // Portability priority
    const prioritizePortability = prev.prioritizePortability || q.includes('light') || q.includes('portable') || q.includes('weight') || q.includes('thin') || q.includes('slim') || q.includes('carry');

    // Brand preferences
    const knownBrands = ['lenovo', 'acer', 'asus', 'hp', 'apple', 'dell', 'msi', 'samsung', 'framework'];
    const matchedBrands = knownBrands.filter((b) => q.includes(b)).map((b) => b.charAt(0).toUpperCase() + b.slice(1));
    const preferredBrands = matchedBrands.length > 0 ? matchedBrands : (prev.preferredBrands || []);

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
        prioritizePortability ? 'Lightweight chassis' : null,
        prioritizeGpu ? 'Dedicated GPU/CUDA compute' : null,
        preferredBrands.length > 0 ? `Brand: ${preferredBrands.join(', ')}` : null
      ].filter(Boolean),
      summary: `Request targeting ${targetUseCase} under ₹${maxBudget.toLocaleString('en-IN')} with min ${minRam}GB RAM.`
    };
  }

  /**
   * Determine whether a user query is ambiguous or underspecified and requires clarification
   */
  static isClarificationNeeded(query) {
    const q = query.toLowerCase().trim();
    // Check if budget is specified (e.g., 50k, 60000, under, below, max, ₹, inr, rs)
    const hasBudget = /(?:under|below|budget|within|max|₹|rs\.?|inr|\b\d{2,3}k\b|\b\d{4,6}\b)/i.test(q);
    // Check if hardware specifications or model names are specified
    const hasSpec = /(?:\d+\s*gb|rtx|dedicated|ssd|intel|amd|ryzen|core\s*i\d|m\d|apple|macbook|thinkpad|zenbook|nitro|vivobook|yoga|legion|predator|framework)/i.test(q);

    // If neither budget nor hardware spec is provided, ask for clarification
    return !hasBudget && !hasSpec;
  }

  /**
   * Process natural-language shopping goal through Gemini + deterministic catalog grounding
   * @param {string} userMessage - Natural language shopping prompt from user
   * @param {object} options - Optional execution controls ({ forceRecommend, conversationHistory, previousRequirements })
   */
  static async processShoppingRequest(userMessage, options = {}) {
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      throw new Error('A valid natural language shopping goal must be provided.');
    }

    const trimmedQuery = userMessage.trim();

    const isFollowUp = Boolean(
      (Array.isArray(options.conversationHistory) && options.conversationHistory.length > 0) ||
      options.previousRequirements
    );

    // Check if clarification is needed for broad or ambiguous queries (only for initial search, not follow-ups)
    if (!options.forceRecommend && !isFollowUp && this.isClarificationNeeded(trimmedQuery)) {
      return {
        needsClarification: true,
        query: trimmedQuery,
        clarification: {
          question: 'What is your target budget and primary workload?',
          explanation: "PayPilot's catalog has 32 verified laptops from ₹33,990 to ₹89,990. Select a profile below or refine your query to get grounded recommendations:",
          options: [
            {
              label: 'Budget CS & Study (< ₹45,000)',
              description: 'Coursework, everyday coding, web dev, and long battery life',
              query: `${trimmedQuery} under ₹45,000 prioritizing battery life and daily coding`
            },
            {
              label: 'Mid-Range Dev & Multitasking (< ₹65,000)',
              description: '16GB RAM, fast multi-core processor, Docker & full-stack development',
              query: `${trimmedQuery} under ₹65,000 with 16GB RAM for software development`
            },
            {
              label: 'High Performance & AI/ML (< ₹85,000)',
              description: 'Dedicated NVIDIA GPU (RTX), local AI models, CUDA & gaming',
              query: `${trimmedQuery} under ₹85,000 with dedicated NVIDIA GPU for AI/ML and gaming`
            }
          ]
        }
      };
    }

    const isCacheable = !isFollowUp;
    const cacheKey = getCacheKey(trimmedQuery);

    // Check in-memory LRU cache (only for standalone initial queries)
    if (isCacheable) {
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
    }

    // Retrieve all products from real catalog
    const allProducts = await CatalogService.getProducts({});
    if (!allProducts || allProducts.length === 0) {
      throw new Error('Catalog is empty; cannot evaluate recommendations.');
    }

    // Step 1: Extract requirements using Gemini or fallback
    let structuredRequirements = null;
    let aiExplanation = null;
    let parsedAssistantReply = null;
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

        const conversationSection = options.conversationHistory?.length > 0
          ? `\nPREVIOUS CONVERSATION HISTORY:\n${options.conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n`
          : '';
        const prevReqSection = options.previousRequirements
          ? `\nPREVIOUS ACTIVE REQUIREMENTS (UPDATE OR REFINE ACCORDINGLY):\n${JSON.stringify(options.previousRequirements, null, 2)}\n`
          : '';

        const prompt = `You are PayPilot's Senior AI Hardware Architect for the PayPal AI Hackathon 2026.
${conversationSection}${prevReqSection}
User message / shopping goal:
"${trimmedQuery}"

Here is the authoritative catalog of verified laptops:
${JSON.stringify(compactCatalog)}

TASK:
1. Extract or refine user requirements, incorporating any previous context if this is a follow-up.
2. Select the #1 best matching laptop ID and up to 2 alternative IDs from the catalog above.
3. Formulate an honest, grounded Shopping Decision Report.
   - Ground all facts in the provided specifications.
   - Point out true trade-offs (e.g. soldered RAM, heavy chassis, low battery).
   - Explain why the primary choice beats the alternatives for this user.
4. Provide a friendly, concise conversational "assistantReply" (1-2 sentences) directly addressing the user and explaining the recommendation or refinement.

Respond ONLY with a JSON object conforming to this exact structure:
{
  "assistantReply": "1-2 sentences conversational response explaining the recommendation or refinement",
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

        // Attempt generation with configured model, with automatic fallback across standard Gemini models
        const modelsToTry = [...new Set([
          resolvedWorkingModel,
          config.ai.model,
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-3-flash-preview'
        ].filter(Boolean))];

        let geminiResponseText = null;

        for (const candidateModel of modelsToTry) {
          try {
            console.log(`[AIService] Calling Gemini API (${candidateModel})...`);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout calling Gemini model '${candidateModel}' after 9s`)), 9000)
            );

            const response = await Promise.race([
              ai.models.generateContent({
                model: candidateModel,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json'
                }
              }),
              timeoutPromise
            ]);

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
            if (parsed.assistantReply) {
              parsedAssistantReply = parsed.assistantReply;
            }
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
      structuredRequirements = this.parseRequirementsDeterministically(trimmedQuery, options.previousRequirements);
    }

    // Step 2: Run deterministic backend ranking on the REAL catalog using requirements
    const rankedProducts = RankingService.rankProducts(allProducts, structuredRequirements);
    if (rankedProducts.length === 0) {
      throw new Error('No candidate products could be evaluated from the catalog.');
    }

    // Authoritative primary product is ALWAYS the #1 ranked candidate (rankedProducts[0])
    // to guarantee displayed ranking is strictly monotonic with match scores.
    const primaryProduct = rankedProducts[0];

    // Determine runner-up alternatives strictly in descending rank order
    const alternatives = [];
    for (let i = 1; i < Math.min(3, rankedProducts.length); i++) {
      const altProd = rankedProducts[i];
      const tradeOffs = computeConcreteTradeOffs(altProd, primaryProduct);
      const isTiedWithPrimary = altProd.matchScore === primaryProduct.matchScore;
      const isTiedWithPrevious = i > 1 && altProd.matchScore === rankedProducts[i - 1].matchScore;

      let tieNote = null;
      if (isTiedWithPrimary) {
        tieNote = `Tied with #1 pick at ${altProd.matchScore}% Match; ranked runner-up by lower price (₹${primaryProduct.priceINR.toLocaleString('en-IN')} vs ₹${altProd.priceINR.toLocaleString('en-IN')}).`;
      } else if (isTiedWithPrevious) {
        tieNote = `Tied with preceding option at ${altProd.matchScore}% Match; ranked by lower price.`;
      }

      alternatives.push({
        product: altProd,
        matchScore: altProd.matchScore,
        comparisonVsPrimary: tradeOffs.comparisonText,
        concreteAdvantages: tradeOffs.advantages,
        concreteDrawbacks: tradeOffs.drawbacks,
        isTied: isTiedWithPrimary || isTiedWithPrevious,
        tieNote
      });
    }

    // Tie-breaker note for primary pick if tied with runner-up
    let primaryTieNote = null;
    if (alternatives.length > 0 && alternatives[0].matchScore === primaryProduct.matchScore) {
      primaryTieNote = `Tied with runner-up (${alternatives[0].product.name}) on score (${primaryProduct.matchScore}%); ranked #1 due to lower price (₹${primaryProduct.priceINR.toLocaleString('en-IN')} vs ₹${alternatives[0].product.priceINR.toLocaleString('en-IN')}).`;
    }

    // Authoritative budget delta calculation (remaining buffer under limit, NOT "savings")
    const budgetDelta = (structuredRequirements.maxBudget || 100000) - primaryProduct.priceINR;

    // Verified catalog savings check (strictly from verified catalog list price, never user budget)
    const listPrice = primaryProduct.originalPriceINR || primaryProduct.listPriceINR;
    const hasVerifiedSavings = Boolean(listPrice && listPrice > primaryProduct.priceINR);
    const verifiedSavingsINR = hasVerifiedSavings ? listPrice - primaryProduct.priceINR : 0;

    // Verify whether Gemini's recommendation corresponds to this exact primary product
    const isPrimaryAiMatch = aiExplanation?.primary?.productId === primaryProduct.id;

    // Verified catalog-grounded justification
    const cpuDesc = `${primaryProduct.processor.brand} ${primaryProduct.processor.model}`;
    const gpuDesc = primaryProduct.gpu.type === 'dedicated'
      ? primaryProduct.gpu.model
      : 'integrated graphics';

    const defaultWhyChosen = `${primaryProduct.name} delivers the highest score (${primaryProduct.matchScore}%) for your ${structuredRequirements.targetUseCase} requirements within your ₹${(structuredRequirements.maxBudget || 100000).toLocaleString('en-IN')} budget, powered by a verified ${cpuDesc} (${primaryProduct.processor.cores}-core) processor and ${gpuDesc}.`;

    // Validate whyChosen: must belong to primary product and must NOT have CPU/GPU contradictions
    let finalWhyChosen = defaultWhyChosen;
    if (isPrimaryAiMatch && aiExplanation?.primary?.whyChosen) {
      if (!hasHardwareContradiction(aiExplanation.primary.whyChosen, primaryProduct)) {
        finalWhyChosen = aiExplanation.primary.whyChosen;
      }
    }

    // Ground and sanitize claims against catalog attributes
    const rawAdvantages = isPrimaryAiMatch && aiExplanation?.primary?.keyAdvantages?.length > 0
      ? aiExplanation.primary.keyAdvantages
      : primaryProduct.strengths || [];
    const rawTradeOffs = isPrimaryAiMatch && aiExplanation?.primary?.honestTradeOffs?.length > 0
      ? aiExplanation.primary.honestTradeOffs
      : primaryProduct.tradeOffs || [];

    const { verifiedAdvantages, verifiedTradeOffs } = sanitizeAndVerifyClaims(
      primaryProduct,
      rawAdvantages,
      rawTradeOffs
    );

    const finalAssistantReply = parsedAssistantReply || (
      isFollowUp
        ? `I've updated your laptop recommendations to reflect: "${trimmedQuery}". Here is your refined Shopping Decision Report:`
        : `Here is your grounded Shopping Decision Report for "${trimmedQuery}":`
    );

    // Build the final authoritative Shopping Decision Report
    const decisionReport = {
      query: trimmedQuery,
      assistantReply: finalAssistantReply,
      isFollowUp,
      interpretedRequirements: structuredRequirements,
      primaryRecommendation: {
        product: primaryProduct,
        matchScore: primaryProduct.matchScore,
        budgetDelta,
        satisfiesBudget: budgetDelta >= 0,
        hasVerifiedSavings,
        verifiedSavingsINR,
        verifiedListPriceINR: hasVerifiedSavings ? listPrice : null,
        tieNote: primaryTieNote,
        satisfiedRequirements: primaryProduct.evaluation?.matchedRequirements || [
          `Meets ${primaryProduct.ram.capacityGB}GB RAM requirement`,
          budgetDelta >= 0 ? `Within budget limit: ₹${budgetDelta.toLocaleString('en-IN')} remaining buffer` : null
        ].filter(Boolean),
        compromisedRequirements: primaryProduct.evaluation?.tradeOffsIdentified || [],
        aiExplanation: {
          whyChosen: finalWhyChosen,
          keyAdvantages: verifiedAdvantages,
          honestTradeOffs: verifiedTradeOffs
        }
      },
      alternatives,
      scoreExplanation: {
        formula: '100-point deterministic rubric: Budget (30pts), RAM (20pts), Compute & Workload (25pts), Portability & Battery (15pts), Upgradeability & Longevity (10pts).',
        tieBreaker: RankingService.TIE_BREAKER_RULE || 'When match scores are tied, lower price INR takes precedence.',
        imageEffect: 'Product image presence has zero effect on the match score; scoring is computed purely from verified hardware specs and financial criteria.'
      },
      groundingMeta: {
        provider: usedProvider,
        model: activeModel,
        isDeterministicVerificationPassed: true,
        catalogRecordsEvaluated: allProducts.length,
        cached: false,
        timestamp: new Date().toISOString()
      }
    };

    // Store in cache (only for standalone initial queries to preserve quota)
    if (isCacheable) {
      queryCache.set(cacheKey, {
        timestamp: Date.now(),
        data: decisionReport
      });
    }

    return decisionReport;
  }
}
