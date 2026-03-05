import Header from "@/components/Header";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePricingContext } from "@/hooks/usePricingContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Shield, Truck, CreditCard } from "lucide-react";

const RIDE_ON_FEATURES = [
  "One premium ride-on (bikes, cars, tractors) delivered every month",
  "Ride-ons worth ₹7,000–₹18,000 — enjoy without the big purchase",
  "Free delivery and pickup; no damage charges or security deposit",
  "Sanitized and safety-checked before every delivery",
];

const Pricing = () => {
  const { hasActiveSubscription } = usePricingContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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

      <Tabs defaultValue="toys" className="w-full">
        <div className="container mx-auto px-4 pt-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12 rounded-xl bg-warm-gray/10 p-1">
            <TabsTrigger value="toys" className="rounded-lg font-outfit font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Toys
            </TabsTrigger>
            <TabsTrigger value="ride-ons" className="rounded-lg font-outfit font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Ride Ons
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="toys" className="mt-0">
          <SubscriptionPlans />
        </TabsContent>
        <TabsContent value="ride-ons" className="mt-0">
          <section className="pt-6 sm:pt-8 pb-12 sm:pb-16 lg:pb-20 relative overflow-hidden bg-[#FAF7F2]">
            <div className="container mx-auto px-4">
              <div className="max-w-lg mx-auto">
                <Card className="relative overflow-hidden rounded-2xl border-2 border-terracotta/30 shadow-xl">
                  <CardHeader className="text-center pb-4 pt-10">
                    <CardTitle className="font-playfair font-bold text-warm-gray text-2xl sm:text-3xl">
                      Ride Ons
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-warm-gray/90 text-2xl sm:text-3xl font-outfit font-bold">
                        ₹1,999
                      </span>
                      <span className="text-warm-gray/60 text-sm font-outfit">/month +GST</span>
                    </div>
                    <p className="mt-3 text-sm font-outfit text-warm-gray/70">
                      Develops sense of <span className="text-emerald-600 font-semibold">direction</span> and <span className="text-emerald-600 font-semibold">maneuverability</span>
                    </p>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <ul className="space-y-2.5 mb-6">
                      {RIDE_ON_FEATURES.map((feature, idx) => {
                        const isValueFeature = feature.includes("₹7,000–₹18,000");
                        return (
                          <li key={idx} className={`flex items-start gap-2.5 font-outfit text-sm ${isValueFeature ? "" : "text-warm-gray/80"}`}>
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isValueFeature ? "bg-gradient-to-br from-toy-coral/20 to-toy-sunshine/20" : "bg-emerald-500/15"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isValueFeature ? "bg-toy-coral" : "bg-emerald-600"}`} />
                            </span>
                            {isValueFeature ? (
                              <span className="leading-snug w-full rounded-lg bg-gradient-to-r from-toy-coral/15 via-toy-sunshine/10 to-toy-coral/15 border border-toy-coral/25 px-3 py-2 font-semibold text-warm-gray">
                                {feature.split(/(₹7,000–₹18,000)/g).map((part, i) =>
                                  part === "₹7,000–₹18,000" ? (
                                    <span key={i} className="font-bold text-emerald-700">{part}</span>
                                  ) : (
                                    part
                                  )
                                )}
                              </span>
                            ) : (
                              <span className="leading-snug">{feature}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <Button
                      className="w-full font-outfit font-semibold py-3 rounded-xl bg-warm-gray text-white hover:bg-warm-gray/90"
                      size="lg"
                      onClick={() => navigate("/auth?redirect=" + encodeURIComponent("/subscription-flow?planId=ride-on"))}
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-4 h-4 flex-shrink-0" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>
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
