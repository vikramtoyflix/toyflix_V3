import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchTestimonialsFromSupabase,
  getDefaultVideoTestimonials,
} from "@/services/testimonialsService";

const FALLBACK_VIDEO_URL = "https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/testimonials/Nithin.mp4";

function TestimonialsMinimalFallback() {
  return (
    <section className="py-10 md:py-16 bg-trust-mint">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <p className="font-outfit text-sm font-medium text-terracotta uppercase tracking-wide mb-2">Testimonials</p>
          <h2 className="font-playfair font-bold text-warm-gray text-2xl md:text-4xl max-w-2xl mx-auto">
            What parents say about us
          </h2>
        </div>
        <div className="max-w-[320px] mx-auto rounded-lg overflow-hidden bg-black aspect-[9/16]">
          <video
            src={FALLBACK_VIDEO_URL}
            controls
            playsInline
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        <p className="text-center text-warm-gray/80 mt-4 text-sm">Hear from families who love Toyflix</p>
      </div>
    </section>
  );
}

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar?: string;
  childAge?: string;
  planType?: string;
  imageUrl?: string;
  videoUrl?: string;
}

// Default list with video URLs – used when loading or when fetch fails (safe, never throws)
function getDefaultList(): Testimonial[] {
  try {
    return getDefaultVideoTestimonials() as Testimonial[];
  } catch {
    return [{
      id: "fallback",
      name: "Customer",
      location: "Bangalore",
      rating: 5,
      text: "",
      videoUrl: "https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/testimonials/Nithin.mp4",
    }];
  }
}

const TestimonialsCarousel = () => {
  const isMobile = useIsMobile();
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const { data: supabaseTestimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: fetchTestimonialsFromSupabase,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const list: Testimonial[] = React.useMemo(() => {
    const fromSupabase = Array.isArray(supabaseTestimonials) && supabaseTestimonials.length > 0
      ? (supabaseTestimonials as Testimonial[])
      : null;
    return fromSupabase ?? getDefaultList();
  }, [supabaseTestimonials]);

  const safeSelectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, list.length - 1));
  const [autoplayEnabled, setAutoplayEnabled] = React.useState(false);
  const [videoActivated, setVideoActivated] = React.useState<Set<string>>(new Set());
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(true);
  const carouselApiRef = React.useRef<CarouselApi | null>(null);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);

  const setApi = React.useCallback((api: CarouselApi | undefined) => {
    if (!api) return;
    carouselApiRef.current = api;
    const snap = api.selectedScrollSnap();
    setSelectedIndex(typeof snap === "number" && Number.isFinite(snap) ? snap : 0);
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
    api.on("select", () => {
      const s = api.selectedScrollSnap();
      setSelectedIndex(typeof s === "number" && Number.isFinite(s) ? s : 0);
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    });
  }, []);

  const stopAutoplay = React.useCallback(() => setAutoplayEnabled(false), []);

  const pauseAllOtherVideos = React.useCallback((currentVideo: HTMLVideoElement) => {
    videoRefs.current.forEach((el) => {
      if (el && el !== currentVideo) {
        el.pause();
      }
    });
  }, []);

  const handleVideoPlay = React.useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      stopAutoplay();
      pauseAllOtherVideos(e.currentTarget);
    },
    [stopAutoplay, pauseAllOtherVideos]
  );

  const handlePrev = () => {
    stopAutoplay();
    const prevIndex = safeSelectedIndex;
    videoRefs.current[prevIndex]?.pause();
    videoRefs.current[prevIndex] && (videoRefs.current[prevIndex]!.currentTime = 0);
    carouselApiRef.current?.scrollPrev();
  };
  const handleNext = () => {
    stopAutoplay();
    const prevIndex = safeSelectedIndex;
    videoRefs.current[prevIndex]?.pause();
    videoRefs.current[prevIndex] && (videoRefs.current[prevIndex]!.currentTime = 0);
    carouselApiRef.current?.scrollNext();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? "fill-toy-sunshine text-toy-sunshine" : "text-gray-300"
        }`}
      />
    ));
  };

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== "string") return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  return (
    <section className={`${isMobile ? 'py-10' : 'py-16'} bg-trust-mint`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-12'}`}>
          <p className="font-outfit text-sm font-medium text-terracotta uppercase tracking-wide mb-2">
            Testimonials
          </p>
          <h2 className={`font-playfair font-bold text-warm-gray ${isMobile ? 'text-2xl' : 'text-4xl'} max-w-2xl mx-auto`}>
            What parents say about us
          </h2>
          <p className={`text-warm-gray/70 mt-2 max-w-xl mx-auto ${isMobile ? 'text-sm' : 'text-base'}`}>
            Join thousands of families who love stress-free, educational play.
          </p>
          <div className={`flex flex-wrap justify-center gap-3 mt-4 ${isMobile ? 'mb-2' : 'mb-4'}`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-medium text-warm-gray">
              <Star className="w-4 h-4 text-toy-sunshine fill-toy-sunshine" />
              4.9/5
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-medium text-warm-gray">
              <Users className="w-4 h-4 text-terracotta" />
              50,000+ families
            </span>
          </div>
        </div>

        <Carousel
          className="w-full max-w-7xl mx-auto"
          opts={{
            align: "start",
            loop: true,
            slidesToScroll: isMobile ? 1 : 2,
          }}
          plugins={autoplayEnabled ? [Autoplay({ delay: 3500, stopOnInteraction: true }) as any] : []}
          setApi={setApi}
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {(list.length ? list : getDefaultList()).map((testimonial, index) => {
              if (!testimonial || !testimonial.id) return null;
              const isSelected = index === selectedIndex;
              const hasMedia = !!(testimonial.imageUrl || testimonial.videoUrl);
              return (
              <CarouselItem key={String(testimonial.id)} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                <Card className="group h-full shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-toy-coral/20 via-toy-sunshine/20 to-toy-mint/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                  <CardContent className="p-0 flex flex-col h-full relative z-10">
                    {hasMedia ? (
                      <>
                        {/* Supabase video / image */}
                        <div className={`relative w-full bg-black rounded-t-lg flex-shrink-0 ${
                          testimonial.videoUrl
                            ? "aspect-[9/16] w-full max-w-[280px] sm:max-w-[320px] mx-auto"
                            : "aspect-[4/3] sm:aspect-video"
                        }`}>
                          {testimonial.imageUrl && (
                            <img
                              src={testimonial.imageUrl}
                              alt={`${testimonial.name}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {testimonial.videoUrl && !testimonial.imageUrl && (
                            <>
                              <video
                                ref={(el) => {
                                  videoRefs.current[index] = el;
                                }}
                                key={testimonial.id}
                                src={testimonial.videoUrl}
                                preload="metadata"
                                controls
                                playsInline
                                onPlay={handleVideoPlay}
                                className="w-full h-full object-contain bg-black"
                              >
                                Your browser does not support the video tag.
                              </video>
                              {!videoActivated.has(testimonial.id) && (
                                <button
                                  type="button"
                                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer"
                                  onClick={() => {
                                    stopAutoplay();
                                    setVideoActivated((prev) => new Set(prev).add(testimonial.id));
                                    videoRefs.current[index]?.play();
                                  }}
                                  aria-label="Tap to play video"
                                >
                                  <span className="rounded-full bg-white/95 text-warm-gray px-5 py-2.5 text-sm font-semibold shadow-lg">
                                    Tap to play
                                  </span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        {/* Name + child age only */}
                        <div className="p-4 text-center">
                          <div className="font-semibold text-warm-gray">{testimonial.name}</div>
                          {testimonial.childAge && (
                            <div className="text-sm text-warm-gray/70 mt-0.5">Child: {testimonial.childAge}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* Text-only testimonial: keep quote, rating, etc. */
                      <>
                        <div className="p-6 sm:p-8 flex flex-col flex-grow">
                          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-toy-coral/20 to-toy-sunshine/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 z-10">
                            <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-toy-coral" />
                          </div>
                          <div className="flex items-center mb-4">
                            {renderStars(testimonial.rating)}
                            <Badge variant="secondary" className="ml-3 text-xs">Verified Review</Badge>
                          </div>
                          <blockquote className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 flex-grow font-medium">
                            "{testimonial.text}"
                          </blockquote>
                          <div className="space-y-4">
                            <div className="flex items-center">
                              <Avatar className="h-14 w-14 mr-4 ring-2 ring-toy-coral/20 group-hover:ring-toy-coral/40 transition-all duration-300">
                                <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                                <AvatarFallback className="bg-gradient-to-br from-toy-coral to-toy-sunshine text-white font-bold text-lg">
                                  {getInitials(testimonial.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-bold text-primary text-base">{testimonial.name}</div>
                                <div className="text-muted-foreground text-sm flex items-center gap-2">
                                  <span>{testimonial.location}</span>
                                  {testimonial.childAge && (
                                    <>
                                      <span>•</span>
                                      <span>Child: {testimonial.childAge}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            {testimonial.planType && (
                              <Badge variant="outline" className="bg-gradient-to-r from-toy-mint/10 to-toy-sky/10 border-toy-mint/30 text-toy-mint font-medium">
                                {testimonial.planType}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </CarouselItem>
            );
            })}
          </CarouselContent>
          
          {/* Custom prev/next arrows */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canScrollPrev}
            aria-label="Previous"
            className="absolute left-2 sm:left-4 md:-left-14 top-1/2 -translate-y-1/2 z-20 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 disabled:opacity-40 disabled:pointer-events-none text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canScrollNext}
            aria-label="Next"
            className="absolute right-2 sm:right-4 md:-right-14 top-1/2 -translate-y-1/2 z-20 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 disabled:opacity-40 disabled:pointer-events-none text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </Carousel>
      </div>
    </section>
  );
}

function TestimonialsCarouselWithBoundary() {
  return (
    <ErrorBoundary fallbackRender={() => <TestimonialsMinimalFallback />}>
      <TestimonialsCarousel />
    </ErrorBoundary>
  );
}

export default TestimonialsCarouselWithBoundary;