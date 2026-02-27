import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addDays, format } from 'date-fns';
import { SubscriptionCycle, UpcomingCycle, CycleHistory, SelectionWindowStatus } from '@/types/subscription';

// Types for subscription data
export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  subscription_start_date: string;
  current_period_start: string;
  current_period_end: string;
  billing_cycle: string;
  created_at: string;
  updated_at: string;
  
  // NEW: Rental-based fields
  actual_subscription_start_date?: string;
  user_actual_start_date?: string;
  total_days_subscribed_actual?: number;
  rental_orders_count?: number;
}

export interface CycleInfo {
  currentCycleNumber: number;
  daysElapsedInCycle: number;
  daysRemainingInCycle: number;
  cycleProgressPercentage: number;
  nextCycleStartDate: Date;
  currentCycleStartDate: Date;
  currentCycleEndDate: Date;
  totalCycleDays: number;
  
  // NEW: Rental-based fields
  actualSubscriptionStartDate?: Date;
  totalDaysSubscribedActual?: number;
  rentalOrdersCount?: number;
}

export interface SelectionWindowInfo {
  isSelectionWindowOpen: boolean;
  selectionWindowOpenDay: number;
  selectionWindowCloseDay: number;
  selectionWindowOpenDate: Date | null;
  selectionWindowCloseDate: Date | null;
  daysUntilSelectionOpens: number;
  daysUntilSelectionCloses: number;
  
  // NEW: Enhanced status
  windowStatus?: 'upcoming' | 'open' | 'missed' | 'completed' | 'closed';
  daysToSelect?: number;
}

export interface SubscriptionCycleResult {
  subscription: SubscriptionData | null;
  cycleInfo: CycleInfo | null;
  selectionWindowInfo: SelectionWindowInfo | null;
  error: string | null;
  isActive: boolean;
  
  // NEW: Rental-based data
  actualStartDate?: Date | null;
  totalDaysSubscribedActual?: number;
  totalRentalOrders?: number;
}

// Plan configuration for different subscription types
const PLAN_CONFIGURATIONS = {
  'discovery-delight': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 3
  },
  'silver-pack': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 5
  },
  'gold-pack': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 7
  },
  'ride-on-monthly': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 3
  },
  // Legacy plan mappings
  'basic': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 3
  },
  'premium': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 5
  },
  'family': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 7
  }
};

/**
 * UPDATED: Fetch user's subscription data using database views
 */
async function fetchUserSubscriptionFromViews(userId: string): Promise<SubscriptionData | null> {
  try {
    const { data, error } = await supabase
      .from('subscription_current_cycle')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching subscription from views:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform database view data to SubscriptionData format
    return {
      id: data.subscription_id,
      user_id: data.user_id,
      plan_id: data.plan_id,
      status: data.subscription_status,
      subscription_start_date: data.actual_subscription_start_date || data.original_subscription_date,
      current_period_start: data.current_cycle_start,
      current_period_end: data.current_cycle_end,
      billing_cycle: 'monthly',
      created_at: data.created_at,
      updated_at: data.updated_at,
      
      // NEW: Rental-based fields
      actual_subscription_start_date: data.actual_subscription_start_date,
      user_actual_start_date: data.user_actual_start_date,
      total_days_subscribed_actual: data.total_days_subscribed_actual,
      rental_orders_count: data.rental_orders_count
    };
  } catch (error) {
    console.error('❌ Error in fetchUserSubscriptionFromViews:', error);
    return null;
  }
}

/**
 * Fetch user's subscription data from multiple possible tables
 */
async function fetchUserSubscription(userId: string): Promise<SubscriptionData | null> {
  try {
    // Use database views for subscription data
    return await fetchUserSubscriptionFromViews(userId);
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return null;
  }
}

/**
 * Get plan configuration with fallback to default
 */
function getPlanConfig(planId: string) {
  const normalizedPlanId = planId?.toLowerCase().replace(/\s+/g, '-');
  return PLAN_CONFIGURATIONS[normalizedPlanId] || PLAN_CONFIGURATIONS['discovery-delight'];
}

/**
 * Calculate cycle information based on subscription dates
 */
function calculateCycleInfo(subscription: SubscriptionData): CycleInfo {
  const config = getPlanConfig(subscription.plan_id);
  const subscriptionStartDate = new Date(subscription.subscription_start_date);
  const today = new Date();
  
  // Calculate total days since subscription started
  const daysSinceSubscriptionStart = differenceInDays(today, subscriptionStartDate);
  
  // Calculate current cycle number (1-based)
  const currentCycleNumber = Math.floor(daysSinceSubscriptionStart / config.cycleDays) + 1;
  
  // Calculate current cycle boundaries
  const currentCycleStartDate = addDays(subscriptionStartDate, (currentCycleNumber - 1) * config.cycleDays);
  const currentCycleEndDate = addDays(currentCycleStartDate, config.cycleDays - 1);
  const nextCycleStartDate = addDays(currentCycleEndDate, 1);
  
  // Calculate progress within current cycle
  const daysElapsedInCycle = differenceInDays(today, currentCycleStartDate);
  const daysRemainingInCycle = Math.max(0, config.cycleDays - daysElapsedInCycle);
  const cycleProgressPercentage = Math.min(100, (daysElapsedInCycle / config.cycleDays) * 100);
  
  return {
    currentCycleNumber,
    daysElapsedInCycle,
    daysRemainingInCycle,
    cycleProgressPercentage,
    nextCycleStartDate,
    currentCycleStartDate,
    currentCycleEndDate,
    totalCycleDays: config.cycleDays
  };
}

/**
 * Determine selection window timing and status
 */
function calculateSelectionWindowInfo(subscription: SubscriptionData, cycleInfo: CycleInfo): SelectionWindowInfo {
  const config = getPlanConfig(subscription.plan_id);
  const today = new Date();
  
  // Calculate selection window dates within current cycle
  const selectionWindowOpenDate = addDays(cycleInfo.currentCycleStartDate, config.selectionWindowStart - 1);
  const selectionWindowCloseDate = addDays(cycleInfo.currentCycleStartDate, config.selectionWindowEnd - 1);
  
  // Check if we're currently in the selection window
  const isInTraditionalWindow = cycleInfo.daysElapsedInCycle >= config.selectionWindowStart && 
                               cycleInfo.daysElapsedInCycle <= config.selectionWindowEnd;
  
  // Check if cycle is complete or in grace period
  const isInGracePeriod = cycleInfo.daysElapsedInCycle > config.cycleDays && 
                         cycleInfo.daysElapsedInCycle <= (config.cycleDays + config.gracePeriod);
  
  const isCycleComplete = cycleInfo.cycleProgressPercentage >= 95;
  
  // Selection window is open during traditional window, grace period, or when cycle is complete
  const isSelectionWindowOpen = isInTraditionalWindow || isInGracePeriod || isCycleComplete;
  
  // Calculate days until selection events
  const daysUntilSelectionOpens = Math.max(0, config.selectionWindowStart - cycleInfo.daysElapsedInCycle);
  const daysUntilSelectionCloses = Math.max(0, config.selectionWindowEnd - cycleInfo.daysElapsedInCycle);
  
  return {
    isSelectionWindowOpen,
    selectionWindowOpenDay: config.selectionWindowStart,
    selectionWindowCloseDay: config.selectionWindowEnd,
    selectionWindowOpenDate,
    selectionWindowCloseDate,
    daysUntilSelectionOpens,
    daysUntilSelectionCloses
  };
}

/**
 * Handle paused subscriptions
 */
function handlePausedSubscription(subscription: SubscriptionData): SubscriptionCycleResult {
  return {
    subscription,
    cycleInfo: null,
    selectionWindowInfo: {
      isSelectionWindowOpen: false,
      selectionWindowOpenDay: 0,
      selectionWindowCloseDay: 0,
      selectionWindowOpenDate: null,
      selectionWindowCloseDate: null,
      daysUntilSelectionOpens: -1,
      daysUntilSelectionCloses: -1
    },
    error: 'Subscription is currently paused',
    isActive: false
  };
}

/**
 * Main function to get comprehensive subscription cycle information
 */
export async function getSubscriptionCycleInfo(userId: string): Promise<SubscriptionCycleResult> {
  try {
    // Fetch subscription data
    const subscription = await fetchUserSubscription(userId);
    
    if (!subscription) {
      return {
        subscription: null,
        cycleInfo: null,
        selectionWindowInfo: null,
        error: 'No active subscription found',
        isActive: false
      };
    }
    
    // Handle paused subscriptions
    if (subscription.status === 'paused') {
      return handlePausedSubscription(subscription);
    }
    
    // Calculate cycle information
    const cycleInfo = calculateCycleInfo(subscription);
    
    // Calculate selection window information
    const selectionWindowInfo = calculateSelectionWindowInfo(subscription, cycleInfo);
    
    return {
      subscription,
      cycleInfo,
      selectionWindowInfo,
      error: null,
      isActive: subscription.status === 'active'
    };
    
  } catch (error) {
    console.error('Error in getSubscriptionCycleInfo:', error);
    return {
      subscription: null,
      cycleInfo: null,
      selectionWindowInfo: null,
      error: `Failed to fetch subscription cycle info: ${error.message}`,
      isActive: false
    };
  }
}

/**
 * Get formatted cycle status for display
 */
export function getFormattedCycleStatus(result: SubscriptionCycleResult): {
  title: string;
  description: string;
  progressText: string;
  selectionStatus: string;
} {
  if (!result.isActive || !result.cycleInfo || !result.selectionWindowInfo) {
    return {
      title: 'No Active Subscription',
      description: result.error || 'Subscription information not available',
      progressText: '0%',
      selectionStatus: 'Unavailable'
    };
  }
  
  const { cycleInfo, selectionWindowInfo } = result;
  
  const title = `Cycle #${cycleInfo.currentCycleNumber}`;
  const description = `${cycleInfo.daysElapsedInCycle} of ${cycleInfo.totalCycleDays} days completed`;
  const progressText = `${Math.round(cycleInfo.cycleProgressPercentage)}%`;
  
  let selectionStatus = 'Closed';
  if (selectionWindowInfo.isSelectionWindowOpen) {
    if (selectionWindowInfo.daysUntilSelectionCloses > 0) {
      selectionStatus = `Open (${selectionWindowInfo.daysUntilSelectionCloses} days left)`;
    } else {
      selectionStatus = 'Open (Extended)';
    }
  } else if (selectionWindowInfo.daysUntilSelectionOpens > 0) {
    selectionStatus = `Opens in ${selectionWindowInfo.daysUntilSelectionOpens} days`;
  }
  
  return {
    title,
    description,
    progressText,
    selectionStatus
  };
}

/**
 * Check if user can currently select toys
 */
export function canUserSelectToys(result: SubscriptionCycleResult): boolean {
  return result.isActive && 
         result.selectionWindowInfo?.isSelectionWindowOpen === true;
}

/**
 * Get next important date for the user
 */
export function getNextImportantDate(result: SubscriptionCycleResult): {
  date: Date | null;
  description: string;
  type: 'selection_opens' | 'selection_closes' | 'cycle_ends' | 'next_cycle_starts' | 'none';
} {
  if (!result.isActive || !result.cycleInfo || !result.selectionWindowInfo) {
    return {
      date: null,
      description: 'No upcoming events',
      type: 'none'
    };
  }
  
  const { cycleInfo, selectionWindowInfo } = result;
  
  if (selectionWindowInfo.isSelectionWindowOpen) {
    if (selectionWindowInfo.daysUntilSelectionCloses > 0) {
      return {
        date: selectionWindowInfo.selectionWindowCloseDate,
        description: 'Selection window closes',
        type: 'selection_closes'
      };
    } else {
      return {
        date: cycleInfo.nextCycleStartDate,
        description: 'Next cycle starts',
        type: 'next_cycle_starts'
      };
    }
  } else if (selectionWindowInfo.daysUntilSelectionOpens > 0) {
    return {
      date: selectionWindowInfo.selectionWindowOpenDate,
      description: 'Selection window opens',
      type: 'selection_opens'
    };
  } else {
    return {
      date: cycleInfo.nextCycleStartDate,
      description: 'Next cycle starts',
      type: 'next_cycle_starts'
    };
  }
}

/**
 * Utility function for debugging - logs detailed cycle information
 */
export function logCycleDebugInfo(userId: string, result: SubscriptionCycleResult): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔄 Subscription Cycle Debug - User: ${userId}`);
    
    if (result.error) {
      console.error('❌ Error:', result.error);
    } else if (result.subscription && result.cycleInfo && result.selectionWindowInfo) {
      const { subscription, cycleInfo, selectionWindowInfo } = result;
      
      console.log('📋 Subscription Info:', {
        id: subscription.id,
        plan: subscription.plan_id,
        status: subscription.status,
        startDate: format(new Date(subscription.subscription_start_date), 'MMM dd, yyyy'),
        currentPeriod: `${format(new Date(subscription.current_period_start), 'MMM dd')} - ${format(new Date(subscription.current_period_end), 'MMM dd')}`
      });
      
      console.log('🎯 Cycle Info:', {
        cycleNumber: cycleInfo.currentCycleNumber,
        daysElapsed: cycleInfo.daysElapsedInCycle,
        daysRemaining: cycleInfo.daysRemainingInCycle,
        progress: `${Math.round(cycleInfo.cycleProgressPercentage)}%`,
        currentCycleDates: `${format(cycleInfo.currentCycleStartDate, 'MMM dd')} - ${format(cycleInfo.currentCycleEndDate, 'MMM dd')}`
      });
      
      console.log('🎨 Selection Window:', {
        isOpen: selectionWindowInfo.isSelectionWindowOpen,
        window: `Day ${selectionWindowInfo.selectionWindowOpenDay}-${selectionWindowInfo.selectionWindowCloseDay}`,
        daysUntilOpens: selectionWindowInfo.daysUntilSelectionOpens,
        daysUntilCloses: selectionWindowInfo.daysUntilSelectionCloses
      });
      
      const nextEvent = getNextImportantDate(result);
      if (nextEvent.date) {
        console.log('📅 Next Event:', {
          date: format(nextEvent.date, 'MMM dd, yyyy'),
          description: nextEvent.description,
          type: nextEvent.type
        });
      }
    }
    
    console.groupEnd();
  }
}

export interface SubscriptionCycleData {
  subscription_id: string;
  user_id: string;
  current_cycle_number: number;
  current_cycle_start: string;
  current_cycle_end: string;
  cycle_progress_percentage: number;
  days_remaining: number;
  selection_window_status: string;
  subscription_start_date: string;
  plan_id: string;
  subscription_status: string;
}

export interface SelectionWindowData {
  subscription_id: string;
  user_id: string;
  cycle_number: number;
  window_start: string;
  window_end: string;
  window_status: string;
  days_until_window: number;
  window_duration_days: number;
  cycle_start_date: string;
  cycle_end_date: string;
  plan_id: string;
}

export interface SubscriptionTimelineData {
  subscription_id: string;
  user_id: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  selection_window_start: string;
  selection_window_end: string;
  cycle_status: string;
  toys_selected: number;
  toys_delivered: number;
  toys_returned: number;
  plan_id: string;
}

export interface SubscriptionCycleHistory {
  id: string;
  subscription_id: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  selection_window_start: string;
  selection_window_end: string;
  status: string;
  toys_selected: number;
  toys_delivered: number;
  toys_returned: number;
  delivery_date: string | null;
  return_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class SubscriptionCycleService {
  /**
   * Get current cycle information for a user
   */
  async getCurrentCycle(userId: string): Promise<SubscriptionCycle | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_current_cycle')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching current cycle:', error);
        return null;
      }

      return data ? {
        ...data,
        actual_subscription_start_date: new Date(data.actual_subscription_start_date),
        user_actual_start_date: new Date(data.user_actual_start_date)
      } : null;
    } catch (error) {
      console.error('❌ Error in getCurrentCycle:', error);
      return null;
    }
  }

  /**
   * Get upcoming cycles for a user
   */
  async getUpcomingCycles(userId: string): Promise<UpcomingCycle[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_upcoming_cycles')
        .select('*')
        .eq('user_id', userId)
        .order('future_cycle_number', { ascending: true });

      if (error) {
        console.error('❌ Error fetching upcoming cycles:', error);
        return [];
      }

      return data.map(cycle => ({
        ...cycle,
        future_cycle_start: new Date(cycle.future_cycle_start),
        future_cycle_end: new Date(cycle.future_cycle_end),
        future_selection_start: new Date(cycle.future_selection_start),
        future_selection_end: new Date(cycle.future_selection_end),
        estimated_delivery_date: new Date(cycle.estimated_delivery_date),
        actual_subscription_start_date: new Date(cycle.actual_subscription_start_date)
      }));
    } catch (error) {
      console.error('❌ Error in getUpcomingCycles:', error);
      return [];
    }
  }

  /**
   * Get cycle history for a user
   */
  async getCycleHistory(userId: string): Promise<CycleHistory[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_cycle_history')
        .select('*')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: false });

      if (error) {
        console.error('❌ Error fetching cycle history:', error);
        return [];
      }

      return data.map(cycle => ({
        ...cycle,
        cycle_start_date: new Date(cycle.cycle_start_date),
        cycle_end_date: new Date(cycle.cycle_end_date),
        selection_window_start: new Date(cycle.selection_window_start),
        selection_window_end: new Date(cycle.selection_window_end),
        selection_opened_at: cycle.selection_opened_at ? new Date(cycle.selection_opened_at) : undefined,
        selection_closed_at: cycle.selection_closed_at ? new Date(cycle.selection_closed_at) : undefined,
        toys_selected_at: cycle.toys_selected_at ? new Date(cycle.toys_selected_at) : undefined,
        delivery_scheduled_date: cycle.delivery_scheduled_date ? new Date(cycle.delivery_scheduled_date) : undefined,
        delivery_actual_date: cycle.delivery_actual_date ? new Date(cycle.delivery_actual_date) : undefined,
        completed_at: cycle.completed_at ? new Date(cycle.completed_at) : undefined,
        actual_rental_start_date: cycle.actual_rental_start_date ? new Date(cycle.actual_rental_start_date) : undefined
      }));
    } catch (error) {
      console.error('❌ Error in getCycleHistory:', error);
      return [];
    }
  }

  /**
   * Get selection window status for a user
   */
  async getSelectionWindowStatus(userId: string): Promise<SelectionWindowStatus | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_selection_windows')
        .select('*')
        .eq('user_id', userId)
        .in('window_status', ['open', 'upcoming'])
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error fetching selection window status:', error);
        return null;
      }

      return data ? {
        ...data,
        selection_window_start: new Date(data.selection_window_start),
        selection_window_end: new Date(data.selection_window_end),
        selection_opened_at: data.selection_opened_at ? new Date(data.selection_opened_at) : undefined,
        selection_closed_at: data.selection_closed_at ? new Date(data.selection_closed_at) : undefined,
        toys_selected_at: data.toys_selected_at ? new Date(data.toys_selected_at) : undefined
      } : null;
    } catch (error) {
      console.error('❌ Error in getSelectionWindowStatus:', error);
      return null;
    }
  }

  /**
   * Check if selection window is open for a user
   */
  async isSelectionWindowOpen(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscription_current_cycle')
        .select('selection_window_status')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking selection window status:', error);
        return false;
      }

      return data?.selection_window_status === 'open';
    } catch (error) {
      console.error('❌ Error in isSelectionWindowOpen:', error);
      return false;
    }
  }

  /**
   * Get days until selection window for a user
   */
  async getDaysUntilSelectionWindow(userId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_current_cycle')
        .select('days_to_selection_window, selection_window_status')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error getting days until selection window:', error);
        return null;
      }

      return data?.days_to_selection_window || null;
    } catch (error) {
      console.error('❌ Error in getDaysUntilSelectionWindow:', error);
      return null;
    }
  }

  /**
   * Get cycle progress information for a user
   */
  async getCycleProgress(userId: string): Promise<{
    cycleNumber: number;
    progressPercentage: number;
    daysRemaining: number;
    cycleStartDate: string;
    cycleEndDate: string;
    // NEW: Rental-based fields
    actualStartDate?: string;
    totalDaysSubscribedActual?: number;
    rentalOrdersCount?: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_current_cycle')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error getting cycle progress:', error);
        return null;
      }

      return data ? {
        cycleNumber: data.current_cycle_number,
        progressPercentage: data.cycle_progress_percentage,
        daysRemaining: data.days_remaining_in_cycle,
        cycleStartDate: data.current_cycle_start,
        cycleEndDate: data.current_cycle_end,
        
        // NEW: Rental-based fields
        actualStartDate: data.actual_subscription_start_date,
        totalDaysSubscribedActual: data.total_days_subscribed_actual,
        rentalOrdersCount: data.rental_orders_count
      } : null;
    } catch (error) {
      console.error('❌ Error in getCycleProgress:', error);
      return null;
    }
  }

  /**
   * Get subscription summary for a user
   */
  async getSubscriptionSummary(userId: string): Promise<{
    subscriptionId: string;
    planId: string;
    subscriptionStatus: string;
    subscriptionStartDate: string;
    currentCycleNumber: number;
    totalCyclesCompleted: number;
    selectionWindowStatus: string;
    // NEW: Rental-based fields
    actualStartDate?: string;
    totalDaysSubscribedActual?: number;
    rentalOrdersCount?: number;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_current_cycle')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error getting subscription summary:', error);
        return null;
      }

      return data ? {
        subscriptionId: data.subscription_id,
        planId: data.plan_id,
        subscriptionStatus: data.subscription_status,
        subscriptionStartDate: data.original_subscription_date,
        currentCycleNumber: data.current_cycle_number,
        totalCyclesCompleted: data.total_cycles_completed,
        selectionWindowStatus: data.selection_window_status,
        
        // NEW: Rental-based fields
        actualStartDate: data.actual_subscription_start_date,
        totalDaysSubscribedActual: data.total_days_subscribed_actual,
        rentalOrdersCount: data.rental_orders_count
      } : null;
    } catch (error) {
      console.error('❌ Error in getSubscriptionSummary:', error);
      return null;
    }
  }

  /**
   * Validate cycle calculations (for testing purposes)
   */
  async validateCycleCalculations(userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const currentCycle = await this.getCurrentCycle(userId);
      
      if (!currentCycle) {
        errors.push('No current cycle found for user');
        return { isValid: false, errors, warnings };
      }

      // Validate cycle number
      if (currentCycle.current_cycle_number < 1) {
        errors.push('Cycle number must be at least 1');
      }

      // Validate progress percentage
      if (currentCycle.cycle_progress_percentage < 0 || currentCycle.cycle_progress_percentage > 100) {
        errors.push('Cycle progress percentage must be between 0 and 100');
      }

      // Validate days remaining
      if (currentCycle.days_remaining < 0) {
        errors.push('Days remaining cannot be negative');
      }

      // Validate dates
      const cycleStart = new Date(currentCycle.current_cycle_start);
      const cycleEnd = new Date(currentCycle.current_cycle_end);
      const subscriptionStart = new Date(currentCycle.subscription_start_date);

      if (cycleStart > cycleEnd) {
        errors.push('Cycle start date must be before cycle end date');
      }

      if (subscriptionStart > cycleStart) {
        errors.push('Subscription start date must be before or equal to cycle start date');
      }

      // Validate selection window status
      const validStatuses = ['open', 'closed', 'upcoming', 'paused', 'completed'];
      if (!validStatuses.includes(currentCycle.selection_window_status)) {
        errors.push(`Invalid selection window status: ${currentCycle.selection_window_status}`);
      }

      // Warnings for edge cases
      if (currentCycle.days_remaining === 0) {
        warnings.push('Cycle is ending today - consider triggering next cycle');
      }

      if (currentCycle.cycle_progress_percentage > 90 && currentCycle.selection_window_status === 'upcoming') {
        warnings.push('Cycle is almost complete but selection window is still upcoming');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating cycle calculations:', error);
      return {
        isValid: false,
        errors: ['Error during validation: ' + (error as Error).message],
        warnings
      };
    }
  }
} 