import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, User, Package, Loader2, CheckCircle, 
  BookOpen, Building, Zap, Star, Calendar, MapPin, X
} from 'lucide-react';
import { ToySelectionWizard } from '@/components/subscription/ToySelectionWizard';
import { OrderService } from '@/services/orderService';
import { PlanService } from '@/services/planService';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { Toy } from '@/hooks/useToys';
import { UnifiedOrderService, UnifiedOrderData } from '@/services/unifiedOrderService';
import AddressSelectionDialog from '@/components/admin/AddressSelectionDialog';

interface AdminOrderCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userInfo: {
    full_name: string;
    phone: string;
    email?: string;
  };
  activeSubscription: {
    id: string;
    subscription_plan: string;
    age_group: string;
    cycle_number: number;
    rental_start_date: string;
    rental_end_date: string;
    total_amount: number;
  } | null;
  onOrderCreated: () => void;
}

const AdminOrderCreationModal: React.FC<AdminOrderCreationModalProps> = ({
  open,
  onOpenChange,
  userId,
  userInfo,
  activeSubscription,
  onOrderCreated
}) => {
  const { toast } = useToast();
  const { user: currentAdmin } = useCustomAuth();
  
  const [step, setStep] = useState<'overview' | 'selection' | 'confirmation'>('overview');
  const [selectedToys, setSelectedToys] = useState<Toy[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  // Get plan information
  const currentPlan = useMemo(() => {
    if (!activeSubscription?.subscription_plan) return null;
    
    // Map subscription plan names to plan IDs
    const planMapping: { [key: string]: string } = {
      'Discovery Delight': 'discovery-delight',
      'Silver Pack': 'silver-pack',
      'Gold Pack PRO': 'gold-pack',
      'Monthly Plan': 'discovery-delight',
      'Quarterly Plan': 'silver-pack',
      '6 Month Plan': 'gold-pack'
    };
    
    const planId = planMapping[activeSubscription.subscription_plan] || 'silver-pack';
    return PlanService.getPlan(planId);
  }, [activeSubscription?.subscription_plan]);

  // Calculate next cycle information
  const nextCycleInfo = useMemo(() => {
    if (!activeSubscription) return null;
    
    const nextCycleNumber = activeSubscription.cycle_number + 1;
    const currentEndDate = new Date(activeSubscription.rental_end_date);
    const nextStartDate = new Date(currentEndDate);
    nextStartDate.setDate(nextStartDate.getDate() + 1);
    
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextEndDate.getDate() + 30); // 30-day cycle
    
    return {
      cycleNumber: nextCycleNumber,
      startDate: nextStartDate.toISOString().split('T')[0],
      endDate: nextEndDate.toISOString().split('T')[0]
    };
  }, [activeSubscription]);

  const handleToySelectionComplete = (toys: Toy[]) => {
    setSelectedToys(toys);
    setStep('confirmation');
  };

  // Handle address selection from dialog
  const handleAddressSelected = (selectedAddress: any) => {
    console.log('📍 Admin - Address selected:', selectedAddress);
    setShippingAddress({
      name: `${selectedAddress.first_name || ''} ${selectedAddress.last_name || ''}`.trim(),
      phone: userInfo.phone,
      address: selectedAddress.line1 || '',
      apartment: selectedAddress.line2 || '',
      city: selectedAddress.city || '',
      state: selectedAddress.state || '',
      pincode: selectedAddress.pincode || '',
      country: 'India',
      latitude: selectedAddress.latitude,
      longitude: selectedAddress.longitude,
      delivery_instructions: selectedAddress.delivery_instructions || ''
    });
    toast({
      title: "Address Selected",
      description: "Customer address has been selected successfully.",
    });
  };

  const handleCreateOrder = async () => {
    if (!activeSubscription || !currentPlan || !nextCycleInfo) {
      setError('Missing subscription or plan information');
      return;
    }

    if (selectedToys.length === 0) {
      setError('Please select at least one toy');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Use selected address or fallback to placeholder
      const finalShippingAddress = shippingAddress || {
        name: userInfo.full_name,
        phone: userInfo.phone,
        address: 'Admin Created Order - Please select customer address',
        city: 'To be updated',
        state: 'To be updated',
        pincode: '000000',
        country: 'India'
      };

      // Calculate pricing
      const baseAmount = currentPlan.price;
      const gstAmount = Math.round(baseAmount * 0.18);
      const totalAmount = baseAmount + gstAmount;

      // Prepare unified order data
      const unifiedOrderData: UnifiedOrderData = {
        userId: userId,
        planId: currentPlan.id,
        selectedToys: selectedToys,
        age_group: activeSubscription.age_group,
        total_amount: totalAmount,
        baseAmount: baseAmount,
        gstAmount: gstAmount,
        couponDiscount: 0,
        appliedCoupon: undefined,
        deliveryInstructions: `Admin created order for cycle ${nextCycleInfo.cycleNumber}. Created by: ${currentAdmin?.email || 'Admin'}`,
        shippingAddress: finalShippingAddress,
        paymentId: undefined, // Admin orders don't require payment
        razorpayOrderId: undefined
      };

      // Use unified service to create queue order (typically for next cycle)
      const result = await UnifiedOrderService.createOrUpdateOrder(
        unifiedOrderData,
        'next_cycle', // Force next cycle context for admin order creation
        'admin_create'
      );

      if (result.success) {
        const contextMessage = result.context === 'next_cycle' 
          ? `Next cycle order queued for ${userInfo.full_name} with ${selectedToys.length} toys for cycle ${nextCycleInfo.cycleNumber}`
          : `Order created for ${userInfo.full_name} with ${selectedToys.length} toys`;

        toast({
          title: "Order Processed Successfully",
          description: contextMessage,
          duration: 5000
        });

        onOrderCreated();
        onOpenChange(false);
        
        // Reset state
        setStep('overview');
        setSelectedToys([]);
      } else {
        throw new Error(result.error || 'Order creation failed');
      }

    } catch (error: any) {
      console.error('❌ Error creating admin order:', error);
      setError(error.message || 'Failed to create order');
      toast({
        title: "Failed to create order",
        description: error.message || 'An unexpected error occurred',
        variant: "destructive",
        duration: 8000
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setStep('overview');
    setSelectedToys([]);
    setError(null);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Create New Order - {userInfo.full_name}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[70vh] pr-4">
          {/* Overview Step */}
          {step === 'overview' && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2">{userInfo.full_name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span>
                      <span className="ml-2">{userInfo.phone}</span>
                    </div>
                    {userInfo.email && (
                      <div className="col-span-2">
                        <span className="font-medium">Email:</span>
                        <span className="ml-2">{userInfo.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Current Subscription */}
              {activeSubscription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Current Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{activeSubscription.subscription_plan}</span>
                      <Badge variant="secondary">Cycle {activeSubscription.cycle_number}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Age Group:</span>
                        <span className="ml-2">{activeSubscription.age_group}</span>
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span>
                        <span className="ml-2">{formatCurrency(activeSubscription.total_amount)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Period:</span>
                        <span className="ml-2">{formatDate(activeSubscription.rental_start_date)} - {formatDate(activeSubscription.rental_end_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Cycle Information */}
              {nextCycleInfo && currentPlan && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                      <Calendar className="w-4 h-4" />
                      New Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-blue-800">Cycle:</span>
                        <span className="ml-2 text-blue-700">{nextCycleInfo.cycleNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Plan:</span>
                        <span className="ml-2 text-blue-700">{currentPlan.name}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Period:</span>
                        <span className="ml-2 text-blue-700">{formatDate(nextCycleInfo.startDate)} - {formatDate(nextCycleInfo.endDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800">Amount:</span>
                        <span className="ml-2 text-blue-700">{formatCurrency(currentPlan.price + Math.round(currentPlan.price * 0.18))}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-800">Toy Allowance:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-blue-600" />
                          <span>Big Toys: {currentPlan.features.bigToys}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-blue-600" />
                          <span>STEM Toys: {currentPlan.features.stemToys}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-blue-600" />
                          <span>Educational: {currentPlan.features.educationalToys}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-blue-600" />
                          <span>Books: {currentPlan.features.books}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => setStep('selection')}
                  className="flex items-center gap-2"
                  disabled={!activeSubscription || !currentPlan}
                >
                  <Package className="w-4 h-4" />
                  Select Toys
                </Button>
              </div>
            </div>
          )}

          {/* Toy Selection Step */}
          {step === 'selection' && currentPlan && activeSubscription && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Select Toys for Cycle {nextCycleInfo?.cycleNumber}</h3>
                <Button variant="outline" onClick={() => setStep('overview')}>
                  <X className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-amber-800 font-medium">👨‍💼 Admin Mode</p>
                <p className="text-sm text-amber-700 mt-1">
                  You're creating an order for <strong>{userInfo.full_name}</strong> using their <strong>{activeSubscription.subscription_plan}</strong> subscription. 
                  This will bypass the normal selection window and payment process.
                </p>
              </div>

              <ToySelectionWizard
                planId={currentPlan.id}
                ageGroup={activeSubscription.age_group}
                onComplete={handleToySelectionComplete}
                isQueueManagement={false}
              />
            </div>
          )}

          {/* Confirmation Step */}
          {step === 'confirmation' && nextCycleInfo && currentPlan && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Confirm Order Creation</h3>
                <p className="text-sm text-gray-600">Review the order details before creating</p>
              </div>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Customer:</span>
                      <span className="ml-2">{userInfo.full_name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Plan:</span>
                      <span className="ml-2">{currentPlan.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Cycle:</span>
                      <span className="ml-2">{nextCycleInfo.cycleNumber}</span>
                    </div>
                    <div>
                      <span className="font-medium">Age Group:</span>
                      <span className="ml-2">{activeSubscription?.age_group}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Selected Toys ({selectedToys.length})</h4>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {selectedToys.map((toy, index) => (
                        <div key={toy.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{index + 1}</span>
                          <span className="text-sm font-medium">{toy.name}</span>
                          <Badge variant="outline" className="text-xs">{toy.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Shipping Address Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Shipping Address</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddressDialog(true)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        Select Address
                      </Button>
                    </div>
                    {shippingAddress ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-1 text-green-600" />
                          <div className="text-sm">
                            <div className="font-medium">{shippingAddress.name}</div>
                            <div>{shippingAddress.address}</div>
                            {shippingAddress.apartment && <div>{shippingAddress.apartment}</div>}
                            <div>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.pincode}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Please select a shipping address for this order</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Base Amount:</span>
                      <span>{formatCurrency(currentPlan.price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>GST (18%):</span>
                      <span>{formatCurrency(Math.round(currentPlan.price * 0.18))}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(currentPlan.price + Math.round(currentPlan.price * 0.18))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-blue-800 font-medium text-sm">📝 Admin Notes</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• This order will be created without requiring payment</li>
                  <li>• Customer will be notified about the order</li>
                  <li>• Order will be marked as admin-created in the system</li>
                  <li>• Normal delivery process will apply</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('selection')}>
                  Back to Selection
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={isCreating || selectedToys.length === 0}
                  className="flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Address Selection Dialog */}
      <AddressSelectionDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        customerId={userId}
        selectedAddress={null}
        onAddressSelected={handleAddressSelected}
      />
    </Dialog>
  );
};

export default AdminOrderCreationModal;
