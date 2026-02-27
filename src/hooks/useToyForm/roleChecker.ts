
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMemo } from "react";

export const useAdminRoleChecker = () => {
  const { user, session } = useCustomAuth();
  const { data: role, isLoading: roleLoading, error: roleError } = useUserRole();

  // Memoize session validation to prevent infinite loops
  const sessionValidation = useMemo(() => {
    if (!user || !session) {
      return { valid: false, error: 'No active session' };
    }

    // Check if session is expired - handle both string and number timestamps
    if (session.expires_at) {
      const expiresAtMs = typeof session.expires_at === 'string' 
        ? new Date(session.expires_at).getTime()
        : session.expires_at * 1000; // Convert seconds to milliseconds if needed
      
      const now = Date.now();
      if (expiresAtMs <= now) {
        return { valid: false, error: 'Session expired' };
      }
    }

    return { valid: true };
  }, [user?.id, session?.expires_at]);

  const isAdmin = useMemo(() => {
    // First validate session
    if (!sessionValidation.valid) {
      return false;
    }

    // Check if user role is directly available on user object
    if (user?.role) {
      return user.role === 'admin';
    }
    
    // Fall back to role from useUserRole hook
    if (roleError) {
      console.log('Error fetching role:', roleError);
      return false;
    }

    return role === 'admin';
  }, [sessionValidation.valid, user?.role, role, roleError]);

  const requireAdmin = () => {
    if (!sessionValidation.valid) {
      throw new Error(`Authentication required: ${sessionValidation.error}`);
    }

    if (roleLoading) {
      throw new Error('Role verification in progress. Please wait...');
    }

    if (!isAdmin) {
      throw new Error('Admin privileges required for this operation');
    }
  };

  const validateSession = () => sessionValidation;

  return {
    isAdmin,
    requireAdmin,
    validateSession,
    isLoading: roleLoading,
    hasValidSession: sessionValidation.valid
  };
};
