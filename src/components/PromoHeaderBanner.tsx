import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';

interface PromoHeaderBannerProps {
  promoCode?: string;
  discount?: number;
  message?: string;
}

const PromoHeaderBanner: React.FC<PromoHeaderBannerProps> = ({
  promoCode = 'SAVE10',
  discount = 10,
  message = 'Special Offer! Get 10% off your subscription!'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const location = useLocation();
  const { user } = useCustomAuth();

  // Only show to non-authenticated users (new users)
  const isNewUser = !user;

  // Pages where banner should NOT be shown (very minimal list)
  const disabledPages = [
    '/confirmation-success', 
    '/payment-success', 
    '/signup-success',
    '/admin' // Keep admin clean
  ];

  // Check if current page allows banner
  const isPageAllowed = () => {
    const currentPath = location.pathname;
    
    // Only show to new users (not signed in)
    if (!isNewUser) {
      return false;
    }
    
    // Check if current page is in disabled list
    if (disabledPages.some(page => currentPath.startsWith(page))) {
      return false;
    }
    
    // Show on ALL other pages (global exit-intent)
    return true;
  };

  // Simple exit-intent detection for desktop
  useEffect(() => {
    if (!isPageAllowed()) return;

    let mouseLeaveTimer: NodeJS.Timeout;
    let idleTimer: NodeJS.Timeout;
    let lastActivity = Date.now();

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    // Desktop: Mouse movement detection - Show EVERY TIME exit-intent is detected
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of page
      if (e.clientY <= 10) {
        mouseLeaveTimer = setTimeout(() => {
          setIsVisible(true);
          console.log('🎯 Exit-intent detected - showing banner for new user');
        }, 300); // Reduced delay for better responsiveness
      }
    };

    const handleMouseEnter = () => {
      if (mouseLeaveTimer) {
        clearTimeout(mouseLeaveTimer);
      }
      // Hide banner when mouse re-enters page so it can show again on next exit-intent
      if (isVisible && !isMobile) {
        setIsVisible(false);
      }
    };

    // Mobile: Idle time detection - Show EVERY TIME after idle period
    const resetIdleTimer = () => {
      lastActivity = Date.now();
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      
      if (isMobile) {
        idleTimer = setTimeout(() => {
          const timeSinceActivity = Date.now() - lastActivity;
          if (timeSinceActivity >= 20000) { // Reduced to 20 seconds for better engagement
            setIsVisible(true);
            console.log('📱 Mobile idle detected - showing banner for new user');
          }
        }, 20000);
      }
    };

    const handleActivity = () => {
      resetIdleTimer();
      // Hide banner on mobile when user becomes active again
      if (isVisible && isMobile) {
        setIsVisible(false);
      }
    };

    // Add event listeners based on device type
    if (isMobile) {
      // Mobile: Track touch and scroll activity
      document.addEventListener('touchstart', handleActivity);
      document.addEventListener('touchmove', handleActivity);
      document.addEventListener('scroll', handleActivity);
      resetIdleTimer(); // Start idle timer
    } else {
      // Desktop: Track mouse leave/enter
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);
    }

    // Cleanup
    return () => {
      if (mouseLeaveTimer) clearTimeout(mouseLeaveTimer);
      if (idleTimer) clearTimeout(idleTimer);
      
      if (isMobile) {
        document.removeEventListener('touchstart', handleActivity);
        document.removeEventListener('touchmove', handleActivity);
        document.removeEventListener('scroll', handleActivity);
      } else {
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [location.pathname, isNewUser]);

  // Copy promo code to clipboard
  const copyPromoCode = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setIsCopied(true);
      toast.success(`Promo code ${promoCode} copied to clipboard!`);
      
      // Reset copy state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy promo code');
    }
  };

  // Close banner
  const closeBanner = () => {
    setIsVisible(false);
  };

  // Add/remove body padding when banner is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.paddingTop = window.innerWidth < 768 ? '100px' : '80px';
      
      // Auto-hide banner after 10 seconds to avoid being too persistent
      const autoHideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      return () => {
        clearTimeout(autoHideTimer);
      };
    } else {
      document.body.style.paddingTop = '0px';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, [isVisible]);

  // Don't render if not visible or page not allowed
  if (!isVisible || !isPageAllowed()) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg animate-in slide-in-from-top duration-500">
        <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5" />
            <div className="flex items-center gap-2">
              <span className="font-semibold">{message}</span>
              <Badge variant="secondary" className="bg-white text-orange-600">
                {discount}% OFF
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1">
              <span className="text-sm font-mono font-bold">{promoCode}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={copyPromoCode}
              >
                {isCopied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
              onClick={closeBanner}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="mt-2 text-sm opacity-90">
          🎉 New customer special! Use this code at checkout to get {discount}% off your first subscription!
        </div>
      </div>
    </div>
  );
};

export default PromoHeaderBanner;
