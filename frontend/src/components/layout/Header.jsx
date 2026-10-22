import React from 'react';
import { Menu, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';

export function Header({
  onToggleSidebar,
  totalProducts = 0,
  backendConnected = true,
  onRefresh
}) {
  return (
    <header className="h-16 bg-white border-b border-paypilot-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-paypilot-muted hover:text-paypilot-text hover:bg-paypilot-bg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-paypilot-text leading-tight">
            Laptop Shopping Intelligence
          </h1>
          <p className="text-xs text-paypilot-muted hidden sm:block">
            Curated verified configurations for college students & developers
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Transparency Badge */}
        <Badge variant="neutral" size="sm" className="hidden md:inline-flex">
          <ShieldCheck className="w-3.5 h-3.5 text-paypilot-brand" />
          <span>Demo Catalog ({totalProducts} Verified Laptops)</span>
        </Badge>

        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            backendConnected
              ? 'bg-paypilot-successBg text-paypilot-success border-paypilot-success/20'
              : 'bg-paypilot-warningBg text-paypilot-warning border-paypilot-warning/20'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-paypilot-success animate-pulse' : 'bg-paypilot-warning'
            }`}
          />
          <span className="hidden sm:inline">
            {backendConnected ? 'API Live' : 'Connecting API...'}
          </span>
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          title="Refresh products"
          className="p-2 rounded-xl text-paypilot-muted hover:text-paypilot-text hover:bg-paypilot-bg transition-colors border border-paypilot-border"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
