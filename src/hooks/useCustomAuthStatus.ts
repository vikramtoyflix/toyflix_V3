
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserRole } from "./useUserRole";
import UserImpersonationService from "@/services/userImpersonationService";

export const useCustomAuthStatus = () => {
  const { user, session, loading: authLoading } = useCustomAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();

  const isAuthenticated = !!user && !!session;
  const hasProfile = !!user?.first_name || !!user?.last_name;
  const isPhoneVerified = !!user?.phone_verified;
  const isAdmin = role === 'admin';
  
  // 🎭 Check if currently in impersonation mode
  const isImpersonating = UserImpersonationService.isImpersonating();
  const isValidImpersonation = isImpersonating && UserImpersonationService.validateImpersonationSession();

  // For custom auth, profile is completed during signup
  const needsProfileCompletion = false;
  const needsPhoneVerification = isAuthenticated && !isPhoneVerified && !isValidImpersonation;
  
  // 🔧 FIX: Allow access during valid impersonation even if phone not verified
  const isCompletelySetup = isAuthenticated && (isPhoneVerified || isValidImpersonation);

  const isLoading = authLoading || roleLoading;

  return {
    isAuthenticated,
    hasProfile,
    isPhoneVerified,
    isAdmin,
    isLoading,
    needsProfileCompletion,
    needsPhoneVerification,
    isCompletelySetup,
    user,
    session,
    isImpersonating: isValidImpersonation
  };
};
