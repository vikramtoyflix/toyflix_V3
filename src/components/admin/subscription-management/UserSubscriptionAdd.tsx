import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  Package,
  User,
  Plus,
  Crown,
  DollarSign
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { UnifiedOrderService, UnifiedOrderData } from '@/services/unifiedOrderService';

interface UserSubscriptionAddProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

// 🔄 UPDATED INTERFACE: Map to rental_orders table structure
interface NewSubscriptionData {
  subscription_plan: string;           // Maps to subscription_plan
  subscription_status: string;         // Maps to subscription_status  
  age_group: string;                   // Maps to age_group
  rental_start_date: string;           // Maps to rental_start_date
  rental_end_date: string;             // Maps to rental_end_date
  cycle_number: number;                // Maps to cycle_number
  total_amount: number;                // Maps to total_amount
  subscription_category: string;       // Maps to subscription_category
}

const UserSubscriptionAdd: React.FC<UserSubscriptionAddProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
  onSave
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // 🔄 UPDATED: Use rental_orders table fields
  const [subscriptionData, setSubscriptionData] = useState<NewSubscriptionData>({
    subscription_plan: '',
    subscription_status: 'active', // 🎯 KEY FIELD: Controls user dashboard visibility
    age_group: '',
    rental_start_date: format(new Date(), 'yyyy-MM-dd'),
    rental_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    cycle_number: 1,
    total_amount: 0,
    subscription_category: 'standard'
  });

  const planOptions = [
    { 
      value: 'Discovery Delight', 
      label: 'Discovery Delight', 
      price: 1299, 
      description: '4 toys for 30 days',
      icon: Package
    },
    { 
      value: 'Silver Pack', 
      label: 'Silver Pack', 
      price: 5999, 
      description: '6 toys for 6 months',
      icon: Package
    },
    { 
      value: 'Gold Pack PRO', 
      label: 'Gold Pack PRO', 
      price: 7999, 
      description: '8 toys for 6 months',
      icon: Crown
    },
    { 
      value: 'Ride-On Monthly', 
      label: 'Ride-On Monthly', 
      price: 1999, 
      description: '1 ride-on toy for 30 days',
      icon: Package
    },
    { 
      value: 'Books Monthly', 
      label: 'Books Monthly', 
      price: 599, 
      description: 'Educational books for 30 days',
      icon: Package
    }
  ];

  const ageGroupOptions = [
    { value: '1-2', label: '6m-2 years' },
    { value: '2-3', label: '2-3 years' },
    { value: '3-4', label: '3-4 years' },
    { value: '4-6', label: '4-6 years' },
    { value: '6-8', label: '6-8 years' },
    { value: '8+', label: '8+ years' }
  ];

  // 🎯 SUBSCRIPTION STATUS: Controls user dashboard visibility
  const subscriptionStatusOptions = [
    { value: 'active', label: 'Active', description: 'User can see and use subscription' },
    { value: 'inactive', label: 'Inactive', description: 'Hidden from user dashboard' },
    { value: 'paused', label: 'Paused', description: 'Temporarily suspended' },
    { value: 'cancelled', label: 'Cancelled', description: 'Permanently cancelled' }
  ];

  // Auto-update end dates when start date changes
  React.useEffect(() => {
    if (subscriptionData.rental_start_date) {
      const startDate = new Date(subscriptionData.rental_start_date);
      const endDate = addDays(startDate, 30);
      const endDateString = format(endDate, 'yyyy-MM-dd');
      
      setSubscriptionData(prev => ({
        ...prev,
        rental_end_date: endDateString
      }));
    }
  }, [subscriptionData.rental_start_date]);

  // 🎯 ENHANCED: Use unified order service to handle cycle updates vs new subscriptions
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: NewSubscriptionData) => {
      console.log('💾 Processing subscription request:', data);
      
      // Check if user has active subscription first
      const hasActiveSubscription = await UnifiedOrderService.hasActiveSubscription(userId);
      console.log('🔍 User has active subscription:', hasActiveSubscription);
      
      // Prepare unified order data
      const unifiedOrderData: UnifiedOrderData = {
        userId: userId,
        subscription_plan: data.subscription_plan,
        subscription_status: data.subscription_status,
        age_group: data.age_group,
        rental_start_date: data.rental_start_date,
        rental_end_date: data.rental_end_date,
        cycle_number: data.cycle_number,
        total_amount: data.total_amount,
        subscription_category: data.subscription_category,
        selectedToys: [], // Admin can add toys later via toy selection
        deliveryInstructions: `Admin created subscription for ${userName}`
      };
      
      // Use unified service to create or update order
      const result = await UnifiedOrderService.createOrUpdateOrder(
        unifiedOrderData, 
        undefined, // Let service determine context
        'admin_create'
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create subscription');
      }
      
      console.log('✅ Subscription processed successfully:', result);
      return result;
    },
    onSuccess: (result) => {
      // Provide context-specific success messages
      let successMessage = '';
      switch (result.context) {
        case 'current_cycle':
          successMessage = '🔄 Current cycle updated successfully! Changes will be reflected in user dashboard.';
          break;
        case 'next_cycle':
          successMessage = '📅 Next cycle queued successfully! Order will be processed when current cycle ends.';
          break;
        case 'new_subscription':
          successMessage = '🎉 New subscription created successfully! User will see it in their dashboard immediately.';
          break;
        default:
          successMessage = result.message || 'Subscription processed successfully!';
      }
      
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['subscription-management'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription-edit', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription-view', userId] });
      // Invalidate user dashboard queries
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      onSave();
    },
    onError: (error) => {
      console.error('❌ Error creating subscription:', error);
      toast.error('Failed to create subscription: ' + error.message);
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleInputChange = (field: keyof NewSubscriptionData, value: string | number) => {
    setSubscriptionData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subscriptionData.subscription_plan) {
      toast.error('Please select a subscription plan');
      return;
    }

    if (!subscriptionData.age_group) {
      toast.error('Please select an age group');
      return;
    }

    if (!subscriptionData.rental_start_date || !subscriptionData.rental_end_date) {
      toast.error('Please select start and end dates');
      return;
    }

    if (new Date(subscriptionData.rental_start_date) >= new Date(subscriptionData.rental_end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    
    // Auto-calculate total amount based on plan
    const selectedPlan = planOptions.find(p => p.value === subscriptionData.subscription_plan);
    const finalData = {
      ...subscriptionData,
      total_amount: selectedPlan?.price || 0
    };
    
    createSubscriptionMutation.mutate(finalData);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Subscription for {userName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>User Name</Label>
                  <Input value={userName} disabled />
                </div>
                <div>
                  <Label>User ID</Label>
                  <Input value={userId} disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subscription Plan */}
                <div>
                  <Label htmlFor="subscription_plan">Subscription Plan</Label>
                  <Select
                    value={subscriptionData.subscription_plan}
                    onValueChange={(value) => handleInputChange('subscription_plan', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {planOptions.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          <div className="flex items-center gap-2">
                            <plan.icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{plan.label}</div>
                              <div className="text-sm text-gray-500">
                                ₹{plan.price} - {plan.description}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Age Group */}
                <div>
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select
                    value={subscriptionData.age_group}
                    onValueChange={(value) => handleInputChange('age_group', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Age Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageGroupOptions.map((ageGroup) => (
                        <SelectItem key={ageGroup.value} value={ageGroup.value}>
                          {ageGroup.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subscription Status */}
                <div>
                  <Label htmlFor="subscription_status">Subscription Status</Label>
                  <Select
                    value={subscriptionData.subscription_status}
                    onValueChange={(value) => handleInputChange('subscription_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subscriptionStatusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex flex-col">
                            <span>{status.label}</span>
                            <span className="text-xs text-gray-500">{status.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cycle Number */}
                <div>
                  <Label htmlFor="cycle_number">Cycle Number</Label>
                  <Input
                    id="cycle_number"
                    type="number"
                    min="1"
                    value={subscriptionData.cycle_number}
                    onChange={(e) => handleInputChange('cycle_number', parseInt(e.target.value) || 1)}
                  />
                </div>

                {/* Start Date */}
                <div>
                  <Label htmlFor="rental_start_date">Start Date</Label>
                  <Input
                    id="rental_start_date"
                    type="date"
                    value={subscriptionData.rental_start_date}
                    onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label htmlFor="rental_end_date">End Date</Label>
                  <Input
                    id="rental_end_date"
                    type="date"
                    value={subscriptionData.rental_end_date}
                    onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="subscription_category">Category</Label>
                  <Select
                    value={subscriptionData.subscription_category}
                    onValueChange={(value) => handleInputChange('subscription_category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total Amount */}
                <div>
                  <Label htmlFor="total_amount">Total Amount (₹)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={subscriptionData.total_amount}
                    onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Plan Preview */}
          {subscriptionData.subscription_plan && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Selected Plan Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const selectedPlan = planOptions.find(p => p.value === subscriptionData.subscription_plan);
                  return selectedPlan ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <selectedPlan.icon className="h-8 w-8" />
                      <div>
                        <h3 className="font-medium">{selectedPlan.label}</h3>
                        <p className="text-sm text-gray-600">{selectedPlan.description}</p>
                        <p className="text-lg font-bold text-green-600">₹{selectedPlan.price}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Subscription
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserSubscriptionAdd; 