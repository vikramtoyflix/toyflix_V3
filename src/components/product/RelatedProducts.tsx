import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToys, Toy } from "@/hooks/useToys";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileToyCard from "@/components/mobile/MobileToyCard";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { useMultipleToyImages } from "@/hooks/useToyImages";
import { imageService } from "@/services/imageService";
import { RIDE_ON_PLAN } from "@/hooks/useRideOnSubscription";

interface RelatedProductsProps {
  currentToy: Toy;
}

const RelatedProducts = ({ currentToy }: RelatedProductsProps) => {
  const navigate = useNavigate();
  const { data: toys } = useToys();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  const { handleToyAction: handleSubscriptionToyAction } = useSubscriptionFlow();

  // Get related toys based on category, excluding current toy
  const relatedToys = toys?.filter(toy => 
    toy.category === currentToy.category && 
    toy.id !== currentToy.id
  ).sort((a, b) => {
    // Sort with out-of-stock toys displayed last
    const aInStock = (a.available_quantity || 0) > 0 ? 1 : 0;
    const bInStock = (b.available_quantity || 0) > 0 ? 1 : 0;
    
    // In-stock toys first (1), out-of-stock toys last (0)
    if (aInStock !== bInStock) {
      return bInStock - aInStock;
    }
    
    // Within same stock status, sort alphabetically by name
    return a.name.localeCompare(b.name);
  }).slice(0, 4) || [];

  // Fetch images for all related toys efficiently
  const relatedToyIds = relatedToys.map(toy => toy.id);
  const { data: toyImages } = useMultipleToyImages(relatedToyIds);

  const handleImageError = (toyId: string) => {
    setImageErrors(prev => ({ ...prev, [toyId]: true }));
  };

  const getImageSrc = (toy: Toy) => {
    if (imageErrors[toy.id] || !toy.image_url) {
      return "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400";
    }
    return toy.image_url;
  };

  // Get correct pricing for the toy based on its category
  const getToyPricing = (toy: Toy) => {
    const isRideOnToy = toy.category === 'ride_on_toys';
    
    if (isRideOnToy) {
      return {
        subscriptionPrice: RIDE_ON_PLAN.basePrice,
        totalPrice: RIDE_ON_PLAN.totalPrice,
        isRideOn: true
      };
    }
    
    return {
      subscriptionPrice: toy.rental_price,
      totalPrice: toy.rental_price,
      isRideOn: false
    };
  };

  const handleToyAction = (toy: Toy, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSubscriptionToyAction(toy);
  };

  const handleAddToWishlist = (toyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement wishlist functionality
    console.log("Add to wishlist:", toyId);
  };

  const handleViewProduct = (toyId: string) => {
    const toy = toys?.find(t => t.id === toyId);
    const isRideOnToy = toy?.category === 'ride_on_toys';
    
    if (isRideOnToy) {
      navigate(`/toys/${toyId}?type=ride_on`);
    } else {
      navigate(`/toys/${toyId}`);
    }
  };

  if (relatedToys.length === 0) {
    return null;
  }

  // Mobile layout using MobileToyCard
  if (isMobile) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-4">Related Products</h2>
        <div className="space-y-3 px-4">
          {relatedToys.map((toy) => (
            <MobileToyCard
              key={toy.id}
              toy={toy}
              onToyAction={handleToyAction}
              onAddToWishlist={handleAddToWishlist}
              onViewProduct={handleViewProduct}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout (keep existing design)
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedToys.map((toy) => {
          const pricing = getToyPricing(toy);
          
          return (
            <Card key={toy.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
              <div 
                className="relative overflow-hidden rounded-t-lg"
                onClick={() => handleViewProduct(toy.id)}
              >
                <img
                  src={getImageSrc(toy)}
                  alt={toy.name}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() => handleImageError(toy.id)}
                  loading="lazy"
                />
              </div>
              
              <CardHeader onClick={() => handleViewProduct(toy.id)}>
                <CardTitle className="line-clamp-2 text-base">{toy.name}</CardTitle>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">{toy.category}</Badge>
                  <div className="flex items-center">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="ml-1 text-xs">{toy.rating}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">Ages {toy.age_range}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-primary">
                    ₹{pricing.subscriptionPrice}/month
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {toy.available_quantity} available
                  </p>
                </div>
                
                {/* Show ride-on specific pricing info */}
                {pricing.isRideOn ? (
                  <>
                    <p className="text-xs text-center text-muted-foreground mt-1 line-through">
                      MRP: ₹{toy.retail_price?.toLocaleString()}
                    </p>
                    <div className="bg-blue-50 px-2 py-1 rounded-full inline-block border border-blue-200 mt-1">
                      <p className="text-xs font-bold text-blue-600">
                        🏍️ Ride-On Subscription
                      </p>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Total: ₹{pricing.totalPrice}/month (incl. GST)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-center text-muted-foreground mt-1 line-through">
                      MRP: ₹{toy.retail_price?.toLocaleString()}
                    </p>
                    <div className="bg-green-50 px-2 py-1 rounded-full inline-block border border-green-200 mt-1">
                      <p className="text-xs font-bold text-green-600">
                        🎉 Free with subscription
                      </p>
                    </div>
                  </>
                )}
                
                <Button 
                  size="sm"
                  className="w-full text-xs mt-2" 
                  disabled={toy.available_quantity === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProduct(toy.id);
                  }}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedProducts;
