import React from 'react';
import { Layers, X, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { formatINR } from '../../utils/formatters';

export function ComparisonDrawer({
  comparedProducts,
  onRemove,
  onOpenModal,
  onClear
}) {
  if (!comparedProducts || comparedProducts.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-paypilot-border shadow-elevated transition-transform duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Selected Products Thumbnails */}
        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-paypilot-navy whitespace-nowrap">
            <Layers className="w-4 h-4 text-paypilot-brand" />
            <span>Compare Tray ({comparedProducts.length}/3):</span>
          </div>

          <div className="flex items-center gap-2">
            {comparedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-paypilot-bg border border-paypilot-border rounded-xl text-xs font-medium text-paypilot-text shadow-subtle flex-shrink-0"
              >
                <span className="truncate max-w-[130px]">{product.name}</span>
                <span className="text-[11px] font-bold text-paypilot-brand tabular-nums">
                  {formatINR(product.priceINR)}
                </span>
                <button
                  onClick={() => onRemove(product.id)}
                  className="p-1 rounded-md text-paypilot-muted hover:text-paypilot-text hover:bg-gray-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={onClear}
            className="text-xs text-paypilot-muted hover:text-paypilot-text font-medium px-2 py-1"
          >
            Clear All
          </button>

          <Button
            variant="primary"
            size="sm"
            disabled={comparedProducts.length < 2}
            onClick={onOpenModal}
            icon={ArrowRight}
          >
            {comparedProducts.length < 2
              ? 'Select 1 more to compare'
              : `Compare ${comparedProducts.length} Laptops`}
          </Button>
        </div>
      </div>
    </div>
  );
}
