/**
 * PayPilot Deterministic Product Ranking Engine
 * 
 * Computes transparent, reproducible match scores based on hard criteria:
 * - Budget tolerance and savings
 * - RAM and multitasking ceiling
 * - Processor core count & workload alignment (coding vs AI/ML)
 * - Battery endurance and chassis portability
 * - Component upgradeability
 * 
 * Never fabricates arbitrary ratings or LLM hallucinations.
 */

export class RankingService {
  /**
   * Score a single product against structured requirements
   * @param {Object} product - Product catalog record
   * @param {Object} requirements - User requirements
   * @returns {Object} Score details, breakdown, matches, and trade-offs
   */
  static scoreProduct(product, requirements = {}) {
    const {
      maxBudget = 150000,
      minRam = 16,
      prioritizeBattery = false,
      prioritizePortability = false,
      prioritizeGpu = false,
      prioritizeUpgradability = false,
      targetUseCase = 'coding'
    } = requirements;

    let score = 0;
    const breakdown = {
      budgetScore: 0,
      ramScore: 0,
      workloadScore: 0,
      portabilityScore: 0,
      upgradeabilityScore: 0
    };

    const matchedRequirements = [];
    const tradeOffsIdentified = [];

    // 1. Budget Evaluation (Max 30 points)
    const price = product.priceINR;
    const budgetDelta = maxBudget - price;
    const satisfiesBudget = budgetDelta >= 0;

    if (satisfiesBudget) {
      // Within budget: higher score if price fits comfortably without exceeding
      const savingsRatio = budgetDelta / maxBudget;
      // Sweet spot is within 0-25% below budget, gets maximum points
      const budgetPoints = Math.round(22 + (1 - savingsRatio) * 8);
      breakdown.budgetScore = Math.min(30, Math.max(18, budgetPoints));
      matchedRequirements.push(`Within budget: saves ₹${budgetDelta.toLocaleString('en-IN')}`);
    } else {
      const overshootRatio = Math.abs(budgetDelta) / maxBudget;
      if (overshootRatio <= 0.1) {
        breakdown.budgetScore = 14;
        tradeOffsIdentified.push(`Exceeds budget by ₹${Math.abs(budgetDelta).toLocaleString('en-IN')} (approx ${Math.round(overshootRatio * 100)}%)`);
      } else if (overshootRatio <= 0.2) {
        breakdown.budgetScore = 6;
        tradeOffsIdentified.push(`Exceeds budget by ₹${Math.abs(budgetDelta).toLocaleString('en-IN')} (approx ${Math.round(overshootRatio * 100)}%)`);
      } else {
        breakdown.budgetScore = 0;
        tradeOffsIdentified.push(`Exceeds budget limit significantly (by ₹${Math.abs(budgetDelta).toLocaleString('en-IN')})`);
      }
    }

    // 2. RAM & Multitasking Capacity (Max 20 points)
    const ramGB = product.ram?.capacityGB || 8;
    if (ramGB >= minRam) {
      breakdown.ramScore = 20;
      matchedRequirements.push(`Meets RAM requirement: ${ramGB}GB installed`);
    } else {
      breakdown.ramScore = 8;
      tradeOffsIdentified.push(`Installed RAM is ${ramGB}GB (below preferred ${minRam}GB)`);
    }

    // 3. Workload & Compute Engine Alignment (Max 25 points)
    const isAiTarget = targetUseCase === 'ai-ml' || prioritizeGpu;
    const hasDedicatedGpu = product.gpu?.type === 'dedicated';
    const gpuVram = product.gpu?.vramGB || 0;
    const cpuTier = product.processor?.tier || 'mid';

    if (isAiTarget) {
      if (hasDedicatedGpu && gpuVram >= 6) {
        breakdown.workloadScore = 25;
        matchedRequirements.push(`Dedicated NVIDIA RTX GPU with ${gpuVram}GB VRAM for local CUDA acceleration`);
      } else if (hasDedicatedGpu && gpuVram >= 4) {
        breakdown.workloadScore = 18;
        matchedRequirements.push(`Entry dedicated GPU (${gpuVram}GB VRAM) for lightweight neural nets`);
      } else if (product.processor?.model?.toLowerCase().includes('npu') || product.processor?.model?.toLowerCase().includes('ultra') || product.brand === 'Apple') {
        breakdown.workloadScore = 14;
        tradeOffsIdentified.push(`Has on-device NPU/Neural Engine, but lacks dedicated NVIDIA CUDA cores`);
      } else {
        breakdown.workloadScore = 6;
        tradeOffsIdentified.push(`Integrated graphics only; limited for local AI model training`);
      }
    } else {
      // General coding & college workflow
      if (cpuTier === 'flagship' || cpuTier === 'high') {
        breakdown.workloadScore = 25;
        matchedRequirements.push(`High-tier ${product.processor?.model} (${product.processor?.cores || 'multi'}-core) for fast compiling`);
      } else if (cpuTier === 'mid') {
        breakdown.workloadScore = 21;
        matchedRequirements.push(`Balanced ${product.processor?.model} handles full-stack IDEs smoothly`);
      } else {
        breakdown.workloadScore = 14;
        tradeOffsIdentified.push(`Entry-tier CPU; acceptable for web apps, slower for heavy builds`);
      }
    }

    // 4. Battery & Portability (Max 15 points)
    const batteryHours = product.battery?.realWorldHoursEstimate || 5.0;
    const weight = product.weightKg || 2.0;

    let batPoints = 6;
    if (batteryHours >= 10) batPoints = 15;
    else if (batteryHours >= 7.5) batPoints = 12;
    else if (batteryHours >= 5.5) batPoints = 9;
    else batPoints = 5;

    // Weight adjustment
    if (prioritizePortability) {
      if (weight <= 1.35) {
        batPoints = Math.min(15, batPoints + 3);
        matchedRequirements.push(`Ultra-portable weight: ${weight}kg`);
      } else if (weight >= 2.2) {
        batPoints = Math.max(2, batPoints - 4);
        tradeOffsIdentified.push(`Heavy chassis: ${weight}kg for daily backpack carry`);
      }
    }

    if (prioritizeBattery && batteryHours >= 8) {
      matchedRequirements.push(`Long battery endurance: ~${batteryHours}h real-world runtime`);
    } else if (prioritizeBattery && batteryHours < 5.5) {
      tradeOffsIdentified.push(`Low battery life: ~${batteryHours}h under load; charger required`);
    }

    breakdown.portabilityScore = batPoints;

    // 5. Hardware Upgradability & Longevity (Max 10 points)
    const isRamUpgradable = product.ram?.isUpgradable === true;
    const hasExtraSlot = product.storage?.extraSlot === true;

    if (isRamUpgradable && hasExtraSlot) {
      breakdown.upgradeabilityScore = 10;
      if (prioritizeUpgradability) {
        matchedRequirements.push(`Full hardware upgradability: SO-DIMM RAM + secondary M.2 SSD slot`);
      }
    } else if (isRamUpgradable || hasExtraSlot) {
      breakdown.upgradeabilityScore = 7;
    } else {
      breakdown.upgradeabilityScore = 3;
      if (prioritizeUpgradability) {
        tradeOffsIdentified.push(`Non-upgradable soldered RAM and single SSD slot`);
      }
    }

    // Calculate total score
    score =
      breakdown.budgetScore +
      breakdown.ramScore +
      breakdown.workloadScore +
      breakdown.portabilityScore +
      breakdown.upgradeabilityScore;

    // Normalize to 1-100 range
    score = Math.min(100, Math.max(5, score));

    return {
      productId: product.id,
      score,
      satisfiesBudget,
      budgetDelta,
      breakdown,
      matchedRequirements,
      tradeOffsIdentified,
      recommendationTier: score >= 85 ? 'Top Match' : score >= 70 ? 'Strong Contender' : 'Alternative'
    };
  }

  /**
   * Rank a list of products according to requirements
   */
  static rankProducts(products, requirements = {}) {
    const scoredList = products.map((product) => {
      const evaluation = this.scoreProduct(product, requirements);
      return {
        ...product,
        matchScore: evaluation.score,
        evaluation
      };
    });

    // Sort descending by score, then ascending by price
    return scoredList.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return a.priceINR - b.priceINR;
    });
  }
}
