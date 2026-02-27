import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SubscriptionProgressIndicator from "./SubscriptionProgressIndicator";
import AgeGroupSelectionStep from "./AgeGroupSelectionStep";
import ToySelectionStep from "./ToySelectionStep";
import CartSummaryStep from "./CartSummaryStep";
import PaymentStep from "./PaymentStep";
import { Toy } from "@/hooks/useToys";
import { PlanService } from "@/services/planService";
import { SubscriptionService } from "@/services/subscriptionService";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Sparkles } from "lucide-react";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useRentalOrdersDashboard } from "@/hooks/useRentalOrdersDashboard";
import { fbqTrack } from '@/utils/fbq';
import { toast } from "sonner";

// Utility function to validate and normalize age groups
const validateAndNormalizeAgeGroup = (ageGroup: string): string => {
  const validAgeGroups = ['1-2', '2-3', '3-4', '4-6', '6-8'];
  
  // If already valid, return as-is
  if (validAgeGroups.includes(ageGroup)) {
    return ageGroup;
  }
  
  console.warn('⚠️ Invalid age group detected:', ageGroup, 'Attempting to normalize');
  
  // Map common invalid age groups to valid ones
  const ageGroupMapping: Record<string, string> = {
    '3-5': '3-4',  // Map 3-5 to 3-4
    '2-4': '2-3',  // Map 2-4 to 2-3
    '4-5': '4-6',  // Map 4-5 to 4-6
    '5-6': '4-6',  // Map 5-6 to 4-6
    '5-7': '4-6',  // Map 5-7 to 4-6
    '6-7': '6-8',  // Map 6-7 to 6-8
    '7-8': '6-8',  // Map 7-8 to 6-8
  };
  
  if (ageGroupMapping[ageGroup]) {
    console.log(`✅ Mapped invalid age group "${ageGroup}" to "${ageGroupMapping[ageGroup]}"`);
    return ageGroupMapping[ageGroup];
  }
  
  // Use intelligent fallback based on age range
  const ageNumbers = ageGroup.match(/\d+/g);
  if (ageNumbers && ageNumbers.length >= 1) {
    const minAge = parseInt(ageNumbers[0]);
    let normalizedAgeGroup: string;
    
    if (minAge <= 2) normalizedAgeGroup = '1-2';
    else if (minAge <= 3) normalizedAgeGroup = '2-3';
    else if (minAge <= 4) normalizedAgeGroup = '3-4';
    else if (minAge <= 6) normalizedAgeGroup = '4-6';
    else normalizedAgeGroup = '6-8';
    
    console.log(`✅ Intelligent mapping: "${ageGroup}" → "${normalizedAgeGroup}" (based on min age: ${minAge})`);
    return normalizedAgeGroup;
  }
  
  // Final fallback
  console.log(`⚠️ Could not parse age group "${ageGroup}", using fallback: "3-4"`);
  return '3-4';
};

const SubscriptionFlowContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useCustomAuth();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("");
  const [isCheckingPaymentEligibility, setIsCheckingPaymentEligibility] = useState(false);
  
  // Validation wrapper for setSelectedAgeGroup
  const setValidatedAgeGroup = useCallback((ageGroup: string) => {
    if (ageGroup === 'all') {
      // Special case for ride-on toys or Gold pack
      setSelectedAgeGroup('all');
      return;
    }
    
    const validatedAgeGroup = validateAndNormalizeAgeGroup(ageGroup);
    console.log('🔍 Setting validated age group:', { 
      original: ageGroup, 
      validated: validatedAgeGroup 
    });
    setSelectedAgeGroup(validatedAgeGroup);
  }, []);
  const [selectedToys, setSelectedToys] = useState<Toy[]>([]);

  // Memoize plan ID from URL to prevent unnecessary re-renders
  const planIdFromUrl = useMemo(() => {
    return searchParams.get('planId');
  }, [searchParams]);

  // Check if this is a ride-on toy purchase
  const rideOnToyId = useMemo(() => {
    return searchParams.get('rideOnToy');
  }, [searchParams]);

  // Check if this is a Gold pack subscription (skip age selection)
  const isGoldPack = useMemo(() => {
    return selectedPlan ? PlanService.shouldSkipAgeSelection(selectedPlan) : false;
  }, [selectedPlan]);

  // Flow type detection
  const isCycleCompletionFlow = useMemo(() => {
    return searchParams.get('cycleComplete') === 'true';
  }, [searchParams]);

  const isEarlyAccessFlow = useMemo(() => {
    return searchParams.get('earlyAccess') === 'true';
  }, [searchParams]);

  const isUpgradeFlow = useMemo(() => {
    return searchParams.get('isUpgrade') === 'true';
  }, [searchParams]);

  const isRenewalFlow = useMemo(() => {
    return searchParams.get('isRenewal') === 'true';
  }, [searchParams]);

  const completionReason = useMemo(() => {
    return searchParams.get('reason') || 'cycle-extension';
  }, [searchParams]);

  const suggestedPlan = useMemo(() => {
    return searchParams.get('plan') || '';
  }, [searchParams]);

  // Determine if this is a free flow (Gold/Silver) or paid flow (Discovery Delight)
  const isFreeFlow = useMemo(() => {
    return (isCycleCompletionFlow || completionReason === 'early-access') && 
           (suggestedPlan.includes('silver') || suggestedPlan.includes('gold') || 
            selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack');
  }, [isCycleCompletionFlow, completionReason, suggestedPlan, selectedPlan]);

  const isPaidFlow = useMemo(() => {
    return isEarlyAccessFlow && 
           (suggestedPlan.includes('discovery') || selectedPlan === 'discovery-delight');
  }, [isEarlyAccessFlow, suggestedPlan, selectedPlan]);

  // Enhanced upgrade flow - existing subscribers changing plans with skip toy selection
  const isUpgradeProcess = useMemo(() => {
    return isUpgradeFlow && user?.id && selectedPlan;
  }, [isUpgradeFlow, user?.id, selectedPlan]);

  // Get dashboard data at top level (follows rules of hooks)
  const dashboardQuery = useRentalOrdersDashboard();

  // Robust age group extraction with proper safeguards
  const { existingAgeGroup, shouldSkipAgeSelection, hasValidSubscriptionHistory } = useMemo(() => {
    // For both cycle completion and early access flows (existing customers selecting monthly toys)
    if (!isCycleCompletionFlow && !isEarlyAccessFlow) {
      return { 
        existingAgeGroup: null, 
        shouldSkipAgeSelection: isGoldPack, 
        hasValidSubscriptionHistory: false 
      };
    }
    
    const dashboardData = dashboardQuery.data;
    
    if (!dashboardData?.orders?.length) {
      console.log('🔍 No rental orders found for age group extraction');
      return { 
        existingAgeGroup: null, 
        shouldSkipAgeSelection: isGoldPack, 
        hasValidSubscriptionHistory: false 
      };
    }
    
    // Filter for SUBSCRIPTION CYCLE orders only (exclude ride-on, one-time, gifts)
    const subscriptionOrders = dashboardData.orders.filter(order => 
      order.order_type === 'subscription' && 
      order.cycle_number && 
      order.cycle_number > 0 &&
      order.age_group && 
      order.age_group !== 'all' &&  // Exclude "all" ages (typically ride-on)
      ['1-2', '2-3', '3-4', '4-6', '6-8'].includes(order.age_group) // Valid age groups only
    );
    
    console.log('🔍 Age Group Analysis:', {
      totalOrders: dashboardData.orders.length,
      subscriptionOrders: subscriptionOrders.length,
      ageGroups: subscriptionOrders.map(o => o.age_group)
    });
    
    if (subscriptionOrders.length === 0) {
      console.log('⚠️ No valid subscription cycle orders with age groups found');
      return { 
        existingAgeGroup: null, 
        shouldSkipAgeSelection: isGoldPack, 
        hasValidSubscriptionHistory: false 
      };
    }
    
    // Get the most recent subscription order's age group
    const mostRecentOrder = subscriptionOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    
    const rawAgeGroup = mostRecentOrder.age_group;
    
    // Validate and normalize age group using utility function
    const extractedAgeGroup = validateAndNormalizeAgeGroup(rawAgeGroup);
    
    console.log('✅ Final age group for cycle order:', {
      orderId: mostRecentOrder.id,
      orderNumber: mostRecentOrder.order_number,
      rawAgeGroup: rawAgeGroup,
      finalAgeGroup: extractedAgeGroup,
      cycleNumber: mostRecentOrder.cycle_number,
      subscriptionPlan: mostRecentOrder.subscription_plan
    });
    
    return {
      existingAgeGroup: extractedAgeGroup,
      shouldSkipAgeSelection: isGoldPack || Boolean(extractedAgeGroup),
      hasValidSubscriptionHistory: true
    };
  }, [isCycleCompletionFlow, isEarlyAccessFlow, isGoldPack, dashboardQuery.data]);

  // Helper function to restore state from URL parameters
  const restoreStateFromUrl = useCallback(() => {
    const stepFromUrl = searchParams.get('step');
    const ageGroupFromUrl = searchParams.get('ageGroup');
    const selectedToysFromUrl = searchParams.get('selectedToys');

    // Restore step if provided
    if (stepFromUrl) {
      const stepNumber = parseInt(stepFromUrl, 10);
      if (stepNumber >= 1 && stepNumber <= 4) {
        setStep(stepNumber);
      }
    }

    // Restore age group if provided - with validation
    if (ageGroupFromUrl) {
      setValidatedAgeGroup(ageGroupFromUrl);
    }

    // Restore selected toys if provided
    if (selectedToysFromUrl) {
      try {
        const parsedToys = JSON.parse(selectedToysFromUrl);
        if (Array.isArray(parsedToys)) {
          setSelectedToys(parsedToys);
        }
      } catch (error) {
        console.error('Failed to parse selected toys from URL:', error);
      }
    }
  }, [searchParams]);

  // Check for planId in URL parameters on component mount
  useEffect(() => {
    console.log('🎯 SubscriptionFlow initialization:', {
      planIdFromUrl,
      selectedPlan,
      rideOnToyId,
      isCycleCompletionFlow,
      isEarlyAccessFlow,
      isUpgradeFlow,
      isRenewalFlow,
      existingAgeGroup,
      shouldSkipAgeSelection,
      hasValidSubscriptionHistory
    });

    // Handle ride-on toy purchase
    if (rideOnToyId) {
      setSelectedPlan('ride_on_fixed');
      setValidatedAgeGroup('all');
      
      // Create mock toy object for ride-on...
      const rideOnToy: Toy = {
        id: rideOnToyId,
        name: `Ride-On Toy (ID: ${rideOnToyId})`,
        description: 'Premium ride-on toy rental with no age restrictions',
        category: 'ride_on_toys',
        age_range: 'No age restrictions',
        brand: null,
        pack: 'ride_on',
        retail_price: 1999,
        rental_price: 1999,
        image_url: null,
        available_quantity: 1,
        total_quantity: 1,
        rating: 5,
        min_age: null,
        max_age: null,
        show_strikethrough_pricing: false,
        display_order: 0,
        is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setSelectedToys([rideOnToy]);
      setStep(3);
      return;
    }
    
    if (planIdFromUrl && !selectedPlan) {
      setSelectedPlan(planIdFromUrl);
      
      // ENHANCED UPGRADE FLOW: Skip toy selection for upgrade flows as per requirements
      if (isUpgradeFlow) {
        console.log('🔄 Upgrade flow detected - skipping toy selection, going to payment');
        // Set a minimal age group for upgrade flow
        setValidatedAgeGroup('3-4');
        // Skip directly to payment (step 4)
        setStep(4);
        return;
      }
      
      // NEW: RENEWAL FLOW - Skip age and toy selection, go directly to payment
      if (isRenewalFlow) {
        console.log('🔄 Renewal flow detected - skipping to payment');
        if (hasValidSubscriptionHistory && existingAgeGroup) {
          setValidatedAgeGroup(existingAgeGroup);
        } else {
          // Fallback for renewal without age group
          setValidatedAgeGroup('3-4');
        }
        setStep(4); // Skip directly to payment
        return;
      }
      
      // CRITICAL: Immediately set age group for Gold pack users
      if (PlanService.shouldSkipAgeSelection(planIdFromUrl)) {
        const ageToUse = 'all'; // Gold pack always uses 'all'
        console.log('🌟 GOLD PACK FIX: Setting ageGroup to "all" for planId:', planIdFromUrl);
        setValidatedAgeGroup(ageToUse);
        setStep(2); // Skip to toy selection
        restoreStateFromUrl();
        return; // Exit early to prevent any other logic from interfering
      }
      
      // Skip age selection logic with multiple safeguards for other plans
      if (shouldSkipAgeSelection) {
        let ageToUse: string;
        
        if (isGoldPack) {
          ageToUse = 'all'; // Gold pack has no age restrictions
          console.log('✅ Gold pack detected - setting ageGroup to "all"');
        } else if (existingAgeGroup) {
          // Use the utility function to ensure age group is valid
          ageToUse = validateAndNormalizeAgeGroup(existingAgeGroup);
        } else {
          ageToUse = '3-4'; // Safe fallback for existing customers (valid age table format)
          console.log('⚠️ Using fallback age group for existing customer');
        }
        
        console.log('✅ Skipping age selection, using age group:', ageToUse);
        console.log('🔍 Age group validation - exists in table map:', ['1-2', '2-3', '3-4', '4-6', '6-8'].includes(ageToUse));
        setValidatedAgeGroup(ageToUse);
        setStep(2); // Skip to toy selection
      }

      restoreStateFromUrl();
    } else if (!planIdFromUrl && !rideOnToyId) {
      // Handle different flow types
      if (isCycleCompletionFlow || isEarlyAccessFlow) {
        // Set plan based on suggested plan or flow type
        if (suggestedPlan) {
          setSelectedPlan(suggestedPlan);
        } else if (isCycleCompletionFlow) {
          setSelectedPlan('silver-pack'); // Default for cycle completion
        } else if (isEarlyAccessFlow) {
          setSelectedPlan('discovery-delight'); // Default for early access
        }
        
        if (hasValidSubscriptionHistory && existingAgeGroup) {
          // Existing customer with valid history - skip age selection
          console.log('✅ Existing customer with subscription history, skipping age selection');
          setValidatedAgeGroup(existingAgeGroup);
          setStep(2);
        } else if (hasValidSubscriptionHistory) {
          // Existing customer but no valid age group - use intelligent fallback
          console.log('⚠️ Existing customer but no valid age group found, using intelligent fallback');
          const fallbackAgeGroup = '3-4'; // Most common age group for existing customers
          setValidatedAgeGroup(fallbackAgeGroup);
          setStep(2);
        } else {
          // New customer or no subscription history - show age selection
          console.log('ℹ️ New customer or no subscription history, showing age selection');
          setStep(1);
        }
        return;
      }
      
      // Redirect to pricing for new users
      navigate('/pricing');
      return;
    }
  }, [
    planIdFromUrl, 
    selectedPlan, 
    navigate, 
    rideOnToyId, 
    restoreStateFromUrl, 
    isCycleCompletionFlow, 
    isEarlyAccessFlow,
    isUpgradeFlow,
    isRenewalFlow,
    existingAgeGroup, 
    shouldSkipAgeSelection, 
    isGoldPack,
    hasValidSubscriptionHistory,
    suggestedPlan
  ]);

  const handleAgeGroupContinue = useCallback(() => {
    if (selectedAgeGroup) {
      setStep(2);
    }
  }, [selectedAgeGroup]);

  const handleToySelectionComplete = useCallback((toys: Toy[]) => {
    console.log('🔥 SubscriptionFlowContent - handleToySelectionComplete called');
    console.log('🔥 SubscriptionFlowContent - Received toys:', toys.length, toys);
    console.log('🔥 SubscriptionFlowContent - Current step before:', step);
    setSelectedToys(toys);
    setStep(3);
    console.log('🔥 SubscriptionFlowContent - Setting step to 3 (Cart Summary)');
  }, [step]);

  const handleProceedToPayment = useCallback(async () => {
    const logContext = { 
      userId: user?.id, 
      selectedToys: selectedToys.length, 
      method: 'handleProceedToPayment' 
    };

    try {
      console.log('🔍 [PaymentRouting] Starting payment flow routing:', logContext);

      // VALIDATION: Check if toys are selected
      if (!selectedToys || selectedToys.length === 0) {
        console.warn('⚠️ [PaymentRouting] No toys selected');
        toast.error('Please select toys before proceeding to payment');
        return;
      }

      // META PIXEL: Fire InitiateCheckout event (always fire regardless of payment bypass)
      try {
        const totalValue = selectedToys.reduce((sum, t) => sum + (t.rental_price || 0), 0);
        fbqTrack('InitiateCheckout', {
          value: totalValue,
          currency: 'INR',
          num_items: selectedToys.length,
          content_ids: selectedToys.map(t => t.id),
          content_type: 'product'
        });
        console.log('📊 [PaymentRouting] Meta Pixel InitiateCheckout event fired:', { value: totalValue });
      } catch (pixelError) {
        console.warn('⚠️ [PaymentRouting] Meta Pixel event failed (non-critical):', pixelError);
        // Don't block payment flow for pixel failures
      }

      // PAYMENT ELIGIBILITY CHECK: Only for authenticated users
      if (user?.id) {
        console.log('👤 [PaymentRouting] User authenticated, checking payment eligibility...');
        setIsCheckingPaymentEligibility(true);
        
        let eligibility: any = null;
        
        try {
          // ELIGIBILITY API CALL: With timeout and error handling
          console.log('📋 [PaymentRouting] Calling payment eligibility service...');
          
          const eligibilityPromise = SubscriptionService.checkPaymentEligibility(user.id);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Eligibility check timeout')), 10000)
          );
          
          eligibility = await Promise.race([eligibilityPromise, timeoutPromise]);
          
          if (!eligibility) {
            console.error('❌ [PaymentRouting] Eligibility check returned null/undefined');
            throw new Error('Invalid eligibility response');
          }

          console.log('✅ [PaymentRouting] Payment eligibility result:', {
            requiresPayment: eligibility.requiresPayment,
            planType: eligibility.planType,
            isActive: eligibility.isActive,
            bypassReason: eligibility.bypassReason
          });
          
        } catch (eligibilityError) {
          // COMPREHENSIVE ERROR HANDLING: Different error types
          console.error('❌ [PaymentRouting] Payment eligibility check failed:', eligibilityError);
          
          if (eligibilityError instanceof Error) {
            if (eligibilityError.message.includes('Failed to fetch') || eligibilityError.message.includes('NetworkError')) {
              console.error('❌ [PaymentRouting] Network error during eligibility check');
              toast.error('Network error. Please check your connection and try again.', {
                description: "If the problem persists, contact support."
              });
            } else if (eligibilityError.message.includes('timeout')) {
              console.error('❌ [PaymentRouting] Timeout during eligibility check');
              toast.error('Request timed out. Proceeding to payment...', {
                description: "Your subscription status couldn't be verified in time."
              });
            } else if (eligibilityError.message.includes('Database')) {
              console.error('❌ [PaymentRouting] Database error during eligibility check');
              toast.error('Database error. Proceeding to payment as fallback...', {
                description: "Please contact support if you believe this is incorrect."
              });
            } else {
              console.error('❌ [PaymentRouting] API error during eligibility check');
              toast.error('Unable to verify subscription status. Proceeding to payment...', {
                description: "Contact support if you believe this is an error."
              });
            }
          } else {
            console.error('❌ [PaymentRouting] Unknown error during eligibility check:', eligibilityError);
            toast.error('Unexpected error. Proceeding to payment as fallback...', {
              description: "Please contact support if issues persist."
            });
          }
          
          // SAFE FALLBACK: Always proceed to payment step on errors
          setIsCheckingPaymentEligibility(false);
          setStep(4);
          return;
        }

        // ELIGIBILITY RESULT PROCESSING: Handle different scenarios
        try {
          if (!eligibility.requiresPayment && eligibility.isActive) {
            // SUCCESS CASE: User eligible for payment bypass
            console.log('✅ [PaymentRouting] User eligible for payment bypass');
            
            // PLAN DISPLAY NAME: Get user-friendly plan name
            let planDisplayName = 'Premium';
            if (eligibility.planType) {
              if (eligibility.planType.includes('silver') || eligibility.planType === 'silver-pack') {
                planDisplayName = 'Silver Pack';
              } else if (eligibility.planType.includes('gold') || eligibility.planType === 'gold-pack') {
                planDisplayName = 'Gold Pack PRO';
              } else {
                planDisplayName = eligibility.planType;
              }
            }
            
            // SUCCESS NOTIFICATION: Show user-friendly success message
            toast.success(`🎉 Using your existing ${planDisplayName} subscription! Completing your order...`, {
              description: "No payment needed - enjoy your subscription benefits!"
            });
            
            console.log('🎯 [PaymentRouting] Bypassing payment - proceeding to Step 4 with auto-bypass');
            setIsCheckingPaymentEligibility(false);
            setStep(4);
            return;
            
          } else if (eligibility.requiresPayment && eligibility.isActive) {
            // PAYMENT REQUIRED CASE: User has active subscription but needs to pay
            console.log('💳 [PaymentRouting] User requires payment:', eligibility.bypassReason);
            
            // HELPFUL MESSAGING: Show specific guidance based on plan type
            if (eligibility.planType?.includes('discovery')) {
              toast.info('💡 Discovery Delight requires payment for this selection', {
                description: "Consider upgrading to Silver or Gold for free toy selection!"
              });
            }
            
          } else if (!eligibility.isActive) {
            // INACTIVE SUBSCRIPTION CASE: Guide user to reactivate
            console.log('🔒 [PaymentRouting] Subscription not active:', eligibility.bypassReason);
            
            if (eligibility.bypassReason?.includes('expired')) {
              toast.info('⏰ Your subscription has expired', {
                description: "Renew your subscription to continue enjoying ToyFlix benefits!"
              });
            } else if (eligibility.bypassReason?.includes('not active')) {
              toast.info('🔓 Subscription activation required', {
                description: "Activate your subscription to enjoy free toy selection benefits."
              });
            } else {
              toast.info('💡 Subscription verification needed', {
                description: "Please check your subscription status or contact support."
              });
            }
            
          } else {
            // UNKNOWN CASE: Log for debugging
            console.warn('⚠️ [PaymentRouting] Unknown eligibility state:', {
              requiresPayment: eligibility.requiresPayment,
              isActive: eligibility.isActive,
              bypassReason: eligibility.bypassReason
            });
          }

        } catch (processingError) {
          console.error('❌ [PaymentRouting] Error processing eligibility result:', processingError);
          toast.error('Error processing subscription status. Proceeding to payment...', {
            description: "Contact support if you believe this is incorrect."
          });
        }
        
        setIsCheckingPaymentEligibility(false);
      } else {
        // UNAUTHENTICATED USER: Skip eligibility check
        console.log('🔄 [PaymentRouting] User not authenticated, skipping eligibility check');
      }

      // DEFAULT FLOW: Proceed to payment step
      console.log('🔄 [PaymentRouting] Proceeding to payment step (Step 4)');
      console.log('🔄 [PaymentRouting] Current state before setStep(4):', {
        currentStep: step,
        selectedPlan,
        selectedToysCount: selectedToys.length,
        selectedAgeGroup
      });
      setStep(4);

    } catch (error) {
      // CRITICAL ERROR HANDLING: Handle any unexpected errors in the entire flow
      console.error('❌ [PaymentRouting] Critical error in payment routing flow:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context: logContext,
        timestamp: new Date().toISOString()
      });

      // SAFE FALLBACK: Always proceed to payment step
      setIsCheckingPaymentEligibility(false);
      toast.error('Unexpected error occurred. Proceeding to payment...', {
        description: "If problems persist, please contact support."
      });
      setStep(4);
    }
  }, [selectedToys, user?.id]);

  const handleEditToys = useCallback(() => {
    setStep(2);
  }, []);

  // Debug logging for existing customer flows
  useEffect(() => {
    if (isCycleCompletionFlow || isEarlyAccessFlow) {
      console.log('🎯 Existing Customer Flow Debug:', {
        flowType: isCycleCompletionFlow ? 'cycle-completion' : 'early-access',
        existingAgeGroup,
        shouldSkipAgeSelection,
        hasValidSubscriptionHistory,
        selectedAgeGroup,
        currentStep: step,
        isValidAgeGroup: ['1-2', '2-3', '3-4', '4-6', '6-8'].includes(selectedAgeGroup),
        dashboardDataStatus: dashboardQuery.isLoading ? 'loading' : dashboardQuery.data ? 'loaded' : 'no-data'
      });
    }
  }, [isCycleCompletionFlow, isEarlyAccessFlow, existingAgeGroup, shouldSkipAgeSelection, hasValidSubscriptionHistory, selectedAgeGroup, step, dashboardQuery.isLoading, dashboardQuery.data]);

  const handleBack = useCallback(() => {
    console.log('🔙 Back button pressed, current step:', step);
    
    if (step > 1) {
      // Ride-on toy flow
      if (rideOnToyId && step === 3) {
        navigate('/toys?tab=ride_on');
        return;
      }
      
      // Early access and cycle completion flows - always go back to dashboard
      if (isCycleCompletionFlow || isEarlyAccessFlow) {
        if (step === 2) {
          navigate('/dashboard');
          return;
        }
        // For steps 3 and 4, go back one step
        setStep(step - 1);
        return;
      }
      
      // Gold pack or auto-skipped age selection
      if (shouldSkipAgeSelection && step === 2) {
        navigate((isCycleCompletionFlow || isEarlyAccessFlow) ? '/dashboard' : '/pricing');
        return;
      }
      
      // Normal flow - go back one step
      setStep(step - 1);
    } else {
      // From step 1, go to appropriate page
      navigate((isCycleCompletionFlow || isEarlyAccessFlow) ? '/dashboard' : '/pricing');
    }
  }, [
    step, 
    shouldSkipAgeSelection, 
    rideOnToyId, 
    isCycleCompletionFlow,
    isEarlyAccessFlow,
    navigate
  ]);

  // Memoize the loading state to prevent unnecessary re-renders
  const loadingContent = useMemo(() => (
    <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
      <div className="text-center">
        <div className="text-lg">Loading...</div>
      </div>
    </div>
  ), []);

  // If no plan is selected and no ride-on toy, show loading or redirect
  if (!selectedPlan && !rideOnToyId) {
    return loadingContent;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
      {/* Plan-Based Access Banner */}
      {(isCycleCompletionFlow || isEarlyAccessFlow) && (
        <Card className={`mb-6 ${isFreeFlow ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : isPaidFlow ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{isFreeFlow ? '🎉' : isPaidFlow ? '💳' : '🎯'}</span>
              <div className="text-center">
                <div className={`font-bold ${isFreeFlow ? 'text-green-800' : isPaidFlow ? 'text-blue-800' : 'text-blue-800'}`}>
                  {isFreeFlow ? `${suggestedPlan.includes('silver') ? 'Silver Pack' : 'Gold Pack'} Early Access - FREE!` : 
                   isPaidFlow ? 'Discovery Delight Early Access' : 
                   'Ready for Your Next ToyFlix Box!'}
                </div>
                <div className={`text-sm ${isFreeFlow ? 'text-green-700' : isPaidFlow ? 'text-blue-700' : 'text-blue-700'}`}>
                  {isFreeFlow ? '🎯 Free toy selection with automatic coupon application' : 
                   isPaidFlow ? '💳 Monthly subscription payment required to continue' :
                   completionReason === 'cycle-extension' 
                     ? 'Your cycle is complete • Choose toys for your next subscription box' 
                     : 'Complete your cycle selection • Choose toys for your next subscription box'}
                </div>
                <div className={`text-xs ${isFreeFlow ? 'text-green-600' : isPaidFlow ? 'text-blue-600' : 'text-blue-600'} mt-1`}>
                  {isFreeFlow ? '✨ No payment needed - enjoy your premium subscription benefits' : 
                   isPaidFlow ? '💡 Consider upgrading to Silver or Gold for FREE early access' : 
                   '📦 Silver & Gold plans available • Discovery Delight starts at just ₹1,299'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gold Pack Premium Badge */}
      {isGoldPack && (
        <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Crown className="w-6 h-6 text-yellow-600" />
              <div className="text-center">
                <div className="font-bold text-yellow-800">Gold Pack PRO Experience</div>
                <div className="text-sm text-yellow-700">
                  {PlanService.getPlanAccessMessage(selectedPlan)}
                </div>
              </div>
              <Sparkles className="w-6 h-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      )}

      <SubscriptionProgressIndicator 
        currentStep={step} 
        isGoldPack={isGoldPack} 
      />

      {/* Age Group Selection - Skip for Gold Pack OR Existing Customers with Valid History */}
      {step === 1 && !shouldSkipAgeSelection && (
        <AgeGroupSelectionStep
          selectedAgeGroup={selectedAgeGroup}
          setSelectedAgeGroup={setValidatedAgeGroup}
          onBack={handleBack}
          onContinue={handleAgeGroupContinue}
        />
      )}

      {step === 2 && selectedPlan && (
        <ToySelectionStep
          selectedPlan={selectedPlan}
          selectedAgeGroup={selectedAgeGroup}
          onBack={handleBack}
          onComplete={handleToySelectionComplete}
        />
      )}

      {step === 3 && selectedPlan && (
        <CartSummaryStep
          selectedPlan={selectedPlan}
          selectedToys={selectedToys}
          selectedAgeGroup={selectedAgeGroup}
          rideOnToyId={rideOnToyId}
          onBack={handleBack}
          onProceedToPayment={handleProceedToPayment}
          onEditToys={handleEditToys}
          isCheckingPaymentEligibility={isCheckingPaymentEligibility}
        />
      )}

      {step === 4 && selectedPlan && (
        <>
          {console.log('🎯 Rendering PaymentStep with:', { step, selectedPlan, selectedToysCount: selectedToys.length })}
          <PaymentStep
            selectedPlan={selectedPlan}
            selectedToys={selectedToys}
            selectedAgeGroup={selectedAgeGroup}
            rideOnToyId={rideOnToyId}
            onBack={handleBack}
            isCycleCompletionFlow={isCycleCompletionFlow}
            isUpgradeFlow={isUpgradeProcess}
            isRenewalFlow={isRenewalFlow}
            completionReason={completionReason}
          />
        </>
      )}
      
      {/* Debug: Show current step */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-300 rounded p-2 text-xs">
          <strong>Debug:</strong> Step {step} | Plan: {selectedPlan} | Toys: {selectedToys.length}
        </div>
      )}
    </div>
  );
};

export default SubscriptionFlowContent;
