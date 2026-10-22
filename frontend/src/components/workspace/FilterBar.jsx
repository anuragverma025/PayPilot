import React from 'react';
import { Filter, ArrowUpDown, Cpu, HardDrive } from 'lucide-react';
import { BRAND_OPTIONS } from '../../utils/constants';
import { formatINR } from '../../utils/formatters';

export function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults = 0
}) {
  return (
    <div className="bg-white border border-paypilot-border rounded-2xl p-4 sm:p-5 shadow-subtle mb-6 space-y-4">
      {/* Top Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Budget Limit Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-paypilot-text">Max Budget</span>
            <span className="font-bold text-paypilot-brand tabular-nums">
              {formatINR(filters.maxBudget)}
            </span>
          </div>
          <input
            type="range"
            min="35000"
            max="150000"
            step="5000"
            value={filters.maxBudget}
            onChange={(e) => onFilterChange('maxBudget', Number(e.target.value))}
            className="w-full accent-paypilot-brand cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-paypilot-muted tabular-nums">
            <span>₹35,000</span>
            <span>₹1,50,000</span>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-paypilot-text block">Brand</label>
          <select
            value={filters.brand}
            onChange={(e) => onFilterChange('brand', e.target.value)}
            className="w-full px-3 py-2 bg-paypilot-bg border border-paypilot-border rounded-xl text-xs font-medium text-paypilot-text focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20"
          >
            {BRAND_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'All Brands' : b}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum RAM */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-paypilot-text block">Min RAM</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onFilterChange('minRam', 8)}
              className={`py-2 px-2 text-xs font-medium rounded-xl border transition-colors ${
                filters.minRam === 8
                  ? 'bg-paypilot-brand text-white border-paypilot-brand'
                  : 'bg-white text-paypilot-text border-paypilot-border hover:bg-paypilot-bg'
              }`}
            >
              8GB+
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('minRam', 16)}
              className={`py-2 px-2 text-xs font-medium rounded-xl border transition-colors ${
                filters.minRam === 16
                  ? 'bg-paypilot-brand text-white border-paypilot-brand'
                  : 'bg-white text-paypilot-text border-paypilot-border hover:bg-paypilot-bg'
              }`}
            >
              16GB+
            </button>
          </div>
        </div>

        {/* GPU Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-paypilot-text block">Graphics / GPU</label>
          <select
            value={filters.gpuType}
            onChange={(e) => onFilterChange('gpuType', e.target.value)}
            className="w-full px-3 py-2 bg-paypilot-bg border border-paypilot-border rounded-xl text-xs font-medium text-paypilot-text focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20"
          >
            <option value="any">Any Graphics</option>
            <option value="dedicated">Dedicated (NVIDIA RTX)</option>
            <option value="integrated">Integrated (Iris / Radeon / M2)</option>
          </select>
        </div>
      </div>

      {/* Secondary Bar: Upgradable Toggle, Sort, and Counter */}
      <div className="flex flex-wrap items-center justify-between pt-3 border-t border-paypilot-border gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.upgradableOnly}
              onChange={(e) => onFilterChange('upgradableOnly', e.target.checked)}
              className="rounded text-paypilot-brand focus:ring-paypilot-brand/20 w-4 h-4 accent-paypilot-brand"
            />
            <span className="font-medium text-paypilot-text">Upgradable RAM only</span>
          </label>

          <span className="text-paypilot-muted">|</span>

          <span className="font-medium text-paypilot-muted">
            Showing <strong className="text-paypilot-text tabular-nums">{totalResults}</strong> laptops
          </span>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <span className="text-paypilot-muted flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort:
          </span>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="px-2.5 py-1.5 bg-paypilot-bg border border-paypilot-border rounded-lg text-xs font-medium text-paypilot-text focus:outline-none"
          >
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="ram_desc">RAM Capacity</option>
            <option value="weight_asc">Lightest (Weight)</option>
            <option value="battery_desc">Battery Runtime</option>
          </select>

          <button
            onClick={onResetFilters}
            className="text-xs text-paypilot-muted hover:text-paypilot-brand font-medium ml-2 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
