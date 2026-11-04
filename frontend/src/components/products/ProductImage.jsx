import React, { useState, useEffect } from 'react';
import { ProductPlaceholder } from './ProductPlaceholder';

const FALLBACK_IMAGE = '/images/products/fallback-laptop.svg';

/**
 * ProductImage component with multi-tier resilient error fallback:
 * 1. Primary: local downloaded laptop image (/images/products/<id>.jpg)
 * 2. Fallback: dedicated fallback laptop vector illustration (/images/products/fallback-laptop.svg)
 * 3. Final safety net: branded ProductPlaceholder
 */
export function ProductImage({
  product,
  src,
  alt,
  className = '',
  variant = 'card',
  fit = 'contain'
}) {
  const initialSrc = src !== undefined
    ? src
    : (product && product.hasVerifiedImage !== false && product.imageUrl ? product.imageUrl : FALLBACK_IMAGE);

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Synchronize when product or src prop changes
  useEffect(() => {
    const nextSrc = src !== undefined
      ? src
      : (product && product.hasVerifiedImage !== false && product.imageUrl ? product.imageUrl : FALLBACK_IMAGE);
    setCurrentSrc(nextSrc);
    setUsePlaceholder(false);
    setIsLoaded(false);
  }, [src, product?.imageUrl, product?.hasVerifiedImage]);

  // If fallback failed or explicitly requested
  if (usePlaceholder || !currentSrc) {
    return (
      <ProductPlaceholder
        product={product}
        variant={variant}
        className={className}
      />
    );
  }

  const fitClasses = fit === 'contain'
    ? 'object-contain max-h-full max-w-full p-2.5'
    : 'object-cover w-full h-full';

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-50 flex items-center justify-center ${className}`}>
      {/* Subtle loader skeleton while image is downloading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200/80 animate-pulse flex items-center justify-center">
          <ProductPlaceholder product={product} variant={variant} className="opacity-30" />
        </div>
      )}

      {/* Product Photograph */}
      <img
        src={currentSrc}
        alt={alt || product?.name || 'Laptop Product'}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (currentSrc !== FALLBACK_IMAGE) {
            // First failure: switch to local fallback laptop SVG
            setCurrentSrc(FALLBACK_IMAGE);
            setIsLoaded(false);
          } else {
            // Second failure: fallback itself failed, render styled placeholder
            setUsePlaceholder(true);
          }
        }}
        className={`${fitClasses} transition-all duration-300 group-hover:scale-105 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
