import React, { useState, useEffect, useRef } from 'react';
import { ProductPlaceholder } from './ProductPlaceholder';

const FALLBACK_IMAGE = '/images/products/fallback-laptop.svg';

/**
 * ProductImage — 4-tier resilient image loader:
 * 1. product.imageUrl  (from catalog JSON / DB — exact extension, e.g. .webp or .jpg)
 * 2. /images/products/<id>.webp  (WebP variant by product id)
 * 3. /images/products/<id>.jpg   (JPEG variant by product id)
 * 4. fallback-laptop.svg → styled ProductPlaceholder
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
    if (product?.id) return `/images/products/${product.id}.webp`;
    return FALLBACK_IMAGE;
  };

  const [currentSrc, setCurrentSrc] = useState(resolveSrc);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const imgRef = useRef(null);

  // Re-resolve when product or src prop changes
  useEffect(() => {
    setCurrentSrc(resolveSrc());
    setUsePlaceholder(false);
  }, [src, product?.imageUrl, product?.id]);

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

  /**
   * Fallback chain on error:
   *   imageUrl  →  <id>.webp  →  <id>.jpg  →  fallback.svg  →  Placeholder
   */
  const handleError = () => {
    const id = product?.id;
    const webpSrc = id ? `/images/products/${id}.webp` : null;
    const jpgSrc  = id ? `/images/products/${id}.jpg`  : null;

    if (webpSrc && currentSrc !== webpSrc && currentSrc !== jpgSrc) {
      // Try the .webp variant first if we haven't yet
      setCurrentSrc(webpSrc);
    } else if (jpgSrc && currentSrc !== jpgSrc) {
      // Try the .jpg variant next
      setCurrentSrc(jpgSrc);
    } else if (currentSrc !== FALLBACK_IMAGE) {
      // Fall back to the generic SVG
      setCurrentSrc(FALLBACK_IMAGE);
    } else {
      // All options exhausted — show branded placeholder
      setUsePlaceholder(true);
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-slate-50 flex items-center justify-center ${className}`}>
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt || product?.name || 'Laptop Product'}
        loading="eager"
        decoding="async"
        onError={handleError}
        className={`${fitClasses} transition-transform duration-300 group-hover:scale-105`}
      />
    </div>
  );
}
