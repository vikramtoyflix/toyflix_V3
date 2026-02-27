import { supabase } from '@/integrations/supabase/client';
import { CustomUser, CustomSession } from '@/hooks/auth/types';
import { saveAuthToStorage, getStoredSession } from '@/hooks/auth/storage';

interface ImpersonationSession {
  originalAdminUser: CustomUser;
  originalAdminSession: CustomSession;
  impersonatedUser: CustomUser;
  impersonatedSession: CustomSession;
  startedAt: string;
}

class UserImpersonationService {
  private static STORAGE_KEY = 'admin_impersonation_session';

  /**
   * Check if admin has permission to impersonate users
   */
  static async canImpersonate(adminUserId: string): Promise<boolean> {
    try {
      // Check if user has super_admin or admin role with impersonation permission
      const { data: user, error } = await supabase
        .from('custom_users')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (error || !user) {
        console.error('Failed to check impersonation permissions:', error);
        return false;
      }

      // Only admin roles can impersonate
      return user.role === 'admin';
    } catch (error) {
      console.error('Error checking impersonation permissions:', error);
      return false;
    }
  }

  /**
   * Start impersonating a user
   */
  static async startImpersonation(
    adminUser: CustomUser,
    adminSession: CustomSession,
    targetUserId: string
  ): Promise<{ success: boolean; error?: string; impersonatedUser?: CustomUser; impersonatedSession?: CustomSession }> {
    try {
      // Verify admin has permission
      const canImpersonate = await this.canImpersonate(adminUser.id);
      if (!canImpersonate) {
        return { success: false, error: 'Insufficient permissions to impersonate users' };
      }

      // Get target user details
      const { data: targetUser, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (userError || !targetUser) {
        return { success: false, error: 'Target user not found or inaccessible' };
      }

      // Prevent impersonating other admins (security measure)
      if (targetUser.role === 'admin') {
        return { success: false, error: 'Cannot impersonate other administrative users' };
      }

      // Create impersonated session
      const impersonatedSession: CustomSession = {
        access_token: `impersonated_${targetUser.id}_${Date.now()}`,
        refresh_token: `refresh_impersonated_${targetUser.id}_${Date.now()}`,
        expires_at: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
        token_type: 'Bearer',
        expires_in: 4 * 60 * 60,
        user: targetUser as CustomUser
      };

      // Store impersonation session data
      const impersonationData: ImpersonationSession = {
        originalAdminUser: adminUser,
        originalAdminSession: adminSession,
        impersonatedUser: targetUser as CustomUser,
        impersonatedSession,
        startedAt: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(impersonationData));

      // Update auth storage with impersonated user
      saveAuthToStorage(targetUser as CustomUser, impersonatedSession);

      // Log impersonation start
      await this.logImpersonationEvent(
        adminUser.id,
        targetUserId,
        'impersonation_started',
        `Admin ${adminUser.first_name || 'Unknown'} started impersonating user ${(targetUser as any).full_name || targetUser.first_name || 'Unknown'}`
      );

      // Force refresh of the current page to pick up the new session
      console.log('🎭 Impersonation session updated, forcing refresh...');
      
      return {
        success: true,
        impersonatedUser: targetUser as CustomUser,
        impersonatedSession
      };
    } catch (error) {
      console.error('Error starting impersonation:', error);
      return { success: false, error: 'Failed to start user impersonation' };
    }
  }

  /**
   * End impersonation and restore admin session
   */
  static async endImpersonation(): Promise<{ success: boolean; error?: string; adminUser?: CustomUser; adminSession?: CustomSession }> {
    try {
      const impersonationData = this.getImpersonationSession();
      if (!impersonationData) {
        return { success: false, error: 'No active impersonation session found' };
      }

      const { originalAdminUser, originalAdminSession, impersonatedUser } = impersonationData;

      // Restore admin session
      saveAuthToStorage(originalAdminUser, originalAdminSession);

      // Clear impersonation data
      localStorage.removeItem(this.STORAGE_KEY);

      // Log impersonation end
      await this.logImpersonationEvent(
        originalAdminUser.id,
        impersonatedUser.id,
        'impersonation_ended',
        `Admin ${originalAdminUser.first_name || 'Unknown'} ended impersonation of user ${(impersonatedUser as any).full_name || impersonatedUser.first_name || 'Unknown'}`
      );

      return {
        success: true,
        adminUser: originalAdminUser,
        adminSession: originalAdminSession
      };
    } catch (error) {
      console.error('Error ending impersonation:', error);
      return { success: false, error: 'Failed to end user impersonation' };
    }
  }

  /**
   * Check if currently in impersonation mode
   */
  static isImpersonating(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Get current impersonation session data
   */
  static getImpersonationSession(): ImpersonationSession | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting impersonation session:', error);
      return null;
    }
  }

  /**
   * Get admin user info when impersonating
   */
  static getOriginalAdminUser(): CustomUser | null {
    const session = this.getImpersonationSession();
    return session?.originalAdminUser || null;
  }

  /**
   * Log impersonation events for audit trail
   */
  private static async logImpersonationEvent(
    adminUserId: string,
    targetUserId: string,
    eventType: string,
    description: string
  ): Promise<void> {
    try {
      // Log to user_lifecycle_events table for audit trail
      await supabase
        .from('user_lifecycle_events' as any)
        .insert({
          user_id: targetUserId,
          event_type: eventType,
          new_state: {
            admin_user_id: adminUserId,
            event_type: eventType,
            timestamp: new Date().toISOString()
          },
          performed_by: adminUserId,
          reason: 'Admin user impersonation',
          notes: description
        });
    } catch (error) {
      console.error('Failed to log impersonation event:', error);
      // Don't throw error as this shouldn't block the impersonation
    }
  }

  /**
   * Validate impersonation session is still valid
   */
  static validateImpersonationSession(): boolean {
    const session = this.getImpersonationSession();
    if (!session) return false;

    // Check if session has expired (4 hours max)
    const startTime = new Date(session.startedAt).getTime();
    const now = Date.now();
    const maxDuration = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

    if (now - startTime > maxDuration) {
      console.warn('Impersonation session expired, clearing...');
      localStorage.removeItem(this.STORAGE_KEY);
      return false;
    }

    return true;
  }

  /**
   * Get remaining time for impersonation session
   */
  static getSessionTimeRemaining(): number {
    const session = this.getImpersonationSession();
    if (!session) return 0;

    const startTime = new Date(session.startedAt).getTime();
    const now = Date.now();
    const maxDuration = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    const elapsed = now - startTime;
    
    return Math.max(0, maxDuration - elapsed);
  }
}

export default UserImpersonationService; 