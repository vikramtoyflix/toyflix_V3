import { Card, CardContent } from "@/components/ui/card";
import { CarouselItem } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toy } from "@/hooks/useToys";
import { ToyImage } from "@/hooks/useToyImages";
import { imageService } from "@/services/imageService";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  Star, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface ToyCarouselCardProps {
  toy: Toy;
  index: number;
  preloadedImages?: ToyImage[];
  onViewProduct?: (toyId: string) => void;
  onAddToWishlist?: (toyId: string) => void;
  onAddToCart?: (toy: Toy) => void;
  showOutOfStock?: boolean;
}

const ToyCarouselCard = ({ 
  toy, 
  index,
  preloadedImages,
  onViewProduct,
  onAddToWishlist,
  onAddToCart,
  showOutOfStock = false
}: ToyCarouselCardProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(!preloadedImages);

  // Use preloaded images if available, otherwise skip individual fetch
  useEffect(() => {
    if (preloadedImages !== undefined) {
      setImages(preloadedImages);
      if (preloadedImages.length > 0) {
        const primary = preloadedImages.find(img => img.is_primary) || preloadedImages[0];
        setCurrentImageIndex(preloadedImages.findIndex(img => img.image_url === primary.image_url));
      }
      setIsLoadingImages(false);
    }
  }, [preloadedImages]);

  // Auto-slide carousel every 2 seconds
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const newIndex = prevIndex === images.length - 1 ? 0 : prevIndex + 1;
        setImageError(false);
        setIsImageLoading(true);
        return newIndex;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Convert S3 URLs to public URLs
  const convertToPublicUrl = (s3Url: unknown): string => {
    if (typeof s3Url !== "string" || s3Url.trim() === "") {
      return "";
    }
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  const fallbackImageUrl = imageService.getFallbackChain('toy')[0] ?? '';

  const getCurrentImageUrl = (): string => {
    try {
      if (imageError) return fallbackImageUrl;
      if (images.length > 0) {
        const url = convertToPublicUrl(images[currentImageIndex]?.image_url);
        if (url && url.startsWith('http')) return url;
      }
      const rawImageUrl = typeof toy?.image_url === "string" ? toy.image_url : "";
      const imageUrl = imageService.getImageUrl(rawImageUrl, 'toy');
      return imageUrl || fallbackImageUrl;
    } catch {
      return fallbackImageUrl;
    }
  };

  const currentImageUrl = getCurrentImageUrl() || fallbackImageUrl;



  const handleImageLoad = () => setIsImageLoading(false);
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

  const safeName = typeof toy?.name === 'string' ? toy.name : 'Toy';
  const safeDescription = typeof toy?.description === 'string' ? toy.description : 'A wonderful toy designed to spark imagination and create lasting memories!';
  const safeRating = Number(toy?.rating) || 0;
  const safeRetailPrice = toy?.retail_price != null ? Number(toy.retail_price) : null;
  const toyId = toy?.id != null ? String(toy.id) : '';

  return (
    <CarouselItem key={toyId || `card-${index}`} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
      <Card 
        className={cn(
          "h-full group cursor-pointer overflow-hidden",
          "transition-all duration-500 ease-out",
          "hover:shadow-2xl hover:-translate-y-3 hover:scale-[1.02]",
          "border-0 bg-white/90 backdrop-blur-sm shadow-lg",
          "animate-fade-in-up",
          isHovered && "shadow-xl"
        )}
        style={{ animationDelay: `${index * 0.1}s` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => toyId && onViewProduct?.(toyId)}
      >
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative bg-gradient-to-br from-toy-sky/10 to-toy-mint/10">
            <div className="aspect-[4/3] overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              )}

              <img
                key={imageError ? `${toy.id}-fallback` : toy.id}
                src={currentImageUrl}
                alt={safeName}
                className={cn(
                  "w-full h-full object-contain transition-all duration-700",
                  "group-hover:scale-105 group-hover:brightness-110",
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />

              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-black/0 group-hover:from-black/5 transition-all duration-500" />
            </div>

            {/* Carousel Navigation Arrows - Only show if there are multiple images */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousImage}
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextImage}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </>
            )}

            {/* Image Counter - Only show if there are multiple images */}
            {images.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Out of Stock Overlay */}
            {/* Out of Stock removed - only shown in subscription flows */}
          </div>

          {/* Compact Content Section */}
          <div className="p-3 md:p-4 flex-grow flex flex-col">
            {safeRating > 0 && (
              <div className="flex justify-end mb-2">
                <Badge className="bg-toy-sunshine/90 text-white text-xs font-semibold shadow-sm">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {safeRating}
                </Badge>
              </div>
            )}

            <h3 className="font-bold text-sm md:text-base mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300">
              {safeName}
            </h3>

            <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed flex-grow">
              {safeDescription}
            </p>

            {safeRetailPrice != null && safeRetailPrice > 0 && (
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground line-through">
                  MRP: ₹{Number(safeRetailPrice).toLocaleString()}
                </p>
                <div className="bg-green-50 px-2 py-1 rounded-full inline-block border border-green-200 mt-1">
                  <p className="text-xs font-bold text-green-600">
                    🎉 Free with subscription
                  </p>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-auto">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddToCart) {
                    onAddToCart(toy);
                  } else {
                    // Default subscription action - redirect to auth
                    const subscriptionFlowUrl = '/subscription-flow';
                    window.location.href = `/auth?redirect=${encodeURIComponent(subscriptionFlowUrl)}`;
                  }
                }}
                className="w-full bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white font-semibold transition-all duration-300 hover:scale-105"
                size="sm"
              >
                Subscribe Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </CarouselItem>
  );
};

export default ToyCarouselCard;
