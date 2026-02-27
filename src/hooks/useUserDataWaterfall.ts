import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { supabase } from '@/integrations/supabase/client';
import { StaticWebAppWooCommerceService } from '@/services/staticWebAppWooCommerceService';

export interface UserDataWaterfall {
  userType: 'woocommerce' | 'supabase';
  hasWooCommerceData?: boolean;
  hasSupabaseData: boolean;
  woocommerceData?: any;
  supabaseProfile?: any;
  supabaseSubscription?: any;
  supabaseOrders?: any[];
  hasActiveSubscription?: boolean;
  subscriptionPlan?: string;
  isNewUser: boolean;
}

// Helper function to format phone number for WooCommerce API
const formatPhoneForWooCommerce = (phone: string): string => {
  if (!phone) return '';
  
  // Remove +91 prefix if present to get 10-digit number for WooCommerce
  const cleaned = phone.replace(/^\+91/, '').replace(/[^0-9]/g, '');
  
  // Should be exactly 10 digits for Indian phone numbers
  if (cleaned.length === 10) {
    return cleaned;
  }
  
  console.warn(`⚠️ Phone number format issue: ${phone} -> ${cleaned} (expected 10 digits)`);
  return cleaned;
};

// DISABLED: This hook is disabled to prevent WooCommerce API calls
// The dashboard now uses Supabase-only data via SupabaseOnlyDashboard component

export const useUserDataWaterfall = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['user-data-waterfall-disabled', user?.id],
    queryFn: async () => {
      // Return empty data immediately - no WooCommerce API calls
      console.log('⚠️ useUserDataWaterfall is disabled - use SupabaseOnlyDashboard instead');
      return {
        success: false,
        message: 'WooCommerce API disabled - using Supabase only',
        data: null
      };
    },
    enabled: false, // Completely disable this query
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}; 