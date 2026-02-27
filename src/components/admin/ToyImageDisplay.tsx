import React, { useState } from 'react';
import { useToyImages, useToyPrimaryImage } from '@/hooks/useInventoryManagement';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { imageService } from '@/services/imageService';

interface ToyImageDisplayProps {
  toyId: string;
  toyName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  showImageCount?: boolean;
  allowPreview?: boolean;
  className?: string;
  responsive?: boolean; // New prop for responsive behavior
}

export const ToyImageDisplay: React.FC<ToyImageDisplayProps> = ({
  toyId,
  toyName,
  size = 'sm',
  showImageCount = true,
  allowPreview = true,
  className,
  responsive = true
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  const { data: images = [], isLoading: imagesLoading } = useToyImages(toyId);
  const { data: primaryImage, isLoading: primaryLoading } = useToyPrimaryImage(toyId);

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20',
    xl: 'w-24 h-24',
    auto: 'w-full h-full min-w-[2rem] min-h-[2rem]' // Dynamic sizing
  };

  // Responsive size classes for different breakpoints
  const responsiveClasses = responsive ? {
    xs: 'w-6 h-6 sm:w-8 sm:h-8',
    sm: 'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12',
    md: 'w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16',
    lg: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
    auto: 'w-full h-full min-w-[1.5rem] min-h-[1.5rem] max-w-[6rem] max-h-[6rem]'
  } : sizeClasses;

  // Use optimized image service to reduce egress
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return '/placeholder.svg';
    
    console.log('🔍 ToyImageDisplay converting URL:', s3Url);
    
    // Handle blob URLs (from file upload preview)
    if (s3Url.startsWith('blob:')) {
      console.log('✅ Using blob URL for preview:', s3Url);
      return s3Url;
    }
    
    // Simple URL conversion: replace s3 path with public path first
    let publicUrl = s3Url;
    if (s3Url.includes('/storage/v1/s3/')) {
      publicUrl = s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
      console.log('🔗 Converted S3 to public:', publicUrl);
    }
    
    // If it's not a full URL, make it one (but check it doesn't already have domain)
    if (!publicUrl.startsWith('http') && publicUrl.includes('storage/v1/object/public/')) {
      publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/${publicUrl.startsWith('/') ? publicUrl.substring(1) : publicUrl}`;
    }
    
    // If it's not already a full URL but looks like a filename, construct the full URL
    if (!publicUrl.startsWith('http') && !publicUrl.startsWith('/')) {
      publicUrl = `https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/${publicUrl}`;
    }
    
    // Return the public URL directly (optimization temporarily disabled to fix broken images)
    console.log('🚀 Using direct public URL:', publicUrl);
    return publicUrl;
  };

  const displayImage = primaryImage || images[0]?.image_url || '/placeholder.svg';
  const imageCount = images.length;

  if (imagesLoading || primaryLoading) {
    return (
      <div className={cn(
        'bg-muted animate-pulse rounded-md',
        responsive ? responsiveClasses[size] : sizeClasses[size],
        className
      )} />
    );
  }

  return (
    <>
      <div className={cn('relative group', className)}>
        <div className={cn(
          'relative overflow-hidden rounded-md border bg-muted transition-all duration-200',
          responsive ? responsiveClasses[size] : sizeClasses[size],
          'hover:shadow-md hover:scale-105'
        )}>
          {!imageError ? (
            <img
              src={convertToPublicUrl(displayImage)}
              alt={toyName}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className={cn(
                'text-muted-foreground',
                size === 'xs' ? 'w-3 h-3' :
                size === 'sm' ? 'w-4 h-4' :
                size === 'md' ? 'w-5 h-5' :
                size === 'lg' ? 'w-6 h-6' :
                size === 'xl' ? 'w-8 h-8' : 'w-4 h-4'
              )} />
            </div>
          )}
          
          {/* Image count badge - responsive sizing */}
          {showImageCount && imageCount > 1 && (
            <Badge 
              variant="secondary" 
              className={cn(
                'absolute bottom-1 right-1 px-1 py-0 font-medium',
                size === 'xs' ? 'text-[10px] h-4' :
                size === 'sm' ? 'text-xs h-5' :
                'text-xs h-5'
              )}
            >
              {imageCount}
            </Badge>
          )}
          
          {/* Preview button on hover - only show on larger sizes */}
          {allowPreview && imageCount > 0 && size !== 'xs' && (
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                'absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white border-0',
                'flex items-center justify-center'
              )}
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className={cn(
                size === 'sm' ? 'w-3 h-3' :
                size === 'md' ? 'w-4 h-4' :
                'w-5 h-5'
              )} />
            </Button>
          )}
        </div>
      </div>

      {/* Image Preview Dialog */}
      {allowPreview && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                {toyName} - Images ({imageCount})
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {imageCount > 0 ? (
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative">
                  <img
                    src={convertToPublicUrl(images[selectedImageIndex]?.image_url || displayImage)}
                    alt={`${toyName} - Image ${selectedImageIndex + 1}`}
                    className="w-full max-h-96 object-contain rounded-lg border"
                  />
                  {images[selectedImageIndex]?.is_primary && (
                    <Badge className="absolute top-2 left-2">Primary</Badge>
                  )}
                </div>
                
                {/* Thumbnail Navigation */}
                {imageCount > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        className={cn(
                          'flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all',
                          selectedImageIndex === index 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-muted hover:border-primary/50'
                        )}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img
                          src={convertToPublicUrl(image.image_url)}
                          alt={`${toyName} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Image Info */}
                <div className="text-sm text-muted-foreground">
                  Image {selectedImageIndex + 1} of {imageCount}
                  {images[selectedImageIndex] && (
                    <span className="ml-2">
                      • Order: {images[selectedImageIndex].display_order}
                      {images[selectedImageIndex].is_primary && ' • Primary'}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No images available for this toy</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}; 