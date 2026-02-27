import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { toast } from 'sonner';
import { 
  SubscriptionSelectionService, 
  SubscriptionSelectionWindow, 
  SubscriptionSelectionRules, 
  SubscriptionCycleData, 
  SelectionNotification 
} from '@/services/subscriptionSelectionService';

interface UseSubscriptionSelectionOptions {
  enableNotifications?: boolean;
  enableRealTimeUpdates?: boolean;
  refetchInterval?: number;
  onSelectionWindowChange?: (window: SubscriptionSelectionWindow) => void;
  onNotification?: (notification: SelectionNotification) => void;
}

interface UseSubscriptionSelectionReturn {
  // Core data
  cycleData: SubscriptionCycleData | null;
  selectionWindow: SubscriptionSelectionWindow | null;
  selectionRules: SubscriptionSelectionRules | null;
  notifications: SelectionNotification[];
  
  // Computed states
  canSelectToys: boolean;
  isSelectionUrgent: boolean;
  isSelectionCritical: boolean;
  timeUntilAction: string;
  selectionStatus: string;
  selectionMessage: string;
  
  // Loading states
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  
  // Actions
  refreshData: () => Promise<void>;
  handleEdgeCase: (scenario: string) => Promise<SubscriptionSelectionWindow>;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  
  // Utilities
  formatTimeRemaining: (days: number, hours: number) => string;
  getActionButtons: () => Array<{
    label: string;
    action: string;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export const useSubscriptionSelection = (
  options: UseSubscriptionSelectionOptions = {}
): UseSubscriptionSelectionReturn => {
  const { user } = useCustomAuth();
  const [notifications, setNotifications] = useState<SelectionNotification[]>([]);
  const [lastNotificationCheck, setLastNotificationCheck] = useState<Date>(new Date());
  
  const {
    enableNotifications = true,
    enableRealTimeUpdates = true,
    refetchInterval = 5 * 60 * 1000, // 5 minutes
    onSelectionWindowChange,
    onNotification
  } = options;

  const selectionService = SubscriptionSelectionService.getInstance();

  // Main data query
  const {
    data: selectionData,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ['subscription-selection', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID is required');

      const [cycleData, selectionWindow, selectionRules] = await Promise.all([
        selectionService.getSubscriptionCycleData(user.id),
        selectionService.calculateSelectionWindow(user.id),
        selectionService.getSelectionRules(user.id)
      ]);

      return {
        cycleData,
        selectionWindow,
        selectionRules
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: enableRealTimeUpdates ? refetchInterval : false,
    retry: 2,
    onSuccess: (data) => {
      // Check for selection window changes
      if (onSelectionWindowChange && data.selectionWindow) {
        onSelectionWindowChange(data.selectionWindow);
      }
    },
    onError: (error) => {
      console.error('Error fetching subscription selection data:', error);
      toast.error('Failed to load selection status');
    }
  });

  // Notifications query
  const { data: newNotifications } = useQuery({
    queryKey: ['selection-notifications', user?.id, lastNotificationCheck],
    queryFn: async () => {
      if (!user?.id || !enableNotifications) return [];
      return selectionService.generateSelectionNotifications(user.id);
    },
    enabled: !!user?.id && enableNotifications,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: enableNotifications ? 60 * 1000 : false // Check every minute
  });

  // Update notifications when new ones arrive
  useEffect(() => {
    if (newNotifications && newNotifications.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        
        // Show toast notifications for new critical/urgent notifications
        uniqueNew.forEach(notification => {
          if (notification.priority === 'critical' || notification.priority === 'high') {
            toast.warning(notification.title, {
              description: notification.message,
              action: notification.actionText ? {
                label: notification.actionText,
                onClick: () => {
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                }
              } : undefined,
              duration: 10000 // 10 seconds for critical notifications
            });
          }
          
          if (onNotification) {
            onNotification(notification);
          }
        });
        
        return [...prev, ...uniqueNew];
      });
    }
  }, [newNotifications, onNotification]);

  // Computed values
  const cycleData = selectionData?.cycleData || null;
  const selectionWindow = selectionData?.selectionWindow || null;
  const selectionRules = selectionData?.selectionRules || null;
  
  const canSelectToys = selectionWindow?.isOpen || false;
  const isSelectionUrgent = selectionWindow?.priority === 'urgent' || false;
  const isSelectionCritical = selectionWindow?.priority === 'critical' || false;
  
  // Format time remaining
  const formatTimeRemaining = useCallback((days: number, hours: number): string => {
    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    } else if (hours > 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    return 'Soon';
  }, []);

  // Get time until next action
  const timeUntilAction = selectionWindow ? 
    selectionWindow.isOpen ? 
      formatTimeRemaining(selectionWindow.closesInDays, selectionWindow.closesInHours) :
      formatTimeRemaining(selectionWindow.opensInDays, selectionWindow.opensInHours) :
    'Unknown';

  // Get selection status and message
  const selectionStatus = selectionWindow?.status || 'unknown';
  const selectionMessage = selectionWindow?.reason || 'Unable to determine selection status';

  // Action buttons based on current state
  const getActionButtons = useCallback(() => {
    const buttons: Array<{
      label: string;
      action: string;
      variant: 'default' | 'destructive' | 'outline' | 'secondary';
      priority: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    if (!selectionWindow) return buttons;

    if (selectionWindow.allowedActions.includes('select_toys')) {
      buttons.push({
        label: isSelectionCritical ? 'Select Toys Urgently' : 'Select Toys',
        action: 'select_toys',
        variant: isSelectionCritical ? 'destructive' : 'default',
        priority: selectionWindow.priority
      });
    }



    if (selectionWindow.allowedActions.includes('contact_support')) {
      buttons.push({
        label: 'Contact Support',
        action: 'contact_support',
        variant: 'secondary',
        priority: 'low'
      });
    }

    // Removed: Plan Future Cycles button - not needed per user request

    return buttons.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [selectionWindow, isSelectionCritical]);

  // Actions
  const refreshData = useCallback(async () => {
    await refetch();
    setLastNotificationCheck(new Date());
  }, [refetch]);

  const handleEdgeCase = useCallback(async (scenario: string) => {
    if (!user?.id) throw new Error('User ID is required');
    
    const result = await selectionService.handleEdgeCases(user.id, scenario);
    
    // Show toast notification for edge case handling
    toast.success('Selection window updated', {
      description: result.reason,
      duration: 5000
    });
    
    // Refresh data to reflect changes
    await refreshData();
    
    return result;
  }, [user?.id, selectionService, refreshData]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    // Core data
    cycleData,
    selectionWindow,
    selectionRules,
    notifications,
    
    // Computed states
    canSelectToys,
    isSelectionUrgent,
    isSelectionCritical,
    timeUntilAction,
    selectionStatus,
    selectionMessage,
    
    // Loading states
    isLoading,
    isRefetching,
    error,
    
    // Actions
    refreshData,
    handleEdgeCase,
    markNotificationRead,
    clearNotifications,
    
    // Utilities
    formatTimeRemaining,
    getActionButtons
  };
};

// Specialized hook for quick selection availability check
export const useCanSelectToys = (userId?: string) => {
  const { user } = useCustomAuth();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: ['can-select-toys', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return false;
      
      const selectionService = SubscriptionSelectionService.getInstance();
      const window = await selectionService.calculateSelectionWindow(targetUserId);
      
      return window.isOpen;
    },
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    retry: 1
  });
};

// Specialized hook for selection window notifications only
export const useSelectionNotifications = (userId?: string) => {
  const { user } = useCustomAuth();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: ['selection-notifications-only', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const selectionService = SubscriptionSelectionService.getInstance();
      return selectionService.generateSelectionNotifications(targetUserId);
    },
    enabled: !!targetUserId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // 1 minute
    retry: 1
  });
};

export default useSubscriptionSelection; 