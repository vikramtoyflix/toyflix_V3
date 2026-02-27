
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserFlow } from '@/hooks/useUserFlow';
import { useCustomAuth } from '@/hooks/useCustomAuth';

export const useFlowRedirect = (currentPath: string) => {
  const { user } = useCustomAuth();
  const { flowType } = useUserFlow();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const shouldRedirect = () => {
      // If user is on subscription flow but should be managing queue
      if (currentPath === '/subscription-flow' && flowType === 'existing_user_manage_queue') {
        return false; // Stay on subscription flow for queue management
      }

      // If user has no subscription but is trying to access subscription-dependent features
      if (flowType === 'new_user' && currentPath.includes('/toys')) {
        return '/subscription-flow';
      }

      // If user cannot access certain areas
      if (flowType === 'existing_user_no_access' && 
          (currentPath.includes('/toys') || currentPath === '/subscription-flow')) {
        return '/dashboard';
      }

      return null;
    };

    const redirectTo = shouldRedirect();
    if (redirectTo) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, flowType, currentPath, navigate]);
};
