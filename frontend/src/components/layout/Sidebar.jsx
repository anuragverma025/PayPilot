import React from 'react';
import {
  Compass,
  Sparkles,
  Layers,
  ShoppingBag,
  Sliders,
  Settings,
  PlusCircle,
  X,
  ExternalLink
} from 'lucide-react';

export function Sidebar({
  activeView,
  setActiveView,
  isOpen,
  onClose,
  compareCount = 0,
  onNewSession
}) {
  const navItems = [
    { id: 'workspace', label: 'Shopping Workspace', icon: Sparkles },
    { id: 'compare', label: 'Compare Products', icon: Layers, badge: compareCount > 0 ? compareCount : null },
    { id: 'orders', label: 'Orders & Checkout', icon: ShoppingBag, disabledText: 'Phase 3' },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-paypilot-navy/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-paypilot-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-paypilot-border">
          <div className="flex items-center gap-2.5">
            {/* PayPilot Compass Symbol */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-paypilot-brand to-indigo-500 flex items-center justify-center text-white shadow-subtle">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-bold text-lg text-paypilot-text tracking-tight">PayPilot</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-paypilot-subtleViolet text-paypilot-brand font-semibold uppercase tracking-wider">
                AI Agent
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-paypilot-muted hover:text-paypilot-text lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Session Action */}
        <div className="p-4">
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-paypilot-subtleViolet text-paypilot-brand hover:bg-violet-100 rounded-xl font-medium text-sm transition-colors border border-paypilot-brand/20 shadow-subtle"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Shopping Goal</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabledText) {
                    setActiveView(item.id);
                    onClose();
                  }
                }}
                disabled={Boolean(item.disabledText)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-paypilot-brand text-white shadow-subtle'
                    : item.disabledText
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-paypilot-muted hover:text-paypilot-text hover:bg-paypilot-bg'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-paypilot-muted'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-paypilot-brand' : 'bg-paypilot-brand text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.disabledText && (
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {item.disabledText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Hackathon Context Footer */}
        <div className="p-4 border-t border-paypilot-border bg-paypilot-bg/50">
          <div className="rounded-xl border border-paypilot-border bg-white p-3 space-y-1.5 shadow-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-paypilot-navy">PayPal Hackathon 2026</span>
              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.2 rounded">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-paypilot-muted leading-tight">
              Agentic commerce assistant with deterministic ranking & PayPal Sandbox.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
