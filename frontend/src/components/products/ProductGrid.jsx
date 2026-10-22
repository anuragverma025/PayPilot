import React from 'react';
import { SearchX, RefreshCcw } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from '../common/Skeleton';
import { Button } from '../common/Button';

export function ProductGrid({
  products,
  loading,
  error,
  onRetry,
  onResetFilters,
  onViewDetails,
  onToggleCompare,
  onProceedToOrder,
  comparedIds = []
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-paypilot-errorBg border border-paypilot-error/20 rounded-2xl p-8 text-center space-y-3">
        <h3 className="text-base font-semibold text-paypilot-error">
          Failed to load catalog products
        </h3>
        <p className="text-sm text-paypilot-muted max-w-md mx-auto">{error}</p>
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={onRetry} icon={RefreshCcw}>
            Retry Request
          </Button>
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="bg-white border border-paypilot-border rounded-2xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-paypilot-bg text-paypilot-muted mx-auto flex items-center justify-center">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-paypilot-text">
            No matching laptops found
          </h3>
          <p className="text-xs text-paypilot-muted max-w-sm mx-auto">
            Try adjusting your budget limit, clearing the brand filter, or relaxing minimum RAM requirements.
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={onResetFilters}>
          Clear All Filters
        </Button>
      </div>
    );
  }

  const isCompareFull = comparedIds.length >= 3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onViewDetails={onViewDetails}
          onToggleCompare={onToggleCompare}
          onProceedToOrder={onProceedToOrder}
          isCompared={comparedIds.includes(product.id)}
          compareDisabled={isCompareFull}
        />
      ))}
    </div>
  );
}
