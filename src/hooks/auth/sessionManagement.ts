import { supabase } from '@/integrations/supabase/client';
import { CustomUser, CustomSession } from './types';
import { getStoredSession, saveAuthToStorage, clearAuthStorage } from './storage';

export const refreshSession = async (): Promise<{ error?: string; user?: CustomUser; session?: CustomSession }> => {
  const storedSession = getStoredSession();
  if (!storedSession) {
    return { error: 'No session to refresh' };
  }

  try {
    console.log('🔄 Refreshing custom session...');
    
    // For custom auth, we'll validate the user still exists and is active
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', storedSession.user.id)
      .single();

    if (userError || !user || !user.is_active) {
      clearAuthStorage();
      return { error: 'User not found or inactive' };
    }

    // Create a new session with updated timestamp
    const newSession: CustomSession = {
      access_token: `custom_token_${user.id}_${Date.now()}`,
      refresh_token: `refresh_${user.id}_${Date.now()}`,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
      user: user as CustomUser
    };

    saveAuthToStorage(user as CustomUser, newSession);
    console.log('✅ Custom session refreshed');
    return { user: user as CustomUser, session: newSession };
  } catch (error: any) {
    clearAuthStorage();
    return { error: error.message };
  }
};

export const verifySession = async (): Promise<{ valid: boolean; user?: CustomUser; session?: CustomSession; error?: string }> => {
  const storedSession = getStoredSession();
  if (!storedSession) {
    return { valid: false };
  }

  try {
    // Check if session is expired with a 5-minute buffer
    const expiresAtMs = storedSession.expires_at * 1000; // Convert seconds to milliseconds
    const now = Date.now();
    
    if (expiresAtMs <= now + (5 * 60 * 1000)) {
      console.log('Custom session expired or expiring soon, attempting refresh');
      const refreshResult = await refreshSession();
      if (refreshResult.error) {
        clearAuthStorage();
        return { valid: false, error: refreshResult.error };
      }
      return { valid: true, user: refreshResult.user, session: refreshResult.session };
    }

    // Verify user still exists and is active occasionally (every 10 minutes)
    const lastVerified = localStorage.getItem('last_session_verify');
    const shouldVerify = !lastVerified || (now - parseInt(lastVerified)) > (10 * 60 * 1000);
    
    if (shouldVerify) {
      const { data: user, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', storedSession.user.id)
        .single();

      if (userError || !user || !user.is_active) {
        console.log('Custom session verification failed, user not found or inactive');
        clearAuthStorage();
        return { valid: false, error: 'User not found or inactive' };
      }
      
      localStorage.setItem('last_session_verify', now.toString());
      console.log('✅ Custom session verified');
    }

    return { valid: true };
  } catch (error: any) {
    console.error('Custom session verification error:', error);
    clearAuthStorage();
    return { valid: false, error: error.message };
  }
};
