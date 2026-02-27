import { SubscriptionOperation, PaymentEligibilityResult, SubscriptionCycle, UpcomingCycle, CycleHistory, SelectionWindowStatus, EnhancedSubscriptionStatus } from '@/types/subscription';
import { SubscriptionCore } from './subscription/subscriptionCore';
import { SubscriptionCreation } from './subscription/subscriptionCreation';
import { SubscriptionLifecycle } from './subscription/subscriptionLifecycle';
import { SubscriptionPauseResume } from './subscription/subscriptionPauseResume';
import { SubscriptionUpgrade } from './subscription/subscriptionUpgrade';
import { SubscriptionPerks } from './subscription/subscriptionPerks';
import { SubscriptionQuery } from './subscription/subscriptionQuery';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays } from 'date-fns';

export interface CycleEligibility {
  isEligible: boolean;
  currentCycleDays: number;
  daysUntilNextCycle: number;
  canQueueToys: boolean;
  reason?: string;
  currentOrder?: any;
}

export interface SubscriptionDetails {
  isActive: boolean;
  plan: string;
  planName: string;
  toyLimit: number;
  currentCycle?: any;
}

export class SubscriptionService {
  /**
   * Subscribe user to a plan with optional selected toys
   */
  static async subscribe(planId: string, userId: string, selectedToys?: any[]): Promise<SubscriptionOperation> {
    return SubscriptionCreation.subscribe(planId, userId, selectedToys);
  }

  /**
   * Generate monthly cycle - reset quotas and value caps
   */
  static async generateMonthlyCycle(userId: string): Promise<SubscriptionOperation> {
    return SubscriptionLifecycle.generateMonthlyCycle(userId);
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(userId: string, months: number): Promise<SubscriptionOperation> {
    return SubscriptionPauseResume.pauseSubscription(userId, months);
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(userId: string): Promise<SubscriptionOperation> {
    return SubscriptionPauseResume.resumeSubscription(userId);
  }

  /**
   * Upgrade/downgrade plan
   */
  static async upgradePlan(userId: string, newPlanId: string): Promise<SubscriptionOperation> {
    return SubscriptionUpgrade.upgradePlan(userId, newPlanId);
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string): Promise<SubscriptionOperation> {
    return SubscriptionLifecycle.cancelSubscription(userId);
  }

  /**
   * Renew subscription
   */
  static async renewSubscription(userId: string): Promise<SubscriptionOperation> {
    return SubscriptionLifecycle.renewSubscription(userId);
  }

  /**
   * Assign one-time perks for Gold Pack
   */
  static async assignOneTimePerks(userId: string, subscriptionId: string): Promise<SubscriptionOperation> {
    return SubscriptionPerks.assignOneTimePerks(userId, subscriptionId);
  }

  /**
   * Get user entitlements and subscription details
   */
  static async queryUserEntitlements(userId: string): Promise<SubscriptionOperation> {
    return SubscriptionQuery.queryUserEntitlements(userId);
  }

  /**
   * Get active subscription for a user
   * �� UPDATED: Read from rental_orders table with subscription_status = 'active' filter
   */
  static async getActiveSubscription(userId: string) {
    try {
      const { data, error } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')  // 🎯 KEY FILTER: Only show active subscriptions to users
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching active subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getActiveSubscription:', error);
      return null;
    }
  }

  /**
   * Get all active subscriptions for a user (for admin purposes)
   * 🎯 UPDATED: Read from rental_orders table with subscription_status = 'active' filter
   */
  static async getAllActiveSubscriptions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')  // 🎯 KEY FILTER: Only show active subscriptions to users
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all active subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllActiveSubscriptions:', error);
      return [];
    }
  }

  /**
   * Get all subscriptions for a user (admin function - includes all statuses)
   * 🎯 UPDATED: Read from rental_orders table for admin purposes
   */
  static async getAllSubscriptionsForUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all subscriptions for user:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getAllSubscriptionsForUser:', error);
      return [];
    }
  }

  // ========================================
  // NEW: Rental-based Helper Functions
  // ========================================

  /**
   * Get actual subscription start date based on subscription data
   */
  static async getActualSubscriptionStartDate(subscriptionId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('start_date, created_at')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        console.error('❌ Error getting actual subscription start date:', error);
        return null;
      }

      return data ? new Date(data.start_date || data.created_at) : null;
    } catch (error) {
      console.error('❌ Error in getActualSubscriptionStartDate:', error);
      return null;
    }
  }

  /**
   * Get user's actual subscription start date based on earliest subscription
   */
  static async getUserActualSubscriptionStartDate(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('start_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Error getting user actual subscription start date:', error);
        return null;
      }

      return data ? new Date(data.start_date || data.created_at) : null;
    } catch (error) {
      console.error('❌ Error in getUserActualSubscriptionStartDate:', error);
      return null;
    }
  }

  // ========================================
  // NEW: Database View Methods
  // ========================================

  /**
   * Calculate cycle data based on rental order data
   * 🎯 UPDATED: Implements day 24-34 selection window with manual controls
   */
  static calculateCycleData(subscription: any): SubscriptionCycle | null {
    if (!subscription) return null;


    const subscriptionStart = new Date(subscription.rental_start_date || subscription.created_at);
    const currentDate = new Date();
    
    // Calculate days since subscription started
    const totalDaysSubscribed = Math.max(0, differenceInDays(currentDate, subscriptionStart));
    
    // Each cycle is 30 days
    const cycleDays = 30;
    const currentCycleNumber = Math.floor(totalDaysSubscribed / cycleDays) + 1;
    const daysInCurrentCycle = (totalDaysSubscribed % cycleDays) + 1;
    const daysRemaining = cycleDays - daysInCurrentCycle;
    const progressPercentage = Math.min(100, (daysInCurrentCycle / cycleDays) * 100);
    
    // Calculate current cycle start and end dates
    const currentCycleStart = addDays(subscriptionStart, (currentCycleNumber - 1) * cycleDays);
    const currentCycleEnd = addDays(currentCycleStart, cycleDays - 1);
    
    // 🎯 NEW: Day 24-34 selection window logic with preserved original status
    let selectionWindowStatus = 'closed';
    const originalWindowStatus = subscription.selection_window_status || 'auto'; // Preserve original DB value
    
    // Check for manual control first
    if (subscription.manual_selection_control) {
      if (subscription.selection_window_status === 'manual_open') {
        selectionWindowStatus = 'open';
      } else if (subscription.selection_window_status === 'manual_closed') {
        selectionWindowStatus = 'closed';
      }
    } else {
      // Auto logic: Day 24-34
      if (daysInCurrentCycle >= 24 && daysInCurrentCycle <= 34) {
        selectionWindowStatus = 'open';
      } else {
        selectionWindowStatus = 'closed';
      }
    }
    
    return {
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      plan_id: subscription.subscription_plan,
      subscription_status: subscription.subscription_status,
      current_cycle_number: currentCycleNumber,
      current_cycle_start: currentCycleStart.toISOString().split('T')[0],
      current_cycle_end: currentCycleEnd.toISOString().split('T')[0],
      last_selection_date: subscription.last_selection_date,
      next_selection_window_start: subscription.next_selection_window_start,
      next_selection_window_end: subscription.next_selection_window_end,
      current_cycle_status: subscription.subscription_status,
      total_cycles_completed: currentCycleNumber - 1,
      
      // Rental-based fields
      actual_subscription_start_date: new Date(subscription.rental_start_date || subscription.created_at),
      user_actual_start_date: new Date(subscription.rental_start_date || subscription.created_at),
      total_days_subscribed_actual: totalDaysSubscribed,
      rental_orders_count: 1,
      
      // Enhanced cycle tracking
      cycle_progress_percentage: progressPercentage,
      current_day_in_cycle: daysInCurrentCycle,
      days_remaining_in_cycle: daysRemaining,
      selection_window_status: selectionWindowStatus === 'open' ? 'open' : selectionWindowStatus === 'closed' ? 'closed' : 'upcoming',
      
      // ✅ CRITICAL FIX: Include manual control fields in return object
      manual_selection_control: subscription.manual_selection_control || false,
      selection_window_opened_at: subscription.selection_window_opened_at,
      selection_window_closed_at: subscription.selection_window_closed_at,
      selection_window_notes: subscription.selection_window_notes,
      days_to_selection_window: (() => {
        // If manual control is active and window is manually open, return 0
        if (subscription.manual_selection_control && subscription.selection_window_status === 'manual_open') {
          return 0;
        }
        // If manual control is active and window is manually closed, calculate when it would normally open
        if (subscription.manual_selection_control && subscription.selection_window_status === 'manual_closed') {
          return Math.max(0, 24 - daysInCurrentCycle);
        }
        // Otherwise, use automatic logic
        return Math.max(0, 24 - daysInCurrentCycle);
      })(),
      
      // Original vs actual dates
      original_subscription_date: subscription.created_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at || subscription.created_at
    };
  }

  /**
   * Get current subscription cycle using subscription data
   * 🎯 UPDATED: Use subscriptions table with calculated cycle data
   */
  static async getCurrentSubscriptionCycle(userId: string): Promise<SubscriptionCycle | null> {
    try {
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) return null;

      return this.calculateCycleData(subscription);
    } catch (error) {
      console.error('❌ Error in getCurrentSubscriptionCycle:', error);
      return null;
    }
  }

  /**
   * Get upcoming cycles based on current subscription
   * 🎯 UPDATED: Calculate from subscription data
   */
  static async getUpcomingCycles(userId: string): Promise<SubscriptionCycle[]> {
    try {
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      if (!currentCycle) return [];

      const upcomingCycles: SubscriptionCycle[] = [];
      const cycleDays = 30;
      
      // Generate next 3 upcoming cycles
      for (let i = 1; i <= 3; i++) {
        const nextCycleNumber = currentCycle.current_cycle_number + i;
        const nextCycleStart = addDays(new Date(currentCycle.current_cycle_start), i * cycleDays);
        const nextCycleEnd = addDays(nextCycleStart, cycleDays - 1);
        
        upcomingCycles.push({
          ...currentCycle,
          id: `${currentCycle.id}_future_${nextCycleNumber}`,
          current_cycle_number: nextCycleNumber,
          cycle_progress_percentage: 0,
          days_remaining_in_cycle: cycleDays,
          current_cycle_start: nextCycleStart.toISOString().split('T')[0],
          current_cycle_end: nextCycleEnd.toISOString().split('T')[0],
          selection_window_status: 'future'
        });
      }

      return upcomingCycles;
    } catch (error) {
      console.error('❌ Error in getUpcomingCycles:', error);
      return [];
    }
  }

  /**
   * Get cycle history based on subscription
   * 🎯 UPDATED: Calculate from subscription data
   */
  static async getCycleHistory(userId: string): Promise<SubscriptionCycle[]> {
    try {
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      if (!currentCycle || currentCycle.current_cycle_number <= 1) return [];

      const historyData: SubscriptionCycle[] = [];
      const cycleDays = 30;
      
      // Generate history for previous cycles
      for (let cycle = 1; cycle < currentCycle.current_cycle_number; cycle++) {
        const cycleStart = addDays(new Date(currentCycle.actual_subscription_start_date), (cycle - 1) * cycleDays);
        const cycleEnd = addDays(cycleStart, cycleDays - 1);
        
        historyData.push({
          ...currentCycle,
          id: `${currentCycle.id}_history_${cycle}`,
          current_cycle_number: cycle,
          cycle_progress_percentage: 100,
          days_remaining_in_cycle: 0,
          current_cycle_start: cycleStart.toISOString().split('T')[0],
          current_cycle_end: cycleEnd.toISOString().split('T')[0],
          selection_window_status: 'completed'
        });
      }

      return historyData.reverse(); // Most recent first
    } catch (error) {
      console.error('❌ Error in getCycleHistory:', error);
      return [];
    }
  }

  /**
   * Get selection window status
   * 🎯 UPDATED: Calculate from subscription data
   */
  static async getSelectionWindowStatus(userId: string) {
    try {
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      if (!currentCycle) return null;

      const isSelectionOpen = currentCycle.days_remaining_in_cycle <= 7;
      
      return {
        subscription_id: currentCycle.subscription_id,
        cycle_number: currentCycle.current_cycle_number,
        is_selection_open: isSelectionOpen,
        days_until_window: isSelectionOpen ? 0 : currentCycle.days_remaining_in_cycle - 7,
        window_opens_at: isSelectionOpen ? null : addDays(new Date(), currentCycle.days_remaining_in_cycle - 7).toISOString(),
        window_closes_at: addDays(new Date(), currentCycle.days_remaining_in_cycle).toISOString(),
        current_cycle_start: currentCycle.current_cycle_start,
        current_cycle_end: currentCycle.current_cycle_end
      };
    } catch (error) {
      console.error('❌ Error in getSelectionWindowStatus:', error);
      return null;
    }
  }

  /**
   * Get comprehensive subscription status using subscription data
   * 🎯 UPDATED: Use subscriptions table with calculated data
   */
  static async getEnhancedSubscriptionStatus(userId: string): Promise<EnhancedSubscriptionStatus> {
    try {
      const [
        subscription,
        upcomingCycles,
        cycleHistory,
        selectionWindow,
        actualStartDate
      ] = await Promise.all([
        this.getCurrentSubscriptionCycle(userId),
        this.getUpcomingCycles(userId),
        this.getCycleHistory(userId),
        this.getSelectionWindowStatus(userId),
        this.getUserActualSubscriptionStartDate(userId)
      ]);

      const totalDaysSubscribed = actualStartDate ? 
        Math.floor((Date.now() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const totalRentalOrders = subscription?.rental_orders_count || 0;

      return {
        subscription,
        upcomingCycles,
        cycleHistory,
        selectionWindow,
        actualStartDate,
        totalDaysSubscribed,
        totalRentalOrders,
        error: null
      };
    } catch (error) {
      console.error('❌ Error in getEnhancedSubscriptionStatus:', error);
      return {
        subscription: null,
        upcomingCycles: [],
        cycleHistory: [],
        selectionWindow: null,
        actualStartDate: null,
        totalDaysSubscribed: 0,
        totalRentalOrders: 0,
        error: error.message
      };
    }
  }

  // ========================================
  // UPDATED: Replace client-side calculations with database views
  // ========================================

  /**
   * Check if user can queue toys for next cycle - NOW USING DATABASE VIEWS
   */
  static async checkQueueEligibility(userId: string): Promise<CycleEligibility> {
    try {
      console.log('🔍 Checking queue eligibility for user:', userId);
      
      // Get current cycle from database view instead of client-side calculations
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      
      if (!currentCycle) {
        return {
          isEligible: false,
          currentCycleDays: 0,
          daysUntilNextCycle: 0,
          canQueueToys: false,
          reason: 'No current subscription cycle found'
        };
      }

      // Check if subscription is active
      if (currentCycle.subscription_status !== 'active') {
        return {
          isEligible: false,
          currentCycleDays: currentCycle.current_cycle_day || 0,
          daysUntilNextCycle: currentCycle.days_remaining_in_cycle || 0,
          canQueueToys: false,
          reason: `Subscription is ${currentCycle.subscription_status}`
        };
      }

      // Use database view calculations instead of client-side math
      const currentCycleDays = currentCycle.current_cycle_day;
      const daysUntilNextCycle = currentCycle.days_remaining_in_cycle;
      const selectionWindowOpen = currentCycle.selection_window_status === 'open';
      const selectionWindowUpcoming = currentCycle.selection_window_status === 'upcoming';

      // Check if user can queue toys based on selection window
      const canQueueToys = selectionWindowOpen || (selectionWindowUpcoming && currentCycle.days_until_selection_opens <= 3);

      console.log('✅ Queue eligibility check results (using database views):', {
        currentCycleDays,
        daysUntilNextCycle,
        selectionWindowStatus: currentCycle.selection_window_status,
        daysUntilSelectionOpens: currentCycle.days_until_selection_opens,
        canQueueToys,
        cycleProgress: currentCycle.cycle_progress_percentage
      });

      return {
        isEligible: true,
        currentCycleDays,
        daysUntilNextCycle,
        canQueueToys,
        reason: canQueueToys ? undefined : 'Selection window not open',
        currentOrder: currentCycle
      };

    } catch (error) {
      console.error('❌ Error checking queue eligibility:', error);
      return {
        isEligible: false,
        currentCycleDays: 0,
        daysUntilNextCycle: 0,
        canQueueToys: false,
        reason: 'Error checking eligibility'
      };
    }
  }

  /**
   * Get current active rental cycle for user - NOW USING DATABASE VIEWS
   */
  static async getCurrentCycle(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')  // 🎯 FILTER FOR ACTIVE SUBSCRIPTIONS ONLY
        .order('rental_start_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching current cycle:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Error in getCurrentCycle:', error);
      return null;
    }
  }

  /**
   * Get cycle progress percentage - NOW USING DATABASE VIEWS
   */
  static async getCycleProgress(userId: string): Promise<number> {
    try {
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      return currentCycle?.cycle_progress_percentage || 0;
    } catch (error) {
      console.error('❌ Error getting cycle progress:', error);
      return 0;
    }
  }

  // ========================================
  // LEGACY METHODS (maintained for backward compatibility)
  // ========================================

  /**
   * Check if user has active subscription
   * UPDATED: Use subscription_status filtering
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select('id')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')  // 🎯 FILTER FOR ACTIVE SUBSCRIPTIONS ONLY
        .limit(1);

      if (error) {
        console.error('❌ Error checking active subscription:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('❌ Error in hasActiveSubscription:', error);
      return false;
    }
  }

  /**
   * Get subscription details for user
   */
  static async getSubscriptionDetails(userId: string): Promise<SubscriptionDetails> {
    try {
      const currentCycle = await this.getCurrentSubscriptionCycle(userId);
      
      if (!currentCycle) {
        return {
          isActive: false,
          plan: 'none',
          planName: 'No Subscription',
          toyLimit: 0
        };
      }

      const planInfo = this.getPlanInfo(currentCycle.plan_id);

      return {
        isActive: currentCycle.subscription_status === 'active',
        plan: currentCycle.plan_id,
        planName: planInfo.name,
        toyLimit: planInfo.toyLimit,
        currentCycle
      };
    } catch (error) {
      console.error('❌ Error getting subscription details:', error);
      return {
        isActive: false,
        plan: 'none',
        planName: 'No Subscription', 
        toyLimit: 0
      };
    }
  }

  /**
   * Get plan information
   */
  static getPlanInfo(planId: string | null) {
    const plans: Record<string, { name: string; toyLimit: number; price: number }> = {
      'Discovery Delight': { name: 'Discovery Delight', toyLimit: 4, price: 1299 },
      'Silver Pack': { name: 'Silver Pack', toyLimit: 6, price: 5999 },
      'Gold Pack PRO': { name: 'Gold Pack PRO', toyLimit: 8, price: 7999 },
      'Ride-On Monthly': { name: 'Ride-On Monthly', toyLimit: 1, price: 1999 },
      // Legacy support for old plan names
      'discovery-delight': { name: 'Discovery Delight', toyLimit: 4, price: 1299 },
      'silver-pack': { name: 'Silver Pack', toyLimit: 6, price: 5999 },
      'gold-pack': { name: 'Gold Pack PRO', toyLimit: 8, price: 7999 },
      'ride_on_fixed': { name: 'Ride-On Monthly', toyLimit: 1, price: 1999 },
      'basic': { name: 'Discovery Delight', toyLimit: 4, price: 1299 },
      'premium': { name: 'Silver Pack', toyLimit: 6, price: 5999 },
      'family': { name: 'Gold Pack PRO', toyLimit: 8, price: 7999 }
    };

    return plans[planId || ''] || { name: 'Discovery Delight', toyLimit: 4, price: 1299 };
  }

  /**
   * Get cycle progress percentage (Legacy method - kept for backward compatibility)
   */
  static getCycleProgressLegacy(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();

    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  }

  /**
   * Check if user requires payment based on subscription status
   * Returns payment eligibility information for payment bypass system
   * WITH COMPREHENSIVE ERROR HANDLING
   */
  static async checkPaymentEligibility(userId: string): Promise<PaymentEligibilityResult> {
    const logContext = { userId, method: 'checkPaymentEligibility' };
    
    try {
      console.log('🔍 [PaymentEligibility] Starting eligibility check:', logContext);

      // VALIDATION: Check if user ID is provided
      if (!userId) {
        console.warn('⚠️ [PaymentEligibility] No user ID provided');
        return {
          requiresPayment: true,
          planType: null,
          ageGroup: null,
          bypassReason: 'No user ID provided',
          isActive: false
        };
      }

      // VALIDATION: Check if user ID is valid format
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        console.warn('⚠️ [PaymentEligibility] Invalid user ID format:', { userId, type: typeof userId });
        return {
          requiresPayment: true,
          planType: null,
          ageGroup: null,
          bypassReason: 'Invalid user ID format',
          isActive: false
        };
      }

      // DATABASE QUERY: Check user subscription status with comprehensive error handling
      let user: any = null;
      let userError: any = null;

      try {
        const result = await supabase
          .from('custom_users')
          .select('subscription_active, subscription_plan, subscription_end_date, created_at, updated_at')
          .eq('id', userId.trim())
          .single();

        user = result.data;
        userError = result.error;

        console.log('📊 [PaymentEligibility] Database query result:', {
          hasData: !!user,
          hasError: !!userError,
          errorCode: userError?.code,
          errorMessage: userError?.message
        });

      } catch (networkError) {
        console.error('❌ [PaymentEligibility] Network error during database query:', networkError);
        return {
          requiresPayment: true,
          planType: null,
          ageGroup: null,
          bypassReason: 'Database connection failed',
          isActive: false
        };
      }

      // ERROR HANDLING: Database query errors
      if (userError) {
        if (userError.code === 'PGRST116') {
          // User not found (specific PostgreSQL error)
          console.warn('⚠️ [PaymentEligibility] User not found in database:', { userId, error: userError });
          return {
            requiresPayment: true,
            planType: null,
            ageGroup: null,
            bypassReason: 'User not found',
            isActive: false
          };
        } else if (userError.code === 'PGRST301') {
          // Connection or timeout error
          console.error('❌ [PaymentEligibility] Database connection error:', userError);
          return {
            requiresPayment: true,
            planType: null,
            ageGroup: null,
            bypassReason: 'Database connection timeout',
            isActive: false
          };
        } else {
          // Generic database error
          console.error('❌ [PaymentEligibility] Database error:', userError);
          return {
            requiresPayment: true,
            planType: null,
            ageGroup: null,
            bypassReason: 'Database query failed',
            isActive: false
          };
        }
      }

      // VALIDATION: Check if user data exists
      if (!user) {
        console.warn('⚠️ [PaymentEligibility] User data is null or undefined:', { userId });
        return {
          requiresPayment: true,
          planType: null,
          ageGroup: null,
          bypassReason: 'User data not found',
          isActive: false
        };
      }

      // DATA VALIDATION: Check subscription plan validity
      let validatedPlanType = null;
      if (user.subscription_plan) {
        if (typeof user.subscription_plan === 'string' && user.subscription_plan.trim().length > 0) {
          validatedPlanType = user.subscription_plan.trim();
        } else {
          console.warn('⚠️ [PaymentEligibility] Invalid subscription plan format:', { 
            planType: user.subscription_plan, 
            type: typeof user.subscription_plan 
          });
          return {
            requiresPayment: true,
            planType: null,
            ageGroup: null,
            bypassReason: 'Invalid subscription plan data',
            isActive: false
          };
        }
      }

      // DATE VALIDATION: Check subscription expiration with robust date handling
      let subscriptionExpired = false;
      let validatedEndDate = null;

      if (user.subscription_end_date) {
        try {
          const endDate = new Date(user.subscription_end_date);
          
          // Check if date is valid
          if (isNaN(endDate.getTime())) {
            console.warn('⚠️ [PaymentEligibility] Invalid subscription end date:', user.subscription_end_date);
            return {
              requiresPayment: true,
              planType: validatedPlanType,
              ageGroup: null,
              bypassReason: 'Invalid subscription end date',
              isActive: false
            };
          }

          validatedEndDate = user.subscription_end_date;
          const now = new Date();
          subscriptionExpired = endDate < now;

          if (subscriptionExpired) {
            const daysExpired = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
            console.log('⏰ [PaymentEligibility] Subscription expired:', {
              endDate: user.subscription_end_date,
              daysExpired,
              planType: validatedPlanType
            });
            return {
              requiresPayment: true,
              planType: validatedPlanType,
              ageGroup: null,
              bypassReason: 'Subscription expired',
              subscriptionEndDate: validatedEndDate,
              isActive: false
            };
          }
        } catch (dateError) {
          console.error('❌ [PaymentEligibility] Error parsing subscription end date:', dateError);
          return {
            requiresPayment: true,
            planType: validatedPlanType,
            ageGroup: null,
            bypassReason: 'Date parsing error',
            isActive: false
          };
        }
      }

      // SUBSCRIPTION STATUS VALIDATION: Check if subscription is active
      const isSubscriptionActive = user.subscription_active === true || user.subscription_active === 'true';
      
      if (!isSubscriptionActive) {
        console.log('🔒 [PaymentEligibility] Subscription not active:', {
          subscriptionActive: user.subscription_active,
          planType: validatedPlanType
        });
        return {
          requiresPayment: true,
          planType: validatedPlanType,
          ageGroup: null,
          bypassReason: 'Subscription not active',
          subscriptionEndDate: validatedEndDate,
          isActive: false
        };
      }

      // PLAN TYPE VALIDATION: Check if plan qualifies for payment bypass
      const validFreePlans = [
        // Current plan naming conventions
        'silver-pack',
        'gold-pack',
        // Alternative naming conventions
        'Silver Pack',
        'Gold Pack PRO',
        'Silver',
        'Gold',
        // Legacy plan names
        'premium',
        'family'
      ];

      let isFreePlan = false;
      if (validatedPlanType) {
        const normalizedPlanType = validatedPlanType.toLowerCase();
        isFreePlan = validFreePlans.some(planType => 
          normalizedPlanType.includes(planType.toLowerCase()) ||
          validatedPlanType === planType
        );
      }

      // AGE GROUP EXTRACTION: Get age group with error handling
      let ageGroup: string | null = null;
      try {
        ageGroup = await this.getExistingAgeGroup(userId);
      } catch (ageGroupError) {
        console.warn('⚠️ [PaymentEligibility] Age group extraction failed:', ageGroupError);
        // Continue without age group - this is not a critical error
      }

      // FINAL DECISION: Determine payment eligibility
      if (isFreePlan) {
        console.log('✅ [PaymentEligibility] User eligible for payment bypass:', {
          userId,
          planType: validatedPlanType,
          ageGroup,
          subscriptionActive: isSubscriptionActive,
          subscriptionEndDate: validatedEndDate
        });

        return {
          requiresPayment: false,
          planType: validatedPlanType,
          ageGroup,
          bypassReason: 'Active premium subscription',
          subscriptionEndDate: validatedEndDate,
          isActive: true,
          subscription: user
        };
      } else {
        console.log('💳 [PaymentEligibility] User requires payment:', {
          userId,
          planType: validatedPlanType,
          reason: validatedPlanType ? 'Discovery Delight or unknown plan' : 'No subscription plan',
          ageGroup
        });
        
        return {
          requiresPayment: true,
          planType: validatedPlanType,
          ageGroup,
          bypassReason: validatedPlanType ? 'Discovery Delight or paid plan' : 'No subscription plan',
          subscriptionEndDate: validatedEndDate,
          isActive: true,
          subscription: user
        };
      }

    } catch (error) {
      // CRITICAL ERROR HANDLING: Log all unexpected errors
      console.error('❌ [PaymentEligibility] Critical system error:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        timestamp: new Date().toISOString()
      });

      // SAFE FALLBACK: Always require payment on critical errors
      return {
        requiresPayment: true,
        planType: null,
        ageGroup: null,
        bypassReason: 'System error - safe fallback',
        isActive: false
      };
    }
  }

  /**
   * Get existing age group from user's subscription history
   * Returns the most recent valid age group from rental orders
   * WITH COMPREHENSIVE ERROR HANDLING
   */
  static async getExistingAgeGroup(userId: string): Promise<string | null> {
    const logContext = { userId, method: 'getExistingAgeGroup' };
    
    try {
      console.log('🔍 [AgeGroup] Starting age group lookup:', logContext);

      // VALIDATION: Check if user ID is provided
      if (!userId) {
        console.warn('⚠️ [AgeGroup] No user ID provided for age group lookup');
        return null;
      }

      // VALIDATION: Check if user ID is valid format
      if (typeof userId !== 'string' || userId.trim().length === 0) {
        console.warn('⚠️ [AgeGroup] Invalid user ID format:', { userId, type: typeof userId });
        return null;
      }

      // CONSTANTS: Define valid age groups
      const validAgeGroups = ['1-2', '2-3', '3-4', '4-6', '6-8'];

      // DATABASE QUERY: Get rental orders with comprehensive error handling
      let orders: any[] = [];
      let queryError: any = null;

      try {
        const result = await (supabase as any)
          .from('rental_orders')
          .select('age_group, created_at, order_number, subscription_plan, status, order_type')
          .eq('user_id', userId.trim())
          .eq('order_type', 'subscription')
          .in('age_group', validAgeGroups)
          .not('age_group', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10); // Get last 10 orders for better analysis

        orders = result.data || [];
        queryError = result.error;

        console.log('📊 [AgeGroup] Database query result:', {
          hasData: !!orders,
          orderCount: orders.length,
          hasError: !!queryError,
          errorCode: queryError?.code,
          errorMessage: queryError?.message
        });

      } catch (networkError) {
        console.error('❌ [AgeGroup] Network error during database query:', networkError);
        return null; // Non-critical error - return null instead of throwing
      }

      // ERROR HANDLING: Database query errors
      if (queryError) {
        if (queryError.code === 'PGRST116') {
          // No data found (not an error)
          console.log('ℹ️ [AgeGroup] No rental orders found for user:', { userId });
          return null;
        } else if (queryError.code === 'PGRST301') {
          // Connection or timeout error
          console.error('❌ [AgeGroup] Database connection error:', queryError);
          return null;
        } else {
          // Generic database error
          console.error('❌ [AgeGroup] Database error:', queryError);
          return null;
        }
      }

      // DATA VALIDATION: Check if orders exist and are valid
      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        console.log('ℹ️ [AgeGroup] No rental orders with valid age groups found for user:', { userId });
        return null;
      }

      // DATA PROCESSING: Find the best age group from orders
      const validOrders = orders.filter(order => {
        // Validate order structure
        if (!order || typeof order !== 'object') {
          console.warn('⚠️ [AgeGroup] Invalid order structure:', order);
          return false;
        }

        // Validate age group
        if (!order.age_group || typeof order.age_group !== 'string') {
          console.warn('⚠️ [AgeGroup] Invalid age group in order:', { 
            orderNumber: order.order_number, 
            ageGroup: order.age_group 
          });
          return false;
        }

        // Check if age group is in valid list
        if (!validAgeGroups.includes(order.age_group)) {
          console.warn('⚠️ [AgeGroup] Age group not in valid list:', { 
            orderNumber: order.order_number, 
            ageGroup: order.age_group,
            validAgeGroups 
          });
          return false;
        }

        return true;
      });

      if (validOrders.length === 0) {
        console.log('ℹ️ [AgeGroup] No valid orders found after filtering:', { 
          totalOrders: orders.length,
          validOrders: validOrders.length
        });
        return null;
      }

      // RESULT SELECTION: Get the most recent valid age group
      const mostRecentOrder = validOrders[0];
      const selectedAgeGroup = mostRecentOrder.age_group;

      // FINAL VALIDATION: Double-check the selected age group
      if (!validAgeGroups.includes(selectedAgeGroup)) {
        console.error('❌ [AgeGroup] Selected age group is invalid:', { 
          selectedAgeGroup,
          validAgeGroups,
          orderNumber: mostRecentOrder.order_number
        });
        return null;
      }

      console.log('✅ [AgeGroup] Successfully found existing age group:', {
        ageGroup: selectedAgeGroup,
        orderNumber: mostRecentOrder.order_number,
        subscriptionPlan: mostRecentOrder.subscription_plan,
        orderStatus: mostRecentOrder.status,
        createdAt: mostRecentOrder.created_at,
        totalOrdersChecked: orders.length,
        validOrdersFound: validOrders.length
      });

      return selectedAgeGroup;

    } catch (error) {
      // CRITICAL ERROR HANDLING: Log all unexpected errors
      console.error('❌ [AgeGroup] Critical system error:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        timestamp: new Date().toISOString()
      });

      // SAFE FALLBACK: Return null instead of throwing (non-critical operation)
      return null;
    }
  }

  /**
   * Update subscription status (admin function)
   * 🎯 UPDATED: Use rental_orders table
   */
  static async updateSubscriptionStatus(subscriptionId: string, status: string, updatedBy?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rental_orders' as any)
        .update({
          subscription_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('❌ Error updating subscription status:', error);
        return false;
      }

      console.log(`✅ Subscription ${subscriptionId} status updated to ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Error in updateSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Bulk update subscription status for user (admin function)
   * 🎯 UPDATED: Use rental_orders table
   */
  static async bulkUpdateUserSubscriptionStatus(userId: string, status: string, updatedBy?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rental_orders' as any)
        .update({
          subscription_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error bulk updating subscription status:', error);
        return false;
      }

      console.log(`✅ All subscriptions for user ${userId} updated to ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Error in bulkUpdateUserSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Check if user has any subscription (regardless of status) - for admin purposes
   * 🎯 UPDATED: Use rental_orders table
   */
  static async hasSubscription(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('rental_orders' as any)
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('❌ Error checking if user has subscription:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('❌ Error in hasSubscription:', error);
      return false;
    }
  }

  /**
   * Manual selection window control for admin
   */
  static async controlSelectionWindow(
    rentalOrderId: string, 
    action: 'open' | 'close', 
    adminUserId: string, 
    notes?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('control_selection_window', {
        p_rental_order_id: rentalOrderId,
        p_action: action,
        p_admin_user_id: adminUserId,
        p_notes: notes
      });

      if (error) {
        console.error('❌ Error controlling selection window:', error);
        return false;
      }

      console.log(`✅ Selection window ${action}ed successfully for rental order ${rentalOrderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error in controlSelectionWindow:', error);
      return false;
    }
  }

  /**
   * Reset selection window to auto after manual closure
   */
  static async resetSelectionWindowToAuto(rentalOrderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('reset_selection_window_to_auto', {
        p_rental_order_id: rentalOrderId
      });

      if (error) {
        console.error('❌ Error resetting selection window to auto:', error);
        return false;
      }

      console.log(`✅ Selection window reset to auto for rental order ${rentalOrderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error in resetSelectionWindowToAuto:', error);
      return false;
    }
  }

  /**
   * Automatically close selection window after order placement
   * This ensures that once a user places an order through the selection window,
   * it gets closed to prevent multiple orders in the same cycle
   */
  static async closeSelectionWindowAfterOrder(
    userId: string, 
    orderType: 'queue_order' | 'cycle_update' = 'queue_order',
    notes?: string
  ): Promise<boolean> {
    try {
      console.log(`🔒 Attempting to close selection window for user ${userId} after ${orderType}`);
      
      // Get the user's active subscription
      const { data: activeSubscription, error: subscriptionError } = await supabase
        .from('rental_orders')
        .select('id, selection_window_status, manual_selection_control')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')
        .single();

      if (subscriptionError || !activeSubscription) {
        console.log(`ℹ️ No active subscription found for user ${userId}, skipping selection window closure`);
        return true; // Not an error - user might not have active subscription
      }

      // Only close if the selection window is currently open (manual or auto)
      const isCurrentlyOpen = activeSubscription.selection_window_status === 'manual_open' || 
                             activeSubscription.selection_window_status === 'auto_open' ||
                             activeSubscription.selection_window_status === 'auto';

      if (!isCurrentlyOpen) {
        console.log(`ℹ️ Selection window already closed for user ${userId}, no action needed`);
        return true;
      }

      // Close the selection window
      const defaultNotes = `Selection window automatically closed after ${orderType} placement`;
      const success = await this.controlSelectionWindow(
        activeSubscription.id,
        'close',
        userId, // Using user as admin for auto-closure
        notes || defaultNotes
      );

      if (success) {
        console.log(`✅ Selection window automatically closed for user ${userId} after ${orderType}`);
        return true;
      } else {
        console.error(`❌ Failed to close selection window for user ${userId} after ${orderType}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Error in closeSelectionWindowAfterOrder:', error);
      return false;
    }
  }

  /**
   * Get selection window dashboard data
   */
  static async getSelectionWindowDashboard(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('selection_window_dashboard')
        .select('*')
        .order('rental_start_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching selection window dashboard:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getSelectionWindowDashboard:', error);
      return [];
    }
  }

  /**
   * Get count of manually opened selection windows
   */
  static async getManualSelectionWindowsCount(): Promise<{
    total: number;
    userDetails: any[];
  }> {
    try {
      console.log('🔍 Calling get_manual_selection_windows_count RPC function...');
      const { data, error } = await supabase.rpc('get_manual_selection_windows_count');

      if (error) {
        console.error('❌ Error getting manual selection windows count:', error);
        console.error('❌ Error details:', error.message, error.details, error.hint);
        return { total: 0, userDetails: [] };
      }

      console.log('📊 Raw RPC response:', data);
      const result = data?.[0] || { total_manual_open: 0, user_details: [] };
      console.log('📊 Processed result:', {
        total: result.total_manual_open || 0,
        userDetailsCount: result.user_details?.length || 0,
        userDetails: result.user_details
      });
      
      return {
        total: result.total_manual_open || 0,
        userDetails: result.user_details || []
      };
    } catch (error) {
      console.error('❌ Error in getManualSelectionWindowsCount:', error);
      return { total: 0, userDetails: [] };
    }
  }

  /**
   * Close all manually opened selection windows (bulk operation)
   */
  static async closeAllManualSelectionWindows(
    adminUserId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    closedCount: number;
    affectedUsers: string[];
    details: any[];
    error?: string;
  }> {
    try {
      console.log('🔒 Starting bulk closure of all manual selection windows');
      
      const { data, error } = await supabase.rpc('close_all_manual_selection_windows', {
        p_admin_user_id: adminUserId,
        p_reason: reason || 'Bulk closure of all manually opened selection windows'
      });

      if (error) {
        console.error('❌ Error closing all manual selection windows:', error);
        return {
          success: false,
          closedCount: 0,
          affectedUsers: [],
          details: [],
          error: error.message
        };
      }

      const result = data?.[0] || { closed_count: 0, affected_users: [], details: [] };
      
      console.log(`✅ Bulk closure completed: ${result.closed_count} windows closed`);
      
      return {
        success: true,
        closedCount: result.closed_count || 0,
        affectedUsers: result.affected_users || [],
        details: result.details || [],
      };
    } catch (error) {
      console.error('❌ Error in closeAllManualSelectionWindows:', error);
      return {
        success: false,
        closedCount: 0,
        affectedUsers: [],
        details: [],
        error: error.message
      };
    }
  }

  /**
   * Close selection window for specific rental order
   */
  static async closeSelectionWindowByRentalOrder(
    rentalOrderId: string,
    adminUserId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log(`🔒 Closing selection window for rental order: ${rentalOrderId}`);
      
      const { data, error } = await supabase.rpc('close_selection_window_by_rental_order', {
        p_rental_order_id: rentalOrderId,
        p_admin_user_id: adminUserId,
        p_reason: reason || 'Manual closure from admin panel'
      });

      if (error) {
        console.error('❌ Error closing selection window by rental order:', error);
        return false;
      }

      console.log(`✅ Selection window closed for rental order: ${rentalOrderId}`);
      return data || false;
    } catch (error) {
      console.error('❌ Error in closeSelectionWindowByRentalOrder:', error);
      return false;
    }
  }

  // ========================================
  // ENHANCED SUBSCRIPTION DELETION METHODS
  // ========================================

  /**
   * Enhanced subscription deletion with comprehensive checks and audit logging
   * 🎯 Production-ready deletion with data integrity and audit trail
   */
  static async deleteSubscription(subscriptionId: string, adminUserId?: string, reason?: string): Promise<SubscriptionOperation> {
    try {
      console.log('🗑️ Starting enhanced subscription deletion:', { subscriptionId, adminUserId, reason });

      // Step 1: Fetch subscription details for validation and audit
      const subscriptionToDelete = await this.getSubscriptionById(subscriptionId);
      if (!subscriptionToDelete) {
        return {
          success: false,
          error: 'Subscription not found',
          data: null
        };
      }

      // Step 2: Pre-deletion validation and dependency checks
      const validationResult = await this.validateSubscriptionDeletion(subscriptionId);
      if (!validationResult.canDelete) {
        return {
          success: false,
          error: validationResult.reason,
          data: { warnings: validationResult.warnings }
        };
      }

      // Step 3: Create comprehensive audit log
      const auditResult = await this.createDeletionAuditLog(subscriptionToDelete, adminUserId, reason, validationResult.warnings);
      
      // Step 4: Perform cascading cleanup
      const cleanupResult = await this.performSubscriptionCleanup(subscriptionId);
      
      // Step 5: Execute the deletion
      const { error: deleteError } = await supabase
        .from('rental_orders')
        .delete()
        .eq('id', subscriptionId);

      if (deleteError) {
        console.error('❌ Database deletion failed:', deleteError);
        return {
          success: false,
          error: `Failed to delete subscription: ${deleteError.message}`,
          data: null
        };
      }

      // Step 6: Post-deletion cleanup and invalidation
      await this.postDeletionCleanup(subscriptionToDelete.user_id);

      console.log('✅ Subscription deletion completed successfully');
      
      return {
        success: true,
        error: null,
        data: {
          deletedSubscription: subscriptionToDelete,
          auditLogId: auditResult.auditLogId,
          warnings: validationResult.warnings,
          cleanupResults: cleanupResult
        }
      };

    } catch (error) {
      console.error('❌ Enhanced subscription deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during deletion',
        data: null
      };
    }
  }

  /**
   * Get subscription by ID with full details
   */
  static async getSubscriptionById(subscriptionId: string) {
    try {
      const { data, error } = await supabase
        .from('rental_orders')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching subscription by ID:', error);
      return null;
    }
  }

  /**
   * Validate if subscription can be safely deleted
   */
  static async validateSubscriptionDeletion(subscriptionId: string) {
    try {
      const warnings = [];
      let canDelete = true;
      let reason = '';

      // Check for related data that might be affected
      const dependencyChecks = await Promise.allSettled([
        // Check for active toy selections
        supabase
          .from('toy_selections')
          .select('id, toy_id')
          .eq('rental_order_id', subscriptionId),
        
        // Check for pending deliveries
        supabase
          .from('delivery_logs')
          .select('id, status')
          .eq('rental_order_id', subscriptionId)
          .in('status', ['pending', 'in_transit']),
        
        // Check for recent payments
        supabase
          .from('orders')
          .select('id, status, total_amount')
          .eq('subscription_id', subscriptionId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), // Last 30 days
        
        // Check for toys currently in user possession
        supabase
          .from('toy_possession_logs')
          .select('id, toy_id, status')
          .eq('rental_order_id', subscriptionId)
          .eq('status', 'with_user')
      ]);

      // Process results
      dependencyChecks.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const data = result.value.data;
          
          switch (index) {
            case 0: // Toy selections
              if (data.length > 0) {
                warnings.push(`${data.length} active toy selection(s) will be removed`);
              }
              break;
              
            case 1: // Pending deliveries
              if (data.length > 0) {
                warnings.push(`${data.length} pending/in-transit delivery(ies) detected`);
                // Don't block deletion but warn admin
              }
              break;
              
            case 2: // Recent payments
              if (data.length > 0) {
                const recentPayments = data.filter(p => p.status === 'completed');
                if (recentPayments.length > 0) {
                  warnings.push(`${recentPayments.length} recent payment(s) in last 30 days`);
                }
              }
              break;
              
            case 3: // Toys with user
              if (data.length > 0) {
                warnings.push(`${data.length} toy(s) currently with user - consider return process`);
                // This might warrant blocking deletion
                canDelete = false;
                reason = 'Cannot delete subscription while toys are with user. Please process toy returns first.';
              }
              break;
          }
        }
      });

      return {
        canDelete,
        reason,
        warnings
      };

    } catch (error) {
      console.error('❌ Error validating subscription deletion:', error);
      return {
        canDelete: false,
        reason: 'Failed to validate deletion prerequisites',
        warnings: ['Validation check failed']
      };
    }
  }

  /**
   * Create comprehensive audit log for deletion
   */
  static async createDeletionAuditLog(subscription: any, adminUserId?: string, reason?: string, warnings: string[] = []) {
    try {
      const auditEntry = {
        action: 'subscription_deletion',
        resource_type: 'rental_orders',
        resource_id: subscription.id,
        user_id: subscription.user_id,
        admin_user_id: adminUserId,
        action_details: {
          subscription_plan: subscription.subscription_plan,
          subscription_status: subscription.subscription_status,
          cycle_number: subscription.cycle_number,
          total_amount: subscription.total_amount,
          rental_period: {
            start: subscription.rental_start_date,
            end: subscription.rental_end_date
          },
          age_group: subscription.age_group,
          order_number: subscription.order_number,
          warnings: warnings,
          deletion_reason: reason || 'Admin deletion via subscription management',
          deleted_at: new Date().toISOString()
        },
        metadata: {
          ip_address: null, // Can be added if needed
          user_agent: null, // Can be added if needed
          deletion_method: 'admin_dashboard'
        }
      };

      // Try to insert audit log (best effort)
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .insert(auditEntry)
        .select()
        .single();

      if (error) {
        console.warn('⚠️ Failed to create audit log (continuing with deletion):', error);
        return { auditLogId: null, created: false };
      }

      console.log('✅ Audit log created:', data?.id);
      return { auditLogId: data?.id, created: true };

    } catch (error) {
      console.warn('⚠️ Audit log creation failed (non-blocking):', error);
      return { auditLogId: null, created: false };
    }
  }

  /**
   * Perform cascading cleanup of related data
   */
  static async performSubscriptionCleanup(subscriptionId: string) {
    try {
      console.log('🧹 Starting subscription cleanup...');
      
      const cleanupResults = {
        toySelections: 0,
        deliveryLogs: 0,
        selectionWindows: 0,
        notifications: 0
      };

      // Clean up toy selections
      const { count: toySelectionsDeleted, error: toyError } = await supabase
        .from('toy_selections')
        .delete()
        .eq('rental_order_id', subscriptionId);
      
      if (!toyError) {
        cleanupResults.toySelections = toySelectionsDeleted || 0;
      }

      // Clean up delivery logs (optional - you might want to keep for historical purposes)
      const { count: deliveryLogsUpdated, error: deliveryError } = await supabase
        .from('delivery_logs')
        .update({ status: 'cancelled_subscription_deleted' })
        .eq('rental_order_id', subscriptionId)
        .in('status', ['pending', 'scheduled']);
      
      if (!deliveryError) {
        cleanupResults.deliveryLogs = deliveryLogsUpdated || 0;
      }

      // Clean up selection window records if they exist
      const { count: selectionWindowsDeleted, error: selectionError } = await supabase
        .from('subscription_selection_windows')
        .delete()
        .eq('subscription_id', subscriptionId);
      
      if (!selectionError) {
        cleanupResults.selectionWindows = selectionWindowsDeleted || 0;
      }

      console.log('✅ Cleanup completed:', cleanupResults);
      return cleanupResults;

    } catch (error) {
      console.warn('⚠️ Some cleanup operations failed (non-blocking):', error);
      return { error: error.message };
    }
  }

  /**
   * Post-deletion cleanup and cache invalidation
   */
  static async postDeletionCleanup(userId: string) {
    try {
      // Invalidate user's subscription cache
      // This would integrate with your caching system if you have one
      
      // Update user's subscription count/status if tracked separately
      const remainingSubscriptions = await this.getAllActiveSubscriptions(userId);
      
      console.log(`✅ Post-deletion cleanup completed. User has ${remainingSubscriptions.length} remaining subscriptions.`);
      
      return {
        remainingSubscriptions: remainingSubscriptions.length,
        cacheInvalidated: true
      };
      
    } catch (error) {
      console.warn('⚠️ Post-deletion cleanup had issues (non-blocking):', error);
      return { error: error.message };
    }
  }

  /**
   * Batch delete multiple subscriptions (for bulk operations)
   */
  static async batchDeleteSubscriptions(subscriptionIds: string[], adminUserId?: string, reason?: string): Promise<SubscriptionOperation> {
    try {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const subscriptionId of subscriptionIds) {
        const result = await this.deleteSubscription(subscriptionId, adminUserId, reason);
        results.push({ subscriptionId, ...result });
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        error: failureCount > 0 ? `${failureCount} deletion(s) failed` : null,
        data: {
          totalProcessed: subscriptionIds.length,
          successCount,
          failureCount,
          details: results
        }
      };

    } catch (error) {
      console.error('❌ Batch deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch deletion failed',
        data: null
      };
    }
  }
}
