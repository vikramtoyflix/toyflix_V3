import { useState } from 'react';
import { useCustomAuth } from './useCustomAuth';
import { sendOTP, verifyOTP, checkUserStatus } from '@/components/auth/custom-otp/otpService';
import { useToast } from '@/hooks/use-toast';
import { getWooCommerceService } from '@/config/environmentWooCommerceConfig';

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

  // NEW: Waterfall user existence check - WooCommerce first, then Supabase
  const checkUserExistsWaterfall = async (phone: string): Promise<{ 
    exists: boolean; 
    source: 'woocommerce' | 'supabase' | null;
    userData?: any;
  }> => {
    try {
      console.log('🔍 Waterfall user check for phone:', phone);
      
      // STEP 1: Check WooCommerce first
      try {
        console.log('1️⃣ Checking WooCommerce for user...');
        const wooCommerceService = getWooCommerceService();
        const wcUser = await wooCommerceService.getUserByPhone(phone);
        
        if (wcUser?.success && wcUser?.data) {
          console.log('✅ User found in WooCommerce:', wcUser.data.ID);
          return { 
            exists: true, 
            source: 'woocommerce',
            userData: wcUser.data 
          };
        }
        console.log('❌ User not found in WooCommerce');
      } catch (wcError) {
        console.log('❌ WooCommerce check failed:', wcError);
      }

      // STEP 2: Check Supabase custom_users table with multiple phone formats
      console.log('2️⃣ Checking Supabase custom_users...');
      
      // Try multiple phone formats to handle different storage patterns
      const phoneFormats = [
        phone,                           // Original format (e.g., "8595968253")
        `+91${phone}`,                   // With +91 prefix (e.g., "+918595968253") 
        phone.replace(/^\+91/, ''),      // Without +91 prefix
        `91${phone}`,                    // With 91 prefix (no +)
      ];
      
      // Remove duplicates
      const uniqueFormats = [...new Set(phoneFormats)];
      console.log('🔍 Trying phone formats:', uniqueFormats);
      
      for (const phoneFormat of uniqueFormats) {
        try {
          const result = await checkUserStatus(phoneFormat);
          
          if (result.success && result.exists) {
            console.log(`✅ User found in Supabase custom_users with format "${phoneFormat}":`, result.userId);
            return { 
              exists: true, 
              source: 'supabase',
              userData: result 
            };
          }
        } catch (error) {
          console.log(`❌ Error checking phone format "${phoneFormat}":`, error.message);
        }
      }

      console.log('❌ User not found in Supabase custom_users with any phone format');
      return { exists: false, source: null };

    } catch (error) {
      console.error('Error in waterfall user check:', error);
      return { exists: false, source: null };
    }
  };

  // Send OTP (with waterfall user detection)
  // CRITICAL: Send OTP immediately - don't wait for user check (was causing ~10s delay)
  const sendHybridOTP = async (phone: string) => {
    try {
      setIsLoading(true);

      // Fire OTP and user check in parallel - OTP sends first, user check for welcome message
      const otpPromise = sendOTP(phone);
      const userCheckPromise = checkUserExistsWaterfall(phone);

      const otpResult = await otpPromise;
      if (!otpResult.success) {
        throw new Error(otpResult.error?.message || "Failed to send OTP");
      }

      // Show success immediately - don't wait for user check
      toast({
        title: "OTP Sent! 📱",
        description: "Check your phone for the verification code.",
      });
      setIsLoading(false);

      // Resolve user check in background for any future use (welcome message was redundant)
      const userCheck = await userCheckPromise;

      return {
        success: true,
        developmentOtp: otpResult.developmentOtp,
        userExists: userCheck.exists,
        userSource: userCheck.source
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

  // Verify OTP and authenticate user (with waterfall logic)
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
      console.log('🔍 Waterfall hybrid OTP verification for:', phone);

      // Check user source again (in case it changed)
      const userCheck = await checkUserExistsWaterfall(phone);

      if (userCheck.exists && userCheck.source === 'woocommerce') {
        // WooCommerce user - create/sync to Supabase and authenticate
        console.log('👤 WooCommerce user - creating Supabase profile...');
        
        // Use existing verifyOTP which will create the user in custom_users if needed
        const otpResult = await verifyOTP(phone, otp, mode);
        console.log('🔍 DEBUG: OTP result for WooCommerce user:', {
          success: otpResult.success,
          otpVerified: otpResult.otpVerified,
          profileComplete: otpResult.profileComplete,
          hasSession: !!otpResult.session,
          hasUser: !!otpResult.user
        });
        
        if (!otpResult.success) {
          throw new Error(otpResult.error?.message || "Invalid OTP");
        }

        // Check if profile is complete
        if (otpResult.otpVerified && !otpResult.profileComplete) {
          console.log('🔍 ✅ WooCommerce user PROFILE INCOMPLETE - Returning early without authentication');
          
          // Create minimal hybrid user for incomplete profile
          const incompleteUser: HybridUser = {
            ...otpResult.user,
            source: 'woocommerce',
            has_woocommerce_data: true
          };
          
          return { 
            success: true, 
            otpVerified: true,
            profileComplete: false,
            user: incompleteUser,
            message: "Please complete your profile to continue"
          };
        }

        // Create hybrid user object with WooCommerce data
        const wcUserData = userCheck.userData;
        const hybridUser: HybridUser = {
          ...otpResult.user,
          source: 'woocommerce',
          wc_user_id: wcUserData.ID?.toString(),
          has_woocommerce_data: true,
          // Merge WooCommerce data
          email: wcUserData.user_email || otpResult.user.email,
          first_name: wcUserData.billing_first_name || wcUserData.first_name || otpResult.user.first_name,
          last_name: wcUserData.billing_last_name || wcUserData.last_name || otpResult.user.last_name,
          address: {
            address_1: wcUserData.billing_address_1,
            address_2: wcUserData.billing_address_2,
            city: wcUserData.billing_city,
            state: wcUserData.billing_state,
            postcode: wcUserData.billing_postcode,
            country: wcUserData.billing_country
          },
          migration_metadata: {
            original_wc_id: wcUserData.ID?.toString(),
            migration_date: new Date().toISOString(),
            has_subscription_history: true,
            has_order_history: true,
            detection_method: 'woocommerce_waterfall'
          }
        };

        console.log('✅ WooCommerce user authenticated and synced:', hybridUser.id);
        setAuth(hybridUser as any, otpResult.session);

        toast({
          title: "Welcome back! 🎉",
          description: "Successfully signed in. Loading your subscription history...",
        });

        return { success: true, user: hybridUser };

      } else {
        // Supabase user or new user - use standard flow
        console.log('👤 Supabase/new user - standard authentication...');
        
        const otpResult = await verifyOTP(phone, otp, mode);
        console.log('🔍 DEBUG: OTP result for Supabase user:', {
          success: otpResult.success,
          otpVerified: otpResult.otpVerified,
          profileComplete: otpResult.profileComplete,
          hasSession: !!otpResult.session,
          hasUser: !!otpResult.user
        });
        
        if (!otpResult.success) {
          throw new Error(otpResult.error?.message || "Invalid OTP");
        }

        // Check if profile is complete - THIS IS THE CRITICAL CHECK
        if (otpResult.otpVerified && !otpResult.profileComplete) {
          console.log('🔍 ✅ PROFILE INCOMPLETE - Returning early without authentication');
          
          // Create minimal hybrid user for incomplete profile
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

        console.log('🔍 Profile is complete or old format - proceeding with authentication');

        // Only proceed if profile is complete or we have a session
        if (!otpResult.session) {
          console.error('🔍 ❌ No session but profile marked as complete - something is wrong');
          throw new Error("Authentication failed - no session created");
        }

        // Determine if user has WooCommerce data based on migration patterns
        const migrationInfo = await checkMigrationStatus(otpResult.user);
        
        // Create hybrid user object
        const hybridUser: HybridUser = {
          ...otpResult.user,
          source: migrationInfo.has_woocommerce_data ? 'woocommerce' : 'supabase',
          has_woocommerce_data: migrationInfo.has_woocommerce_data,
          migration_metadata: migrationInfo.metadata,
        };

        console.log('✅ Supabase user authenticated:', hybridUser.id, 'migration_info:', migrationInfo);
        setAuth(hybridUser as any, otpResult.session);

        toast({
          title: migrationInfo.has_woocommerce_data ? "Welcome back!" : "Welcome!",
          description: migrationInfo.has_woocommerce_data 
            ? "Successfully signed in. Loading your historical data..."
            : "Successfully signed in to your account.",
        });

        return { success: true, user: hybridUser };
      }

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