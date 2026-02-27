import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addDays } from "date-fns";
import { formatIndianDate, formatIndianTime, formatIndianDateTime } from "@/utils/dateUtils";
import { 
  User, Phone, Mail, MapPin, Calendar, Shield, CheckCircle2, AlertCircle, Clock, 
  Package, Crown, TrendingUp, Gift, Star, CreditCard, Truck, RotateCcw, 
  Activity, History, Award, RefreshCw, Eye, ShoppingCart, DollarSign,
  Package2, BookOpen, Target, ChevronRight, ArrowRight, PlayCircle, Home
} from "lucide-react";
import { formatSubscriptionPlanDisplay, getSubscriptionPlanColor } from "./AdminSubscriptionHelper";

interface ViewUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
}

interface RentalOrder {
  id: string;
  order_number: string;
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
  subscription_plan: string;
  payment_status: string;
  shipping_address: string;
}

const ViewUserDialog = ({ open, onOpenChange, user }: ViewUserDialogProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Debug logging
  React.useEffect(() => {
    if (open && user) {
      console.log('🔍 ViewUserDialog opened for user:', {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        phone: user.phone,
        email: user.email
      });
    }
  }, [open, user]);

  // Fetch user's rental orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['admin-user-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('🔄 Fetching rental orders for user:', user.id);

      try {
        const { data: orders, error } = await supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching rental orders:', error);
          throw error;
        }
        
        console.log('✅ Fetched rental orders:', orders?.length || 0, 'orders');
        return (orders as unknown) as RentalOrder[];
      } catch (error) {
        console.warn('⚠️ Could not fetch rental orders:', error);
        return [];
      }
    },
    enabled: !!user?.id && open,
  });

  // Debug orders loading
  React.useEffect(() => {
    if (ordersError) {
      console.error('❌ Orders query error:', ordersError);
    }
    if (ordersLoading) {
      console.log('⏳ Loading orders...');
    }
    if (ordersData) {
      console.log('📊 Orders data loaded:', ordersData.length, 'orders');
    }
  }, [ordersData, ordersLoading, ordersError]);

  const subscriptionLoading = ordersLoading;

  const formatDate = (dateString: string) => {
    return formatIndianDate(dateString);
  };

  const formatDateTime = (dateString: string) => {
    return formatIndianDateTime(dateString);
  };

  // Calculate user statistics
  const orders = ordersData || [];
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const currentOrder = orders.length > 0 ? orders[0] : null;
  const activeOrders = orders.filter(order => order.status === 'active' || order.status === 'delivered').length;
  const completedOrders = orders.filter(order => order.status === 'completed' || order.status === 'returned').length;
  
  // Subscription insights
  const monthsActive = orders.length > 0 ? 
    Math.ceil(differenceInDays(new Date(), new Date(orders[orders.length - 1].created_at)) / 30) : 0;
  
  const toysExperienced = orders.reduce((sum, order) => 
    sum + (order.toys_data?.length || 0), 0);

  // Derive subscription data from rental orders (no separate subscription table)
  const subscriptionData = React.useMemo(() => {
    if (!ordersData || ordersData.length === 0) return null;
    
    const currentOrder = ordersData[0]; // Most recent order
    const allOrders = ordersData;
    
    // Calculate subscription metrics from orders
    const startDate = allOrders[allOrders.length - 1]?.created_at; // First order
    const totalSpent = allOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const avgMonthlySpend = totalSpent / Math.max(monthsActive, 1);
    
    return {
      plan_name: currentOrder.subscription_plan,
      status: currentOrder.status,
      monthly_price: currentOrder.total_amount,
      start_date: startDate,
      next_billing_date: currentOrder.rental_end_date,
      auto_renewal: currentOrder.status === 'active',
      total_cycles: Math.max(...allOrders.map(o => o.cycle_number)),
      total_spent: totalSpent,
      avg_monthly_spend: avgMonthlySpend
    };
  }, [ordersData, monthsActive]);

  // Calculate cycle progress for current order
  let cycleProgress = 0;
  let daysUntilNextPickup = 0;
  let nextPickupDate = null;
  let isSelectionWindow = false;

  if (currentOrder) {
    const startDate = new Date(currentOrder.rental_start_date);
    const endDate = new Date(currentOrder.rental_end_date);
    const today = new Date();
    const totalDays = differenceInDays(endDate, startDate);
    const daysPassed = differenceInDays(today, startDate);
    
    cycleProgress = Math.min((daysPassed / totalDays) * 100, 100);
    nextPickupDate = addDays(endDate, 1);
    daysUntilNextPickup = differenceInDays(nextPickupDate, today);
    
    // Selection window is days 24-30 of cycle
    isSelectionWindow = daysPassed >= 24 && daysPassed <= 30;
  }

  // Parse shipping address
  let shippingInfo = null;
  if (currentOrder?.shipping_address) {
    try {
      shippingInfo = typeof currentOrder.shipping_address === 'string' 
        ? JSON.parse(currentOrder.shipping_address) 
        : currentOrder.shipping_address;
    } catch (error) {
      console.error('Error parsing shipping address:', error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        {!user ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No user selected</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                User Dashboard View
              </DialogTitle>
              <DialogDescription>
                Comprehensive view for {user.first_name} {user.last_name} - ID: {user.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* User Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">₹{totalSpent.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Total Spent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                                         <Package2 className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{toysExperienced}</p>
                      <p className="text-xs text-muted-foreground">Toys Played</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{monthsActive}</p>
                      <p className="text-xs text-muted-foreground">Months Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Subscription Status */}
            {currentOrder && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Current Subscription Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Current Plan</p>
                        <p className="text-xl font-bold text-blue-700">{formatSubscriptionPlanDisplay(currentOrder.subscription_plan)}</p>
                        <Badge variant={currentOrder.status === 'active' ? 'default' : 'secondary'}>
                          {currentOrder.status}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Cycle Progress</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={cycleProgress} className="flex-1" />
                          <span className="text-sm text-gray-600">{Math.round(cycleProgress)}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {daysUntilNextPickup > 0 ? `${daysUntilNextPickup} days until next pickup` : 'Cycle complete'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Current Toys</p>
                        <p className="text-xl font-bold text-green-600">{currentOrder.toys_delivered_count}</p>
                        <p className="text-sm text-gray-500">Toys delivered</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-600">Order Value</p>
                        <p className="text-xl font-bold text-purple-600">₹{currentOrder.total_amount.toLocaleString()}</p>
                        <Badge variant={currentOrder.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {currentOrder.payment_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("orders")}>
                    <Package className="w-4 h-4 mr-2" />
                    View Orders
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("subscription")}>
                    <Crown className="w-4 h-4 mr-2" />
                    Subscription
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("activity")}>
                    <History className="w-4 h-4 mr-2" />
                    Activity Log
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Full Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-4">
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                <span>Loading subscription data...</span>
              </div>
            ) : subscriptionData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Subscription Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Current Subscription Overview */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Current Plan</p>
                          <p className="text-lg font-bold text-blue-700">{formatSubscriptionPlanDisplay(subscriptionData.plan_name)}</p>
                          <Badge variant={subscriptionData.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                            {subscriptionData.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Current Order Value</p>
                          <p className="text-lg font-bold text-green-600">₹{subscriptionData.monthly_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Cycles Completed</p>
                          <p className="text-lg font-bold text-purple-600">{subscriptionData.total_cycles}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Customer Since</p>
                          <p className="text-sm">{formatDate(subscriptionData.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Current Cycle End</p>
                          <p className="text-sm">{subscriptionData.next_billing_date ? formatDate(subscriptionData.next_billing_date) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Auto Renewal</p>
                          <Badge variant={subscriptionData.auto_renewal ? 'default' : 'secondary'}>
                            {subscriptionData.auto_renewal ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Subscription Metrics */}
                    <div>
                      <h4 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        Subscription Metrics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                            <p className="text-xl font-bold text-green-600">₹{subscriptionData.total_spent.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">Total Spent</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-xl font-bold text-blue-600">{monthsActive}</p>
                            <p className="text-xs text-gray-600">Months Active</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Package2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-xl font-bold text-purple-600">{toysExperienced}</p>
                            <p className="text-xs text-gray-600">Total Toys</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                            <p className="text-xl font-bold text-orange-600">₹{Math.round(subscriptionData.avg_monthly_spend).toLocaleString()}</p>
                            <p className="text-xs text-gray-600">Avg/Month</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Separator />

                    {/* Subscription Plan History */}
                    <div>
                      <h4 className="font-medium text-lg mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-600" />
                        Plan History
                      </h4>
                      <div className="space-y-3">
                        {orders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Crown className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{formatSubscriptionPlanDisplay(order.subscription_plan)}</p>
                                <p className="text-xs text-gray-500">Cycle {order.cycle_number} • {formatDate(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">₹{order.total_amount.toLocaleString()}</p>
                              <Badge variant={order.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No subscription data found</p>
                  <p className="text-sm text-gray-500 mt-2">User may have legacy subscription data</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                <span>Loading orders...</span>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {/* Order Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
                      <p className="text-sm text-gray-600">Total Orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Truck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{activeOrders}</p>
                      <p className="text-sm text-gray-600">Active Orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600">{completedOrders}</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {orders.slice(0, 10).map((order) => (
                        <div key={order.id} className="border rounded-lg overflow-hidden">
                          {/* Order Header */}
                          <div className="flex items-center justify-between p-4 bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium">{order.order_number}</p>
                                <Badge variant={order.status === 'active' ? 'default' : 'secondary'}>
                                  {order.status}
                                </Badge>
                                <Badge variant="outline">
                                  Cycle {order.cycle_number}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{formatSubscriptionPlanDisplay(order.subscription_plan)}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(order.created_at)} • {order.toys_data?.length || 0} toys
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">₹{order.total_amount.toLocaleString()}</p>
                              <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {order.payment_status}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Toys Details */}
                          {order.toys_data && order.toys_data.length > 0 && (
                            <div className="p-4">
                              <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                                <Package2 className="w-4 h-4" />
                                Toys in this Order ({order.toys_data.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {order.toys_data.map((toy: any, index: number) => (
                                  <div key={index} className="flex items-start gap-3 p-3 bg-white border rounded-lg">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Gift className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900 truncate">
                                        {toy.name || toy.product_name || 'Unknown Toy'}
                                      </p>
                                      {toy.category && (
                                        <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                                          {toy.category}
                                        </p>
                                      )}
                                      {toy.age_group && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Age: {toy.age_group}
                                        </p>
                                      )}
                                      {toy.rental_price && toy.rental_price > 0 && (
                                        <p className="text-xs text-green-600 font-medium mt-1">
                                          ₹{toy.rental_price}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Order Timeline */}
                          <div className="px-4 pb-4">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Start: {formatDate(order.rental_start_date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                End: {formatDate(order.rental_end_date)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                Delivered: {order.toys_delivered_count || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" />
                                Returned: {order.toys_returned_count || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {orders.length > 10 && (
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-3">
                            and {orders.length - 10} more orders...
                          </p>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No orders found</p>
                  <p className="text-sm text-gray-500 mt-2">User hasn't placed any orders yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Account Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Account Creation */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-gray-600">{formatDateTime(user.created_at)}</p>
                    </div>
                  </div>
                  
                  {/* Phone Verification */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.phone_verified ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      <Phone className={`w-4 h-4 ${
                        user.phone_verified ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">Phone Verification</p>
                      <p className="text-sm text-gray-600">
                        {user.phone_verified ? 'Phone verified' : 'Phone not verified'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Last Login */}
                  {user.last_login && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">Last Login</p>
                        <p className="text-sm text-gray-600">{formatDateTime(user.last_login)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Orders */}
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Order Placed</p>
                        <p className="text-sm text-gray-600">
                          {order.order_number} • ₹{order.total_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{formatDateTime(order.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            {/* Basic Information */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4" />
                  <h4 className="font-medium">Basic Information</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">First Name</label>
                    <p className="text-sm mt-1">{user.first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Name</label>
                    <p className="text-sm mt-1">{user.last_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">User ID</label>
                    <p className="text-sm mt-1 font-mono">{user.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <div className="mt-1">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4" />
                  <h4 className="font-medium">Contact Information</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone Number</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-medium">{user.phone}</p>
                      {user.phone_verified ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-green-700">Verified</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs text-yellow-700">Not verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-sm">{user.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4" />
                  <h4 className="font-medium">Address Information</h4>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Profile Address</label>
                      <div className="space-y-2 mt-2">
                        <p className="text-sm">{user.address_line1 || 'Not provided'}</p>
                        {user.address_line2 && <p className="text-sm">{user.address_line2}</p>}
                                                  <p className="text-sm">
                            {user.city && user.state ? `${user.city}, ${user.state}` : (user.city || user.state || 'Not provided')}
                            {user.zip_code && ` - ${user.zip_code}`}
                          </p>
                      </div>
                    </div>
                  </div>
                  
                  {shippingInfo && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Shipping Address (Latest Order)</label>
                        <div className="space-y-2 mt-2">
                          <p className="text-sm font-medium">{shippingInfo.name || shippingInfo.full_name}</p>
                          <p className="text-sm">{shippingInfo.address_1 || shippingInfo.address_line_1}</p>
                          {shippingInfo.address_2 && <p className="text-sm">{shippingInfo.address_2}</p>}
                          <p className="text-sm">
                            {shippingInfo.city}, {shippingInfo.state} - {shippingInfo.postcode || shippingInfo.zip}
                          </p>
                          <p className="text-sm">{shippingInfo.country || 'India'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Status & Timestamps */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" />
                  <h4 className="font-medium">Account Status & History</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Account Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {user.is_active ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700 font-medium">Active</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-700 font-medium">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Created At</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-sm">{formatDateTime(user.created_at)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Updated</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="text-sm">{formatDateTime(user.updated_at)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Login</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <p className="text-sm">
                        {user.last_login ? formatDateTime(user.last_login) : 'Never logged in'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewUserDialog; 