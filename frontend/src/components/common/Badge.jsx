import React from 'react';

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon: Icon
}) {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5 font-medium'
  };

  const variantClasses = {
    brand: 'bg-paypilot-subtleViolet text-paypilot-brand border border-paypilot-brand/20',
    success: 'bg-paypilot-successBg text-paypilot-success border border-paypilot-success/20',
    warning: 'bg-paypilot-warningBg text-paypilot-warning border border-paypilot-warning/20',
    error: 'bg-paypilot-errorBg text-paypilot-error border border-paypilot-error/20',
    neutral: 'bg-paypilot-bg text-paypilot-muted border border-paypilot-border'
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
      {children}
    </span>
  );
}
