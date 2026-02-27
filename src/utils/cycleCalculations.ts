import { differenceInDays, addDays, startOfDay } from 'date-fns';

/**
 * Standardized cycle day calculation
 * This should match the database function get_current_cycle_day()
 */
export const calculateCycleDay = (
  startDate: Date | string | null | undefined, 
  currentDate: Date = new Date()
): number => {
  // ✅ FIX: Handle null/undefined start dates
  if (!startDate) {
    console.warn('calculateCycleDay: No start date provided, returning day 1');
    return 1;
  }

  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    
    // Validate the date
    if (isNaN(start.getTime())) {
      console.warn('calculateCycleDay: Invalid start date provided, returning day 1');
      return 1;
    }

    const current = startOfDay(currentDate);
    const startDay = startOfDay(start);
    
    const daysSinceStart = differenceInDays(current, startDay);
    return Math.max(1, daysSinceStart + 1); // Day 1 is the first day, never less than 1
  } catch (error) {
    console.error('calculateCycleDay: Error calculating cycle day:', error);
    return 1;
  }
};

/**
 * Check if selection window should be open based on cycle day
 * Selection window is open on days 24-34 (11 days total)
 */
export const isSelectionWindowOpen = (cycleDay: number): boolean => {
  return cycleDay >= 24 && cycleDay <= 34;
};

/**
 * Calculate days until selection window opens
 */
export const getDaysUntilSelectionOpens = (cycleDay: number): number => {
  if (cycleDay >= 24) return 0; // Already open or past
  return 24 - cycleDay;
};

/**
 * Calculate days until selection window closes
 */
export const getDaysUntilSelectionCloses = (cycleDay: number): number => {
  if (cycleDay < 24) return 34 - cycleDay; // Not open yet, return total days until close
  if (cycleDay <= 34) return 34 - cycleDay; // Currently open, return days until close
  return 0; // Already closed
};

/**
 * Get selection window status with manual override support
 */
export const getSelectionWindowStatus = (
  cycleDay: number,
  manualControl?: boolean,
  manualStatus?: string
): {
  isOpen: boolean;
  status: 'open' | 'closed';
  reason: string;
  daysUntilOpens: number;
  daysUntilCloses: number;
} => {
  // 🐛 DEBUG: Log manual control status
  if (manualControl) {
    console.log('🔍 [SelectionWindow] Manual control detected:', {
      manualControl,
      manualStatus,
      cycleDay,
      expectedStatus: 'manual_open',
      actualMatch: manualStatus === 'manual_open',
      normalizedMatch: manualStatus === 'open'
    });
  }

  // Handle manual control first
  if (manualControl) {
    // 🐛 FIX: Accept both 'manual_open' and 'open' (normalized from SubscriptionService)
    const isManuallyOpen = manualStatus === 'manual_open' || manualStatus === 'open';
    
    console.log('🔍 [SelectionWindow] Manual control result:', {
      isManuallyOpen,
      reason: isManuallyOpen ? 'Selection manually opened by admin' : 'Selection manually closed by admin'
    });
    
    return {
      isOpen: isManuallyOpen,
      status: isManuallyOpen ? 'open' : 'closed',
      reason: isManuallyOpen
        ? 'Selection manually opened by admin'
        : 'Selection manually closed by admin',
      daysUntilOpens: isManuallyOpen ? 0 : getDaysUntilSelectionOpens(cycleDay),
      daysUntilCloses: isManuallyOpen ? getDaysUntilSelectionCloses(cycleDay) : 0
    };
  }

  // Auto logic: Day 24-34
  const isOpen = isSelectionWindowOpen(cycleDay);
  const daysUntilOpens = getDaysUntilSelectionOpens(cycleDay);
  const daysUntilCloses = getDaysUntilSelectionCloses(cycleDay);

  let reason: string;
  if (isOpen) {
    reason = `Selection window open (Day ${cycleDay})`;
  } else if (cycleDay < 24) {
    reason = `Selection opens in ${daysUntilOpens} days (Day 24)`;
  } else {
    reason = 'Selection window closed for this cycle';
  }

  return {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    reason,
    daysUntilOpens,
    daysUntilCloses
  };
};

/**
 * Calculate cycle progress percentage
 */
export const calculateCycleProgress = (cycleDay: number, cycleDays: number = 30): number => {
  return Math.min(100, Math.max(0, (cycleDay / cycleDays) * 100));
};

/**
 * Get next cycle start date
 */
export const getNextCycleStartDate = (
  subscriptionStart: Date | string | null | undefined,
  cycleDays: number = 30
): Date => {
  if (!subscriptionStart) {
    // Return a date 30 days from now as fallback
    return addDays(new Date(), cycleDays);
  }

  try {
    const start = typeof subscriptionStart === 'string' ? new Date(subscriptionStart) : subscriptionStart;
    if (isNaN(start.getTime())) {
      return addDays(new Date(), cycleDays);
    }

    const currentCycleDay = calculateCycleDay(start);
    const daysUntilNextCycle = cycleDays - ((currentCycleDay - 1) % cycleDays);
    
    return addDays(new Date(), daysUntilNextCycle);
  } catch (error) {
    console.error('getNextCycleStartDate: Error calculating next cycle start:', error);
    return addDays(new Date(), cycleDays);
  }
};

/**
 * Get current cycle number (1-based)
 */
export const getCurrentCycleNumber = (
  subscriptionStart: Date | string | null | undefined,
  cycleDays: number = 30
): number => {
  if (!subscriptionStart) {
    return 1; // Default to cycle 1 if no start date
  }

  try {
    const cycleDay = calculateCycleDay(subscriptionStart);
    return Math.floor((cycleDay - 1) / cycleDays) + 1;
  } catch (error) {
    console.error('getCurrentCycleNumber: Error calculating cycle number:', error);
    return 1;
  }
};

/**
 * Validate and normalize selection window data from different sources
 */
export const normalizeSelectionWindowData = (data: {
  rental_start_date?: string | Date;
  current_cycle_day?: number;
  selection_window_status?: string;
  manual_selection_control?: boolean;
  subscription_status?: string;
}): {
  cycleDay: number;
  isOpen: boolean;
  status: 'open' | 'closed';
  reason: string;
  daysUntilOpens: number;
  daysUntilCloses: number;
  source: 'calculated' | 'provided' | 'error';
} => {
  try {
    // Use provided cycle day if available, otherwise calculate
    let cycleDay: number;
    let source: 'calculated' | 'provided' | 'error' = 'error';

    if (data.current_cycle_day && data.current_cycle_day > 0) {
      cycleDay = data.current_cycle_day;
      source = 'provided';
    } else if (data.rental_start_date) {
      cycleDay = calculateCycleDay(data.rental_start_date);
      source = 'calculated';
    } else {
      // No valid data
      return {
        cycleDay: 1,
        isOpen: false,
        status: 'closed',
        reason: 'No subscription data available',
        daysUntilOpens: 0,
        daysUntilCloses: 0,
        source: 'error'
      };
    }

    // Get selection window status
    const windowStatus = getSelectionWindowStatus(
      cycleDay,
      data.manual_selection_control,
      data.selection_window_status
    );

    return {
      cycleDay,
      ...windowStatus,
      source
    };
  } catch (error) {
    console.error('Error normalizing selection window data:', error);
    return {
      cycleDay: 1,
      isOpen: false,
      status: 'closed',
      reason: 'Error calculating selection window status',
      daysUntilOpens: 0,
      daysUntilCloses: 0,
      source: 'error'
    };
  }
};

/**
 * Debug helper to log cycle calculations
 */
export const debugCycleCalculations = (
  subscriptionStart: Date | string | null | undefined,
  label: string = 'Cycle Debug'
): void => {
  // ✅ FIX: Handle undefined/null subscription start dates
  if (!subscriptionStart) {
    console.log(`🔍 ${label}:`, {
      subscriptionStart: 'undefined/null',
      error: 'No subscription start date available',
      cycleDay: 'N/A',
      selectionWindow: 'N/A'
    });
    return;
  }

  try {
    const cycleDay = calculateCycleDay(subscriptionStart);
    const windowStatus = getSelectionWindowStatus(cycleDay);
    const cycleNumber = getCurrentCycleNumber(subscriptionStart);
    const progress = calculateCycleProgress(cycleDay);

    console.log(`🔍 ${label}:`, {
      subscriptionStart: typeof subscriptionStart === 'string' 
        ? subscriptionStart 
        : subscriptionStart.toISOString().split('T')[0],
      cycleDay,
      cycleNumber,
      progress: `${Math.round(progress)}%`,
      selectionWindow: {
        isOpen: windowStatus.isOpen,
        reason: windowStatus.reason,
        daysUntilOpens: windowStatus.daysUntilOpens,
        daysUntilCloses: windowStatus.daysUntilCloses
      }
    });
  } catch (error) {
    console.error(`❌ ${label} - Error in debug calculations:`, error);
    console.log(`🔍 ${label}:`, {
      subscriptionStart: subscriptionStart,
      error: 'Failed to calculate cycle data',
      details: error
    });
  }
};

// Export types for TypeScript
export interface SelectionWindowStatus {
  isOpen: boolean;
  status: 'open' | 'closed';
  reason: string;
  daysUntilOpens: number;
  daysUntilCloses: number;
}

export interface CycleData {
  cycleDay: number;
  cycleNumber: number;
  progress: number;
  selectionWindow: SelectionWindowStatus;
  nextCycleStart: Date;
}

/**
 * Get complete cycle data for a subscription
 */
export const getCompleteCycleData = (
  subscriptionStart: Date | string | null | undefined,
  manualControl?: boolean,
  manualStatus?: string
): CycleData => {
  if (!subscriptionStart) {
    // Return default cycle data if no start date
    return {
      cycleDay: 1,
      cycleNumber: 1,
      progress: 0,
      selectionWindow: {
        isOpen: false,
        status: 'closed',
        reason: 'No subscription start date available',
        daysUntilOpens: 0,
        daysUntilCloses: 0
      },
      nextCycleStart: addDays(new Date(), 30)
    };
  }

  try {
    const cycleDay = calculateCycleDay(subscriptionStart);
    const cycleNumber = getCurrentCycleNumber(subscriptionStart);
    const progress = calculateCycleProgress(cycleDay);
    const selectionWindow = getSelectionWindowStatus(cycleDay, manualControl, manualStatus);
    const nextCycleStart = getNextCycleStartDate(subscriptionStart);

    return {
      cycleDay,
      cycleNumber,
      progress,
      selectionWindow,
      nextCycleStart
    };
  } catch (error) {
    console.error('getCompleteCycleData: Error calculating cycle data:', error);
    // Return safe defaults
    return {
      cycleDay: 1,
      cycleNumber: 1,
      progress: 0,
      selectionWindow: {
        isOpen: false,
        status: 'closed',
        reason: 'Error calculating cycle data',
        daysUntilOpens: 0,
        daysUntilCloses: 0
      },
      nextCycleStart: addDays(new Date(), 30)
    };
  }
};
