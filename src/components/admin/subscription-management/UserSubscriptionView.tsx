import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Package,
  CreditCard,
  TrendingUp,
  MapPin,
  CheckCircle,
  X,
  Clock,
  AlertCircle,
  Crown,
  Hash,
  DollarSign,
  Eye,
  Download,
  RefreshCw,
  History
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserSubscriptionViewProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const UserSubscriptionView: React.FC<UserSubscriptionViewProps> = ({
  userId,
  isOpen,
  onClose
}) => {
  const { data: userData, isLoading, error, refetch } = useQuery({
    queryKey: ['user-subscription-view', userId],
    queryFn: async () => {
      console.log('🔍 Fetching detailed user subscription data for:', userId);
      
      // Get user details
      const { data: user, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get all rental orders for this user
      const { data: rentalOrders, error: ordersError } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Separate active and inactive subscriptions
      const activeSubscriptions = rentalOrders?.filter(order => order.subscription_status === 'active') || [];
      const inactiveSubscriptions = rentalOrders?.filter(order => order.subscription_status !== 'active') || [];

      // Calculate statistics
      const totalSpent = rentalOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalOrders = rentalOrders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Get subscription plans
      const plans = [...new Set(rentalOrders?.map(order => order.subscription_plan).filter(Boolean))];

      return {
        user: {
          ...user,
          full_name: user.first_name && user.last_name ? 
            `${user.first_name} ${user.last_name}` : 
            user.first_name || user.last_name || 'Unknown User'
        },
        activeSubscriptions,
        inactiveSubscriptions,
        allSubscriptions: rentalOrders || [],
        statistics: {
          totalSpent,
          totalOrders,
          avgOrderValue,
          plans
        }
      };
    },
    enabled: !!userId && isOpen,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'deactivated':
        return <X className="w-4 h-4" />;
      case 'paused':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleExportUserData = () => {
    if (!userData) return;

    const csvData = userData.allSubscriptions.map(subscription => ({
      'Order Number': subscription.order_number,
      'Subscription Plan': subscription.subscription_plan,
      'Status': subscription.subscription_status,
      'Cycle Number': subscription.cycle_number,
      'Start Date': subscription.rental_start_date,
      'End Date': subscription.rental_end_date,
      'Amount': subscription.total_amount,
      'Age Group': subscription.age_group || '',
      'Category': subscription.subscription_category || '',
      'Created At': subscription.created_at
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-${userData.user.phone}-subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('User data exported successfully');
  };

  const SubscriptionDetailCard = ({ subscription, isHistorical = false }: { subscription: any, isHistorical?: boolean }) => (
    <Card className={`mb-4 ${isHistorical ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              subscription.subscription_status === 'active' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {subscription.subscription_plan?.toLowerCase().includes('gold') ? (
                <Crown className="w-5 h-5 text-yellow-500" />
              ) : (
                <Package className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <div>
              <h4 className="font-semibold">{subscription.subscription_plan}</h4>
              <p className="text-sm text-gray-600">Order #{subscription.order_number}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(subscription.subscription_status)} flex items-center gap-1`}>
            {getStatusIcon(subscription.subscription_status)}
            <span className="capitalize">{subscription.subscription_status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Cycle</p>
            <p className="font-medium">{subscription.cycle_number}</p>
          </div>
          <div>
            <p className="text-gray-500">Start Date</p>
            <p className="font-medium">{formatDate(subscription.rental_start_date)}</p>
          </div>
          <div>
            <p className="text-gray-500">End Date</p>
            <p className="font-medium">{formatDate(subscription.rental_end_date)}</p>
          </div>
          <div>
            <p className="text-gray-500">Amount</p>
            <p className="font-medium">{formatCurrency(subscription.total_amount)}</p>
          </div>
          {subscription.age_group && (
            <div>
              <p className="text-gray-500">Age Group</p>
              <p className="font-medium">{subscription.age_group}</p>
            </div>
          )}
          {subscription.subscription_category && (
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium">{subscription.subscription_category}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Order Status</p>
            <Badge variant="outline" className="text-xs">
              {subscription.status}
            </Badge>
          </div>
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium">{formatDate(subscription.created_at)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading User Details...</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Fetching subscription details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !userData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Loading User Details</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Failed to load user subscription details</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { user, activeSubscriptions, inactiveSubscriptions, statistics } = userData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Subscription Details: {user.full_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportUserData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{user.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{user.phone}</span>
                  </div>
                </div>
                {user.email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{user.email}</span>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Joined</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold">{statistics.totalOrders}</p>
                  </div>
                  <Hash className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold">{formatCurrency(statistics.totalSpent)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Order Value</p>
                    <p className="text-2xl font-bold">{formatCurrency(statistics.avgOrderValue)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Subscriptions</p>
                    <p className="text-2xl font-bold text-green-600">{activeSubscriptions.length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Plans */}
          {statistics.plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Subscription Plans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {statistics.plans.map((plan, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {plan?.toLowerCase().includes('gold') ? (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      ) : (
                        <Package className="w-3 h-3 text-blue-500" />
                      )}
                      {plan}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Details */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Active Subscriptions ({activeSubscriptions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History ({inactiveSubscriptions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <ScrollArea className="h-[400px] pr-4">
                {activeSubscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {activeSubscriptions.map((subscription) => (
                      <SubscriptionDetailCard key={subscription.id} subscription={subscription} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active subscriptions found</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="history">
              <ScrollArea className="h-[400px] pr-4">
                {inactiveSubscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {inactiveSubscriptions.map((subscription) => (
                      <SubscriptionDetailCard key={subscription.id} subscription={subscription} isHistorical />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No subscription history found</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSubscriptionView; 