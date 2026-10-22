import React from 'react';
import {
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  Info,
  Cpu,
  Battery,
  HardDrive
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { formatINR } from '../../utils/formatters';

export function PreferencesPanel({ filters, totalResults, meta }) {
  return (
    <div className="space-y-5">
      {/* Active Preferences Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-paypilot-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-paypilot-brand" />
            <h4 className="text-sm font-semibold text-paypilot-text">Active Constraints</h4>
          </div>
          <span className="text-xs text-paypilot-muted tabular-nums">
            {totalResults} matches
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-paypilot-muted">Budget Ceiling</span>
            <span className="font-semibold text-paypilot-text tabular-nums">
              {formatINR(filters.maxBudget)}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-paypilot-muted">Brand Filter</span>
            <span className="font-semibold text-paypilot-text">{filters.brand}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-paypilot-muted">Minimum Memory</span>
            <span className="font-semibold text-paypilot-text">{filters.minRam}GB RAM</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-paypilot-muted">Graphics Preference</span>
            <span className="font-semibold text-paypilot-text capitalize">
              {filters.gpuType === 'any' ? 'Any' : filters.gpuType}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-paypilot-muted">Upgradability</span>
            <span className="font-semibold text-paypilot-text">
              {filters.upgradableOnly ? 'Required' : 'Flexible'}
            </span>
          </div>
        </div>
      </Card>

      {/* Deterministic Scoring Explanation */}
      <Card className="p-5 space-y-3 bg-gradient-to-br from-white to-paypilot-subtleViolet/30">
        <div className="flex items-center gap-2 text-paypilot-brand">
          <Info className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">How PayPilot Scores</h4>
        </div>
        <p className="text-xs text-paypilot-muted leading-relaxed">
          Scores (0–100%) are calculated with transparent deterministic backend logic:
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-paypilot-text">
            <span>Budget & Savings:</span>
            <strong className="text-paypilot-brand font-semibold">30 pts</strong>
          </div>
          <div className="flex justify-between text-paypilot-text">
            <span>RAM Multitasking:</span>
            <strong className="text-paypilot-brand font-semibold">20 pts</strong>
          </div>
          <div className="flex justify-between text-paypilot-text">
            <span>Workload & CPU/GPU:</span>
            <strong className="text-paypilot-brand font-semibold">25 pts</strong>
          </div>
          <div className="flex justify-between text-paypilot-text">
            <span>Battery & Portability:</span>
            <strong className="text-paypilot-brand font-semibold">15 pts</strong>
          </div>
          <div className="flex justify-between text-paypilot-text">
            <span>Modular Upgradability:</span>
            <strong className="text-paypilot-brand font-semibold">10 pts</strong>
          </div>
        </div>
      </Card>

      {/* Catalog Transparency Guarantee */}
      <Card className="p-5 space-y-3 bg-white">
        <div className="flex items-center gap-2 text-paypilot-success">
          <ShieldCheck className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider">Transparency Guarantee</h4>
        </div>
        <ul className="space-y-2 text-xs text-paypilot-muted">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-paypilot-success flex-shrink-0 mt-0.5" />
            <span>Specifications verified from public OEM hardware datasheets.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-paypilot-success flex-shrink-0 mt-0.5" />
            <span>No fake stock timers or fabricated star ratings.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-paypilot-success flex-shrink-0 mt-0.5" />
            <span>Clearly labeled demo records for PayPal Hackathon 2026.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
