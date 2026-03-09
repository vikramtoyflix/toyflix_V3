import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Calendar, 
  Home, 
  RefreshCw,
  AlertCircle,
  Crown,
  RotateCcw
} from 'lucide-react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CycleStatusDashboard } from '@/components/subscription/CycleStatusDashboard';

const SimpleDashboard = () => {
  const { user } = useCustomAuth();

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['simple-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user');

      console.log('🎯 HYBRID Simple dashboard loading for user:', user.id);

      // Get user profile (maybeSingle avoids throw when row missing, e.g. PGRST116)
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw profileError;
      }
      if (!userProfile) {
        console.warn('⚠️ No profile found for user:', user.id);
      } else {
        console.log('✅ User profile:', userProfile.first_name);
      }

      // STEP 1: Get orders from BOTH tables for complete view
      console.log('🔍 Fetching hybrid orders data...');
      
      // Get legacy orders
      const { data: legacyOrders, error: legacyError } = await supabase
        .from('orders')
        .select('id, user_id, created_at, total_amount, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (legacyError) {
        console.error('⚠️ Legacy orders error (continuing):', legacyError);
      }

      // Get rental orders  
      const { data: rentalOrders, error: rentalError } = await (supabase as any)
        .from('rental_orders')
        .select('id, user_id, created_at, total_amount, status, cycle_number, legacy_order_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (rentalError) {
        console.error('⚠️ Rental orders error (continuing):', rentalError);
      }

      // STEP 2: Combine and deduplicate orders
      const legacyOrdersList = legacyOrders || [];
      const rentalOrdersList = rentalOrders || [];
      
      // Remove duplicates (if rental order has legacy_order_id, prefer rental version)
      const allOrders = [...legacyOrdersList, ...rentalOrdersList];
      const uniqueOrders = allOrders.filter((order, index, self) => {
        // If this is a legacy order, check if it's already migrated to rental_orders
        if (legacyOrdersList.includes(order)) {
          const hasMigratedVersion = rentalOrdersList.some((r: any) => r.legacy_order_id === order.id);
          if (hasMigratedVersion) {
            return false; // Skip legacy order, we have the migrated version
          }
        }
        return true;
      });

      // Sort by created date
      uniqueOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const totalSpent = uniqueOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      console.log('✅ HYBRID orders summary:', {
        legacy: legacyOrdersList.length,
        rental: rentalOrdersList.length,
        total: allOrders.length,
        unique: uniqueOrders.length,
        totalSpent
      });

      return {
        userProfile,
        orders: uniqueOrders,
        totalOrders: uniqueOrders.length,
        totalSpent,
        isActive: userProfile?.subscription_active || false,
        plan: userProfile?.subscription_plan || 'Discovery Delight',
        breakdown: {
          legacy: legacyOrdersList.length,
          rental: rentalOrdersList.length,
          unique: uniqueOrders.length
        }
      };
    },
    enabled: !!user?.id,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
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

  const { userProfile, orders, totalOrders, totalSpent, isActive, plan, breakdown } = dashboardData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {userProfile?.first_name || 'User'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your rental dashboard (Hybrid Data View)
          </p>
        </div>
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Data Source Info */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Data Status
            <Badge variant="default" className="bg-green-600">
              Hybrid View Active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Legacy Orders</p>
              <p className="text-lg font-bold text-blue-600">{breakdown.legacy}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Rental Orders</p>
              <p className="text-lg font-bold text-green-600">{breakdown.rental}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Total Unique</p>
              <p className="text-lg font-bold text-purple-600">{breakdown.unique}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-blue-600" />
            Subscription Status
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Current Plan</p>
              <p className="text-lg font-bold text-blue-700">{plan}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Spent</p>
              <p className="text-lg font-bold text-green-600">₹{totalSpent.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-lg font-bold text-purple-600">{totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Cycle Queue Management - Only for Active Subscribers */}
      {isActive && user?.id && (
        <div className="border-2 border-purple-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-purple-800">Next Cycle Management</h2>
            <Badge className="bg-purple-100 text-purple-800">New Feature</Badge>
          </div>
          <CycleStatusDashboard userId={user.id} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Home className="w-8 h-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plan Status</p>
                <p className="text-2xl font-bold">{isActive ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders (Hybrid View)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      Order #{order.id.substring(0, 8)}
                      {order.cycle_number && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Cycle {order.cycle_number}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{order.total_amount?.toLocaleString() || 0}</p>
                    <Badge variant="outline">{order.status || 'completed'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm">Hybrid Dashboard Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-600">
            User ID: {user?.id}<br/>
            Phone: {userProfile?.phone}<br/>
            Legacy Orders: {breakdown.legacy}<br/>
            Rental Orders: {breakdown.rental}<br/>
            Unique Orders: {breakdown.unique}<br/>
            Total Spent: ₹{totalSpent.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleDashboard;
