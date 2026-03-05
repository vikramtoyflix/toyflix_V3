import { useState } from 'react';
import { useCustomAuth } from './useCustomAuth';
import { sendOTP, verifyOTP, checkUserStatus } from '@/components/auth/custom-otp/otpService';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
        throw new Error(otpResult.error?.message || "Failed to send OTP");
      }

      toast({
        title: "OTP Sent! 📱",
        description: userExists ? `Welcome back! OTP sent to ${phone}` : `Welcome to Toyflix! OTP sent to ${phone}`,
      });

      return {
        success: true,
        developmentOtp: otpResult.developmentOtp,
        userExists,
        userSource: 'supabase' as const
      };

    } catch (error: any) {
      console.error('Error sending hybrid OTP:', error);
      toast({
        title: "Failed to send OTP",
        description: error.message,
        variant: "destructive",
      });
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

      const migrationInfo = await checkMigrationStatus(otpResult.user);
      const hybridUser: HybridUser = {
        ...otpResult.user,
        source: migrationInfo.has_woocommerce_data ? 'woocommerce' : 'supabase',
        has_woocommerce_data: migrationInfo.has_woocommerce_data,
        migration_metadata: migrationInfo.metadata,
      };

      setAuth(hybridUser as any, otpResult.session);
      toast({
        title: migrationInfo.has_woocommerce_data ? "Welcome back!" : "Welcome!",
        description: migrationInfo.has_woocommerce_data
          ? "Successfully signed in. Loading your historical data..."
          : "Successfully signed in to your account.",
      });

      return { success: true, user: hybridUser };
    } catch (error: any) {
      console.error('Error in hybrid OTP verification:', error);
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
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

// Enhanced migration status checker based on your migration client patterns
const checkMigrationStatus = async (user: any): Promise<{
  has_woocommerce_data: boolean;
  metadata: {
    original_wc_id?: string;
    migration_date?: string;
    has_subscription_history?: boolean;
    has_order_history?: boolean;
    detection_method?: string;
  };
}> => {
  try {
    console.log('🔍 Checking migration status for user:', user.id);
    
    // Strategy 1: Check by registration date (users before migration)
    const migrationDate = new Date('2024-06-01'); // Adjust to your actual migration date
    const userCreatedDate = new Date(user.created_at);
    
    if (userCreatedDate < migrationDate) {
      console.log('✅ User created before migration - likely migrated from WooCommerce');
      return {
        has_woocommerce_data: true,
        metadata: {
          migration_date: migrationDate.toISOString(),
          detection_method: 'creation_date',
          has_subscription_history: true, // Assume yes for pre-migration users
          has_order_history: true
        }
      };
    }

    // Strategy 2: Check for WooCommerce-style metadata patterns
    // Based on your migration client, WooCommerce users have specific patterns:
    
    // Check if user has billing address data (indicates WooCommerce origin)
    if (user.address_line1 || user.city || user.zip_code) {
      console.log('✅ User has address data - likely migrated from WooCommerce');
      return {
        has_woocommerce_data: true,
        metadata: {
          detection_method: 'address_data',
          has_subscription_history: true,
          has_order_history: true
        }
      };
    }

    // Strategy 3: Check phone number patterns
    // Your migration client shows billing_phone is key field
    if (user.phone && user.phone.length === 10 && !user.phone.startsWith('+')) {
      // Indian phone numbers without country code suggest WooCommerce migration
      const phonePattern = /^[6-9]\d{9}$/; // Indian mobile pattern
      if (phonePattern.test(user.phone)) {
        console.log('✅ User has Indian phone pattern - likely migrated from WooCommerce');
        return {
          has_woocommerce_data: true,
          metadata: {
            detection_method: 'phone_pattern',
            has_subscription_history: true,
            has_order_history: true
          }
        };
      }
    }

    // Strategy 4: Check for subscription-related metadata
    // If user has subscription_plan or subscription_active fields
    if (user.subscription_plan || user.subscription_active !== undefined) {
      console.log('✅ User has subscription metadata - likely migrated from WooCommerce');
      return {
        has_woocommerce_data: true,
        metadata: {
          detection_method: 'subscription_metadata',
          has_subscription_history: true,
          has_order_history: true
        }
      };
    }

    // Strategy 5: Check for specific user ID patterns
    // If your migration preserved WooCommerce IDs in a specific range or pattern
    const userId = parseInt(user.id.replace(/\D/g, ''));
    if (userId && userId < 10000) { // Assuming WooCommerce users have lower IDs
      console.log('✅ User has low ID number - likely migrated from WooCommerce');
      return {
        has_woocommerce_data: true,
        metadata: {
          original_wc_id: userId.toString(),
          detection_method: 'user_id_pattern',
          has_subscription_history: true,
          has_order_history: true
        }
      };
    }

    console.log('ℹ️ User appears to be new Supabase user');
    return {
      has_woocommerce_data: false,
      metadata: {
        detection_method: 'new_user',
        has_subscription_history: false,
        has_order_history: false
      }
    };
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    // Default to false (new user) if unsure
    return {
      has_woocommerce_data: false,
      metadata: {
        detection_method: 'error_fallback',
        has_subscription_history: false,
        has_order_history: false
      }
    };
  }
}; 