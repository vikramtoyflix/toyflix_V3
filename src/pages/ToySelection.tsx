import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';
import { ToySelectionWizard } from '@/components/subscription/ToySelectionWizard';
import MobileLayout from '@/components/mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import ImpersonationBanner from '@/components/admin/ImpersonationBanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, MapPin, Truck, Package as PackageIcon, BookOpen } from 'lucide-react';
import AddressSelectionDialog from '@/components/admin/AddressSelectionDialog';
import { useAddressPrefill, isAddressComplete, standardizeShippingAddress } from '@/hooks/useAddressPrefill';
import LocationPicker from '@/components/profile/LocationPicker';

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
    'gold-pack-pro': 'gold-pack', // ✅ CRITICAL FIX for hyphenated version
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
    console.log(`✅ ToySelection - Plan ID mapping: "${planId}" → "${planMappings[planId]}"`);
    return planMappings[planId];
  }
  
  // Try case-insensitive match
  const lowerPlanId = planId.toLowerCase();
  for (const [key, value] of Object.entries(planMappings)) {
    if (key.toLowerCase() === lowerPlanId) {
      console.log(`✅ ToySelection - Plan ID mapping (case-insensitive): "${planId}" → "${value}"`);
      return value;
    }
  }
  
  // Final fallback
  console.log(`⚠️ ToySelection - Unknown plan ID "${planId}", using fallback: "silver-pack"`);
  return 'silver-pack';
};

const ToySelection = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useCustomAuth();
  const { data: subscriptionData } = useUserSubscription();
  
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<string>('silver-pack');
  const [userAgeGroup, setUserAgeGroup] = useState<string>('3-4');
  
  // Flow state management
  const [currentStep, setCurrentStep] = useState<'selection' | 'address' | 'confirmation'>('selection');
  const [selectedToys, setSelectedToys] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // 🏠 ENHANCED: Use address prefill hook for automatic address loading (no toast on select-toys to avoid blocking Next)
  const { 
    addressData, 
    setAddressData, 
    isLoadingAddress, 
    hasPrefilledAddress,
    refreshAddress 
  } = useAddressPrefill(true, false);
  
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleToySelectionComplete = (toys: any[]) => {
    console.log('🎯 ToySelection - Toys selected:', toys.length);
    
    // Track toy selection
    try {
      if (typeof window !== 'undefined' && window.cbq && user?.id) {
        window.cbq('track', 'SelectToy', {
          user_id: user.id,
          toy_count: toys.length,
          toy_names: toys.map(t => t.name).join(', '),
          plan_id: userPlan,
          age_group: userAgeGroup,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
    
    setSelectedToys(toys);
    setCurrentStep('address');
  };

  // Handle location selection from map
  const handleLocationSelect = ({ lat, lng, plus_code, addressComponents }: any) => {
    console.log('🗺️ Location selected in ToySelection:', { lat, lng, plus_code, addressComponents });

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
  };

  // Handle address selection from dialog
  // 🏠 NOTE: Address prefilling is now handled by useAddressPrefill hook

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
    });
    
    // Track address selection
    try {
      if (typeof window !== 'undefined' && window.cbq && user?.id) {
        window.cbq('track', 'AddressSelected', {
          user_id: user.id,
          city: selectedAddress.city,
          state: selectedAddress.state,
          has_coordinates: !!(selectedAddress.latitude && selectedAddress.longitude),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
    
    toast.success('✅ Address selected successfully!');
  };

  const handleAddressSubmit = async () => {
    // Validate address
    if (!isAddressComplete(addressData)) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setIsCreatingOrder(true);
    
    try {
      // Import QueueOrderService
      const { QueueOrderService } = await import('@/services/queueOrderService');
      
      // Prepare queue order data
      const queueOrderData = {
        userId: user!.id,
        selectedToys: selectedToys,
        ageGroup: userAgeGroup,
        totalAmount: 0, // No payment for queue orders
        baseAmount: 0,
        gstAmount: 0,
        couponDiscount: 0,
        appliedCoupon: null,
        deliveryInstructions,
        shippingAddress: formatAddressForQueueOrder(addressData),
        queueOrderType: 'next_cycle' as const,
        currentPlanId: userPlan,
        cycleNumber: 1
      };

      console.log('🔄 Creating queue order...', queueOrderData);
      
      const result = await QueueOrderService.createQueueOrder(queueOrderData);
      
      if (result.success) {
        const orderData = {
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          selectedToys,
          deliveryAddress: formatAddressForQueueOrder(addressData),
          deliveryInstructions,
          planName: userPlan,
          totalAmount: 0,
          estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        // Track queue order creation
        try {
          if (typeof window !== 'undefined' && window.cbq && user?.id) {
            window.cbq('track', 'QueueOrderCreated', {
              user_id: user.id,
              order_id: result.orderId,
              order_number: result.orderNumber,
              toy_count: selectedToys.length,
              plan_id: userPlan,
              age_group: userAgeGroup,
              city: addressData.city,
              state: addressData.state,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Analytics tracking error:', error);
        }
        
        setOrderDetails(orderData);
        setCurrentStep('confirmation');
        
        toast.success('🎉 Queue Order Created Successfully!', {
          description: `Order #${result.orderNumber} has been placed`,
          duration: 4000
        });
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('❌ Error creating queue order:', error);
      const errMsg = error?.message || String(error);
      const errCode = error?.code || error?.error_code || '';
      // PGRST2xx = schema/function errors; surface hint for user
      const isSchemaError = /PGRST2|2\d{2}/.test(String(errCode)) || errMsg.includes('PGRST');
      const userMsg = isSchemaError
        ? 'Server configuration error. Please try again or contact support.'
        : errMsg.includes('address') || errMsg.includes('shipping')
          ? 'Please check your delivery address is complete (name, street, city, pincode).'
          : errMsg;
      toast.error('Failed to create order: ' + userMsg);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleOrderConfirmation = () => {
    toast.success('🚀 Order Confirmed!', {
      description: 'Returning to dashboard...',
      duration: 3000
    });
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };

  // 🏠 NOTE: isAddressComplete function is now imported from useAddressPrefill hook

  // 🏠 NOTE: standardizeShippingAddress function is now imported from useAddressPrefill hook
  // Local adapter for ToySelection specific format - include address_line1 for queue order validation
  const formatAddressForQueueOrder = (addr: any) => {
    if (!addr || typeof addr !== 'object') return { line1: '', address_line1: '', first_name: '', last_name: '', city: '', state: '', pincode: '', zip_code: '', postcode: '', country: 'India' };
    return {
    label: `${addr.first_name || ''} ${addr.last_name || ''}`.trim(),
    line1: addr.address_line1 || addr.line1 || '',
    line2: addr.apartment || addr.line2 || addr.address_line2 || '',
    address_line1: addr.address_line1 || addr.line1 || '',
    address_line2: addr.apartment || addr.line2 || addr.address_line2 || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.zip_code || addr.pincode || '',
    zip_code: addr.zip_code || addr.pincode || '',
    postcode: addr.zip_code || addr.pincode || '',
    country: addr.country || 'India',
    latitude: addr.latitude ?? null,
    longitude: addr.longitude ?? null,
    first_name: addr.first_name || '',
    last_name: addr.last_name || ''
  };
  };

  // Load user subscription details
  useEffect(() => {
    const loadUserSubscriptionDetails = async () => {
      if (!user?.id) {
        console.log('🚫 ToySelection - No user ID, setting defaults');
        setIsLoading(false);
        return;
      }

      console.log('🔍 ToySelection - Loading subscription details for user:', {
        userId: user.id,
        userRole: user.role,
        isImpersonating: localStorage.getItem('impersonation_session') !== null
      });

      try {
        // Try to get subscription details from rental_orders first
        const { data: rentalOrders, error: rentalError } = await (supabase as any)
          .from('rental_orders')
          .select('subscription_plan, age_group')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('📦 ToySelection - Rental orders query result:', {
          rentalOrders,
          rentalError,
          count: rentalOrders?.length || 0
        });

        if (!rentalError && rentalOrders && rentalOrders.length > 0) {
          const order = rentalOrders[0];
          const rawPlanId = order.subscription_plan?.toLowerCase().replace(/\s+/g, '-') || 'silver-pack';
          const normalizedPlanId = normalizePlanId(rawPlanId);
          const ageGroup = order.age_group || '3-4';
          
          console.log('✅ ToySelection - Using rental order data:', { 
            rawPlanId, 
            normalizedPlanId, 
            ageGroup 
          });
          setUserPlan(normalizedPlanId);
          setUserAgeGroup(ageGroup);
          setIsLoading(false);
          return;
        }

        // Fallback to user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('custom_users')
          .select('subscription_plan')
          .eq('id', user.id)
          .single();

        console.log('👤 ToySelection - User profile query result:', {
          userProfile,
          profileError
        });

        if (!profileError && userProfile) {
          const rawPlanId = userProfile.subscription_plan?.toLowerCase().replace(/\s+/g, '-') || 'silver-pack';
          const normalizedPlanId = normalizePlanId(rawPlanId);
          console.log('✅ ToySelection - Using user profile data:', { rawPlanId, normalizedPlanId });
          setUserPlan(normalizedPlanId);
        }

        // Use subscription data from hook if available
        if (subscriptionData?.plan?.id) {
          const normalizedPlanId = normalizePlanId(subscriptionData.plan.id);
          console.log('✅ ToySelection - Using subscription hook data:', { 
            originalPlanId: subscriptionData.plan.id, 
            normalizedPlanId 
          });
          setUserPlan(normalizedPlanId);
        }

        // Set default age group (Gold Pack gets 'all' for broader selection)
        const ageGroup = userPlan === 'gold-pack' ? 'all' : '3-4';
        console.log('✅ ToySelection - Final values:', { 
          planId: userPlan, 
          ageGroup,
          isImpersonating: localStorage.getItem('impersonation_session') !== null
        });
        setUserAgeGroup(ageGroup);
        
      } catch (error) {
        console.error('❌ ToySelection - Error loading subscription details:', error);
        // Use defaults with normalization
        const defaultPlan = normalizePlanId('silver-pack');
        setUserPlan(defaultPlan);
        setUserAgeGroup('3-4');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserSubscriptionDetails();
  }, [user?.id, subscriptionData]);

  const content = (
    <>
      <ImpersonationBanner />
      <div 
        className={`min-h-screen ${isMobile ? 'bg-gray-50' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}
        style={{paddingTop: 'var(--impersonation-banner-height, 0px)'}}
      >
        {/* Header */}
        <div className={`${isMobile ? 'p-4' : 'p-6'} border-b bg-white`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {!isMobile && 'Back to Dashboard'}
              </Button>
              
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h1 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  Select Toys
                </h1>
              </div>
            </div>
            
            {!isMobile && (
              <p className="text-gray-600 mt-2">
                Choose toys for your next rental cycle
              </p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={`${isMobile ? 'p-4' : 'p-6'} w-full min-w-0 overflow-x-hidden`}>
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {isLoading ? (
              // Loading state
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading your subscription details...</p>
                </div>
              </div>
            ) : (
              // Render based on current step
              <div className="space-y-4 w-full min-w-0">
                {currentStep === 'selection' && (
                  isMobile ? (
                    // Mobile: Full-width toy selection
                    <ToySelectionWizard
                      planId={userPlan}
                      ageGroup={userAgeGroup}
                      onComplete={handleToySelectionComplete}
                      isQueueManagement={true}
                    />
                  ) : (
                    // Desktop: Card layout for toy selection
                    <Card className="w-full min-w-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Select Your Toys
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 min-w-0 overflow-hidden">
                        <ToySelectionWizard
                          planId={userPlan}
                          ageGroup={userAgeGroup}
                          onComplete={handleToySelectionComplete}
                          isQueueManagement={true}
                        />
                      </CardContent>
                    </Card>
                  )
                )}

                {currentStep === 'address' && (
                  <Card className="w-full">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Delivery Address
                        </CardTitle>
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
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Selected toys summary */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">Selected Toys ({selectedToys.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedToys.map((toy, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                              <PackageIcon className="w-4 h-4" />
                              <span>{toy.name}</span>
                            </div>
                          ))}
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

                      {/* Address form */}
                      <div className="space-y-4">
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
                              placeholder="House/Building number, Street name"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="apartment">Apartment/Unit *</Label>
                            <Input
                              id="apartment"
                              value={addressData.apartment}
                              onChange={(e) => setAddressData({...addressData, apartment: e.target.value})}
                              placeholder="Apartment, suite, unit, etc."
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
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Address details complete</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-600">Please fill in all required fields</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep('selection')}
                          className="flex-1"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Selection
                        </Button>
                        <Button
                          onClick={handleAddressSubmit}
                          disabled={!isAddressComplete(addressData) || isCreatingOrder}
                          className="flex-1"
                        >
                          {isCreatingOrder ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating Order...
                            </>
                          ) : (
                            <>
                              <Truck className="w-4 h-4 mr-2" />
                              Create Order
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {currentStep === 'confirmation' && orderDetails && (
                  <Card className="w-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Order Confirmed!
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Success message */}
                      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-900 mb-2">Queue Order Successful!</h3>
                        <p className="text-green-700">Your next delivery has been updated with your selected toys.</p>
                      </div>

                      {/* Order details */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Order Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Order Number:</span>
                              <span className="font-mono">{orderDetails.orderNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Selected Toys:</span>
                              <span>{selectedToys.length} items</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Estimated Delivery:</span>
                              <span>{new Date(orderDetails.estimatedDeliveryDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <h4 className="font-semibold mb-2">Delivery Address</h4>
                          <div className="text-sm text-gray-600">
                            <p>{orderDetails.deliveryAddress.label}</p>
                            <p>{orderDetails.deliveryAddress.line1}</p>
                            {orderDetails.deliveryAddress.line2 && <p>{orderDetails.deliveryAddress.line2}</p>}
                            <p>{orderDetails.deliveryAddress.city}, {orderDetails.deliveryAddress.state} {orderDetails.deliveryAddress.pincode}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      <Button onClick={handleOrderConfirmation} className="w-full">
                        Return to Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </>
  );

  if (isMobile) {
    return (
      <MobileLayout showHeader={false} showBottomNav={true}>
        {content}
      </MobileLayout>
    );
  }

  return content;
};

export default ToySelection; 