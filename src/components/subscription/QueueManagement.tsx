import { useState, useEffect } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { ToySelectionService } from '@/services/toySelectionService';
import { CycleIntegrationService } from '@/services/cycleIntegrationService';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { Toy } from '@/hooks/useToys';
import { ToySelectionWizard } from './ToySelectionWizard';
import { PaymentFlow } from './PaymentFlow';
import { OrderConfirmation } from './OrderConfirmation';
import { calculateQueueUnlock } from '@/utils/queueUtils';
import { ArrowLeft, X, Settings, Clock, Package, ChevronRight, Crown, Star } from 'lucide-react';
import { getUserSubscriptionPlan, getSubscriptionPlanDisplay, getUpgradeSuggestion, type UserSubscriptionPlan } from '@/utils/subscriptionUtils';

// ✅ Age group validation function - critical for proper toy fetching
const validateAndNormalizeAgeGroup = (ageGroup: string): string => {
  if (!ageGroup) return '3-4'; // Default fallback
  
  // Handle special cases
  if (ageGroup === 'all') return 'all';
  if (['1-2', '2-3', '3-4', '4-6', '6-8'].includes(ageGroup)) return ageGroup;
  
  // Handle common invalid formats stored in subscription data
  const mappings: { [key: string]: string } = {
    '3-5': '3-4',
    '5-7': '4-6', 
    '7-9': '6-8',
    '4-5': '3-4',
    '5-6': '4-6',
    '6-7': '6-8',
    '1-3': '2-3',
    '2-4': '3-4'
  };
  
  if (mappings[ageGroup]) {
    console.log(`✅ QueueManagement - Age group mapping: "${ageGroup}" → "${mappings[ageGroup]}"`);
    return mappings[ageGroup];
  }
  
  // Try to parse age ranges like "3-5" or "4-6"
  const ageRangeMatch = ageGroup.match(/^(\d+)-(\d+)$/);
  if (ageRangeMatch) {
    const minAge = parseInt(ageRangeMatch[1]);
    
    let normalizedAgeGroup: string;
    if (minAge <= 2) normalizedAgeGroup = '1-2';
    else if (minAge <= 3) normalizedAgeGroup = '2-3';
    else if (minAge <= 4) normalizedAgeGroup = '3-4';
    else if (minAge <= 6) normalizedAgeGroup = '4-6';
    else normalizedAgeGroup = '6-8';
    
    console.log(`✅ QueueManagement - Intelligent mapping: "${ageGroup}" → "${normalizedAgeGroup}"`);
    return normalizedAgeGroup;
  }
  
  // Final fallback
  console.log(`⚠️ QueueManagement - Could not parse age group "${ageGroup}", using fallback: "3-4"`);
  return '3-4';
};

// ✅ Plan ID normalization function - critical for PlanService compatibility
const normalizePlanId = (planId: string): string => {
  if (!planId) return 'silver-pack';
  
  // Handle display names to plan IDs
  const planMappings: { [key: string]: string } = {
    'Discovery Delight': 'discovery-delight',
    'discovery delight': 'discovery-delight',
    'Silver Pack': 'silver-pack',
    'silver pack': 'silver-pack',
    'Gold Pack PRO': 'gold-pack',
    'Gold Pack': 'gold-pack',
    'gold pack': 'gold-pack',
    'gold pack pro': 'gold-pack',
    // Legacy mappings
    'basic': 'discovery-delight',
    'premium': 'silver-pack',
    'family': 'gold-pack',
    'standard': 'silver-pack'
  };
  
  // If it's already a valid plan ID, return as-is
  if (['discovery-delight', 'silver-pack', 'gold-pack'].includes(planId.toLowerCase())) {
    return planId.toLowerCase();
  }
  
  // Try exact match first
  if (planMappings[planId]) {
    console.log(`✅ QueueManagement - Plan ID mapping: "${planId}" → "${planMappings[planId]}"`);
    return planMappings[planId];
  }
  
  // Try case-insensitive match
  const lowerPlanId = planId.toLowerCase();
  for (const [key, value] of Object.entries(planMappings)) {
    if (key.toLowerCase() === lowerPlanId) {
      console.log(`✅ QueueManagement - Plan ID mapping (case-insensitive): "${planId}" → "${value}"`);
      return value;
    }
  }
  
  // Final fallback
  console.log(`⚠️ QueueManagement - Unknown plan ID "${planId}", using fallback: "silver-pack"`);
  return 'silver-pack';
};

// Interface for order details
interface OrderDetails {
  orderId: string;
  orderNumber?: string;
  selectedToys: Toy[];
  deliveryAddress: any;
  planName: string;
  totalAmount: number;
  estimatedDeliveryDate?: string;
  deliveryInstructions?: string;
}

// Add cycle-based subscription interface
interface CycleBasedSubscription {
  hasActiveCycle: boolean;
  currentCycle: any;
  planId: string;
  planName: string;
  ageGroup: string;
}

const QueueManagement = () => {
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  const { data: cycleStatus } = useCycleStatus();
  const { toast } = useToast();
  
  // Current queue state
  const [currentSelections, setCurrentSelections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ NEW: Use cycle-based subscription detection
  const [cycleBasedSubscription, setCycleBasedSubscription] = useState<CycleBasedSubscription | null>(null);
  
  // ✅ RESTORED: Complete payment flow states
  const [showSelectionWizard, setShowSelectionWizard] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedToys, setSelectedToys] = useState<Toy[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Subscription plan state
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<UserSubscriptionPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  useEffect(() => {
    loadCurrentSelections();
    loadUserSubscriptionPlan();
    loadCycleBasedSubscription();
  }, [user, subscriptionData]);

  // Handle loading state when subscription data is available
  useEffect(() => {
    if (user && cycleBasedSubscription !== undefined) {
      setIsLoading(false);
    }
  }, [user, cycleBasedSubscription]);

  const loadCurrentSelections = async () => {
    // Always set loading to false if no user or cycle-based subscription data
    if (!user || !cycleBasedSubscription?.hasActiveCycle) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use cycle-based subscription data or fallback to user ID
      const subscriptionId = cycleBasedSubscription.currentCycle?.id || user.id;
      const selections = await ToySelectionService.getUserSelections(
        user.id, 
        subscriptionId
      );
      setCurrentSelections(selections || []);
    } catch (error) {
      console.error('Error loading selections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserSubscriptionPlan = async () => {
    if (!user?.id) {
      setIsLoadingPlan(false);
      return;
    }

    try {
      console.log('🔍 Loading subscription plan for queue management...');
      const plan = await getUserSubscriptionPlan(user.id);
      setUserSubscriptionPlan(plan);
      console.log('✅ Subscription plan loaded:', plan);
    } catch (error) {
      console.error('❌ Error loading subscription plan:', error);
      setUserSubscriptionPlan(null);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // ✅ CRITICAL FIX: Load cycle-based subscription data with proper subscription_status filtering
  const loadCycleBasedSubscription = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 QueueManagement - Loading cycle-based subscription...');
      
      // 🎯 PRIORITY 1: Check rental_orders with subscription_status = 'active' first
      console.log('🔍 QueueManagement - Checking rental_orders for active subscriptions...');
      const { data: activeRentalOrders, error: rentalError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')  // 🎯 KEY: Only get admin-enabled subscriptions
        .order('created_at', { ascending: false })
        .limit(1);

      if (!rentalError && activeRentalOrders && activeRentalOrders.length > 0) {
        const activeOrder = activeRentalOrders[0] as any;
        console.log('✅ QueueManagement - Found active subscription from rental_orders:', activeOrder);
        
        const cycleSubscription: CycleBasedSubscription = {
          hasActiveCycle: true,
          currentCycle: {
            cycle_id: activeOrder.id,
            cycle_number: activeOrder.cycle_number || 1,
            plan_name: activeOrder.subscription_plan || 'Silver Pack',
            can_update_toys: true, // Can be enhanced based on cycle logic
            toys_count: activeOrder.toys_data?.length || 0,
            cycle_status: 'active'
          },
          planId: normalizePlanId(activeOrder.subscription_plan) || 'silver-pack',
          planName: activeOrder.subscription_plan || 'Silver Pack',
          ageGroup: validateAndNormalizeAgeGroup(activeOrder.age_group) || '3-4'
        };
        
        setCycleBasedSubscription(cycleSubscription);
        console.log('✅ QueueManagement - Using active subscription from rental_orders:', cycleSubscription);
        setIsLoading(false);
        return;
      } else {
        console.log('⚠️ QueueManagement - No active rental orders found or error:', rentalError?.message);
      }
      
      // 🎯 PRIORITY 2: Try new cycle system as fallback
      console.log('🔍 QueueManagement - Trying cycle integration service...');
      const cycleStatus = await CycleIntegrationService.canUserUpdateCycle(user.id);
      
      if (cycleStatus.currentCycle) {
        const cycleSubscription: CycleBasedSubscription = {
          hasActiveCycle: true,
          currentCycle: cycleStatus.currentCycle,
          planId: normalizePlanId(cycleStatus.currentCycle.plan_name),
          planName: cycleStatus.currentCycle.plan_name,
          ageGroup: validateAndNormalizeAgeGroup('3-4') // Default for cycle system
        };
        
        setCycleBasedSubscription(cycleSubscription);
        console.log('✅ QueueManagement - Found cycle-based subscription:', cycleSubscription);
        setIsLoading(false);
        return;
      } else {
        console.log('⚠️ QueueManagement - No cycle found from integration service');
      }
      
      // 🎯 PRIORITY 3: Last resort fallback to old subscription system
      console.log('🔍 QueueManagement - Trying legacy subscription system...');
      if (subscriptionData?.subscription) {
        const fallbackSubscription: CycleBasedSubscription = {
          hasActiveCycle: false,
          currentCycle: null,
          planId: normalizePlanId(subscriptionData.subscription.plan_id) || 'silver-pack',
          planName: subscriptionData.subscription.plan_id || 'Silver Pack',
          ageGroup: validateAndNormalizeAgeGroup(subscriptionData.subscription.age_group) || '3-4'
        };
        
        setCycleBasedSubscription(fallbackSubscription);
        console.log('✅ QueueManagement - Using legacy subscription fallback:', fallbackSubscription);
      } else {
        setCycleBasedSubscription(null);
        console.log('❌ QueueManagement - No subscription found anywhere');
      }
      
    } catch (error) {
      console.error('❌ QueueManagement - Error loading subscription:', error);
      setCycleBasedSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSelection = () => {
    setShowSelectionWizard(true);
  };

  // ✅ RESTORED: Route to payment flow instead of direct update
  const handleSelectionComplete = (toys: Toy[]) => {
    console.log('🔥 QueueManagement - handleSelectionComplete called with toys:', toys.length);
    setSelectedToys(toys);
    setShowSelectionWizard(false);
    setShowPaymentFlow(true);
    console.log('🔥 QueueManagement - Proceeding to payment flow');
  };

  // ✅ RESTORED: Payment flow helper functions
  const handleOrderComplete = async (orderData: any) => {
    console.log('🎯 QueueManagement - Order completed:', orderData);
    
    // 🔒 NEW: Automatically close selection window after queue order completion
    if (user?.id) {
      try {
        const { SubscriptionService } = await import('@/services/subscriptionService');
        const windowClosed = await SubscriptionService.closeSelectionWindowAfterOrder(
          user.id, 
          'queue_order',
          `Queue order completed: ${orderData.orderNumber || 'N/A'}`
        );
        
        if (windowClosed) {
          console.log('✅ Selection window automatically closed after queue order completion');
        } else {
          console.warn('⚠️ Failed to close selection window after queue order (non-critical)');
        }
      } catch (windowError) {
        console.error('⚠️ Error closing selection window after queue order (non-critical):', windowError);
      }
    }
    
    const orderDetails: OrderDetails = {
      orderId: orderData.orderId || `queue-${Date.now()}`,
      orderNumber: orderData.orderNumber,
      selectedToys: selectedToys,
      deliveryAddress: orderData.shippingAddress || {},
      planName: cycleBasedSubscription?.planName || 'Discovery Delight',
      totalAmount: orderData.totalAmount || 0,
      deliveryInstructions: orderData.deliveryInstructions,
      estimatedDeliveryDate: orderData.estimatedDeliveryDate
    };
    
    setOrderDetails(orderDetails);
    setShowPaymentFlow(false);
    setShowOrderConfirmation(true);
  };

  const handleBackToSelection = () => {
    setShowPaymentFlow(false);
    setShowSelectionWizard(true);
  };

  const handleViewOrderDetails = () => {
    if (orderDetails) {
      window.location.href = `/order-summary?order_id=${orderDetails.orderId}&type=queue-update`;
    }
  };

  const handleReturnToDashboard = () => {
    resetAllStates();
    window.location.href = '/dashboard';
  };

  const handleBackToOverview = () => {
    resetAllStates();
  };

  const handleCancelEntireProcess = () => {
    resetAllStates();
    toast({
      title: "Queue management canceled",
      description: "You can restart anytime.",
    });
  };

  const resetAllStates = () => {
    setShowSelectionWizard(false);
    setShowPaymentFlow(false);
    setShowOrderConfirmation(false);
    setSelectedToys([]);
    setOrderDetails(null);
  };

  const getQueueDeadlineInfo = () => {
    if (!cycleStatus) return "Queue information unavailable";
    
    const queueInfo = calculateQueueUnlock(
      cycleStatus.plan_id ? new Date().toISOString().split('T')[0] : null,
      cycleStatus.days_in_current_cycle
    );

    const daysLeft = Math.max(0, 30 - cycleStatus.days_in_current_cycle);
    return `Selection window closes in ${daysLeft} days`;
  };

  const getCurrentTitle = () => {
    if (showOrderConfirmation) return "Order Updated Successfully";
    if (showPaymentFlow) return "";
    if (showSelectionWizard) return "Select Your Next Toys";
    return "Add Toys";
  };

  // Render subscription plan banner
  const renderSubscriptionPlanBanner = () => {
    if (isLoadingPlan) {
      return (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-32 h-4 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!userSubscriptionPlan) {
      return (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">No Active Subscription</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Subscribe to a plan to manage your toy queue and enjoy automatic deliveries.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.location.href = '/subscription'}
                >
                  View Subscription Plans
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const planDisplay = getSubscriptionPlanDisplay(userSubscriptionPlan.planType);
    
    if (userSubscriptionPlan.isFreeQueueUpdates) {
      // Premium plan banner (Silver/Gold)
      return (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-green-900">Change Toys Anytime</h3>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {planDisplay.icon} {planDisplay.name}
                  </Badge>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  You can change your toy selection for your next box anytime - completely free! 
                  No extra fees when you want different toys.
                </p>
                <div className="flex items-center space-x-1 mt-2 text-xs text-green-600">
                  <Crown className="w-3 h-3" />
                  <span>Premium Benefit</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      // Discovery Delight plan banner
      const upgradeSuggestion = getUpgradeSuggestion(userSubscriptionPlan.planType);
      
      return (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-blue-900">Queue Update Pricing</h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {planDisplay.icon} {planDisplay.name}
                  </Badge>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Changing toys costs ₹199 + GST (₹235 total) with Discovery Delight plan.
                </p>
                {upgradeSuggestion && (
                  <div className="mt-2 p-2 bg-blue-100 rounded-md">
                    <p className="text-xs text-blue-800 font-medium">💡 Upgrade Suggestion:</p>
                    <p className="text-xs text-blue-700 mt-1">{upgradeSuggestion.message}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => window.location.href = upgradeSuggestion.upgradeUrl}
                    >
                      Upgrade to Premium
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Loading your current queue...</p>
        </CardContent>
      </Card>
    );
  }

  // Handle missing subscription data - NEW LOGIC
  if (!cycleBasedSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-orange-600">⚠️</span>
            Add Toys
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 font-medium">No Active Subscription Found</p>
            <p className="text-orange-700 text-sm mt-2">
              You need an active subscription to manage your toy queue.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600">To access queue management:</p>
            <ol className="text-sm text-gray-500 text-left space-y-1 max-w-md mx-auto">
              <li>1. Subscribe to a ToyFlix plan</li>
              <li>2. Wait for your first delivery</li>
              <li>3. Return to manage your next cycle</li>
            </ol>
          </div>
          <Button 
            onClick={() => window.location.href = '/subscription-flow'}
            className="mt-4"
          >
            Start Subscription
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ✅ RESTORED: Order Confirmation render
  if (showOrderConfirmation && orderDetails) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{getCurrentTitle()}</h2>
        </div>
        <OrderConfirmation
          orderDetails={orderDetails}
          onViewOrderDetails={handleViewOrderDetails}
          onReturnToDashboard={handleReturnToDashboard}
          isQueueOrder={true}
        />
      </div>
    );
  }

  // ✅ RESTORED: Payment Flow render
  if (showPaymentFlow) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{getCurrentTitle()}</h2>
          <Button variant="outline" onClick={handleCancelEntireProcess}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleBackToSelection}
          size="sm"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Toy Selection
        </Button>

        <PaymentFlow
          selectedPlan={cycleBasedSubscription?.planId || 'silver-pack'}
          selectedToys={selectedToys}
          ageGroup={cycleBasedSubscription?.ageGroup || '3-5'}
          onBack={handleBackToSelection}
          isCycleCompletionFlow={true}
          completionReason="queue-update"
          isQueueOrder={true}
          onOrderComplete={handleOrderComplete}
        />
      </div>
    );
  }

  // Render Toy Selection Wizard
  if (showSelectionWizard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {getCurrentTitle() && (
            <h2 className="text-2xl font-bold">{getCurrentTitle()}</h2>
          )}
          <Button variant="outline" onClick={handleCancelEntireProcess}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
        
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={handleBackToOverview}
            size="sm"
            className="text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </div>

        <div className="mb-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-medium">
              🎯 Add Toys
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Select toys for your next monthly delivery. This will update your existing cycle.
              {cycleBasedSubscription?.planId === 'discovery-delight' 
                                  ? ' No payment needed for changing toys.' 
                : ' Free with your premium subscription!'}
            </p>
          </div>
        </div>


        
        {(() => {
          // ✅ CRITICAL FIX: Use cycle-based subscription data
          const rawPlanId = cycleBasedSubscription?.planId || 'silver-pack';
          const rawAgeGroup = cycleBasedSubscription?.ageGroup || '3-4';
          
          const normalizedPlanId = normalizePlanId(rawPlanId);
          const validatedAgeGroup = validateAndNormalizeAgeGroup(rawAgeGroup);
          
          console.log('🎯 QueueManagement - ToySelectionWizard parameters:', {
            originalPlanId: rawPlanId,
            normalizedPlanId,
            originalAgeGroup: rawAgeGroup,
            validatedAgeGroup,
            cycleBasedSubscription,
            userId: user?.id
          });
          
          return (
            <ToySelectionWizard
              planId={normalizedPlanId}
              ageGroup={validatedAgeGroup}
              onComplete={handleSelectionComplete}
              isQueueManagement={true}
            />
          );
        })()}
      </div>
    );
  }

  // Render Overview (default state)
  return (
    <div className="space-y-6">
      {/* ✅ SUBSCRIPTION PLAN BANNER */}
      {renderSubscriptionPlanBanner()}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {getCurrentTitle()}
            {cycleBasedSubscription?.hasActiveCycle && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Cycle #{cycleBasedSubscription.currentCycle.cycle_number} - {cycleBasedSubscription.currentCycle.can_update_toys ? 'Selection Open' : 'Selection Closed'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ CYCLE STATUS INFO */}
          {cycleBasedSubscription?.hasActiveCycle && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium">
                🎯 Current Cycle Status
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Cycle #{cycleBasedSubscription.currentCycle.cycle_number} • {cycleBasedSubscription.currentCycle.plan_name}
                <br />
                {cycleBasedSubscription.currentCycle.toys_count} toys selected
                {cycleBasedSubscription.currentCycle.can_update_toys 
                  ? ' • You can update your selection' 
                  : ' • Selection window is closed'}
              </p>
            </div>
          )}
          
          {/* ✅ CURRENT SELECTIONS DISPLAY */}
          {currentSelections.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-3">Current Queue Selection:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSelections.map((selection, index) => (
                  <div key={selection.id} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                    <img
                      src={selection.toys?.image_url || "/placeholder.svg"}
                      alt={selection.toys?.name || "Toy"}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium">{selection.toys?.name}</h5>
                      <p className="text-sm text-muted-foreground">{selection.toys?.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Step {selection.selection_step}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selection.toy_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <p className="text-muted-foreground mb-4">
                {cycleBasedSubscription?.hasActiveCycle 
                  ? 'No toys selected for this cycle yet.' 
                  : 'No active cycle found.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {cycleBasedSubscription?.hasActiveCycle 
                  ? 'Start your selection to customize your delivery.'
                  : 'Please check back when you have an active subscription cycle.'}
              </p>
            </div>
          )}

          {/* ✅ ACTION BUTTON */}
          {cycleBasedSubscription?.hasActiveCycle && cycleBasedSubscription.currentCycle.can_update_toys ? (
            <Button 
              onClick={handleStartSelection} 
              className="w-full"
              size="lg"
            >
              Start Selection
            </Button>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                {!cycleBasedSubscription?.hasActiveCycle 
                  ? 'No active cycle available for updates'
                  : 'Selection window is currently closed'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueManagement;
