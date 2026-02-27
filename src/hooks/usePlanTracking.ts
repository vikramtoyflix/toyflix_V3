import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Plan mapping from old website toy items to actual plans
const PLAN_MAPPING = {
  'Trial Plan': {
    actual_name: 'Discovery Delight',
    price: 1299,
    period: 'month',
    duration_months: 1
  },
  '6 Month Plan': {
    actual_name: 'Silver Pack',
    price: 5999,
    period: '6 months',
    duration_months: 6
  },
  '6 Month Plan PRO': {
    actual_name: 'Gold Pack PRO',
    price: 7999,
    period: '6 months',
    duration_months: 6
  },
  // Note: Ride-On Monthly plan might be missing from migrated data
  // or might be represented differently
};

export interface PlanSubscription {
  id: string;
  user_id: string;
  plan_name: string;
  actual_plan_name: string;
  plan_start_date: string;
  plan_order_id: string;
  plan_status: string;
  price: number;
  duration_months: number;
  orders_since_plan: Order[];
  total_orders: number;
  current_status: 'active' | 'expired' | 'cancelled';
}

interface Order {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  items_count: number;
}

interface PlanAnalytics {
  total_plan_subscribers: number;
  active_subscribers: number;
  plan_distribution: Record<string, number>;
  monthly_revenue: number;
  plan_subscriptions: PlanSubscription[];
}

export const usePlanTracking = () => {
  return useQuery({
    queryKey: ['plan-tracking'],
    queryFn: async (): Promise<PlanAnalytics> => {
      try {
        console.log('🔍 Fetching plan tracking data...');

        // 1. Get plan toys (items that represent subscription plans from migrated data)
        const { data: planToys, error: planToysError } = await supabase
          .from('toys')
          .select('id, name, retail_price')
          .or('name.ilike.%Trial Plan%,name.ilike.%6 Month Plan%');

        if (planToysError) throw planToysError;

        console.log(`✅ Found ${planToys?.length || 0} plan toys`);

        if (!planToys || planToys.length === 0) {
          return {
            total_plan_subscribers: 0,
            active_subscribers: 0,
            plan_distribution: {},
            monthly_revenue: 0,
            plan_subscriptions: []
          };
        }

        const planToyIds = planToys.map(toy => toy.id);

        // 2. Get all plan purchases (orders containing plan items)
        const { data: planPurchases, error: planPurchasesError } = await supabase
          .from('order_items')
          .select(`
            toy_id,
            order_id
          `)
          .in('toy_id', planToyIds);

        if (planPurchasesError) throw planPurchasesError;

        // Get orders and users separately to avoid relation issues
        const orderIds = [...new Set(planPurchases?.map(p => p.order_id) || [])];
        
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, user_id, created_at, status, total_amount')
          .in('id', orderIds);

        if (ordersError) throw ordersError;

        const userIds = [...new Set(ordersData?.map(o => o.user_id) || [])];
        
        const { data: usersData, error: usersError } = await supabase
          .from('custom_users')
          .select('id, first_name, last_name, phone, subscription_active')
          .in('id', userIds);

        if (usersError) throw usersError;

        console.log(`✅ Found ${planPurchases?.length || 0} plan purchases`);

        // 3. Process each plan purchase
        const planSubscriptions: PlanSubscription[] = [];
        const processedUsers = new Set(); // Avoid duplicates

        for (const purchase of planPurchases || []) {
          const planToy = planToys.find(toy => toy.id === purchase.toy_id);
          if (!planToy) continue;

          const order = ordersData?.find(o => o.id === purchase.order_id);
          if (!order) continue;

          const user = usersData?.find(u => u.id === order.user_id);
          if (!user) continue;

          const planMapping = PLAN_MAPPING[planToy.name as keyof typeof PLAN_MAPPING];
          
          if (!planMapping) continue;

          const userPlanKey = `${order.user_id}-${planToy.name}`;
          if (processedUsers.has(userPlanKey)) continue;
          processedUsers.add(userPlanKey);

          // Get all orders for this user since plan start
          const { data: userOrders } = await supabase
            .from('orders')
            .select(`
              id,
              status,
              created_at,
              total_amount,
              order_items(quantity)
            `)
            .eq('user_id', order.user_id)
            .gte('created_at', order.created_at)
            .order('created_at', { ascending: true });

          const orders: Order[] = (userOrders || []).map(ord => ({
            id: ord.id,
            status: ord.status,
            created_at: ord.created_at,
            total_amount: ord.total_amount || 0,
            items_count: ord.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
          }));

          // Calculate if plan is still active
          const planStartDate = new Date(order.created_at);
          const planEndDate = new Date(planStartDate);
          planEndDate.setMonth(planEndDate.getMonth() + planMapping.duration_months);
          
          const now = new Date();
          const isExpired = now > planEndDate;
          const isCancelled = !user.subscription_active;
          
          let currentStatus: 'active' | 'expired' | 'cancelled' = 'active';
          if (isCancelled) currentStatus = 'cancelled';
          else if (isExpired) currentStatus = 'expired';

          planSubscriptions.push({
            id: `${order.user_id}-${planToy.id}`,
            user_id: order.user_id,
            plan_name: planToy.name,
            actual_plan_name: planMapping.actual_name,
            plan_start_date: order.created_at,
            plan_order_id: order.id,
            plan_status: order.status,
            price: planMapping.price,
            duration_months: planMapping.duration_months,
            orders_since_plan: orders,
            total_orders: orders.length,
            current_status: currentStatus
          });
        }

        // 4. Calculate analytics
        const planDistribution = planSubscriptions.reduce((acc, sub) => {
          acc[sub.actual_plan_name] = (acc[sub.actual_plan_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const activeSubscribers = planSubscriptions.filter(sub => sub.current_status === 'active').length;
        
        // Calculate monthly revenue based on active subscriptions
        const monthlyRevenue = planSubscriptions
          .filter(sub => sub.current_status === 'active')
          .reduce((sum, sub) => {
            const monthlyAmount = sub.duration_months === 1 ? sub.price : sub.price / sub.duration_months;
            return sum + monthlyAmount;
          }, 0);

        const result: PlanAnalytics = {
          total_plan_subscribers: planSubscriptions.length,
          active_subscribers: activeSubscribers,
          plan_distribution: planDistribution,
          monthly_revenue: Math.round(monthlyRevenue),
          plan_subscriptions: planSubscriptions
        };

        console.log('✅ Plan tracking analysis complete:', result);
        return result;

      } catch (error) {
        console.error('❌ Error in plan tracking:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook to get plan tracking for a specific user
export const useUserPlanTracking = (userId: string) => {
  return useQuery({
    queryKey: ['user-plan-tracking', userId],
    queryFn: async (): Promise<PlanSubscription | null> => {
      if (!userId) return null;

      try {
        console.log('🔍 Fetching plan tracking for user:', userId);

        // Get plan toys (migrated data only)
        const { data: planToys } = await supabase
          .from('toys')
          .select('id, name, retail_price')
          .or('name.ilike.%Trial Plan%,name.ilike.%6 Month Plan%');

        if (!planToys || planToys.length === 0) return null;

        const planToyIds = planToys.map(toy => toy.id);

        // Get user's plan purchases
        const { data: planPurchases } = await supabase
          .from('order_items')
          .select('toy_id, order_id')
          .in('toy_id', planToyIds);

        if (!planPurchases || planPurchases.length === 0) return null;

        // Get orders for this user
        const orderIds = planPurchases.map(p => p.order_id);
        const { data: userOrders } = await supabase
          .from('orders')
          .select('id, user_id, created_at, status, total_amount')
          .in('id', orderIds)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!userOrders || userOrders.length === 0) return null;

        // Get user data
        const { data: userData } = await supabase
          .from('custom_users')
          .select('subscription_active')
          .eq('id', userId)
          .single();

        if (!userData) return null;

        // Find the most recent plan purchase
        const mostRecentOrder = userOrders[0];
        const planPurchase = planPurchases.find(p => p.order_id === mostRecentOrder.id);
        if (!planPurchase) return null;

        const planToy = planToys.find(toy => toy.id === planPurchase.toy_id);
        if (!planToy) return null;

        const planMapping = PLAN_MAPPING[planToy.name as keyof typeof PLAN_MAPPING];
        if (!planMapping) return null;

        // Get all orders since plan start
        const { data: allUserOrders } = await supabase
          .from('orders')
          .select(`
            id,
            status,
            created_at,
            total_amount,
            order_items(quantity)
          `)
          .eq('user_id', userId)
          .gte('created_at', mostRecentOrder.created_at)
          .order('created_at', { ascending: true });

        const orders: Order[] = (allUserOrders || []).map(ord => ({
          id: ord.id,
          status: ord.status,
          created_at: ord.created_at,
          total_amount: ord.total_amount || 0,
          items_count: ord.order_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
        }));

        // Calculate current status
        const planStartDate = new Date(mostRecentOrder.created_at);
        const planEndDate = new Date(planStartDate);
        planEndDate.setMonth(planEndDate.getMonth() + planMapping.duration_months);
        
        const now = new Date();
        const isExpired = now > planEndDate;
        const isCancelled = !userData.subscription_active;
        
        let currentStatus: 'active' | 'expired' | 'cancelled' = 'active';
        if (isCancelled) currentStatus = 'cancelled';
        else if (isExpired) currentStatus = 'expired';

        return {
          id: `${userId}-${planToy.id}`,
          user_id: userId,
          plan_name: planToy.name,
          actual_plan_name: planMapping.actual_name,
          plan_start_date: mostRecentOrder.created_at,
          plan_order_id: mostRecentOrder.id,
          plan_status: mostRecentOrder.status,
          price: planMapping.price,
          duration_months: planMapping.duration_months,
          orders_since_plan: orders,
          total_orders: orders.length,
          current_status: currentStatus
        };

      } catch (error) {
        console.error('❌ Error fetching user plan tracking:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}; 