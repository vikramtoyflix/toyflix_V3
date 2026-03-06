import { useState } from 'react';
import { useCustomAuth } from './useCustomAuth';
import { sendOTP, verifyOTP, checkUserStatus } from '@/components/auth/custom-otp/otpService';

export interface HybridUser {
  id: string;
  source: 'woocommerce' | 'supabase';
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  // WooCommerce specific fields (loaded separately)
  wc_user_id?: string;
  address?: {
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  // Metadata for data loading
  has_woocommerce_data?: boolean;
  migration_metadata?: {
    original_wc_id?: string;
    migration_date?: string;
    has_subscription_history?: boolean;
    has_order_history?: boolean;
    detection_method?: string;
  };
}

export const useHybridAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useCustomAuth();

  // User existence check - Supabase only (OTP is sent via 2Factor via send-otp edge function)
  const checkUserExistsSupabase = async (phone: string): Promise<{ exists: boolean; userData?: any }> => {
    try {
      const phoneFormats = [
        phone,
        `+91${phone}`,
        phone.replace(/^\+91/, ''),
        `91${phone}`,
      ];
      const uniqueFormats = [...new Set(phoneFormats)];

      for (const phoneFormat of uniqueFormats) {
        try {
          const result = await checkUserStatus(phoneFormat);
          if (result.success && result.exists) {
            return { exists: true, userData: result };
          }
        } catch {
          // try next format
        }
      }
      return { exists: false };
    } catch {
      return { exists: false };
    }
  };

  // Send OTP via Supabase edge function (2Factor). No WooCommerce.
  const sendHybridOTP = async (phone: string) => {
    try {
      setIsLoading(true);

      // Optional: check if user exists in Supabase (for welcome message only). Skip if check fails to avoid blocking OTP.
      let userExists = false;
      try {
        const userCheck = await checkUserExistsSupabase(phone);
        userExists = userCheck.exists;
      } catch {
        // Proceed to send OTP even if check fails (e.g. CORS on check-user-status)
      }

      const otpResult = await sendOTP(phone);

      if (!otpResult.success) {
        return { success: false, error: otpResult.error?.message || "Failed to send OTP" };
      }

      return {
        success: true,
        developmentOtp: otpResult.developmentOtp,
        userExists,
        userSource: 'supabase' as const
      };

    } catch (error: any) {
      console.error('Error sending hybrid OTP:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and authenticate user (Supabase + 2Factor only; no WooCommerce)
  const verifyHybridOTP = async (phone: string, otp: string, mode: 'signin' | 'signup' = 'signup'): Promise<{
    success: boolean;
    otpVerified?: boolean;
    profileComplete?: boolean;
    user?: HybridUser;
    error?: string;
    message?: string;
  }> => {
    try {
      setIsLoading(true);

      const otpResult = await verifyOTP(phone, otp, mode);

      if (!otpResult.success) {
        throw new Error(otpResult.error?.message || "Invalid OTP");
      }

      if (otpResult.otpVerified && !otpResult.profileComplete) {
        const incompleteUser: HybridUser = {
          ...otpResult.user,
          source: 'supabase',
          has_woocommerce_data: false
        };
        return {
          success: true,
          otpVerified: true,
          profileComplete: false,
          user: incompleteUser,
          message: "Please complete your profile to continue"
        };
      }

      if (!otpResult.session) {
        throw new Error("Authentication failed - no session created");
      }

      const hybridUser: HybridUser = {
        ...otpResult.user,
        source: 'supabase',
        has_woocommerce_data: false,
      };

      setAuth(hybridUser as any, otpResult.session);

      return {
        success: true,
        otpVerified: true,
        profileComplete: true,
        user: hybridUser,
      };
    } catch (error: any) {
      console.error('Error in hybrid OTP verification:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendHybridOTP,
    verifyHybridOTP
  };
};

// Migration status: all users are now native Supabase users.
// WooCommerce was decommissioned; we no longer have a reliable way to detect
// migrated users via heuristics, and the old phone-pattern check was a false
// positive for every Indian user. Always return false so no misleading toasts.
const checkMigrationStatus = async (_user: any): Promise<{
  has_woocommerce_data: boolean;
  metadata: Record<string, never>;
}> => {
  return { has_woocommerce_data: false, metadata: {} };
}; 