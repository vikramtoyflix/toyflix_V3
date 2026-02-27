import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { getWooCommerceService } from '@/config/woocommerceConfig';

// Dynamic service loader that uses the correct service based on configuration
const getServiceInstance = async () => {
  return await getWooCommerceService();
};

/**
 * Hook for testing WooCommerce API connection
 */
export const useWooCommerceHealthCheck = () => {
  return useQuery({
    queryKey: ['woocommerce-health'],
    queryFn: async () => {
      try {
        const service = await getServiceInstance();
        return await service.healthCheck();
      } catch (error: any) {
        console.error('❌ Health check failed:', error.message);
        return { success: false, error: error.message, data: null };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: 2000,
  });
};

/**
 * Hook for getting user by phone
 */
export const useWooCommerceUserByPhone = (phone?: string) => {
  return useQuery({
    queryKey: ['woocommerce-user-by-phone', phone],
    queryFn: async () => {
      if (!phone) throw new Error('Phone number is required');
      
      try {
        const service = await getServiceInstance();
        return await service.getUserByPhone(phone);
      } catch (error: any) {
        console.error('❌ Get user by phone failed:', error.message);
        throw error;
      }
    },
    enabled: !!phone,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook for getting current user's WooCommerce data by their authenticated phone
 */
export const useCurrentUserWooCommerceData = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['current-user-woocommerce', user?.id],
    queryFn: async () => {
      if (!user?.phone) throw new Error('No user phone available');
      
      try {
        const service = await getServiceInstance();
        return await service.getUserByPhone(user.phone);
      } catch (error: any) {
        console.error('❌ Get current user WooCommerce data failed:', error.message);
        throw error;
      }
    },
    enabled: !!user?.phone,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook for getting subscription cycle for a user
 */
export const useWooCommerceSubscriptionCycle = (userId?: number | string) => {
  return useQuery({
    queryKey: ['woocommerce-subscription-cycle', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      try {
        const service = await getServiceInstance();
        const result = await service.getSubscriptionCycle(userId);
        console.log('📦 Subscription cycle result:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Get subscription cycle failed:', error.message);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook for getting order items
 */
export const useWooCommerceOrderItems = (orderId?: number | string) => {
  return useQuery({
    queryKey: ['woocommerce-order-items', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      
      try {
        const service = await getServiceInstance();
        const result = await service.getOrderItems(orderId);
        console.log('🧸 Order items result:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Get order items failed:', error.message);
        throw error;
      }
    },
    enabled: !!orderId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2,
  });
};

/**
 * Hook for getting complete user profile (main hook)
 */
export const useWooCommerceCompleteProfile = (phone?: string) => {
  return useQuery({
    queryKey: ['woocommerce-complete-profile', phone],
    queryFn: async () => {
      if (!phone) throw new Error('Phone number is required');
      
      try {
        const service = await getServiceInstance();
        return await service.getCompleteUserProfile(phone);
      } catch (error: any) {
        console.error('❌ Get complete profile failed:', error.message);
        // Return a failed profile instead of throwing
        return {
          success: false,
          error: error.message,
          user: null,
          subscriptions: [],
          currentToys: []
        };
      }
    },
    enabled: !!phone,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    retryDelay: 2000,
  });
};

/**
 * Hook for getting current authenticated user's complete profile
 */
export const useCurrentUserCompleteProfile = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['current-user-complete-profile', user?.id],
    queryFn: async () => {
      if (!user?.phone) {
        return {
          success: false,
          error: 'No user phone available',
          user: null,
          subscriptions: [],
          currentToys: []
        };
      }
      
      try {
        console.log('🔍 Fetching WooCommerce profile for phone:', user.phone);
        const service = await getServiceInstance();
        
        // Set a shorter timeout for user lookup to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.log('⏰ WooCommerce request timed out for phone:', user.phone);
        }, 8000); // 8 second timeout
        
        const result = await Promise.race([
          service.getCompleteUserProfile(user.phone),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 8000)
          )
        ]);
        
        clearTimeout(timeoutId);
        console.log('✅ WooCommerce profile result:', result.success ? 'SUCCESS' : 'FAILED');
        return result;
        
      } catch (error: any) {
        console.warn('⚠️ WooCommerce profile lookup failed for phone:', user.phone, '- This is normal if user is not from WooCommerce system');
        // Return a failed profile instead of throwing
        return {
          success: false,
          error: error.message.includes('timeout') ? 'User lookup timed out - likely not in WooCommerce system' : error.message,
          user: null,
          subscriptions: [],
          currentToys: []
        };
      }
    },
    enabled: !!user?.phone,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes 
    retry: 1, // Only retry once to prevent multiple hanging requests
    retryDelay: 1000,
  });
};

/**
 * Hook for getting current toys only
 */
export const useCurrentWooCommerceToys = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['current-woocommerce-toys', user?.id],
    queryFn: async () => {
      if (!user?.phone) {
        return [];
      }
      
      try {
        const service = await getServiceInstance();
        const profile = await service.getCompleteUserProfile(user.phone);
        return profile.success ? profile.currentToys : [];
      } catch (error: any) {
        console.error('❌ Get current toys failed:', error.message);
        return [];
      }
    },
    enabled: !!user?.phone,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 2,
  });
};

/**
 * Hook for testing API with mutation (for manual testing)
 */
export const useWooCommerceApiTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (testPhone: string) => {
      try {
        const service = await getServiceInstance();
        // Test by making a simple health check and user lookup
        await service.healthCheck();
        await service.getUserByPhone(testPhone);
        return { success: true };
      } catch (error: any) {
        console.error('❌ API test failed:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries after test
      queryClient.invalidateQueries({ queryKey: ['woocommerce'] });
    },
    onError: (error: any) => {
      console.error('❌ API test mutation failed:', error.message);
    }
  });
};

/**
 * Hook for manual data refresh
 */
export const useRefreshWooCommerceData = () => {
  const queryClient = useQueryClient();
  
  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
    refreshUserData: (phone: string) => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-user-by-phone', phone] });
      queryClient.invalidateQueries({ queryKey: ['woocommerce-complete-profile', phone] });
    },
    refreshSubscriptions: (userId: number | string) => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-subscription-cycle', userId] });
    },
    refreshOrderItems: (orderId: number | string) => {
      queryClient.invalidateQueries({ queryKey: ['woocommerce-order-items', orderId] });
    }
  };
};

/**
 * Combined hook that provides everything you need for WooCommerce integration
 */
interface UserProfile {
  success: boolean;
  user: any;
  subscriptions: any[];
  currentToys: any[];
  error?: string;
}

export const useWooCommerceIntegration = () => {
  const { user } = useCustomAuth();
  const completeProfile = useCurrentUserCompleteProfile();
  const refresh = useRefreshWooCommerceData();
  const apiTest = useWooCommerceApiTest();
  const healthCheck = useWooCommerceHealthCheck();

  // Extract data safely from the profile response
  const profileData = completeProfile.data as UserProfile | undefined;
  const hasValidData = profileData?.success === true;
  


  return {
    // Data
    user,
    profile: profileData,
    currentToys: hasValidData ? (profileData.currentToys || []) : [],
    subscriptions: hasValidData ? (profileData.subscriptions || []) : [],
    wcUser: hasValidData ? profileData.user : null,
    
    // States
    isLoading: completeProfile.isLoading,
    isError: completeProfile.isError || (profileData && !profileData.success),
    error: completeProfile.error || (profileData?.error ? { message: profileData.error } : null),
    hasWooCommerceData: hasValidData,
    isHealthy: healthCheck.data?.success || false,
    
    // Actions
    refresh: refresh.refreshAll,
    testApi: apiTest.mutate,
    isTestingApi: apiTest.isPending,
    
    // Raw query objects for advanced usage
    completeProfileQuery: completeProfile,
    healthCheckQuery: healthCheck,
  };
};

/**
 * Simple hook to check if user has WooCommerce data
 */
export const useHasWooCommerceData = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['has-woocommerce-data', user?.id],
    queryFn: async () => {
      if (!user?.phone) {
        return false;
      }
      
      try {
        const service = await getServiceInstance();
        const userData = await service.getUserByPhone(user.phone);
        return !!userData?.success;
      } catch (error: any) {
        console.warn('⚠️ WooCommerce data check failed:', error.message);
        return false;
      }
    },
    enabled: !!user?.phone,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1, // Only retry once for this check
  });
}; 