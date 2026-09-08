'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const KNOWN_PRODUCT_TYPES = {
  cleanser: 'Cleanser',
  exfoliant: 'Exfoliant',
  moisturizer: 'Moisturizer',
  serum: 'Serum',
  sunscreen: 'Sunscreen',
};

export default function ProductImage({ type, alt, className, ...props }) {
  const normalizedKey = (type || '').trim().toLowerCase();
  const matchedType = KNOWN_PRODUCT_TYPES[normalizedKey];
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [type]);

  if (!matchedType || hasError) {
    return (
      <div 
        className={`w-full h-full flex flex-col items-center justify-center bg-sage/10 text-sage/80 ${className || ''}`}
        aria-label={alt || type || 'Product placeholder'}
      >
        <Sparkles className="w-8 h-8 stroke-[1.5]" />
      </div>
    );
  }

  return (
    <Image
      src={`/images/products/${matchedType}.jpg`}
      alt={alt || type || 'Product'}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}