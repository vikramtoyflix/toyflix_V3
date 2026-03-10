import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  ArrowRight,
  Shield,
  Truck,
  RefreshCw,
  Gift,
  Heart
} from "lucide-react";

// Mobile-optimized hero slides
const mobileHeroSlides = [
  {
    id: "mobile-hero-1",
    badge: "India's #1 Toy Service",
    title: "Endless Fun Delivered Monthly!",
    subtitle: "Premium educational toys delivered to your doorstep. No clutter, just pure joy and learning!",
    primaryButton: {
      text: "Start Your Journey",
      link: "/pricing"
    },
    secondaryButton: {
      text: "Subscribe Now",
      link: "/subscription-flow"
    },
    backgroundImage: "/lovable-uploads/2dfe92ac-e423-4160-88e2-2261bb2cf3c9.webp",
    stats: [
      { value: "50K+", label: "Families" },
      { value: "1000+", label: "Toys" },
      { value: "5★", label: "Rating" }
    ]
  },
  {
    id: "mobile-hero-2",
    badge: "100% Safe & Clean",
    title: "Play. Learn. Grow.",
    subtitle: "Educational toys that spark imagination and support development at every stage of childhood.",
    primaryButton: {
      text: "Explore Toys",
      link: "/toys"
    },
    secondaryButton: {
      text: "See Pricing",
      link: "/pricing"
    },
    backgroundImage: "/lovable-uploads/24fc8b24-7557-4694-9dd5-a1f5f4232b57.webp",
    stats: [
      { value: "100%", label: "Safe" },
      { value: "Age", label: "Appropriate" },
      { value: "Free", label: "Delivery" }
    ]
  },
  {
    id: "mobile-hero-3",
    badge: "Zero Clutter Solution",
    title: "No Clutter, Just Fun!",
    subtitle: "Rotating library of toys keeps playtime fresh while your home stays organized and clean.",
    primaryButton: {
      text: "How It Works",
      link: "/about"
    },
    secondaryButton: {
      text: "Get Started",
      link: "/subscription-flow"
    },
    backgroundImage: "/lovable-uploads/14d1772e-d757-40e5-968f-2539da2e5ea1.webp",
    stats: [
      { value: "Monthly", label: "Fresh" },
      { value: "No", label: "Clutter" },
      { value: "Easy", label: "Returns" }
    ]
  }
];

const MobileHeroCarousel = () => {
  const navigate = useNavigate();

  const handleNavigation = (link: string) => {
    // /pricing is always accessible; subscription-flow requires auth
    if (link === '/subscription-flow') {
      navigate('/pricing');
      return;
    }
    navigate(link);
  };

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      plugins={[Autoplay({ delay: 4000, stopOnInteraction: true }) as any]}
      className="w-full"
    >
      <CarouselContent>
        {mobileHeroSlides.map((slide, index) => (
          <CarouselItem key={slide.id}>
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden px-4 py-6">
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${slide.backgroundImage})`
                }}
              />
              
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-toy-sky/30 via-transparent to-toy-mint/30"></div>

              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden z-5">
                <div className="absolute top-6 left-4 w-12 h-12 bg-toy-coral/20 rounded-full animate-float"></div>
                <div className="absolute top-12 right-6 w-8 h-8 bg-toy-sunshine/30 rounded-full animate-gentle-bounce"></div>
                <div className="absolute bottom-12 left-6 w-6 h-6 bg-toy-mint/25 rounded-full animate-wiggle"></div>
                <div className="absolute bottom-6 right-4 w-10 h-10 bg-toy-lavender/20 rounded-full animate-float"></div>
              </div>

              <div className="relative z-10 w-full max-w-sm mx-auto text-center space-y-4">
                {/* Badge */}
                <Badge className="bg-white/20 text-white border-white/30 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {slide.badge}
                </Badge>

                {/* Main Heading */}
                <div className="space-y-2">
                  <h1 className="font-comic font-bold leading-tight text-2xl text-white drop-shadow-2xl">
                    {slide.title.split(' ').map((word, i) => {
                      const colors = ['text-white', 'text-toy-coral', 'text-toy-mint', 'text-toy-sunshine'];
                      return (
                        <span key={i} className={`${colors[i % colors.length]} drop-shadow-lg`}>
                          {word}{' '}
                        </span>
                      );
                    })}
                  </h1>
                  <p className="text-white/90 leading-relaxed text-sm drop-shadow-lg">
                    {slide.subtitle}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 py-4">
                  {slide.stats.map((stat, statIndex) => (
                    <div key={statIndex} className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-2">
                      <div className="text-lg font-bold text-white drop-shadow-lg">{stat.value}</div>
                      <div className="text-xs text-white/80">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleNavigation(slide.primaryButton.link)}
                    className="w-full bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white font-semibold py-3 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  >
                    {slide.primaryButton.text}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleNavigation(slide.secondaryButton.link)}
                    className="w-full border-2 border-white/40 hover:border-white/60 font-semibold py-3 rounded-full text-white hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm shadow-xl"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    {slide.secondaryButton.text}
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="grid grid-cols-3 gap-1 pt-2">
                  <div className="flex flex-col items-center gap-0.5 text-xs text-white/90 bg-white/10 backdrop-blur-sm rounded-lg py-2">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span>100% Safe</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-xs text-white/90 bg-white/10 backdrop-blur-sm rounded-lg py-2">
                    <Truck className="w-3 h-3 text-blue-400" />
                    <span>Free Delivery</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 text-xs text-white/90 bg-white/10 backdrop-blur-sm rounded-lg py-2">
                    <RefreshCw className="w-3 h-3 text-purple-400" />
                    <span>Monthly Fresh</span>
                  </div>
                </div>
              </div>
            </section>
          </CarouselItem>
        ))}
      </CarouselContent>
      
      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {mobileHeroSlides.map((_, index) => (
          <div
            key={index}
            className="w-2 h-2 bg-white/50 rounded-full"
          />
        ))}
      </div>
    </Carousel>
  );
};

export default MobileHeroCarousel; 