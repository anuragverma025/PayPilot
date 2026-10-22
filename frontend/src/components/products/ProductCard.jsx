import React from 'react';
import {
  Cpu,
  HardDrive,
  Scale,
  CheckCircle,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProductImage } from './ProductImage';
import { formatINR, formatUSD, formatRAM, formatStorage } from '../../utils/formatters';

export function ProductCard({
  product,
  onViewDetails,
  onToggleCompare,
  isCompared = false,
  compareDisabled = false
}) {
  const matchScore = product.matchScore || null;
  const isUpgradable = product.ram?.isUpgradable;

  return (
    <Card hover className="flex flex-col h-full overflow-hidden group">
      {/* Top Banner / Product Photograph Area */}
      <div className="relative h-44 bg-slate-100 overflow-hidden border-b border-paypilot-border">
        <ProductImage
          product={product}
          variant="card"
          className="h-44 w-full"
        />

        {/* Brand Pill */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-xs font-bold text-paypilot-text shadow-subtle border border-paypilot-border/60">
            {product.brand}
          </span>
        </div>

        {/* Match Score Badge (Deterministic Score) */}
        {matchScore !== null && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-subtle flex items-center gap-1 ${
                matchScore >= 80
                  ? 'bg-paypilot-brand text-white'
                  : matchScore >= 65
                  ? 'bg-paypilot-warning text-white'
                  : 'bg-gray-700 text-white'
              }`}
            >
              <span>{matchScore}% Match</span>
            </span>
          </div>
        )}

        {/* Upgradable Indicator */}
        {isUpgradable && (
          <div className="absolute bottom-3 left-3 z-10">
            <Badge variant="success" size="sm" className="bg-white/95 backdrop-blur-sm shadow-subtle">
              Upgradable RAM
            </Badge>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Title and Model */}
          <h3 className="font-bold text-base text-paypilot-text leading-snug line-clamp-1 group-hover:text-paypilot-brand transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-paypilot-muted line-clamp-1 mt-0.5">{product.model}</p>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2 mt-2.5">
            <span className="text-xl font-bold text-paypilot-text tabular-nums">
              {formatINR(product.priceINR)}
            </span>
            <span className="text-xs text-paypilot-muted tabular-nums">
              ({formatUSD(product.priceUSD)})
            </span>
          </div>

          {/* Key Hardware Specs Grid */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-paypilot-border/60 text-xs">
            <div className="flex items-center gap-1.5 text-paypilot-text truncate" title={product.processor?.model}>
              <Cpu className="w-3.5 h-3.5 text-paypilot-muted flex-shrink-0" />
              <span className="truncate">{product.processor?.model}</span>
            </div>

            <div className="flex items-center gap-1.5 text-paypilot-text truncate" title={formatRAM(product.ram)}>
              <span className="w-3.5 h-3.5 rounded bg-paypilot-subtleViolet text-paypilot-brand flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                R
              </span>
              <span className="truncate">{formatRAM(product.ram)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-paypilot-text truncate" title={formatStorage(product.storage)}>
              <HardDrive className="w-3.5 h-3.5 text-paypilot-muted flex-shrink-0" />
              <span className="truncate">{formatStorage(product.storage)}</span>
            </div>

            <div className="flex items-center gap-1.5 text-paypilot-text truncate" title={`${product.weightKg} kg`}>
              <Scale className="w-3.5 h-3.5 text-paypilot-muted flex-shrink-0" />
              <span className="truncate">{product.weightKg} kg</span>
            </div>
          </div>

          {/* Strengths / Trade-offs Highlights */}
          {product.strengths && product.strengths.length > 0 && (
            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-start gap-1.5 text-[11px] text-paypilot-text">
                <CheckCircle className="w-3.5 h-3.5 text-paypilot-success flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">{product.strengths[0]}</span>
              </div>
              {product.tradeOffs && product.tradeOffs.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-paypilot-muted">
                  <AlertTriangle className="w-3.5 h-3.5 text-paypilot-warning flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{product.tradeOffs[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="pt-3 border-t border-paypilot-border flex items-center gap-2">
          <Button
            variant={isCompared ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onToggleCompare(product.id)}
            disabled={!isCompared && compareDisabled}
            icon={Layers}
            className="flex-1"
          >
            {isCompared ? 'Added to Compare' : 'Compare'}
          </Button>

          <Button
            variant="subtle"
            size="sm"
            onClick={() => onViewDetails(product)}
            className="px-3"
            title="View verified technical specifications"
          >
            Specs
          </Button>
        </div>
      </div>
    </Card>
  );
}
