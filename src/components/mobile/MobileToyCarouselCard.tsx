import React, { useState, useEffect } from 'react';
import { CarouselItem } from "@/components/ui/carousel";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toy } from '@/hooks/useToys';
import { imageService } from '@/services/imageService';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface MobileToyCarouselCardProps {
  toy: Toy;
  index: number;
  onViewProduct?: (toyId: string) => void;
  onAddToWishlist?: (toyId: string) => void;
  showOutOfStock?: boolean;
}

interface ToyImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const MobileToyCarouselCard = ({ 
  toy, 
  index,
  onViewProduct,
  onAddToWishlist,
  showOutOfStock = false
}: MobileToyCarouselCardProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  // Fetch toy images
  useEffect(() => {
    const fetchImages = async () => {
      if (!toy.id) return;
      
      setIsLoadingImages(true);
      try {
        const { data: imageData, error } = await supabase
          .from('toy_images')
          .select('*')
          .eq('toy_id', toy.id)
          .order('display_order');

        if (error && error.code !== 'PGRST116') {
          console.warn('Error fetching toy images:', error);
        }

        if (imageData && imageData.length > 0) {
          setImages(imageData);
          // Set primary image or first image as current
          const primaryImage = imageData.find(img => img.is_primary) || imageData[0];
          setCurrentImageIndex(imageData.findIndex(img => img.image_url === primaryImage.image_url));
        } else {
          setImages([]);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchImages();
  }, [toy.id]);

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
      if (images.length > 0) {
        const url = imageService.getImageUrl(convertToPublicUrl(images[currentImageIndex]?.image_url), 'toy');
        if (url && url.startsWith('http')) return url;
      }
      const rawImageUrl = typeof toy?.image_url === "string" ? toy.image_url : "";
      const imageUrl = imageService.getImageUrl(rawImageUrl, 'toy');
      return (imageError || !imageUrl) ? fallbackImageUrl : imageUrl;
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
  const safeRating = Number(toy?.rating) || 0;
  const safeRetailPrice = toy?.retail_price != null ? Number(toy.retail_price) : null;
  const toyId = toy?.id != null ? String(toy.id) : '';

  return (
    <CarouselItem key={toyId || `mobile-${index}`} className="pl-2 basis-4/5 md:basis-1/2 lg:basis-1/3">
      <Card 
        className={cn(
          "overflow-hidden mobile-card h-full cursor-pointer",
          `animate-fade-in animation-delay-[${index * 100}ms]`,
          "hover:shadow-lg transition-shadow duration-300"
        )}
        onClick={() => toyId && onViewProduct?.(toyId)}
      >
        <CardContent className="p-0 h-full flex flex-col">
          <div className="relative bg-gradient-to-br from-toy-sky/10 to-toy-mint/10">
            <div className="aspect-[4/3] overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              )}

              <img
                src={currentImageUrl}
                alt={safeName}
                className={cn(
                  "w-full h-full object-contain transition-transform duration-300 hover:scale-105",
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                )}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />

              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-transparent to-black/0" />
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
          <div className="p-3 flex-1 flex flex-col">
            {safeRating > 0 && (
              <div className="flex justify-end mb-2">
                <Badge className="bg-toy-sunshine/90 text-white text-xs">
                  <Star className="w-2 h-2 mr-1 fill-current" />
                  {safeRating}
                </Badge>
              </div>
            )}

            <h3 className="font-bold text-sm line-clamp-2 leading-tight mb-2">
              {safeName}
            </h3>
            
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
          </div>
        </CardContent>
      </Card>
    </CarouselItem>
  );
};

export default MobileToyCarouselCard;
