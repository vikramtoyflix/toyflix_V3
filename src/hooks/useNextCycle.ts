import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService, CycleEligibility } from '@/services/subscriptionService';
import { NextCycleService, QueueStatus, ToyData } from '@/services/nextCycleService';
import { toast } from 'sonner';

/**
 * Hook to check if user can queue toys for next cycle
 */
export const useQueueEligibility = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['queue-eligibility', userId],
    queryFn: () => userId ? SubscriptionService.checkQueueEligibility(userId) : null,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
};

/**
 * Hook to get queued toys for next cycle
 */
export const useQueuedToys = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['queued-toys', userId],
    queryFn: () => userId ? NextCycleService.getQueuedToys(userId) : null,
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5,    // 5 minutes
  });
};

/**
 * Hook to queue toys for next cycle
 */
export const useQueueToys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      toys,
      shippingAddress,
      specialInstructions
    }: {
      userId: string;
      toys: ToyData[];
      shippingAddress?: any;
      specialInstructions?: string;
    }) => {
      return NextCycleService.queueToysForNextCycle(
        userId,
        toys,
        shippingAddress,
        specialInstructions
      );
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(data.message);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['queued-toys', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['queue-eligibility', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rental-orders', variables.userId] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error('Error queueing toys:', error);
      toast.error('Failed to queue toys for next cycle');
    }
  });
};

/**
 * Hook to update queued toys
 */
export const useUpdateQueuedToys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      toys
    }: {
      userId: string;
      toys: ToyData[];
    }) => {
      return NextCycleService.updateQueuedToys(userId, toys);
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(data.message);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['queued-toys', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rental-orders', variables.userId] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error('Error updating queued toys:', error);
      toast.error('Failed to update queued toys');
    }
  });
};

/**
 * Hook to remove/cancel queued toys
 */
export const useRemoveQueuedToys = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return NextCycleService.removeQueuedToys(userId);
    },
    onSuccess: (data, userId) => {
      if (data.success) {
        toast.success(data.message);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['queued-toys', userId] });
        queryClient.invalidateQueries({ queryKey: ['queue-eligibility', userId] });
        queryClient.invalidateQueries({ queryKey: ['rental-orders', userId] });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error('Error removing queued toys:', error);
      toast.error('Failed to remove queued toys');
    }
  });
};

/**
 * Hook to get subscription details
 */
export const useSubscriptionDetails = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['subscription-details', userId],
    queryFn: () => userId ? SubscriptionService.getSubscriptionDetails(userId) : null,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
};

/**
 * Combined hook for next cycle management
 */
export const useNextCycleManager = (userId: string | undefined) => {
  const eligibility = useQueueEligibility(userId);
  const queuedToys = useQueuedToys(userId);
  const subscriptionDetails = useSubscriptionDetails(userId);
  
  const queueToys = useQueueToys();
  const updateToys = useUpdateQueuedToys();
  const removeToys = useRemoveQueuedToys();

  return {
    // Data
    eligibility: eligibility.data,
    queuedToys: queuedToys.data,
    subscriptionDetails: subscriptionDetails.data,
    
    // Loading states
    isLoadingEligibility: eligibility.isLoading,
    isLoadingQueue: queuedToys.isLoading,
    isLoadingSubscription: subscriptionDetails.isLoading,
    
    // Error states
    eligibilityError: eligibility.error,
    queueError: queuedToys.error,
    subscriptionError: subscriptionDetails.error,
    
    // Actions
    queueToys: queueToys.mutate,
    updateToys: updateToys.mutate,
    removeToys: removeToys.mutate,
    
    // Action states
    isQueueing: queueToys.isPending,
    isUpdating: updateToys.isPending,
    isRemoving: removeToys.isPending,
    
    // Refresh functions
    refreshEligibility: eligibility.refetch,
    refreshQueue: queuedToys.refetch,
    refreshSubscription: subscriptionDetails.refetch,
    
    // Computed properties
    canQueue: eligibility.data?.canQueueToys || false,
    hasQueue: queuedToys.data?.hasQueue || false,
    isEligible: eligibility.data?.isEligible || false,
    hasActiveSubscription: subscriptionDetails.data?.isActive || false,
    
    // Cycle info
    daysUntilNextCycle: eligibility.data?.daysUntilNextCycle || 0,
    currentCycleDays: eligibility.data?.currentCycleDays || 0,
    toyLimit: subscriptionDetails.data?.toyLimit || 0,
    queuedToyCount: queuedToys.data?.toyCount || 0,
  };
}; 