
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Share2 } from "lucide-react";
import { Toy } from "@/hooks/useToys";
import ProductPricing from "./ProductPricing";
import ProductActions from "./ProductActions";
import { getSubscriptionPlanName } from "@/utils/subscriptionUtils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductInfoProps {
  toy: Toy;
  onAddToCart: () => void;
  onAddToWishlist: () => void;
}

const ProductInfo = ({ toy, onAddToCart, onAddToWishlist }: ProductInfoProps) => {
  const subscriptionPlanName = getSubscriptionPlanName(toy.pack);
  const isMobile = useIsMobile();

  return (
    <div className={`space-y-${isMobile ? '4' : '6'}`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="mb-2">{toy.category}</Badge>
          <Button variant="ghost" size="sm">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>
          {toy.name}
        </h1>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} ${
                  star <= toy.rating ? "text-yellow-400 fill-current" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">({toy.rating}/5)</span>
        </div>
        {toy.brand && (
          <p className="text-sm text-muted-foreground mb-4">Brand: {toy.brand}</p>
        )}
      </div>

      <div className={`space-y-${isMobile ? '3' : '4'}`}>
        <div>
          <h3 className={`font-semibold mb-2 ${isMobile ? 'text-sm' : ''}`}>Age Range</h3>
          <Badge variant="outline" className={isMobile ? 'text-xs' : ''}>{toy.age_range}</Badge>
        </div>

        {/* Subscription Pack Badge */}
        {subscriptionPlanName && (
          <div>
            <h3 className={`font-semibold mb-2 ${isMobile ? 'text-sm' : ''}`}>Available In</h3>
            <Badge 
              variant="outline" 
              className={`bg-fun-blue/10 text-fun-blue border-fun-blue/20 ${isMobile ? 'text-xs' : ''}`}
            >
              {subscriptionPlanName}
            </Badge>
          </div>
        )}

        <ProductPricing 
          rentalPrice={toy.rental_price}
          retailPrice={toy.retail_price}
        />
      </div>

      {!isMobile && (
        <ProductActions
          availableQuantity={toy.available_quantity}
          onAddToCart={onAddToCart}
          onAddToWishlist={onAddToWishlist}
        />
      )}
    </div>
  );
};

export default ProductInfo;
