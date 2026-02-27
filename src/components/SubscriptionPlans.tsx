import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Gift, Star, Heart, Crown } from "lucide-react";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { usePricingContext } from "@/hooks/usePricingContext";
import { useMemo, useCallback, useState } from "react";
import { fbqTrack } from "@/utils/fbq";
import PlanUpgradePreview from "./subscription/PlanUpgradePreview";
import { useSubscriptionStatus, getStatusDisplayText, getStatusActionType } from '@/hooks/useSubscriptionStatus';

const plans = [{
  id: "discovery-delight",
  name: "Monthly Trial",
  price: 1299,
  priceDisplay: "₹1,299",
  originalPrice: "₹2000",
  period: "month",
  description: "Monthly Trial",
  features: ["3 toys (1 Big + 1 developmental + 1 educational) + 1 book each month", "Choose from 30 premium toys + 12 engaging books", "Toys worth ₹6,000 - memories priceless", "Perfect starter toys to spark wonder and curiosity", "Premium quality guaranteed"],
  popular: false,
  color: "bg-toy-mint",
  gradient: "from-toy-mint to-toy-mint/80",
  icon: Sparkles,
  decorativeColor: "toy-mint"
}, {
  id: "silver-pack",
  name: "Silver Pack",
  price: 5999,
  priceDisplay: "₹5999",
  originalPrice: "₹12000",
  period: "6 months",
  description: "6 months plan",
  features: ["3 toys (1 Big + 1 developmental + 1 educational) + 1 book monthly", "Choose from 110+ toys and 15+ big adventure toys", "Toys worth ₹8,000 to ₹10,000 monthly", "Premium quality toys guaranteed", "Pause up to 30 days", "Just ₹33 per day for endless smiles"],
  popular: false,
  color: "bg-toy-sky",
  gradient: "from-toy-sky to-toy-sky/80",
  icon: Gift,
  decorativeColor: "toy-sky"
}, {
  id: "gold-pack",
  name: "Gold Pack PRO",
  price: 7999,
  priceDisplay: "₹7999",
  originalPrice: "₹14000",
  period: "6 months",
  description: "6 months PRO plan",
  features: ["3 toys (1 Big + 1 developmental + 1 educational) + 1 book monthly", "Choose from 220+ premium toys + 90+ big toys including exclusive collection", "Toys worth ₹8,000 to ₹15,000 monthly", "Roller coaster & coupe car worth ₹12,000 each included", "Premium quality toys guaranteed", "Priority access to new toy arrivals", "Pause up to 60 days", "Just ₹44 per day for 6 months of wonder"],
  popular: true,
  recommendedLabel: "⭐ Most Loved by Parents",
  color: "bg-toy-sunshine",
  gradient: "from-toy-sunshine to-toy-sunshine/80",
  icon: Crown,
  decorativeColor: "toy-sunshine"
}];

interface SubscriptionPlansProps {
  onPlanSelected?: (planId: string) => void;
}

interface UpgradePreviewData {
  show: boolean;
  currentPlan: any;
  newPlan: any;
  proration: any;
  newPlanId: string;
  eligibilityInfo?: any;
}

const SubscriptionPlans = ({
  onPlanSelected
}: SubscriptionPlansProps) => {
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isAuthenticated,
    hasActiveSubscription,
    currentPlanId,
    canManageQueue,
    isLoading
  } = usePricingContext();

  // Enhanced subscription status detection
  const { data: subscriptionStatus } = useSubscriptionStatus();

  // State for upgrade preview modal
  const [upgradePreview, setUpgradePreview] = useState<UpgradePreviewData>({
    show: false,
    currentPlan: null,
    newPlan: null,
    proration: null,
    newPlanId: ''
  });
  const [isCalculatingUpgrade, setIsCalculatingUpgrade] = useState(false);

  // Enhanced button text calculation with status awareness
  const getButtonText = useCallback((planId: string) => {
    if (!isAuthenticated) {
      return "Get Started";
    }

    // Use enhanced status detection if available, fallback to existing logic
    if (subscriptionStatus) {
      return getStatusDisplayText(
        subscriptionStatus,
        planId,
        currentPlanId === planId
      );
    }

    // Fallback to original logic for backward compatibility
    if (hasActiveSubscription) {
      if (currentPlanId === planId) {
        // ENHANCED: Add renewal option for Discovery Delight
        if (planId === 'discovery-delight') {
          return "Renew for Next Month";
        }
        return canManageQueue ? "Manage Your Toys" : "View Current Plan";
      } else {
        return "Switch to This Plan";
      }
    }
    return onPlanSelected ? "Start Creating Memories" : "Begin This Journey";
  }, [isAuthenticated, hasActiveSubscription, currentPlanId, canManageQueue, onPlanSelected, subscriptionStatus]);

  // Enhanced button action calculation (works with status detection)
  const getButtonAction = useCallback((plan: typeof plans[0]) => {
    if (!isAuthenticated) {
      // Require authentication before accessing subscription flow
      return () => {
        // 📊 Track subscription plan interest for unauthenticated users
        fbqTrack('Subscribe', {
          content_name: plan.name,
          value: plan.price,
          currency: 'INR',
          content_category: 'subscription_plan',
          subscription_plan: plan.id,
          user_status: 'guest'
        });

        if (onPlanSelected) {
          onPlanSelected(plan.id);
        } else {
          navigate(`/auth?redirect=${encodeURIComponent(`/subscription-flow?planId=${plan.id}`)}`);
        }
      };
    }
    if (hasActiveSubscription) {
      if (currentPlanId === plan.id) {
        // ENHANCED: Handle renewal for Discovery Delight
        if (plan.id === 'discovery-delight') {
          return () => {
            // 📊 Track renewal interest
            fbqTrack('Subscribe', {
              content_name: `${plan.name} Renewal`,
              value: plan.price,
              currency: 'INR',
              content_category: 'subscription_renewal',
              subscription_plan: plan.id,
              user_status: 'renewing'
            });

            navigate(`/subscription-flow?planId=${plan.id}&isRenewal=true`);
          };
        }

        // Current plan management (non-Discovery Delight)
        return () => {
          // 📊 Track current plan management access
          fbqTrack('ViewContent', {
            content_name: `${plan.name} Management`,
            content_type: 'subscription_management',
            value: plan.price,
            currency: 'INR'
          });

          if (canManageQueue) {
            navigate("/subscription-flow");
          } else {
            navigate("/dashboard");
          }
        };
      } else {
        // Different plan - enhanced upgrade flow with proper eligibility check
        return async () => {
          // 📊 Track plan change interest
          fbqTrack('Subscribe', {
            content_name: `${plan.name} Upgrade`,
            value: plan.price,
            currency: 'INR',
            content_category: 'subscription_upgrade',
            subscription_plan: plan.id,
            user_status: 'existing_customer'
          });

          try {
            setIsCalculatingUpgrade(true);

            // Enhanced upgrade eligibility check
            const { SubscriptionUpgrade } = await import('@/services/subscription/subscriptionUpgrade');

            // Check upgrade eligibility and get pricing info
            const [eligibility, pricingInfo] = await Promise.all([
              SubscriptionUpgrade.checkUpgradeEligibility(user.id),
              SubscriptionUpgrade.getUpgradePricing(user.id, plan.id)
            ]);

            if (eligibility.isEligibleForUpgrade && pricingInfo) {
              // Show enhanced upgrade preview modal
              setUpgradePreview({
                show: true,
                currentPlan: pricingInfo.currentPlan,
                newPlan: pricingInfo.newPlan,
                proration: {
                  paymentAmount: pricingInfo.paymentAmount,
                  effectiveDate: pricingInfo.effectiveDate,
                  cycleImpact: pricingInfo.cycleImpact,
                  isNewCustomerPricing: pricingInfo.isNewCustomerPricing
                },
                newPlanId: plan.id,
                eligibilityInfo: eligibility
              });
            } else if (!eligibility.isEligibleForUpgrade) {
              // No existing subscription - go to new user flow
              console.log('🆕 No subscription found, directing to new user flow');
              if (onPlanSelected) {
                onPlanSelected(plan.id);
              } else {
                navigate(`/subscription-flow?planId=${plan.id}`);
              }
            } else {
              throw new Error('Unable to get pricing information');
            }
          } catch (error: any) {
            console.error('❌ Error in enhanced upgrade flow:', error);
            toast({
              title: "Upgrade Check Failed",
              description: error.message || "Unable to check upgrade eligibility. Please try again.",
              variant: "destructive",
            });

            // Fallback to subscription flow
            if (onPlanSelected) {
              onPlanSelected(plan.id);
            } else {
              navigate(`/subscription-flow?planId=${plan.id}&isUpgrade=true`);
            }
          } finally {
            setIsCalculatingUpgrade(false);
          }
        };
      }
    }

    // New user flow
    return () => {
      // 📊 Track subscription plan selection for authenticated new users
      fbqTrack('Subscribe', {
        content_name: plan.name,
        value: plan.price,
        currency: 'INR',
        content_category: 'subscription_plan',
        subscription_plan: plan.id,
        user_status: 'authenticated_new'
      });

      if (onPlanSelected) {
        onPlanSelected(plan.id);
      } else {
        navigate(`/subscription-flow?planId=${plan.id}`);
      }
    };
  }, [isAuthenticated, hasActiveSubscription, currentPlanId, canManageQueue, navigate, toast, onPlanSelected]);

  // Memoize current plan check
  const isCurrentPlan = useCallback((planId: string) => {
    return hasActiveSubscription && currentPlanId === planId;
  }, [hasActiveSubscription, currentPlanId]);

  // Memoize button variant calculation
  const getButtonVariant = useCallback((planId: string) => {
    if (isCurrentPlan(planId)) {
      return canManageQueue ? "default" : "outline";
    }
    return "default";
  }, [isCurrentPlan, canManageQueue]);

  // Handle upgrade preview confirmation
  const handleUpgradeConfirm = useCallback(() => {
    if (upgradePreview.proration.requiresPayment) {
      // Navigate to payment flow for upgrades requiring payment
      navigate(`/subscription-flow?planId=${upgradePreview.newPlanId}&isUpgrade=true`);
    } else {
      // Direct upgrade for downgrades or equivalent plans
      navigate(`/subscription-flow?planId=${upgradePreview.newPlanId}&isUpgrade=true`);
    }
    setUpgradePreview({ ...upgradePreview, show: false });
  }, [upgradePreview, navigate]);

  // Handle upgrade preview cancellation
  const handleUpgradeCancel = useCallback(() => {
    setUpgradePreview({ ...upgradePreview, show: false });
  }, [upgradePreview]);

  // Memoize the loading state
  const loadingContent = useMemo(() => (
    <section className="py-20 bg-gradient-to-b from-toy-mint/5 via-toy-sky/5 to-toy-sunshine/5">
      <div className="container mx-auto px-4 text-center">
        <div className="text-lg">Loading your subscription details...</div>
      </div>
    </section>
  ), []);

  if (isLoading) {
    return loadingContent;
  }

  return (
    <section id="plans" className="pt-6 sm:pt-8 pb-12 sm:pb-16 lg:pb-20 relative overflow-hidden bg-[#FAF7F2]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="font-playfair font-bold text-warm-gray text-2xl sm:text-3xl mb-2">
            Choose your plan
          </h2>
          <p className="text-warm-gray/70 text-sm sm:text-base max-w-xl mx-auto">
            All plans include 3 toys (1 Big + 1 developmental + 1 educational) + 1 book monthly. Prices inclusive of GST where applicable.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6">
            <span className="flex items-center gap-2 text-warm-gray/70 text-sm font-outfit">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Free delivery on all plans
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-sm font-outfit font-semibold text-emerald-800 animate-trust-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              No damages, no deposit
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const isPopular = plan.popular;
            const isCurrent = isCurrentPlan(plan.id);

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 flex flex-col ${
                  isPopular
                    ? "border-terracotta shadow-xl ring-2 ring-terracotta/20 md:-mt-2 md:mb-2 md:scale-[1.02]"
                    : isCurrent
                      ? "border-emerald-500 shadow-lg ring-2 ring-emerald-500/20"
                      : "border-warm-gray/15 hover:border-terracotta/40 hover:shadow-lg"
                }`}
              >
                {/* Badges */}
                <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                  {isCurrent && (
                    <Badge className="bg-emerald-500 text-white font-outfit font-semibold px-2.5 py-1 rounded-full text-xs">
                      <Heart className="w-3 h-3 mr-1 inline" />
                      Your plan
                    </Badge>
                  )}
                  {!isCurrent && <div />}
                  {isPopular && !isCurrent && (
                    <Badge className="bg-gradient-to-r from-toy-coral to-toy-sunshine text-white font-outfit font-semibold px-2.5 py-1 rounded-full text-xs">
                      {"recommendedLabel" in plan && plan.recommendedLabel ? (
                        plan.recommendedLabel
                      ) : (
                        <>
                          <Star className="w-3 h-3 mr-1 inline" />
                          Most popular
                        </>
                      )}
                    </Badge>
                  )}
                </div>

                <CardHeader className="text-center pb-4 pt-12 sm:pt-14 relative z-10">
                  <div className="flex justify-center mb-3">
                    <span className={`inline-flex p-2.5 rounded-xl ${plan.color}/20`}>
                      <IconComponent className={`w-7 h-7 sm:w-8 sm:h-8 ${
                        plan.decorativeColor === "toy-mint" ? "text-toy-mint" :
                        plan.decorativeColor === "toy-sky" ? "text-toy-sky" : "text-toy-sunshine"
                      }`} />
                    </span>
                  </div>
                  <CardTitle className="font-playfair font-bold text-warm-gray text-xl sm:text-2xl">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-2 flex-wrap">
                      <span className="text-muted-foreground text-sm line-through font-outfit">
                        {plan.originalPrice}
                      </span>
                      <span className="text-warm-gray/90 text-2xl sm:text-3xl font-outfit font-bold">
                        {plan.priceDisplay}
                      </span>
                      <span className="text-warm-gray/60 text-sm font-outfit">/{plan.period}</span>
                    </div>
                    <p className="text-warm-gray/60 text-xs mt-1 font-outfit">
                      {plan.period === "6 months" ? "6 months · +GST" : "per month · +GST"}
                    </p>
                    {(plan.id === "silver-pack" || plan.id === "gold-pack") && (
                      <p className="mt-2 text-sm font-outfit text-warm-gray/90">
                        Get 1 month extra <span className="font-bold text-emerald-600">free</span>
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col px-5 sm:px-6 pb-6 relative z-10">
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.slice(0, 8).map((feature, idx) => {
                      const isToysWorth = feature.startsWith("Toys worth");
                      return (
                        <li key={idx} className={`flex items-start gap-2.5 font-outfit text-sm ${isToysWorth ? "" : "text-warm-gray/80"}`}>
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isToysWorth ? "bg-gradient-to-br from-toy-coral/20 to-toy-sunshine/20" : "bg-emerald-500/15"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isToysWorth ? "bg-toy-coral" : "bg-emerald-600"}`} />
                          </span>
                          {isToysWorth ? (
                            <span className="leading-snug w-full rounded-lg bg-gradient-to-r from-toy-coral/15 via-toy-sunshine/10 to-toy-coral/15 border border-toy-coral/25 px-3 py-2 font-semibold text-warm-gray">
                              {feature}
                            </span>
                          ) : feature.startsWith("Choose from") ? (
                            <span className="leading-snug">
                              {feature.split(/(\d+\+?)/g).map((part, i) =>
                                /^\d+\+?$/.test(part) ? (
                                  <span key={i} className="font-bold text-orange-500">{part}</span>
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

                  <div className="pt-5 mt-auto">
                    <Button
                      className={`w-full font-outfit font-semibold py-3 rounded-xl transition-all ${
                        isCurrent && !plan.id.includes("discovery")
                          ? "bg-warm-gray/10 text-warm-gray hover:bg-warm-gray/15 border border-warm-gray/20"
                          : isPopular
                            ? "bg-gradient-to-r from-toy-coral to-toy-sunshine text-white hover:opacity-95 shadow-md"
                            : "bg-warm-gray text-white hover:bg-warm-gray/90"
                      }`}
                      size="lg"
                      variant={getButtonVariant(plan.id)}
                      onClick={getButtonAction(plan)}
                      disabled={isCalculatingUpgrade}
                    >
                      {isCalculatingUpgrade ? "Calculating…" : getButtonText(plan.id)}
                      <ArrowRight className="ml-2 w-4 h-4 flex-shrink-0" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>

      {/* Upgrade Preview Modal */}
      {upgradePreview.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <PlanUpgradePreview
              currentPlan={upgradePreview.currentPlan}
              newPlan={upgradePreview.newPlan}
              proration={upgradePreview.proration}
              onConfirm={handleUpgradeConfirm}
              onCancel={handleUpgradeCancel}
              isLoading={false}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default SubscriptionPlans;