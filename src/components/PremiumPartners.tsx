import React from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const PremiumPartners = () => {
  const isMobile = useIsMobile();

  const partners = [
    {
      name: "PlayShifu",
      logo: "/lovable-uploads/e899c4c1-a8a6-45ee-a87f-7a137acd5a5c.webp",
      alt: "PlayShifu - Educational AR toys"
    },
    {
      name: "Funskool",
      logo: "/lovable-uploads/4a5c080f-acd2-46da-a754-82b954dcd0fd.webp",
      alt: "Funskool - Fun learning toys"
    },
    {
      name: "Hape",
      logo: "/lovable-uploads/89bf9009-a482-4be0-a723-a5507be7e0dd.webp",
      alt: "Hape - Wooden educational toys"
    },
    {
      name: "PLAY",
      logo: "/lovable-uploads/664b0b05-233b-4283-bc83-c91551fb2c10.webp",
      alt: "PLAY - Creative learning toys"
    },
    {
      name: "Hasbro",
      logo: "/partners/hasbro-logo.webp",
      alt: "Hasbro - Toys and games"
    },
    {
      name: "Mattel",
      logo: "/partners/mattel-logo.webp",
      alt: "Mattel - Toy manufacturer"
    },
    {
      name: "Baybee",
      logo: "/partners/baybee-logo.webp",
      alt: "Baybee - Baby and kids brand"
    },
    {
      name: "Fisher-Price",
      logo: "/partners/fisher-price-logo.webp",
      alt: "Fisher-Price - Infant and toddler toys"
    }
  ];

  return (
    <section className={`${isMobile ? 'py-12' : 'py-16'} bg-white`}>
      <div className={`container mx-auto ${isMobile ? 'px-4' : 'px-4'}`}>
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Our Premium Partners
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            We partner with the world's leading toy brands to bring you the best quality toys
          </p>
        </div>
        
        <Carousel
          opts={{
            align: "center",
            loop: true,
            dragFree: true,
          }}
          plugins={[Autoplay({ delay: 2500, stopOnInteraction: true }) as any]}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {partners.map((partner, index) => (
              <CarouselItem 
                key={partner.name} 
                className={`pl-3 md:pl-4 ${
                  isMobile 
                    ? 'basis-1/2' 
                    : 'basis-1/2 md:basis-1/3 lg:basis-1/4'
                }`}
              >
                <div
                  className={`
                    group relative bg-white rounded-xl shadow-md border border-gray-100 
                    hover:shadow-lg hover:border-primary/20 transition-all duration-300
                    hover:scale-105 p-6 md:p-8 w-full flex items-center justify-center
                    ${isMobile ? 'h-24' : 'h-28 md:h-32'}
                  `}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <img
                    src={partner.logo}
                    alt={partner.alt}
                    width={150}
                    height={80}
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain filter group-hover:brightness-110 transition-all duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/150x80/f3f4f6/9ca3af?text=${encodeURIComponent(partner.name)}`;
                    }}
                  />
                  
                  {/* Subtle glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Brand name tooltip on hover */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
                    {partner.name}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation buttons */}
          {!isMobile && (
            <>
              <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300" />
              <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white border-2 border-primary/20 hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300" />
            </>
          )}
        </Carousel>
      </div>
    </section>
  );
};

export default PremiumPartners;
