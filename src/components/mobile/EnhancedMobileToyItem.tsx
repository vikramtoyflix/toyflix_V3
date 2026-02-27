import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { imageService } from '@/services/imageService';

interface ToyImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface EnhancedMobileToyItemProps {
  toy: any;
  index: number;
  showDetails?: boolean;
  enableImageFetch?: boolean; // Option to fetch from toy_images table
}

export const EnhancedMobileToyItem: React.FC<EnhancedMobileToyItemProps> = ({ 
  toy, 
  index, 
  showDetails = true,
  enableImageFetch = true 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<ToyImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Fetch additional images from toy_images table if toy has toy_id
  useEffect(() => {
    const fetchToyImages = async () => {
      if (!enableImageFetch || !toy.toy_id) return;
      
      setIsLoadingImages(true);
      try {
        const { data: imageData, error } = await supabase
          .from('toy_images')
          .select('*')
          .eq('toy_id', toy.toy_id)
          .order('display_order');

        if (!error && imageData && imageData.length > 0) {
          setImages(imageData);
        }
      } catch (error) {
        console.error('Error fetching toy images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchToyImages();
  }, [toy.toy_id, enableImageFetch]);

  // Enhanced image URL handling
  const getImageUrl = () => {
    // Debug: Log toy data structure for first toy only
    if (process.env.NODE_ENV === 'development' && index === 0) {
      console.log('🧸 EnhancedMobileToyItem - Toy data debug:', {
        toyObject: toy,
        toyName: toy.toy_name || toy.name || toy.product_name,
        hasImageUrl: !!toy.image_url,
        hasImage: !!toy.image,
        hasToyImageUrl: !!toy.toy_image_url,
        imageUrlValue: toy.image_url,
        imageValue: toy.image,
        allToyFields: Object.keys(toy),
        fetchedImagesCount: images.length
      });
    }
    
    // Priority 1: Use primary image from toy_images table
    if (images.length > 0) {
      const primaryImage = images.find(img => img.is_primary) || images[0];
      return imageService.getImageUrl(primaryImage.image_url, 'toy');
    }
    
    // Priority 2: Use image_url from toy data
    if (toy.image_url) {
      return imageService.getImageUrl(toy.image_url, 'toy');
    }
    
    // Priority 3: Check for nested image data
    if (toy.image) {
      return imageService.getImageUrl(toy.image, 'toy');
    }
    
    // Priority 4: Check for toy_image_url
    if (toy.toy_image_url) {
      return imageService.getImageUrl(toy.toy_image_url, 'toy');
    }
    
    return null;
  };

  const imageUrl = getImageUrl();

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Enhanced fallback with toy category-specific icons
  const renderFallbackIcon = () => {
    const categoryIcons: Record<string, string> = {
      'educational': '📚',
      'building_blocks': '🧱', 
      'puzzles': '🧩',
      'musical': '🎵',
      'outdoor': '⚽',
      'ride_on': '🚗',
      'books': '📖',
      'big_toys': '🎪',
      'default': '🧸'
    };

    const icon = categoryIcons[toy.category?.toLowerCase()] || categoryIcons.default;
    
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center">
        <span className="text-lg">{icon}</span>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border flex-shrink-0 relative">
        {isLoadingImages ? (
          <div className="w-8 h-8 bg-gray-200 animate-pulse rounded" />
        ) : imageUrl && !imageError ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
            )}
            <img 
              src={imageUrl} 
              alt={toy.name || `Toy ${index + 1}`} 
              className={`w-8 h-8 object-cover rounded transition-opacity duration-200 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          </>
        ) : (
          renderFallbackIcon()
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">
          {toy.toy_name || toy.name || toy.product_name || `Toy ${index + 1}`}
        </h4>
        {showDetails && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>{toy.category || 'Educational'}</span>
            <span>•</span>
            <span>{toy.age_range || '3-5 years'}</span>
            {images.length > 1 && (
              <>
                <span>•</span>
                <span>{images.length} photos</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMobileToyItem;
