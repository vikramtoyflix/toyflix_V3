import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowRight, Gift, Eye } from "lucide-react";

const ToyCarouselExploreButton = () => {
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleExploreMoreClick = () => {
    // Redirect to signup page first, then to toys after authentication
    if (!user) {
      navigate('/auth?redirect=%2Ftoys&from=explore');
    } else {
      // If already authenticated, go directly to toys
      navigate('/toys');
    }
  };

  const handleSubscribeClick = () => {
    if (!user) {
      navigate('/auth?redirect=%2Fsubscription-flow');
    } else {
      navigate('/subscription-flow');
    }
  };

  return (
    <div className={`text-center ${isMobile ? "mt-6" : "mt-12"}`}>
      <div className={`flex ${isMobile ? "flex-col gap-3" : "flex-row justify-center gap-4"}`}>
        <Button
          onClick={handleExploreMoreClick}
          className={`bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white font-semibold ${isMobile ? "py-3 text-base" : "px-8 py-3 text-lg"} rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl`}
        >
          <Eye className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2`} />
          Explore More Toys
          <ArrowRight className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} ml-2`} />
        </Button>

        {(!user || !subscriptionData?.subscription) && (
          <Button
            onClick={handleSubscribeClick}
            variant="outline"
            className={`bg-white border-2 border-toy-mint text-toy-mint hover:bg-toy-mint hover:text-white font-semibold ${isMobile ? "py-3 text-base" : "px-8 py-3 text-lg"} rounded-full transition-colors duration-200`}
          >
            <Gift className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2`} />
            Subscribe Now
          </Button>
        )}

        {isMobile && (
          <Button
            onClick={() => navigate("/toys")}
            variant="ghost"
            className="text-primary hover:text-primary/80 font-medium py-2 text-sm"
          >
            View All Toys →
          </Button>
        )}
      </div>

      <p className={`text-muted-foreground ${isMobile ? "text-xs mt-2" : "text-sm mt-4"} max-w-md mx-auto`}>
        {!user
          ? "Explore 1000+ premium toys and start your subscription journey!"
          : !subscriptionData?.subscription
            ? "Browse our collection and create your perfect subscription"
            : "Discover more amazing toys in our collection"}
      </p>
    </div>
  );
};

export default ToyCarouselExploreButton;
