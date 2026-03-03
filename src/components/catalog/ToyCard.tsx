import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toy } from '@/hooks/useToys';
import { ToyImage } from '@/hooks/useToyImages';
import { imageService } from '@/services/imageService';
import { cn } from '@/lib/utils';
import { 
  Star, 
  Plus, 
  Check, 
  Sparkles,
  ShoppingCart,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ToyCardProps {
  toy: Toy;
  preloadedImages?: ToyImage[];
  onToyAction?: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist?: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct?: (toyId: string) => void;
  isSubscriptionView?: boolean;
  isSelected?: boolean;
  showOutOfStock?: boolean;
}

const ToyCard = ({ 
  toy,
  preloadedImages,
  onToyAction, 
  onAddToWishlist, 
  onViewProduct,
  isSubscriptionView = false,
  isSelected = false,
  showOutOfStock = false
}: ToyCardProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(!preloadedImages);

  // Use preloaded images from parent — no per-card DB query
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
    }
  }, [preloadedImages]);

  // Convert S3 URLs to public URLs
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  // When image failed to load, always show placeholder so no blank box
  const getCurrentImageUrl = () => {
    if (imageError) return imageService.getFallbackChain('toy')[0];

    if (images.length > 0 && images[currentImageIndex]?.image_url) {
      const imageUrl = images[currentImageIndex].image_url;
      if (imageUrl.includes('/storage/v1/s3/')) return convertToPublicUrl(imageUrl);
      return imageService.getImageUrl(imageUrl, 'toy');
    }
    if (toy.image_url) return imageService.getImageUrl(toy.image_url, 'toy');
    return imageService.getFallbackChain('toy')[0];
  };

  const currentImageUrl = getCurrentImageUrl();

  // Auto-slide carousel every 3 seconds (increased for better UX)
  useEffect(() => {
    if (images.length <= 1 || isHovered) return; // Pause on hover

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const newIndex = prevIndex === images.length - 1 ? 0 : prevIndex + 1;
        setImageError(false);
        setIsImageLoading(true);
        return newIndex;
      });
    }, 3000); // Increased to 3 seconds

    return () => clearInterval(interval);
  }, [images.length, isHovered]);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };
  
  const handleImageError = () => {
    setImageError(true);
    setIsImageLoading(false);
  };

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsImageLoading(true);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsImageLoading(true);
    }
  };

  const handleCardClick = () => {
    // Only for non-subscription views, allow card click to navigate
    if (!isSubscriptionView) {
      onViewProduct?.(toy.id);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Always open modal when image is clicked
    onViewProduct?.(toy.id);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewProduct?.(toy.id);
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToyAction?.(toy, e);
  };

  return (
    <Card 
      className={cn(
        "group h-full flex flex-col overflow-hidden",
        "transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02]",
        "border-0 bg-white/90 backdrop-blur-sm",
        "shadow-lg hover:shadow-primary/20",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-primary/30",
        isHovered && "shadow-xl",
        !isSubscriptionView && "cursor-pointer"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Optimized Image Section with Carousel */}
      <div 
        className="relative bg-gradient-to-br from-toy-sky/10 to-toy-mint/10 cursor-pointer"
        onClick={handleImageClick}
      >
        {/* Dynamic aspect ratio container */}
        <div className="aspect-[4/3] w-full overflow-hidden">
          {/* Loading Skeleton */}
          {isImageLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          )}
          
          {/* Dynamic Main Image - key forces remount when switching to fallback */}
          <img
            key={imageError ? `${toy.id}-fallback` : toy.id}
            src={currentImageUrl}
            alt={toy.name}
            className={cn(
              "w-full h-full object-contain transition-all duration-500",
              "group-hover:scale-105 group-hover:brightness-110",
              isImageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />

          {/* Carousel Navigation Arrows - Show on hover for desktop, always visible on mobile if multiple images */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousImage}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg 
                          opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextImage}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg 
                          opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Image Counter - Show on hover for desktop, always visible on mobile if multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm 
                           opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Out of Stock Badge - Only show in subscription/order selection flows */}
          {isSubscriptionView && toy.available_quantity === 0 && (
            <Badge
              variant="destructive"
              className="absolute top-2 left-2 text-xs font-bold z-20 bg-red-500/90 text-white shadow-md"
            >
              Out of Stock
            </Badge>
          )}
        </div>
      </div>

      {/* Compact Content Section */}
      <CardContent className="p-3 flex-grow flex flex-col">
        {/* Rating Badge - Keep only rating if exists */}
        {toy.rating > 0 && (
          <div className="flex justify-end mb-2">
            <Badge className="bg-toy-sunshine/90 text-white text-xs font-semibold shadow-sm">
              <Star className="w-3 h-3 mr-1 fill-current" />
              {toy.rating}
            </Badge>
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-base mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">
          {toy.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed flex-grow">
          {toy.description || "A wonderful toy designed to spark imagination and create lasting memories!"}
        </p>

        {/* Compact Pricing Section */}
        {toy.retail_price && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground line-through">
                ₹{toy.retail_price}
              </span>
              <Badge className="bg-green-100 text-green-700 text-xs font-medium">
                Free
              </Badge>
            </div>
            <p className="text-xs font-semibold text-primary">
              With subscription
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          {isSubscriptionView ? (
            <>
              {/* Main Select Button */}
              <Button 
                onClick={(e) => handleSelectClick(e)}
                disabled={toy.available_quantity === 0}
                className={cn(
                  "w-full transition-all duration-300 text-sm font-medium",
                  toy.available_quantity === 0
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : isSelected 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary border border-primary/20"
                )}
                size="sm"
              >
                {toy.available_quantity === 0 ? (
                  <>
                    Out of Stock
                  </>
                ) : isSelected ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Selected
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Select Toy
                  </>
                )}
              </Button>

              {/* Click to View Button - Always enabled so users can see toy details */}
              <Button
                onClick={(e) => handleViewClick(e)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm tracking-wider transition-all duration-300"
                size="sm"
              >
                CLICK TO VIEW
              </Button>
            </>
          ) : (
            <>
              {/* Non-subscription view buttons - Always show Subscribe Now */}
              <Button 
                onClick={(e) => handleSelectClick(e)}
                className="w-full font-semibold transition-all duration-300 hover:scale-105 bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Subscribe Now
              </Button>

              {/* Click to View Button for non-subscription too */}
              <Button
                onClick={(e) => handleViewClick(e)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm tracking-wider transition-all duration-300"
                size="sm"
              >
                CLICK TO VIEW
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ToyCard;
