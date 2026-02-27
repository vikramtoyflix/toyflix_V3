import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Package, 
  Clock, 
  Home, 
  ArrowRight, 
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ClipboardList,
  History,
  PauseCircle,
  HelpCircle,
  User,
  Settings,
  Gift,
  Crown,
  Star,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import PauseSubscriptionDialog from './PauseSubscriptionDialog';
import RaiseConcernDialog from './RaiseConcernDialog';
import EditProfileDialog from './EditProfileDialog';

interface RentalOrder {
  id: string;
  order_number: string;
  legacy_order_id: string;
  user_id: string;
  cycle_number: number;
  status: string;
  return_status: string;
  rental_start_date: string;
  rental_end_date: string;
  toys_delivered_count: number;
  toys_returned_count: number;
  total_amount: number;
  base_amount: number;
  toys_data: any[];
  created_at: string;
  legacy_created_at: string;
  subscription_plan: string;
  payment_status: string;
}

interface DashboardData {
  userProfile: any;
  orders: RentalOrder[];
  subscriptionInfo: {
    isActive: boolean;
    plan: string;
    totalOrders: number;
    totalSpent: number;
    nextPickupDate: string | null;
  };
  currentOrder: RentalOrder | null;
  dataIssues: {
    hasOverlappingCycles: boolean;
    hasMissingToyData: boolean;
    hasMultipleCurrentCycles: boolean;
  };
  cycleInfo: {
    dayInCycle: number;
    isCurrentCycle: boolean;
    isSelectionWindow: boolean;
    progressPercentage: number;
  };
}

const SupabaseOnlyDashboard = () => {
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  const { data: subscriptionData, isLoading: isSubscriptionLoading } = useUserSubscription();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  
  // Dialog states
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isConcernDialogOpen, setIsConcernDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Quick actions logic
  const plan = subscriptionData?.plan;
  const canPause = !isSubscriptionLoading && plan && plan.features?.pauseMonthsAllowed > 0;
  const isAdmin = !isRoleLoading && userRole === 'admin';

  // Main dashboard data query using rental_orders table only
  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['supabase-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('No user');

      console.log('🎯 Loading dashboard for user:', user.id);

      try {
        // Get user profile
        console.log('1️⃣ Fetching user profile...');
        const { data: userProfile, error: profileError } = await supabase
          .from('custom_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('❌ Profile error:', profileError);
          throw profileError;
        }

        console.log('✅ User profile found:', userProfile.first_name);

        // Get rental orders from unified table (2,220 migrated records)
        console.log('2️⃣ Querying rental_orders table (unified data)...');
        const { data: rentalOrdersData, error: rentalError } = await supabase
          .from('rental_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('cycle_number', { ascending: false });

        if (rentalError) {
          console.error('❌ Rental orders error:', rentalError);
          throw rentalError;
        }

        const orders: RentalOrder[] = rentalOrdersData || [];
        console.log(`✅ Found ${orders.length} orders from unified rental_orders table`);
        
        if (orders.length > 0) {
          console.log('📊 Sample order data:', {
            firstOrder: orders[0].order_number,
            totalAmount: orders[0].total_amount,
            toysCount: orders[0].toys_data?.length || 0,
            status: orders[0].status
          });
        }

        // Calculate subscription info
        const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        
        const subscriptionInfo = {
          isActive: userProfile.subscription_active || orders.length > 0,
          plan: userProfile.subscription_plan || orders[0]?.subscription_plan || 'Discovery Delight',
          totalOrders: orders.length,
          totalSpent,
          nextPickupDate: null,
        };

        // Find current order (most recent)
        const currentOrder = orders.length > 0 ? orders[0] : null;

        // Calculate cycle info
        const today = new Date();
        let dayInCycle = 1;
        let isCurrentCycle = false;
        let progressPercentage = 0;

        if (currentOrder?.rental_start_date && currentOrder?.rental_end_date) {
          try {
            const startDate = parseISO(currentOrder.rental_start_date);
            const endDate = parseISO(currentOrder.rental_end_date);
            
            if (isWithinInterval(today, { start: startDate, end: endDate })) {
              dayInCycle = Math.max(1, differenceInDays(today, startDate) + 1);
              isCurrentCycle = true;
              progressPercentage = Math.min(100, (dayInCycle / 30) * 100);
            }
          } catch (e) {
            console.warn('Date calculation error:', e);
          }
        }

        // Check if selection window should be open based on timing AND database status
        let isSelectionWindow = isCurrentCycle && dayInCycle >= 24 && dayInCycle <= 30;
        
        // 🔒 NEW: For +91 users, override timing with database status
        if (userProfile.phone?.startsWith('+91') && currentOrder) {
          const isDatabaseClosed = currentOrder.selection_window_status === 'manual_closed' || 
                                  currentOrder.selection_window_status === 'force_closed';
          if (isDatabaseClosed) {
            isSelectionWindow = false; // Override timing logic
          }
        }

        const result = {
          userProfile,
          orders,
          subscriptionInfo,
          currentOrder,
          dataIssues: {
            hasOverlappingCycles: false,
            hasMissingToyData: currentOrder ? (!currentOrder.toys_data || currentOrder.toys_data.length === 0) : false,
            hasMultipleCurrentCycles: false,
          },
          cycleInfo: {
            dayInCycle,
            isCurrentCycle,
            isSelectionWindow,
            progressPercentage,
          }
        };

        console.log('✅ Dashboard loaded successfully:', {
          user: userProfile?.first_name,
          orders: orders.length,
          totalSpent: totalSpent,
          subscription: subscriptionInfo,
          currentCycle: currentOrder?.cycle_number,
          isCurrentCycle,
          dayInCycle
        });

        return result;

      } catch (error: any) {
        console.error('❌ Dashboard query exception:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dashboard Error</h3>
            <p className="text-gray-600 mb-4">
              {error?.message || 'Unable to load your dashboard'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userProfile, orders, subscriptionInfo, currentOrder, dataIssues, cycleInfo } = dashboardData;

  const stats = {
    totalOrders: orders.length,
    toysAtHome: currentOrder?.toys_data?.length || 0,
    currentCycle: currentOrder?.cycle_number || 1,
    dayInCycle: cycleInfo.dayInCycle,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {userProfile?.first_name || 'User'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Here's your rental dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          {cycleInfo.isCurrentCycle && (
            <Badge variant={cycleInfo.isSelectionWindow ? "default" : "secondary"}>
              {cycleInfo.isSelectionWindow ? "Selection Window" : `Day ${cycleInfo.dayInCycle}/30`}
            </Badge>
          )}
          {!cycleInfo.isCurrentCycle && currentOrder && (
            <Badge variant="outline">
              Cycle {currentOrder.cycle_number} - {currentOrder.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Data Issues Alert */}
      {(dataIssues.hasMultipleCurrentCycles || dataIssues.hasMissingToyData) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Account Data Issues Detected
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {dataIssues.hasMultipleCurrentCycles && (
                    <li>• Multiple overlapping subscription cycles found</li>
                  )}
                  {dataIssues.hasMissingToyData && (
                    <li>• Current cycle missing toy information</li>
                  )}
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  These issues don't affect your service. Our team has been notified and will resolve them soon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-blue-600" />
            Subscription Status
            <Badge variant={subscriptionInfo.isActive ? "default" : "secondary"}>
              {subscriptionInfo.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Current Plan</p>
              <p className="text-lg font-bold text-blue-700">{subscriptionInfo.plan}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-lg font-bold text-green-600">₹{subscriptionInfo.totalSpent.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Next Pickup</p>
              <p className="text-lg font-bold text-orange-600">
                {subscriptionInfo.nextPickupDate ? format(parseISO(subscriptionInfo.nextPickupDate), 'MMM dd, yyyy') : 'TBD'}
              </p>
            </div>
          </div>
          
          {subscriptionInfo.isActive && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Your subscription is active and running smoothly!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toys at Home</p>
                <p className="text-2xl font-bold">{stats.toysAtHome}</p>
                {dataIssues.hasMissingToyData && (
                  <p className="text-xs text-yellow-600">Data updating...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Cycle</p>
                <p className="text-2xl font-bold">{stats.currentCycle}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Day in Cycle</p>
                <p className="text-2xl font-bold">
                  {cycleInfo.isCurrentCycle ? `${cycleInfo.dayInCycle}/30` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Home className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-gray-600">Common tasks and features</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button onClick={() => navigate('/toys')} variant="outline" className="flex-col h-24">
              <BookOpen className="w-6 h-6 mb-2" />
              <span>Browse Toys</span>
            </Button>
            
            <Button onClick={() => setIsProfileDialogOpen(true)} variant="outline" className="flex-col h-24">
              <User className="w-6 h-6 mb-2" />
              <span>Edit Profile</span>
            </Button>
            
            <Button onClick={() => navigate('/pricing')} variant="outline" className="flex-col h-24">
              <ClipboardList className="w-6 h-6 mb-2" />
              <span>View Plans</span>
            </Button>

            {canPause && (
              <Button onClick={() => setIsPauseDialogOpen(true)} variant="outline" className="flex-col h-24">
                <PauseCircle className="w-6 h-6 mb-2" />
                <span>Pause Plan</span>
              </Button>
            )}

            <Button 
              onClick={() => {
                // Import WhatsApp service dynamically
                import('@/services/whatsappService').then(({ WhatsAppService }) => {
                  WhatsAppService.openGeneralSupport({
                    userPhone: user?.phone,
                    userName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : undefined,
                    inquiry: 'I need help with my ToyJoyBox subscription'
                  });
                });
              }} 
              variant="outline" 
              className="flex-col h-24"
            >
              <HelpCircle className="w-6 h-6 mb-2" />
              <span>WhatsApp Support</span>
            </Button>

            {cycleInfo.isSelectionWindow && (
              <Button onClick={() => navigate('/subscription-flow')} className="flex-col h-24 bg-blue-600 hover:bg-blue-700">
                <Gift className="w-6 h-6 mb-2" />
                <span>Select Toys</span>
              </Button>
            )}

            {isAdmin && (
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex-col h-24">
                <Settings className="w-6 h-6 mb-2" />
                <span>Admin Panel</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cycle Progress */}
      {cycleInfo.isCurrentCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cycle Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Day {cycleInfo.dayInCycle} of 30</span>
                <span className="text-sm text-gray-500">{Math.round(cycleInfo.progressPercentage)}%</span>
              </div>
              <Progress value={cycleInfo.progressPercentage} className="w-full" />
              
              {cycleInfo.isSelectionWindow && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Selection Window Active!</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    You can now select toys for your next cycle.
                  </p>
                  <Button size="sm" onClick={() => navigate('/subscription-flow')}>
                    Select Next Toys
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Order */}
      {currentOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Current Order
              <Badge variant="outline">{currentOrder.status}</Badge>
              {dataIssues.hasMultipleCurrentCycles && (
                <Badge variant="destructive" className="text-xs">
                  Data Issue
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Order Number</p>
                  <p className="font-mono text-sm">{currentOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Rental Period</p>
                  <p className="text-sm">
                    {format(parseISO(currentOrder.rental_start_date), 'MMM dd')} - {format(parseISO(currentOrder.rental_end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Return Status</p>
                  <Badge variant={currentOrder.return_status === 'returned' ? 'default' : 'secondary'}>
                    {currentOrder.return_status || 'pending'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toys Delivered</p>
                  <p className="text-sm">{currentOrder.toys_delivered_count || currentOrder.toys_data?.length || 0} toys</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Toys Returned</p>
                  <p className="text-sm">{currentOrder.toys_returned_count || 0} toys</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-sm font-semibold">₹{currentOrder.total_amount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Toys List */}
            {currentOrder.toys_data && Array.isArray(currentOrder.toys_data) && currentOrder.toys_data.length > 0 ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-600 mb-3">Current Toys</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentOrder.toys_data.map((toy: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      {toy.image_url && (
                        <img
                          src={toy.image_url}
                          alt={toy.toy_name || toy.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{toy.toy_name || toy.name}</p>
                        <p className="text-xs text-gray-500">{toy.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Toy information is being updated
                  </span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  Your toys are being delivered as scheduled. The toy list will appear here once our system updates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Order History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Order History
            <Badge variant="outline">{orders.length} orders</Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">Complete history of your rental orders</p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No orders yet</p>
              <p className="text-sm text-gray-500">
                Your order history will appear here once you place your first order.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/toys')}>
                Browse Toys
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 10).map((order: RentalOrder) => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">Cycle {order.cycle_number}</h4>
                        <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                        <Badge variant={order.return_status === 'returned' ? 'default' : 'secondary'}>
                          {order.return_status || 'pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 font-mono">{order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{order.total_amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">
                        {order.payment_status && (
                          <Badge variant="outline" className="text-xs">
                            {order.payment_status}
                          </Badge>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Rental Period</p>
                      <p className="font-medium">
                        {format(parseISO(order.rental_start_date), 'MMM dd')} - {format(parseISO(order.rental_end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Toys</p>
                      <p className="font-medium">
                        {order.toys_data?.length || order.toys_delivered_count || 0} toys
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created</p>
                      <p className="font-medium">{format(parseISO(order.legacy_created_at || order.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>

                  {order.toys_data && order.toys_data.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-2">Toys in this order:</p>
                      <div className="flex flex-wrap gap-1">
                        {order.toys_data.slice(0, 3).map((toy: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {toy.toy_name || toy.name}
                          </Badge>
                        ))}
                        {order.toys_data.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{order.toys_data.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {orders.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    View All Orders ({orders.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {canPause && plan && (
        <PauseSubscriptionDialog 
          open={isPauseDialogOpen} 
          onOpenChange={setIsPauseDialogOpen} 
          maxPauseMonths={plan.features.pauseMonthsAllowed} 
        />
      )}
      <RaiseConcernDialog
        open={isConcernDialogOpen}
        onOpenChange={setIsConcernDialogOpen}
      />
      <EditProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </div>
  );
};

export default SupabaseOnlyDashboard; 