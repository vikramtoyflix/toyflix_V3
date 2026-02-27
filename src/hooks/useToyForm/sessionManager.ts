
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useAdminRoleChecker } from './roleChecker';
import { refreshSession } from '@/hooks/auth/sessionManagement';

export const useSessionManager = () => {
  const navigate = useNavigate();
  const { user, session, setAuth } = useCustomAuth();
  const { isAdmin, requireAdmin, validateSession, isLoading: roleLoading, hasValidSession } = useAdminRoleChecker();

  const refreshSessionIfNeeded = async () => {
    try {
      // Check if session needs refresh
      if (!hasValidSession) {
        console.log('Session invalid, attempting refresh...');
        
        const refreshResult = await refreshSession();
        if (refreshResult.error || !refreshResult.user || !refreshResult.session) {
          throw new Error(refreshResult.error || 'Session refresh failed. Please log in again.');
        }
        
        // Update auth state with refreshed session
        setAuth(refreshResult.user, refreshResult.session);
        console.log('Session refreshed successfully');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  };

  const validateAdminAccess = async () => {
    // Wait for role loading to complete
    if (roleLoading) {
      console.log('Waiting for role to load...');
      throw new Error('Role verification in progress. Please wait...');
    }

    // Try to refresh session if needed first
    try {
      await refreshSessionIfNeeded();
    } catch (error) {
      console.error('Session refresh failed during admin validation:', error);
      throw new Error('Your session has expired. Please log in again.');
    }

    // Validate session and admin role
    try {
      requireAdmin();
    } catch (error) {
      console.error('Admin role validation failed:', error);
      
      // Provide specific error messages based on the error type
      let errorMessage = "You need admin privileges to create or edit toys.";
      
      if (error.message.includes('Authentication required')) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (error.message.includes('Role verification in progress')) {
        errorMessage = "Please wait while we verify your permissions...";
      }
      
      throw new Error(errorMessage);
    }
  };

  return {
    refreshSessionIfNeeded,
    validateAdminAccess,
    roleLoading,
    hasValidSession,
    sessionInfo: { 
      user: !!user, 
      session: !!session, 
      role: user?.role,
      sessionExpiry: session?.expires_at ? new Date(typeof session.expires_at === 'string' ? session.expires_at : session.expires_at * 1000) : null
    }
  };
};
