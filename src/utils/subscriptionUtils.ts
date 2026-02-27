import { supabase } from '@/integrations/supabase/client';

export interface UserSubscriptionPlan {
  planId: string;
  planName: string;
  planType: 'discovery' | 'silver' | 'gold';
  isActive: boolean;
  isFreeQueueUpdates: boolean;
  subscriptionId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface QueuePricingInfo {
  isFree: boolean;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  couponCode?: string;
  couponDiscount: number;
  planType: 'discovery' | 'silver' | 'gold';
  planName: string;
  message: string;
  bannerType: 'success' | 'info' | 'warning';
}

/**
 * Map plan IDs to readable names and types
 */
const PLAN_MAPPINGS: Record<string, { name: string; type: 'discovery' | 'silver' | 'gold' }> = {
  'discovery-delight': { name: 'Discovery Delight', type: 'discovery' },
  'silver-pack': { name: 'Silver Pack', type: 'silver' },
  'gold-pack': { name: 'Gold Pack PRO', type: 'gold' },
  // Legacy mappings
  'basic': { name: 'Discovery Delight', type: 'discovery' },
  'premium': { name: 'Silver Pack', type: 'silver' },
  'family': { name: 'Gold Pack PRO', type: 'gold' },
};

/**
 * Get user's current subscription plan from active subscription
 */
export async function getUserSubscriptionPlan(userId: string): Promise<UserSubscriptionPlan | null> {
  try {
    console.log('🔍 Getting subscription plan for user:', userId);

    // Get active subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id, plan_id, status, current_period_start, current_period_end, created_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn('No active subscription found for user:', userId, error.message);
      return null;
    }

    if (!subscription) {
      console.warn('No subscription data found for user:', userId);
      return null;
    }

    const planMapping = PLAN_MAPPINGS[subscription.plan_id];
    if (!planMapping) {
      console.warn('Unknown plan ID:', subscription.plan_id);
      return null;
    }

    const result: UserSubscriptionPlan = {
      planId: subscription.plan_id,
      planName: planMapping.name,
      planType: planMapping.type,
      isActive: subscription.status === 'active',
      isFreeQueueUpdates: planMapping.type === 'silver' || planMapping.type === 'gold',
      subscriptionId: subscription.id,
      status: subscription.status,
      startDate: subscription.current_period_start,
      endDate: subscription.current_period_end
    };

    console.log('✅ Found subscription plan:', {
      planName: result.planName,
      planType: result.planType,
      isFreeQueueUpdates: result.isFreeQueueUpdates
    });

    return result;

  } catch (error: any) {
    console.error('❌ Error getting subscription plan:', error);
    return null;
  }
}

/**
 * Calculate pricing for toy changes based on subscription plan
 */
export function calculateQueuePricing(
  subscriptionPlan: UserSubscriptionPlan | null,
  baseOrderAmount: number = 0
): QueuePricingInfo {
  // Default pricing for users without subscription
  if (!subscriptionPlan) {
    const gstAmount = baseOrderAmount * 0.18; // 18% GST
    const totalAmount = baseOrderAmount + gstAmount;
    
    return {
      isFree: false,
      baseAmount: baseOrderAmount,
      gstAmount: gstAmount,
      totalAmount: totalAmount,
      couponDiscount: 0,
      planType: 'discovery',
      planName: 'No Subscription',
      message: 'Toy changes require payment without an active subscription.',
      bannerType: 'warning'
    };
  }

  // Free toy changes for Silver and Gold plans
  if (subscriptionPlan.isFreeQueueUpdates) {
    return {
      isFree: true,
      baseAmount: 0,
      gstAmount: 0,
      totalAmount: 0,
      couponCode: 'QUEUE_BYPASS',
      couponDiscount: baseOrderAmount,
      planType: subscriptionPlan.planType,
      planName: subscriptionPlan.planName,
      message: `Change toys anytime with your ${subscriptionPlan.planName} subscription! 🎉`,
      bannerType: 'success'
    };
  }

  // Discovery Delight users need to pay
  const gstAmount = baseOrderAmount * 0.18; // 18% GST
  const totalAmount = baseOrderAmount + gstAmount;
  
  return {
    isFree: false,
    baseAmount: baseOrderAmount,
    gstAmount: gstAmount,
    totalAmount: totalAmount,
    couponDiscount: 0,
    planType: subscriptionPlan.planType,
    planName: subscriptionPlan.planName,
    message: `Toy changes require payment with ${subscriptionPlan.planName}. Consider upgrading to Silver or Gold for free toy changes!`,
    bannerType: 'info'
  };
}

/**
 * Get queue pricing information for a user
 */
export async function getUserQueuePricing(
  userId: string,
  baseOrderAmount: number = 199 // Default amount for toy changes
): Promise<QueuePricingInfo> {
  try {
    const subscriptionPlan = await getUserSubscriptionPlan(userId);
    return calculateQueuePricing(subscriptionPlan, baseOrderAmount);
  } catch (error) {
    console.error('Error getting queue pricing:', error);
    // Return default pricing on error
    return calculateQueuePricing(null, baseOrderAmount);
  }
}

/**
 * Check if user has premium subscription (Silver or Gold)
 */
export async function userHasPremiumSubscription(userId: string): Promise<boolean> {
  try {
    const subscriptionPlan = await getUserSubscriptionPlan(userId);
    return subscriptionPlan?.isFreeQueueUpdates || false;
  } catch (error) {
    console.error('Error checking premium subscription:', error);
    return false;
  }
}

/**
 * Get subscription plan display information
 */
export function getSubscriptionPlanDisplay(planType: 'discovery' | 'silver' | 'gold') {
  const planInfo = {
    discovery: {
      name: 'Discovery Delight',
      color: 'bg-blue-100 text-blue-800',
      icon: '🔍',
      description: 'Perfect for exploring new toys'
    },
    silver: {
      name: 'Silver Pack',
      color: 'bg-gray-100 text-gray-800',
      icon: '🥈',
      description: 'Premium plan with free toy changes'
    },
    gold: {
      name: 'Gold Pack PRO',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '🥇',
      description: 'Ultimate plan with all premium features'
    }
  };

  return planInfo[planType];
}

/**
 * Format subscription plan for display
 */
export function formatSubscriptionPlan(subscriptionPlan: UserSubscriptionPlan): string {
  const status = subscriptionPlan.isActive ? 'Active' : 'Inactive';
  return `${subscriptionPlan.planName} (${status})`;
}

/**
 * Get subscription plan display name from plan ID
 */
export function getSubscriptionPlanName(planId: string): string | null {
  if (!planId) return null;
  
  const planMapping = PLAN_MAPPINGS[planId];
  return planMapping ? planMapping.name : null;
}

/**
 * Get upgrade suggestions for Discovery Delight users
 */
export function getUpgradeSuggestion(currentPlan: 'discovery' | 'silver' | 'gold') {
  if (currentPlan === 'discovery') {
    return {
      message: 'Upgrade to Silver Pack or Gold Pack PRO for free toy changes!',
      benefits: [
        'Change toys anytime for free',
        'Priority customer support',
        'Extended toy library access',
        'No additional charges for changes'
      ],
      upgradeUrl: '/subscription/upgrade'
    };
  }
  
  return null;
} 