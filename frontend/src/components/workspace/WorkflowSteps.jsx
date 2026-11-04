import React from 'react';
import { CheckCircle2, ChevronRight, Bot, ShieldCheck } from 'lucide-react';
import { WORKFLOW_STEPS } from '../../utils/constants';

const STEP_DESCRIPTIONS = {
  1: 'Agent extracts structured computing constraints & budget limits from user prompt.',
  2: 'Deterministic engine scores & matches 32 verified OEM laptop configurations.',
  3: 'Spec divergence engine highlights hardware differences, trade-offs, and headroom.',
  4: 'Human-in-the-loop checkpoint: Explicit order & price approval required from user.',
  5: 'Authoritative PayPal Sandbox capture, currency check & cryptographic audit trail.'
};

export function WorkflowSteps({ currentStep = 2 }) {
  const currentDescription = STEP_DESCRIPTIONS[currentStep] || STEP_DESCRIPTIONS[2];

  return (
    <div className="bg-white border border-paypilot-border rounded-2xl p-4 shadow-subtle mb-6">
      {/* Agentic Commerce Protocol Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-paypilot-border gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-paypilot-subtleViolet text-paypilot-brand text-[11px] font-bold">
            <Bot className="w-3.5 h-3.5" />
            <span>Agentic Commerce Workflow</span>
          </span>
          <span className="text-xs text-paypilot-muted hidden md:inline">
            • Autonomous Intelligence with Human-in-the-Loop Approval
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-paypilot-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-paypilot-success" />
          <span>Stage {currentStep} of 5: {currentDescription}</span>
        </div>
      </div>

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
