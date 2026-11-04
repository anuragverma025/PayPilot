import React, { useState } from 'react';
import { Search, Sparkles, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { EXAMPLE_QUERIES } from '../../utils/constants';

export function SearchHero({
  searchQuery,
  onSearchChange,
  onSelectExample,
  onReset,
  onAskAi,
  isAiLoading = false,
  aiError = null
}) {
  const [promptInput, setPromptInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!promptInput.trim() || isAiLoading) return;
    onAskAi(promptInput.trim());
  };

  const handleChipClick = (example) => {
    const text = example.prompt || example.label;
    setPromptInput(text);
    if (onAskAi) {
      onAskAi(text);
    }
  };

  return (
    <div className="bg-gradient-to-b from-white to-paypilot-bg/50 border border-paypilot-border rounded-3xl p-6 sm:p-8 shadow-card mb-6 transition-all">
      <div className="max-w-3xl">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paypilot-subtleViolet text-paypilot-brand text-xs font-semibold mb-3 border border-paypilot-brand/15">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Shopping Decision Assistant</span>
        </div>

        {/* Main Headline */}
        <h2 className="text-2xl sm:text-3xl font-bold text-paypilot-text tracking-tight mb-2">
          Find the right laptop for your goals.
        </h2>
        <p className="text-sm text-paypilot-muted mb-6 leading-relaxed">
          Describe your coursework, coding priorities, and budget in plain English. PayPilot uses Google Gemini to extract your requirements, then deterministically ranks 32 verified laptops to produce a grounded <strong>Shopping Decision Report</strong>.
        </p>

        {/* Natural Language AI Assistant Input Form */}
        <form onSubmit={handleSubmit} className="relative mb-3">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-paypilot-muted">
              <Sparkles className="w-5 h-5 text-paypilot-brand" />
            </div>

            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={isAiLoading}
              placeholder="e.g. I need a laptop for college coding and AI projects under ₹60,000 prioritizing RAM & battery..."
              className="w-full pl-11 pr-32 sm:pr-36 py-3.5 sm:py-4 bg-white border border-paypilot-border rounded-2xl text-xs sm:text-sm text-paypilot-text placeholder-paypilot-muted focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 focus:border-paypilot-brand shadow-card transition-all disabled:opacity-60"
            />

            <div className="absolute right-2 flex items-center gap-1">
              {promptInput && !isAiLoading && (
                <button
                  type="button"
                  onClick={() => setPromptInput('')}
                  className="p-1.5 rounded-lg text-paypilot-muted hover:text-paypilot-text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                disabled={!promptInput.trim() || isAiLoading}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-paypilot-brand hover:bg-paypilot-brandHover active:bg-paypilot-brandHover text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Ask AI</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* AI Error Alert with Retry */}
        {aiError && (
          <div className="p-3 bg-paypilot-errorBg border border-paypilot-error/20 rounded-xl text-xs text-paypilot-error flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{aiError}</span>
            </div>
            <button
              onClick={() => onAskAi(promptInput)}
              className="font-bold underline hover:no-underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Example Prompt Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs font-semibold text-paypilot-muted">Try asking:</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button
              key={example.label}
              type="button"
              disabled={isAiLoading}
              onClick={() => handleChipClick(example)}
              className="px-3 py-1.5 rounded-xl bg-white border border-paypilot-border hover:border-paypilot-brand/40 hover:bg-paypilot-subtleViolet/40 text-xs text-paypilot-text font-medium transition-all shadow-subtle disabled:opacity-50"
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
