import React, { Suspense, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { ComponentLoader } from "@/components/ui/component-loader";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { FEATURE_FLAGS } from "@/config/features";
import AppDownloadPopup from "@/components/AppDownloadPopup";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import ToyCarousel from "@/components/ToyCarousel";

// Error fallback component for failed imports
const ErrorFallback = ({ error, resetErrorBoundary }: { error?: Error; resetErrorBoundary?: () => void }) => (
  <div className="flex items-center justify-center py-8 px-4">
    <div className="text-center">
      <div className="text-red-500 mb-2 text-2xl">⚠️</div>
      <p className="text-sm text-muted-foreground mb-4">Component failed to load. Please try refreshing the page.</p>
      {resetErrorBoundary && (
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);

// Friendly fallback for premium toys section only — no error text, keeps layout intact (matches ToyCarouselHeader)
const PremiumToysSectionFallback = () => (
  <section className="py-14 bg-learning-blue">
    <div className="container mx-auto px-4">
      <div className="text-center mb-10">
        <p className="font-outfit text-sm font-medium text-toy-coral uppercase tracking-wide mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Featured Toys
        </p>
        <h2 className="font-playfair font-bold text-3xl md:text-4xl mb-3 bg-gradient-to-r from-toy-coral via-terracotta to-toy-sunshine bg-clip-text text-transparent">
          Rent premium toys
        </h2>
        <p className="font-outfit text-warm-gray/70 text-base max-w-xl mx-auto mb-6">
          Curated collection—no purchase needed, just endless fun.
        </p>
        <a
          href="/toys"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Browse all toys
        </a>
      </div>
    </div>
  </section>
);

// Lazy load heavy components for better performance
const HomeCarousel = React.lazy(() => import("@/components/HomeCarousel"));
const RideOnToysCarousel = React.lazy(() => import("@/components/RideOnToysCarousel"));
const Footer = React.lazy(() => import("@/components/Footer"));
const WhyChooseUs = React.lazy(() => import("@/components/WhyChooseUs"));
const Header = React.lazy(() => import("@/components/Header"));
const PremiumPartners = React.lazy(() => import("@/components/PremiumPartners"));
const CertifiedBy = React.lazy(() => import("@/components/CertifiedBy"));
const HeroCarousel = React.lazy(() => import("@/components/HeroCarousel"));
const MobileLayout = React.lazy(() => import("@/components/mobile/MobileLayout"));
const MobilePullToRefresh = React.lazy(() => import("@/components/mobile/MobilePullToRefresh"));

const Index = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const rideOnSectionRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
      title: "Refreshed!",
      description: "Content has been updated",
    });
  };

  // Mobile layout with lazy loading
  if (isMobile) {
    return (
      <>
        {/* SEO Components for Mobile */}
        {FEATURE_FLAGS.SEO_META_TAGS && <SEOHead page="home" />}
        {FEATURE_FLAGS.SEO_STRUCTURED_DATA && (
          <>
            <StructuredData type="organization" />
            <StructuredData type="website" />
          </>
        )}
        
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<ComponentLoader text="Loading mobile layout..." />}>
            <MobileLayout title="ToyJoy" showHeader={true} showBottomNav={true}>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<ComponentLoader text="Loading content..." />}>
                  <MobilePullToRefresh onRefresh={handleRefresh}>
                    <div className="min-h-screen bg-cream">
                      {/* Mobile-optimized content with lazy loading */}
                      <div className="pb-2 space-y-0">
                        {/* Main promotional carousel */}
                        <ErrorBoundary FallbackComponent={ErrorFallback}>
                          <Suspense fallback={<ComponentLoader text="Loading carousel..." />}>
                            <HomeCarousel />
                          </Suspense>
                        </ErrorBoundary>
                        
                        {/* Move toy carousels to top for faster customer access */}
                        <div className="space-y-4">
                          <ErrorBoundary FallbackComponent={PremiumToysSectionFallback}>
                            <ToyCarousel />
                          </ErrorBoundary>
                          <div ref={rideOnSectionRef}>
                            <ErrorBoundary FallbackComponent={ErrorFallback}>
                              <Suspense fallback={<ComponentLoader text="Loading ride-on toys..." />}>
                                <RideOnToysCarousel />
                              </Suspense>
                            </ErrorBoundary>
                          </div>
                          <AppDownloadPopup rideOnSectionRef={rideOnSectionRef} />
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <Suspense fallback={<ComponentLoader text="Loading testimonials..." />}>
                              <TestimonialsCarousel />
                            </Suspense>
                          </ErrorBoundary>
                          {/* How ToyFlix Works section first, then Why Parents Love */}
                          <div className="px-4">
                            <ErrorBoundary FallbackComponent={ErrorFallback}>
                              <Suspense fallback={<ComponentLoader text="Loading how it works..." />}>
                                <WhyChooseUs />
                              </Suspense>
                            </ErrorBoundary>
                          </div>
                          {/* Features section moved after WhyChooseUs */}
                          <FeaturesSection />
                        </div>
                        <div className="space-y-4">
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <Suspense fallback={<ComponentLoader text="Loading partners..." />}>
                              <PremiumPartners />
                            </Suspense>
                          </ErrorBoundary>
                          <ErrorBoundary FallbackComponent={ErrorFallback}>
                            <Suspense fallback={<ComponentLoader text="Loading certifications..." />}>
                              <CertifiedBy />
                            </Suspense>
                          </ErrorBoundary>
                        </div>
                      </div>
                    </div>
                  </MobilePullToRefresh>
                </Suspense>
              </ErrorBoundary>
              
              {/* Footer for mobile */}
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<ComponentLoader text="Loading footer..." />}>
                  <Footer />
                </Suspense>
              </ErrorBoundary>
            </MobileLayout>
          </Suspense>
        </ErrorBoundary>
      </>
    );
  }

  // Desktop layout with lazy loading
  return (
    <>
      {/* SEO Components for Desktop */}
      {FEATURE_FLAGS.SEO_META_TAGS && <SEOHead page="home" />}
      {FEATURE_FLAGS.SEO_STRUCTURED_DATA && (
        <>
          <StructuredData type="organization" />
          <StructuredData type="website" />
        </>
      )}
      
      <div className="min-h-screen bg-cream">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<ComponentLoader text="Loading header..." />}>
          <Header />
        </Suspense>
      </ErrorBoundary>

      <main>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<ComponentLoader text="Loading hero carousel..." />}>
            <HeroCarousel />
          </Suspense>
        </ErrorBoundary>
        <section className="bg-white">
          <ErrorBoundary FallbackComponent={PremiumToysSectionFallback}>
            <ToyCarousel />
          </ErrorBoundary>
          <div ref={rideOnSectionRef}>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Suspense fallback={<ComponentLoader text="Loading ride-on toys..." />}>
                <RideOnToysCarousel />
              </Suspense>
            </ErrorBoundary>
          </div>
          <AppDownloadPopup rideOnSectionRef={rideOnSectionRef} />
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<ComponentLoader text="Loading testimonials..." />}>
              <TestimonialsCarousel />
            </Suspense>
          </ErrorBoundary>
        </section>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<ComponentLoader text="Loading why choose us..." />}>
            <WhyChooseUs />
          </Suspense>
        </ErrorBoundary>
        <FeaturesSection />
        <section className="bg-cream">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<ComponentLoader text="Loading partners..." />}>
              <PremiumPartners />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<ComponentLoader text="Loading certifications..." />}>
              <CertifiedBy />
            </Suspense>
          </ErrorBoundary>
        </section>
      </main>

      <Suspense fallback={<ComponentLoader text="Loading footer..." />}>
        <Footer />
      </Suspense>
    </div>
    </>
  );
};

export default Index;
