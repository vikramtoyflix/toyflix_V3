import React, { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // Load immediately for critical images
  placeholder?: string; // Placeholder image while loading
  fallback?: string; // Fallback image if main image fails
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  blur?: boolean; // Show blur effect while loading
}

const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  priority = false,
  placeholder,
  fallback = '/placeholder.svg',
  objectFit = 'cover',
  blur = true,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Stop observing once loaded
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(e);
  };

  const imageStyles = {
    objectFit,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
  };

  return (
    <div 
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={width && height ? { width: `${width}px`, height: `${height}px` } : undefined}
    >
      {/* Placeholder/blur background */}
      {!isLoaded && !hasError && (
        <div 
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            blur && 'backdrop-blur-sm',
            'flex items-center justify-center'
          )}
        >
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
              style={imageStyles}
            />
          ) : (
            <div className="w-8 h-8 bg-muted-foreground/20 rounded animate-pulse" />
          )}
        </div>
      )}

      {/* Main image */}
      {(isInView || priority) && (
        <img
          src={hasError ? fallback : src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            'w-full h-full'
          )}
          style={imageStyles}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 bg-muted-foreground/20 rounded" />
            <span className="text-xs">Image unavailable</span>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage; 