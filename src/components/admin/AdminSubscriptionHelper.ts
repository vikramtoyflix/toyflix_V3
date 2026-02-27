// ========================================
// ADMIN SUBSCRIPTION PLAN HELPER
// ========================================
// Centralized helper for subscription plan management in admin interfaces
// Ensures consistent display and mapping across all admin components
// ========================================

export interface SubscriptionPlanInfo {
  id: string;
  name: string;
  displayName: string;
  price: number;
  period: string;
  description: string;
  color: string;
  popular?: boolean;
}

// Master subscription plan configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    id: 'Discovery Delight',
    name: 'Discovery Delight',
    displayName: 'Discovery Delight',
    price: 1299,
    period: 'month',
    description: 'Monthly Plan - Perfect for trying new toys',
    color: 'bg-blue-100 text-blue-800',
    popular: false
  },
  {
    id: 'Silver Pack',
    name: 'Silver Pack',
    displayName: 'Silver Pack',
    price: 5999,
    period: '6 months',
    description: '6 months plan - Great value for families',
    color: 'bg-purple-100 text-purple-800',
    popular: true
  },
  {
    id: 'Gold Pack PRO',
    name: 'Gold Pack PRO',
    displayName: 'Gold Pack PRO',
    price: 7999,
    period: '6 months',
    description: '6 months PRO plan - Premium experience',
    color: 'bg-yellow-100 text-yellow-800',
    popular: false
  },
  {
    id: 'Ride-On Monthly',
    name: 'Ride-On Monthly',
    displayName: 'Ride-On Monthly',
    price: 1999,
    period: 'month',
    description: 'Monthly Plan - Large ride-on toys',
    color: 'bg-red-100 text-red-800',
    popular: false
  }
];

// Legacy plan mapping for backward compatibility
export const LEGACY_PLAN_MAPPING: Record<string, string> = {
  'basic': 'Discovery Delight',
  'premium': 'Silver Pack',
  'family': 'Gold Pack PRO',
  'discovery-delight': 'Discovery Delight',
  'silver-pack': 'Silver Pack',
  'gold-pack': 'Gold Pack PRO',
  'gold-pack-pro': 'Gold Pack PRO',
  'ride_on_fixed': 'Ride-On Monthly',
  'ride-on': 'Ride-On Monthly'
};

/**
 * Get subscription plan information by ID or name
 */
export const getSubscriptionPlanInfo = (planId: string | null | undefined): SubscriptionPlanInfo => {
  if (!planId) {
    return SUBSCRIPTION_PLANS[0]; // Default to Discovery Delight
  }

  // Try to find by exact match first
  let plan = SUBSCRIPTION_PLANS.find(p => 
    p.id === planId || 
    p.name === planId || 
    p.displayName === planId
  );

  // If not found, try legacy mapping
  if (!plan && LEGACY_PLAN_MAPPING[planId]) {
    const mappedPlan = LEGACY_PLAN_MAPPING[planId];
    plan = SUBSCRIPTION_PLANS.find(p => p.name === mappedPlan);
  }

  // Return found plan or default
  return plan || SUBSCRIPTION_PLANS[0];
};

/**
 * Get all subscription plans for dropdowns and selects
 */
export const getAllSubscriptionPlans = (): SubscriptionPlanInfo[] => {
  return SUBSCRIPTION_PLANS;
};

/**
 * Format subscription plan for display in admin interfaces
 */
export const formatSubscriptionPlanDisplay = (planId: string | null | undefined): string => {
  const plan = getSubscriptionPlanInfo(planId);
  return `${plan.displayName} - ₹${plan.price.toLocaleString()} (${plan.period})`;
};

/**
 * Get subscription plan color for badges and status indicators
 */
export const getSubscriptionPlanColor = (planId: string | null | undefined): string => {
  const plan = getSubscriptionPlanInfo(planId);
  return plan.color;
};

/**
 * Normalize plan ID to enum value for database storage
 */
export const normalizeSubscriptionPlan = (planInput: string | null | undefined): string => {
  if (!planInput) return 'Discovery Delight';
  
  // Check if it's already a valid enum value
  if (SUBSCRIPTION_PLANS.some(p => p.id === planInput)) {
    return planInput;
  }
  
  // Map legacy values
  if (LEGACY_PLAN_MAPPING[planInput]) {
    return LEGACY_PLAN_MAPPING[planInput];
  }
  
  // Pattern matching for variations
  const input = planInput.toLowerCase();
  if (input.includes('discovery') || input.includes('basic')) {
    return 'Discovery Delight';
  }
  if (input.includes('silver') || input.includes('premium')) {
    return 'Silver Pack';
  }
  if (input.includes('gold') || input.includes('pro') || input.includes('family')) {
    return 'Gold Pack PRO';
  }
  if (input.includes('ride') || input.includes('ride-on')) {
    return 'Ride-On Monthly';
  }
  
  // Default fallback
  return 'Discovery Delight';
};

/**
 * Get subscription plan statistics for admin analytics
 */
export const getSubscriptionPlanStats = (plans: Array<{ subscription_plan: string | null }>) => {
  const stats = SUBSCRIPTION_PLANS.map(plan => ({
    ...plan,
    count: 0,
    percentage: 0
  }));
  
  const total = plans.length;
  
  plans.forEach(item => {
    const normalizedPlan = normalizeSubscriptionPlan(item.subscription_plan);
    const statIndex = stats.findIndex(s => s.name === normalizedPlan);
    if (statIndex !== -1) {
      stats[statIndex].count++;
    }
  });
  
  // Calculate percentages
  stats.forEach(stat => {
    stat.percentage = total > 0 ? Math.round((stat.count / total) * 100) : 0;
  });
  
  return stats;
}; 