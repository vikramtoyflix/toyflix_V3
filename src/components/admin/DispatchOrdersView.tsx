import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Edit,
  X,
  Truck,
  Package,
  Calendar,
  Phone,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ComprehensiveOrderDetails from './ComprehensiveOrderDetails';

// Types
interface DispatchOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  subscriptionPlan: string;
  toys: string[];
  dispatchDate: string | null;
  expectedReturn: string;
  status: 'pending' | 'dispatched' | 'delivered' | 'returned' | 'cancelled' | 'overdue';
  trackingNumber: string | null;
  orderId: string;
  originalOrderId: string;
  notes: string;
  overdue_by: string;
  expected_return_date: string;
  toys_list: string;
  generatedUUIDs: Array<{toyName: string, uuid: string}>;
  created_at: string;
  updated_at: string;
}

interface EditDispatchOrderData {
  trackingNumber: string;
  expectedReturn: string;
  notes: string;
  status: string;
}

const DispatchOrdersView = ({ orders: propOrders }: { orders?: DispatchOrder[] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<DispatchOrder | null>(null);
  const [editFormData, setEditFormData] = useState<EditDispatchOrderData>({
    trackingNumber: '',
    expectedReturn: '',
    notes: '',
    status: ''
  });

  // In real implementation, replace with actual API calls
  const { data: dispatchOrders = propOrders || [], isLoading, refetch } = useQuery({
    queryKey: ['dispatch-orders'],
    queryFn: async () => {
      // This would be your actual Supabase query
      // const { data, error } = await supabase
      //   .from('dispatch_orders')
      //   .select('*')
      //   .order('created_at', { ascending: false });
      // if (error) throw error;
      // return data;
      return propOrders || [];
    }
  });

  const queryClient = useQueryClient();

  const updateDispatchOrderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DispatchOrder> }) => {
      // In real implementation:
      // const { data, error } = await supabase
      //   .from('dispatch_orders')
      //   .update(updates)
      //   .eq('id', id)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;
      
      // Real implementation using rental_orders table
      const { data, error } = await (supabase as any)
        .from('rental_orders')
        .update({
          tracking_number: updates.trackingNumber,
          status: updates.status,
          dispatch_notes: updates.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      toast.success('Dispatch order updated successfully');
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update dispatch order');
      console.error('Update error:', error);
    }
  });

  const cancelDispatchOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      // In real implementation:
      // const { data, error } = await supabase
      //   .from('dispatch_orders')
      //   .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      //   .eq('id', id)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;
      
      // Real implementation using rental_orders table
      const { data, error } = await (supabase as any)
        .from('rental_orders')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      toast.success('Dispatch order cancelled successfully');
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
    },
    onError: (error) => {
      toast.error('Failed to cancel dispatch order');
      console.error('Cancel error:', error);
    }
  });

  // Filter orders based on search and status
  const filteredOrders = dispatchOrders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.includes(searchTerm) ||
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.toys_list.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", icon: Clock },
      dispatched: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Truck },
      delivered: { variant: "default" as const, color: "bg-green-100 text-green-800", icon: CheckCircle },
      returned: { variant: "outline" as const, color: "bg-gray-100 text-gray-800", icon: Package },
      cancelled: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: X },
      overdue: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleViewOrder = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleEditOrder = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setEditFormData({
      trackingNumber: order.trackingNumber || '',
      expectedReturn: order.expectedReturn,
      notes: order.notes,
      status: order.status
    });
    setIsEditDialogOpen(true);
  };

  const handleCancelOrder = (order: DispatchOrder) => {
    setOrderToCancel(order);
    setIsCancelDialogOpen(true);
  };

  const handleUpdateOrder = () => {
    if (!selectedOrder) return;
    
    updateDispatchOrderMutation.mutate({
      id: selectedOrder.id,
      updates: {
        trackingNumber: editFormData.trackingNumber,
        expectedReturn: editFormData.expectedReturn,
        notes: editFormData.notes,
        status: editFormData.status as any,
        updated_at: new Date().toISOString()
      }
    });
  };

  const confirmCancelOrder = () => {
    if (!orderToCancel) return;
    cancelDispatchOrderMutation.mutate(orderToCancel.id);
  };

  const getOrderStats = () => {
    return {
      total: dispatchOrders.length,
      pending: dispatchOrders.filter(o => o.status === 'pending').length,
      dispatched: dispatchOrders.filter(o => o.status === 'dispatched').length,
      delivered: dispatchOrders.filter(o => o.status === 'delivered').length,
      overdue: dispatchOrders.filter(o => o.status === 'overdue').length,
      cancelled: dispatchOrders.filter(o => o.status === 'cancelled').length
    };
  };

  const stats = getOrderStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
        <span className="text-lg">Loading dispatch orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispatch Orders</h2>
          <p className="text-muted-foreground">View and manage all dispatch orders</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.dispatched}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <X className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by customer, phone, order ID, tracking number, or toys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dispatch Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Manage and track all dispatch orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-muted-foreground">{order.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="text-sm font-medium">{order.toys.length} items</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {order.toys_list}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {order.dispatchDate 
                        ? format(new Date(order.dispatchDate), 'MMM dd, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.expectedReturn), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {order.trackingNumber}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                          disabled={order.status === 'cancelled'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelOrder(order)}
                          disabled={order.status === 'cancelled' || order.status === 'returned'}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch Order Details</DialogTitle>
            <DialogDescription>
              Complete information for dispatch order {selectedOrder?.orderId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">{selectedOrder.orderId}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(selectedOrder.created_at), 'PPP')}
                  </p>
                </div>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Customer Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Customer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p>{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p>{selectedOrder.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Subscription Plan</Label>
                      <Badge variant="outline">{selectedOrder.subscriptionPlan}</Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p className="text-sm">{selectedOrder.address}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Truck className="w-5 h-5 mr-2" />
                      Dispatch Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Dispatch Date</Label>
                      <p>{selectedOrder.dispatchDate 
                        ? format(new Date(selectedOrder.dispatchDate), 'PPP')
                        : 'Not dispatched yet'
                      }</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Expected Return</Label>
                      <p>{format(new Date(selectedOrder.expectedReturn), 'PPP')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tracking Number</Label>
                      <p>{selectedOrder.trackingNumber || 'Not assigned'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Notes</Label>
                      <p className="text-sm">{selectedOrder.notes || 'No notes'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Toys and UUIDs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Items & Tracking UUIDs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.generatedUUIDs.length > 0 ? (
                      selectedOrder.generatedUUIDs.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{item.toyName}</p>
                            <p className="text-sm text-muted-foreground">UUID: {item.uuid}</p>
                          </div>
                          <Badge variant="outline">Tracked</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No UUIDs generated yet</p>
                        <p className="text-sm">UUIDs will be generated when order is dispatched</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Dispatch Order</DialogTitle>
            <DialogDescription>
              Update dispatch order information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={editFormData.trackingNumber}
                onChange={(e) => setEditFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label htmlFor="expectedReturn">Expected Return Date</Label>
              <Input
                id="expectedReturn"
                type="date"
                value={editFormData.expectedReturn}
                onChange={(e) => setEditFormData(prev => ({ ...prev, expectedReturn: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={editFormData.status} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateOrder}
                disabled={updateDispatchOrderMutation.isPending}
              >
                {updateDispatchOrderMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Order'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Dispatch Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel dispatch order {orderToCancel?.orderId}? 
              This action cannot be undone and will mark the order as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DispatchOrdersView; 