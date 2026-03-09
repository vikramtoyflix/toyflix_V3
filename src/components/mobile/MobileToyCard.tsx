import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toy } from '@/hooks/useToys';
import { ToyImage } from '@/hooks/useToyImages';
import { imageService } from '@/services/imageService';
import { cn } from '@/lib/utils';
import { Check, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getFOMOEmojiForLabel } from '@/constants/fomoSelection';

interface MobileToyCardProps {
  toy: Toy;
  preloadedImages?: ToyImage[];
  /** If true, never fetch per-card; only use preloadedImages (e.g. ToyGrid bulk load). */
  preloadedImagesFromBulk?: boolean;
  onToyAction?: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist?: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct?: (toyId: string) => void;
  isSubscriptionView?: boolean;
  isSelected?: boolean;
  showOutOfStock?: boolean;
  /** Optional FOMO tag e.g. "🔥 High Demand", "⭐ Parent Favourite", "🏆 Toyflix Bestseller" */
  tagLabel?: string;
  /** 0-3: use colored tag (amber, sky, orange, emerald) instead of black */
  tagColorIndex?: number;
  /** Staggered animation delay in ms for tag banner */
  tagAnimationDelay?: number;
}

const MobileToyCard = ({ 
  toy,
  preloadedImages,
  preloadedImagesFromBulk = false,
  onToyAction, 
  onViewProduct,
  isSubscriptionView = false,
  isSelected = false,
  showOutOfStock = false,
  tagLabel,
  tagColorIndex,
  tagAnimationDelay,
}: MobileToyCardProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(preloadedImagesFromBulk ? true : preloadedImages === undefined);

  // Use preloaded images from parent when provided
  useEffect(() => {
    if (preloadedImages !== undefined) {
      setImages(preloadedImages);
      if (preloadedImages.length > 0) {
        const primary = preloadedImages.find(img => img.is_primary) || preloadedImages[0];
        const primaryIndex = preloadedImages.findIndex(img => img.image_url === primary.image_url);
        setCurrentImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
      } else {
        setCurrentImageIndex(0);
      }
      setIsLoadingImages(false);
    } else if (preloadedImagesFromBulk) {
      setIsLoadingImages(true);
    }
  }, [preloadedImages, preloadedImagesFromBulk]);

  // When not using bulk, fetch per card
  useEffect(() => {
    if (preloadedImagesFromBulk || !toy.id) return;
    if (preloadedImages !== undefined) return;

    let cancelled = false;
    setIsLoadingImages(true);
    supabase
      .from('toy_images')
      .select('*')
      .eq('toy_id', toy.id)
      .order('display_order')
      .then(({ data: imageData, error }) => {
        if (cancelled) return;
        if (error && error.code !== 'PGRST116') console.warn('Error fetching toy images:', error);
        if (imageData?.length) {
          setImages(imageData as ToyImage[]);
          const primary = imageData.find((img: { is_primary?: boolean }) => img.is_primary) || imageData[0];
          const idx = imageData.findIndex((img: { image_url: string }) => img.image_url === primary.image_url);
          setCurrentImageIndex(idx >= 0 ? idx : 0);
        } else {
          setImages([]);
          setCurrentImageIndex(0);
        }
        setIsLoadingImages(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Mobile: Error fetching images:', err);
          setImages([]);
          setCurrentImageIndex(0);
          setIsLoadingImages(false);
        }
      });
    return () => { cancelled = true; };
  }, [toy.id, toy.name, preloadedImages, preloadedImagesFromBulk]);

  // Convert S3 URLs to public URLs
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  // Get current image URL with better error handling
  const getCurrentImageUrl = () => {
    if (imageError) return imageService.getFallbackChain('toy')[0];

    if (images.length > 0 && images[currentImageIndex]?.image_url) {
      const imageUrl = images[currentImageIndex].image_url;
      if (imageUrl.includes('/storage/v1/s3/')) return convertToPublicUrl(imageUrl);
      return imageUrl;
    }

    if (toy.image_url) return imageService.getImageUrl(toy.image_url, 'toy');
    return imageService.getFallbackChain('toy')[0];
  };

  const currentImageUrl = getCurrentImageUrl();

  // Auto-slide carousel every 3 seconds
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const newIndex = prevIndex === images.length - 1 ? 0 : prevIndex + 1;
        setImageError(false);
        setImageLoading(true);
        return newIndex;
      });
    }, 3000); // Increased to 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const handleTapSelect = (e: React.MouseEvent) => {
    if (!isSubscriptionView) {
      // Regular view - navigate to product details via modal
      onViewProduct?.(toy.id);
      return;
    }

    // Subscription view - select/deselect toy
    e.preventDefault();
    e.stopPropagation();
    onToyAction?.(toy, e);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always open modal when image is clicked
    onViewProduct?.(toy.id);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSubscriptionView && onToyAction) {
      onToyAction(toy, e);
    }
  };

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setImageLoading(true);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setImageLoading(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  return (
    <Card 
      className={cn(
        "group mobile-card h-full cursor-pointer overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-lg hover:scale-[1.02]",
        "border-0 bg-white/90 backdrop-blur-sm shadow-md",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5"
      )}
      onClick={handleTapSelect}
    >
      <CardContent className="p-0 h-full flex flex-col">
        {/* Tag badge above image - centered pill with emoji, animated (subscription view only) */}
        {isSubscriptionView && tagLabel && (
          <div className="flex justify-center pt-2 pb-1">
            <span
              style={tagAnimationDelay !== undefined ? { animationDelay: `${tagAnimationDelay}ms` } : undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md animate-in fade-in slide-in-from-top-2 duration-500",
                tagColorIndex !== undefined
                  ? [
                      "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
                      "bg-sky-100 text-sky-800 ring-1 ring-sky-200/80",
                      "bg-orange-100 text-orange-800 ring-1 ring-orange-200/80",
                      "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80",
                    ][tagColorIndex % 4]
                  : "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80"
              )}
            >
              <span className="text-sm">{getFOMOEmojiForLabel(tagLabel)}</span>
              {tagLabel.replace(/^(⭐|🏆|🔥|🚀|📚)\s*/, '')}
            </span>
          </div>
        )}

        {/* Optimized Image Section with Carousel */}
        <div className="relative flex-shrink-0 bg-gradient-to-br from-toy-sky/10 to-toy-mint/10">
          {/* Tag overlay for non-subscription view (legacy) */}
          {!isSubscriptionView && tagLabel && (
            <div className="absolute top-2 left-2 z-10">
              <span className={cn(
                "inline-flex items-center rounded-lg text-xs font-semibold px-2.5 py-1 shadow-lg",
                tagColorIndex !== undefined
                  ? [
                      "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
                      "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
                      "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
                      "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
                    ][tagColorIndex % 4]
                  : "bg-black/90 text-white ring-1 ring-white/20"
              )}>
                {tagLabel}
              </span>
            </div>
          )}
          {/* Dynamic aspect ratio container - square in subscription view to save vertical space */}
          <div className={cn(isSubscriptionView ? "aspect-square mx-2 rounded-lg overflow-hidden" : "aspect-[4/3] overflow-hidden")}>
            {/* Loading Skeleton */}
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
            )}

            {/* Dynamic Main Image - No padding for maximum size */}
            <img
              src={currentImageUrl}
              alt={toy.name}
              className={cn(
                "w-full h-full object-contain transition-transform duration-300 hover:scale-105",
                imageLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              onClick={handleImageClick}
            />

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-black/0" />
          </div>

          {/* Carousel Navigation Arrows - Always visible on mobile if multiple images */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousImage}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg 
                          opacity-70 hover:opacity-100 transition-opacity duration-300 z-10"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextImage}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg 
                          opacity-70 hover:opacity-100 transition-opacity duration-300 z-10"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Image Counter - Always visible on mobile if multiple images */}
          {images.length > 1 && !isSubscriptionView && (
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm 
                           opacity-70 hover:opacity-100 transition-opacity duration-300 z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Coming Soon Badge - Only show in subscription/order selection flows */}
          {isSubscriptionView && toy.available_quantity === 0 && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
              <span className="text-white text-sm font-bold bg-red-500 px-4 py-2 rounded-full shadow-lg">
                Coming Soon
              </span>
            </div>
          )}
        </div>
        
        {/* Compact Content Section */}
        <div className={cn("flex-1 flex flex-col", isSubscriptionView ? "p-3 pt-2" : "p-3")}>
          {/* Toy Name */}
          <h3 className={cn(
            "font-bold leading-tight line-clamp-2",
            isSubscriptionView ? "text-sm mb-1" : "text-sm mb-2 flex-1"
          )}>
            {toy.name}
          </h3>
          
          {/* Social proof (subscription) or spacing */}
          {isSubscriptionView && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-1">
              Loved by Toyflix kids
            </p>
          )}
          
          {/* Pricing Section with Strikethrough */}
          {toy.retail_price && (
            <div className={cn(
              "mb-3",
              isSubscriptionView ? "" : "text-center p-2 bg-gray-50 rounded-lg"
            )}>
              <div className={cn(
                "flex items-center gap-2 flex-wrap",
                isSubscriptionView ? "" : "justify-center"
              )}>
                <span className="text-sm font-bold text-muted-foreground line-through">
                  ₹{toy.retail_price.toLocaleString()}
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 shadow-sm">
                  Free
                </span>
              </div>
              <p className={cn(
                "font-medium text-gray-700",
                isSubscriptionView ? "text-xs mt-1" : "text-xs mt-1"
              )}>
                With subscription
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 mt-auto">
            {/* Quick Select Button for Subscription View */}
            {isSubscriptionView && (
              <Button
                onClick={handleSelectClick}
                disabled={toy.available_quantity === 0}
                className={cn(
                  "w-full transition-all duration-300 text-xs",
                  toy.available_quantity === 0
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : isSelected
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary border border-primary/20"
                )}
                size="sm"
              >
                {toy.available_quantity === 0 ? (
                  "Coming Soon"
                ) : isSelected ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Selected
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    Select
                  </>
                )}
              </Button>
            )}

            {/* Click to View Button - Opens Modal */}
            <Button
              onClick={handleImageClick}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs tracking-wider transition-all duration-300"
              size="sm"
            >
              CLICK TO VIEW
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileToyCard;
