
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useUserRole } from '@/hooks/useUserRole';

export interface AuthStatus {
  // Basic states
  isAuthenticated: boolean;
  hasProfile: boolean;
  isPhoneVerified: boolean;
  hasSubscription: boolean;
  isAdmin: boolean;
  
  // Loading states
  isLoading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  subscriptionLoading: boolean;
  roleLoading: boolean;
  
  // Data
  user: any;
  profile: any;
  subscription: any;
  userRole: string;
  
  // Computed states
  isCompletelySetup: boolean;
  needsProfileCompletion: boolean;
  needsPhoneVerification: boolean;
  needsSubscription: boolean;
}

export const useAuthStatus = (): AuthStatus => {
  const { user, loading: authLoading } = useCustomAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { data: subscriptionData, isLoading: subscriptionLoading } = useUserSubscription();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const isAuthenticated = !!user;
  const hasProfile = !!(profile && profile.first_name);
  const isPhoneVerified = !!profile?.phone_verified;
  const hasSubscription = !!subscriptionData?.subscription;
  const isAdmin = userRole === 'admin';

  // Improved loading state logic
  const isLoading = authLoading || 
    (isAuthenticated && profileLoading) || 
    (isAuthenticated && subscriptionLoading) || 
    (isAuthenticated && roleLoading);

  const needsProfileCompletion = isAuthenticated && !hasProfile;
  const needsPhoneVerification = isAuthenticated && hasProfile && !isPhoneVerified;
  const needsSubscription = isAuthenticated && hasProfile && isPhoneVerified && !hasSubscription;
  const isCompletelySetup = isAuthenticated && hasProfile && isPhoneVerified;

  return {
    // Basic states
    isAuthenticated,
    hasProfile,
    isPhoneVerified,
    hasSubscription,
    isAdmin,
    
    // Loading states
    isLoading,
    authLoading,
    profileLoading,
    subscriptionLoading,
    roleLoading,
    
    // Data
    user,
    profile,
    subscription: subscriptionData,
    userRole: userRole || 'user',
    
    // Computed states
    isCompletelySetup,
    needsProfileCompletion,
    needsPhoneVerification,
    needsSubscription,
  };
};
