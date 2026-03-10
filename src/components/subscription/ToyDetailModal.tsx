import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Heart, 
  Check, 
  Plus,
  Baby,
  Users,
  GraduationCap,
  Gamepad2,
  Package,
  Award,
  Shield,
  Calendar,
  Crown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Toy } from '@/hooks/useToys';
import { imageService } from '@/services/imageService';
import { PlanService } from '@/services/planService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ToyDetailModalProps {
  toy: Toy | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (toy: Toy) => void;
  isSubscriptionView?: boolean;
  isSelected?: boolean;
  onAddToWishlist?: (toyId: string) => void;
  onSubscribe?: (toy: Toy) => void;
}

interface ToyImage {
  id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const ToyDetailModal = ({
  toy,
  isOpen,
  onClose,
  onSelect,
  isSubscriptionView = false,
  isSelected = false,
  onAddToWishlist,
  onSubscribe
}: ToyDetailModalProps) => {
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      if (!toy?.id) return;
      
      setIsImageLoading(true);
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
          // Set primary image or first image as main
          const primaryImage = imageData.find(img => img.is_primary) || imageData[0];
          setMainImage(primaryImage.image_url);
          setCurrentImageIndex(imageData.findIndex(img => img.image_url === primaryImage.image_url));
        } else if (toy.image_url) {
          // Use fallback single image
          setMainImage(toy.image_url);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        if (toy.image_url) {
          setMainImage(toy.image_url);
        }
      } finally {
        setIsImageLoading(false);
      }
    };

    if (isOpen && toy) {
      fetchImages();
    }
  }, [toy?.id, isOpen, toy?.image_url]);

  if (!toy) return null;

  // Convert S3 URLs to public URLs
  const convertToPublicUrl = (s3Url: string): string => {
    if (!s3Url) return s3Url;
    // Convert from S3 format to public format
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  };

  const imageUrl = convertToPublicUrl(mainImage || toy.image_url);
  const fallbackUrl = imageService.getFallbackChain('toy')[0];
  const finalImageUrl = imageError ? fallbackUrl : imageUrl;

  const getAgeIcon = (ageRange: string) => {
    const age = ageRange.toLowerCase();
    if (age.includes('0-1') || age.includes('baby')) return Baby;
    if (age.includes('2-4') || age.includes('toddler')) return Users;
    if (age.includes('5-8') || age.includes('school')) return GraduationCap;
    return Gamepad2;
  };

  const getAgeColor = (ageRange: string) => {
    const age = ageRange.toLowerCase();
    if (age.includes('0-1') || age.includes('baby')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (age.includes('2-4') || age.includes('toddler')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (age.includes('5-8') || age.includes('school')) return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  const AgeIcon = getAgeIcon(toy.age_range);
  const isPremiumToy = PlanService.isPremiumPricedToy(toy.retail_price);

  const handleImageLoad = () => setIsImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setIsImageLoading(false);
  };

  const handleThumbnailClick = (imageUrl: string, index: number) => {
    if (imageUrl !== mainImage) {
      setMainImage(imageUrl);
      setCurrentImageIndex(index);
      setImageError(false);
      setIsImageLoading(true);
    }
  };

  const handlePreviousImage = () => {
    if (images.length > 1) {
      const newIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
      const newImage = images[newIndex];
      setMainImage(newImage.image_url);
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsImageLoading(true);
    }
  };

  const handleNextImage = () => {
    if (images.length > 1) {
      const newIndex = currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
      const newImage = images[newIndex];
      setMainImage(newImage.image_url);
      setCurrentImageIndex(newIndex);
      setImageError(false);
      setIsImageLoading(true);
    }
  };

  const handleSelect = () => {
    onSelect?.(toy);
  };

  const handleWishlist = () => {
    onAddToWishlist?.(toy.id);
  };

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe(toy);
    } else {
      // Default subscription action - redirect to auth
      const subscriptionFlowUrl = '/subscription-flow';
      window.location.href = `/auth?redirect=${encodeURIComponent(subscriptionFlowUrl)}`;
    }
  };

  // Show all images in thumbnails
  const allImages = images.length > 0 ? images : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{toy.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative bg-gradient-to-br from-toy-sky/10 to-toy-mint/10 rounded-lg overflow-hidden">
              <div className="aspect-square">
                {isImageLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                )}
                <img
                  src={finalImageUrl}
                  alt={toy.name}
                  className={cn(
                    "w-full h-full object-contain transition-all duration-500",
                    isImageLoading ? 'opacity-0' : 'opacity-100'
                  )}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
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
            </div>

            {/* All Thumbnails Gallery */}
            {allImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={img.id}
                    onClick={() => handleThumbnailClick(img.image_url, index)}
                    className={`w-16 h-16 min-w-16 rounded-md border-2 overflow-hidden flex-shrink-0 ${
                      mainImage === img.image_url ? "border-primary" : "border-muted"
                    } hover:border-primary/50 transition-colors`}
                  >
                    <img
                      src={convertToPublicUrl(img.image_url)}
                      alt={`${toy.name} view ${index + 1}`}
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

            {/* Quick Features */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <AgeIcon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Age Range</p>
                    <p className="font-semibold text-sm">{toy.age_range}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Brand</p>
                    <p className="font-semibold text-sm">{toy.brand || 'Premium Brand'}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {isPremiumToy && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 border-yellow-300 px-3 py-1 font-bold">
                  <Crown className="w-3 h-3 mr-1" />
                  GOLD PACK EXCLUSIVE
                </Badge>
              )}
              <Badge className={cn("text-xs font-semibold", getAgeColor(toy.age_range))}>
                <AgeIcon className="w-3 h-3 mr-1" />
                {toy.age_range}
              </Badge>
              {toy.rating > 0 && (
                <Badge className="bg-toy-sunshine/90 text-white text-xs font-semibold">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  {toy.rating}
                </Badge>
              )}
              {toy.category && (
                <Badge variant="outline" className="text-xs">
                  {toy.category}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {toy.description || "A wonderful toy designed to spark imagination and create lasting memories! Perfect for developing creativity, motor skills, and providing hours of educational fun."}
              </p>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-semibold mb-2">Key Features</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Safe & Non-toxic materials</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Easy assembly & storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Age-appropriate design</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            {toy.retail_price && (
              <Card className={cn(
                "p-4 border-2",
                isPremiumToy 
                  ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200" 
                  : "bg-gradient-to-r from-green-50 to-blue-50 border-green-200"
              )}>
                <div className="text-center">
                  {isPremiumToy && (
                    <div className="mb-3">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 border-yellow-300 px-3 py-1 font-bold">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium Toy (₹10,000-₹15,000)
                      </Badge>
                    </div>
                  )}
                  <p className="text-lg font-bold text-muted-foreground line-through">
                    MRP: ₹{toy.retail_price.toLocaleString()}
                  </p>
                  <div className={cn(
                    "px-3 py-2 rounded-full inline-block border mt-2",
                    isPremiumToy
                      ? "bg-yellow-100 border-yellow-300"
                      : "bg-green-100 border-green-300"
                  )}>
                    <p className={cn(
                      "text-sm font-bold",
                      isPremiumToy ? "text-yellow-700" : "text-green-700"
                    )}>
                      {toy.category === 'ride_on_toys'
                        ? "⭐ FREE with ride on subscription"
                        : isPremiumToy
                          ? "⭐ FREE with Gold Pack PRO"
                          : "🎉 FREE with subscription"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Save {toy.retail_price ? `₹${toy.retail_price.toLocaleString()}` : 'money'} every month!
                  </p>
                </div>
              </Card>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="space-y-3">
              {isSubscriptionView ? (
                <Button 
                  onClick={handleSelect}
                  disabled={toy.available_quantity === 0}
                  className={cn(
                    "w-full text-base font-semibold py-3 transition-all duration-300",
                    toy.available_quantity === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : isSelected 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                  size="lg"
                >
                  {toy.available_quantity === 0 ? (
                    <>
                      Coming Soon
                    </>
                  ) : isSelected ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Selected for This Month
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Select This Toy
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleSubscribe}
                  disabled={toy.available_quantity === 0}
                  className={cn(
                    "w-full font-semibold text-base py-3",
                    toy.available_quantity === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white"
                  )}
                  size="lg"
                >
                  {toy.available_quantity === 0 ? "Coming Soon" : "Subscribe Now"}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleWishlist}
                className="w-full hover:bg-toy-coral hover:text-white hover:border-toy-coral transition-all duration-300"
                size="lg"
              >
                <Heart className="w-4 h-4 mr-2" />
                Add to Wishlist
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToyDetailModal; 