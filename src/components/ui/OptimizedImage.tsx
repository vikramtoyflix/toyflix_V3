import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { preloadImage } from '@/utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: 'square' | 'video' | 'auto';
  lazy?: boolean;
  showLoadingState?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  aspectRatio = 'auto',
  lazy = true,
  showLoadingState = true,
  fallbackSrc = '/placeholder.svg',
  onLoad,
  onError,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  quality = 80
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(!lazy || priority);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority]);

  // Preload high priority images
  useEffect(() => {
    if (priority && src) {
      preloadImage(src).catch(() => {
        console.warn(`Failed to preload priority image: ${src}`);
      });
    }
  }, [priority, src]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'video':
        return 'aspect-video';
      default:
        return '';
    }
  };

  const shouldShowImage = isIntersecting && src && !hasError;
  const showSkeleton = showLoadingState && (isLoading || (!isIntersecting && lazy && !priority));

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        getAspectRatioClass(),
        className
      )}
      style={{ width, height }}
    >
      {/* Loading skeleton */}
      {showSkeleton && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Main image */}
      {shouldShowImage && (
        <img
          ref={imgRef}
          src={hasError ? fallbackSrc : src}
          alt={alt}
          loading={lazy && !priority ? 'lazy' : 'eager'}
          decoding="async"
          sizes={sizes}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            'object-cover w-full h-full transition-opacity duration-300',
            {
              'opacity-0': isLoading && showLoadingState,
              'opacity-100': !isLoading || !showLoadingState
            }
          )}
          style={{
            willChange: isLoading ? 'opacity' : 'auto'
          }}
        />
      )}

      {/* Error state */}
      {hasError && fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <img
            src={fallbackSrc}
            alt={alt}
            className="object-cover w-full h-full opacity-50"
            onError={() => console.warn('Fallback image also failed to load')}
          />
        </div>
      )}

      {/* Progressive enhancement overlay */}
      {imageLoaded && !hasError && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10',
            'opacity-0 hover:opacity-100 transition-opacity duration-200'
          )}
        />
      )}
    </div>
  );
};

export default OptimizedImage; 