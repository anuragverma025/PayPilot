import React, { useState } from 'react';
import { ProductPlaceholder } from './ProductPlaceholder';

/**
 * ProductImage component with resilient error fallback
 * - Displays high-resolution laptop photography with object-fit: cover
 * - Smooth opacity transition on load to prevent flash of unstyled content
 * - Automatically catches load failures (404, network error, offline) via onError
 * - Gracefully renders the branded ProductPlaceholder without broken-image icons or loops
 */
export function ProductImage({
  product,
  src,
  alt,
  className = '',
  variant = 'card',
  fit = 'contain'
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Verify image authenticity: if product has hasVerifiedImage: false or no imageUrl, route directly to placeholder
  const isImageVerified = product ? product.hasVerifiedImage !== false : true;
  const imageSrc = src !== undefined ? src : (isImageVerified ? product?.imageUrl : null);

  // If no verified source is provided or the image failed to load, render the clean branded placeholder
  if (!imageSrc || hasError) {
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
        src={imageSrc}
        alt={alt || product?.name || 'Laptop Product'}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          // Permanently transition to error state to prevent infinite retry loops
          setHasError(true);
        }}
        className={`${fitClasses} transition-all duration-300 group-hover:scale-105 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
