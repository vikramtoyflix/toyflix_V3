import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from './useCustomAuth';

interface UnifiedSubscriptionStatus {
  hasActiveSubscription: boolean;
  currentPlan: string | null;
  subscriptionStatus: 'active' | 'inactive' | 'paused' | 'expired';
  source: 'rental_orders' | 'subscriptions' | 'user_profile' | 'hybrid';
  currentOrder: any | null;
  subscriptionData: any | null;
  userProfile: any | null;
  monthsActive: number;
  confidence: 'high' | 'medium' | 'low';
  debugInfo: {
    rentalOrdersFound: boolean;
    subscriptionsFound: boolean;
    userProfileFlags: boolean;
    conflictDetails?: string;
  };
}

export const useUnifiedSubscriptionStatus = () => {
  const { user } = useCustomAuth();

  return useQuery<UnifiedSubscriptionStatus>({
    queryKey: ['unified-subscription-status', user?.id],
    queryFn: async (): Promise<UnifiedSubscriptionStatus> => {
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      console.log('🔍 Getting unified subscription status for user:', user.id);

      // Step 1: Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        throw profileError;
      }

      // Step 2: Check for rental orders (primary source)
      let rentalOrdersData = [];
      
      if (user?.phone) {
        const phoneVariations = [
          user.phone,
          user.phone.replace(/^\+91/, ''),
          user.phone.replace(/^\+/, ''),
          user.phone.startsWith('+91') ? user.phone.substring(3) : user.phone,
          user.phone.startsWith('91') && user.phone.length === 12 ? user.phone.substring(2) : user.phone
        ];
        
        const uniquePhoneVariations = [...new Set(phoneVariations)];

        for (const phoneVariation of uniquePhoneVariations) {
          const { data, error } = await supabase
            .from('rental_orders' as any)
            .select('*')
            .eq('user_phone', phoneVariation)
            .order('cycle_number', { ascending: false });

          if (!error && data && data.length > 0) {
            rentalOrdersData = data;
            console.log(`✅ Found ${data.length} rental orders for phone: ${phoneVariation}`);
            break;
          }
        }
      }

      // Fallback to user_id if no phone matches
      if (rentalOrdersData.length === 0) {
        const { data: fallbackData } = await supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('cycle_number', { ascending: false });
          
        rentalOrdersData = fallbackData || [];
        console.log(`✅ Found ${rentalOrdersData.length} rental orders for user_id`);
      }

      // Step 3: Check subscriptions table
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      console.log(`📊 Subscriptions table data:`, {
        found: subscriptionsData?.length || 0,
        error: subscriptionsError?.message
      });

      // Step 4: Determine unified status with conflict resolution
      const currentOrder = rentalOrdersData.find(order => 
        order.subscription_status === 'active' || 
        ['pending', 'confirmed', 'shipped', 'delivered'].includes(order.status)
      ) || rentalOrdersData[0];

      const activeSubscription = subscriptionsData?.[0] || null;

      // DECISION LOGIC: Prioritize rental orders as source of truth
      let hasActiveSubscription = false;
      let currentPlan = null;
      let subscriptionStatus: 'active' | 'inactive' | 'paused' | 'expired' = 'inactive';
      let source: 'rental_orders' | 'subscriptions' | 'user_profile' | 'hybrid' = 'user_profile';
      let confidence: 'high' | 'medium' | 'low' = 'low';

      // Primary: Rental Orders (most reliable)
      if (currentOrder && currentOrder.subscription_status === 'active') {
        hasActiveSubscription = true;
        currentPlan = currentOrder.subscription_plan || 'discovery-delight';
        subscriptionStatus = 'active';
        source = 'rental_orders';
        confidence = 'high';
        console.log('✅ Using rental orders as primary source');
      }
      // Secondary: Subscriptions table
      else if (activeSubscription) {
        hasActiveSubscription = true;
        currentPlan = activeSubscription.plan_id;
        subscriptionStatus = activeSubscription.status;
        source = 'subscriptions';
        confidence = 'high';
        console.log('✅ Using subscriptions table as source');
      }
      // Tertiary: User profile flags (fallback)
      else if (userProfile.subscription_active || userProfile.subscription_plan) {
        hasActiveSubscription = true;
        currentPlan = userProfile.subscription_plan || 'discovery-delight';
        subscriptionStatus = 'active';
        source = 'user_profile';
        confidence = 'medium';
        console.log('✅ Using user profile flags as fallback');
      }
      // Hybrid: Check if there's recent activity even without active status
      else if (rentalOrdersData.length > 0) {
        const latestOrder = rentalOrdersData[0];
        const orderDate = new Date(latestOrder.created_at || latestOrder.legacy_created_at);
        const daysSinceLastOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If last order was within 45 days, consider it potentially active
        if (daysSinceLastOrder <= 45) {
          hasActiveSubscription = true;
          currentPlan = latestOrder.subscription_plan || 'discovery-delight';
          subscriptionStatus = 'active';
          source = 'hybrid';
          confidence = 'medium';
          console.log('✅ Using hybrid detection based on recent activity');
        }
      }

      // Calculate months active
      const firstOrder = rentalOrdersData[rentalOrdersData.length - 1];
      const firstOrderDate = firstOrder ? 
        new Date(firstOrder.created_at || firstOrder.legacy_created_at) : 
        new Date(userProfile.created_at);
      const monthsActive = Math.max(1, Math.floor((Date.now() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

      // Conflict detection
      const conflictDetails = [];
      if (currentOrder && !activeSubscription) {
        conflictDetails.push('Rental orders show activity but no subscription record');
      }
      if (activeSubscription && !currentOrder) {
        conflictDetails.push('Subscription record exists but no rental orders');
      }
      if (userProfile.subscription_active && !hasActiveSubscription) {
        conflictDetails.push('User profile shows active but no other evidence');
      }

      const result: UnifiedSubscriptionStatus = {
        hasActiveSubscription,
        currentPlan,
        subscriptionStatus,
        source,
        currentOrder,
        subscriptionData: activeSubscription,
        userProfile,
        monthsActive,
        confidence,
        debugInfo: {
          rentalOrdersFound: rentalOrdersData.length > 0,
          subscriptionsFound: subscriptionsData?.length > 0,
          userProfileFlags: userProfile.subscription_active || !!userProfile.subscription_plan,
          conflictDetails: conflictDetails.length > 0 ? conflictDetails.join('; ') : undefined
        }
      };

      console.log('🎯 Unified subscription status result:', {
        hasActiveSubscription: result.hasActiveSubscription,
        currentPlan: result.currentPlan,
        source: result.source,
        confidence: result.confidence,
        conflicts: result.debugInfo.conflictDetails
      });

      return result;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

