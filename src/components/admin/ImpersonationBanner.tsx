import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  User, 
  Clock, 
  LogOut, 
  Shield,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import UserImpersonationService from '@/services/userImpersonationService';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const ImpersonationBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  
  const { setAuth } = useCustomAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check impersonation status and update display
  useEffect(() => {
    const checkImpersonationStatus = () => {
      const isImpersonating = UserImpersonationService.isImpersonating();
      const isValid = UserImpersonationService.validateImpersonationSession();
      
      if (isImpersonating && isValid) {
        setIsVisible(true);
        const session = UserImpersonationService.getImpersonationSession();
        if (session) {
          setAdminUser(session.originalAdminUser);
          setImpersonatedUser(session.impersonatedUser);
        }
        
        const remaining = UserImpersonationService.getSessionTimeRemaining();
        setTimeRemaining(remaining);
      } else {
        setIsVisible(false);
        if (isImpersonating && !isValid) {
          // Session expired, auto-end impersonation
          handleEndImpersonation(true);
        }
      }
    };

    // Initial check
    checkImpersonationStatus();

    // Set up interval to update time remaining
    const interval = setInterval(() => {
      checkImpersonationStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleEndImpersonation = async (autoEnd = false) => {
    try {
      setIsEnding(true);

      const result = await UserImpersonationService.endImpersonation();
      
      if (result.success && result.adminUser && result.adminSession) {
        // Clear all React Query cache to ensure fresh data for restored admin session
        await queryClient.clear();
        
        // Restore admin session
        setAuth(result.adminUser, result.adminSession);
        
        setIsVisible(false);
        
        if (!autoEnd) {
          toast.success('✅ Impersonation Ended', {
            description: 'Returning to admin session...',
            duration: 3000
          });
        } else {
          toast.warning('⏱️ Session Expired', {
            description: 'Impersonation session expired, returning to admin session...',
            duration: 4000
          });
        }
        
        // Navigate to admin panel (React way, no page refresh)
        setTimeout(() => {
          navigate('/admin');
        }, 1000);
      } else {
        toast.error('❌ Error Ending Impersonation', {
          description: result.error || 'Failed to end impersonation session',
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
      toast.error('❌ Unexpected Error', {
        description: 'Failed to end impersonation. Please try again.',
        duration: 5000
      });
    } finally {
      setIsEnding(false);
    }
  };

  // Update CSS custom property for layout spacing
  useEffect(() => {
    if (isVisible) {
      document.documentElement.style.setProperty('--impersonation-banner-height', '120px');
    } else {
      document.documentElement.style.setProperty('--impersonation-banner-height', '0px');
    }
    
    return () => {
      document.documentElement.style.setProperty('--impersonation-banner-height', '0px');
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg border-b-2 border-red-600">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">
                  🎭 ADMIN IMPERSONATION MODE
                </div>
                <div className="text-xs text-orange-100">
                  Viewing as customer - All actions will be performed as this user
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Shield className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Admin: {adminUser?.first_name || 'Unknown'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <User className="w-4 h-4" />
                <span className="text-xs font-medium">
                  User: {(impersonatedUser as any)?.full_name || impersonatedUser?.first_name || 'Unknown'}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {formatTimeRemaining(timeRemaining)} left
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
              Session Active
            </Badge>
            
            <Button
              onClick={() => handleEndImpersonation(false)}
              disabled={isEnding}
              variant="outline"
              size="sm"
              className="bg-white/20 text-white border-white/30 hover:bg-white/30 hover:text-white text-xs px-3 py-1"
            >
              {isEnding ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <LogOut className="w-3 h-3 mr-1" />
                  Exit Impersonation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden mt-2 pt-2 border-t border-white/20">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>Admin: {adminUser?.first_name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>User: {(impersonatedUser as any)?.full_name || impersonatedUser?.first_name || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeRemaining(timeRemaining)} left</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner; 