/**
 * E2E-only: sign in with email/password (Supabase Auth) and sync to app's custom session.
 * Only used when VITE_E2E_LOGIN_ENABLED is true (E2E/staging builds). OTP-based auth is
 * unchanged and remains the sole customer-facing login in production.
 */
import { supabase } from '@/integrations/supabase/client';
import { saveAuthToStorage } from '@/hooks/auth/storage';
import type { CustomUser, CustomSession } from '@/hooks/auth/types';

export async function e2eEmailPasswordLogin(
  email: string,
  password: string
): Promise<{ error: string | null; user?: CustomUser; session?: CustomSession }> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: authError.message || 'Invalid email or password' };
  }
  const authUserId = authData.user?.id;
  if (!authUserId) {
    return { error: 'No user returned' };
  }

  const { data: customUser, error: userError } = await supabase
    .from('custom_users')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (userError || !customUser) {
    return { error: 'User not found in app (run create-e2e-admin-user script first)' };
  }

  const user = customUser as CustomUser;
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  const session: CustomSession = {
    access_token: authData.session?.access_token ?? `custom_${user.id}_${Date.now()}`,
    refresh_token: authData.session?.refresh_token ?? `refresh_${user.id}_${Date.now()}`,
    user,
    token_type: 'Bearer',
    expires_in: 24 * 60 * 60,
    expires_at: expiresAt,
  };

  saveAuthToStorage(user, session);
  return { error: null, user, session };
}

export const isE2ELoginEnabled = (): boolean =>
  import.meta.env.VITE_E2E_LOGIN_ENABLED === 'true' || import.meta.env.VITE_E2E_LOGIN_ENABLED === true;
