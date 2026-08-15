'use client'
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function ProductImage({type, alt, className, ...props}){
    const [src, setSrc] = useState(`/images/products/${type || 'Moisturizer'}.jpg`);
    
    useEffect(() => {
        setSrc(`/images/products/${type || 'Moisturizer'}.jpg`);
    }, [type]);

    const handleError = () =>{
        if (src !== '/images/products/Moisturizer.jpg') {
            setSrc('/images/products/Moisturizer.jpg');
        }
    }
    return (
    <Image
      src={src}
      alt={alt || type || 'Product'}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className}
      onError={handleError}
      {...props}
    />
  );
}