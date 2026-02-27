import React from 'react';
import { useExitIntentManager } from '@/hooks/useExitIntentManager';
import ExitIntentPopup from './ExitIntentPopup';

interface ExitIntentProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages exit-intent popup across the entire app
 * This should be placed high in the component tree (e.g., in App.tsx)
 */
const ExitIntentProvider: React.FC<ExitIntentProviderProps> = ({ children }) => {
  const {
    isPopupOpen,
    closePopup,
    pageContext
  } = useExitIntentManager({
    enabledPages: [
      '/',
      '/pricing',
      '/subscription-flow',
      '/select-toys',
      '/about',
      '/how-it-works'
    ],
    disabledPages: [
      '/auth',
      '/dashboard',
      '/admin',
      '/confirmation-success',
      '/payment-success',
      '/signup-landing',
      '/signup-capture'
    ],
    minTimeOnPage: 30, // 30 seconds
    maxShowsPerSession: 1,
    userTypeRestrictions: ['guest', 'authenticated']
  });

  return (
    <>
      {children}
      <ExitIntentPopup
        isOpen={isPopupOpen}
        onClose={closePopup}
        currentPage={pageContext.currentPage}
        planId={pageContext.planId || undefined}
        totalAmount={pageContext.totalAmount}
      />
    </>
  );
};

export default ExitIntentProvider;
