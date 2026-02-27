import { useState, useEffect } from "react";
import { imageService } from "@/services/imageService";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImageGalleryProps {
  toyId: string;
  toyName: string;
  fallbackImageUrl?: string | null;
}

interface ToyImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const ProductImageGallery = ({ toyId, toyName, fallbackImageUrl }: ProductImageGalleryProps) => {
  const [images, setImages] = useState<ToyImage[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const { data: imageData, error } = await supabase
          .from('toy_images')
          .select('*')
          .eq('toy_id', toyId)
          .order('display_order');

        if (error && error.code !== 'PGRST116') {
          console.warn('Error fetching toy images:', error);
        }

        if (imageData && imageData.length > 0) {
          setImages(imageData);
          // Set primary image or first image as main
          const primaryImage = imageData.find(img => img.is_primary) || imageData[0];
          setMainImage(primaryImage.image_url);
          setCurrentImageIndex(imageData.findIndex(img => img.image_url === primaryImage.image_url));
        } else if (fallbackImageUrl) {
          // Use fallback single image
          setMainImage(fallbackImageUrl);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        if (fallbackImageUrl) {
          setMainImage(fallbackImageUrl);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (toyId) {
      fetchImages();
    }
  }, [toyId, fallbackImageUrl]);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleThumbnailClick = (imageUrl: string, index: number) => {
    if (imageUrl !== mainImage) {
      setMainImage(imageUrl);
      setCurrentImageIndex(index);
      setImageError(false);
      setIsLoading(true);
    }
  };

  const handlePreviousImage = () => {
    if (images.length > 1) {
      const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      const newImage = images[newIndex];
      setMainImage(newImage.image_url);
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsLoading(true);
    }
  };

  const handleNextImage = () => {
    if (images.length > 1) {
      const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      const newImage = images[newIndex];
      setMainImage(newImage.image_url);
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsLoading(true);
    }
  };

  // Convert S3 URLs to public URLs
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    // Convert from S3 format to public format
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  const mainImageSrc = imageService.getImageUrl(
    convertToPublicUrl(mainImage || fallbackImageUrl), 'product'
  );
  const fallbackSrc = imageService.getFallbackChain('product')[0];
  const displaySrc = imageError ? fallbackSrc : mainImageSrc;

  // Show all images in thumbnails
  const allImages = images.length > 0 ? images : [];

  return (
    <div className={`space-y-${isMobile ? '3' : '4'}`}>
      {/* Main Image with Navigation */}
      <div className={`aspect-square overflow-hidden rounded-lg border relative bg-muted ${
        isMobile ? 'max-h-80' : ''
      }`}>
        {isLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
        <img
          src={displaySrc}
          alt={toyName}
          className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
        />

        {/* Navigation Arrows - Only show if there are multiple images */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 p-0 shadow-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 backdrop-blur-sm rounded-full w-8 h-8 p-0 shadow-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
            {currentImageIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* All Thumbnails Gallery */}
      {allImages.length > 0 && (
        <div className={`flex gap-${isMobile ? '2' : '2'} ${isMobile ? 'overflow-x-auto pb-2' : 'flex-wrap'}`}>
          {allImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => handleThumbnailClick(img.image_url, index)}
              className={`${
                isMobile ? 'w-16 h-16 min-w-16' : 'w-20 h-20'
              } rounded-md border-2 overflow-hidden flex-shrink-0 ${
                mainImage === img.image_url ? "border-primary" : "border-muted"
              } hover:border-primary/50 transition-colors`}
            >
              <img
                src={imageService.getImageUrl(convertToPublicUrl(img.image_url), 'toy')}
                alt={`${toyName} view ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => { 
                  e.currentTarget.src = imageService.getFallbackChain('toy')[0]; 
                }}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fallback for toys with no images in toy_images table */}
      {allImages.length === 0 && fallbackImageUrl && (
        <div className="text-center text-sm text-muted-foreground">
          <p>Single image view</p>
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
