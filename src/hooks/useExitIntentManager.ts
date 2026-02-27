import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useExitIntent } from './useExitIntent';
import { useCustomAuth } from './useCustomAuth';

interface ExitIntentConfig {
  enabledPages?: string[]; // Pages where exit intent should be active
  disabledPages?: string[]; // Pages where exit intent should be disabled
  minTimeOnPage?: number; // Minimum time on page before showing (seconds)
  maxShowsPerSession?: number; // Maximum shows per session
  userTypeRestrictions?: ('guest' | 'authenticated')[]; // Show only for specific user types
}

const DEFAULT_CONFIG: Required<ExitIntentConfig> = {
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
    '/payment-success'
  ],
  minTimeOnPage: 30, // 30 seconds
  maxShowsPerSession: 1,
  userTypeRestrictions: ['guest', 'authenticated'] // Show for both
};

export const useExitIntentManager = (config: ExitIntentConfig = {}) => {
  const location = useLocation();
  const { user } = useCustomAuth();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [pageStartTime] = useState(Date.now());
  const [sessionShows, setSessionShows] = useState(0);
  const [lastLogTime, setLastLogTime] = useState(0);
  
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Check if current page allows exit intent
  const isPageAllowed = useCallback(() => {
    const currentPath = location.pathname;
    
    // Check disabled pages first
    if (finalConfig.disabledPages.some(page => currentPath.startsWith(page))) {
      return false;
    }
    
    // Check enabled pages
    return finalConfig.enabledPages.some(page => 
      page === '/' ? currentPath === '/' : currentPath.startsWith(page)
    );
  }, [location.pathname, finalConfig]);

  // Check if user type is allowed
  const isUserTypeAllowed = useCallback(() => {
    const userType = user ? 'authenticated' : 'guest';
    return finalConfig.userTypeRestrictions.includes(userType);
  }, [user, finalConfig.userTypeRestrictions]);

  // Check if minimum time on page has passed
  const hasMinTimeElapsed = useCallback(() => {
    const timeOnPage = (Date.now() - pageStartTime) / 1000;
    return timeOnPage >= finalConfig.minTimeOnPage;
  }, [pageStartTime, finalConfig.minTimeOnPage]);

  // Check if we haven't exceeded max shows per session
  const canShowInSession = useCallback(() => {
    return sessionShows < finalConfig.maxShowsPerSession;
  }, [sessionShows, finalConfig.maxShowsPerSession]);

  // Main function to determine if popup should be shown
  const shouldShowPopup = useCallback(() => {
    return (
      isPageAllowed() &&
      isUserTypeAllowed() &&
      hasMinTimeElapsed() &&
      canShowInSession() &&
      !isPopupOpen
    );
  }, [isPageAllowed, isUserTypeAllowed, hasMinTimeElapsed, canShowInSession, isPopupOpen]);

  // Handle exit intent trigger with safety checks
  const handleExitIntent = useCallback(() => {
    // Additional safety check to prevent multiple rapid triggers
    if (isPopupOpen) return;
    
    if (shouldShowPopup()) {
      setIsPopupOpen(true);
      setSessionShows(prev => prev + 1);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Exit intent popup triggered:', {
          page: location.pathname,
          userType: user ? 'authenticated' : 'guest',
          timeOnPage: Math.floor((Date.now() - pageStartTime) / 1000),
          sessionShows: sessionShows + 1
        });
      }
    }
  }, [shouldShowPopup, location.pathname, user, pageStartTime, sessionShows, isPopupOpen]);

  // Initialize exit intent tracking
  const exitIntentState = useExitIntent(handleExitIntent, {
    sensitivity: 20,
    delay: 100,
    cookieExpiry: 24,
    showOnMobile: true,
    aggressive: false
  });

  // Close popup handler
  const closePopup = useCallback(() => {
    setIsPopupOpen(false);
  }, []);

  // Reset session shows (useful for testing)
  const resetSession = useCallback(() => {
    setSessionShows(0);
    exitIntentState.reset();
  }, [exitIntentState]);

  // Get current page context for popup
  const getPageContext = useCallback(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    return {
      currentPage: path,
      planId: searchParams.get('plan'),
      totalAmount: searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : undefined,
      source: searchParams.get('source'),
      utm_source: searchParams.get('utm_source'),
      utm_campaign: searchParams.get('utm_campaign')
    };
  }, [location]);

  // Debug info (only in development) - Simplified to prevent infinite loops
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const now = Date.now();
      // Only log every 3 seconds to prevent spam and only on meaningful changes
      if (now - lastLogTime > 3000) {
        console.log('🔍 Exit Intent Manager State:', {
          currentPath: location.pathname,
          userType: user ? 'authenticated' : 'guest',
          sessionShows,
          isPopupOpen,
          timeOnPage: Math.floor((Date.now() - pageStartTime) / 1000)
        });
        setLastLogTime(now);
      }
    }
  }, [
    location.pathname, 
    user?.id,
    sessionShows, 
    isPopupOpen,
    pageStartTime,
    lastLogTime
  ]);

  return {
    isPopupOpen,
    closePopup,
    resetSession,
    pageContext: getPageContext(),
    canShow: shouldShowPopup(),
    debugInfo: {
      isPageAllowed: isPageAllowed(),
      isUserTypeAllowed: isUserTypeAllowed(),
      hasMinTimeElapsed: hasMinTimeElapsed(),
      canShowInSession: canShowInSession(),
      sessionShows,
      timeOnPage: (Date.now() - pageStartTime) / 1000
    }
  };
};
