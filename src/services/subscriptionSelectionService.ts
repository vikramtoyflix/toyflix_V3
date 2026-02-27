import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays, isWeekend, isAfter, isBefore, startOfDay, endOfDay, format } from 'date-fns';

// Types for subscription selection logic
export interface SubscriptionSelectionWindow {
  isOpen: boolean;
  isOpeningSoon: boolean;
  isClosingSoon: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  opensInDays: number;
  opensInHours: number;
  closesInDays: number;
  closesInHours: number;
  status: 'open' | 'closed' | 'opening_soon' | 'closing_soon';
  reason: string;
  priority: 'normal' | 'urgent' | 'critical';
  allowedActions: string[];
}

export interface SubscriptionSelectionRules {
  userType: 'new' | 'premium' | 'standard' | 'returning' | 'legacy';
  selectionWindowDays: number;
  gracePeriodDays: number;
  earlyAccessDays: number;
  extendedWindowDays: number;
  emergencyOverride: boolean;
  customerServiceOverride: boolean;
  maxToysPerCycle: number;
  canSelectMultipleCycles: boolean;
}

export interface SubscriptionCycleData {
  cycleNumber: number;
  cycleStartDate: Date;
  cycleEndDate: Date;
  daysInCycle: number;
  currentDayInCycle: number;
  progressPercentage: number;
  isCurrentCycle: boolean;
  subscriptionStartDate: Date;
  planId: string;
  planStatus: 'active' | 'paused' | 'cancelled' | 'expired';
  timezone: string;
}

export interface SelectionNotification {
  id: string;
  type: 'opening' | 'closing' | 'reminder' | 'deadline' | 'emergency';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  actionText?: string;
  actionUrl?: string;
  expiresAt: Date;
  createdAt: Date;
}

// Plan configuration mapping
const PLAN_CONFIGS = {
  'Discovery Delight': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriodDays: 3,
    earlyAccessDays: 0,
    maxToysPerCycle: 5,
    extendedWindowDays: 0,
    premiumFeatures: false
  },
  'Silver Pack': {
    cycleDays: 30,
    selectionWindowStart: 22,
    selectionWindowEnd: 30,
    gracePeriodDays: 5,
    earlyAccessDays: 1,
    maxToysPerCycle: 6,
    extendedWindowDays: 2,
    premiumFeatures: true
  },
  'Gold Pack': {
    cycleDays: 30,
    selectionWindowStart: 20,
    selectionWindowEnd: 30,
    gracePeriodDays: 7,
    earlyAccessDays: 2,
    maxToysPerCycle: 8,
    extendedWindowDays: 3,
    premiumFeatures: true
  },
  'Premium': {
    cycleDays: 30,
    selectionWindowStart: 18,
    selectionWindowEnd: 30,
    gracePeriodDays: 10,
    earlyAccessDays: 3,
    maxToysPerCycle: 10,
    extendedWindowDays: 5,
    premiumFeatures: true
  }
};

export class SubscriptionSelectionService {
  private static instance: SubscriptionSelectionService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();

  public static getInstance(): SubscriptionSelectionService {
    if (!SubscriptionSelectionService.instance) {
      SubscriptionSelectionService.instance = new SubscriptionSelectionService();
    }
    return SubscriptionSelectionService.instance;
  }

  /**
   * Get subscription cycle data for a user
   */
  public async getSubscriptionCycleData(userId: string): Promise<SubscriptionCycleData | null> {
    const cacheKey = `cycle_data_${userId}`;
    
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 🔧 NEW: Use unified subscription detection (rental_orders -> subscriptions -> user_profile)
      let subscription = null;
      let subscriptionSource = 'none';

      // STEP 1: Check rental_orders (primary source)
      const { data: userProfile } = await supabase
        .from('custom_users')
        .select('phone')
        .eq('id', userId)
        .single();

      if (userProfile?.phone) {
        const phoneVariations = [
          userProfile.phone,
          userProfile.phone.replace(/^\+91/, ''),
          userProfile.phone.replace(/^\+/, ''),
          userProfile.phone.startsWith('+91') ? userProfile.phone.substring(3) : userProfile.phone,
          userProfile.phone.startsWith('91') && userProfile.phone.length === 12 ? userProfile.phone.substring(2) : userProfile.phone
        ];
        
        const uniquePhoneVariations = [...new Set(phoneVariations)];

        for (const phoneVariation of uniquePhoneVariations) {
          const { data: rentalOrders } = await supabase
            .from('rental_orders' as any)
            .select('*')
            .eq('user_phone', phoneVariation)
            .eq('subscription_status', 'active')
            .order('cycle_number', { ascending: false })
            .limit(1);

          if (rentalOrders && rentalOrders.length > 0) {
            const rentalOrder = rentalOrders[0];
            subscription = {
              id: rentalOrder.subscription_id || rentalOrder.id,
              user_id: userId,
              plan_id: rentalOrder.subscription_plan || 'discovery-delight',
              status: 'active',
              created_at: rentalOrder.created_at || rentalOrder.legacy_created_at,
              start_date: rentalOrder.rental_start_date,
              current_period_start: rentalOrder.rental_start_date,
              current_period_end: rentalOrder.rental_end_date
            };
            subscriptionSource = 'rental_orders';
            console.log('✅ [SelectionService] Found subscription from rental_orders for phone:', phoneVariation);
            break;
          }
        }
      }

      // STEP 2: Fallback to subscriptions table
      if (!subscription) {
        const { data: subscriptionData, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['active', 'paused'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && subscriptionData) {
          subscription = subscriptionData;
          subscriptionSource = 'subscriptions';
          console.log('✅ [SelectionService] Found subscription from subscriptions table');
        }
      }

      // STEP 3: Fallback to user profile
      if (!subscription) {
        const { data: profileData } = await supabase
          .from('custom_users')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileData && (profileData.subscription_active || profileData.subscription_plan)) {
          subscription = {
            id: `profile_${userId}`,
            user_id: userId,
            plan_id: profileData.subscription_plan || 'discovery-delight',
            status: 'active',
            created_at: profileData.created_at,
            start_date: profileData.created_at,
            current_period_start: profileData.created_at,
            current_period_end: new Date(new Date(profileData.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          };
          subscriptionSource = 'user_profile';
          console.log('✅ [SelectionService] Found subscription from user profile');
        }
      }

      if (!subscription) {
        console.log('❌ [SelectionService] No active subscription found for user:', userId, 'from any source');
        return null;
      }

      console.log(`🎯 [SelectionService] Using subscription from ${subscriptionSource} for cycle calculation`);

      const subscriptionStart = new Date(subscription.created_at);
      const today = new Date();
      const totalDaysSubscribed = differenceInDays(today, subscriptionStart);
      const planConfig = PLAN_CONFIGS[subscription.plan_id as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS['Discovery Delight'];
      
      // Calculate current cycle
      const cycleNumber = Math.floor(totalDaysSubscribed / planConfig.cycleDays) + 1;
      const currentDayInCycle = (totalDaysSubscribed % planConfig.cycleDays) + 1;
      const cycleStartDate = addDays(subscriptionStart, (cycleNumber - 1) * planConfig.cycleDays);
      const cycleEndDate = addDays(cycleStartDate, planConfig.cycleDays - 1);
      
      const cycleData: SubscriptionCycleData = {
        cycleNumber,
        cycleStartDate,
        cycleEndDate,
        daysInCycle: planConfig.cycleDays,
        currentDayInCycle,
        progressPercentage: Math.min(100, (currentDayInCycle / planConfig.cycleDays) * 100),
        isCurrentCycle: currentDayInCycle <= planConfig.cycleDays,
        subscriptionStartDate: subscriptionStart,
        planId: subscription.plan_id,
        planStatus: subscription.status,
        timezone: subscription.timezone || 'Asia/Kolkata'
      };

      this.setCache(cacheKey, cycleData, 5); // Cache for 5 minutes
      return cycleData;
    } catch (error) {
      console.error('Error fetching subscription cycle data:', error);
      return null;
    }
  }

  /**
   * Determine user type based on subscription history
   */
  public async getUserType(userId: string): Promise<SubscriptionSelectionRules['userType']> {
    const cacheKey = `user_type_${userId}`;
    
    if (this.isValidCache(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Get user's subscription history
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching subscription history:', error);
        return 'standard';
      }

      // Get user's order history
      const { data: orders, error: ordersError } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (ordersError) {
        console.error('Error fetching order history:', ordersError);
      }

      let userType: SubscriptionSelectionRules['userType'] = 'standard';

      // Determine user type based on history
      if (!subscriptions || subscriptions.length === 0) {
        if (orders && orders.length > 0) {
          userType = 'legacy'; // Has orders but no subscription
        } else {
          userType = 'new'; // Completely new user
        }
      } else {
        const currentSubscription = subscriptions[subscriptions.length - 1];
        const totalSubscriptionDays = subscriptions.reduce((total, sub) => {
          const start = new Date(sub.created_at);
          const end = sub.cancelled_at ? new Date(sub.cancelled_at) : new Date();
          return total + differenceInDays(end, start);
        }, 0);

        if (totalSubscriptionDays < 30) {
          userType = 'new';
        } else if (currentSubscription.plan_id === 'Gold Pack' || currentSubscription.plan_id === 'Premium') {
          userType = 'premium';
        } else if (totalSubscriptionDays > 90) {
          userType = 'returning';
        } else {
          userType = 'standard';
        }
      }

      this.setCache(cacheKey, userType, 60); // Cache for 1 hour
      return userType;
    } catch (error) {
      console.error('Error determining user type:', error);
      return 'standard';
    }
  }

  /**
   * Get selection rules for a user
   */
  public async getSelectionRules(userId: string): Promise<SubscriptionSelectionRules> {
    const cycleData = await this.getSubscriptionCycleData(userId);
    const userType = await this.getUserType(userId);
    
    if (!cycleData) {
      // Default rules for users without subscription
      return {
        userType: 'legacy',
        selectionWindowDays: 7,
        gracePeriodDays: 3,
        earlyAccessDays: 0,
        extendedWindowDays: 0,
        emergencyOverride: false,
        customerServiceOverride: true,
        maxToysPerCycle: 5,
        canSelectMultipleCycles: false
      };
    }

    const planConfig = PLAN_CONFIGS[cycleData.planId as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS['Discovery Delight'];
    
    // Check for emergency overrides (customer service flags)
    const emergencyOverride = await this.checkEmergencyOverride(userId);
    const customerServiceOverride = await this.checkCustomerServiceOverride(userId);

    return {
      userType,
      selectionWindowDays: planConfig.selectionWindowEnd - planConfig.selectionWindowStart + 1,
      gracePeriodDays: planConfig.gracePeriodDays,
      earlyAccessDays: planConfig.earlyAccessDays,
      extendedWindowDays: planConfig.extendedWindowDays,
      emergencyOverride,
      customerServiceOverride,
      maxToysPerCycle: planConfig.maxToysPerCycle,
      canSelectMultipleCycles: planConfig.premiumFeatures
    };
  }

  /**
   * Calculate selection window with timezone and weekend adjustments
   * 🔒 UPDATED: Check database status for +91 users (WooCommerce users)
   */
  public async calculateSelectionWindow(userId: string): Promise<SubscriptionSelectionWindow> {
    const cycleData = await this.getSubscriptionCycleData(userId);
    const rules = await this.getSelectionRules(userId);
    
    // 🔒 ENHANCED: Check database status for selection window closure
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Check rental_orders table for actual selection window status
    const { data: rentalOrders } = await supabase
      .from('rental_orders')
      .select('selection_window_status, manual_selection_control, selection_window_closed_at')
      .eq('user_id', userId)
      .eq('subscription_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const latestOrder = rentalOrders?.[0];
    if (latestOrder) {
      const isDatabaseClosed = latestOrder.selection_window_status === 'manual_closed' || 
                              latestOrder.selection_window_status === 'force_closed' ||
                              latestOrder.selection_window_status === 'auto_closed';
      
      // 🔒 CRITICAL: Also check if there's a recent queue order that should close the window
      const { data: recentQueueOrders } = await supabase
        .from('queue_orders')
        .select('id, created_at, status')
        .eq('user_id', userId)
        .in('status', ['processing', 'confirmed', 'preparing', 'shipped', 'delivered'])
        .order('created_at', { ascending: false })
        .limit(1);
      
      const hasRecentQueueOrder = recentQueueOrders && recentQueueOrders.length > 0;
      
      if (isDatabaseClosed || hasRecentQueueOrder) {
        // Database says window is closed OR there's a recent queue order - override timing logic
        const reason = hasRecentQueueOrder 
          ? 'Selection window closed after placing queue order'
          : 'Selection window closed after order placement';
          
        return {
          isOpen: false,
          isOpeningSoon: false,
          isClosingSoon: false,
          opensAt: null,
          closesAt: null,
          opensInDays: 0,
          opensInHours: 0,
          closesInDays: 0,
          closesInHours: 0,
          status: 'closed',
          reason: reason,
          priority: 'normal',
          allowedActions: ['contact_support']
        };
      }
    }
    
    if (!cycleData) {
      return {
        isOpen: false,
        isOpeningSoon: false,
        isClosingSoon: false,
        opensAt: null,
        closesAt: null,
        opensInDays: 0,
        opensInHours: 0,
        closesInDays: 0,
        closesInHours: 0,
        status: 'closed',
        reason: 'No active subscription found',
        priority: 'normal',
        allowedActions: []
      };
    }

    const planConfig = PLAN_CONFIGS[cycleData.planId as keyof typeof PLAN_CONFIGS] || PLAN_CONFIGS['Discovery Delight'];
    const today = new Date();
    
    // Calculate selection window dates with early access
    const baseSelectionStart = addDays(cycleData.cycleStartDate, planConfig.selectionWindowStart - 1);
    const selectionStart = addDays(baseSelectionStart, -rules.earlyAccessDays);
    const baseSelectionEnd = addDays(cycleData.cycleStartDate, planConfig.selectionWindowEnd - 1);
    const selectionEnd = addDays(baseSelectionEnd, rules.extendedWindowDays);
    
    // Adjust for weekends (extend if ends on weekend)
    let adjustedSelectionEnd = selectionEnd;
    if (isWeekend(selectionEnd)) {
      adjustedSelectionEnd = addDays(selectionEnd, 2);
    }

    // Add grace period
    const gracePeriodEnd = addDays(adjustedSelectionEnd, rules.gracePeriodDays);
    
    // Check current status
    const now = new Date();
    const isInWindow = isAfter(now, selectionStart) && isBefore(now, adjustedSelectionEnd);
    const isInGracePeriod = isAfter(now, adjustedSelectionEnd) && isBefore(now, gracePeriodEnd);
    const isOpen = isInWindow || isInGracePeriod || rules.emergencyOverride || rules.customerServiceOverride;
    
    // Calculate time differences
    const opensInDays = isAfter(selectionStart, now) ? differenceInDays(selectionStart, now) : 0;
    const opensInHours = isAfter(selectionStart, now) ? Math.ceil((selectionStart.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
    const closesInDays = isAfter(gracePeriodEnd, now) ? differenceInDays(gracePeriodEnd, now) : 0;
    const closesInHours = isAfter(gracePeriodEnd, now) ? Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
    
    // Determine status and priority
    let status: SubscriptionSelectionWindow['status'] = 'closed';
    let priority: SubscriptionSelectionWindow['priority'] = 'normal';
    let reason = '';
    
    if (rules.emergencyOverride) {
      status = 'open';
      priority = 'critical';
      reason = 'Emergency override active';
    } else if (rules.customerServiceOverride) {
      status = 'open';
      priority = 'urgent';
      reason = 'Customer service override active';
    } else if (isInWindow) {
      status = 'open';
      priority = closesInDays <= 1 ? 'urgent' : 'normal';
      reason = `Selection window is open (Day ${cycleData.currentDayInCycle} of ${cycleData.daysInCycle})`;
    } else if (isInGracePeriod) {
      status = 'open';
      priority = 'critical';
      reason = `Grace period active (${closesInDays} days remaining)`;
    } else if (opensInDays <= 3) {
      status = 'opening_soon';
      priority = 'medium';
      reason = `Selection window opens in ${opensInDays} days`;
    } else if (closesInDays <= 1 && isOpen) {
      status = 'closing_soon';
      priority = 'critical';
      reason = `Selection window closes in ${closesInHours} hours`;
    } else {
      status = 'closed';
      reason = opensInDays > 0 ? `Selection window opens in ${opensInDays} days` : 'Selection window closed';
    }

    // Determine allowed actions
    const allowedActions = [];
    if (isOpen) {
      allowedActions.push('select_toys', 'modify_selection');
      if (rules.canSelectMultipleCycles) {
        allowedActions.push('select_future_cycles');
      }
    }
    if (rules.customerServiceOverride) {
      allowedActions.push('contact_support');
    }

    return {
      isOpen,
      isOpeningSoon: status === 'opening_soon',
      isClosingSoon: status === 'closing_soon',
      opensAt: opensInDays > 0 ? selectionStart : null,
      closesAt: isOpen ? gracePeriodEnd : null,
      opensInDays,
      opensInHours,
      closesInDays,
      closesInHours,
      status,
      reason,
      priority,
      allowedActions
    };
  }

  /**
   * Generate selection window notifications
   */
  public async generateSelectionNotifications(userId: string): Promise<SelectionNotification[]> {
    const window = await this.calculateSelectionWindow(userId);
    const notifications: SelectionNotification[] = [];
    const now = new Date();

    if (window.isOpeningSoon && window.opensInDays <= 3) {
      notifications.push({
        id: `opening_${userId}_${Date.now()}`,
        type: 'opening',
        title: 'Selection Window Opening Soon',
        message: `Your toy selection window opens in ${window.opensInDays} days. Get ready to choose your next toys!`,
        priority: 'medium',
        actionRequired: false,
        expiresAt: window.opensAt || addDays(now, 1),
        createdAt: now
      });
    }

    if (window.isOpen && window.closesInDays <= 1) {
      notifications.push({
        id: `closing_${userId}_${Date.now()}`,
        type: 'deadline',
        title: 'Selection Deadline Approaching',
        message: `Your toy selection window closes in ${window.closesInHours} hours. Select your toys now!`,
        priority: 'critical',
        actionRequired: true,
        actionText: 'Select Toys Now',
        actionUrl: '/toys',
        expiresAt: window.closesAt || addDays(now, 1),
        createdAt: now
      });
    }

    if (window.isOpen && window.priority === 'critical' && window.reason.includes('Grace period')) {
      notifications.push({
        id: `grace_${userId}_${Date.now()}`,
        type: 'emergency',
        title: 'Grace Period Active',
        message: `You're in the grace period for toy selection. ${window.reason}`,
        priority: 'critical',
        actionRequired: true,
        actionText: 'Select Toys Urgently',
        actionUrl: '/toys',
        expiresAt: window.closesAt || addDays(now, 1),
        createdAt: now
      });
    }

    return notifications;
  }

  /**
   * Handle edge cases for selection availability
   */
  public async handleEdgeCases(userId: string, scenario: string): Promise<SubscriptionSelectionWindow> {
    const baseWindow = await this.calculateSelectionWindow(userId);
    
    switch (scenario) {
      case 'late_selection':
        // Allow late selection with reduced options
        return {
          ...baseWindow,
          isOpen: true,
          status: 'open',
          reason: 'Late selection allowed with limited options',
          priority: 'urgent',
          allowedActions: ['select_toys', 'contact_support']
        };
        
      case 'emergency_change':
        // Emergency change after deadline
        return {
          ...baseWindow,
          isOpen: true,
          status: 'open',
          reason: 'Emergency change request approved',
          priority: 'critical',
          allowedActions: ['modify_selection', 'contact_support']
        };
        
      case 'customer_service_override':
        // Customer service manual override
        return {
          ...baseWindow,
          isOpen: true,
          status: 'open',
          reason: 'Customer service override active',
          priority: 'urgent',
          allowedActions: ['select_toys', 'modify_selection', 'select_future_cycles']
        };
        
      case 'plan_change':
        // Handle mid-cycle plan changes
        return {
          ...baseWindow,
          isOpen: true,
          status: 'open',
          reason: 'Plan change - extended selection window',
          priority: 'medium',
          allowedActions: ['select_toys', 'modify_selection']
        };
        
      default:
        return baseWindow;
    }
  }

  /**
   * Check for emergency override flags
   */
  private async checkEmergencyOverride(userId: string): Promise<boolean> {
    try {
      // TODO: Implement user_flags table - for now return false to prevent 404 errors
      return false;
    } catch (error) {
      console.error('Error checking emergency override:', error);
      return false;
    }
  }

  /**
   * Check for customer service override flags
   */
  private async checkCustomerServiceOverride(userId: string): Promise<boolean> {
    try {
      // TODO: Implement user_flags table - for now return false to prevent 404 errors
      return false;
    } catch (error) {
      console.error('Error checking customer service override:', error);
      return false;
    }
  }

  /**
   * Cache management utilities
   */
  private setCache(key: string, value: any, minutes: number): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, addDays(new Date(), minutes / (60 * 24)));
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || isAfter(new Date(), expiry)) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export default SubscriptionSelectionService; 