import Header from "@/components/Header";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePricingContext } from "@/hooks/usePricingContext";
import { Shield, Truck, CreditCard, RotateCcw } from "lucide-react";

const Pricing = () => {
  const { hasActiveSubscription } = usePricingContext();
  const isMobile = useIsMobile();

  const content = (
    <main className={`flex-grow ${isMobile ? "pt-4" : "pt-16"} bg-[#FAF7F2]`}>
      {hasActiveSubscription && (
        <div className={`${isMobile ? "bg-toy-mint/10 border-b border-toy-mint/20 py-3 px-4" : "bg-toy-mint/10 border-b border-toy-mint/20 py-4"}`}>
          <div className={`${isMobile ? "text-center" : "container mx-auto px-4 text-center"}`}>
            <p className="text-sm text-warm-gray/80">
              Your current plan is highlighted below. Manage your toys or switch plans anytime.
            </p>
          </div>
        </div>
      )}

      {/* Hero: one clear value prop + trust */}
      <section className="relative overflow-hidden border-b border-warm-gray/10 bg-gradient-to-b from-white to-cream/50">
        <div className="container mx-auto px-4 pt-10 sm:pt-14 pb-6 sm:pb-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-outfit text-sm font-semibold text-terracotta uppercase tracking-widest mb-3">
              Simple pricing
            </p>
            <h1 className="font-playfair font-bold text-warm-gray text-3xl sm:text-4xl lg:text-5xl leading-tight">
              A smarter alternative to buying toys every month.
            </h1>
            <p className="mt-4 text-warm-gray/80 text-base sm:text-lg">
              Get 3 toys + 1 book every month
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
              <span className="inline-flex items-center rounded-full bg-terracotta/15 text-terracotta font-outfit font-semibold text-sm px-4 py-2 border border-terracotta/20">
                1 Big toy
              </span>
              <span className="inline-flex items-center rounded-full bg-toy-sky/15 text-toy-sky font-outfit font-semibold text-sm px-4 py-2 border border-toy-sky/25">
                1 Educational toy
              </span>
              <span className="inline-flex items-center rounded-full bg-toy-mint/20 text-emerald-700 font-outfit font-semibold text-sm px-4 py-2 border border-toy-mint/30">
                1 Developmental toy
              </span>
            </div>
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/25 px-5 py-3.5 shadow-md">
              <span className="font-outfit text-warm-gray text-sm sm:text-base font-medium">
                Play value worth <span className="font-bold text-emerald-700">₹8,000–₹14,000</span> for a fraction of the cost
              </span>
            </div>
          </div>
          {/* Trust strip */}
          <div className="mt-6 sm:mt-7 flex flex-wrap justify-center gap-6 sm:gap-10 text-warm-gray/70 text-sm">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-terracotta flex-shrink-0" />
              Sanitized & safe
            </span>
            <span className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-terracotta flex-shrink-0" />
              Free delivery
            </span>
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-terracotta flex-shrink-0" />
              No hidden charges
            </span>
          </div>
        </div>
      </section>

      <SubscriptionPlans />
    </main>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Plans" showHeader={true} showBottomNav={true}>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {content}
      <Footer />
    </div>
  );
};

export default Pricing;
