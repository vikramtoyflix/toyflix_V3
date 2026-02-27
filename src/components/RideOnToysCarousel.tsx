import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useRideOnToys } from "@/hooks/useToys/rideOnToys";
import RideOnToysCarouselHeader from "./toy-carousel/RideOnToysCarouselHeader";
import ToyCarouselLoadingState from "./toy-carousel/ToyCarouselLoadingState";
import ToyCarouselErrorState from "./toy-carousel/ToyCarouselErrorState";
import ToyCarouselEmptyState from "./toy-carousel/ToyCarouselEmptyState";
import ToyCarouselCard from "./toy-carousel/ToyCarouselCard";
import MobileToyCarouselCard from "./mobile/MobileToyCarouselCard";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useRideOnSubscription } from "@/hooks/useRideOnSubscription";
import { toast } from "sonner";
import Autoplay from "embla-carousel-autoplay";

const RideOnToysCarousel = () => {
  const { data: toys, isLoading, error } = useRideOnToys();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useCustomAuth();
  const { canAddRideOn } = useRideOnSubscription();

  const handleViewProduct = (toyId: string) => {
    navigate(`/toys/${toyId}?type=ride_on`);
  };

  const handleAddToWishlist = (toyId: string) => {
    if (!user) {
                    navigate("/auth?mode=signin");
      return;
    }
    const toy = toys?.find((t) => t.id === toyId);
    toast.success(`${toy ? toy.name : "Toy"} has been added to your wishlist. This feature is coming soon!`);
  };

  const handleRideOnSubscribe = (toy: any) => {
    // For ride-on toys, navigate to product detail page with ride-on type
    navigate(`/toys/${toy.id}?type=ride_on`);
  };

  const handleSubscribeClick = () => {
    if (!user) navigate('/auth?redirect=%2Fsubscription-flow');
    else navigate('/subscription-flow');
  };

  const RideOnExploreButton = () => (
    <div className="flex flex-col items-center space-y-4 mt-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Ready for the Adventure?
        </h3>
        <p className="text-sm text-gray-600 mb-4 animate-bounce-gentle">
          🎪 Explore our complete collection of ride-on toys
        </p>
      </div>
      <div className={`flex ${isMobile ? "flex-col gap-3" : "flex-row justify-center gap-4"}`}>
        <Button
          onClick={() => navigate('/toys?tab=ride_on')}
          size="lg"
          className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse hover:animate-ride-on-bounce relative overflow-hidden group"
        >
          <span className="relative z-10">🚗 Explore All Ride-On Toys 🏍️</span>
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 via-red-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
        </Button>
        <Button
          onClick={handleSubscribeClick}
          variant="outline"
          className={`bg-white border-2 border-toy-mint text-toy-mint hover:bg-toy-mint hover:text-white font-semibold rounded-full transition-colors duration-200 ${isMobile ? "py-3 text-base" : "px-8 py-3 text-lg"}`}
        >
          <Gift className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} mr-2`} />
          Subscribe Now
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return <ToyCarouselLoadingState />;
  }

  if (error) {
    return <ToyCarouselErrorState />;
  }

  if (!toys || toys.length === 0) {
    return <ToyCarouselEmptyState />;
  }

  return (
    <section className={`${isMobile ? 'py-8' : 'py-14'} bg-[#FAFAFA]`}>
      <div className={`container mx-auto ${isMobile ? 'px-0' : 'px-4'}`}>
        <div className={isMobile ? 'px-4 mb-6' : ''}>
          <RideOnToysCarouselHeader />
        </div>
        
        <Carousel
          opts={{
            align: "start",
            loop: true,
            dragFree: isMobile,
          }}
          plugins={[Autoplay({ delay: 3000, stopOnInteraction: true }) as any]}
          className={`w-full ${isMobile ? 'max-w-full' : 'max-w-6xl mx-auto'}`}
        >
          <CarouselContent className={isMobile ? "-ml-2" : "-ml-2 md:-ml-4"}>
            {toys.map((toy, index) => 
              isMobile ? (
                <MobileToyCarouselCard 
                  key={toy.id} 
                  toy={toy} 
                  index={index}
                  onViewProduct={handleViewProduct}
                  onAddToWishlist={handleAddToWishlist}
                />
              ) : (
                <ToyCarouselCard 
                  key={toy.id} 
                  toy={toy} 
                  index={index}
                  onViewProduct={handleViewProduct}
                  onAddToWishlist={handleAddToWishlist}
                  onAddToCart={handleRideOnSubscribe}
                />
              )
            )}
          </CarouselContent>
          {!isMobile && (
            <>
              <CarouselPrevious className="hidden md:flex -left-12 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110" />
              <CarouselNext className="hidden md:flex -right-12 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110" />
            </>
          )}
        </Carousel>

        <div className={isMobile ? 'px-4 mt-6' : ''}>
          <RideOnExploreButton />
        </div>
      </div>
    </section>
  );
};

export default RideOnToysCarousel;
