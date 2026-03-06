import { CustomUser, CustomSession } from '@/hooks/auth/types';
import { saveAuthToStorage, getStoredSession } from "@/hooks/auth/storage";

// Use same Supabase URL and anon key as the rest of the app (edge functions accept anon key)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wucwpyitzqjukcphczhr.supabase.co";
const ENV_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FALLBACK_ANON_KEY = "sb_publishable_FSkXrLtW_fYLLGipAoq1Hw_ltq5Ij-J";
const LEGACY_JWT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
const EDGE_FUNCTION_KEY = (typeof ENV_ANON_KEY === "string" && ENV_ANON_KEY.length > 0) ? ENV_ANON_KEY : (FALLBACK_ANON_KEY || LEGACY_JWT_KEY);
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;

export const sendOTP = async (phone: string): Promise<{
  success: boolean;
  error?: { message: string };
  developmentOtp?: string;
}> => {
  const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;

  const SEND_OTP_TIMEOUT_MS = 15000; // 15s so 2Factor has time to send

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEND_OTP_TIMEOUT_MS);
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-otp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: fullPhone }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data?.success) {
      const rawMsg = data?.error || data?.message || "Failed to send OTP";
      const errorMessage =
        rawMsg === "Invalid JWT" || rawMsg.toLowerCase().includes("jwt")
          ? "Server configuration error. Please try again later or contact support."
          : rawMsg;
      return { success: false, error: { message: errorMessage } };
    }

    return { success: true, developmentOtp: data.otp_code };
  } catch (err: any) {
    const raw = err?.message || "Network error";
    console.error("[sendOTP] request failed:", err?.name, raw);
    const message =
      err?.name === "AbortError"
        ? "OTP request timed out. Please try again."
        : raw === "Failed to fetch" || raw.toLowerCase().includes("fetch")
        ? "Could not reach OTP server. Check your connection or try again in a moment. If it persists, the service may be temporarily limited."
        : raw;
    return { success: false, error: { message } };
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
  console.log('🔍 verifyOTP called for phone:', fullPhone.replace(/.(?=.{4})/g, '*'), 'mode:', mode);
  
  let data: any;
  try {
    const verifyRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-otp-custom`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone, otp, mode }),
    });
    try {
      data = await verifyRes.json();
    } catch (_) {
      data = {};
    }

    if (!verifyRes.ok) {
      const errorMessage = data?.error || data?.message || (verifyRes.status === 401 ? "Authentication error. Please refresh and try again." : "Verification failed. Please try again.");
      console.warn('[verifyOTP] verify-otp-custom error:', verifyRes.status, data);
      return { success: false, error: { message: errorMessage } };
    }
  } catch (err: any) {
    const raw = err?.message || "Network error";
    console.error("[verifyOTP] request failed:", err?.name, raw);
    const message =
      raw === "Failed to fetch" || raw.toLowerCase().includes("fetch")
        ? "Could not reach verification server. Check your connection or try again."
        : raw === "Invalid JWT" || raw.toLowerCase().includes("jwt")
        ? "Server configuration error. Please try again later."
        : raw;
    return { success: false, error: { message } };
  }

  if (!data?.success) {
    const errorMessage = data?.error || data?.message || "Verification failed";
    return { success: false, error: { message: errorMessage } };
  }

  // Handle different successful response scenarios
  // Note: phone_verified is set server-side in verify-otp-custom — no client write needed
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
    const url = `${SUPABASE_FUNCTIONS_URL}/check-user-status?phone=${encodeURIComponent(fullPhone)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
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
    console.log('🔍 Completing user profile for userId:', userId, 'firstName:', firstName, 'lastName:', lastName);
    
    const completeRes = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-complete-profile`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, firstName, lastName, email: email || null, pincode: pincode || null }),
    });
    let data: any;
    try {
      data = await completeRes.json();
    } catch {
      data = {};
    }

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
    const raw = error?.message || 'Network error';
    console.error('[completeUserProfile] request failed:', raw);
    const message = raw === 'Failed to fetch' || raw.toLowerCase().includes('fetch')
      ? 'Could not reach server. Check your connection and try again.'
      : raw;
    return { 
      success: false, 
      error: { message } 
    };
  }
};
