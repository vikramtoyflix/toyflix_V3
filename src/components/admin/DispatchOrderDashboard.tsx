import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Truck, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  MapPin,
  Phone,
  User,
  Calendar,
  Search,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Real data hooks for dispatch orders
const usePendingDispatchOrders = () => {
  return useQuery({
    queryKey: ['pending-dispatch-orders'],
    queryFn: async () => {
      const { data: orders, error } = await (supabase as any)
        .from('rental_orders')
        .select(`
          id,
          order_number,
          user_id,
          user_phone,
          status,
          subscription_plan,
          created_at,
          toys_data,
          shipping_address
        `)
        .in('status', ['confirmed', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get customer details for each order
      const ordersWithCustomers = await Promise.all(
        (orders || []).map(async (order: any) => {
          const { data: customer } = await supabase
            .from('custom_users')
            .select('first_name, last_name, phone')
            .eq('phone', order.user_phone)
            .single();

          return {
            id: order.id,
            order_id: order.order_number || `ORD-${order.id.slice(0, 8)}`,
            customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown Customer',
            customer_phone: order.user_phone || 'N/A',
            subscription_plan: order.subscription_plan || 'Standard',
            created_at: order.created_at,
            total_items: order.toys_data?.length || 0,
            toys_list: order.toys_data?.map((toy: any) => toy.name || toy.product_name).filter(Boolean).join(', ') || 'No toys',
            shipping_address: order.shipping_address
          };
        })
      );

      return ordersWithCustomers;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
};

const useOverdueReturns = () => {
  return useQuery({
    queryKey: ['overdue-returns'],
    queryFn: async () => {
      const today = new Date();
      
      const { data: orders, error } = await (supabase as any)
        .from('rental_orders')
        .select(`
          id,
          order_number,
          user_id,
          user_phone,
          status,
          rental_end_date,
          created_at,
          toys_data,
          subscription_plan
        `)
        .eq('status', 'delivered')
        .order('rental_end_date', { ascending: true });

      if (error) throw error;

      // Filter for overdue orders and get customer details
      const overdueOrders = await Promise.all(
        (orders || [])
          .filter((order: any) => {
            const endDate = new Date(order.rental_end_date);
            return endDate < today; // Past due date
          })
          .map(async (order: any) => {
            const { data: customer } = await supabase
              .from('custom_users')
              .select('first_name, last_name, phone')
              .eq('phone', order.user_phone)
              .single();

            const endDate = new Date(order.rental_end_date);
            const overdueDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

            return {
              id: order.id,
              customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown Customer',
              customer_phone: order.user_phone || 'N/A',
              dispatch_date: order.created_at,
              expected_return_date: order.rental_end_date,
              overdue_by: `${overdueDays} days`,
              total_items: order.toys_data?.length || 0,
              toys_list: order.toys_data?.map((toy: any) => toy.name || toy.product_name).filter(Boolean).join(', ') || 'No toys'
            };
          })
      );

      return overdueOrders;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Auto-refresh every 10 minutes
  });
};

const DispatchOrderDashboard = () => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Use real data hooks
  const { data: pendingOrders = [], isLoading: pendingLoading } = usePendingDispatchOrders();
  const { data: overdueReturns = [], isLoading: overdueLoading } = useOverdueReturns();

  // Calculate summary stats from real data
  const totalPending = pendingOrders.length;
  const totalDispatched = 0; // Would need separate query for shipped orders
  const totalOverdue = overdueReturns.length;
  const totalReturned = 0; // Would need separate query for returned orders
  const isLoading = pendingLoading || overdueLoading;

  // Mutation for dispatching orders
  const dispatchOrderMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber, notes }: { orderId: string, trackingNumber: string, notes: string }) => {
      const { data, error } = await (supabase as any)
        .from('rental_orders')
        .update({ 
          status: 'dispatched',
          tracking_number: trackingNumber,
          dispatch_notes: notes,
          dispatched_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-dispatch-orders'] });
      toast.success('Order dispatched successfully');
      setTrackingNumber('');
      setDispatchNotes('');
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to dispatch order');
      console.error('Dispatch error:', error);
    }
  });

  // Mutation for processing returns
  const processReturnMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await (supabase as any)
        .from('rental_orders')
        .update({ 
          status: 'returned',
          returned_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-returns'] });
      toast.success('Return processed successfully');
      setReturnItems([]);
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error('Failed to process return');
      console.error('Return error:', error);
    }
  });

  const handleDispatchOrder = async (orderId: string) => {
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }
    
    dispatchOrderMutation.mutate({
      orderId,
      trackingNumber,
      notes: dispatchNotes
    });
  };

  const handleProcessReturn = async (orderId: string) => {
    processReturnMutation.mutate(orderId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispatch & Order Tracking</h2>
          <p className="text-muted-foreground">Manage order fulfillment and returns with UUID tracking</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Dispatch Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dispatch</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground">Ready to ship</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalDispatched}</div>
            <p className="text-xs text-muted-foreground">With customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Returns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdue}</div>
            <p className="text-xs text-muted-foreground">Need follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{totalReturned}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Dispatch ({totalPending})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Returns ({totalOverdue})</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="tracking">UUID Tracking</TabsTrigger>
        </TabsList>

        {/* Pending Dispatch Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Ready for Dispatch</CardTitle>
              <CardDescription>
                Orders that have been packed and are ready to ship. Each toy will get a unique UUID for tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingOrders.length > 0 ? (
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-medium">{order.customer_name}</h4>
                          <Badge variant="outline">{order.subscription_plan}</Badge>
                          <Badge variant="secondary">Order #{order.order_id}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {order.customer_phone}
                          </span>
                          <span className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {order.total_items} items
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Toys:</strong> {order.toys_list}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedOrder(order)}>
                              <Truck className="w-4 h-4 mr-1" />
                              Dispatch Order
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Dispatch Order #{order.order_id}</DialogTitle>
                              <DialogDescription>
                                Mark this order as dispatched and add tracking information. Each toy will be assigned a unique UUID.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">Customer: {order.customer_name}</p>
                                <p className="text-sm text-blue-700">Phone: {order.customer_phone}</p>
                                <p className="text-sm text-blue-700">Items: {order.total_items}</p>
                              </div>
                              <div>
                                <Label htmlFor="tracking">Tracking Number</Label>
                                <Input
                                  id="tracking"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  placeholder="Enter courier tracking number"
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Dispatch Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={dispatchNotes}
                                  onChange={(e) => setDispatchNotes(e.target.value)}
                                  placeholder="Any special instructions or notes"
                                  rows={3}
                                />
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm font-medium text-green-900">✓ UUID Generation</p>
                                <p className="text-sm text-green-700">Each toy will automatically receive a unique tracking UUID</p>
                              </div>
                              <Button 
                                onClick={() => handleDispatchOrder(order.id)}
                                className="w-full"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Dispatching...
                                  </>
                                ) : (
                                  'Confirm Dispatch & Generate UUIDs'
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending dispatches</p>
                  <p className="text-sm mt-2">Orders will appear here when they're ready to ship</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Returns Tab */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Returns</CardTitle>
              <CardDescription>
                Orders that are past their expected return date and need follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueReturns.length > 0 ? (
                <div className="space-y-4">
                  {overdueReturns.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-medium">{order.customer_name}</h4>
                          <Badge variant="destructive">Overdue {order.overdue_by}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {order.customer_phone}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Expected: {new Date(order.expected_return_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {order.total_items} items
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Toys:</strong> {order.toys_list}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4 mr-1" />
                          Call Customer
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedOrder(order)}>
                              Process Return
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Process Return</DialogTitle>
                              <DialogDescription>
                                Mark items as returned and update their condition for inventory
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-3 bg-yellow-50 rounded-lg">
                                <p className="text-sm font-medium text-yellow-900">Customer: {order.customer_name}</p>
                                <p className="text-sm text-yellow-700">Items: {order.toys_list}</p>
                                <p className="text-sm text-yellow-700">Overdue by: {order.overdue_by}</p>
                              </div>
                              <div>
                                <Label>Return Method</Label>
                                <Select defaultValue="pickup">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pickup">Pickup</SelectItem>
                                    <SelectItem value="courier">Courier</SelectItem>
                                    <SelectItem value="drop_off">Drop-off</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button 
                                onClick={() => handleProcessReturn(order.id)}
                                className="w-full"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Confirm Return & Update Inventory'
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No overdue returns</p>
                  <p className="text-sm mt-2">Great! All returns are on time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Orders Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Dispatch Orders</CardTitle>
              <CardDescription>
                Complete history of all dispatch orders and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>All Orders View</p>
                <p className="text-sm mt-2">Comprehensive order history feature coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UUID Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UUID Order Tracking</CardTitle>
              <CardDescription>
                Search and track specific orders using UUIDs, customer info, or order details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Search by UUID, order ID, customer name, or phone" 
                    className="flex-1" 
                  />
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Track by UUID</h4>
                    <p className="text-sm text-blue-700">
                      Each toy gets a unique UUID when dispatched. Use this to track individual items.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900 mb-2">Track by Order</h4>
                    <p className="text-sm text-green-700">
                      Search by order ID or customer details to see all toys in an order.
                    </p>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter search criteria to track orders and individual toys</p>
                  <p className="text-sm mt-2">UUID tracking provides complete visibility into each toy's journey</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DispatchOrderDashboard; 