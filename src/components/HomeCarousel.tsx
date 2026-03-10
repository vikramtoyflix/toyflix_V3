import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { imageService } from "@/services/imageService";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowRight } from "lucide-react";

const staticSlides = [
  {
    id: "static-1",
    image_url: "/lovable-uploads/2dfe92ac-e423-4160-88e2-2261bb2cf3c9.webp",
    title: "New adventures every month.",
    subtitle: "Curated toy boxes delivered to your door. Subscribe and let their imagination soar.",
    button_text: "See pricing",
    button_link: "/pricing",
    secondary_button_text: "How it works",
    secondary_button_link: "/about",
  },
  {
    id: "static-2",
    image_url: "/lovable-uploads/24fc8b24-7557-4694-9dd5-a1f5f4232b57.webp",
    title: "Play. Learn. Grow.",
    subtitle: "Premium, educational toys chosen for your child's age and interests.",
    button_text: "Get started",
    button_link: "/subscription-flow",
    secondary_button_text: "Explore toys",
    secondary_button_link: "/toys",
  },
  {
    id: "static-3",
    image_url: "/lovable-uploads/14d1772e-d757-40e5-968f-2539da2e5ea1.webp",
    title: "Endless fun, zero clutter.",
    subtitle: "Rotate toys every month. Fresh play, less mess.",
    button_text: "How it works",
    button_link: "/about",
    secondary_button_text: "Pricing",
    secondary_button_link: "/pricing",
  },
];

const HomeCarousel = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: slides, isLoading, isError } = useQuery({
    queryKey: ["homeCarouselSlides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const displaySlides =
    isError || !slides || slides.length === 0 ? staticSlides : slides;

  const handleNavigation = (link: string) => {
    // /pricing is always accessible; subscription-flow requires auth
    if (link === "/subscription-flow") {
      navigate("/pricing");
      return;
    }
    navigate(link);
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <AspectRatio
          ratio={4 / 3}
          className="sm:aspect-[3/2] md:aspect-[16/9] lg:aspect-[21/9]"
        >
          <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
        </AspectRatio>
      </div>
    );
  }

  return (
    <Carousel
      plugins={[Autoplay({ delay: 4000, stopOnInteraction: true }) as any]}
      className="w-full bg-[linear-gradient(180deg,#FEF3E7_0%,#FFF_100%)]"
    >
      <CarouselContent>
        {displaySlides.map((slide, index) => (
          <CarouselItem key={(slide as any).id || index}>
            <div className="w-full">
              <AspectRatio
                ratio={4 / 3}
                className="sm:aspect-[3/2] md:aspect-[16/9] lg:aspect-[21/9]"
              >
                <div className="group relative w-full h-full flex items-center justify-center overflow-hidden">
                  <img
                    src={imageService.getImageUrl(slide.image_url, "carousel")}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-10">
                    <div className="max-w-2xl">
                      <h2 className="font-playfair font-bold text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-2 md:mb-3 leading-tight">
                        {slide.title}
                      </h2>
                      <p className="text-white/90 text-sm sm:text-base md:text-lg mb-5 md:mb-6 max-w-lg">
                        {slide.subtitle}
                      </p>
                      <div className="flex">
                        <Button
                          size={isMobile ? "default" : "lg"}
                          onClick={() => handleNavigation("/about")}
                          className="bg-cta-coral hover:bg-cta-coral/90 text-white font-outfit font-semibold rounded-full shadow-md hover:shadow-lg"
                        >
                          How it works
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </AspectRatio>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};

export default HomeCarousel;
