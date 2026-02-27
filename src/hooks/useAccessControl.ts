
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useUserRole } from '@/hooks/useUserRole';

export type AccessLevel = 'public' | 'authenticated' | 'verified' | 'subscribed' | 'admin';

export interface AccessCheck {
  hasAccess: boolean;
  isLoading: boolean;
  redirectTo?: string;
  reason?: string;
}

export const useAccessControl = (requiredLevel: AccessLevel = 'public'): AccessCheck => {
  const { user, loading: authLoading } = useCustomAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { data: subscriptionData, isLoading: subscriptionLoading } = useUserSubscription();
  const { data: cycleStatus, isLoading: cycleLoading } = useCycleStatus();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const isLoading = authLoading || 
    (user && profileLoading) || 
    (requiredLevel === 'subscribed' && subscriptionLoading) ||
    (requiredLevel === 'subscribed' && cycleLoading) ||
    (requiredLevel === 'admin' && roleLoading);

  if (isLoading) {
    return { hasAccess: false, isLoading: true };
  }

  // Public access - always allowed
  if (requiredLevel === 'public') {
    return { hasAccess: true, isLoading: false };
  }

  // Authenticated access
  if (requiredLevel === 'authenticated') {
    if (!user) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Authentication required'
      };
    }
    return { hasAccess: true, isLoading: false };
  }

  // Verified access (complete profile + phone verified)
  if (requiredLevel === 'verified') {
    if (!user) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Authentication required'
      };
    }

    if (!profile || !profile.first_name) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth?action=signup',
        reason: 'Profile completion required'
      };
    }

    if (!profile.phone_verified) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Phone verification required'
      };
    }

    return { hasAccess: true, isLoading: false };
  }

  // Subscribed access - build verification chain manually to avoid recursion
  if (requiredLevel === 'subscribed') {
    // Check auth first
    if (!user) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Authentication required'
      };
    }

    // Check profile completion
    if (!profile || !profile.first_name) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth?action=signup',
        reason: 'Profile completion required'
      };
    }

    // Check phone verification
    if (!profile.phone_verified) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Phone verification required'
      };
    }

    // Check subscription
    if (!subscriptionData?.subscription) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/subscription-flow',
        reason: 'Active subscription required'
      };
    }

    return { hasAccess: true, isLoading: false };
  }

  // Admin access - build verification chain manually to avoid recursion
  if (requiredLevel === 'admin') {
    // Check auth first
    if (!user) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Authentication required'
      };
    }

    // Check profile completion
    if (!profile || !profile.first_name) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth?action=signup',
        reason: 'Profile completion required'
      };
    }

    // Check phone verification
    if (!profile.phone_verified) {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/auth',
        reason: 'Phone verification required'
      };
    }

    // Check admin role
    if (userRole !== 'admin') {
      return { 
        hasAccess: false, 
        isLoading: false, 
        redirectTo: '/dashboard',
        reason: 'Admin privileges required'
      };
    }

    return { hasAccess: true, isLoading: false };
  }

  return { hasAccess: false, isLoading: false };
};
