import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  X,
  Cpu,
  HardDrive,
  Battery,
  Sliders,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProductImage } from '../products/ProductImage';
import { formatINR, formatUSD, formatRAM, formatStorage } from '../../utils/formatters';

export function ShoppingDecisionReport({
  report,
  onClose,
  onViewDetails,
  onToggleCompare,
  onProceedToOrder,
  comparedIds = [],
  onApplyFilters,
  onCompareDirectly
}) {
  if (!report) return null;

  const {
    query,
    interpretedRequirements,
    primaryRecommendation,
    alternatives = [],
    groundingMeta = {}
  } = report;

  const primaryProduct = primaryRecommendation?.product;
  if (!primaryProduct) return null;

  const isPrimaryCompared = comparedIds.includes(primaryProduct.id);
  const budgetDelta = primaryRecommendation.budgetDelta;
  const isUnderBudget = budgetDelta >= 0;

  return (
    <div className="bg-gradient-to-b from-white via-paypilot-subtleViolet/20 to-white border-2 border-paypilot-brand/30 rounded-3xl p-5 sm:p-7 shadow-elevated mb-8 transition-all">
      {/* Top Header & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-paypilot-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paypilot-brand text-white text-xs font-bold shadow-subtle">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Shopping Decision Report</span>
            </span>
            <span className="text-[11px] font-semibold text-paypilot-muted bg-white px-2.5 py-0.5 rounded-lg border border-paypilot-border">
              {groundingMeta.cached ? 'Instant Cache' : `Grounded via Google ${groundingMeta.provider === 'gemini' ? 'Gemini' : 'Engine'}`}
            </span>
            <span className="text-[10px] text-paypilot-muted uppercase tracking-wider font-mono">
              {groundingMeta.model}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-paypilot-text font-medium mt-1">
            Goal: <span className="italic text-paypilot-navy font-semibold">"{query}"</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="self-end sm:self-center p-2 rounded-xl text-paypilot-muted hover:text-paypilot-text hover:bg-white border border-paypilot-border/60 transition-colors"
          title="Dismiss Decision Report"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Interpreted Requirements Pill Strip */}
      <div className="py-4 border-b border-paypilot-border/70">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-paypilot-text uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-paypilot-brand" />
            <span>Extracted User Requirements</span>
          </h4>
          {onApplyFilters && (
            <button
              onClick={() => onApplyFilters(interpretedRequirements)}
              className="text-xs text-paypilot-brand hover:underline font-semibold flex items-center gap-1"
            >
              <span>Apply to catalog filters</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="brand" size="sm">
            Max Budget: {formatINR(interpretedRequirements.maxBudget)}
          </Badge>
          <Badge variant="neutral" size="sm">
            Target Workload: <strong className="ml-1 uppercase text-paypilot-navy">{interpretedRequirements.targetUseCase}</strong>
          </Badge>
          <Badge variant="neutral" size="sm">
            Min RAM: {interpretedRequirements.minRam}GB
          </Badge>
          {interpretedRequirements.prioritizeBattery && (
            <Badge variant="success" size="sm">
              Long Battery Life
            </Badge>
          )}
          {interpretedRequirements.prioritizeUpgradability && (
            <Badge variant="success" size="sm">
              Expandable / Modular RAM
            </Badge>
          )}
          {interpretedRequirements.gpuPreference === 'dedicated' && (
            <Badge variant="brand" size="sm">
              Dedicated NVIDIA GPU
            </Badge>
          )}
        </div>
      </div>

      {/* Main Decision Grid: Spotlight Pick (Left) + Runner-up Alternatives (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Left: #1 Top Recommendation Spotlight (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-paypilot-success uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Authoritative #1 Recommendation</span>
            </span>
            <span className="text-xs font-bold text-paypilot-brand px-2.5 py-0.5 rounded-full bg-paypilot-subtleViolet border border-paypilot-brand/20">
              {primaryRecommendation.matchScore}% Match Score
            </span>
          </div>

          <div className="bg-white border border-paypilot-border rounded-2xl overflow-hidden shadow-card">
            {/* Laptop Image Header */}
            <div className="relative h-48 bg-slate-100 overflow-hidden border-b border-paypilot-border">
              <ProductImage product={primaryProduct} variant="card" className="h-48 w-full" />
              <div className="absolute top-3 left-3 z-10">
                <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-xs font-bold text-paypilot-text shadow-subtle border border-paypilot-border/60">
                  {primaryProduct.brand}
                </span>
              </div>
              <div className="absolute top-3 right-3 z-10">
                <Badge
                  variant={isUnderBudget ? 'success' : 'warning'}
                  size="md"
                  className="bg-white/95 backdrop-blur-sm shadow-subtle font-semibold"
                >
                  {isUnderBudget
                    ? `✓ Saves ${formatINR(budgetDelta)}`
                    : `Exceeds by ${formatINR(Math.abs(budgetDelta))}`}
                </Badge>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-paypilot-text leading-tight">
                  {primaryProduct.name}
                </h3>
                <p className="text-xs text-paypilot-muted mt-0.5">{primaryProduct.model}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold text-paypilot-text tabular-nums">
                    {formatINR(primaryProduct.priceINR)}
                  </span>
                  <span className="text-xs text-paypilot-muted tabular-nums">
                    ({formatUSD(primaryProduct.priceUSD)} USD)
                  </span>
                </div>
              </div>

              {/* Core Specs Strip */}
              <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-paypilot-bg rounded-xl border border-paypilot-border text-xs">
                <div>
                  <span className="text-paypilot-muted block text-[10px]">CPU</span>
                  <span className="font-semibold text-paypilot-text truncate block">
                    {primaryProduct.processor?.model}
                  </span>
                </div>
                <div>
                  <span className="text-paypilot-muted block text-[10px]">RAM</span>
                  <span className="font-semibold text-paypilot-text truncate block">
                    {formatRAM(primaryProduct.ram)}
                  </span>
                </div>
                <div>
                  <span className="text-paypilot-muted block text-[10px]">Graphics</span>
                  <span className="font-semibold text-paypilot-text truncate block">
                    {primaryProduct.gpu?.type === 'dedicated' ? primaryProduct.gpu.model : 'Integrated'}
                  </span>
                </div>
              </div>

              {/* Grounded AI Rationale */}
              <div className="p-4 bg-paypilot-subtleViolet/40 border border-paypilot-brand/20 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-paypilot-brand uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Why PayPilot Selected This Laptop</span>
                </h5>
                <p className="text-xs text-paypilot-text leading-relaxed">
                  {primaryRecommendation.aiExplanation?.whyChosen}
                </p>
              </div>

              {/* Key Advantages */}
              {primaryRecommendation.aiExplanation?.keyAdvantages?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-paypilot-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Key Advantages</span>
                  </span>
                  <ul className="space-y-1 text-xs text-paypilot-text">
                    {primaryRecommendation.aiExplanation.keyAdvantages.map((adv, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-paypilot-success">•</span>
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Honest Limitations / Trade-offs */}
              {primaryRecommendation.aiExplanation?.honestTradeOffs?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-paypilot-warning flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Honest Trade-offs to Know</span>
                  </span>
                  <ul className="space-y-1 text-xs text-paypilot-muted">
                    {primaryRecommendation.aiExplanation.honestTradeOffs.map((tro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-paypilot-warning">•</span>
                        <span>{tro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-paypilot-border">
                {onProceedToOrder && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onProceedToOrder(primaryProduct)}
                    icon={CreditCard}
                    className="flex-1 bg-gradient-to-r from-paypilot-brand to-paypilot-navy"
                  >
                    Proceed to Order
                  </Button>
                )}
                <Button
                  variant={isPrimaryCompared ? 'primary' : 'secondary'}
                  size="md"
                  onClick={() => onToggleCompare(primaryProduct.id)}
                  icon={Layers}
                  className="px-3"
                >
                  {isPrimaryCompared ? 'In Compare Tray' : 'Compare'}
                </Button>
                <Button
                  variant="subtle"
                  size="md"
                  onClick={() => onViewDetails(primaryProduct)}
                  className="px-3"
                >
                  Specs
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Evaluated Alternatives & Comparative Analysis (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-paypilot-muted uppercase tracking-wider">
              Evaluated Alternatives
            </span>
            <span className="text-[11px] text-paypilot-muted">
              {alternatives.length} options considered
            </span>
          </div>

          <div className="space-y-3">
            {alternatives.map(({ product: altProduct, matchScore, comparisonVsPrimary }, idx) => {
              const isAltCompared = comparedIds.includes(altProduct.id);
              return (
                <div
                  key={altProduct.id}
                  className="bg-white border border-paypilot-border rounded-2xl p-4 shadow-subtle space-y-3 hover:border-paypilot-brand/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-paypilot-muted">
                        Runner-up #{idx + 1} • {altProduct.brand}
                      </span>
                      <h4 className="font-bold text-sm text-paypilot-text mt-0.5 line-clamp-1">
                        {altProduct.name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-paypilot-text block tabular-nums">
                        {formatINR(altProduct.priceINR)}
                      </span>
                      <span className="text-[10px] font-semibold text-paypilot-brand bg-paypilot-subtleViolet px-1.5 py-0.2 rounded">
                        {matchScore}% Match
                      </span>
                    </div>
                  </div>

                  {/* Comparative takeaway */}
                  <p className="text-xs text-paypilot-muted leading-relaxed">
                    {comparisonVsPrimary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-paypilot-border/60 text-xs">
                    <button
                      onClick={() => onViewDetails(altProduct)}
                      className="text-paypilot-muted hover:text-paypilot-text font-medium"
                    >
                      Specs
                    </button>
                    {onCompareDirectly && (
                      <button
                        onClick={() => onCompareDirectly(primaryProduct.id, altProduct.id)}
                        className="text-paypilot-brand hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Compare with Primary</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grounding & Verification Guarantee Card */}
          <div className="bg-paypilot-bg border border-paypilot-border rounded-2xl p-4 text-xs text-paypilot-muted space-y-2">
            <div className="flex items-center gap-1.5 text-paypilot-navy font-semibold">
              <ShieldCheck className="w-4 h-4 text-paypilot-success" />
              <span>Grounded Catalog Guarantee</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Every specification, price, and attribute shown in this report is strictly verified from PayPilot's catalog of 32 real laptop records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
