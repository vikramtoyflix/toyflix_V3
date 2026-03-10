import React, { Suspense } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Heart, 
  Gift, 
  ArrowRight, 
  Play,
  Shield,
  Truck,
  RefreshCw,
  Star,
  Users
} from "lucide-react";

const HeroCarousel = React.lazy(() => import("@/components/HeroCarousel"));

// Loading component
const ComponentLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center py-4">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
    <span className="ml-2 text-xs text-muted-foreground">{text}</span>
  </div>
);

const MobileHeroSection = () => {
  const navigate = useNavigate();

  const handleSubscribeClick = () => {
    // /pricing is always accessible and has clear CTAs to subscription-flow
    navigate('/pricing');
  };

  return (
    <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-toy-sky/20 via-background to-toy-mint/20 px-4 py-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-6 left-4 w-12 h-12 bg-toy-coral/20 rounded-full animate-float"></div>
        <div className="absolute top-12 right-6 w-8 h-8 bg-toy-sunshine/30 rounded-full animate-gentle-bounce"></div>
        <div className="absolute bottom-12 left-6 w-6 h-6 bg-toy-mint/25 rounded-full animate-wiggle"></div>
        <div className="absolute bottom-6 right-4 w-10 h-10 bg-toy-lavender/20 rounded-full animate-float"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto text-center space-y-4">
        {/* Badge */}
        <Badge className="bg-toy-coral/10 text-toy-coral border-toy-coral/20 px-3 py-1 text-xs font-semibold">
          <Sparkles className="w-3 h-3 mr-1" />
          India's #1 Toy Service
        </Badge>

        {/* Main Heading */}
        <div className="space-y-2">
          <h1 className="font-comic font-bold leading-tight text-2xl">
            <span className="text-primary">Endless</span>{" "}
            <span className="text-toy-coral">Fun</span>
            <br />
            <span className="text-toy-mint">Delivered</span>{" "}
            <span className="text-toy-sunshine">Monthly!</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm">
            Premium educational toys delivered to your doorstep. No clutter, just pure joy and learning!
          </p>
        </div>

        {/* Hero Image Carousel - Mobile */}
        <div className="relative py-2">
          <Suspense fallback={<ComponentLoader text="Loading images..." />}>
            <HeroCarousel isMobile={true} />
          </Suspense>
        </div>

        {/* Stats - More compact */}
        <div className="grid grid-cols-3 gap-2 py-2">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">50K+</div>
            <div className="text-xs text-muted-foreground">Families</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-toy-coral">1000+</div>
            <div className="text-xs text-muted-foreground">Toys</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-toy-mint">5★</div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
        </div>

        {/* CTA Buttons - More compact */}
        <div className="flex flex-col gap-2">
          <Button 
            size="sm"
            onClick={() => navigate('/pricing')}
            className="w-full bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Start Your Journey
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            onClick={handleSubscribeClick}
            size="sm"
            type="button"
            className="w-full bg-gradient-to-r from-toy-mint to-toy-sky hover:from-toy-mint/90 hover:to-toy-sky/90 text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Gift className="w-4 h-4 mr-2" />
            Subscribe Now
          </Button>
        </div>

        {/* Trust Indicators - More compact */}
        <div className="grid grid-cols-3 gap-1 pt-2">
          <div className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-green-500" />
            <span>100% Safe</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <Truck className="w-3 h-3 text-blue-500" />
            <span>Free Delivery</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 text-purple-500" />
            <span>Monthly Fresh</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileHeroSection; 