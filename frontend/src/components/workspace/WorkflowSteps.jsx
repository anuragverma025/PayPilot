import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { WORKFLOW_STEPS } from '../../utils/constants';

export function WorkflowSteps({ currentStep = 2 }) {
  return (
    <div className="bg-white border border-paypilot-border rounded-2xl p-4 shadow-subtle mb-6">
      <div className="flex items-center justify-between overflow-x-auto pb-1 sm:pb-0 gap-2">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isDone = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-paypilot-success text-white'
                      : isCurrent
                      ? 'bg-paypilot-brand text-white ring-4 ring-paypilot-subtleViolet'
                      : 'bg-gray-100 text-paypilot-muted'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.number}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-paypilot-brand font-semibold'
                      : isDone
                      ? 'text-paypilot-text'
                      : 'text-paypilot-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
