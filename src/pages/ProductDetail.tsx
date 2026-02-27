import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useToys } from "@/hooks/useToys";
import { useRideOnSubscription } from "@/hooks/useRideOnSubscription";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductInfo from "@/components/product/ProductInfo";
import ProductActions from "@/components/product/ProductActions";
import ProductDetailsTabs from "@/components/product/ProductDetailsTabs";
import ProductBreadcrumb from "@/components/product/ProductBreadcrumb";
import RelatedProducts from "@/components/product/RelatedProducts";
import ProductDetailLoading from "@/components/product/ProductDetailLoading";
import ProductDetailNotFound from "@/components/product/ProductDetailNotFound";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSubscriptionPlanName } from "@/utils/subscriptionUtils";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fbqTrack } from '@/utils/fbq';
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { FEATURE_FLAGS } from "@/config/features";
import { trackProductView } from '@/utils/analytics';
import { trackViewItem } from '@/utils/gtm';
import { trackToyRental, trackViewContent } from '@/utils/metaPixel';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCustomAuth();
  const { data: toys, isLoading } = useToys();
  const { rideOnSubscription, canAddRideOn, rideOnPlan, createRideOnSubscription, isCreating } = useRideOnSubscription();
  const isMobile = useIsMobile();
  const [subscriptionFlowContext, setSubscriptionFlowContext] = useState<any>(null);
  const { handleToyAction } = useSubscriptionFlow();

  // Check if this is a ride-on toy view
  const isRideOnView = searchParams.get('type') === 'ride_on';

  // Find toy early so useEffect hooks can depend on it
  const toy = toys?.find(t => t.id === id);

  // ALL useEffect HOOKS MOVED HERE - BEFORE ANY CONDITIONAL RETURNS
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Check if we came from subscription flow
    const context = sessionStorage.getItem('subscription-flow-context');
    if (context) {
      setSubscriptionFlowContext(JSON.parse(context));
    }
  }, []);

  // Scroll to top when toy data is loaded
  useEffect(() => {
    if (toy) {
      window.scrollTo(0, 0);
    }
  }, [toy]);

  // Fire Meta Pixel ViewContent event and Google Analytics when toy is loaded
  useEffect(() => {
    if (toy) {
      fbqTrack('ViewContent', {
        content_ids: [toy.id],
        content_name: toy.name,
        content_type: 'product',
        value: toy.rental_price || 0,
        currency: 'INR',
        content_category: toy.category,
        content_brand: toy.brand || 'Toyflix',
        age_range: toy.age_range,
        product_type: isRideOnView ? 'ride_on' : 'subscription',
        subscription_plan_suggestion: getSubscriptionPlanName(toy.pack)
      });
      
      // Track product view in Google Analytics, GTM, and Meta Pixel
      if (FEATURE_FLAGS.GOOGLE_ANALYTICS) {
        trackProductView(toy);
        
        // Also track in GTM for e-commerce compatibility with old website
        trackViewItem({
          item_id: toy.id,
          item_name: toy.name,
          item_category: toy.category,
          price: toy.rental_price,
          currency: 'INR'
        });
      }

      // Track in Meta Pixel (Facebook Pixel) for advertising optimization
      trackToyRental({
        toy_id: toy.id,
        toy_name: toy.name,
        rental_price: toy.rental_price || 0,
        toy_category: toy.category
      });
    }
  }, [toy]);

  // NOW the conditional returns can come after all hooks
  const handleBackClick = () => {
    if (subscriptionFlowContext?.fromSubscriptionFlow) {
      // Clear the context and navigate back to subscription flow
      sessionStorage.removeItem('subscription-flow-context');
      navigate('/subscription-flow');
    } else {
      // Navigate back to toys page with appropriate tab
      const tabParam = isRideOnView ? '?tab=ride_on' : '';
      navigate(`/toys${tabParam}`);
    }
  };

  const handleAddToCart = () => {
    if (!toys) return;
    
    const toy = toys.find(t => t.id === id);
    if (toy) {
      if (isRideOnView) {
        handleRideOnRent(toy);
      } else {
        handleToyAction(toy);
      }
    }
  };

  const handleRideOnRent = async (toy: any) => {
    // For authenticated users, check if they can add ride-on toys
    if (user && !canAddRideOn) {
      toast.error("You already have an active ride-on subscription!");
      return;
    }

    // Track ride-on subscription started
    try {
      if (typeof window !== 'undefined' && window.cbq) {
        window.cbq('track', 'RideOnSubscriptionStarted', {
          user_id: user?.id || 'guest',
          toy_id: toy.id,
          toy_name: toy.name,
          is_authenticated: !!user,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }

    // Store ride-on selection for both guest and authenticated users
    sessionStorage.setItem('ride-on-selection', JSON.stringify({
      toyId: toy.id,
      toyName: toy.name,
      fromProductDetail: true
    }));

    // For guest users, redirect to auth with ride-on subscription flow
    if (!user) {
      const rideOnSubscriptionUrl = `/subscription-flow?rideOnToy=${toy.id}`;
      navigate(`/auth?redirect=${encodeURIComponent(rideOnSubscriptionUrl)}`);
      return;
    }

    // For authenticated users, navigate directly to subscription flow
    navigate(`/subscription-flow?rideOnToy=${toy.id}`);
  };

  const handleAddToWishlist = () => {
    toast.success("Added to wishlist!");
  };

  if (isLoading) {
    return <ProductDetailLoading />;
  }

  if (!toy) {
    return <ProductDetailNotFound onBackClick={handleBackClick} />;
  }

  // Check if this toy is in the ride_on_toys category
  const isRideOnToy = toy.category === 'ride_on_toys' || isRideOnView;

  const subscriptionPlanName = isRideOnToy ? 'Ride-On Monthly' : getSubscriptionPlanName(toy.pack);
  const backButtonText = subscriptionFlowContext?.fromSubscriptionFlow 
    ? 'Back to Selection' 
    : isRideOnView 
      ? 'Back to Ride-On Toys' 
      : 'Back to Toys';

  // Render ride-on specific pricing card
  const renderRideOnPricing = () => {
    if (!isRideOnToy) return null;

    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">🏍️ Ride-On Rental</h3>
            <Badge variant="default">Monthly</Badge>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Base Price:</span>
              <span>₹{rideOnPlan.basePrice}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span>₹{Math.round(rideOnPlan.basePrice * rideOnPlan.gstRate / 100)}</span>
            </div>
            <hr />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total per month:</span>
              <span>₹{rideOnPlan.totalPrice}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">No Age Restrictions</Badge>
            <Badge variant="secondary" className="text-xs">1 Toy Limit</Badge>
            <Badge variant="secondary" className="text-xs">Premium Quality</Badge>
          </div>

          <Button 
            onClick={() => handleRideOnRent(toy)}
            disabled={isCreating || (user && !canAddRideOn)}
            className="w-full"
            size="lg"
          >
            {isCreating 
              ? 'Processing...' 
              : (user && !canAddRideOn)
                ? 'Already Have Ride-On Subscription' 
                : `Subscribe Now - ₹${rideOnPlan.totalPrice}/month`
            }
          </Button>

          {rideOnSubscription && (
            <p className="text-sm text-center text-green-600 mt-2">
              ✅ You already have an active ride-on subscription
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const content = (
    <>
      {/* SEO Components */}
      {FEATURE_FLAGS.SEO_META_TAGS && (
        <SEOHead 
          toy={toy} 
          page="product"
          canonical={`https://toyflix.in/toys/${toy.id}`}
        />
      )}
      {FEATURE_FLAGS.SEO_STRUCTURED_DATA && (
        <>
          <StructuredData toy={toy} type="product" />
          <StructuredData 
            type="breadcrumb" 
            breadcrumbs={[
              { name: 'Home', url: 'https://toyflix.in' },
              { name: 'Toys', url: 'https://toyflix.in/toys' },
              { name: toy.name, url: `https://toyflix.in/toys/${toy.id}` }
            ]} 
          />
        </>
      )}
      
      <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-4">
        <ProductBreadcrumb 
          toyName={toy.name} 
          category={toy.category}
          onBackClick={handleBackClick}
          customBackText={backButtonText}
        />
        
        <div className="space-y-6">
          <ProductImageGallery 
            toyId={toy.id}
            toyName={toy.name} 
            fallbackImageUrl={toy.image_url}
          />
          
          {/* Show ride-on pricing if this is a ride-on toy */}
          {isRideOnToy && renderRideOnPricing()}
          
          <ProductInfo 
            toy={toy} 
            onAddToCart={handleAddToCart}
            onAddToWishlist={handleAddToWishlist}
          />
          
          {/* Show actions below product info on mobile */}
          {isMobile && !isRideOnToy && (
            <ProductActions
              availableQuantity={toy.available_quantity}
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
            />
          )}
          
          <ProductDetailsTabs 
            toy={toy} 
            subscriptionPlanName={subscriptionPlanName}
          />
          
          <RelatedProducts currentToy={toy} />
        </div>
      </div>
    </div>
    </>
  );

  if (isMobile) {
    return (
      <MobileLayout title={toy.name} showHeader={true} showBottomNav={true}>
        {content}
      </MobileLayout>
    );
  }

  return (
    <>
      {/* SEO Components for Desktop */}
      {FEATURE_FLAGS.SEO_META_TAGS && (
        <SEOHead 
          toy={toy} 
          page="product"
          canonical={`https://toyflix.in/toys/${toy.id}`}
        />
      )}
      {FEATURE_FLAGS.SEO_STRUCTURED_DATA && (
        <>
          <StructuredData toy={toy} type="product" />
          <StructuredData 
            type="breadcrumb" 
            breadcrumbs={[
              { name: 'Home', url: 'https://toyflix.in' },
              { name: 'Toys', url: 'https://toyflix.in/toys' },
              { name: toy.name, url: `https://toyflix.in/toys/${toy.id}` }
            ]} 
          />
        </>
      )}
      
      <div className="min-h-screen bg-background">
      <div className="pt-20 container mx-auto px-4 py-8">
        <ProductBreadcrumb 
          toyName={toy.name} 
          category={toy.category}
          onBackClick={handleBackClick}
          customBackText={backButtonText}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <ProductImageGallery 
            toyId={toy.id}
            toyName={toy.name} 
            fallbackImageUrl={toy.image_url}
          />
          
          <div className="space-y-6">
            {/* Show ride-on pricing if this is a ride-on toy */}
            {isRideOnToy && renderRideOnPricing()}
            
            <ProductInfo 
              toy={toy} 
              onAddToCart={handleAddToCart}
              onAddToWishlist={handleAddToWishlist}
            />
          </div>
        </div>

        <div className="space-y-6">
          <ProductDetailsTabs 
            toy={toy} 
            subscriptionPlanName={subscriptionPlanName}
          />
          <RelatedProducts currentToy={toy} />
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductDetail;
