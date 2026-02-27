
import { supabase } from '@/integrations/supabase/client';

export interface AuthResponse {
  success?: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export class CustomAuthService {
  private static instance: CustomAuthService;
  
  public static getInstance(): CustomAuthService {
    if (!CustomAuthService.instance) {
      CustomAuthService.instance = new CustomAuthService();
    }
    return CustomAuthService.instance;
  }

  async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const session = this.getStoredSession();
    
    if (!session) {
      throw new Error('No active session');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success) {
        // Retry with new token
        const newSession = this.getStoredSession();
        if (newSession) {
          headers.Authorization = `Bearer ${newSession.access_token}`;
          return fetch(endpoint, { ...options, headers });
        }
      }
      throw new Error('Authentication failed');
    }

    return response;
  }

  async refreshToken(): Promise<AuthResponse> {
    const session = this.getStoredSession();
    if (!session?.refresh_token) {
      return { error: 'No refresh token available' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('auth-refresh', {
        body: { refresh_token: session.refresh_token }
      });

      if (error || data?.error) {
        this.clearSession();
        return { error: data?.error || error.message };
      }

      this.saveSession(data.user, data.session);
      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      this.clearSession();
      return { error: error.message };
    }
  }

  private getStoredSession() {
    try {
      const stored = localStorage.getItem('toyflix_custom_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private saveSession(user: any, session: any) {
    localStorage.setItem('toyflix_custom_user', JSON.stringify(user));
    localStorage.setItem('toyflix_custom_session', JSON.stringify(session));
  }

  private clearSession() {
    localStorage.removeItem('toyflix_custom_user');
    localStorage.removeItem('toyflix_custom_session');
  }
}

export const customAuthService = CustomAuthService.getInstance();
