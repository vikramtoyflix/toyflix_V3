import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';

// DISABLED: All WooCommerce hooks disabled to prevent API calls
// The dashboard now uses Supabase-only data via SupabaseOnlyDashboard component

// Environment-aware WooCommerce integration hook
export const useEnvironmentWooCommerceIntegration = () => {
  const { user } = useCustomAuth();

  const query = useQuery({
    queryKey: ['woocommerce-integration-disabled', user?.phone],
    queryFn: async () => {
      console.log('⚠️ useEnvironmentWooCommerceIntegration is disabled - use SupabaseOnlyDashboard instead');
      return null;
    },
    enabled: false, // Completely disable this query
    staleTime: Infinity,
    gcTime: 0,
    retry: false
  });

  return {
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    refetch: query.refetch,
    
    // Environment info
    environment: 'disabled',
    service: 'disabled',
    endpoint: 'disabled',
    
    // Convenience getters
    user: null,
    subscriptions: [],
    currentToys: [],
    hasWooCommerceData: false,
    
    // Status helpers
    isLocalhost: false,
    isProduction: false
  };
};

// Environment-aware hook for checking WooCommerce data availability
export const useHasEnvironmentWooCommerceData = () => {
  const { user } = useCustomAuth();

  const query = useQuery({
    queryKey: ['has-woocommerce-data-disabled', user?.phone],
    queryFn: async () => {
      console.log('⚠️ useHasEnvironmentWooCommerceData is disabled - use SupabaseOnlyDashboard instead');
      return { hasData: false, reason: 'WooCommerce API disabled' };
    },
    enabled: false, // Completely disable this query
    staleTime: Infinity,
    gcTime: 0,
    retry: false
  });

  return {
    hasData: false,
    reason: 'WooCommerce API disabled',
    isLoading: false,
    isError: false,
    error: null,
    refetch: query.refetch,
    
    // Environment info
    environment: 'disabled',
    service: 'disabled'
  };
};

// Environment-aware user orders hook
export const useEnvironmentUserOrders = (userId?: string) => {
  const query = useQuery({
    queryKey: ['user-orders-disabled', userId],
    queryFn: async () => {
      console.log('⚠️ useEnvironmentUserOrders is disabled - use SupabaseOnlyDashboard instead');
      return [];
    },
    enabled: false, // Completely disable this query
    staleTime: Infinity,
    gcTime: 0,
    retry: false
  });

  return {
    orders: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: query.refetch,
    
    // Environment info
    environment: 'disabled',
    service: 'disabled'
  };
};

// Environment-aware user subscriptions hook
export const useEnvironmentUserSubscriptions = (userId?: string) => {
  const query = useQuery({
    queryKey: ['user-subscriptions-disabled', userId],
    queryFn: async () => {
      console.log('⚠️ useEnvironmentUserSubscriptions is disabled - use SupabaseOnlyDashboard instead');
      return [];
    },
    enabled: false, // Completely disable this query
    staleTime: Infinity,
    gcTime: 0,
    retry: false
  });

  return {
    subscriptions: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: query.refetch,
    
    // Environment info
    environment: 'disabled',
    service: 'disabled'
  };
}; 