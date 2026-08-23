"use client";

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackCategory?: string;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackCategory,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-[#011D46] animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasError ? (
        <div className="w-full h-full bg-[#011D46] border border-[#D69E25]/30 flex flex-col items-center justify-center p-4 text-center space-y-1 text-slate-400">
          <ImageOff className="w-6 h-6 text-[#D69E25]/60" />
          <span className="text-[10px] font-bold text-slate-300 truncate max-w-full px-2">
            {alt || fallbackCategory || 'Aperçu non disponible'}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          {...props}
        />
      )}
    </div>
  );
};
