import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, CheckCircle } from "lucide-react";
import { useState } from "react";
import { imageService } from "@/services/imageService";
import { Skeleton } from "@/components/ui/skeleton";

interface ToyCardImageProps {
  toy: {
    id: string;
    name: string;
    image_url: string | null;
    available_quantity: number;
  };
  onAddToWishlist: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct: (toyId: string) => void;
  isSubscriptionView?: boolean;
  showOutOfStock?: boolean;
}

const ToyCardImage = ({ 
  toy, 
  onAddToWishlist, 
  onViewProduct, 
  isSubscriptionView = false,
  showOutOfStock = false
}: ToyCardImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use original logic - the image_url field now contains the new S3 URLs
  const imageUrl = imageService.getImageUrl(toy.image_url, 'toy');
  const fallbackUrl = imageService.getFallbackChain('toy')[0];
  const finalImageUrl = imageError ? fallbackUrl : imageUrl;

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };
  
  return (
    <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="aspect-square sm:aspect-[4/3] md:aspect-square">
        {isLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
        <img
          src={finalImageUrl}
          alt={toy.name}
          className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
          decoding="async"
        />
      </div>
      
      <div className={`absolute inset-0 transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-background/80 hover:bg-background w-6 h-6 sm:w-8 sm:h-8 p-0"
          onClick={(e) => onAddToWishlist(toy.id, e)}
        >
          <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-background/80 hover:bg-background w-6 h-6 sm:w-8 sm:h-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onViewProduct(toy.id);
          }}
        >
          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
        {isSubscriptionView && toy.available_quantity === 0 && (
          <Badge className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 text-xs" variant="destructive">
            Coming Soon
          </Badge>
        )}
        {isSubscriptionView && (
          <Badge className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-green-500 text-white text-xs">
            <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">Included</span>
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ToyCardImage;
