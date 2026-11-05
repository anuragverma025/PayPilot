import React, { useState, useEffect, useRef } from 'react';
import { ProductPlaceholder } from './ProductPlaceholder';

const FALLBACK_IMAGE = '/images/products/fallback-laptop.svg';

/**
 * ProductImage component with multi-tier resilient error fallback:
 * 1. Primary: product.imageUrl or direct local image (/images/products/<id>.jpg)
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
  const resolveSrc = () => {
    if (src) return src;
    if (product?.imageUrl) return product.imageUrl;
    if (product?.id) return `/images/products/${product.id}.jpg`;
    return FALLBACK_IMAGE;
  };

  const [currentSrc, setCurrentSrc] = useState(resolveSrc);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const imgRef = useRef(null);

  // Synchronize when product or src prop changes
  useEffect(() => {
    setCurrentSrc(resolveSrc());
    setUsePlaceholder(false);
  }, [src, product?.imageUrl, product?.id]);

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
      {/* Product Photograph with eager rendering and auto-fallback */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt || product?.name || 'Laptop Product'}
        loading="eager"
        decoding="async"
        onError={() => {
          if (product?.id && currentSrc !== `/images/products/${product.id}.jpg`) {
            setCurrentSrc(`/images/products/${product.id}.jpg`);
          } else if (currentSrc !== FALLBACK_IMAGE) {
            setCurrentSrc(FALLBACK_IMAGE);
          } else {
            setUsePlaceholder(true);
          }
        }}
        className={`${fitClasses} transition-transform duration-300 group-hover:scale-105`}
      />
    </div>
  );
}
