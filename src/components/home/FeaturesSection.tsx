import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { homeFeatures } from "@/constants/features";

export const FeaturesSection = React.memo(() => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setIsInView(e.isIntersecting),
      { threshold: 0.12, rootMargin: "0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden ${isMobile ? "py-14" : "py-24"} bg-hospital-mint`}
      id="why-parents-love"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-terracotta/5 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-toy-mint/10 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header - animated entrance */}
        <div
          className={`text-center transition-all duration-700 ${isMobile ? "mb-10" : "mb-16"} ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="font-outfit text-sm font-semibold text-terracotta uppercase tracking-widest mb-3">
            Why parents love us
          </p>
          <h2 className="font-playfair font-bold text-warm-gray text-3xl sm:text-4xl lg:text-5xl max-w-2xl mx-auto leading-tight">
            Built for modern families
          </h2>
          <p className="text-warm-gray/70 mt-4 max-w-xl mx-auto text-base">
            Safety, quality, and convenience—without the clutter.
          </p>
        </div>

        {/* Feature cards - staggered animation + hover depth */}
        <div
          className={`grid gap-4 sm:gap-5 max-w-5xl mx-auto ${
            isMobile ? "grid-cols-2 gap-3" : "grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {homeFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="features-card group relative bg-white rounded-2xl p-6 sm:p-7 border border-black/5 shadow-sm overflow-hidden transition-all duration-500 ease-out hover:shadow-xl hover:border-terracotta/20 hover:-translate-y-2"
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: isInView
                    ? "translateY(0)"
                    : "translateY(24px)",
                  transitionDelay: isInView ? `${index * 80}ms` : "0ms",
                  transitionProperty: "opacity, transform, box-shadow, border-color",
                }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-terracotta/0 via-terracotta/0 to-terracotta/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                {/* Left accent line on hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-terracotta/0 to-terracotta/30 scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-500" />

                <div className="relative">
                  <div
                    className={`inline-flex items-center justify-center rounded-2xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${feature.color} ${
                      isMobile ? "w-11 h-11" : "w-14 h-14"
                    } bg-white shadow-md border border-black/5`}
                  >
                    <IconComponent
                      className={`transition-transform duration-300 group-hover:scale-110 ${
                        isMobile ? "w-5 h-5" : "w-7 h-7"
                      }`}
                    />
                  </div>
                  <h3 className="font-outfit font-semibold text-warm-gray text-base sm:text-lg mb-2 group-hover:text-warm-gray transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-warm-gray/65 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {isMobile && (
          <div
            className={`text-center mt-8 transition-all duration-700 delay-500 ${
              isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/about")}
              className="font-outfit rounded-full border-warm-gray/20 text-warm-gray hover:bg-cream hover:border-terracotta/30"
            >
              View all features
            </Button>
          </div>
        )}
      </div>
    </section>
  );
});

FeaturesSection.displayName = "FeaturesSection";
