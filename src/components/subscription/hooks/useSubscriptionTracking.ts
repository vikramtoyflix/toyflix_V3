import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';

export interface SubscriptionTracking {
  id: string;
  user_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  plan_id: string;
  status: string;
  subscription_type: string;
  start_date: string;
  end_date: string;
  current_period_start: string;
  current_period_end: string;
  selected_toys: any[];
  age_group: string;
  ride_on_toy_id?: string;
  payment_amount: number;
  payment_currency: string;
  order_items: any;
  shipping_address: any;
  delivery_instructions?: string;
  created_at: string;
  updated_at: string;
  synced_to_main: boolean;
}

export interface EntitlementsTracking {
  id: string;
  user_id: string;
  subscription_tracking_id: string;
  toys_in_possession: boolean;
  current_cycle_toys: any[];
  selection_window_active: boolean;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
  synced_to_main: boolean;
}

// Hook for new subscription tracking
export const useSubscriptionTracking = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['subscription-tracking', user?.id],
    queryFn: async (): Promise<SubscriptionTracking[]> => {
      if (!user?.id) return [];

      console.log('🔄 Fetching subscription tracking for user:', user.id);

      const { data, error } = await supabase
        .from('subscription_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching subscription tracking:', error);
        return [];
      }

      console.log('✅ Subscription tracking data:', data?.length || 0, 'records');
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Hook for entitlements tracking
export const useEntitlementsTracking = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['entitlements-tracking', user?.id],
    queryFn: async (): Promise<EntitlementsTracking[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('entitlements_tracking')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching entitlements tracking:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Combined hook that safely tries both old and new systems
export const useCombinedSubscriptions = () => {
  const { user } = useCustomAuth();
  const { data: trackingData, isLoading: trackingLoading } = useSubscriptionTracking();
  
  // Try to get legacy subscriptions (may fail due to RLS)
  const legacyQuery = useQuery({
    queryKey: ['legacy-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.log('Legacy subscriptions not accessible (expected):', error.message);
          return [];
        }
        return data || [];
      } catch (error) {
        console.log('Legacy subscriptions not accessible (expected)');
        return [];
      }
    },
    enabled: !!user?.id,
    retry: false, // Don't retry on RLS failures
  });

  // Combine both sources, prioritizing new tracking data
  const combinedSubscriptions = [
    // New tracking subscriptions (primary)
    ...(trackingData || []).map(sub => ({
      id: sub.id,
      user_id: sub.user_id,
      plan_id: sub.plan_id,
      status: sub.status,
      subscription_type: sub.subscription_type,
      start_date: sub.start_date,
      end_date: sub.end_date,
      selected_toys: sub.selected_toys,
      age_group: sub.age_group,
      ride_on_toy_id: sub.ride_on_toy_id,
      payment_amount: sub.payment_amount,
      payment_currency: sub.payment_currency,
      created_at: sub.created_at,
      source: 'tracking' as const,
      isActive: sub.status === 'active',
      isRecent: true
    })),
    // Legacy subscriptions (fallback)
    ...(legacyQuery.data || []).map(sub => ({
      id: sub.id,
      user_id: sub.user_id,
      plan_id: sub.plan_id || sub.plan_type,
      status: sub.status,
      subscription_type: sub.subscription_type || 'monthly',
      start_date: sub.start_date,
      end_date: sub.end_date,
      selected_toys: [],
      age_group: sub.age_group,
      ride_on_toy_id: sub.ride_on_toy_id,
      payment_amount: 0,
      payment_currency: 'INR',
      created_at: sub.created_at,
      source: 'legacy' as const,
      isActive: sub.status === 'active',
      isRecent: false
    }))
  ];

  // Remove duplicates, preferring tracking data
  const uniqueSubscriptions = combinedSubscriptions.reduce((acc, current) => {
    const existing = acc.find(sub => 
      sub.plan_id === current.plan_id && 
      sub.user_id === current.user_id &&
      Math.abs(new Date(sub.created_at).getTime() - new Date(current.created_at).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
    );
    
    if (!existing) {
      acc.push(current);
    } else if (current.source === 'tracking' && existing.source === 'legacy') {
      // Replace legacy with tracking data
      const index = acc.findIndex(sub => sub.id === existing.id);
      acc[index] = current;
    }
    
    return acc;
  }, [] as typeof combinedSubscriptions);

  return {
    data: uniqueSubscriptions,
    isLoading: trackingLoading,
    hasActiveSubscription: uniqueSubscriptions.some(sub => sub.isActive),
    hasRecentSubscription: uniqueSubscriptions.some(sub => sub.source === 'tracking'),
    trackingCount: trackingData?.length || 0,
    legacyCount: legacyQuery.data?.length || 0
  };
};
