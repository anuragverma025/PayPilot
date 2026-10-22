import React from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { EXAMPLE_QUERIES } from '../../utils/constants';

export function SearchHero({
  searchQuery,
  onSearchChange,
  onSelectExample,
  onReset
}) {
  return (
    <div className="bg-gradient-to-b from-white to-paypilot-bg/50 border border-paypilot-border rounded-2xl p-6 sm:p-8 shadow-card mb-6">
      <div className="max-w-3xl">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paypilot-subtleViolet text-paypilot-brand text-xs font-semibold mb-3 border border-paypilot-brand/15">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Intelligent Laptop Matcher</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-2xl sm:text-3xl font-bold text-paypilot-text tracking-tight mb-2">
          Find the right laptop for your goals.
        </h2>
        <p className="text-sm text-paypilot-muted mb-6 leading-relaxed">
          Tell PayPilot your priorities, budget, and coursework needs. Get deterministic match scores, verified hardware specifications, and honest trade-off disclosures.
        </p>

        {/* Interactive Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-paypilot-muted">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by model, brand, processor (e.g. Ryzen 7, RTX 4050, ThinkPad, OLED)..."
            className="w-full pl-11 pr-10 py-3.5 bg-white border border-paypilot-border rounded-xl text-sm text-paypilot-text placeholder-paypilot-muted focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 focus:border-paypilot-brand shadow-subtle transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-paypilot-muted hover:text-paypilot-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Example Prompt Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-paypilot-muted">Example goals:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example.label}
              onClick={() => onSelectExample(example)}
              className="px-3 py-1.5 rounded-lg bg-white border border-paypilot-border hover:border-paypilot-brand/40 hover:bg-paypilot-subtleViolet/40 text-xs text-paypilot-text font-medium transition-all shadow-subtle"
            >
              {example.label}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={onReset}
              className="text-xs text-paypilot-brand font-medium hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
