import React from 'react';
import { Menu, ShieldCheck, Activity, RefreshCw, User, LogIn, LogOut } from 'lucide-react';
import { Badge } from '../common/Badge';

export function Header({
  onToggleSidebar,
  totalProducts = 0,
  backendConnected = true,
  onRefresh,
  user = null,
  onOpenAuth,
  onLogout
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

        {/* User Account / Auth Actions */}
        {user ? (
          <div className="flex items-center gap-2 pl-1 border-l border-paypilot-border">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#0F172A]">
              <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#635BFF] flex items-center justify-center font-bold text-[10px]">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">{user.name || user.email}</span>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-paypilot-muted hover:text-[#DC2626] hover:bg-red-50 border border-paypilot-border transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#635BFF] hover:bg-[#4F46E5] active:bg-[#4338CA] transition-colors shadow-sm ml-1"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
