import React, { useState, useEffect } from "react";
import { Toy } from "@/hooks/useToys";
import { imageService } from "@/services/imageService";
import { cn } from "@/lib/utils";
import { Star, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ToyImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface FeaturedToysOverlapCardProps {
  toy: Toy;
  index: number;
  onViewProduct?: (toyId: string) => void;
  onSubscribe?: (toyId: string) => void;
}

/** Banner colors alternating green and orange like Premium Toy Rental design */
const BANNER_COLORS = [
  "bg-emerald-500",   // green
  "bg-orange-500",    // orange
];

const FeaturedToysOverlapCard = ({
  toy,
  index,
  onViewProduct,
  onSubscribe,
}: FeaturedToysOverlapCardProps) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      if (!toy.id) return;
      try {
        const { data: imageData } = await supabase
          .from("toy_images")
          .select("*")
          .eq("toy_id", toy.id)
          .order("display_order");

        if (imageData && imageData.length > 0) {
          setImages(imageData);
          const primary = imageData.find((img) => img.is_primary) || imageData[0];
          setCurrentImageIndex(imageData.findIndex((img) => img.image_url === primary.image_url));
        }
      } catch {
        setImages([]);
      }
    };
    fetchImages();
  }, [toy.id]);

  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    return s3Url.replace("/storage/v1/s3/", "/storage/v1/object/public/");
  };

  const getCurrentImageUrl = () => {
    if (images.length > 0) {
      return imageService.getImageUrl(convertToPublicUrl(images[currentImageIndex]?.image_url), "toy");
    }
    const imageUrl = imageService.getImageUrl(toy.image_url, "toy");
    const fallbackUrl = imageService.getFallbackChain("toy")[0];
    return imageError ? fallbackUrl : imageUrl;
  };

  const rating = toy.rating || 4.9;
  const bannerColor = BANNER_COLORS[index % BANNER_COLORS.length];

  const handleSubscribe = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSubscribe?.(toy.id);
  };

  return (
    <div
      onClick={() => onViewProduct?.(toy.id)}
      className={cn(
        "relative w-[240px] sm:w-[280px] lg:w-[320px] rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:z-30 flex-shrink-0",
        "bg-white border border-black/5",
        index % 3 === 0 && "-rotate-3",
        index % 3 === 1 && "rotate-3 -ml-6 sm:-ml-10 lg:-ml-12",
        index % 3 === 2 && "rotate-[-2deg] -ml-6 sm:-ml-10 lg:-ml-12"
      )}
      style={{ zIndex: 10 + index }}
    >
      {/* Image section */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-toy-sky/10 to-toy-mint/10">
        {isImageLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        )}
        <img
          src={getCurrentImageUrl()}
          alt={toy.name}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300",
            isImageLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsImageLoading(false)}
          onError={() => {
            setImageError(true);
            setIsImageLoading(false);
          }}
          loading="lazy"
        />

        {/* Rating badge - top right */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm flex items-center gap-1">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-semibold text-sm text-warm-gray">{rating}</span>
        </div>
      </div>

      {/* Colored banner - Free with subscription + Subscribe to Rent */}
      <div className={cn("p-4 text-white", bannerColor)}>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-white/90" />
          <span className="text-sm font-medium">Free with subscription</span>
        </div>
        <button
          onClick={handleSubscribe}
          className="w-full py-2.5 rounded-xl bg-white text-warm-gray font-semibold text-sm border-2 border-white/30 hover:bg-white/95 transition-colors"
        >
          Subscribe to Rent
        </button>
      </div>
    </div>
  );
};

export default FeaturedToysOverlapCard;
