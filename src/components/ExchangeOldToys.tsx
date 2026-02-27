
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { imageService } from '@/services/imageService';

const ExchangeOldToys = () => {
  const isMobile = useIsMobile();
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.log('Exchange old toys image failed to load, using fallback');
    setImageError(true);
  };

  const getImageSource = () => {
    if (imageError) {
      return imageService.getImageUrl("https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=800&auto=format&fit=crop", 'carousel');
    }
    return "/lovable-uploads/4020678c-85c2-42ad-867e-f2dd4e701595.png";
  };

  const getImageAlt = () => {
    return imageError 
      ? "Exchange old toys program - Get cashback on your subscription"
      : "Exchange old toys for cashback on your subscription";
  };

  return (
    <section className="bg-background py-8 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className={`
            relative w-full overflow-hidden rounded-lg shadow-lg
            ${isMobile ? 'max-w-sm' : 'max-w-5xl'}
          `}>
            <img
              src={getImageSource()}
              alt={getImageAlt()}
              onError={handleImageError}
              className={`
                w-full h-auto object-contain transition-all duration-300
                ${isMobile ? 'object-cover' : 'object-contain'}
                ${imageError ? 'filter brightness-90' : ''}
              `}
              loading="lazy"
            />
            
            {/* Fallback overlay for error state */}
            {imageError && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 flex items-center justify-center p-6">
                <div className="text-center">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                    Exchange Old Toys Program
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4">
                    Get cashback on your subscription when you exchange old toys
                  </p>
                  <div className="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-semibold">
                    💰 Earn Cashback Today!
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional responsive content for mobile */}
        {isMobile && !imageError && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Exchange old toys and earn cashback on your subscription
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExchangeOldToys;
