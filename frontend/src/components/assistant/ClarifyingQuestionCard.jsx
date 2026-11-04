import React from 'react';
import { HelpCircle, Sparkles, ArrowRight, X, Loader2 } from 'lucide-react';

export function ClarifyingQuestionCard({
  data,
  onSelectOption,
  onDismiss,
  isLoading = false
}) {
  if (!data?.clarification) return null;

  const { query, clarification } = data;
  const { question, explanation, options = [] } = clarification;

  return (
    <div className="bg-gradient-to-b from-white via-indigo-50/30 to-white border-2 border-[#635BFF]/30 rounded-3xl p-6 sm:p-7 shadow-lg mb-8 transition-all animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#635BFF] text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#635BFF] uppercase tracking-wider">
                Shopping Agent Clarification
              </span>
              <span className="text-[10px] font-semibold bg-indigo-100 text-[#635BFF] px-2 py-0.5 rounded-full">
                Step 1 of 5
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
              Goal: <span className="italic text-[#635BFF]">"{query}"</span>
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-[#E2E8F0] transition-colors"
            title="Dismiss question"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question & Context */}
      <div className="py-4 space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-[#0F172A] flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#635BFF] flex-shrink-0" />
          <span>{question}</span>
        </h3>
        {explanation && (
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed pl-7">
            {explanation}
          </p>
        )}
      </div>

      {/* Options Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
        {options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectOption(option)}
            className="text-left p-4 rounded-2xl bg-white border border-[#E2E8F0] hover:border-[#635BFF] hover:bg-indigo-50/40 hover:shadow-md transition-all group relative flex flex-col justify-between space-y-2 disabled:opacity-50"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#635BFF] uppercase tracking-wider block">
                Profile Option {idx + 1}
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#635BFF] transition-colors">
                {option.label}
              </h4>
              <p className="text-xs text-[#64748B] leading-snug line-clamp-2">
                {option.description}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[#635BFF] border-t border-slate-100 group-hover:border-indigo-100">
              <span>Select Profile</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mt-4 p-3 bg-indigo-50 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-[#635BFF]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Agent is grounding catalog recommendations for your selection...</span>
        </div>
      )}
    </div>
  );
}

