import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  User, 
  Calendar, 
  DollarSign, 
  ShoppingCart, 
  Eye, 
  History, 
  Database,
  Filter,
  BarChart3,
  Download,
  MapPin,
  Phone,
  Mail,
  Copy,
  CheckCircle2
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ComprehensiveOrderDetails from './ComprehensiveOrderDetails';

interface UnifiedOrder {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_date: string;
  data_source: 'current' | 'historical' | 'woocommerce';
  is_current: boolean;
  legacy_order_id?: string;
  order_items_count: number;
  shipping_address?: any;
  // Legacy specific fields
  wc_order_id?: string;
  migration_notes?: string;
  subscription_name?: string;
}

interface CustomerAnalytics {
  total_customers: number;
  total_orders: number;
  current_orders: number;
  legacy_orders: number;
  total_revenue: number;
  legacy_revenue: number;
  data_sources: {
    current: number;
    historical: number;
    woocommerce: number;
  };
}

const AdminLegacyOrders = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isComprehensiveDetailsOpen, setIsComprehensiveDetailsOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dataSourceFilter, setDataSourceFilter] = useState<'all' | 'current' | 'legacy'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped' | 'delivered' | 'cancelled'>('all');

  // Simulate unified order history query (replace with actual unified view)
  const { data: unifiedOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-unified-orders', dataSourceFilter, statusFilter],
    queryFn: async (): Promise<UnifiedOrder[]> => {
      console.log('📦 Fetching unified order history from views...');
      
      // This would be your actual unified_order_history view query
      // For demo purposes, I'll combine current orders with simulated legacy data
      
      // Get current orders (using separated queries like AdminOrders)
      console.log('📦 Fetching current orders for unified view...');
      
      const { data: currentOrders, error: currentError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          status,
          total_amount,
          created_at,
          shipping_address
        `)
        .order('created_at', { ascending: false });

      if (currentError) {
        console.error('❌ Error fetching current orders for unified view:', currentError);
        throw currentError;
      }

      console.log('✅ Current orders fetched successfully:', currentOrders?.length);

      // Get users separately
      const userIds = [...new Set(currentOrders?.map(order => order.user_id) || [])];
      const { data: usersData, error: usersError } = await supabase
        .from('custom_users')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Error fetching users for unified view:', usersError);
        throw usersError;
      }

      console.log('✅ Users fetched successfully for unified view:', usersData?.length);

      // Get order items separately
      const orderIds = currentOrders?.map(order => order.id) || [];
      let orderItemsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('id, order_id, quantity')
          .in('order_id', orderIds);

        if (itemsError) {
          console.error('⚠️ Error fetching order items for unified view (continuing without them):', itemsError);
        } else {
          orderItemsData = itemsData || [];
          console.log('✅ Order items fetched successfully for unified view:', orderItemsData.length);
        }
      }

      // Transform current orders to unified format
      const transformedCurrentOrders: UnifiedOrder[] = (currentOrders || []).map(order => {
        const user = usersData?.find(u => u.id === order.user_id);
        const orderItems = orderItemsData.filter(item => item.order_id === order.id);
        
        return {
          id: order.id,
          customer_id: order.user_id,
          customer_name: user 
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
            : 'Unknown User',
          customer_phone: user?.phone || 'N/A',
          customer_email: user?.email || 'N/A',
          status: order.status,
          total_amount: order.total_amount || 0,
          created_at: order.created_at,
          order_date: order.created_at,
          data_source: 'current',
          is_current: true,
          order_items_count: orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
          shipping_address: order.shipping_address
        };
      });

      console.log('✅ Transformed current orders for unified view:', transformedCurrentOrders.length);

      // Simulate legacy orders (replace with actual unified view query)
      const simulatedLegacyOrders: UnifiedOrder[] = [
        {
          id: 'wc_001',
          customer_id: 'legacy_001',
          customer_name: 'Rajesh Kumar',
          customer_phone: '+91-9876543210',
          customer_email: 'rajesh@example.com',
          status: 'delivered',
          total_amount: 1500,
          created_at: '2024-01-15T10:30:00Z',
          order_date: '2024-01-15T10:30:00Z',
          data_source: 'woocommerce',
          is_current: false,
          legacy_order_id: 'WC-001',
          wc_order_id: '1234',
          order_items_count: 3,
          subscription_name: 'Monthly Toy Subscription',
          migration_notes: 'Migrated from WooCommerce 2024-06-01'
        },
        {
          id: 'wc_002',
          customer_id: 'legacy_002',
          customer_name: 'Priya Sharma',
          customer_phone: '+91-9876543211',
          customer_email: 'priya@example.com',
          status: 'completed',
          total_amount: 2200,
          created_at: '2024-02-20T14:45:00Z',
          order_date: '2024-02-20T14:45:00Z',
          data_source: 'historical',
          is_current: false,
          legacy_order_id: 'HIST-002',
          order_items_count: 5,
          subscription_name: 'Quarterly Toy Plan',
          migration_notes: 'Historical data imported from legacy system'
        },
        {
          id: 'wc_003',
          customer_id: 'legacy_003',
          customer_name: 'Amit Patel',
          customer_phone: '+91-9876543212',
          customer_email: 'amit@example.com',
          status: 'shipped',
          total_amount: 1800,
          created_at: '2024-03-10T09:15:00Z',
          order_date: '2024-03-10T09:15:00Z',
          data_source: 'woocommerce',
          is_current: false,
          legacy_order_id: 'WC-003',
          wc_order_id: '1235',
          order_items_count: 4,
          subscription_name: 'Premium Toy Rental',
          migration_notes: 'Migrated from WooCommerce 2024-06-01'
        }
      ];

      // Combine and filter
      const allOrders = [...transformedCurrentOrders, ...simulatedLegacyOrders];
      
      // Apply filters
      let filteredOrders = allOrders;
      
      if (dataSourceFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
          dataSourceFilter === 'current' ? order.is_current : !order.is_current
        );
      }
      
      if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => 
          order.status === statusFilter
        );
      }

      return filteredOrders;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Simulate customer analytics query
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-customer-analytics'],
    queryFn: async (): Promise<CustomerAnalytics> => {
      console.log('📊 Fetching customer business intelligence...');
      
      // This would be your customer_business_intelligence view
      return {
        total_customers: 1247,
        total_orders: 3456,
        current_orders: 245,
        legacy_orders: 3211,
        total_revenue: 2845000,
        legacy_revenue: 1920000,
        data_sources: {
          current: 245,
          historical: 1823,
          woocommerce: 1388
        }
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'shipped':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getSourceBadge = (order: UnifiedOrder) => {
    switch (order.data_source) {
      case 'current':
        return { label: 'Current System', variant: 'default' as const, icon: '🔵' };
      case 'woocommerce':
        return { label: 'WooCommerce', variant: 'outline' as const, icon: '🟠' };
      case 'historical':
        return { label: 'Historical', variant: 'secondary' as const, icon: '🟡' };
      default:
        return { label: 'Unknown', variant: 'secondary' as const, icon: '⚪' };
    }
  };

  const canEditOrder = (order: UnifiedOrder) => {
    return order.is_current;
  };

  const canUpdateStatus = (order: UnifiedOrder) => {
    return order.data_source === 'current';
  };

  const handleViewOrderDetails = (order: UnifiedOrder) => {
    if (order.is_current) {
      // Use comprehensive view for current orders
      console.log('🔍 Opening comprehensive view for current order:', order.id);
      setSelectedOrderId(order.id);
      setIsComprehensiveDetailsOpen(true);
    } else {
      // Use legacy view for historical/WooCommerce orders
      console.log('🔍 Opening legacy view for order:', order.id);
      setSelectedOrder(order);
      setIsOrderDetailsOpen(true);
    }
  };

  const exportUnifiedOrders = () => {
    if (!unifiedOrders) return;

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Order ID,Source,Customer Name,Phone,Email,Status,Amount,Items,Order Date,Data Source,Migration Notes\n"
      + unifiedOrders.map(order => {
        const sourceBadge = getSourceBadge(order);
        return `"${order.legacy_order_id || order.id}","${sourceBadge.label}","${order.customer_name}","${order.customer_phone}","${order.customer_email}","${order.status}","₹${order.total_amount}","${order.order_items_count}","${new Date(order.order_date).toLocaleDateString()}","${order.data_source}","${order.migration_notes || 'N/A'}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "unified_orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Unified orders exported successfully"
    });
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Enhanced Legacy Order Details Dialog
  const UnifiedOrderDetailsDialog = () => {
    if (!selectedOrder) return null;

    const sourceBadge = getSourceBadge(selectedOrder);

    return (
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Legacy Order Details - #{selectedOrder.legacy_order_id || selectedOrder.id}
              <Badge variant={sourceBadge.variant}>
                {sourceBadge.icon} {sourceBadge.label}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Legacy order from {sourceBadge.label} - {selectedOrder.migration_notes || 'Historical data'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Total Amount</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">₹{selectedOrder.total_amount.toLocaleString()}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedOrder.total_amount.toString(), 'Total Amount')}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Items Count</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{selectedOrder.order_items_count}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Status</span>
                </div>
                <Badge variant={getStatusColor(selectedOrder.status)} className="text-lg px-3 py-1">
                  {selectedOrder.status}
                </Badge>
              </Card>

              <Card className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Order Date</span>
                </div>
                <p className="text-sm font-medium text-amber-700">
                  {new Date(selectedOrder.order_date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-amber-600">
                  {new Date(selectedOrder.order_date).toLocaleTimeString('en-IN')}
                </p>
              </Card>
            </div>

            {/* Enhanced Customer Information */}
            <Card className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Name</p>
                        <p className="font-medium text-lg">{selectedOrder.customer_name}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedOrder.customer_name, 'Customer Name')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                        <p className="font-medium text-lg">{selectedOrder.customer_phone}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedOrder.customer_phone, 'Phone Number')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email Address</p>
                        <p className="font-medium text-lg">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedOrder.customer_email, 'Email Address')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Database className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Customer ID</p>
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{selectedOrder.customer_id}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedOrder.customer_id, 'Customer ID')}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Legacy Data Information */}
            {!selectedOrder.is_current && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  Legacy Data Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Source:</span>
                    <Badge variant={sourceBadge.variant}>{sourceBadge.label}</Badge>
                  </div>
                  {selectedOrder.wc_order_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WooCommerce Order ID:</span>
                      <span className="font-mono text-sm">{selectedOrder.wc_order_id}</span>
                    </div>
                  )}
                  {selectedOrder.subscription_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subscription:</span>
                      <span className="font-medium">{selectedOrder.subscription_name}</span>
                    </div>
                  )}
                  {selectedOrder.migration_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Migration Notes:</p>
                      <p className="text-sm bg-white p-2 rounded border">{selectedOrder.migration_notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Action Section */}
            <Card className="p-4">
              <h3 className="font-semibold text-lg mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.is_current ? (
                  <>
                    <Select value={selectedOrder.status} disabled>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline">Edit Order</Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <History className="w-4 h-4" />
                    Legacy orders are read-only
                  </div>
                )}
                <Button variant="outline" onClick={() => setIsOrderDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Unified Order Management
          </h2>
          <p className="text-muted-foreground">
            Complete view of current and legacy orders from all data sources
          </p>
        </div>
        <Button onClick={exportUnifiedOrders} disabled={!unifiedOrders}>
          <Download className="w-4 h-4 mr-2" />
          Export Unified Data
        </Button>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">Unified Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters:</span>
              </div>
              <Select value={dataSourceFilter} onValueChange={(value: any) => setDataSourceFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Data Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="current">Current Only</SelectItem>
                  <SelectItem value="legacy">Legacy Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Orders Table */}
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <span>Loading unified orders...</span>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Amount & Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unifiedOrders?.map(order => {
                      const sourceBadge = getSourceBadge(order);
                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                #{order.legacy_order_id || order.id.slice(0, 8)}...
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(order.order_date).toLocaleDateString()}
                              </div>
                              {order.subscription_name && (
                                <div className="text-xs text-blue-600">
                                  {order.subscription_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{order.customer_name}</div>
                              <div className="text-sm text-muted-foreground">{order.customer_phone}</div>
                              {order.customer_email !== 'N/A' && (
                                <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sourceBadge.variant} className="text-xs">
                              {sourceBadge.icon} {sourceBadge.label}
                            </Badge>
                            {!order.is_current && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Read-only
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-lg">₹{order.total_amount}</div>
                              <div className="text-sm text-muted-foreground">{order.order_items_count} items</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={order.is_current ? "default" : "outline"}
                                onClick={() => handleViewOrderDetails(order)}
                                className={order.is_current ? "bg-blue-600 hover:bg-blue-700" : ""}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                {order.is_current ? 'Comprehensive' : 'Legacy View'}
                              </Button>
                              {canUpdateStatus(order) && (
                                <Select value={order.status} disabled>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <span>Loading analytics...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Total Customers</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{analytics?.total_customers}</p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Total Orders</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{analytics?.total_orders}</p>
                <p className="text-xs text-muted-foreground">
                  {analytics?.current_orders} current + {analytics?.legacy_orders} legacy
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Total Revenue</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">₹{analytics?.total_revenue?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{analytics?.legacy_revenue?.toLocaleString()} from legacy
                </p>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">Data Coverage</span>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {analytics?.legacy_orders && analytics?.total_orders 
                    ? Math.round((analytics.legacy_orders / analytics.total_orders) * 100)
                    : 0}% Legacy
                </p>
                <p className="text-xs text-muted-foreground">Historical data coverage</p>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🔵 Current System
              </h3>
              <p className="text-2xl font-bold text-blue-600">{analytics?.data_sources.current}</p>
              <p className="text-sm text-muted-foreground">Active Supabase orders</p>
              <div className="mt-2">
                <Badge variant="default">Full Access</Badge>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🟠 WooCommerce
              </h3>
              <p className="text-2xl font-bold text-orange-600">{analytics?.data_sources.woocommerce}</p>
              <p className="text-sm text-muted-foreground">Migrated WC orders</p>
              <div className="mt-2">
                <Badge variant="outline">Read-only</Badge>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🟡 Historical
              </h3>
              <p className="text-2xl font-bold text-yellow-600">{analytics?.data_sources.historical}</p>
              <p className="text-sm text-muted-foreground">Legacy system data</p>
              <div className="mt-2">
                <Badge variant="secondary">Archived</Badge>
              </div>
            </Card>
          </div>
          
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Data Source Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>🔵 Current System:</span>
                <span>Live orders from Supabase database with full CRUD operations</span>
              </div>
              <div className="flex justify-between">
                <span>🟠 WooCommerce:</span>
                <span>Migrated orders from WooCommerce with preserved metadata</span>
              </div>
              <div className="flex justify-between">
                <span>🟡 Historical:</span>
                <span>Legacy system data imported for historical analysis</span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <UnifiedOrderDetailsDialog />
      
      {/* Comprehensive Order Details for Current Orders */}
      <ComprehensiveOrderDetails
        orderId={selectedOrderId || ''}
        open={isComprehensiveDetailsOpen}
        onClose={() => setIsComprehensiveDetailsOpen(false)}
      />
    </div>
  );
};

export default AdminLegacyOrders; 