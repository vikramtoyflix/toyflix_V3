import React, { useCallback, useMemo } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToysForAgeGroup } from "@/hooks/useToysWithAgeBands";
import { logToyDistribution } from "@/utils/toyOrdering";
import ToyCarouselHeader from "./toy-carousel/ToyCarouselHeader";
import ToyCarouselLoadingState from "./toy-carousel/ToyCarouselLoadingState";
import ToyCarouselCard from "./toy-carousel/ToyCarouselCard";
import MobileToyCarouselCard from "./mobile/MobileToyCarouselCard";
import ToyCarouselExploreButton from "./toy-carousel/ToyCarouselExploreButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useCustomAuth } from "@/hooks/useCustomAuth";

const ToyCarousel = React.memo(() => {
  const { data: toys, isLoading, error, refetch } = useToysForAgeGroup();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCustomAuth();

  if (toys && toys.length > 0) {
    logToyDistribution(toys, "ToyCarousel");
  }

  const handleViewProduct = useCallback(
    (toyId: string) => {
      navigate(`/toys/${toyId}`);
    },
    [navigate]
  );

  const handleAddToWishlist = useCallback(
    (toyId: string) => {
      if (!user) {
        navigate("/auth?mode=signin");
        return;
      }
      const toy = toys?.find((t) => t.id === toyId);
      toast({
        title: "Added to Wishlist!",
        description: `${toy ? toy.name : "Toy"} has been added to your wishlist. This feature is coming soon!`,
      });
    },
    [user, toys, navigate, toast]
  );

  const handleForceRefresh = useCallback(() => {
    if (refetch) {
      refetch();
      toast({
        title: "Refreshing toys...",
        description: "Loading the latest toy collection with category ordering",
      });
    }
  }, [refetch, toast]);

  const toysToDisplay = useMemo(() => {
    if (!toys || toys.length === 0) return [];
    const featuredToys = toys.filter((toy) => toy.is_featured);
    let result = featuredToys.length > 0 ? featuredToys : toys.slice(0, 12);
    result = result.sort((a, b) => {
      const aInStock = (a.available_quantity || 0) > 0 ? 1 : 0;
      const bInStock = (b.available_quantity || 0) > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;
      return 0;
    });
    if (result.length > 0) {
      logToyDistribution(result, "ToyCarousel Display");
    }
    return result;
  }, [toys]);

  if (isLoading) {
    return <ToyCarouselLoadingState />;
  }

  if (error) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Toys</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              Having trouble loading toys. Please try refreshing.
            </p>
            <Button onClick={handleForceRefresh} className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Toys
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!toys || toys.length === 0 || toysToDisplay.length === 0) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Toys</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
              No toys available. This might be a data issue.
            </p>
            <Button onClick={handleForceRefresh} className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Toys
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const carouselOptions = useMemo(
    () => ({
      align: "start" as const,
      loop: true,
      dragFree: isMobile,
    }),
    [isMobile]
  );

  return (
    <section className={`${isMobile ? "py-8" : "py-14"} bg-learning-blue`}>
      <div className={`container mx-auto ${isMobile ? "px-0" : "px-4"}`}>
        <div className={isMobile ? "px-4 mb-6" : ""}>
          <ToyCarouselHeader />
        </div>

        <Carousel
          opts={carouselOptions}
          plugins={[Autoplay({ delay: 3000, stopOnInteraction: true }) as any]}
          className={`w-full ${isMobile ? "max-w-full" : "max-w-6xl mx-auto"}`}
        >
          <CarouselContent className={isMobile ? "-ml-2" : "-ml-2 md:-ml-4"}>
            {toysToDisplay.map((toy, index) =>
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

        <div className={isMobile ? "px-4 mt-6" : ""}>
          <ToyCarouselExploreButton />
        </div>
      </div>
    </section>
  );
});

ToyCarousel.displayName = "ToyCarousel";

export default ToyCarousel;
