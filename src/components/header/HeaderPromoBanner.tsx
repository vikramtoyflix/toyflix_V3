import React, { useState, useEffect } from 'react';
import { Copy, Check, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useLocation } from 'react-router-dom';

interface HeaderPromoBannerProps {
  promoCode?: string;
  discount?: number;
  message?: string;
  onClose?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

const HeaderPromoBanner: React.FC<HeaderPromoBannerProps> = ({
  promoCode = 'SAVE10',
  discount = 10,
  message = 'Special Offer! Get 10% off your subscription!',
  onClose,
  onVisibilityChange
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { user } = useCustomAuth();
  const location = useLocation();

  // Only show to non-authenticated users (new users)
  const isNewUser = !user;

  // Pages where banner should NOT be shown
  const disabledPages = [
    '/confirmation-success',
    '/payment-success',
    '/signup-success',
    '/admin'
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

    return true;
  };

  // Notify parent component about visibility changes
  useEffect(() => {
    const shouldShow = isPageAllowed();
    onVisibilityChange?.(shouldShow);
  }, [isNewUser, location.pathname, onVisibilityChange]);

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

  // Don't render if page not allowed
  if (!isPageAllowed()) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Message and discount */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Gift className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{message}</span>
            <Badge variant="secondary" className="bg-white text-orange-600 text-xs px-2 py-0.5 flex-shrink-0">
              {discount}% OFF
            </Badge>
          </div>

          {/* Right side - Promo code and actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-white/20 rounded px-2 py-1">
              <span className="text-xs font-mono font-bold">{promoCode}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-white hover:bg-white/20"
                onClick={copyPromoCode}
              >
                {isCopied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-white hover:bg-white/20"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderPromoBanner;
