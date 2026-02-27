import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveAdminImageProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fallbackUrl?: string;
  className?: string;
  onError?: () => void;
}

export const ResponsiveAdminImage: React.FC<ResponsiveAdminImageProps> = ({
  src,
  alt,
  size = 'sm',
  fallbackUrl = "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400",
  className,
  onError
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Convert S3 URLs to public URLs (same logic as other components)
  const convertToPublicUrl = (url: string): string => {
    if (!url) return fallbackUrl;
    
    // Simple URL conversion: replace s3 path with public path
    if (url.includes('/storage/v1/s3/')) {
      return url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
    }
    
    return url;
  };

  const sizeClasses = {
    xs: 'w-6 h-6 sm:w-8 sm:h-8',
    sm: 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
    md: 'w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16',
    lg: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const imageSrc = imageError ? fallbackUrl : convertToPublicUrl(src || fallbackUrl);

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border bg-muted transition-all duration-200 hover:shadow-md group',
      sizeClasses[size],
      className
    )}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-transform duration-200 group-hover:scale-110',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
      
      {/* Optional overlay for interactive states */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
    </div>
  );
}; 