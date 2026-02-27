import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  Package,
  User,
  Settings,
  History,
  Edit
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserSubscriptionEditProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface SubscriptionEditData {
  id: string;
  subscription_status: string;
  cycle_number: number;
  rental_start_date: string;
  rental_end_date: string;
  age_group: string;
  subscription_category: string;
  subscription_plan: string;
  total_amount: number;
}

const UserSubscriptionEdit: React.FC<UserSubscriptionEditProps> = ({
  userId,
  isOpen,
  onClose,
  onSave
}) => {
  const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
  const [editData, setEditData] = useState<SubscriptionEditData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user subscription data
  const { data: userData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-subscription-edit', userId],
    queryFn: async () => {
      console.log('🔍 Fetching user subscription data for editing:', userId);
      
      const { data: user, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      return {
        user: {
          ...user,
          full_name: user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}` : 
            user.first_name || user.last_name || 'Unknown User'
        },
        subscriptions: subscriptions || []
      };
    },
    enabled: !!userId && isOpen,
    staleTime: 1000 * 60 * 2
  });

  // Initialize edit data when subscription is selected
  useEffect(() => {
    if (selectedSubscription && userData?.subscriptions) {
      const subscription = userData.subscriptions.find(s => s.id === selectedSubscription);
      if (subscription) {
        setEditData({
          id: subscription.id,
          subscription_status: subscription.subscription_status || 'active',
          cycle_number: subscription.cycle_number || 1,
          rental_start_date: subscription.rental_start_date || '',
          rental_end_date: subscription.rental_end_date || '',
          age_group: subscription.age_group || '',
          subscription_category: subscription.subscription_category || '',
          subscription_plan: subscription.subscription_plan || '',
          total_amount: subscription.total_amount || 0
        });
      }
    }
  }, [selectedSubscription, userData]);

  // Auto-select the first active subscription if available
  useEffect(() => {
    if (userData?.subscriptions && !selectedSubscription) {
      const activeSubscription = userData.subscriptions.find(s => s.subscription_status === 'active');
      if (activeSubscription) {
        setSelectedSubscription(activeSubscription.id);
      } else if (userData.subscriptions.length > 0) {
        setSelectedSubscription(userData.subscriptions[0].id);
      }
    }
  }, [userData, selectedSubscription]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SubscriptionEditData) => {
      console.log('💾 Saving subscription changes:', data);
      
      const { error } = await supabase
        .from('rental_orders')
        .update({
          subscription_status: data.subscription_status,
          cycle_number: data.cycle_number,
          rental_start_date: data.rental_start_date,
          rental_end_date: data.rental_end_date,
          age_group: data.age_group,
          subscription_category: data.subscription_category,
          subscription_plan: data.subscription_plan,
          total_amount: data.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (error) throw error;
      
      return data;
    },
    onSuccess: () => {
      toast.success('Subscription updated successfully');
      queryClient.invalidateQueries({ queryKey: ['subscription-management'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription-edit', userId] });
      onSave();
    },
    onError: (error) => {
      console.error('❌ Error saving subscription:', error);
      toast.error('Failed to update subscription');
    }
  });

  const handleSave = async () => {
    if (!editData) {
      toast.error('No data to save');
      return;
    }

    // Validation
    if (!editData.subscription_status) {
      toast.error('Subscription status is required');
      return;
    }

    if (!editData.rental_start_date || !editData.rental_end_date) {
      toast.error('Start and end dates are required');
      return;
    }

    if (new Date(editData.rental_start_date) >= new Date(editData.rental_end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(editData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SubscriptionEditData, value: any) => {
    if (!editData) return;
    
    setEditData(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'deactivated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paused':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Subscription Editor...</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading subscription data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !userData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Loading Editor</DialogTitle>
          </DialogHeader>
          <Alert className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load subscription data for editing.
              <Button onClick={() => refetch()} variant="outline" size="sm" className="ml-2">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const { user, subscriptions } = userData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Subscription: {user.full_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={onClose} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!editData || isSubmitting}
                size="sm"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">{user.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
                {user.email && (
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Select Subscription to Edit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedSubscription === subscription.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSubscription(subscription.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={selectedSubscription === subscription.id}
                          onChange={() => setSelectedSubscription(subscription.id)}
                          className="text-blue-600"
                        />
                        <div>
                          <p className="font-medium">{subscription.subscription_plan}</p>
                          <p className="text-sm text-gray-600">
                            Cycle {subscription.cycle_number} • {formatDate(subscription.rental_start_date)}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(subscription.subscription_status)}>
                        {subscription.subscription_status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {subscriptions.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No subscriptions found for this user</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Edit Form */}
          {editData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Edit Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Subscription Status */}
                  <div>
                    <Label htmlFor="subscription_status">Subscription Status</Label>
                    <Select
                      value={editData.subscription_status}
                      onValueChange={(value) => handleInputChange('subscription_status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deactivated">Deactivated</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
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
                      value={editData.cycle_number}
                      onChange={(e) => handleInputChange('cycle_number', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  {/* Rental Start Date */}
                  <div>
                    <Label htmlFor="rental_start_date">Rental Start Date</Label>
                    <Input
                      id="rental_start_date"
                      type="date"
                      value={editData.rental_start_date}
                      onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
                    />
                  </div>

                  {/* Rental End Date */}
                  <div>
                    <Label htmlFor="rental_end_date">Rental End Date</Label>
                    <Input
                      id="rental_end_date"
                      type="date"
                      value={editData.rental_end_date}
                      onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
                    />
                  </div>

                  {/* Age Group */}
                  <div>
                    <Label htmlFor="age_group">Age Group</Label>
                    <Select
                      value={editData.age_group}
                      onValueChange={(value) => handleInputChange('age_group', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select age group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-2">6m-2 years</SelectItem>
                        <SelectItem value="2-3">2-3 years</SelectItem>
                        <SelectItem value="3-4">3-4 years</SelectItem>
                        <SelectItem value="4-6">4-6 years</SelectItem>
                        <SelectItem value="6-8">6-8 years</SelectItem>
                        <SelectItem value="8+">8+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subscription Category */}
                  <div>
                    <Label htmlFor="subscription_category">Subscription Category</Label>
                    <Select
                      value={editData.subscription_category}
                      onValueChange={(value) => handleInputChange('subscription_category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="books">Books</SelectItem>
                        <SelectItem value="ride_on">Ride-On</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subscription Plan */}
                  <div>
                    <Label htmlFor="subscription_plan">Subscription Plan</Label>
                    <Select
                      value={editData.subscription_plan}
                      onValueChange={(value) => handleInputChange('subscription_plan', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Discovery Delight">Discovery Delight</SelectItem>
                        <SelectItem value="Silver Pack">Silver Pack</SelectItem>
                        <SelectItem value="Gold Pack PRO">Gold Pack PRO</SelectItem>
                        <SelectItem value="Ride-On Monthly">Ride-On Monthly</SelectItem>
                        <SelectItem value="Books Monthly">Books Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Total Amount */}
                  <div>
                    <Label htmlFor="total_amount">Total Amount (₹)</Label>
                    <Input
                      id="total_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editData.total_amount}
                      onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Preview Changes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <Badge className={`ml-2 ${getStatusColor(editData.subscription_status)}`}>
                        {editData.subscription_status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Cycle:</span>
                      <span className="ml-2 font-medium">{editData.cycle_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <span className="ml-2 font-medium">
                        {editData.rental_start_date && editData.rental_end_date
                          ? `${formatDate(editData.rental_start_date)} - ${formatDate(editData.rental_end_date)}`
                          : 'Dates not set'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button onClick={onClose} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSubscriptionEdit; 