import React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const DEVELOPMENTAL_IMAGES = [
  { src: "/lovable-uploads/developmental-1.png", alt: "Play that matches your child's growing mind" },
  { src: "/lovable-uploads/developmental-2.png", alt: "Creativity & Confidence - Pretend Play & Self-Expression" },
  { src: "/lovable-uploads/developmental-3.png", alt: "Problem-Solving - Sorting, Puzzles & Early Logic" },
  { src: "/lovable-uploads/developmental-4.png", alt: "Language & Communication - Babbling, First Words & Listening" },
];

const DevelopmentalImagesCarousel = () => {
  return (
    <section className="w-full bg-white py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 3500, stopOnInteraction: true }) as any]}
          className="w-full max-w-5xl mx-auto"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {DEVELOPMENTAL_IMAGES.map((img, index) => (
              <CarouselItem
                key={index}
                className="pl-2 md:pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3"
              >
                <div className="relative overflow-hidden rounded-xl shadow-md aspect-[3/4] sm:aspect-[4/5]">
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full h-full object-cover object-center"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
};

export default DevelopmentalImagesCarousel;
