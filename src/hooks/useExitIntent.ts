import { useEffect, useState, useCallback } from 'react';

interface ExitIntentOptions {
  sensitivity?: number; // How close to the top edge to trigger (default: 20px)
  delay?: number; // Delay before showing popup after trigger (default: 100ms)
  cookieExpiry?: number; // Hours before showing again (default: 24)
  showOnMobile?: boolean; // Whether to show on mobile devices (default: false)
  aggressive?: boolean; // Show on any upward mouse movement (default: false)
}

interface ExitIntentState {
  isTriggered: boolean;
  canShow: boolean;
  hasBeenShown: boolean;
}

const DEFAULT_OPTIONS: Required<ExitIntentOptions> = {
  sensitivity: 20,
  delay: 100,
  cookieExpiry: 24,
  showOnMobile: false,
  aggressive: false
};

export const useExitIntent = (
  onExitIntent: () => void,
  options: ExitIntentOptions = {}
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<ExitIntentState>({
    isTriggered: false,
    canShow: true,
    hasBeenShown: false
  });

  // Check if user is on mobile
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }, []);

  // Check cookie to see if popup was already shown
  const checkCookie = useCallback(() => {
    const cookieName = 'toyflix_exit_intent_shown';
    const cookies = document.cookie.split(';');
    const exitIntentCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${cookieName}=`)
    );
    
    if (exitIntentCookie) {
      const timestamp = parseInt(exitIntentCookie.split('=')[1]);
      const hoursAgo = (Date.now() - timestamp) / (1000 * 60 * 60);
      return hoursAgo < config.cookieExpiry;
    }
    return false;
  }, [config.cookieExpiry]);

  // Set cookie when popup is shown
  const setCookie = useCallback(() => {
    const cookieName = 'toyflix_exit_intent_shown';
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (config.cookieExpiry * 60 * 60 * 1000));
    document.cookie = `${cookieName}=${Date.now()}; expires=${expiryDate.toUTCString()}; path=/`;
  }, [config.cookieExpiry]);

  // Handle mouse leave event
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Don't trigger if already shown or can't show
    if (state.hasBeenShown || !state.canShow) return;

    // Don't trigger on mobile unless explicitly enabled
    if (isMobile() && !config.showOnMobile) return;

    // Check if mouse is leaving from the top of the page
    const shouldTrigger = config.aggressive 
      ? e.clientY < config.sensitivity || e.clientY <= 0
      : e.clientY <= config.sensitivity;

    if (shouldTrigger) {
      setState(prev => ({ ...prev, isTriggered: true }));
      
      // Delay showing the popup
      setTimeout(() => {
        // Use setState callback to get current state instead of closure
        setState(prev => {
          if (!prev.hasBeenShown) {
            // Track exit intent
            try {
              if (typeof window !== 'undefined' && window.cbq) {
                window.cbq('track', 'ExitIntent', {
                  trigger_type: 'mouse_leave',
                  sensitivity: config.sensitivity,
                  is_mobile: isMobile(),
                  timestamp: new Date().toISOString()
                });
              }
            } catch (error) {
              console.error('Analytics tracking error:', error);
            }
            
            onExitIntent();
            setCookie();
            return {
              ...prev,
              hasBeenShown: true,
              canShow: false
            };
          }
          return prev;
        });
      }, config.delay);
    }
  }, [state.hasBeenShown, state.canShow, config, onExitIntent, setCookie, isMobile]);

  // Handle scroll-based exit intent (for mobile)
  const handleScroll = useCallback(() => {
    if (!config.showOnMobile || !isMobile() || state.hasBeenShown || !state.canShow) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;

    // Trigger when user scrolls to 70% of the page
    if (scrollPercentage > 70) {
      // Track exit intent on mobile
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'ExitIntent', {
            trigger_type: 'scroll',
            scroll_percentage: scrollPercentage,
            is_mobile: true,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      setState(prev => ({ ...prev, isTriggered: true }));
      onExitIntent();
      setState(prev => ({
        ...prev,
        hasBeenShown: true,
        canShow: false
      }));
      setCookie();
    }
  }, [config.showOnMobile, state.hasBeenShown, state.canShow, onExitIntent, setCookie, isMobile]);

  // Initialize exit intent tracking
  useEffect(() => {
    // Check if popup was already shown recently
    if (checkCookie()) {
      setState(prev => ({ ...prev, canShow: false, hasBeenShown: true }));
      return;
    }

    // Add event listeners
    document.addEventListener('mouseleave', handleMouseLeave);
    
    if (config.showOnMobile && isMobile()) {
      window.addEventListener('scroll', handleScroll);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleMouseLeave, handleScroll, checkCookie, config.showOnMobile, isMobile]);

  // Reset function to allow showing popup again (useful for testing)
  const reset = useCallback(() => {
    setState({
      isTriggered: false,
      canShow: true,
      hasBeenShown: false
    });
    // Clear cookie
    document.cookie = 'toyflix_exit_intent_shown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }, []);

  return {
    isTriggered: state.isTriggered,
    canShow: state.canShow,
    hasBeenShown: state.hasBeenShown,
    reset
  };
};
