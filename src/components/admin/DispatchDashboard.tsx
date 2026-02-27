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

// Mock hooks until we fix the TypeScript issues
const usePendingDispatches = () => ({
  data: [
    {
      id: '1',
      order_id: 'ORD-001',
      customer_name: 'John Doe',
      customer_phone: '+91 9876543210',
      subscription_plan: 'Silver Pack',
      created_at: '2024-01-15T10:00:00Z',
      total_items: 3,
      toys_list: 'Building Blocks, Puzzle Game, Art Kit'
    }
  ],
  isLoading: false,
  error: null
});

const useOverdueReturns = () => ({
  data: [
    {
      id: '2',
      customer_name: 'Jane Smith',
      customer_phone: '+91 9876543211',
      dispatch_date: '2024-01-01T10:00:00Z',
      expected_return_date: '2024-01-10T10:00:00Z',
      overdue_by: '5 days',
      total_items: 2,
      toys_list: 'LEGO Set, Science Kit'
    }
  ],
  isLoading: false,
  error: null
});

const useDispatchSummary = () => ({
  data: [
    { dispatch_status: 'pending', order_count: 5, overdue_count: 0 },
    { dispatch_status: 'dispatched', order_count: 12, overdue_count: 3 },
    { dispatch_status: 'returned', order_count: 8, overdue_count: 0 }
  ],
  isLoading: false,
  error: null
});

const useDispatchOrders = (status?: string) => ({
  data: [
    {
      id: '1',
      order_id: 'ORD-001',
      customer_name: 'John Doe',
      customer_phone: '+91 9876543210',
      customer_address: '123 Main St, Mumbai',
      subscription_plan: 'Silver Pack',
      dispatch_status: status || 'pending',
      created_at: '2024-01-15T10:00:00Z',
      expected_return_date: '2024-02-15T10:00:00Z',
      tracking_number: status === 'dispatched' ? 'TRK123456' : null,
      dispatch_items: [
        {
          id: 'item-1',
          toy_name: 'Building Blocks',
          toy_category: 'Educational',
          quantity_dispatched: 1,
          item_status: 'dispatched'
        }
      ]
    }
  ],
  isLoading: false,
  error: null
});

const useCreateDispatchOrder = () => ({
  mutateAsync: async (data: any) => {
    console.log('Creating dispatch order:', data);
    toast.success('Dispatch order created successfully');
    return 'new-dispatch-id';
  },
  isPending: false
});

const useMarkOrderDispatched = () => ({
  mutateAsync: async (data: any) => {
    console.log('Marking order as dispatched:', data);
    toast.success('Order marked as dispatched');
  },
  isPending: false
});

const useProcessReturn = () => ({
  mutateAsync: async (data: any) => {
    console.log('Processing return:', data);
    toast.success('Return processed successfully');
  },
  isPending: false
});

const DispatchDashboard = () => {
  const { data: pendingDispatches, isLoading: pendingLoading } = usePendingDispatches();
  const { data: overdueReturns, isLoading: overdueLoading } = useOverdueReturns();
  const { data: dispatchSummary, isLoading: summaryLoading } = useDispatchSummary();
  const { data: allOrders } = useDispatchOrders();
  
  const createDispatchOrder = useCreateDispatchOrder();
  const markOrderDispatched = useMarkOrderDispatched();
  const processReturn = useProcessReturn();

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);

  // Calculate summary stats
  const totalPending = dispatchSummary?.find(s => s.dispatch_status === 'pending')?.order_count || 0;
  const totalDispatched = dispatchSummary?.find(s => s.dispatch_status === 'dispatched')?.order_count || 0;
  const totalOverdue = dispatchSummary?.reduce((sum, s) => sum + (s.overdue_count || 0), 0) || 0;
  const totalReturned = dispatchSummary?.find(s => s.dispatch_status === 'returned')?.order_count || 0;

  const handleDispatchOrder = async (orderId: string) => {
    try {
      await markOrderDispatched.mutateAsync({
        dispatch_order_id: orderId,
        tracking_number: trackingNumber,
        dispatch_notes: dispatchNotes
      });
      setTrackingNumber('');
      setDispatchNotes('');
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error dispatching order:', error);
    }
  };

  const handleProcessReturn = async (orderId: string) => {
    try {
      await processReturn.mutateAsync({
        dispatch_order_id: orderId,
        returned_items: returnItems,
        return_method: 'pickup'
      });
      setReturnItems([]);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error processing return:', error);
    }
  };

  if (pendingLoading || overdueLoading || summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Dispatch & Order Tracking</h2>
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispatch & Order Tracking</h2>
          <p className="text-muted-foreground">Manage order fulfillment and returns</p>
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
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        {/* Pending Dispatch Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Ready for Dispatch</CardTitle>
              <CardDescription>
                Orders that have been packed and are ready to ship
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDispatches && pendingDispatches.length > 0 ? (
                <div className="space-y-4">
                  {pendingDispatches.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-medium">{order.customer_name}</h4>
                          <Badge variant="outline">{order.subscription_plan}</Badge>
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
                        <p className="text-sm text-gray-600">{order.toys_list}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" onClick={() => setSelectedOrder(order)}>
                              <Truck className="w-4 h-4 mr-1" />
                              Dispatch
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Dispatch Order</DialogTitle>
                              <DialogDescription>
                                Mark this order as dispatched and add tracking information
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="tracking">Tracking Number</Label>
                                <Input
                                  id="tracking"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  placeholder="Enter tracking number"
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Dispatch Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={dispatchNotes}
                                  onChange={(e) => setDispatchNotes(e.target.value)}
                                  placeholder="Any special instructions or notes"
                                />
                              </div>
                              <Button 
                                onClick={() => handleDispatchOrder(order.id)}
                                className="w-full"
                                disabled={markOrderDispatched.isPending}
                              >
                                {markOrderDispatched.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Dispatching...
                                  </>
                                ) : (
                                  'Confirm Dispatch'
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
                Orders that are past their expected return date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueReturns && overdueReturns.length > 0 ? (
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
                        </div>
                        <p className="text-sm text-gray-600">{order.toys_list}</p>
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
                                Mark items as returned and update their condition
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm">Items: {order.toys_list}</p>
                              <Button 
                                onClick={() => handleProcessReturn(order.id)}
                                className="w-full"
                                disabled={processReturn.isPending}
                              >
                                {processReturn.isPending ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  'Confirm Return'
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
                Complete history of all dispatch orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allOrders?.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <h4 className="font-medium">{order.customer_name}</h4>
                        <Badge variant={
                          order.dispatch_status === 'pending' ? 'secondary' :
                          order.dispatch_status === 'dispatched' ? 'default' :
                          order.dispatch_status === 'returned' ? 'outline' : 'destructive'
                        }>
                          {order.dispatch_status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{order.customer_phone}</span>
                        <span>{order.dispatch_items?.length} items</span>
                        {order.tracking_number && (
                          <span className="font-mono">{order.tracking_number}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Tracking</CardTitle>
              <CardDescription>
                Search and track specific orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Input placeholder="Search by order ID, customer name, or phone" className="flex-1" />
                <Button>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter search criteria to track orders</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DispatchDashboard; 