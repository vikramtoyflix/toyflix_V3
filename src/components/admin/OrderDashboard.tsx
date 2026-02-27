import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, Package, Clock, Truck, AlertTriangle, CheckCircle, 
  TrendingUp, DollarSign, Activity, Bell, Timer
} from "lucide-react";

interface DashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  todayRevenue: number;
  avgOrderValue: number;
  pendingActions: PendingAction[];
  todayDeliveries: DeliveryOrder[];
  overdueReturns: OverdueReturn[];
  orderStatusData: StatusData[];
}

interface PendingAction {
  id: string;
  type: 'payment_pending' | 'confirm_required' | 'ship_ready' | 'overdue_return';
  order_number: string;
  customer_name: string;
  amount: number;
  days_pending: number;
  priority: 'high' | 'medium' | 'low';
}

interface DeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  status: 'in_transit' | 'out_for_delivery' | 'delivered';
}

interface OverdueReturn {
  id: string;
  order_number: string;
  customer_name: string;
  return_due_date: string;
  days_overdue: number;
  toys_count: number;
}

interface StatusData {
  status: string;
  count: number;
  percentage: number;
}

const OrderDashboard = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time data fetching with 30-second intervals
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['order-dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      console.log('🔄 Fetching real-time order dashboard metrics...');
      
      try {
        // Fetch all orders for calculations
        const { data: orders, error: ordersError } = await (supabaseAdmin as any)
          .from('rental_orders')
          .select(`
            id, order_number, status, payment_status, total_amount, created_at,
            rental_end_date, shipping_address, toys_data, user_phone, user_id
          `)
          .order('created_at', { ascending: false })
          .limit(1000);

        if (ordersError) throw ordersError;

        // Fetch customer data
        const userIds = [...new Set(orders?.map(order => order.user_id).filter(Boolean))];
        const { data: users } = await (supabaseAdmin as any)
          .from('custom_users')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);

        const userMap = new Map(users?.map((user: any) => [user.id, user]) || []);

        // Calculate metrics
        const totalOrders = orders?.length || 0;
        const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
        const confirmedOrders = orders?.filter(o => o.status === 'confirmed').length || 0;
        const shippedOrders = orders?.filter(o => o.status === 'shipped').length || 0;
        const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;
        const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;

        const todayOrders = orders?.filter(o => 
          new Date(o.created_at).toDateString() === new Date().toDateString()
        ).length || 0;

        const todayRevenue = orders?.filter(o => 
          new Date(o.created_at).toDateString() === new Date().toDateString()
        ).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        const avgOrderValue = totalOrders > 0 
          ? (orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0) / totalOrders 
          : 0;

        // Pending actions
        const pendingActions: PendingAction[] = orders?.filter(order => 
          order.status === 'pending' || order.payment_status === 'pending' || order.status === 'confirmed'
        ).slice(0, 10).map(order => {
          const user = userMap.get(order.user_id) as any;
          const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
          const daysPending = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
          
          let type: PendingAction['type'] = 'confirm_required';
          let priority: PendingAction['priority'] = 'medium';

          if (order.payment_status === 'pending') {
            type = 'payment_pending';
            priority = daysPending > 2 ? 'high' : 'medium';
          } else if (order.status === 'confirmed') {
            type = 'ship_ready';
            priority = daysPending > 1 ? 'high' : 'medium';
          }

          return {
            id: order.id,
            type,
            order_number: order.order_number,
            customer_name: customerName,
            amount: order.total_amount || 0,
            days_pending: daysPending,
            priority
          };
        }) || [];

        // Today's deliveries
        const todayDeliveries: DeliveryOrder[] = orders?.filter(o => 
          o.status === 'shipped' || o.status === 'delivered'
        ).slice(0, 5).map(order => {
          const user = userMap.get(order.user_id) as any;
          const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
          
          return {
            id: order.id,
            order_number: order.order_number,
            customer_name: customerName,
            status: order.status === 'delivered' ? 'delivered' : 'in_transit'
          };
        }) || [];

        // Overdue returns
        const overdueReturns: OverdueReturn[] = orders?.filter(order => {
          if (!order.rental_end_date) return false;
          const endDate = new Date(order.rental_end_date);
          return endDate < new Date() && order.status === 'delivered';
        }).slice(0, 10).map(order => {
          const user = userMap.get(order.user_id) as any;
          const customerName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown';
          const daysOverdue = Math.floor((Date.now() - new Date(order.rental_end_date).getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            id: order.id,
            order_number: order.order_number,
            customer_name: customerName,
            return_due_date: order.rental_end_date,
            days_overdue: daysOverdue,
            toys_count: Array.isArray(order.toys_data) ? order.toys_data.length : 0
          };
        }) || [];

        // Order status distribution
        const statusCounts = {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        };

        const orderStatusData: StatusData[] = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
        }));

        return {
          totalOrders,
          pendingOrders,
          confirmedOrders,
          shippedOrders,
          deliveredOrders,
          cancelledOrders,
          todayOrders,
          todayRevenue,
          avgOrderValue,
          pendingActions,
          todayDeliveries,
          overdueReturns,
          orderStatusData
        };

      } catch (error) {
        console.error('❌ Error fetching dashboard metrics:', error);
        throw error;
      }
    },
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setLastUpdate(new Date());
      toast({
        title: "Dashboard Updated",
        description: "All metrics have been refreshed with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to update dashboard metrics.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-update last update time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'payment_pending': return <DollarSign className="w-4 h-4" />;
      case 'confirm_required': return <CheckCircle className="w-4 h-4" />;
      case 'ship_ready': return <Truck className="w-4 h-4" />;
      case 'overdue_return': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Order Dashboard</h2>
          <div className="animate-pulse bg-muted h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Real-Time Order Dashboard
          </h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()} 
            <span className="ml-2 text-green-600">● Live</span>
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOrders?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.todayOrders || 0} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics?.todayRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg ₹{Math.round(metrics?.avgOrderValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.pendingActions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Returns</CardTitle>
            <Timer className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.overdueReturns?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need follow-up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {metrics?.orderStatusData?.map((status, index) => (
          <Card key={status.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                {status.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                {status.status === 'confirmed' && <CheckCircle className="w-4 h-4 text-blue-500" />}
                {status.status === 'shipped' && <Truck className="w-4 h-4 text-orange-500" />}
                {status.status === 'delivered' && <Package className="w-4 h-4 text-green-500" />}
                {status.status === 'cancelled' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                {status.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status.count}</div>
              <Progress value={status.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {status.percentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Charts loading...</p>
              <p className="text-xs">Recharts optimization in progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Charts loading...</p>
              <p className="text-xs">Will be available shortly</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.pendingActions?.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getActionIcon(action.type)}
                  <div>
                    <p className="text-sm font-medium">{action.order_number}</p>
                    <p className="text-xs text-muted-foreground">{action.customer_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={getPriorityColor(action.priority)}>
                    {action.days_pending}d
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₹{action.amount}
                  </p>
                </div>
              </div>
            ))}
            {!metrics?.pendingActions?.length && (
              <p className="text-center text-muted-foreground py-4">
                No pending actions
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Today's Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.todayDeliveries?.slice(0, 5).map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium">{delivery.order_number}</p>
                    <p className="text-xs text-muted-foreground">{delivery.customer_name}</p>
                  </div>
                </div>
                <Badge variant={delivery.status === 'delivered' ? 'default' : 'secondary'}>
                  {delivery.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
            {!metrics?.todayDeliveries?.length && (
              <p className="text-center text-muted-foreground py-4">
                No deliveries today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Returns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Overdue Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics?.overdueReturns?.slice(0, 5).map((returnItem) => (
              <div key={returnItem.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                <div className="flex items-center gap-3">
                  <Timer className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">{returnItem.order_number}</p>
                    <p className="text-xs text-muted-foreground">{returnItem.customer_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">
                    {returnItem.days_overdue}d overdue
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {returnItem.toys_count} toys
                  </p>
                </div>
              </div>
            ))}
            {!metrics?.overdueReturns?.length && (
              <p className="text-center text-muted-foreground py-4">
                No overdue returns
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderDashboard; 