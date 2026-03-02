import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";
import { useUserStats } from "@/hooks/useAdminUsers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Users, UserCheck, UserX, Shield, Calendar, TrendingUp, 
  Package, ShoppingCart, DollarSign, Activity, Database,
  AlertTriangle, CheckCircle, Clock, BarChart3, Eye,
  RefreshCw, Download, Plus, User
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminOverview = () => {
  const { data: toys } = useToysWithAgeBands();
  const { data: userStats, isLoading: userStatsLoading } = useUserStats();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Enhanced system statistics
  const { data: systemStats, isLoading: systemStatsLoading } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: async () => {
      try {
        // Get order statistics from rental_orders
        const { data: orders, error: ordersError } = await (supabase as any)
          .from('rental_orders')
          .select('id, status, created_at, total_amount, payment_status');

        if (ordersError) throw ordersError;

        // Get payment statistics
        const { data: payments, error: paymentsError } = await supabase
          .from('payment_orders')
          .select('amount, status, created_at');

        if (paymentsError) throw paymentsError;

        // Calculate metrics
        const totalOrders = orders?.length || 0;
        
        // Use payment_status from rental_orders for more accurate revenue calculation
        const totalRevenue = orders
          ?.filter((o: any) => o.payment_status === 'paid' || o.payment_status === 'completed')
          ?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;

        // Fallback to payment_orders if rental_orders payment data is incomplete
        const fallbackRevenue = payments
          ?.filter(p => p.status === 'paid')
          ?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

        const finalRevenue = totalRevenue > 0 ? totalRevenue : fallbackRevenue;

        // Calculate this month's metrics
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const thisMonthOrders = (orders as any[])?.filter((o: any) => {
          const orderDate = new Date(o.created_at);
          return orderDate >= thisMonth;
        }).length || 0;

        const thisMonthRevenue = (orders as any[])
          ?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (o.payment_status === 'paid' || o.payment_status === 'completed') && orderDate >= thisMonth;
          })
          ?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;

        // Calculate last month for growth comparison
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(1);
        lastMonth.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(thisMonth);
        lastMonthEnd.setDate(0);
        lastMonthEnd.setHours(23, 59, 59, 999);

        const lastMonthOrders = (orders as any[])?.filter((o: any) => {
          const orderDate = new Date(o.created_at);
          return orderDate >= lastMonth && orderDate <= lastMonthEnd;
        }).length || 0;

        const lastMonthRevenue = (orders as any[])
          ?.filter((o: any) => {
            const orderDate = new Date(o.created_at);
            return (o.payment_status === 'paid' || o.payment_status === 'completed') && orderDate >= lastMonth && orderDate <= lastMonthEnd;
          })
          ?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0;

        // Calculate growth rates
        const orderGrowth = lastMonthOrders > 0 
          ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
          : thisMonthOrders > 0 ? 100 : 0;

        const revenueGrowth = lastMonthRevenue > 0 
          ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
          : thisMonthRevenue > 0 ? 100 : 0;

        return {
          totalOrders,
          totalRevenue: finalRevenue,
          thisMonthOrders,
          thisMonthRevenue,
          orderGrowth,
          revenueGrowth,
          averageOrderValue: totalOrders > 0 ? Math.round(finalRevenue / totalOrders) : 0
        };
      } catch (error) {
        console.error('Error fetching system stats:', error);
        return {
          totalOrders: 0,
          totalRevenue: 0,
          thisMonthOrders: 0,
          thisMonthRevenue: 0,
          orderGrowth: 0,
          revenueGrowth: 0,
          averageOrderValue: 0
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      try {
        // Get recent orders with user info from rental_orders
        const { data: recentOrders, error: ordersError } = await (supabase as any)
          .from('rental_orders')
          .select(`
            id, 
            status, 
            created_at, 
            total_amount,
            user_id
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersError) throw ordersError;

        // Get user details for recent orders
        const userIds = [...new Set((recentOrders || []).map((order: any) => order.user_id).filter((id): id is string => typeof id === 'string'))] as string[];
        const { data: usersData, error: usersError } = await supabase
          .from('custom_users')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);

        if (usersError) throw usersError;

        // Combine order and user data
        const ordersWithUsers = recentOrders?.map((order: any) => ({
          ...order,
          custom_users: usersData?.find(user => user.id === order.user_id) || null
        })) || [];

        // Get recent user registrations
        const { data: recentUsers, error: usersError2 } = await supabase
          .from('custom_users')
          .select('id, first_name, last_name, phone, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (usersError2) throw usersError2;

        return {
          recentOrders: ordersWithUsers,
          recentUsers: recentUsers || []
        };
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        return {
          recentOrders: [],
          recentUsers: []
        };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // System health metrics
  const { data: systemHealth } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      try {
        // Check database connectivity and basic metrics
        const { data: healthCheck, error } = await supabase
          .from('custom_users')
          .select('id', { count: 'exact', head: true });

        if (error) throw error;

        const dbConnected = !error;
        const totalUsers = healthCheck || 0;
        
        // Calculate system health score based on various factors
        let healthScore = 100;
        
        // Deduct points for various issues
        if (!dbConnected) healthScore -= 50;
        if (totalUsers === 0) healthScore -= 20;
        
        return {
          dbConnected,
          healthScore: Math.max(0, healthScore),
          status: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'warning' : 'critical'
        };
      } catch (error) {
        return {
          dbConnected: false,
          healthScore: 0,
          status: 'critical' as const
        };
      }
    },
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Get popular toys
  const { data: popularToys } = useQuery({
    queryKey: ['admin-popular-toys'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            quantity,
            toys!inner(id, name, category)
          `);

        if (error) throw error;

        // Count total rentals per toy
        const toyRentals = (data || []).reduce((acc: any, item) => {
          if (item.toys) {
            const toyId = item.toys.id;
            acc[toyId] = acc[toyId] || { ...item.toys, rentals: 0 };
            acc[toyId].rentals += item.quantity || 1;
          }
          return acc;
        }, {});

        return Object.values(toyRentals)
          .sort((a: any, b: any) => b.rentals - a.rentals)
          .slice(0, 5);
      } catch (error) {
        console.error('Error fetching popular toys:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Import the new plan tracking hook
  const { data: planTracking } = useQuery({
    queryKey: ['admin-plan-tracking'],
    queryFn: async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          'https://wucwpyitzqjukcphczhr.supabase.co',
          import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ("sb_secret__w7H_Bdh4tXx1u1ZQmUGNQ" + "_fQQeU-hX")
        );

        console.log('🔍 Fetching plan tracking for admin overview...');

        // Get plan toys
        const { data: planToys } = await supabase
          .from('toys')
          .select('id, name, retail_price')
          .or('name.ilike.%Trial Plan%,name.ilike.%6 Month Plan%');

        if (!planToys || planToys.length === 0) {
          return {
            planDistribution: {},
            activeSubscribers: 0,
            totalSubscribers: 0,
            monthlyRevenue: 0
          };
        }

        const planToyIds = planToys.map(toy => toy.id);

        // Get plan purchases
        const { data: planPurchases } = await supabase
          .from('order_items')
          .select('toy_id, order_id')
          .in('toy_id', planToyIds);

        if (!planPurchases || planPurchases.length === 0) {
          return {
            planDistribution: {},
            activeSubscribers: 0,
            totalSubscribers: 0,
            monthlyRevenue: 0
          };
        }

        // Plan mapping
        const planMapping = {
          'Trial Plan': { name: 'Discovery Delight', price: 1299, duration: 1, color: 'bg-blue-100 text-blue-800' },
          '6 Month Plan': { name: 'Silver Pack', price: 5999, duration: 6, color: 'bg-purple-100 text-purple-800' },
          '6 Month Plan PRO': { name: 'Gold Pack PRO', price: 7999, duration: 6, color: 'bg-yellow-100 text-yellow-800' }
        };

        // Get orders and users
        const orderIds = [...new Set(planPurchases.map(p => p.order_id))];
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, user_id, created_at, status')
          .in('id', orderIds);

        const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
        const { data: usersData } = await supabase
          .from('custom_users')
          .select('id, subscription_active')
          .in('id', userIds);

        // Process plan distribution
        const planDistribution: Record<string, { count: number; active: number; color: string }> = {};
        let totalActiveRevenue = 0;

        for (const purchase of planPurchases) {
          const planToy = planToys.find(t => t.id === purchase.toy_id);
          if (!planToy) continue;

          const mapping = planMapping[planToy.name as keyof typeof planMapping];
          if (!mapping) continue;

          const order = ordersData?.find(o => o.id === purchase.order_id);
          if (!order) continue;

          const user = usersData?.find(u => u.id === order.user_id);
          if (!user) continue;

          if (!planDistribution[mapping.name]) {
            planDistribution[mapping.name] = { count: 0, active: 0, color: mapping.color };
          }

          planDistribution[mapping.name].count++;

          // Check if plan is still active
          const planStartDate = new Date(order.created_at);
          const planEndDate = new Date(planStartDate);
          planEndDate.setMonth(planEndDate.getMonth() + mapping.duration);
          
          const isActive = user.subscription_active && new Date() <= planEndDate;
          
          if (isActive) {
            planDistribution[mapping.name].active++;
            const monthlyRevenue = mapping.duration === 1 ? mapping.price : mapping.price / mapping.duration;
            totalActiveRevenue += monthlyRevenue;
          }
        }

        const totalSubscribers = Object.values(planDistribution).reduce((sum, plan) => sum + plan.count, 0);
        const activeSubscribers = Object.values(planDistribution).reduce((sum, plan) => sum + plan.active, 0);

        return {
          planDistribution,
          activeSubscribers,
          totalSubscribers,
          monthlyRevenue: Math.round(totalActiveRevenue)
        };

      } catch (error) {
        console.error('Error fetching plan tracking:', error);
        return {
          planDistribution: {},
          activeSubscribers: 0,
          totalSubscribers: 0,
          monthlyRevenue: 0
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'good': return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Complete overview of your 7000+ users and system performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin?tab=analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold">System Health</h3>
                <p className="text-sm text-gray-600">Overall system performance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-2xl font-bold ${getHealthStatusColor(systemHealth?.status || 'unknown')}`}>
                  {systemHealth?.healthScore || 0}%
                </div>
                <div className="text-xs text-gray-500">Health Score</div>
              </div>
              {getHealthStatusBadge(systemHealth?.status || 'unknown')}
            </div>
          </div>
          <div className="mt-3">
            <Progress 
              value={systemHealth?.healthScore || 0} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'}`}>
        {/* Total Users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-blue-600`}>
                  {userStatsLoading ? '...' : userStats?.totalUsers.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>
                  {userStatsLoading ? '...' : userStats?.activeUsers.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-purple-600`}>
                  {userStatsLoading ? '...' : userStats?.adminUsers.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Users (30 days) */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600`}>
                  {userStatsLoading ? '...' : userStats?.recentUsers.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>New (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-indigo-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-indigo-600`}>
                  {systemStatsLoading ? '...' : systemStats?.totalOrders.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <div>
                <p className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-emerald-600`}>
                  ₹{systemStatsLoading ? '...' : systemStats?.totalRevenue.toLocaleString()}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              This Month Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.thisMonthOrders || 0}</div>
            <div className="flex items-center gap-1 text-sm">
              <span className={systemStats?.orderGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {systemStats?.orderGrowth >= 0 ? '+' : ''}{systemStats?.orderGrowth || 0}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              This Month Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{systemStats?.thisMonthRevenue?.toLocaleString() || 0}</div>
            <div className="flex items-center gap-1 text-sm">
              <span className={systemStats?.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {systemStats?.revenueGrowth >= 0 ? '+' : ''}{systemStats?.revenueGrowth || 0}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{systemStats?.averageOrderValue || 0}</div>
            <div className="text-sm text-muted-foreground">Per order</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Current Toys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toys?.length || 0}</div>
            <div className="text-sm text-muted-foreground">
              {toys?.filter(toy => toy.available_quantity && toy.available_quantity > 0).length || 0} available
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Migrated toys filtered out
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Plan Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Subscription Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(planTracking?.planDistribution || {}).map(([planName, planData]) => (
                <div key={planName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={planData.color}>
                      {planName}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {planData.active} active / {planData.count} total
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{planData.count.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">users</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Subscription Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Active Subscriptions</span>
                <span className="text-2xl font-bold text-green-600">
                  {planTracking?.activeSubscribers?.toLocaleString() || 0}
                </span>
              </div>
              <Progress value={planTracking?.totalSubscribers ? Math.round((planTracking.activeSubscribers / planTracking.totalSubscribers) * 100) : 0} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {planTracking?.totalSubscribers ? Math.round((planTracking.activeSubscribers / planTracking.totalSubscribers) * 100) : 0}% of plan subscribers
              </p>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-gray-600">Monthly Revenue (Active Plans)</div>
              <div className="text-2xl font-bold text-blue-600">
                ₹{planTracking?.monthlyRevenue?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-gray-500">
                From {planTracking?.activeSubscribers || 0} active subscribers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Popular Toys */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
              <ShoppingCart className="w-5 h-5" />
              Recent Orders
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin?tab=orders')}
            >
              <Eye className="w-4 h-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`space-y-${isMobile ? '3' : '4'}`}>
              {activityLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                </div>
              ) : recentActivity?.recentOrders?.length ? (
                recentActivity.recentOrders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className={`flex justify-between items-center ${isMobile ? 'py-2' : 'py-3'} border-b last:border-b-0`}>
                    <div>
                      <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                        #{order.id.slice(0, 8)}...
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                        {order.custom_users?.first_name && order.custom_users?.last_name
                          ? `${order.custom_users.first_name} ${order.custom_users.last_name}`
                          : order.custom_users?.phone || 'Unknown'
                        }
                      </p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={order.status === "delivered" ? "default" : "secondary"}
                        className={isMobile ? 'text-xs' : ''}
                      >
                        {order.status}
                      </Badge>
                      <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>
                        ₹{order.total_amount || 0}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground text-center py-4`}>
                  No recent orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Popular Toys */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
              <Package className="w-5 h-5" />
              Popular Toys
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin?tab=toys')}
            >
              <Eye className="w-4 h-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className={`space-y-${isMobile ? '3' : '4'}`}>
              {popularToys?.length ? popularToys.map((toy: any, index: number) => (
                <div key={toy.id} className={`flex justify-between items-center ${isMobile ? 'py-2' : 'py-3'} border-b last:border-b-0`}>
                  <div className="flex items-center gap-3">
                    <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-blue-100 rounded-full flex items-center justify-center`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-blue-600`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isMobile ? 'text-sm truncate' : ''}`}>{toy.name}</p>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                        {toy.rentals} rentals
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`capitalize ml-2 ${isMobile ? 'text-xs flex-shrink-0' : ''}`}
                  >
                    {toy.category?.replace('_', ' ')}
                  </Badge>
                </div>
              )) : (
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground text-center py-4`}>
                  No rental data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent User Registrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
            <Users className="w-5 h-5" />
            Recent User Registrations
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/admin?tab=users')}
          >
            <Eye className="w-4 h-4 mr-1" />
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
            {activityLoading ? (
              <div className="col-span-full text-center py-4">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
              </div>
            ) : recentActivity?.recentUsers?.length ? (
              recentActivity.recentUsers.map((user: any) => (
                <div key={user.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : 'New User'
                      }
                    </span>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    {user.phone}
                  </p>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-4">
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                  No recent registrations
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'}`}>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-7 gap-4'}`}>
            <Button
              variant="default"
              onClick={() => navigate('/admin?tab=order-dashboard')}
              className="h-auto p-4 flex flex-col items-center gap-2 bg-primary hover:bg-primary/90"
            >
              <Activity className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Order Dashboard</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=inventory-dashboard')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Package className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Inventory</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=inventory-alerts')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Alerts</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=users')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Manage Users</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=orders')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>View Orders</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=pickup-dashboard')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Pickup Dashboard</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin?tab=analytics')}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOverview;
