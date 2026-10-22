import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  icon: Icon
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-paypilot-brand/20 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 h-8',
    md: 'text-sm px-4 py-2 rounded-xl gap-2 h-10',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 h-11'
  };

  const variantClasses = {
    primary:
      'bg-paypilot-brand text-white hover:bg-paypilot-brandHover active:bg-paypilot-brandHover shadow-subtle',
    secondary:
      'bg-white text-paypilot-text border border-paypilot-border hover:bg-paypilot-bg active:bg-gray-100 shadow-subtle',
    subtle:
      'bg-paypilot-subtleViolet text-paypilot-brand hover:bg-violet-100 active:bg-violet-200',
    ghost:
      'text-paypilot-muted hover:text-paypilot-text hover:bg-paypilot-bg',
    danger:
      'bg-paypilot-error text-white hover:bg-red-700 active:bg-red-800'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  );
}
