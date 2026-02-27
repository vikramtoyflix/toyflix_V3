import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { cn } from '@/lib/utils';

interface MobileCarouselProps {
  children: React.ReactNode;
  className?: string;
  autoplay?: boolean;
  delay?: number;
}

const MobileCarousel = ({ 
  children, 
  className = "",
  autoplay = true,
  delay = 3000
}: MobileCarouselProps) => {
  const plugins = autoplay ? [
    Autoplay({
      delay,
      stopOnInteraction: true,
      stopOnMouseEnter: false, // Keep autoplay on mobile
    }) as any,
  ] : [];

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
        dragFree: true, // Allow free dragging on mobile
      }}
      plugins={plugins}
      className={cn("w-full touch-pan-x", className)}
    >
      <CarouselContent className="-ml-2">
        {children}
      </CarouselContent>
    </Carousel>
  );
};

export default MobileCarousel;
