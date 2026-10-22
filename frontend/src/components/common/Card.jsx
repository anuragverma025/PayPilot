import React from 'react';

export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-paypilot-surface border border-paypilot-border rounded-2xl shadow-card transition-all duration-200 ${
        hover ? 'hover:shadow-elevated hover:border-gray-300 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
