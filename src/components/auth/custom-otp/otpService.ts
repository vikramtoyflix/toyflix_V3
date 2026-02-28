import { supabase } from "@/integrations/supabase/client";
import { CustomUser, CustomSession } from '@/hooks/auth/types';
import { saveAuthToStorage, getStoredSession } from "@/hooks/auth/storage";

// Legacy JWT anon key — required for edge function calls (new sb_publishable_ key not yet supported)
const EDGE_FUNCTION_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
const SUPABASE_FUNCTIONS_URL = "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1";

export const sendOTP = async (phone: string): Promise<{
  success: boolean;
  error?: { message: string };
  developmentOtp?: string;
}> => {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: fullPhone }),
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const errorMessage = data?.error || data?.message || "Failed to send OTP";
      return { success: false, error: { message: errorMessage } };
    }

    return { success: true, developmentOtp: data.otp_code };
  } catch (err: any) {
    return { success: false, error: { message: err.message || "Network error" } };
  }
};

export const verifyOTP = async (phone: string, otp: string, mode: 'signin' | 'signup' = 'signup'): Promise<{
  success: boolean;
  otpVerified?: boolean;
  profileComplete?: boolean;
  user?: CustomUser | null;
  session?: CustomSession | null;
  error?: { message: string };
}> => {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  console.log('🔍 verifyOTP called with:', { phone: fullPhone, otp, mode });
  
  const verifyRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-otp-custom`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: fullPhone, otp, mode }),
  });
  const data = await verifyRes.json();

  if (!verifyRes.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || "Verification failed";
    return { success: false, error: { message: errorMessage } };
  }
  
  // CRITICAL FIX: Always ensure phone_verified is true after successful OTP verification
  if (data.success && data.otpVerified && data.user) {
    console.log('🔍 Ensuring phone_verified is set to true for user:', data.user.id);
    
    // Double-check and force update phone_verified if needed
    if (!data.user.phone_verified) {
      console.log('⚠️ User not marked as phone verified, forcing update...');
      
      const { data: verifiedUser, error: updateError } = await supabase
        .from('custom_users')
        .update({ 
          phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.user.id)
        .select()
        .single();

      if (!updateError && verifiedUser) {
        console.log('✅ Force updated phone_verified for user:', verifiedUser.id);
        data.user = verifiedUser; // Update the user object
      } else {
        console.error('❌ Failed to force update phone_verified:', updateError);
      }
    } else {
      console.log('✅ User already marked as phone verified:', data.user.id);
    }
  }

  // Handle different successful response scenarios
  if (data.otpVerified && !data.profileComplete) {
    // OTP verified but profile incomplete - don't save auth yet
    console.log('🔍 OTP verified but profile incomplete - not saving auth yet');
    return { 
      success: true,
      otpVerified: true,
      profileComplete: false,
      user: data.user as CustomUser
    };
  }
  
  if (data.otpVerified && data.profileComplete && data.session) {
    // OTP verified and profile complete - save auth and session
    console.log('🔍 OTP verified and profile complete - saving auth to storage');
    saveAuthToStorage(data.user, data.session);
    return { 
      success: true,
      otpVerified: true,
      profileComplete: true,
      user: data.user as CustomUser, 
      session: data.session as CustomSession
    };
  }

  // Fallback for backward compatibility
  if (data.user && data.session) {
    console.log('🔍 Fallback: Saving auth to storage (backward compatibility)');
    saveAuthToStorage(data.user, data.session);
    return { 
      success: true,
      otpVerified: true,
      profileComplete: true,
      user: data.user as CustomUser, 
      session: data.session as CustomSession
    };
  }

  return { success: false, error: { message: "Unexpected response format" } };
};

export const updateUserProfile = async (
  firstName: string, 
  lastName: string,
  pincode?: string
): Promise<{
  success: boolean;
  user?: CustomUser | null;
  error?: { message: string };
}> => {
  const session = getStoredSession();
  if (!session?.user) {
    return { success: false, error: { message: "No user session found." } };
  }

  const updateRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-update-profile`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: session.user.id, firstName, lastName, pincode }),
  });
  const data = await updateRes.json();

  if (!updateRes.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || "Failed to update profile.";
    return { success: false, error: { message: errorMessage } };
  }
  
  // Update the user in storage with the new details
  const updatedUser = data.user as CustomUser;
  const newSession: CustomSession = { ...session, user: updatedUser };
  saveAuthToStorage(updatedUser, newSession);

  return { success: true, user: updatedUser };
};

export const deleteUserAccount = async (): Promise<{
  success: boolean;
  error?: { message: string };
}> => {
  const session = getStoredSession();
  if (!session?.user) {
    return { success: false, error: { message: "No user session found." } };
  }

  const deleteRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-delete-account`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: session.user.id }),
  });
  const data = await deleteRes.json();

  if (!deleteRes.ok || !data?.success) {
    const errorMessage = data?.error || data?.message || "Failed to delete account.";
    return { success: false, error: { message: errorMessage } };
  }

  return { success: true };
};

export const checkUserStatus = async (phone: string): Promise<{
  success: boolean;
  exists: boolean;
  isComplete: boolean;
  isPhoneVerified: boolean;
  userId?: string | null;
  error?: { message: string };
}> => {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  console.log('🔍 Checking user status for:', fullPhone);
  
  try {
    // Construct URL with query parameter
    const url = `https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status?phone=${encodeURIComponent(fullPhone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('🔍 User status response:', { data, status: response.status });
    
    if (!response.ok || !data?.success) {
      const errorMessage = data?.error || `HTTP error ${response.status}`;
      console.error('🔍 check-user-status function error:', errorMessage);
      return { 
        success: false, 
        exists: false, 
        isComplete: false, 
        isPhoneVerified: false, 
        error: { message: errorMessage } 
      };
    }
    
    return { 
      success: true, 
      exists: data.exists,
      isComplete: data.isComplete,
      isPhoneVerified: data.isPhoneVerified,
      userId: data.userId
    };
  } catch (error: any) {
    console.error('🔍 Network error checking user status:', error);
    return { 
      success: false, 
      exists: false, 
      isComplete: false, 
      isPhoneVerified: false, 
      error: { message: error.message || 'Network error' } 
    };
  }
};

export const checkUserExistsForSmartLogin = async (phone: string): Promise<{
  success: boolean;
  exists: boolean;
  shouldSignUp: boolean;
  message: string;
  error?: { message: string };
}> => {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
  console.log('🔍 Smart login check for phone:', fullPhone);
  
  try {
    // Check multiple phone formats to handle different storage patterns
    const phoneFormats = [
      phone,                    // Original format (e.g., "8595968253")
      fullPhone,               // With +91 prefix (e.g., "+918595968253") 
      phone.replace(/^\+91/, ''), // Without +91 prefix
      `91${phone}`,            // With 91 prefix (no +)
    ];
    
    // Remove duplicates
    const uniqueFormats = [...new Set(phoneFormats)];
    console.log('🔍 Checking phone formats for smart login:', uniqueFormats);
    
    for (const phoneFormat of uniqueFormats) {
      try {
        const result = await checkUserStatus(phoneFormat);
        
        if (result.success && result.exists) {
          console.log(`✅ User found for smart login with format "${phoneFormat}"`);
          return { 
            success: true,
            exists: true,
            shouldSignUp: false,
            message: `Welcome back! We found your account. Please proceed with sign in.`
          };
        }
      } catch (error: any) {
        console.log(`❌ Error checking phone format "${phoneFormat}":`, error.message);
      }
    }

    console.log('❌ User not found for smart login - should sign up');
    return { 
      success: true,
      exists: false,
      shouldSignUp: true,
      message: `No account found with this number. Please sign up to create your account.`
    };

  } catch (error: any) {
    console.error('🔍 Smart login check error:', error);
    return { 
      success: false, 
      exists: false,
      shouldSignUp: true,
      message: 'Error checking account status',
      error: { message: error.message || 'Network error' } 
    };
  }
};

export const completeUserProfile = async (
  userId: string,
  firstName: string, 
  lastName: string,
  email?: string,
  pincode?: string
): Promise<{
  success: boolean;
  user?: CustomUser | null;
  session?: CustomSession | null;
  error?: { message: string };
}> => {
  try {
    console.log('🔍 Completing user profile for userId:', userId);
    
    const completeRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-complete-profile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, firstName, lastName, email: email || null, pincode: pincode || null }),
    });
    const data = await completeRes.json();

    if (!completeRes.ok || !data?.success) {
      const errorMessage = data?.error || data?.message || "Failed to complete profile";
      return { success: false, error: { message: errorMessage } };
    }

    // Profile completed - save auth and session
    console.log('🔍 Profile completed successfully, saving auth to storage');
    saveAuthToStorage(data.user, data.session);

    return { 
      success: true, 
      user: data.user as CustomUser, 
      session: data.session as CustomSession
    };
  } catch (error: any) {
    console.error('🔍 Complete profile error:', error);
    return { 
      success: false, 
      error: { message: error.message || 'Failed to complete profile' } 
    };
  }
};
