import { useState, useEffect } from 'react';
import UserImpersonationService from '@/services/userImpersonationService';
import { CustomUser } from '@/hooks/auth/types';

interface ImpersonationStatus {
  isImpersonating: boolean;
  originalAdminUser: CustomUser | null;
  impersonatedUser: CustomUser | null;
  timeRemaining: number;
  isSessionValid: boolean;
}

export const useImpersonationStatus = (): ImpersonationStatus => {
  const [status, setStatus] = useState<ImpersonationStatus>({
    isImpersonating: false,
    originalAdminUser: null,
    impersonatedUser: null,
    timeRemaining: 0,
    isSessionValid: false
  });

  useEffect(() => {
    const updateStatus = () => {
      const isImpersonating = UserImpersonationService.isImpersonating();
      const isSessionValid = UserImpersonationService.validateImpersonationSession();
      
      if (isImpersonating && isSessionValid) {
        const session = UserImpersonationService.getImpersonationSession();
        const timeRemaining = UserImpersonationService.getSessionTimeRemaining();
        
        setStatus({
          isImpersonating: true,
          originalAdminUser: session?.originalAdminUser || null,
          impersonatedUser: session?.impersonatedUser || null,
          timeRemaining,
          isSessionValid: true
        });
      } else {
        setStatus({
          isImpersonating: false,
          originalAdminUser: null,
          impersonatedUser: null,
          timeRemaining: 0,
          isSessionValid: false
        });
      }
    };

    // Initial check
    updateStatus();

    // Set up interval for periodic checks
    const interval = setInterval(updateStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return status;
}; 