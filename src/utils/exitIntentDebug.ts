/**
 * Exit Intent Debug Utilities
 * 
 * This file provides debugging utilities for the exit-intent popup system.
 * Use these functions in the browser console to test and debug the system.
 */

declare global {
  interface Window {
    exitIntentDebug: {
      clearCookie: () => void;
      triggerExitIntent: () => void;
      getState: () => any;
      enableDebugMode: () => void;
      disableDebugMode: () => void;
    };
  }
}

export const exitIntentDebug = {
  /**
   * Clear the exit-intent cookie to allow popup to show again
   */
  clearCookie: () => {
    document.cookie = 'toyflix_exit_intent_shown=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('✅ Exit-intent cookie cleared');
  },

  /**
   * Manually trigger exit intent for testing
   */
  triggerExitIntent: () => {
    // Simulate mouse leaving the page
    const event = new MouseEvent('mouseleave', {
      clientY: 0,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
    console.log('🎯 Exit intent manually triggered');
  },

  /**
   * Get current exit-intent state from localStorage/sessionStorage
   */
  getState: () => {
    const cookie = document.cookie
      .split(';')
      .find(cookie => cookie.trim().startsWith('toyflix_exit_intent_shown='));
    
    const state = {
      hasCookie: !!cookie,
      cookieValue: cookie ? cookie.split('=')[1] : null,
      cookieAge: cookie ? Math.floor((Date.now() - parseInt(cookie.split('=')[1])) / (1000 * 60 * 60)) : null,
      currentPath: window.location.pathname,
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768
    };
    
    console.log('📊 Exit Intent State:', state);
    return state;
  },

  /**
   * Enable debug mode (more verbose logging)
   */
  enableDebugMode: () => {
    localStorage.setItem('exit_intent_debug', 'true');
    console.log('🔍 Exit intent debug mode enabled');
  },

  /**
   * Disable debug mode
   */
  disableDebugMode: () => {
    localStorage.removeItem('exit_intent_debug');
    console.log('🔇 Exit intent debug mode disabled');
  },

  /**
   * Reset everything for testing
   */
  reset: () => {
    exitIntentDebug.clearCookie();
    sessionStorage.removeItem('exit_intent_session_shows');
    console.log('🔄 Exit intent system reset for testing');
  },

  /**
   * Test exit intent on different pages
   */
  testPages: () => {
    const testPages = [
      '/',
      '/pricing',
      '/subscription-flow',
      '/auth',
      '/dashboard',
      '/admin'
    ];
    
    console.log('🧪 Testing exit intent on different pages:');
    testPages.forEach(page => {
      const isEnabled = !(['/auth', '/dashboard', '/admin'].some(disabled => page.startsWith(disabled)));
      console.log(`${isEnabled ? '✅' : '❌'} ${page}: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
    });
  },

  /**
   * Simulate different user scenarios
   */
  simulateScenarios: () => {
    console.log('🎭 Exit Intent Scenarios:');
    console.log('1. New visitor (no cookie): Should show popup');
    console.log('2. Returning visitor (has cookie): Should NOT show popup');
    console.log('3. Mobile user: Should show popup with scroll trigger');
    console.log('4. Desktop user: Should show popup with mouse leave trigger');
    console.log('5. Admin pages: Should NOT show popup');
    console.log('6. Auth pages: Should NOT show popup');
    console.log('\nUse exitIntentDebug.clearCookie() and exitIntentDebug.triggerExitIntent() to test');
  }
};

// Make debug utilities available globally in development
if (process.env.NODE_ENV === 'development') {
  window.exitIntentDebug = exitIntentDebug;
  console.log('🛠️ Exit Intent Debug utilities loaded. Use window.exitIntentDebug in console');
}
