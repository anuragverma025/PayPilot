import React from 'react';
import { Laptop, Cpu, ShieldCheck } from 'lucide-react';

// Brand-specific accent styles for consistent, premium visual identity
const BRAND_THEMES = {
  Lenovo: {
    accent: '#E11D48',
    bg: 'from-rose-50/60 via-slate-50 to-slate-100',
    tag: 'bg-rose-100/70 text-rose-800 border-rose-200'
  },
  Apple: {
    accent: '#64748B',
    bg: 'from-slate-100/70 via-gray-50 to-slate-200/50',
    tag: 'bg-slate-200 text-slate-800 border-slate-300'
  },
  ASUS: {
    accent: '#0284C7',
    bg: 'from-sky-50/60 via-slate-50 to-slate-100',
    tag: 'bg-sky-100/70 text-sky-800 border-sky-200'
  },
  Dell: {
    accent: '#0D9488',
    bg: 'from-teal-50/60 via-slate-50 to-slate-100',
    tag: 'bg-teal-100/70 text-teal-800 border-teal-200'
  },
  HP: {
    accent: '#2563EB',
    bg: 'from-blue-50/60 via-slate-50 to-slate-100',
    tag: 'bg-blue-100/70 text-blue-800 border-blue-200'
  },
  Acer: {
    accent: '#16A34A',
    bg: 'from-emerald-50/60 via-slate-50 to-slate-100',
    tag: 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
  },
  MSI: {
    accent: '#DC2626',
    bg: 'from-red-50/60 via-slate-50 to-slate-100',
    tag: 'bg-red-100/70 text-red-800 border-red-200'
  },
  Samsung: {
    accent: '#4F46E5',
    bg: 'from-indigo-50/60 via-slate-50 to-slate-100',
    tag: 'bg-indigo-100/70 text-indigo-800 border-indigo-200'
  },
  Framework: {
    accent: '#EA580C',
    bg: 'from-orange-50/60 via-slate-50 to-slate-100',
    tag: 'bg-orange-100/70 text-orange-800 border-orange-200'
  }
};

export function ProductPlaceholder({ product, variant = 'card', className = '' }) {
  const brand = product?.brand || 'PayPilot';
  const theme = BRAND_THEMES[brand] || {
    accent: '#635BFF',
    bg: 'from-violet-50/60 via-slate-50 to-slate-100',
    tag: 'bg-violet-100 text-violet-800 border-violet-200'
  };

  const isModal = variant === 'modal';
  const displaySpec = product?.display ? `${product.display.sizeInches}" ${product.display.panelType || 'Display'}` : 'Laptop';
  const computeSpec = product?.gpu?.type === 'dedicated'
    ? product.gpu.model
    : product?.processor?.model || 'Verified Architecture';

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br ${theme.bg} border-b border-paypilot-border select-none overflow-hidden ${className}`}
      aria-label={`${product?.name || 'Laptop'} placeholder illustration`}
    >
      {/* Background Subtle Tech Blueprint Grid Lines */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${theme.accent} 1px, transparent 1px)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Top Metadata Row */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-xs ${theme.tag}`}
        >
          {brand}
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded-md border border-amber-200 shadow-xs">
          <ShieldCheck className="w-3 h-3 text-amber-600" />
          <span>Placeholder (Photo Unavailable)</span>
        </span>
      </div>

      {/* Center Laptop Vector Silhouette Illustration */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
        <svg
          viewBox="0 0 160 100"
          className={isModal ? 'w-36 h-24 text-slate-700' : 'w-24 h-16 text-slate-600'}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Laptop Screen Lid */}
          <rect
            x="20"
            y="12"
            width="120"
            height="70"
            rx="5"
            className="fill-slate-800 stroke-slate-700"
            strokeWidth="2"
          />
          {/* Display Inner Screen Glass */}
          <rect
            x="26"
            y="18"
            width="108"
            height="58"
            rx="2"
            className="fill-slate-900"
          />
          {/* Ambient Screen Glow / Code lines illustration */}
          <rect x="32" y="24" width="40" height="3" rx="1.5" fill={theme.accent} opacity="0.8" />
          <rect x="32" y="31" width="60" height="2.5" rx="1.25" fill="#94A3B8" opacity="0.6" />
          <rect x="32" y="37" width="48" height="2.5" rx="1.25" fill="#94A3B8" opacity="0.5" />
          <rect x="32" y="43" width="70" height="2.5" rx="1.25" fill="#94A3B8" opacity="0.4" />
          <rect x="32" y="49" width="34" height="2.5" rx="1.25" fill={theme.accent} opacity="0.7" />

          {/* Laptop Base / Deck */}
          <path
            d="M8 84C8 82.8954 8.89543 82 10 82H150C151.105 82 152 82.8954 152 84L156 90C156 91.1046 155.105 92 154 92H6C4.89543 92 4 91.1046 4 90L8 84Z"
            className="fill-slate-300 stroke-slate-400"
            strokeWidth="1.5"
          />
          {/* Trackpad Notch */}
          <rect
            x="68"
            y="83"
            width="24"
            height="3"
            rx="1.5"
            className="fill-slate-400"
          />
          {/* Base bottom bumper */}
          <rect x="18" y="91.5" width="124" height="1.5" rx="0.75" fill="#64748B" opacity="0.4" />
        </svg>

        {/* Model Subtitle */}
        <p className="text-[11px] font-semibold text-slate-700 tracking-tight text-center line-clamp-1 mt-1 max-w-[90%]">
          {product?.model || product?.name}
        </p>
        <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider block text-center">
          Verified Specs • Photo Unavailable
        </span>
      </div>

      {/* Bottom Features Pill Strip */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
        <span className="truncate max-w-[50%] font-medium text-slate-600">
          {displaySpec}
        </span>
        <span className="truncate max-w-[50%] font-medium text-slate-600 text-right">
          {computeSpec}
        </span>
      </div>
    </div>
  );
}
