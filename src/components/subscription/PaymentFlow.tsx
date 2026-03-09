import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { PlanService } from '@/services/planService';
import { SubscriptionService } from '@/services/subscriptionService';
import { useSubscriptionUpgrade } from '@/hooks/useSubscriptionUpgrade';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import LocationPicker from '@/components/profile/LocationPicker';
import { MapPin, CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { fbqTrack } from '@/utils/fbq';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { getUserSubscriptionPlan, getUserQueuePricing, getSubscriptionPlanDisplay, getUpgradeSuggestion, type QueuePricingInfo } from '@/utils/subscriptionUtils';
import { useAddressPrefill, isAddressComplete, standardizeShippingAddress } from '@/hooks/useAddressPrefill';
import AddressSelectionDialog from '@/components/admin/AddressSelectionDialog';
import { DiscountService } from '@/services/discountService';

interface PaymentFlowProps {
  selectedPlan: string;
  selectedToys: any[];
  ageGroup?: string;
  rideOnToyId?: string;
  onBack?: () => void;
  isCycleCompletionFlow?: boolean;
  completionReason?: string;
  isQueueOrder?: boolean;
  isUpgradeFlow?: boolean;
  isRenewalFlow?: boolean;
  onOrderComplete?: (orderData: any) => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  selectedPlan,
  selectedToys,
  ageGroup,
  rideOnToyId,
  onBack,
  isCycleCompletionFlow = false,
  completionReason = '',
  isQueueOrder = false,
  isUpgradeFlow = false,
  isRenewalFlow = false,
  onOrderComplete
}) => {
  // Debug logging for PaymentFlow props
  console.log('🔍 PaymentFlow rendered with props:', {
    selectedPlan,
    selectedToysCount: selectedToys?.length || 0,
    ageGroup,
    rideOnToyId,
    isCycleCompletionFlow,
    isQueueOrder,
    isUpgradeFlow,
    isRenewalFlow
  });
  const { initializePayment, isLoading } = useRazorpay();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  const { data: cycleStatus } = useCycleStatus();
  const queryClient = useQueryClient();
  const upgradeSubscription = useSubscriptionUpgrade();
  
  // 🏠 ENHANCED: Use address prefill hook for automatic address loading
  const { 
    addressData, 
    setAddressData, 
    isLoadingAddress, 
    hasPrefilledAddress,
    refreshAddress 
  } = useAddressPrefill(true, true);
  
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // New fields for enhanced checkout
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  // Coupon-related state removed (queue bypass functionality removed)
  const [isCreatingFreeOrder, setIsCreatingFreeOrder] = useState(false);
  
  // Separate promo code system for 20% discounts
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  
  // Handle ride-on toy payments
  const isRideOnPayment = !!rideOnToyId;

  // 🏠 NOTE: isAddressComplete and standardizeShippingAddress functions are now imported from useAddressPrefill hook

  // Get plan first before calculations
  const plan = isRideOnPayment 
    ? { 
        id: 'ride_on_fixed', 
        name: 'Ride-On Monthly', 
        description: 'Single ride-on toy rental with no age restrictions',
        price: 1999,
        duration: 1 
      }
    : PlanService.getPlan(selectedPlan);

  // Calculate GST and total amount (ride-on has fixed pricing) - MOVED UP
  const baseAmount = plan?.price || 0;
  const gstAmount = isRideOnPayment ? Math.round(1999 * 18 / 100) : PlanService.calculateGST(baseAmount);
  const subtotalAmount = isRideOnPayment ? 2359 : PlanService.calculateTotalWithGST(baseAmount);

  // Auto-apply exit discount if available (calculate on base amount, not total with GST)
  useEffect(() => {
    if (user && baseAmount > 0 && !appliedPromo) {
      DiscountService.autoApplyExitDiscount(
        user.id,
        baseAmount, // Use base amount instead of subtotal to avoid GST in discount calculation
        (result) => {
          if (result.isValid && result.offerDetails) {
            setPromoDiscount(result.discountAmount);
            setAppliedPromo(result.offerDetails.code);
            setPromoCode(result.offerDetails.code);
            toast.success(`🎉 ${result.offerDetails.name} applied! You save ₹${result.discountAmount}!`);
          }
        }
      );
    }
  }, [user, baseAmount, appliedPromo]);

  // Initialize address data from profile
  useEffect(() => {
    if (profile) {
      setAddressData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        address_line1: profile.address_line1 || '',
        apartment: (profile as any).apartment || (profile as any).address_line2 || '',
        city: profile.city || '',
        state: profile.state || '',
        zip_code: profile.zip_code || (profile as any).postcode || '',
        country: (profile as any).country || 'India',
        latitude: profile.latitude,
        longitude: profile.longitude,
        plus_code: (profile as any).plus_code || null,
      });
    }
  }, [profile]);
  
  if (!plan) {
    console.error('❌ PaymentFlow: Plan not found for selectedPlan:', selectedPlan);
    console.error('❌ PaymentFlow: Available plans:', PlanService.getAllPlans().map(p => p.id));
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">
            <p>Plan "{selectedPlan}" not found.</p>
            <p className="text-sm mt-2">Available plans: {PlanService.getAllPlans().map(p => p.id).join(', ')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading your profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate final amounts with discounts (apply discount to base amount, then recalculate GST)
  const discountedBaseAmount = Math.max(0, baseAmount - promoDiscount);
  const finalGstAmount = isRideOnPayment ? 
    Math.round((1999 - promoDiscount) * 18 / 100) : 
    PlanService.calculateGST(discountedBaseAmount);
  const finalTotalAmount = discountedBaseAmount + finalGstAmount;

  // Handle location selection from map - SIMPLIFIED
  const handleLocationSelect = ({ lat, lng, plus_code, addressComponents }: any) => {
    console.log('🗺️ Location selected:', { lat, lng, plus_code, addressComponents });
    
    // Update address data with map selection
    setAddressData(prev => ({
      ...prev,
      address_line1: addressComponents.address_line1 || prev.address_line1,
      apartment: addressComponents.apartment || prev.apartment,
      city: addressComponents.city || prev.city,
      state: addressComponents.state || prev.state,
      zip_code: addressComponents.zip_code || prev.zip_code,
      country: addressComponents.country || 'India',
      latitude: lat,
      longitude: lng,
      plus_code: plus_code || null,
    }));
    
    // Show success feedback
    toast.success('📍 Address retrieved from map! You can edit the details below.');
    
    console.log('✅ Address data updated from map');
  };

  // Auto-save address to profile when complete (but don't switch forms)
  const handleSaveAddress = async (switchToDisplayMode = true) => {
    if (!isAddressComplete(addressData)) {
      return; // Don't save incomplete addresses
    }

    setIsUpdatingAddress(true);
    try {
      await updateProfile.mutateAsync(addressData);
      console.log('✅ Address auto-saved to profile');
    } catch (error: any) {
      console.error('Address auto-save failed:', error);
      // Don't show error toast for auto-save failures to avoid UX interruption
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  // Handle address selection from dialog
  const handleAddressSelected = (selectedAddress: any) => {
    console.log('📍 Address selected from dialog:', selectedAddress);
    
    setAddressData({
      first_name: selectedAddress.first_name || '',
      last_name: selectedAddress.last_name || '',
      address_line1: selectedAddress.line1 || '',
      apartment: selectedAddress.line2 || '',
      city: selectedAddress.city || '',
      state: selectedAddress.state || '',
      zip_code: selectedAddress.pincode || '',
      country: 'India',
      latitude: selectedAddress.latitude || null,
      longitude: selectedAddress.longitude || null,
      plus_code: selectedAddress.plus_code || null,
    });
    
    toast.success('✅ Address selected successfully!');
  };

  // 🏠 NOTE: Address prefilling is now handled by useAddressPrefill hook

  // Auto-save address when it becomes complete (but don't switch forms during editing)
  useEffect(() => {
    if (isAddressComplete(addressData) && !isLoadingAddress) {
      // Auto-save but don't switch to display mode - let user continue editing
      handleSaveAddress(false);
    }
  }, [addressData.first_name, addressData.last_name, addressData.address_line1, addressData.apartment, addressData.city, addressData.state, addressData.zip_code, isLoadingAddress]);

  // Enhanced auto-coupon logic for all subscription flows WITH COMPREHENSIVE ERROR HANDLING
  useEffect(() => {
    const applyAutoCoupon = async () => {
      const logContext = { 
        userId: user?.id, 
        selectedPlan, 
        isCycleCompletionFlow, 
        appliedPromo,
        method: 'applyAutoCoupon'
      };

      try {
        console.log('🔍 [AutoCoupon] Starting auto-coupon evaluation:', logContext);

        // VALIDATION: Check if promo already applied
        if (appliedPromo) {
          console.log('ℹ️ [AutoCoupon] Promo already applied, skipping:', appliedPromo);
          return;
        }

        // VALIDATION: Check required dependencies
        if (!subtotalAmount || subtotalAmount <= 0) {
          console.log('ℹ️ [AutoCoupon] No subtotal amount, skipping auto-coupon');
          return;
        }

        if (!selectedPlan) {
          console.log('ℹ️ [AutoCoupon] No plan selected, skipping auto-coupon');
          return;
        }

        // QUEUE ORDER FLOW: Regular payment flow (admin bypass functionality removed)
        if (isQueueOrder) {
          console.log('🎯 [AutoCoupon] Queue order flow - regular payment required');
          // No automatic bypasses - all queue orders require payment
          // Admin can manually apply coupons if needed
          return;
        }

        // CYCLE COMPLETION FLOW: Existing logic (keep as-is for backward compatibility)
        if (isCycleCompletionFlow) {
          console.log('🚀 [AutoCoupon] Processing cycle completion flow');
          
          try {
            if (selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack') {
              console.log('✅ [AutoCoupon] Auto-applying cycle completion coupon for:', selectedPlan);
              setPromoDiscount(subtotalAmount);
              setAppliedPromo('CYCLE2025');
              toast.success(`🎉 Cycle completion coupon auto-applied! Your ${selectedPlan === 'silver-pack' ? 'Silver' : 'Gold'} subscription is now FREE!`);
              return;
            } else if (selectedPlan === 'discovery-delight') {
              console.log('💡 [AutoCoupon] Discovery Delight in cycle completion - requires payment');
              toast.info('💡 Discovery Delight requires payment • Upgrade to Silver or Gold for FREE cycle completion benefit!');
              return;
            } else {
              console.warn('⚠️ [AutoCoupon] Unknown plan in cycle completion flow:', selectedPlan);
              return;
            }
          } catch (cycleError) {
            console.error('❌ [AutoCoupon] Error in cycle completion logic:', cycleError);
            // Don't fail the whole process - just skip cycle completion logic
          }
        }

        // SUBSCRIPTION BYPASS FLOW: Removed (admin-only functionality)
        // All users now go through regular payment flow
        // Admin can manually apply coupons if needed
        console.log('🔍 [AutoCoupon] No automatic subscription bypass - regular payment flow');

      } catch (error) {
        // CRITICAL ERROR HANDLING: Handle any unexpected errors
        console.error('❌ [AutoCoupon] Critical error in auto-coupon logic:', {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          context: logContext,
          timestamp: new Date().toISOString()
        });

        // SAFE FALLBACK: Don't show technical errors to users
        console.log('🔄 [AutoCoupon] Graceful fallback to normal payment flow');
        
        // Optional: Show a generic message for persistent errors
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          toast.warning('Having trouble verifying subscription status. Payment flow is still available.');
        }
      }
    };

    // EXECUTION: Only run auto-coupon logic if we have required data
    if (subtotalAmount > 0 && selectedPlan) {
      console.log('🚀 [AutoCoupon] Starting auto-coupon check with dependencies:', {
        hasSubtotal: subtotalAmount > 0,
        hasSelectedPlan: !!selectedPlan,
        hasUser: !!user?.id,
        isCycleFlow: isCycleCompletionFlow
      });
      
      applyAutoCoupon();
    } else {
      console.log('ℹ️ [AutoCoupon] Skipping auto-coupon - missing dependencies:', {
        subtotalAmount,
        selectedPlan,
        hasUser: !!user?.id
      });
    }
  }, [isCycleCompletionFlow, selectedPlan, subtotalAmount, user?.id, isQueueOrder]);

  const handlePayment = async () => {
    // Ensure name and address are complete before payment
    if (!isAddressComplete(addressData)) {
      toast.error('Please provide your name and complete delivery address (including apartment/house number) before proceeding with payment');
      return;
    }

    // Fire Meta Pixel AddPaymentInfo event
    fbqTrack('AddPaymentInfo', {
      value: finalTotalAmount,
      currency: 'INR'
    });
    
    // 🎯 PRIORITY CHECK: Queue orders for Silver/Gold plans should ALWAYS be free
    // This must be checked BEFORE upgrade flow to prevent payment requests for premium plan queue orders
    if (isQueueOrder && (selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack')) {
      console.log('🚀 PRIORITY: Queue order for premium plan detected - processing as free order');
      console.log('📋 Queue order details:', {
        selectedPlan,
        finalTotalAmount,
        appliedPromo,
        isUpgradeFlow,
        isPremiumPlan: true
      });
      
      // Force proceed as free order - this should already be set by auto-coupon logic
      if (finalTotalAmount > 0) {
        console.warn('⚠️ WARNING: Premium plan queue order has non-zero amount - forcing to free');
        console.warn('⚠️ This might indicate auto-coupon logic failed. Proceeding as free order anyway.');
      }
      
      // Skip all payment logic and proceed to free order processing below
    }
    // Handle subscription renewals - NEW
    else if (isRenewalFlow) {
      try {
        setIsCreatingFreeOrder(true);
        toast.info('Processing subscription renewal...');
        
        const { SubscriptionLifecycle } = await import('@/services/subscription/subscriptionLifecycle');
        const renewalResult = await SubscriptionLifecycle.renewSubscription(user.id);
        
        if (renewalResult.success) {
          toast.success(renewalResult.message || 'Subscription renewed successfully!');
          onOrderComplete?.({
            type: 'renewal',
            planId: selectedPlan,
            message: renewalResult.message
          });
          return;
        } else {
          throw new Error(renewalResult.message || 'Renewal failed');
        }
      } catch (error: any) {
        console.error('Error processing subscription renewal:', error);
        toast.error(`Failed to process renewal: ${error.message}`);
      } finally {
        setIsCreatingFreeOrder(false);
      }
      return;
    }
    // Handle subscription upgrades - ENHANCED APPROACH with proper cycle handling
    else if (isUpgradeFlow) {
      try {
        setIsCreatingFreeOrder(true);
        toast.info('Processing plan upgrade...');
        
        // Use enhanced upgrade service
        const { SubscriptionUpgrade } = await import('@/services/subscription/subscriptionUpgrade');
        const upgradeResult = await SubscriptionUpgrade.upgradePlan(user.id, selectedPlan);
        
        if (upgradeResult.success) {
          toast.success(upgradeResult.message || 'Plan upgraded successfully!');
          onOrderComplete?.({
            type: 'upgrade',
            planId: selectedPlan,
            message: upgradeResult.message
          });
          return;
        } else {
          throw new Error(upgradeResult.message || 'Upgrade failed');
        }


      } catch (error: any) {
        console.error('Error processing plan upgrade:', error);
        toast.error(`Failed to process plan upgrade: ${error.message}`);
      } finally {
        setIsCreatingFreeOrder(false);
      }
      return;
    }

    // Handle free orders (including premium plan queue orders)
    if (finalTotalAmount === 0 || (isQueueOrder && (selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack'))) {
      try {
        setIsCreatingFreeOrder(true);
        
        // Import OrderService dynamically to avoid circular imports
        const { OrderService } = await import('@/services/orderService');
        
        let createdOrder;
        
        // Handle queue orders differently
        if (isQueueOrder) {
          // Use createQueueOrder for queue management orders
          const queueOrderData = {
            userId: user.id,
            originalSubscriptionId: subscriptionData?.subscription?.id || '',
            selectedToys: selectedToys,
            ageGroup,
            totalAmount: finalTotalAmount,
            baseAmount,
            gstAmount,
            couponDiscount: promoDiscount,
            appliedCoupon: appliedPromo,
            deliveryInstructions,
            shippingAddress: standardizeShippingAddress(addressData, profile),
            queueOrderType: 'next_cycle' as const,
            currentPlanId: selectedPlan,
            cycleNumber: cycleStatus?.days_in_current_cycle || 1
          };
          
          createdOrder = await OrderService.createQueueOrder(queueOrderData);
        } else {
          // Use regular createFreeOrder for regular subscriptions
          const orderData = {
            userId: user.id,
            planId: selectedPlan,
            selectedToys: isRideOnPayment ? [] : selectedToys,
            rideOnToyId: rideOnToyId,
            ageGroup,
            totalAmount: finalTotalAmount,
            baseAmount,
            gstAmount,
            couponDiscount: promoDiscount,
            appliedCoupon: appliedPromo,
            deliveryInstructions,
            shippingAddress: standardizeShippingAddress(addressData, profile),
            orderType: isRideOnPayment ? 'ride_on' as const : 'subscription' as const
          };

          createdOrder = await OrderService.createFreeOrder(orderData);
        }
        
        // Fire Meta Pixel Purchase event
        fbqTrack('Purchase', {
          value: finalTotalAmount,
          currency: 'INR',
          content_ids: selectedToys.map((t: any) => t.id),
          num_items: selectedToys.length,
          content_type: 'product'
        });
        
        // 🎯 CRITICAL FIX: For cycle completion flows, create queue entry to disable "Choose Next Toys" button
        if (isCycleCompletionFlow && !isRideOnPayment && selectedToys.length > 0 && !isQueueOrder) {
          try {
            console.log('🎯 Creating queue entry for cycle completion flow');
            
            // Import NextCycleService dynamically to avoid circular imports
            const { NextCycleService } = await import('@/services/nextCycleService');
            
            // Transform selected toys to the format expected by NextCycleService
            const queueToys = selectedToys.map((toy: any) => ({
              toy_id: toy.id,
              name: toy.name,
              category: toy.category || 'educational',
              image_url: toy.image_url,
              unit_price: toy.rental_price || toy.price || 0,
              total_price: toy.total_price || toy.rental_price || toy.price || 0,
              quantity: toy.quantity || 1,
              returned: false
            }));

            const queueResult = await NextCycleService.queueToysForNextCycle(
              user.id,
              queueToys,
              standardizeShippingAddress(addressData),
              deliveryInstructions
            );

            if (queueResult.success) {
              console.log('✅ Queue entry created successfully for cycle completion');
            } else {
              console.warn('⚠️ Queue creation failed (non-critical):', queueResult.message);
            }

          } catch (queueError) {
            console.error('⚠️ Queue creation error (non-critical):', queueError);
            // Don't fail the whole operation if queue creation fails
          }
        }
        
        // Show appropriate success message
        const successMessage = isQueueOrder 
          ? '🎯 Queue updated successfully! Your next delivery has been updated.'
          : createdOrder.message;
        
        toast.success(successMessage);
        
        // 🔒 NEW: Automatically close selection window after order placement
        try {
          const { SubscriptionService } = await import('@/services/subscriptionService');
          const orderType = isQueueOrder ? 'queue_order' : 'cycle_update';
          const windowClosed = await SubscriptionService.closeSelectionWindowAfterOrder(
            user.id, 
            orderType,
            `Order placed: ${createdOrder.orderNumber || 'N/A'}`
          );
          
          if (windowClosed) {
            console.log('✅ Selection window automatically closed after order placement');
          } else {
            console.warn('⚠️ Failed to close selection window after order placement (non-critical)');
          }
        } catch (windowError) {
          console.error('⚠️ Error closing selection window after order (non-critical):', windowError);
        }
        
        // 🔄 CRITICAL FIX: Invalidate all related caches including queue queries
        console.log('🔄 Invalidating all related caches after order creation');
        queryClient.invalidateQueries({ queryKey: ['user-orders'] });
        queryClient.invalidateQueries({ queryKey: ['current-rentals'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        
        // Critical: Invalidate queue-related queries to update dashboard state
        queryClient.invalidateQueries({ queryKey: ['queued-toys'] });
        queryClient.invalidateQueries({ queryKey: ['queue-eligibility'] });
        queryClient.invalidateQueries({ queryKey: ['rental-orders'] });
        queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] });
        
        // Critical: Invalidate selection window related queries
        queryClient.invalidateQueries({ queryKey: ['selection-status', user.id] });
        queryClient.invalidateQueries({ queryKey: ['subscription-cycle', user.id] });
        queryClient.invalidateQueries({ queryKey: ['rental-subscription-data', user.id] });
        queryClient.invalidateQueries({ queryKey: ['cycleStatus', user.id] }); // 🔒 CRITICAL: Invalidate cycle status for dashboard
        
        // Force immediate refetch
        queryClient.refetchQueries({ queryKey: ['user-orders', user.id] });
        queryClient.refetchQueries({ queryKey: ['current-rentals', user.id] });
        queryClient.refetchQueries({ queryKey: ['queued-toys', user.id] });
        
        // Navigate to appropriate confirmation page after brief delay for Azure compatibility
        setTimeout(() => {
          if (onOrderComplete) {
            // For queue orders with callback, pass order data to parent component
            onOrderComplete({
              orderId: createdOrder.orderId || `order-${Date.now()}`,
              orderNumber: createdOrder.orderNumber,
              shippingAddress: standardizeShippingAddress(addressData, profile),
              totalAmount: finalTotalAmount,
              baseAmount,
              gstAmount,
              couponDiscount: promoDiscount,
              appliedCoupon: appliedPromo,
              deliveryInstructions,
              selectedToys,
              planId: selectedPlan,
              message: createdOrder.message
            });
          } else if (isQueueOrder) {
            // For queue orders without callback, redirect to queue confirmation page
            window.location.href = `/order-summary?order_id=${createdOrder.orderId || ''}&type=queue-update`;
          } else {
            // For regular orders, use standard order summary
            window.location.href = `/order-summary?order_id=${createdOrder.orderId || ''}`;
          }
        }, 1500);
        
      } catch (error: any) {
        console.error('Error creating order:', error);
        const errorMessage = isQueueOrder 
          ? `Failed to update queue: ${error.message}`
          : `Failed to create order: ${error.message}`;
        toast.error(errorMessage);
      } finally {
        setIsCreatingFreeOrder(false);
      }
      return;
    }
    
    await initializePayment({
      amount: finalTotalAmount * 100, // Convert total amount (including GST) to paise
      currency: 'INR',
      orderType: 'subscription', // Both regular and ride-on use subscription type
      orderItems: {
        planId: selectedPlan,
        selectedToys: isRideOnPayment ? [] : selectedToys,
        rideOnToyId: rideOnToyId,
        ageGroup,
        baseAmount,
        gstAmount,
        totalAmount: finalTotalAmount,
        appliedCoupon: appliedPromo,
        couponDiscount: promoDiscount,
        deliveryInstructions,
        shippingAddress: standardizeShippingAddress(addressData),
        isCycleCompletionFlow: isCycleCompletionFlow,
        completionReason: completionReason
      },
      description: `${isRideOnPayment ? 'Ride-On Toy Rental' : 'Subscription'} to ${plan.name} (including GST)`
    });
  };

  // Coupon functions removed (queue bypass functionality removed)

  // New promo code functions: test codes (free flow without paying) + DiscountService for real promos
  const applyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    if (!user) {
      toast.error('Please log in to apply promo code');
      return;
    }

    setIsApplyingPromo(true);

    const code = promoCode.trim().toLowerCase();

    try {
      // Test / free codes for flow testing without paying (no DB required)
      if (code === 'freecode' || code === 'testfree' || code === 'qa2025') {
        setPromoDiscount(baseAmount);
        setAppliedPromo(code.toUpperCase());
        toast.success('🎉 Test coupon applied! Your order is now FREE – use "Confirm Free Order" to test the flow.');
        setIsApplyingPromo(false);
        return;
      }
      if (code === 'onerupee') {
        // Target final total ₹1 (100 paise). With 18% GST: base = 1/1.18 ≈ 0.847, so discount = baseAmount - 1/1.18
        const targetBaseForOneRupee = 1 / 1.18;
        const discountToMakeOneRupee = baseAmount - targetBaseForOneRupee;
        if (discountToMakeOneRupee > 0) {
          setPromoDiscount(discountToMakeOneRupee);
          setAppliedPromo('ONERUPEE');
          toast.success('🎉 Test coupon applied! Total is now ₹1 for Razorpay testing.');
        } else {
          toast.error('Order amount is already ₹1 or less. This coupon is not applicable.');
        }
        setIsApplyingPromo(false);
        return;
      }

      const validation = await DiscountService.validateDiscount(
        promoCode.trim(),
        user.id,
        baseAmount
      );

      if (validation.isValid && validation.offerDetails) {
        setPromoDiscount(validation.discountAmount);
        setAppliedPromo(validation.offerDetails.code);
        toast.success(`🎉 ${validation.offerDetails.name} applied! You save ₹${validation.discountAmount}!`);
      } else {
        toast.error(validation.errorMessage || 'Invalid promo code');
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      toast.error('Error applying promo code. Please try again.');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromo = () => {
    setPromoDiscount(0);
    setAppliedPromo(null);
    setPromoCode('');
    toast.success('Promo code removed');
  };

  return (
    <Card>
      <CardHeader className={finalTotalAmount === 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50' : ''}>
        <CardTitle className={`flex items-center gap-2 ${finalTotalAmount === 0 ? 'text-green-800' : ''}`}>
          {finalTotalAmount === 0 ? (
            <>
              <span className="text-green-600">🎉</span>
              {isQueueOrder ? "Update Next Delivery" : "Complete Your Free Order"}
            </>
          ) : (
            isQueueOrder ? "Update Next Delivery" : "Complete Your Payment"
          )}
        </CardTitle>


      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Information */}
        {/* Selected Toys Display */}
        {(selectedToys.length > 0 || isRideOnPayment) && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">
              {isRideOnPayment ? 'Ride-On Toy' : `Selected Toys (${selectedToys.length})`}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {isRideOnPayment ? (
                <div className="text-sm col-span-2">
                  🏍️ Ride-On Toy (ID: {rideOnToyId})
                  <div className="text-xs text-gray-500 mt-1">No age restrictions • Premium quality</div>
                </div>
              ) : (
                selectedToys.map((toy) => (
                  <div key={toy.id} className="text-sm">
                    {toy.name}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-semibold mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Amount:</span>
              <span>₹{baseAmount}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({appliedPromo}):</span>
                <span>-₹{promoDiscount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Discounted Amount:</span>
              <span>₹{discountedBaseAmount}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%):</span>
              <span>₹{finalGstAmount}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Amount:</span>
              <span>₹{finalTotalAmount}</span>
            </div>
          </div>
        </div>

        {/* Queue Order Banner */}
        {isQueueOrder && (
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <h4 className="font-semibold text-blue-800">Thank you for selecting this months toys</h4>
              </div>
            </div>
          </div>
        )}

        {/* Customer Address Section - Simplified for space */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Customer Details & Delivery Address</h4>
            </div>
            <div className="flex items-center gap-2">
              {isAddressComplete(addressData) && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Details complete</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddressDialog(true)}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 shrink-0"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Saved Addresses
              </Button>
            </div>
          </div>

          {/* Prominent Address Selection Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Button
              variant="outline"
              onClick={() => setShowLocationPicker(true)}
              className="text-green-600 border-green-300 hover:bg-green-50 px-6 py-2"
            >
              <MapPin className="w-4 h-4 mr-2" />
              📍 Use Current Location & Plus Code
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddressDialog(true)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50 px-6 py-2"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Select from Saved Addresses
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600 mb-4">
            Or fill in your address manually below:
          </div>
          
          <div className="space-y-4 p-4 border border-blue-200 rounded-md bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={addressData.first_name}
                  onChange={(e) => setAddressData({...addressData, first_name: e.target.value})}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={addressData.last_name}
                  onChange={(e) => setAddressData({...addressData, last_name: e.target.value})}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_line1">Street Address *</Label>
                <Input
                  id="address_line1"
                  value={addressData.address_line1}
                  onChange={(e) => setAddressData({...addressData, address_line1: e.target.value})}
                  placeholder="Enter your street address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="apartment">House/Flat Number *</Label>
                <Input
                  id="apartment"
                  value={addressData.apartment}
                  onChange={(e) => setAddressData({...addressData, apartment: e.target.value})}
                  placeholder="House number, flat number, or apartment"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={addressData.city}
                  onChange={(e) => setAddressData({...addressData, city: e.target.value})}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={addressData.state}
                  onChange={(e) => setAddressData({...addressData, state: e.target.value})}
                  placeholder="State"
                  required
                />
              </div>
              <div>
                <Label htmlFor="zip_code">PIN Code *</Label>
                <Input
                  id="zip_code"
                  value={addressData.zip_code}
                  onChange={(e) => setAddressData({...addressData, zip_code: e.target.value})}
                  placeholder="PIN Code"
                  required
                />
              </div>
            </div>

            {addressData.plus_code && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-xs font-medium text-green-800 mb-0.5">📍 Plus Code (for delivery)</p>
                <p className="font-mono text-sm text-green-900">{addressData.plus_code}</p>
                <p className="text-xs text-green-600 mt-1">Used for precise delivery location.</p>
              </div>
            )}

            <div>
              <Label htmlFor="delivery_instructions">Delivery Instructions (Optional)</Label>
              <Textarea
                id="delivery_instructions"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="min-h-[60px] resize-none"
                placeholder="Any specific delivery instructions..."
                maxLength={500}
              />
            </div>

            {/* Address completion status */}
            <div className="flex items-center gap-2 p-2 rounded text-sm">
              {isAddressComplete(addressData) ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  <CheckCircle className="w-4 h-4" />
                  <span>Address is complete and ready for delivery</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  <span>Please complete all required fields</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Discount Codes Section */}
        <div className="space-y-4 border-t pt-4">
          {/* Queue Bypass Code completely removed */}

          {/* New Promo Code (for 20% discount) */}
          <div>
            <Label htmlFor="promoCode">Promo Code</Label>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter promo code (e.g., SAVE10)"
                disabled={!!appliedPromo}
              />
              <Button 
                onClick={applyPromo}
                disabled={isApplyingPromo || !!appliedPromo}
                variant="outline"
                size="sm"
              >
                {isApplyingPromo ? 'Applying...' : 'Apply'}
              </Button>
              {appliedPromo && (
                <Button 
                  onClick={removePromo}
                  variant="outline"
                  size="sm"
                >
                  Remove
                </Button>
              )}
            </div>
            {appliedPromo && (
              <p className="text-sm text-green-600 mt-1">
                🎉 Promo "{appliedPromo}" applied - You save: ₹{promoDiscount}
              </p>
            )}
          </div>

          {/* Total Discount Summary */}
          {promoDiscount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-800">Total Savings:</span>
                <span className="text-lg font-bold text-green-600">₹{promoDiscount}</span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                {promoDiscount > 0 && `Promo Discount: ₹${promoDiscount}`}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={!onBack}>
            Back
          </Button>
          <Button 
            onClick={handlePayment}
            disabled={isCreatingFreeOrder || !isAddressComplete(addressData)}
            className={`${!isAddressComplete(addressData) ? 'opacity-50' : ''} ${finalTotalAmount === 0 ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isCreatingFreeOrder ? 'Processing...' : 
             !isAddressComplete(addressData) ? 'Complete Address to Continue' :
             finalTotalAmount === 0 ? (isQueueOrder ? '🎉 Confirm Order Update' : '🎉 Confirm Free Order') :
             isQueueOrder ? `Update Queue - ₹${finalTotalAmount}` : `Pay ₹${finalTotalAmount}`}
          </Button>
        </div>
        
        {!isAddressComplete(addressData) && (
          <p className="text-sm text-amber-600 text-center mt-2">
            📝 Please complete your delivery address details to proceed
          </p>
        )}
      </CardContent>

      {/* Address Selection Dialog */}
      <AddressSelectionDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        customerId={user?.id}
        selectedAddress={null}
        onAddressSelected={handleAddressSelected}
      />

      {/* Location Picker Dialog */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Select Your Location
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPicker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              <LocationPicker
                onLocationSelect={(locationData) => {
                  // Transform the location data to match our expected format
                  const transformedData = {
                    lat: locationData.lat,
                    lng: locationData.lng,
                    plus_code: locationData.plus_code,
                    addressComponents: locationData.addressComponents
                  };
                  handleLocationSelect(transformedData);
                  setShowLocationPicker(false);
                }}
                initialPosition={addressData.latitude && addressData.longitude ? {
                  lat: addressData.latitude,
                  lng: addressData.longitude
                } : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PaymentFlow;