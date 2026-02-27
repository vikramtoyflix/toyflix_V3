import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { ArrowRight } from "lucide-react";

interface HeroCarouselProps {
  isMobile?: boolean;
}

const heroSlides = [
  {
    id: "hero-1",
    tagline: "India's #1 Toy Subscription",
    title: "Endless fun, delivered.",
    subtitle: "Premium, educational toys at your door every month. No clutter—just play and learning.",
    cta: "Start your journey",
    link: "/pricing",
    backgroundImage: "/lovable-uploads/2dfe92ac-e423-4160-88e2-2261bb2cf3c9.png",
  },
  {
    id: "hero-2",
    tagline: "Play. Learn. Grow.",
    title: "Curated for every age.",
    subtitle: "Safety-tested, sanitized toys chosen for your child's stage. You pick 3 toys + 1 book each month.",
    cta: "Explore toys",
    link: "/toys",
    backgroundImage: "/lovable-uploads/24fc8b24-7557-4694-9dd5-a1f5f4232b57.png",
  },
  {
    id: "hero-3",
    tagline: "Zero clutter",
    title: "Fresh toys every month.",
    subtitle: "Return and swap anytime. Keep playtime exciting and your home organised.",
    cta: "See how it works",
    link: "/about",
    backgroundImage: "/lovable-uploads/14d1772e-d757-40e5-968f-2539da2e5ea1.png",
  },
];

const HeroCarousel: React.FC<HeroCarouselProps> = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const { user } = useCustomAuth();

  const handleNavigation = (link: string) => {
    if (link === "/subscription-flow" && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(link)}`);
      return;
    }
    navigate(link);
  };

  return (
    <Carousel
      opts={{ align: "start", loop: true }}
      plugins={[Autoplay({ delay: 5500, stopOnInteraction: true }) as any]}
      className="w-full bg-[linear-gradient(180deg,#FEF3E7_0%,#FFF_100%)]"
    >
      <CarouselContent>
        {heroSlides.map((slide, slideIndex) => (
          <CarouselItem key={slide.id}>
            <section className="relative min-h-[85vh] flex items-center overflow-hidden">
              {/* Use <picture> with WebP for modern browsers, PNG fallback; fetchpriority for LCP */}
              <picture className="absolute inset-0 w-full h-full">
                <source
                  srcSet={slide.backgroundImage.replace(/\.(png|jpg|jpeg)$/i, '.webp')}
                  type="image/webp"
                />
                <img
                  src={slide.backgroundImage}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover object-center"
                  fetchPriority={slideIndex === 0 ? "high" : "low"}
                  loading={slideIndex === 0 ? "eager" : "lazy"}
                  decoding={slideIndex === 0 ? "sync" : "async"}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

              <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div
                  className={`max-w-2xl ${isMobile ? "text-center" : "text-left"}`}
                >
                  <p className="font-outfit text-sm font-medium tracking-wide text-white/90 uppercase mb-3">
                    {slide.tagline}
                  </p>
                  <h1 className="font-playfair font-bold text-white leading-tight mb-4 text-4xl sm:text-5xl lg:text-6xl">
                    {slide.title}
                  </h1>
                  <p
                    className={`text-white/90 text-lg sm:text-xl max-w-xl mb-8 leading-relaxed ${isMobile ? "mx-auto" : ""}`}
                  >
                    {slide.subtitle}
                  </p>
                  <Button
                    size="lg"
                    onClick={() => handleNavigation(slide.link)}
                    className="bg-cta-coral hover:bg-cta-coral/90 text-white font-outfit font-semibold px-6 py-3 rounded-full shadow-lg transition-all duration-200"
                  >
                    {slide.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </section>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {heroSlides.map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/60"
            aria-hidden
          />
        ))}
      </div>
    </Carousel>
  );
};

export default HeroCarousel;
