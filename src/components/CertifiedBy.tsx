import React, { useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { useIsMobile } from "@/hooks/use-mobile";
import { imageService } from "@/services/imageService";
import { Shield, Award, BadgeCheck } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const CertifiedBy = () => {
  const isMobile = useIsMobile();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const certifications = [
    {
      name: "NITI Aayog",
      logo: "/lovable-uploads/ef3ba8fc-f8b6-4d66-890c-2701a58c2cfd.webp",
      fallback: imageService.getImageUrl(
        "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?q=80&w=400&auto=format&fit=crop",
        "product"
      ),
      alt: "NITI Aayog - Atal Innovation Mission - Government of India certification",
      tag: "Govt. of India",
    },
    {
      name: "TOYFLIX Certificate",
      logo: "/lovable-uploads/5a9d3556-59cb-4840-8097-fe4fbc07c8a9.webp",
      fallback: imageService.getImageUrl(
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=400&auto=format&fit=crop",
        "product"
      ),
      alt: "TOYFLIX - Startup Spotlight certification",
      tag: "Startup Spotlight",
    },
    {
      name: "Startup India",
      logo: "/lovable-uploads/93a723d2-7931-4a97-83cb-6112a6153d5a.webp",
      fallback: imageService.getImageUrl(
        "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=400&auto=format&fit=crop",
        "product"
      ),
      alt: "#startupindia - Government of India initiative",
      tag: "#StartupIndia",
    },
  ];

  const handleImageError = (certName: string) => {
    setImageErrors((prev) => ({ ...prev, [certName]: true }));
  };

  const getImageSource = (cert: (typeof certifications)[0]) =>
    imageErrors[cert.name] ? cert.fallback : cert.logo;

  return (
    <section
      className={`relative overflow-hidden ${isMobile ? "py-10" : "py-12"} bg-white`}
      id="certified-by"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-24 bg-gradient-to-b from-terracotta/5 to-transparent" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className={`text-center ${isMobile ? "mb-6" : "mb-8"}`}>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-terracotta/10 text-terracotta px-3 py-1.5 mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-outfit text-[11px] font-semibold uppercase tracking-widest">
              Certified & Recognized
            </span>
          </div>
          <h2 className="font-playfair font-bold text-warm-gray text-xl sm:text-2xl lg:text-3xl max-w-lg mx-auto leading-tight">
            Trusted by institutions
          </h2>
          <p className="text-warm-gray/60 mt-2 max-w-md mx-auto text-sm">
            Government & certified bodies for quality and innovation.
          </p>
        </div>

        {/* Certification logos: scrolling carousel, large logos for readability */}
        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "center",
              loop: true,
              dragFree: true,
            }}
            plugins={[Autoplay({ delay: 3000, stopOnInteraction: true }) as any]}
            className="w-full"
          >
            <CarouselContent className="-ml-3 sm:-ml-4">
              {certifications.map((cert) => (
                <CarouselItem
                  key={cert.name}
                  className="pl-3 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3"
                >
                  <div className="group relative bg-cream/60 rounded-xl border border-black/5 overflow-hidden hover:border-terracotta/15 hover:shadow-md transition-all duration-200">
                    <div className="h-0.5 w-full bg-gradient-to-r from-terracotta/30 via-toy-coral/30 to-toy-sunshine/30" />
                    <div className="p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center min-h-[180px] sm:min-h-[200px] md:min-h-[220px]">
                      <div className="relative w-full flex items-center justify-center flex-1 min-h-[100px] sm:min-h-[120px] md:min-h-[140px]">
                        <img
                          src={getImageSource(cert)}
                          alt={cert.alt}
                          onError={() => handleImageError(cert.name)}
                          className="max-h-20 sm:max-h-24 md:max-h-28 lg:max-h-32 w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px] object-contain"
                          loading="lazy"
                        />
                        {imageErrors[cert.name] && (
                          <span className="text-sm font-outfit font-semibold text-warm-gray/80 text-center">
                            {cert.name}
                          </span>
                        )}
                      </div>
                      {cert.tag && (
                        <span className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-outfit font-medium text-warm-gray/55">
                          <BadgeCheck className="w-3.5 h-3.5 text-terracotta flex-shrink-0" />
                          {cert.tag}
                        </span>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-2 sm:-left-4 md:-left-12 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/90 border border-black/10 hover:bg-white shadow-md text-warm-gray hover:text-terracotta" />
            <CarouselNext className="absolute -right-2 sm:-right-4 md:-right-12 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/90 border border-black/10 hover:bg-white shadow-md text-warm-gray hover:text-terracotta" />
          </Carousel>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-6 pt-5 border-t border-black/5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warm-gray/60">
            <Award className="w-3.5 h-3.5 text-terracotta" />
            Verified platform
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-warm-gray/60">
            <Shield className="w-3.5 h-3.5 text-toy-mint" />
            Trusted by families
          </span>
        </div>
      </div>
    </section>
  );
};

export default CertifiedBy;
