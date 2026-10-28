import React from 'react';
import {
  Compass,
  Sparkles,
  Layers,
  Package,
  Sliders,
  Settings,
  PlusCircle,
  X,
  ExternalLink,
  ShoppingBag,
  Clock,
  ShieldCheck
} from 'lucide-react';

export function Sidebar({
  activeView,
  setActiveView,
  isOpen,
  onClose,
  compareCount = 0,
  ordersCount = null,
  onNewSession
}) {
  const shoppingItems = [
    { id: 'workspace', label: 'AI Shopping Assistant', icon: Sparkles },
    { id: 'browse', label: 'Browse Products', icon: Compass },
    {
      id: 'compare',
      label: 'Compare Products',
      icon: Layers,
      badge: compareCount > 0 ? compareCount : null
    }
  ];

  const accountItems = [
    {
      id: 'orders',
      label: 'My Orders',
      icon: Package,
      badge: ordersCount !== null && ordersCount > 0 ? ordersCount : null
    }
  ];

  const handleNavClick = (id) => {
    setActiveView(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-[#E2E8F0]">
          <button
            onClick={() => handleNavClick('workspace')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#635BFF] flex items-center justify-center text-white shadow-sm group-hover:bg-[#4F46E5] transition-colors">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-bold text-lg text-[#0F172A] tracking-tight">PayPilot</span>
                <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#635BFF] font-semibold uppercase tracking-wider">
                  AI Agent
                </span>
              </div>
            </div>
          </button>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Session Action */}
        <div className="p-3.5">
          <button
            onClick={() => {
              if (onNewSession) onNewSession();
              handleNavClick('workspace');
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#EEF2FF] text-[#635BFF] hover:bg-indigo-100/70 hover:text-[#4F46E5] active:bg-[#4338CA] active:text-white rounded-xl font-medium text-sm transition-all border border-[#635BFF]/15 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Shopping Goal</span>
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
          {/* Group 1: SHOPPING */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Shopping
            </div>
            <div className="space-y-1">
              {shoppingItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id || (item.id === 'workspace' && activeView === 'shopping');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#635BFF] font-semibold shadow-sm border border-[#635BFF]/20'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#635BFF]' : 'text-[#64748B]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-[#635BFF] text-white'
                            : 'bg-slate-100 text-[#475569]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 2: YOUR ACCOUNT */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Your Account
            </div>
            <div className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#635BFF] font-semibold shadow-sm border border-[#635BFF]/20'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#635BFF]' : 'text-[#64748B]'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && item.badge > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-[#635BFF] text-white'
                            : 'bg-[#EEF2FF] text-[#635BFF]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Trust & Sandbox Verified Footer */}
        <div className="p-3.5 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                <span>PayPal Sandbox</span>
              </span>
              <span className="text-[10px] bg-[#DCFCE7] text-[#16A34A] font-bold px-1.5 py-0.5 rounded-md">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-tight">
              Server-authoritative catalog pricing & verified capture audit trail.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
