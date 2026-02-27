import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  Package,
  Truck,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Choose Your Plan",
    description: "Select the perfect subscription plan based on your child's age and interests",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Heart,
    title: "You Curate",
    description: "Select 3 toys and 1 book of your choice each month from our premium collection",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Package,
    title: "Packed with Love",
    description: "Each toy is sanitized, safety-tested, and beautifully packaged just for you",
    color: "from-purple-500 to-toy-lavender",
  },
  {
    icon: Truck,
    title: "Doorstep Delivery",
    description: "Free delivery straight to your home - no hassle, no extra charges",
    color: "from-emerald-500 to-toy-mint",
  },
  {
    icon: RefreshCw,
    title: "Monthly Refresh",
    description: "Get fresh toys every month to keep playtime exciting and engaging",
    color: "from-toy-coral to-toy-sunshine",
  },
];

const RADIUS = 42;

function getCirclePosition(index: number, total: number, radiusPercent: number) {
  const angleDeg = 270 + index * (360 / total);
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = 50 + radiusPercent * Math.cos(angleRad);
  const y = 50 + radiusPercent * Math.sin(angleRad);
  return { x, y };
}

const WhyChooseUs = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <section
      className={`relative overflow-hidden ${isMobile ? "py-14" : "py-24"} bg-warm-cream`}
      id="how-it-works"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-terracotta/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-toy-mint/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className={`text-center ${isMobile ? "mb-8" : "mb-12"}`}>
          <span className="inline-block font-outfit text-sm font-semibold text-terracotta uppercase tracking-widest mb-4 px-4 py-1.5 rounded-full bg-terracotta/10">
            How it works
          </span>
          <h2 className="font-playfair font-bold text-warm-gray text-3xl sm:text-4xl lg:text-5xl max-w-2xl mx-auto leading-tight">
            Getting started with Toyflix is simple
          </h2>
          <p className="text-warm-gray/70 mt-4 max-w-lg mx-auto text-base">
            Follow these easy steps to bring joy and learning to your home.
          </p>
        </div>

        {/* Circular layout: dotted line rotates, steps around center logo */}
        <div className="mt-14 sm:mt-20 lg:mt-24 flex justify-center overflow-visible">
          <div className="relative w-full max-w-[min(100%,340px)] sm:max-w-xl md:max-w-3xl lg:max-w-4xl aspect-square max-h-[480px] sm:max-h-[540px] lg:max-h-[600px] overflow-visible">
            <svg
              className="absolute inset-0 w-full h-full text-warm-gray/50"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
            >
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="6 10"
                className="animate-rotate-dash"
              />
            </svg>

            <div className="absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg ring-2 sm:ring-4 ring-terracotta/10 w-[26%] h-[26%] min-w-[56px] min-h-[56px] sm:min-w-[80px] sm:min-h-[80px] lg:min-w-[100px] lg:min-h-[100px] overflow-hidden">
              <picture>
                <source srcSet="/toyflix-icon.webp" type="image/webp" />
                <img
                  src="/toyflix-icon.jpg"
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                  width="512"
                  height="512"
                />
              </picture>
            </div>

            {steps.map((step, index) => {
              const Icon = step.icon;
              const { x, y } = getCirclePosition(index, steps.length, RADIUS);
              return (
                <div
                  key={index}
                  className="absolute z-10 flex flex-col items-center overflow-visible"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`relative z-20 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-white shadow-lg border border-black/5 flex items-center justify-center mb-1.5 sm:mb-3 bg-gradient-to-br ${step.color} hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-visible`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                    <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-warm-gray text-white text-[8px] sm:text-[10px] font-bold flex items-center justify-center shadow z-10">
                      {index + 1}
                    </span>
                  </div>
                  <div
                    className={`text-center bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 w-[88px] sm:w-[130px] lg:w-[180px] shadow-sm border border-black/5 hover:shadow-lg hover:border-terracotta/20 transition-all duration-300 hover:-translate-y-1`}
                  >
                    <h3 className="font-outfit font-semibold text-warm-gray text-[10px] sm:text-sm mb-0.5 sm:mb-1 leading-tight">
                      {step.title}
                    </h3>
                    {"subtitle" in step && step.subtitle && (
                      <p className="font-outfit font-medium text-warm-gray/80 text-[9px] sm:text-xs mb-0.5 sm:mb-1 leading-tight">
                        {step.subtitle}
                      </p>
                    )}
                    <p className="text-warm-gray/60 text-[9px] sm:text-xs leading-snug sm:leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      <style>{`
        @keyframes rotate-dash {
          to { stroke-dashoffset: -16; }
        }
        .animate-rotate-dash {
          animation: rotate-dash 1.5s linear infinite;
        }
      `}</style>

        <div className="text-center mt-16 sm:mt-20">
          <Button
            size={isMobile ? "default" : "lg"}
            onClick={() => navigate("/pricing")}
            className="w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white font-outfit font-semibold rounded-full px-8 sm:px-10 py-3.5 sm:py-4 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Start your journey
            <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
          </Button>
        </div>
      </div>

    </section>
  );
};

export default WhyChooseUs;
