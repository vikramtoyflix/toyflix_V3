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
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import LocationPicker from '@/components/profile/LocationPicker';
import { MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { fbqTrack } from '@/utils/fbq';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { getUserSubscriptionPlan, getUserQueuePricing, getSubscriptionPlanDisplay, getUpgradeSuggestion, type QueuePricingInfo } from '@/utils/subscriptionUtils';

interface PaymentFlowProps {
  selectedPlan: string;
  selectedToys: any[];
  ageGroup?: string;
  rideOnToyId?: string;
  onBack?: () => void;
  isCycleCompletionFlow?: boolean;
  completionReason?: string;
  isQueueOrder?: boolean;
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
  onOrderComplete
}) => {
  const { initializePayment, isLoading } = useRazorpay();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  const { data: cycleStatus } = useCycleStatus();
  const queryClient = useQueryClient();
  
  // Address collection state
  const [addressData, setAddressData] = useState({
    first_name: '',
    last_name: '',
    address_line1: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'India',
    latitude: null as number | null,
    longitude: null as number | null,
    plus_code: null as string | null,
  });
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  
  // New fields for enhanced checkout
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCreatingFreeOrder, setIsCreatingFreeOrder] = useState(false);
  
  // Handle ride-on toy payments
  const isRideOnPayment = !!rideOnToyId;

  // Check if address is complete - NOW INCLUDES NAME AND APARTMENT VALIDATION
  const isAddressComplete = (addr: any) => {
    return addr?.first_name?.trim() && 
           addr?.last_name?.trim() && 
           addr?.address_line1?.trim() && 
           addr?.apartment?.trim() && 
           addr?.city?.trim() && 
           addr?.state?.trim() && 
           addr?.zip_code?.trim();
  };

  // Standardize address for backend compatibility
  const standardizeShippingAddress = (addr: any) => {
    return {
      first_name: addr.first_name?.trim() || '',
      last_name: addr.last_name?.trim() || '',
      phone: profile?.phone || '',
      email: profile?.email || '',
      address_line1: addr.address_line1?.trim() || '',
      address_line2: addr.apartment?.trim() || '',
      city: addr.city?.trim() || '',
      state: addr.state?.trim() || '',
      postcode: addr.zip_code?.trim() || '',
      country: addr.country || 'India',
      latitude: addr.latitude,
      longitude: addr.longitude,
      plus_code: addr.plus_code,
    };
  };

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
  
  const plan = isRideOnPayment 
    ? { 
        id: 'ride_on_fixed', 
        name: 'Ride-On Monthly', 
        description: 'Single ride-on toy rental with no age restrictions',
        price: 1999,
        duration: 1 
      }
    : PlanService.getPlan(selectedPlan);
  
  if (!plan) {
    return <div>Plan not found</div>;
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

  // Calculate GST and total amount (ride-on has fixed pricing)
  const baseAmount = plan.price;
  const gstAmount = isRideOnPayment ? Math.round(1999 * 18 / 100) : PlanService.calculateGST(baseAmount);
  const subtotalAmount = isRideOnPayment ? 2359 : PlanService.calculateTotalWithGST(baseAmount);
  const finalTotalAmount = Math.max(0, subtotalAmount - couponDiscount);

  // Handle location selection from map - SIMPLIFIED
  const handleLocationSelect = ({ lat, lng, plus_code, addressComponents }: any) => {
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
    toast.success('📍 Address retrieved from map! You can edit the details below.');
  };

  // Auto-save address to profile when complete
  const handleSaveAddress = async () => {
    if (!isAddressComplete(addressData)) return;
    setIsUpdatingAddress(true);
    try {
      await updateProfile.mutateAsync(addressData);
    } catch (error: any) {
      console.error('Address auto-save failed:', error);
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  useEffect(() => {
    if (isAddressComplete(addressData)) {
      handleSaveAddress();
    }
  }, [addressData.first_name, addressData.last_name, addressData.address_line1, addressData.apartment, addressData.city, addressData.state, addressData.zip_code]);

  // Auto-coupon logic (subscription bypass, queue bypass, cycle completion)
  useEffect(() => {
    const applyAutoCoupon = async () => {
      if (appliedCoupon || !subtotalAmount || !selectedPlan) return;

      if (isQueueOrder && user?.id) {
        try {
          const queuePricing = await getUserQueuePricing(user.id, subtotalAmount);
          if (queuePricing.isFree) {
            setCouponDiscount(queuePricing.couponDiscount);
            setAppliedCoupon(queuePricing.couponCode || 'QUEUE_BYPASS');
            toast.success(queuePricing.message, { description: "No payment needed for updating your next delivery." });
          } else {
            toast.info(queuePricing.message, { description: "Premium plans include unlimited free queue updates." });
          }
          return;
        } catch (e) {
          console.error('[AutoCoupon] Queue error:', e);
        }
      }

      if (isCycleCompletionFlow && (selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack')) {
        setCouponDiscount(subtotalAmount);
        setAppliedCoupon('CYCLE2025');
        toast.success(`🎉 Cycle completion coupon auto-applied! Your ${selectedPlan === 'silver-pack' ? 'Silver' : 'Gold'} subscription is now FREE!`);
        return;
      }

      if (selectedPlan === 'silver-pack' || selectedPlan === 'gold-pack') {
        try {
          const eligibility = await SubscriptionService.checkPaymentEligibility(user!.id);
          if (eligibility && !eligibility.requiresPayment && eligibility.isActive) {
            setCouponDiscount(subtotalAmount);
            setAppliedCoupon('SUBSCRIPTION_BYPASS');
            const planDisplayName = eligibility.planType?.includes('silver') ? 'Silver Pack' : eligibility.planType?.includes('gold') ? 'Gold Pack PRO' : 'Premium Plan';
            toast.success(`🎉 Using your existing ${planDisplayName} subscription! No payment needed.`);
          }
        } catch (e) {
          console.warn('[AutoCoupon] Eligibility check failed, continuing with payment');
        }
      }
    };

    if (subtotalAmount > 0 && selectedPlan) applyAutoCoupon();
  }, [isCycleCompletionFlow, selectedPlan, appliedCoupon, subtotalAmount, user?.id, isQueueOrder]);

  const handlePayment = async () => {
    if (!isAddressComplete(addressData)) {
      toast.error('Please provide your name and complete delivery address (including apartment/house number) before proceeding with payment');
      return;
    }

    fbqTrack('AddPaymentInfo', { value: finalTotalAmount, currency: 'INR' });
    
    if (finalTotalAmount === 0) {
      try {
        setIsCreatingFreeOrder(true);
        const { OrderService } = await import('@/services/orderService');
        let createdOrder;

        if (isQueueOrder) {
          createdOrder = await OrderService.createQueueOrder({
            userId: user!.id,
            originalSubscriptionId: subscriptionData?.subscription?.id || '',
            selectedToys,
            ageGroup,
            totalAmount: finalTotalAmount,
            baseAmount,
            gstAmount,
            couponDiscount,
            appliedCoupon,
            deliveryInstructions,
            shippingAddress: standardizeShippingAddress(addressData),
            queueOrderType: 'next_cycle' as const,
            currentPlanId: selectedPlan,
            cycleNumber: cycleStatus?.days_in_current_cycle || 1
          });
        } else {
          createdOrder = await OrderService.createFreeOrder({
            userId: user!.id,
            planId: selectedPlan,
            selectedToys: isRideOnPayment ? [] : selectedToys,
            rideOnToyId,
            ageGroup,
            totalAmount: finalTotalAmount,
            baseAmount,
            gstAmount,
            couponDiscount,
            appliedCoupon,
            deliveryInstructions,
            shippingAddress: standardizeShippingAddress(addressData),
            orderType: (isRideOnPayment ? 'ride_on' : 'subscription') as const
          });
        }
        
        fbqTrack('Purchase', { value: finalTotalAmount, currency: 'INR', content_ids: selectedToys.map((t: any) => t.id), num_items: selectedToys.length, content_type: 'product' });
        
        if (isCycleCompletionFlow && !isRideOnPayment && selectedToys.length > 0 && !isQueueOrder) {
          try {
            const { NextCycleService } = await import('@/services/nextCycleService');
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
            await NextCycleService.queueToysForNextCycle(user!.id, queueToys, standardizeShippingAddress(addressData), deliveryInstructions);
          } catch (e) {
            console.warn('Queue creation failed (non-critical):', e);
          }
        }
        
        toast.success(isQueueOrder ? '🎯 Queue updated successfully!' : createdOrder.message);
        queryClient.invalidateQueries({ queryKey: ['user-orders'] });
        queryClient.invalidateQueries({ queryKey: ['current-rentals'] });
        queryClient.invalidateQueries({ queryKey: ['queued-toys'] });
        queryClient.invalidateQueries({ queryKey: ['rental-orders'] });
        queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] });
        
        setTimeout(() => {
          if (onOrderComplete) {
            onOrderComplete({
              orderId: createdOrder.orderId || `order-${Date.now()}`,
              orderNumber: createdOrder.orderNumber,
              shippingAddress: standardizeShippingAddress(addressData),
              totalAmount: finalTotalAmount,
              baseAmount,
              gstAmount,
              couponDiscount,
              appliedCoupon,
              deliveryInstructions,
              selectedToys,
              planId: selectedPlan,
              message: createdOrder.message
            });
          } else if (isQueueOrder) {
            window.location.href = `/order-summary?order_id=${createdOrder.orderId || ''}&type=queue-update`;
          } else {
            window.location.href = `/order-summary?order_id=${createdOrder.orderId || ''}`;
          }
        }, 1500);
      } catch (error: any) {
        console.error('Error creating order:', error);
        toast.error(isQueueOrder ? `Failed to update queue: ${error.message}` : `Failed to create order: ${error.message}`);
      } finally {
        setIsCreatingFreeOrder(false);
      }
      return;
    }
    
    await initializePayment({
      amount: finalTotalAmount * 100,
      currency: 'INR',
      orderType: 'subscription',
      orderItems: {
        planId: selectedPlan,
        selectedToys: isRideOnPayment ? [] : selectedToys,
        rideOnToyId,
        ageGroup,
        baseAmount,
        gstAmount,
        totalAmount: finalTotalAmount,
        appliedCoupon,
        couponDiscount,
        deliveryInstructions,
        shippingAddress: standardizeShippingAddress(addressData),
        userPhone: profile?.phone || user?.phone,
        userEmail: user?.email || profile?.email,
        isCycleCompletionFlow,
        completionReason
      },
      description: `${isRideOnPayment ? 'Ride-On Toy Rental' : 'Subscription'} to ${plan.name} (including GST)`
    });
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setIsApplyingCoupon(true);
    await new Promise(r => setTimeout(r, 500));
    const code = couponCode.trim().toLowerCase();
    
    if (['freecode', 'testfree', 'qa2025', 'cycle2025'].includes(code)) {
      if (code === 'cycle2025' && selectedPlan === 'discovery-delight') {
        toast.error('Cycle completion coupon is only valid for Silver and Gold plans.');
        setIsApplyingCoupon(false);
        return;
      }
      setCouponDiscount(subtotalAmount);
      setAppliedCoupon(code.toUpperCase());
      toast.success(code === 'cycle2025' ? '🎉 Cycle completion coupon applied!' : '🎉 Coupon applied!');
    } else if (code === 'onerupee') {
      const discount = Math.max(0, subtotalAmount - 1);
      if (discount > 0) {
        setCouponDiscount(discount);
        setAppliedCoupon('ONERUPEE');
        toast.success('🎉 Test coupon applied! Total is now ₹1');
      } else {
        toast.error('Order amount is already ₹1 or less.');
      }
    } else if (code === 'fiverupees') {
      const targetBase = Math.round((5 / 1.18) * 100) / 100;
      const discount = Math.round((baseAmount - targetBase) * 100) / 100;
      if (discount > 0) {
        setCouponDiscount(discount);
        setAppliedCoupon('FIVERUPEES');
        toast.success('🎉 Coupon applied! Total is now ₹5');
      } else {
        toast.error('Order amount is already ₹5 or less.');
      }
    } else if (code === 'test50') {
      setCouponDiscount(Math.min(subtotalAmount * 0.5, subtotalAmount));
      setAppliedCoupon('TEST50');
      toast.success('🎉 50% discount applied!');
    } else if (code === 'test200') {
      setCouponDiscount(Math.min(200, subtotalAmount));
      setAppliedCoupon('TEST200');
      toast.success('🎉 ₹200 discount applied!');
    } else {
      toast.error('Invalid coupon code.');
    }
    setIsApplyingCoupon(false);
  };

  const removeCoupon = () => {
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    toast.success('Coupon removed');
  };

  return (
    <Card>
      <CardHeader className={finalTotalAmount === 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50' : ''}>
        <CardTitle className={`flex items-center gap-2 ${finalTotalAmount === 0 ? 'text-green-800' : ''}`}>
          {finalTotalAmount === 0 && appliedCoupon === 'SUBSCRIPTION_BYPASS' ? (
            <><span className="text-green-600">✨</span>{isQueueOrder ? "Update Next Delivery" : "Complete Your Subscription Order"}<div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-2">FREE</div></>
          ) : finalTotalAmount === 0 && appliedCoupon === 'QUEUE_BYPASS' ? (
            <><span className="text-green-600">🎯</span>Update Next Delivery<div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 ml-2">FREE</div></>
          ) : finalTotalAmount === 0 ? (
            <><span className="text-green-600">🎉</span>{isQueueOrder ? "Update Next Delivery" : "Complete Your Free Order"}</>
          ) : (
            isQueueOrder ? "Update Next Delivery" : "Complete Your Payment"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold">{plan.name}</h3>
          <p className="text-sm text-gray-600">{plan.description}</p>
          <div className="mt-2"><span className="text-lg font-bold">₹{plan.price}</span><span className="text-sm text-gray-600">/{plan.duration === 1 ? 'month' : `${plan.duration} months`}</span></div>
        </div>

        {(selectedToys.length > 0 || isRideOnPayment) && (
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">{isRideOnPayment ? 'Ride-On Toy' : `Selected Toys (${selectedToys.length})`}</h4>
            <div className="grid grid-cols-2 gap-2">
              {isRideOnPayment ? (
                <div className="text-sm col-span-2">🏍️ Ride-On Toy (ID: {rideOnToyId})<div className="text-xs text-gray-500 mt-1">No age restrictions • Premium quality</div></div>
              ) : (
                selectedToys.map((toy) => <div key={toy.id} className="text-sm">{toy.name}</div>)
              )}
            </div>
          </div>
        )}

        {isQueueOrder && (
          <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <h4 className="font-semibold text-blue-800">Queue Management Order</h4>
                <p className="text-sm text-blue-700">
                  {selectedPlan === 'discovery-delight' ? '💡 Discovery Delight requires payment for queue updates' : appliedCoupon === 'QUEUE_BYPASS' ? `🎉 Your ${selectedPlan === 'silver-pack' ? 'Silver Pack' : 'Gold Pack PRO'} includes FREE queue updates!` : `Updating your next delivery queue`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" /><h4 className="font-semibold text-blue-900">Customer Details & Delivery Address</h4></div>
            {isAddressComplete(addressData) && <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-green-600">Details complete</span></div>}
          </div>
          <div className="space-y-4 p-4 border border-blue-200 rounded-md bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="first_name">First Name *</Label><Input id="first_name" value={addressData.first_name} onChange={(e) => setAddressData({...addressData, first_name: e.target.value})} placeholder="Enter your first name" required /></div>
              <div><Label htmlFor="last_name">Last Name *</Label><Input id="last_name" value={addressData.last_name} onChange={(e) => setAddressData({...addressData, last_name: e.target.value})} placeholder="Enter your last name" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="address_line1">Street Address *</Label><Input id="address_line1" value={addressData.address_line1} onChange={(e) => setAddressData({...addressData, address_line1: e.target.value})} placeholder="Enter your street address" required /></div>
              <div><Label htmlFor="apartment">House/Flat Number *</Label><Input id="apartment" value={addressData.apartment} onChange={(e) => setAddressData({...addressData, apartment: e.target.value})} placeholder="House number, flat number" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label htmlFor="city">City *</Label><Input id="city" value={addressData.city} onChange={(e) => setAddressData({...addressData, city: e.target.value})} placeholder="City" required /></div>
              <div><Label htmlFor="state">State *</Label><Input id="state" value={addressData.state} onChange={(e) => setAddressData({...addressData, state: e.target.value})} placeholder="State" required /></div>
              <div><Label htmlFor="zip_code">PIN Code *</Label><Input id="zip_code" value={addressData.zip_code} onChange={(e) => setAddressData({...addressData, zip_code: e.target.value})} placeholder="PIN Code" required /></div>
            </div>
            <div><Label htmlFor="delivery_instructions">Delivery Instructions (Optional)</Label><Textarea id="delivery_instructions" value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} className="min-h-[60px] resize-none" placeholder="Any specific delivery instructions..." maxLength={500} /></div>
            {isAddressComplete(addressData) ? <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded border border-green-200"><CheckCircle className="w-4 h-4" /><span>Address is complete and ready for delivery</span></div> : <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200"><span>Please complete all required fields</span></div>}
          </div>
        </div>

        <div>
          <Label>Coupon Code</Label>
          <div className="flex gap-2 mt-1">
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter coupon code" disabled={!!appliedCoupon} />
            <Button onClick={applyCoupon} disabled={isApplyingCoupon || !!appliedCoupon} variant="outline" size="sm">Apply</Button>
            {appliedCoupon && <Button onClick={removeCoupon} variant="outline" size="sm">Remove</Button>}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${finalTotalAmount === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
          <h4 className="font-semibold mb-3">{finalTotalAmount === 0 ? 'Subscription Benefits Applied' : 'Payment Breakdown'}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Plan Amount:</span><span>₹{baseAmount}</span></div>
            <div className="flex justify-between"><span>GST (18%):</span><span>₹{gstAmount}</span></div>
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotalAmount}</span></div>
            {couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({appliedCoupon}):</span><span>-₹{couponDiscount}</span></div>}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold"><span>Total Amount:</span><span className={finalTotalAmount === 0 ? 'text-green-600' : ''}>₹{finalTotalAmount}{finalTotalAmount === 0 && ' (FREE!)'}</span></div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={!onBack}>Back</Button>
          <Button onClick={handlePayment} disabled={isCreatingFreeOrder || !isAddressComplete(addressData)} className={`${!isAddressComplete(addressData) ? 'opacity-50' : ''} ${finalTotalAmount === 0 ? 'bg-green-600 hover:bg-green-700' : ''}`}>
            {isCreatingFreeOrder ? 'Processing...' : !isAddressComplete(addressData) ? 'Complete Address to Continue' : finalTotalAmount === 0 ? (isQueueOrder ? '🎯 Confirm Queue Update' : '🎉 Confirm Free Order') : isQueueOrder ? `Update Queue - ₹${finalTotalAmount}` : `Pay ₹${finalTotalAmount}`}
          </Button>
        </div>
        {!isAddressComplete(addressData) && <p className="text-sm text-amber-600 text-center mt-2">📝 Please complete your delivery address details to proceed</p>}
      </CardContent>
    </Card>
  );
};

export default PaymentFlow;
