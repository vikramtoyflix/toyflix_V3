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
import { useBulkToyImages } from "@/hooks/useToyImages";
import ToyCarouselHeader from "./toy-carousel/ToyCarouselHeader";
import ToyCarouselLoadingState from "./toy-carousel/ToyCarouselLoadingState";
import ToyCarouselCard from "./toy-carousel/ToyCarouselCard";
import MobileToyCarouselCard from "./mobile/MobileToyCarouselCard";
import ToyCarouselExploreButton from "./toy-carousel/ToyCarouselExploreButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useCustomAuth } from "@/hooks/useCustomAuth";

const ToyCarouselInner = React.memo(() => {
  const { data: toys, isLoading, isFetching, error, refetch } = useToysForAgeGroup();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useCustomAuth();

  // All hooks must be at the top — no hooks after early returns
  const carouselOptions = useMemo(
    () => ({ align: "start" as const, loop: true, dragFree: isMobile }),
    [isMobile]
  );

  const handleViewProduct = useCallback(
    (toyId: string) => { navigate(`/toys/${toyId}`); },
    [navigate]
  );

  const handleAddToWishlist = useCallback(
    (toyId: string) => {
      if (!user) { navigate("/auth?mode=signin"); return; }
      const toy = toys?.find((t) => t.id === toyId);
      toast({
        title: "Added to Wishlist!",
        description: `${toy ? toy.name : "Toy"} has been added to your wishlist.`,
      });
    },
    [user, toys, navigate, toast]
  );

  const handleForceRefresh = useCallback(() => {
    refetch?.();
    toast({ title: "Refreshing toys..." });
  }, [refetch, toast]);

  const toysToDisplay = useMemo(() => {
    if (!toys || toys.length === 0) return [];
    const featured = toys.filter((t) => t.is_featured);
    const pool = featured.length > 0 ? featured : toys.slice(0, 12);
    return [...pool].sort((a, b) => {
      const aStock = (a.available_quantity || 0) > 0 ? 1 : 0;
      const bStock = (b.available_quantity || 0) > 0 ? 1 : 0;
      return bStock - aStock;
    });
  }, [toys]);

  // Fetch ALL images for visible toys in ONE query instead of per-card
  const toyIds = useMemo(() => toysToDisplay.map((t) => t.id), [toysToDisplay]);
  const { data: bulkImages = {} } = useBulkToyImages(toyIds);

  // Early returns after all hooks
  if (isLoading || (isFetching && !toys) || toys === undefined) {
    return <ToyCarouselLoadingState />;
  }

  if (error) {
    return (
      <section className="py-14 bg-learning-blue">
        <div className="container mx-auto px-4">
          <ToyCarouselHeader />
          <div className="text-center mt-4">
            <p className="text-warm-gray/70 mb-4">Having trouble loading toys.</p>
            <Button onClick={handleForceRefresh} className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Toys
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (!toysToDisplay.length) {
    return (
      <section className="py-14 bg-learning-blue">
        <div className="container mx-auto px-4">
          <ToyCarouselHeader />
          <div className="text-center mt-4">
            <p className="text-warm-gray/70 mb-4">No toys available right now.</p>
            <Button onClick={handleForceRefresh} className="bg-primary hover:bg-primary/90">
              <RefreshCw className="w-4 h-4 mr-2" /> Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

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
                <MobileToyCarouselCard key={toy.id} toy={toy} index={index}
                  preloadedImages={bulkImages[toy.id]}
                  onViewProduct={handleViewProduct} onAddToWishlist={handleAddToWishlist} />
              ) : (
                <ToyCarouselCard key={toy.id} toy={toy} index={index}
                  preloadedImages={bulkImages[toy.id]}
                  onViewProduct={handleViewProduct} onAddToWishlist={handleAddToWishlist} />
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

ToyCarouselInner.displayName = "ToyCarouselInner";

const ToyCarousel = () => (
  <React.Suspense fallback={<ToyCarouselLoadingState />}>
    <ToyCarouselInner />
  </React.Suspense>
);

ToyCarousel.displayName = "ToyCarousel";

export default ToyCarousel;
