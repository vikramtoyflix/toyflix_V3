import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Play, Square, Clock, AlertCircle, Calendar, X } from 'lucide-react';
import { SubscriptionService } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useQueryClient } from '@tanstack/react-query';

interface SelectionWindowControlsProps {
  rentalOrderId: string;
  currentStatus: string;
  cycleDay: number;
  isManualControl: boolean;
  daysUntilOpens?: number;
  daysUntilCloses?: number;
  notes?: string;
  onStatusChange: () => void;
  userId?: string; // Add userId prop for cache invalidation
}

// Move DialogContent outside to prevent re-creation on each render
const SelectionWindowDialogContent: React.FC<{
  action: 'open' | 'close';
  cycleDay: number;
  adminNotes: string;
  setAdminNotes: (notes: string) => void;
  isLoading: boolean;
  onAction: (action: 'open' | 'close') => void;
  onCancel: () => void;
}> = React.memo(({ action, cycleDay, adminNotes, setAdminNotes, isLoading, onAction, onCancel }) => (
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>
        {action === 'open' ? 'Open' : 'Close'} Selection Window
      </DialogTitle>
      <DialogDescription>
        {action === 'open' 
          ? 'This will immediately open the toy selection window for this user, regardless of the current cycle day. The user will be able to select toys until manually closed or the auto cycle resets.'
          : 'This will immediately close the toy selection window for this user and advance to the next 30-day cycle. The selection window will follow the automatic day 24-34 pattern for the new cycle.'
        }
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-md">
        <div className="text-xs text-blue-800">
          <strong>Current Status:</strong> Day {cycleDay} of cycle
          <br />
          <strong>Auto Window:</strong> Day 24-34 (10 days)
          <br />
          <strong>Action:</strong> {action === 'open' ? 'Enable manual control' : 'Advance to next cycle'}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={`notes-${action}`}>Admin Notes (Optional)</Label>
        <Textarea
          id={`notes-${action}`}
          placeholder="Reason for manual control (e.g., customer request, special circumstances)..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={() => onAction(action)}
          disabled={isLoading}
          className="flex-1"
          variant={action === 'open' ? 'default' : 'destructive'}
        >
          {isLoading ? 'Processing...' : `${action === 'open' ? 'Open' : 'Close'} Window`}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  </DialogContent>
));

const SelectionWindowControls: React.FC<SelectionWindowControlsProps> = ({
  rentalOrderId,
  currentStatus,
  cycleDay,
  isManualControl,
  daysUntilOpens = 0,
  daysUntilCloses = 0,
  notes,
  onStatusChange,
  userId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openNotes, setOpenNotes] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [isOpenDialogOpen, setIsOpenDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useCustomAuth();
  const queryClient = useQueryClient();

  const handleAction = useCallback(async (action: 'open' | 'close') => {
    if (!rentalOrderId) {
      toast({
        title: "Error",
        description: "No rental order ID provided",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "No admin user ID available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const currentNotes = action === 'open' ? openNotes : closeNotes;
      const success = await SubscriptionService.controlSelectionWindow(
        rentalOrderId,
        action,
        currentUser.id,
        currentNotes || `Selection window ${action}ed manually from admin panel`
      );

      if (success) {
        // ✅ ENHANCED FIX: Invalidate ALL relevant cache keys for the user
        if (userId) {
          await Promise.all([
            // Dashboard caches
            queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard', userId] }),
            queryClient.invalidateQueries({ queryKey: ['supabase-dashboard', userId] }),
            queryClient.invalidateQueries({ queryKey: ['mobile-dashboard', userId] }),
            
            // Subscription and cycle caches
            queryClient.invalidateQueries({ queryKey: ['subscription-cycle', userId] }),
            queryClient.invalidateQueries({ queryKey: ['rental-subscription-data', userId] }),
            queryClient.invalidateQueries({ queryKey: ['upcoming-cycles', userId] }),
            queryClient.invalidateQueries({ queryKey: ['cycleStatus', userId] }),
            queryClient.invalidateQueries({ queryKey: ['unified-subscription-status', userId] }),
            
            // Selection window caches
            queryClient.invalidateQueries({ queryKey: ['subscription-selection', userId] }),
            queryClient.invalidateQueries({ queryKey: ['selection-status', userId] }),
            queryClient.invalidateQueries({ queryKey: ['can-select-toys', userId] }),
            
            // Next cycle and queue caches
            queryClient.invalidateQueries({ queryKey: ['next-cycle-manager', userId] }),
            queryClient.invalidateQueries({ queryKey: ['next-cycle-eligibility', userId] }),
            queryClient.invalidateQueries({ queryKey: ['next-cycle-queue', userId] }),
            
            // User subscription caches
            queryClient.invalidateQueries({ queryKey: ['userSubscription', userId] }),
            queryClient.invalidateQueries({ queryKey: ['user-subscription-status', userId] }),
            
            // General caches (without user ID)
            queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] }),
            queryClient.invalidateQueries({ queryKey: ['subscription-selection'] }),
            queryClient.invalidateQueries({ queryKey: ['next-cycle-manager'] })
          ]);
          
          // Force a small delay to ensure cache invalidation completes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        toast({
          title: "Success",
          description: `Selection window ${action}ed successfully. User dashboard will update shortly.`,
        });
        
        // Force immediate refetch of dashboard data
        await queryClient.refetchQueries({ queryKey: ['rental-orders-dashboard', userId] });
        await queryClient.refetchQueries({ queryKey: ['selection-status', userId] });
        
        // Close dialogs and reset notes
        setIsOpenDialogOpen(false);
        setIsCloseDialogOpen(false);
        setOpenNotes('');
        setCloseNotes('');
        
        // Call status change after cache invalidation
        setTimeout(() => {
          onStatusChange();
        }, 100);
      } else {
        toast({
          title: "Error",
          description: `Failed to ${action} selection window`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing selection window:`, error);
      toast({
        title: "Error",
        description: `Error ${action}ing selection window`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [rentalOrderId, currentUser?.id, openNotes, closeNotes, toast, onStatusChange, queryClient, userId]);

  const handleReset = useCallback(async () => {
    if (!rentalOrderId) {
      toast({
        title: "Error",
        description: "No rental order ID provided",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await SubscriptionService.resetSelectionWindowToAuto(rentalOrderId);
      
      if (success) {
        // ✅ FIX: Invalidate cache when resetting to auto
        if (userId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard', userId] }),
            queryClient.invalidateQueries({ queryKey: ['subscription-cycle', userId] }),
            queryClient.invalidateQueries({ queryKey: ['rental-subscription-data', userId] }),
            queryClient.invalidateQueries({ queryKey: ['selection-status', userId] })
          ]);
        }
        
        toast({
          title: "Success",
          description: "Selection window reset to auto cycle. User dashboard will update shortly.",
        });
        setTimeout(() => {
          onStatusChange();
        }, 100);
      } else {
        toast({
          title: "Error",
          description: "Failed to reset selection window",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting selection window:', error);
      toast({
        title: "Error",
        description: "Error resetting selection window",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [rentalOrderId, toast, onStatusChange, queryClient, userId]);

  const handleCancel = useCallback(() => {
    setIsOpenDialogOpen(false);
    setIsCloseDialogOpen(false);
    setOpenNotes('');
    setCloseNotes('');
  }, []);

  const getStatusBadge = () => {
    if (isManualControl) {
      return currentStatus === 'open' || currentStatus === 'manual_open' ? 
        <Badge variant="default" className="bg-green-500 text-white">Manual Open</Badge> :
        <Badge variant="secondary" className="bg-red-500 text-white">Manual Closed</Badge>;
    } else {
      return cycleDay >= 24 && cycleDay <= 34 ? 
        <Badge variant="default" className="bg-blue-500 text-white">Auto Open (Day {cycleDay})</Badge> :
        <Badge variant="outline">Auto Closed (Day {cycleDay})</Badge>;
    }
  };

  const getWindowTiming = () => {
    if (cycleDay < 24) {
      return `Opens in ${24 - cycleDay} days (Day 24)`;
    } else if (cycleDay >= 24 && cycleDay <= 34) {
      return `Closes in ${34 - cycleDay} days (Day 34)`;
    } else {
      return 'Window closed for this cycle';
    }
  };

  const isWindowCurrentlyOpen = () => {
    if (isManualControl) {
      return currentStatus === 'manual_open' || currentStatus === 'open';
    }
    return cycleDay >= 24 && cycleDay <= 34;
  };

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Selection Window</span>
        </div>
        {getStatusBadge()}
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          <span>Current Cycle Day: {cycleDay}</span>
        </div>
        <div className="pl-5">
          {getWindowTiming()}
        </div>
        {isManualControl && (
          <div className="pl-5 text-orange-600 font-medium">
            Manual control active
          </div>
        )}
        {notes && (
          <div className="pl-5 text-gray-500 italic">
            Note: {notes}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {/* Open Dialog */}
        <Dialog open={isOpenDialogOpen} onOpenChange={setIsOpenDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || (isWindowCurrentlyOpen() && !isManualControl)}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              Open
            </Button>
          </DialogTrigger>
          <SelectionWindowDialogContent
            action="open"
            cycleDay={cycleDay}
            adminNotes={openNotes}
            setAdminNotes={setOpenNotes}
            isLoading={isLoading}
            onAction={handleAction}
            onCancel={handleCancel}
          />
        </Dialog>

        {/* Close Dialog */}
        <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || (!isWindowCurrentlyOpen() && !isManualControl)}
              className="flex-1"
            >
              <Square className="w-3 h-3 mr-1" />
              Close
            </Button>
          </DialogTrigger>
          <SelectionWindowDialogContent
            action="close"
            cycleDay={cycleDay}
            adminNotes={closeNotes}
            setAdminNotes={setCloseNotes}
            isLoading={isLoading}
            onAction={handleAction}
            onCancel={handleCancel}
          />
        </Dialog>

        {/* Quick Close Button for Manual Open Windows */}
        {isManualControl && isWindowCurrentlyOpen() && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleAction('close')}
            disabled={isLoading}
            title="Quickly close this manually opened selection window"
            className="px-3"
          >
            <X className="w-3 h-3 mr-1" />
            Quick Close
          </Button>
        )}

        {isManualControl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
            title="Reset to automatic day 24-34 cycle management"
            className="px-2"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Reset Auto
          </Button>
        )}
      </div>

      {/* Window Status Indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Window Status:</span>
        <span className={`font-medium ${isWindowCurrentlyOpen() ? 'text-green-600' : 'text-red-600'}`}>
          {isWindowCurrentlyOpen() ? 'OPEN - Toys can be selected' : 'CLOSED - Selection not available'}
        </span>
      </div>
    </div>
  );
};

export default SelectionWindowControls; 