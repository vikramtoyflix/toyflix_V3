import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Check } from 'lucide-react';
import { Toy } from '@/hooks/useToys';
import { fbqTrack } from '@/utils/fbq';

interface ToyCardActionsProps {
  toy: Toy;
  onToyAction?: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist?: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct?: (toyId: string) => void;
  isSubscriptionView?: boolean;
  isSelected?: boolean;
}

const ToyCardActions = ({ 
  toy, 
  onToyAction, 
  onAddToWishlist, 
  onViewProduct,
  isSubscriptionView = false,
  isSelected = false
}: ToyCardActionsProps) => {
  if (isSubscriptionView) {
    const isOutOfStock = toy.available_quantity === 0;
    
    return (
      <div className="space-y-2">
        <Button
          onClick={(e) => {
            if (!isOutOfStock) {
              onToyAction?.(toy, e);
            }
          }}
          disabled={isOutOfStock}
          className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
          size="sm"
          variant={isOutOfStock ? "secondary" : isSelected ? "default" : "outline"}
        >
          {isOutOfStock ? (
            <span>Out of Stock</span>
          ) : isSelected ? (
            <>
              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Selected</span>
              <span className="sm:hidden">✓</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Select Toy</span>
              <span className="sm:hidden">Select</span>
            </>
          )}
        </Button>

      </div>
    );
  }

  return (
    <Button 
      onClick={(e) => {
        e.stopPropagation();
        // Fire Meta Pixel AddToCart event
        fbqTrack('AddToCart', {
          content_ids: [toy.id],
          content_name: toy.name,
          content_type: 'product',
          value: toy.rental_price,
          currency: 'INR'
        });
        if (onToyAction) {
          onToyAction(toy, e);
        } else {
          // Default subscription action - redirect to auth
          const subscriptionFlowUrl = '/subscription-flow';
          window.location.href = `/auth?redirect=${encodeURIComponent(subscriptionFlowUrl)}`;
        }
      }}
      className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
      size="sm"
    >
      <span className="hidden sm:inline">Subscribe Now</span>
      <span className="sm:hidden">Subscribe</span>
    </Button>
  );
};

export default ToyCardActions;
