import React from 'react';
import {
  Cpu,
  HardDrive,
  Monitor,
  Battery,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Info,
  CreditCard
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProductImage } from './ProductImage';
import { formatINR, formatUSD, formatRAM, formatStorage } from '../../utils/formatters';

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onToggleCompare,
  onProceedToOrder,
  isCompared = false
}) {
  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product.name} maxWidth="max-w-3xl">
      <div className="space-y-6">
        {/* Visual Showcase Banner */}
        <div className="h-44 sm:h-52 rounded-xl overflow-hidden border border-paypilot-border shadow-subtle bg-slate-50">
          <ProductImage
            product={product}
            variant="modal"
            className="h-full w-full"
          />
        </div>

        {/* Header Hero in Modal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-paypilot-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-paypilot-muted">
                {product.brand} • {product.category}
              </span>
              {product.isSampleData && (
                <Badge variant="neutral" size="sm">
                  Verified Sample Data
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-paypilot-text mt-1">{product.name}</h2>
            <p className="text-xs text-paypilot-muted mt-0.5">{product.model}</p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-2xl font-bold text-paypilot-text tabular-nums">
              {formatINR(product.priceINR)}
            </div>
            <div className="text-xs text-paypilot-muted tabular-nums">
              Approx. {formatUSD(product.priceUSD)} USD
            </div>
          </div>
        </div>

        {/* Verified Specifications Grid */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-paypilot-text mb-3 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-paypilot-brand" />
            <span>Hardware Specifications</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Processor */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Processor (CPU)</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                {product.processor?.brand} {product.processor?.model}
              </span>
              <span className="text-[11px] text-paypilot-muted">
                {product.processor?.cores} Cores, {product.processor?.threads} Threads ({product.processor?.baseClockGHz}GHz base, up to {product.processor?.maxClockGHz}GHz)
              </span>
            </div>

            {/* Memory */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Memory (RAM)</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                {formatRAM(product.ram)}
              </span>
              <span className="text-[11px] text-paypilot-muted">
                {product.ram?.isUpgradable
                  ? `Upgradable up to ${product.ram?.maxSupportedGB}GB`
                  : 'Soldered on-board (Non-upgradable)'}
              </span>
            </div>

            {/* Storage */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Storage (SSD)</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                {formatStorage(product.storage)}
              </span>
              <span className="text-[11px] text-paypilot-muted">
                {product.storage?.extraSlot
                  ? 'Secondary open M.2 slot available'
                  : 'Single storage slot'}
              </span>
            </div>

            {/* Display */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Display</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                {product.display?.sizeInches}" {product.display?.resolution}
              </span>
              <span className="text-[11px] text-paypilot-muted">
                {product.display?.refreshRateHz}Hz • {product.display?.panelType} ({product.display?.brightnessNits} nits)
              </span>
            </div>

            {/* Graphics */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Graphics (GPU)</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                {product.gpu?.model}
              </span>
              <span className="text-[11px] text-paypilot-muted">
                {product.gpu?.type === 'dedicated'
                  ? `Dedicated GPU (${product.gpu?.vramGB}GB VRAM)`
                  : 'Integrated GPU architecture'}
              </span>
            </div>

            {/* Battery & Weight */}
            <div className="bg-paypilot-bg p-3.5 rounded-xl border border-paypilot-border/80">
              <span className="text-paypilot-muted block text-[11px]">Battery & Weight</span>
              <span className="font-semibold text-paypilot-text block mt-0.5">
                ~{product.battery?.realWorldHoursEstimate} hrs real-world ({product.battery?.capacityWattHours}Wh)
              </span>
              <span className="text-[11px] text-paypilot-muted">
                Chassis weight: {product.weightKg} kg
              </span>
            </div>
          </div>
        </div>

        {/* Ports & Connectivity */}
        {product.ports && product.ports.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-paypilot-text mb-2">
              Ports & IO
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {product.ports.map((port, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-paypilot-bg text-paypilot-text text-xs rounded-lg border border-paypilot-border"
                >
                  {port}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Honest Trade-offs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Strengths */}
          <div className="p-4 bg-paypilot-successBg/50 border border-paypilot-success/20 rounded-xl space-y-2">
            <h5 className="text-xs font-bold text-paypilot-success flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Key Hardware Strengths</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-paypilot-text">
              {product.strengths?.map((s, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-paypilot-success">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Trade-offs */}
          <div className="p-4 bg-paypilot-warningBg/50 border border-paypilot-warning/20 rounded-xl space-y-2">
            <h5 className="text-xs font-bold text-paypilot-warning flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Identified Trade-offs</span>
            </h5>
            <ul className="space-y-1.5 text-xs text-paypilot-muted">
              {product.tradeOffs?.map((t, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-paypilot-warning">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sample Data Disclosure Notice */}
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-paypilot-border rounded-xl text-xs text-paypilot-muted">
          <Info className="w-4 h-4 text-paypilot-muted flex-shrink-0 mt-0.5" />
          <span>
            {product.sampleDataNotice ||
              'Sample catalog record verified against public hardware specifications for hackathon evaluation.'}
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-paypilot-border">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant={isCompared ? 'primary' : 'subtle'}
              size="md"
              icon={Layers}
              onClick={() => onToggleCompare(product.id)}
            >
              {isCompared ? 'Remove from Compare' : 'Add to Compare'}
            </Button>

            {onProceedToOrder && (
              <Button
                variant="primary"
                size="md"
                icon={CreditCard}
                onClick={() => {
                  onClose();
                  onProceedToOrder(product);
                }}
              >
                Order with PayPal
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
