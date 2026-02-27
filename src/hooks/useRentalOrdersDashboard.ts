import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { isWithinInterval, parseISO, differenceInDays } from 'date-fns';

export interface RentalOrder {
  id: string;
  order_number: string;
  legacy_order_id: string;
  user_id: string;
  cycle_number: number;
  status: string;
  order_type: string;
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
  age_group: string;
}

export interface DashboardData {
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

export const useRentalOrdersDashboard = () => {
  const { user } = useCustomAuth();

  return useQuery<DashboardData>({
    queryKey: ['rental-orders-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!user?.id) throw new Error('No user');

      console.log('🎯 Loading rental orders dashboard for user:', user.id);

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw profileError;
      }

      // Get rental orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('cycle_number', { ascending: false });

      if (ordersError) {
        console.error('❌ Orders error:', ordersError);
        // Return empty state if table doesn't exist
        return {
          userProfile,
          orders: [],
          subscriptionInfo: {
            isActive: userProfile.subscription_active || false,
            plan: userProfile.subscription_plan || 'No Plan',
            totalOrders: 0,
            totalSpent: 0,
            nextPickupDate: null,
          },
          currentOrder: null,
          dataIssues: {
            hasOverlappingCycles: false,
            hasMissingToyData: false,
            hasMultipleCurrentCycles: false,
          },
          cycleInfo: {
            dayInCycle: 1,
            isCurrentCycle: false,
            isSelectionWindow: false,
            progressPercentage: 0,
          }
        };
      }

      const orders = (ordersData as any || []) as RentalOrder[];
      console.log(`📦 Found ${orders.length} rental orders`);
      
      // Analyze current cycles
      const today = new Date();
      const currentCycles = orders.filter(order => {
        try {
          const startDate = parseISO(order.rental_start_date);
          const endDate = parseISO(order.rental_end_date);
          return isWithinInterval(today, { start: startDate, end: endDate });
        } catch (e) {
          console.warn('Date parsing error for order:', order.order_number, e);
          return false;
        }
      });

      // Find the current order (highest cycle number among current cycles, or latest order)
      let currentOrder: RentalOrder | null = null;
      if (currentCycles.length > 0) {
        currentOrder = currentCycles.reduce((latest, order) => 
          order.cycle_number > latest.cycle_number ? order : latest
        );
      } else {
        // If no current cycle, use the most recent order
        currentOrder = orders[0] || null;
      }

      // Check for data issues
      const dataIssues = {
        hasOverlappingCycles: currentCycles.length > 1,
        hasMissingToyData: currentOrder ? (!currentOrder.toys_data || currentOrder.toys_data.length === 0) : false,
        hasMultipleCurrentCycles: currentCycles.length > 1,
      };

      // Calculate cycle information
      let dayInCycle = 1;
      let isCurrentCycle = false;
      if (currentOrder?.rental_start_date) {
        try {
          const startDate = parseISO(currentOrder.rental_start_date);
          const endDate = parseISO(currentOrder.rental_end_date);
          
          if (isWithinInterval(today, { start: startDate, end: endDate })) {
            dayInCycle = Math.max(1, differenceInDays(today, startDate) + 1);
            isCurrentCycle = true;
          } else {
            // If not in current cycle, show as completed or future
            dayInCycle = today > endDate ? 30 : 1;
          }
        } catch (e) {
          console.warn('Date calculation error:', e);
        }
      }

      const progressPercentage = Math.min(100, (dayInCycle / 30) * 100);
      
      // Enhanced selection window logic - Fixed to handle cycle completion
      // Selection window should be open during:
      // 1. Days 24-30 of the cycle (traditional window)  
      // 2. When cycle is complete (100% progress) - for next cycle selection
      const isTraditionalSelectionWindow = isCurrentCycle && dayInCycle >= 24 && dayInCycle <= 30;
      const isCycleCompleteWindow = isCurrentCycle && progressPercentage >= 95;
      const isSelectionWindow = isTraditionalSelectionWindow || isCycleCompleteWindow;

      const cycleInfo = {
        dayInCycle,
        isCurrentCycle,
        isSelectionWindow,
        progressPercentage,
      };

      // Calculate subscription info
      const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      // Calculate next pickup date (rental_end_date + 1 day of current order)
      let nextPickupDate = null;
      if (currentOrder?.rental_end_date) {
        try {
          const endDate = parseISO(currentOrder.rental_end_date);
          const nextPickup = new Date(endDate);
          nextPickup.setDate(nextPickup.getDate() + 1);
          nextPickupDate = nextPickup.toISOString().split('T')[0];
        } catch (e) {
          console.warn('Next pickup date calculation error:', e);
        }
      }

      const subscriptionInfo = {
        isActive: userProfile.subscription_active || currentCycles.length > 0,
        plan: userProfile.subscription_plan || currentOrder?.subscription_plan || 'Standard Plan',
        totalOrders: orders.length,
        totalSpent,
        nextPickupDate,
      };

      // Log warnings for data issues
      if (dataIssues.hasMultipleCurrentCycles) {
        console.warn('⚠️ Multiple overlapping cycles detected:', currentCycles.map(c => `Cycle ${c.cycle_number}`));
      }

      if (dataIssues.hasMissingToyData) {
        console.warn('⚠️ Current order has no toy data:', currentOrder?.order_number);
      }
      
      console.log('✅ Dashboard loaded:', {
        user: userProfile?.first_name,
        orders: orders.length,
        currentCycle: currentOrder?.cycle_number,
        subscription: subscriptionInfo,
        issues: dataIssues,
        cycleInfo
      });

      return {
        userProfile,
        orders,
        subscriptionInfo,
        currentOrder,
        dataIssues,
        cycleInfo
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
  });
};

// Helper hook for getting current cycle stats
export const useCurrentCycleStats = () => {
  const { data: dashboardData } = useRentalOrdersDashboard();
  
  if (!dashboardData) {
    return {
      totalOrders: 0,
      toysAtHome: 0,
      currentCycle: 1,
      dayInCycle: 1,
    };
  }

  const { orders, currentOrder, cycleInfo } = dashboardData;

  return {
    totalOrders: orders.length,
    toysAtHome: currentOrder?.toys_data?.length || 0,
    currentCycle: currentOrder?.cycle_number || 1,
    dayInCycle: cycleInfo.dayInCycle,
  };
}; 