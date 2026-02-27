import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { differenceInDays, addDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

// Types and interfaces
interface SubscriptionData {
  id: string;
  user_id: string;
  plan_type: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'grace_period';
  subscription_start_date: Date;
  current_period_start: Date;
  current_period_end: Date;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  auto_renewal: boolean;
  base_amount: number;
  total_amount: number;
  next_billing_date: Date | null;
  grace_period_end: Date | null;
  pause_count: number;
  extension_days: number;
  free_months_added: number;
  created_at: Date;
  updated_at: Date;
}

interface CycleInfo {
  currentCycle: number;
  totalCycles: number;
  daysIntoCurrentCycle: number;
  daysRemainingInCycle: number;
  cycleStartDate: Date;
  cycleEndDate: Date;
  nextCycleStartDate: Date;
  progressPercentage: number;
  isComplete: boolean;
}

interface SelectionWindowInfo {
  isOpen: boolean;
  openDate: Date;
  closeDate: Date;
  daysUntilOpen: number;
  daysUntilClose: number;
  status: 'upcoming' | 'open' | 'closing_soon' | 'closed';
  reason: string;
}

interface CycleNotification {
  type: 'selection_window_open' | 'selection_window_closing' | 'cycle_complete' | 'cycle_starting';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  actionRequired: boolean;
}

interface PlanConfig {
  planId: string;
  cycleLengthDays: number;
  selectionWindowStart: number; // Days before cycle end
  selectionWindowEnd: number; // Days before cycle end
  gracePeriodDays: number;
  maxToysPerCycle: number;
  features: string[];
}

interface SubscriptionCycleState {
  subscription: SubscriptionData | null;
  cycleInfo: CycleInfo | null;
  selectionWindow: SelectionWindowInfo | null;
  notifications: CycleNotification[];
  planConfig: PlanConfig | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface SubscriptionCycleResult extends SubscriptionCycleState {
  // Core calculation functions
  getCycleNumber: (subscriptionDate?: Date) => number;
  getCycleProgress: (subscriptionDate?: Date) => number;
  getSelectionWindow: (subscriptionDate?: Date) => SelectionWindowInfo;
  getNextCycleDate: (subscriptionDate?: Date) => Date;
  
  // Utility functions
  canSelectToys: () => boolean;
  isSelectionWindowOpen: () => boolean;
  getDaysUntilNextCycle: () => number;
  getCycleTimeline: () => any;
  
  // Plan-specific functions
  getPlanFeatures: () => string[];
  getMaxToysForCycle: () => number;
  getCycleLengthForPlan: (planId?: string) => number;
  
  // Real-time update functions
  forceRefresh: () => void;
  markNotificationRead: (notificationId: string) => void;
  getUnreadNotifications: () => CycleNotification[];
  
  // State management
  refreshSubscription: () => Promise<void>;
  updateSubscriptionState: (updates: Partial<SubscriptionData>) => void;
}

// Plan configurations
const PLAN_CONFIGS: Record<string, PlanConfig> = {
  'Discovery Delight': {
    planId: 'Discovery Delight',
    cycleLengthDays: 30,
    selectionWindowStart: 30, // Opens 30 days before cycle end
    selectionWindowEnd: 7, // Closes 7 days before cycle end
    gracePeriodDays: 3,
    maxToysPerCycle: 5,
    features: ['Basic selection', 'Standard delivery', 'Email support']
  },
  'Silver Pack': {
    planId: 'Silver Pack',
    cycleLengthDays: 30,
    selectionWindowStart: 30,
    selectionWindowEnd: 5,
    gracePeriodDays: 5,
    maxToysPerCycle: 7,
    features: ['Priority selection', 'Express delivery', 'Phone support', 'Extended window']
  },
  'Gold Pack': {
    planId: 'Gold Pack',
    cycleLengthDays: 30,
    selectionWindowStart: 30,
    selectionWindowEnd: 3,
    gracePeriodDays: 7,
    maxToysPerCycle: 10,
    features: ['Premium selection', 'Same-day delivery', '24/7 support', 'Extended window', 'Exclusive toys']
  },
  'Custom Plan': {
    planId: 'Custom Plan',
    cycleLengthDays: 30,
    selectionWindowStart: 30,
    selectionWindowEnd: 7,
    gracePeriodDays: 5,
    maxToysPerCycle: 8,
    features: ['Customizable', 'Flexible timing', 'Priority support']
  }
};

// Legacy plan mappings
const LEGACY_PLAN_MAPPINGS: Record<string, string> = {
  'basic': 'Discovery Delight',
  'standard': 'Silver Pack',
  'premium': 'Gold Pack',
  'pro': 'Gold Pack'
};

// Default refresh interval (5 minutes)
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000;

// Notification thresholds
const NOTIFICATION_THRESHOLDS = {
  SELECTION_WINDOW_OPENING: 24, // Hours before window opens
  SELECTION_WINDOW_CLOSING: 48, // Hours before window closes
  CYCLE_COMPLETING: 48, // Hours before cycle completes
  CYCLE_STARTING: 24 // Hours before cycle starts
};

export const useSubscriptionCycle = (
  options: {
    refreshInterval?: number;
    enableNotifications?: boolean;
    enableRealTimeUpdates?: boolean;
    debugMode?: boolean;
  } = {}
): SubscriptionCycleResult => {
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    enableNotifications = true,
    enableRealTimeUpdates = true,
    debugMode = false
  } = options;

  // Local state for notifications and real-time updates
  const [notifications, setNotifications] = useState<CycleNotification[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fetch subscription data
  const { 
    data: subscriptionData, 
    isLoading, 
    error: queryError, 
    refetch: refetchSubscription 
  } = useQuery({
    queryKey: ['subscription-cycle', profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error('No user ID');

      // Try user_subscriptions table first
      const { data: userSubscription, error: userSubError } = await supabase
        .from('user_subscriptions' as any)
        .select('*')
        .eq('user_id', profile.id)
        .in('status', ['active', 'paused', 'cancelled', 'expired'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!userSubError && userSubscription) {
        return {
          id: userSubscription.id,
          user_id: userSubscription.user_id,
          plan_type: userSubscription.plan_type,
          status: userSubscription.status,
          subscription_start_date: new Date(userSubscription.created_at),
          current_period_start: new Date(userSubscription.current_period_start),
          current_period_end: new Date(userSubscription.current_period_end),
          billing_cycle: userSubscription.billing_cycle || 'monthly',
          auto_renewal: userSubscription.auto_renewal || false,
          base_amount: userSubscription.base_amount || 0,
          total_amount: userSubscription.total_amount || 0,
          next_billing_date: userSubscription.next_billing_date ? new Date(userSubscription.next_billing_date) : null,
          grace_period_end: userSubscription.grace_period_end ? new Date(userSubscription.grace_period_end) : null,
          pause_count: userSubscription.pause_count || 0,
          extension_days: userSubscription.extension_days || 0,
          free_months_added: userSubscription.free_months_added || 0,
          created_at: new Date(userSubscription.created_at),
          updated_at: new Date(userSubscription.updated_at)
        } as SubscriptionData;
      }

      // Fallback to subscriptions table
      const { data: legacySubscription, error: legacyError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .in('status', ['active', 'paused', 'cancelled', 'expired'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!legacyError && legacySubscription) {
        return {
          id: legacySubscription.id,
          user_id: legacySubscription.user_id,
          plan_type: legacySubscription.plan_id,
          status: legacySubscription.status,
          subscription_start_date: new Date(legacySubscription.created_at),
          current_period_start: legacySubscription.current_cycle_start ? new Date(legacySubscription.current_cycle_start) : new Date(legacySubscription.created_at),
          current_period_end: legacySubscription.current_cycle_end ? new Date(legacySubscription.current_cycle_end) : addDays(new Date(legacySubscription.created_at), 30),
          billing_cycle: 'monthly',
          auto_renewal: true,
          base_amount: 0,
          total_amount: 0,
          next_billing_date: null,
          grace_period_end: null,
          pause_count: 0,
          extension_days: 0,
          free_months_added: 0,
          created_at: new Date(legacySubscription.created_at),
          updated_at: new Date(legacySubscription.updated_at)
        } as SubscriptionData;
      }

      return null;
    },
    enabled: !!profile?.id,
    refetchInterval: enableRealTimeUpdates ? refreshInterval : false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });

  // Get plan configuration
  const planConfig = useMemo(() => {
    if (!subscriptionData?.plan_type) return null;
    
    const planId = LEGACY_PLAN_MAPPINGS[subscriptionData.plan_type.toLowerCase()] || subscriptionData.plan_type;
    return PLAN_CONFIGS[planId] || PLAN_CONFIGS['Discovery Delight'];
  }, [subscriptionData?.plan_type]);

  // Calculate cycle information
  const cycleInfo = useMemo((): CycleInfo | null => {
    if (!subscriptionData || !planConfig) return null;

    const today = startOfDay(new Date());
    const subscriptionStart = startOfDay(subscriptionData.subscription_start_date);
    const cycleLengthDays = planConfig.cycleLengthDays;
    
    // Account for extensions and pause periods
    const effectiveStartDate = addDays(subscriptionStart, -subscriptionData.extension_days);
    const totalDaysSubscribed = differenceInDays(today, effectiveStartDate);
    
    // Calculate current cycle
    const currentCycle = Math.floor(totalDaysSubscribed / cycleLengthDays) + 1;
    const daysIntoCurrentCycle = totalDaysSubscribed % cycleLengthDays;
    const daysRemainingInCycle = cycleLengthDays - daysIntoCurrentCycle;
    
    // Calculate cycle dates
    const cycleStartDate = addDays(effectiveStartDate, (currentCycle - 1) * cycleLengthDays);
    const cycleEndDate = addDays(cycleStartDate, cycleLengthDays - 1);
    const nextCycleStartDate = addDays(cycleEndDate, 1);
    
    // Calculate progress
    const progressPercentage = (daysIntoCurrentCycle / cycleLengthDays) * 100;
    const isComplete = daysRemainingInCycle <= 0;
    
    return {
      currentCycle,
      totalCycles: currentCycle,
      daysIntoCurrentCycle,
      daysRemainingInCycle: Math.max(0, daysRemainingInCycle),
      cycleStartDate,
      cycleEndDate,
      nextCycleStartDate,
      progressPercentage: Math.min(100, progressPercentage),
      isComplete
    };
  }, [subscriptionData, planConfig]);

  // Calculate selection window information
  const selectionWindow = useMemo((): SelectionWindowInfo | null => {
    if (!subscriptionData || !planConfig || !cycleInfo) return null;

    const today = startOfDay(new Date());
    const cycleEndDate = cycleInfo.cycleEndDate;
    
    // Calculate selection window dates
    const windowOpenDate = addDays(cycleEndDate, -planConfig.selectionWindowStart);
    const windowCloseDate = addDays(cycleEndDate, -planConfig.selectionWindowEnd);
    
    // Calculate days until window events
    const daysUntilOpen = Math.max(0, differenceInDays(windowOpenDate, today));
    const daysUntilClose = Math.max(0, differenceInDays(windowCloseDate, today));
    
    // Determine current status
    const isOpen = today >= windowOpenDate && today <= windowCloseDate;
    const isUpcoming = today < windowOpenDate;
    const isClosed = today > windowCloseDate;
    const isClosingSoon = isOpen && daysUntilClose <= 2;
    
    let status: SelectionWindowInfo['status'] = 'closed';
    let reason = '';
    
    if (subscriptionData.status === 'paused') {
      status = 'closed';
      reason = 'Subscription is paused';
    } else if (subscriptionData.status === 'cancelled') {
      status = 'closed';
      reason = 'Subscription is cancelled';
    } else if (subscriptionData.status === 'expired') {
      status = 'closed';
      reason = 'Subscription has expired';
    } else if (isUpcoming) {
      status = 'upcoming';
      reason = `Opens in ${daysUntilOpen} days`;
    } else if (isClosingSoon) {
      status = 'closing_soon';
      reason = `Closes in ${daysUntilClose} days`;
    } else if (isOpen) {
      status = 'open';
      reason = 'Selection window is open';
    } else if (isClosed) {
      status = 'closed';
      reason = 'Selection window is closed';
    }
    
    return {
      isOpen,
      openDate: windowOpenDate,
      closeDate: windowCloseDate,
      daysUntilOpen,
      daysUntilClose,
      status,
      reason
    };
  }, [subscriptionData, planConfig, cycleInfo]);

  // Core calculation functions
  const getCycleNumber = useCallback((subscriptionDate?: Date): number => {
    if (!subscriptionData || !planConfig) return 1;
    
    const startDate = subscriptionDate || subscriptionData.subscription_start_date;
    const today = startOfDay(new Date());
    const cycleLengthDays = planConfig.cycleLengthDays;
    
    const daysSinceStart = differenceInDays(today, startOfDay(startDate));
    return Math.floor(daysSinceStart / cycleLengthDays) + 1;
  }, [subscriptionData, planConfig]);

  const getCycleProgress = useCallback((subscriptionDate?: Date): number => {
    if (!subscriptionData || !planConfig) return 0;
    
    const startDate = subscriptionDate || subscriptionData.subscription_start_date;
    const today = startOfDay(new Date());
    const cycleLengthDays = planConfig.cycleLengthDays;
    
    const daysSinceStart = differenceInDays(today, startOfDay(startDate));
    const daysIntoCycle = daysSinceStart % cycleLengthDays;
    
    return Math.min(100, (daysIntoCycle / cycleLengthDays) * 100);
  }, [subscriptionData, planConfig]);

  const getSelectionWindow = useCallback((subscriptionDate?: Date): SelectionWindowInfo => {
    if (!subscriptionData || !planConfig) {
      return {
        isOpen: false,
        openDate: new Date(),
        closeDate: new Date(),
        daysUntilOpen: 0,
        daysUntilClose: 0,
        status: 'closed',
        reason: 'No subscription data'
      };
    }

    const startDate = subscriptionDate || subscriptionData.subscription_start_date;
    const cycleNumber = getCycleNumber(startDate);
    const cycleLengthDays = planConfig.cycleLengthDays;
    
    const cycleStartDate = addDays(startOfDay(startDate), (cycleNumber - 1) * cycleLengthDays);
    const cycleEndDate = addDays(cycleStartDate, cycleLengthDays - 1);
    
    const windowOpenDate = addDays(cycleEndDate, -planConfig.selectionWindowStart);
    const windowCloseDate = addDays(cycleEndDate, -planConfig.selectionWindowEnd);
    
    const today = startOfDay(new Date());
    const daysUntilOpen = Math.max(0, differenceInDays(windowOpenDate, today));
    const daysUntilClose = Math.max(0, differenceInDays(windowCloseDate, today));
    
    const isOpen = today >= windowOpenDate && today <= windowCloseDate;
    
    return {
      isOpen,
      openDate: windowOpenDate,
      closeDate: windowCloseDate,
      daysUntilOpen,
      daysUntilClose,
      status: isOpen ? 'open' : (today < windowOpenDate ? 'upcoming' : 'closed'),
      reason: isOpen ? 'Selection window is open' : 
              (today < windowOpenDate ? `Opens in ${daysUntilOpen} days` : 'Selection window is closed')
    };
  }, [subscriptionData, planConfig, getCycleNumber]);

  const getNextCycleDate = useCallback((subscriptionDate?: Date): Date => {
    if (!subscriptionData || !planConfig) return new Date();
    
    const startDate = subscriptionDate || subscriptionData.subscription_start_date;
    const cycleNumber = getCycleNumber(startDate);
    const cycleLengthDays = planConfig.cycleLengthDays;
    
    return addDays(startOfDay(startDate), cycleNumber * cycleLengthDays);
  }, [subscriptionData, planConfig, getCycleNumber]);

  // Utility functions
  const canSelectToys = useCallback((): boolean => {
    if (!subscriptionData || subscriptionData.status !== 'active') return false;
    return selectionWindow?.isOpen || false;
  }, [subscriptionData, selectionWindow]);

  const isSelectionWindowOpen = useCallback((): boolean => {
    return selectionWindow?.isOpen || false;
  }, [selectionWindow]);

  const getDaysUntilNextCycle = useCallback((): number => {
    if (!cycleInfo) return 0;
    return cycleInfo.daysRemainingInCycle;
  }, [cycleInfo]);

  const getCycleTimeline = useCallback(() => {
    if (!subscriptionData || !planConfig || !cycleInfo) return null;

    const cycleLengthDays = planConfig.cycleLengthDays;
    const currentCycle = cycleInfo.currentCycle;
    
    // Historical cycles (last 3)
    const historicalCycles = [];
    for (let i = 1; i <= Math.min(3, currentCycle - 1); i++) {
      const cycleStart = addDays(subscriptionData.subscription_start_date, (currentCycle - 1 - i) * cycleLengthDays);
      const cycleEnd = addDays(cycleStart, cycleLengthDays - 1);
      historicalCycles.push({
        cycleNumber: currentCycle - i,
        startDate: cycleStart,
        endDate: cycleEnd,
        daysAgo: differenceInDays(new Date(), cycleEnd)
      });
    }

    // Future cycles (next 3)
    const futureCycles = [];
    for (let i = 1; i <= 3; i++) {
      const cycleStart = addDays(subscriptionData.subscription_start_date, (currentCycle - 1 + i) * cycleLengthDays);
      const cycleEnd = addDays(cycleStart, cycleLengthDays - 1);
      futureCycles.push({
        cycleNumber: currentCycle + i,
        startDate: cycleStart,
        endDate: cycleEnd,
        daysUntil: differenceInDays(cycleStart, new Date())
      });
    }

    return {
      currentCycle: {
        cycleNumber: currentCycle,
        startDate: cycleInfo.cycleStartDate,
        endDate: cycleInfo.cycleEndDate,
        progress: cycleInfo.progressPercentage
      },
      historicalCycles,
      futureCycles,
      subscriptionStart: subscriptionData.subscription_start_date,
      nextBillingDate: subscriptionData.next_billing_date
    };
  }, [subscriptionData, planConfig, cycleInfo]);

  // Plan-specific functions
  const getPlanFeatures = useCallback((): string[] => {
    return planConfig?.features || [];
  }, [planConfig]);

  const getMaxToysForCycle = useCallback((): number => {
    return planConfig?.maxToysPerCycle || 5;
  }, [planConfig]);

  const getCycleLengthForPlan = useCallback((planId?: string): number => {
    if (!planId) return planConfig?.cycleLengthDays || 30;
    
    const targetPlan = PLAN_CONFIGS[planId] || PLAN_CONFIGS['Discovery Delight'];
    return targetPlan.cycleLengthDays;
  }, [planConfig]);

  // Real-time update functions
  const forceRefresh = useCallback(() => {
    refetchSubscription();
    queryClient.invalidateQueries({ queryKey: ['subscription-cycle'] });
  }, [refetchSubscription, queryClient]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setReadNotifications(prev => new Set(prev).add(notificationId));
  }, []);

  const getUnreadNotifications = useCallback((): CycleNotification[] => {
    return notifications.filter(n => !readNotifications.has(n.timestamp.toISOString()));
  }, [notifications, readNotifications]);

  // State management
  const refreshSubscription = useCallback(async () => {
    try {
      await refetchSubscription();
      if (debugMode) {
        console.log('Subscription data refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
      if (enableNotifications) {
        toast({
          title: 'Refresh Failed',
          description: 'Unable to refresh subscription data',
          variant: 'destructive'
        });
      }
    }
  }, [refetchSubscription, debugMode, enableNotifications, toast]);

  const updateSubscriptionState = useCallback((updates: Partial<SubscriptionData>) => {
    // This would typically update the subscription via API
    // For now, we'll just refresh the data
    console.log('Subscription state update requested:', updates);
    forceRefresh();
  }, [forceRefresh]);

  // Notification system
  useEffect(() => {
    if (!enableNotifications || !subscriptionData || !cycleInfo || !selectionWindow) return;

    const newNotifications: CycleNotification[] = [];
    const now = new Date();

    // Selection window opening soon
    if (selectionWindow.status === 'upcoming' && selectionWindow.daysUntilOpen <= 1) {
      newNotifications.push({
        type: 'selection_window_open',
        title: 'Selection Window Opening Soon',
        message: `Your toy selection window opens in ${selectionWindow.daysUntilOpen} day${selectionWindow.daysUntilOpen !== 1 ? 's' : ''}`,
        priority: 'medium',
        timestamp: now,
        actionRequired: false
      });
    }

    // Selection window closing soon
    if (selectionWindow.status === 'closing_soon' && selectionWindow.daysUntilClose <= 2) {
      newNotifications.push({
        type: 'selection_window_closing',
        title: 'Selection Window Closing Soon',
        message: `Your toy selection window closes in ${selectionWindow.daysUntilClose} day${selectionWindow.daysUntilClose !== 1 ? 's' : ''}`,
        priority: 'high',
        timestamp: now,
        actionRequired: true
      });
    }

    // Cycle completing
    if (cycleInfo.daysRemainingInCycle <= 2 && cycleInfo.daysRemainingInCycle > 0) {
      newNotifications.push({
        type: 'cycle_complete',
        title: 'Cycle Ending Soon',
        message: `Your current cycle ends in ${cycleInfo.daysRemainingInCycle} day${cycleInfo.daysRemainingInCycle !== 1 ? 's' : ''}`,
        priority: 'medium',
        timestamp: now,
        actionRequired: false
      });
    }

    // New cycle starting
    if (cycleInfo.daysRemainingInCycle <= 0) {
      newNotifications.push({
        type: 'cycle_starting',
        title: 'New Cycle Starting',
        message: `Cycle ${cycleInfo.currentCycle + 1} is starting`,
        priority: 'low',
        timestamp: now,
        actionRequired: false
      });
    }

    // Update notifications if there are new ones
    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const existingTimestamps = new Set(prev.map(n => n.timestamp.toISOString()));
        const uniqueNew = newNotifications.filter(n => !existingTimestamps.has(n.timestamp.toISOString()));
        return [...prev, ...uniqueNew].slice(-10); // Keep last 10 notifications
      });
    }
  }, [enableNotifications, subscriptionData, cycleInfo, selectionWindow]);

  // Debug logging
  useEffect(() => {
    if (debugMode && subscriptionData) {
      console.log('useSubscriptionCycle Debug:', {
        subscription: subscriptionData,
        cycleInfo,
        selectionWindow,
        planConfig,
        notifications: notifications.length
      });
    }
  }, [debugMode, subscriptionData, cycleInfo, selectionWindow, planConfig, notifications]);

  // Return the complete result
  return {
    // State
    subscription: subscriptionData,
    cycleInfo,
    selectionWindow,
    notifications,
    planConfig,
    isLoading,
    error: queryError?.message || null,
    lastUpdated: subscriptionData?.updated_at || null,
    
    // Core calculation functions
    getCycleNumber,
    getCycleProgress,
    getSelectionWindow,
    getNextCycleDate,
    
    // Utility functions
    canSelectToys,
    isSelectionWindowOpen,
    getDaysUntilNextCycle,
    getCycleTimeline,
    
    // Plan-specific functions
    getPlanFeatures,
    getMaxToysForCycle,
    getCycleLengthForPlan,
    
    // Real-time update functions
    forceRefresh,
    markNotificationRead,
    getUnreadNotifications,
    
    // State management
    refreshSubscription,
    updateSubscriptionState
  };
};

/**
 * Hook for getting subscription cycle info without automatic refetching
 * Useful for one-time checks or manual triggering
 */
export function useSubscriptionCycleOnce(userId: string | undefined) {
  const [result, setResult] = useState<SubscriptionCycleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCycleInfo = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create a temporary hook instance to get the data
      const tempHook = useSubscriptionCycle({ enableRealTimeUpdates: false });
      setResult(tempHook);
      
      if (tempHook.error) {
        setError(tempHook.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formattedStatus = result ? {
    status: result.subscription?.status || 'unknown',
    currentCycle: result.cycleInfo?.currentCycle || 1,
    progress: result.cycleInfo?.progressPercentage || 0,
    daysRemaining: result.cycleInfo?.daysRemainingInCycle || 0,
    selectionWindow: result.selectionWindow?.status || 'closed',
    planName: result.planConfig?.planId || 'Unknown Plan'
  } : null;

  const canSelectToys = result ? result.canSelectToys() : false;

  return {
    result,
    formattedStatus,
    canSelectToys,
    loading,
    error,
    fetchCycleInfo,
    refetch: fetchCycleInfo
  };
}

/**
 * Hook specifically for checking if a user can select toys
 * Lightweight version for quick checks
 */
export function useCanSelectToys(userId: string | undefined, enabled = true) {
  const { data: canSelect, isLoading } = useQuery({
    queryKey: ['can-select-toys', userId],
    queryFn: async () => {
      if (!userId) return false;
      
      try {
        const { data: userSubscription } = await supabase
          .from('user_subscriptions' as any)
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (!userSubscription) return false;

        const today = new Date();
        const subscriptionStart = new Date(userSubscription.created_at);
        const daysSinceStart = differenceInDays(today, subscriptionStart);
        const cycleDays = 30;
        const daysIntoCycle = daysSinceStart % cycleDays;
        
        // Selection window is typically days 24-30 of cycle
        return daysIntoCycle >= 24 && daysIntoCycle <= 30;
      } catch (error) {
        console.error('Error checking toy selection eligibility:', error);
        return false;
      }
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });

  return {
    canSelectToys: canSelect || false,
    isLoading
  };
}

/**
 * Hook for getting the next important date for a user
 * Useful for displaying countdown timers or notifications
 */
export function useNextImportantDate(userId: string | undefined, enabled = true) {
  const { data: nextDate, isLoading } = useQuery({
    queryKey: ['next-important-date', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      try {
        const { data: userSubscription } = await supabase
          .from('user_subscriptions' as any)
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (!userSubscription) return null;

        const today = new Date();
        const subscriptionStart = new Date(userSubscription.created_at);
        const daysSinceStart = differenceInDays(today, subscriptionStart);
        const cycleDays = 30;
        const currentCycle = Math.floor(daysSinceStart / cycleDays) + 1;
        
        // Calculate next cycle start
        const nextCycleStart = addDays(subscriptionStart, currentCycle * cycleDays);
        
        // Calculate next selection window (typically 6 days before cycle end)
        const nextSelectionWindow = addDays(nextCycleStart, -6);
        
        // Return the closest future date
        const now = new Date();
        if (nextSelectionWindow > now) {
          return {
            date: nextSelectionWindow,
            type: 'selection_window',
            description: 'Next selection window opens'
          };
        } else {
          return {
            date: nextCycleStart,
            type: 'cycle_start',
            description: 'Next cycle starts'
          };
        }
      } catch (error) {
        console.error('Error getting next important date:', error);
        return null;
      }
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });

  return {
    nextDate,
    isLoading
  };
} 