import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Clock,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { SubscriptionService } from '@/services/subscriptionService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface BulkCloseSelectionWindowsProps {
  onRefresh?: () => void;
}

interface ManualWindowDetails {
  rental_order_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  order_number: string;
  opened_at: string;
  cycle_day: number;
  subscription_plan: string;
}

const BulkCloseSelectionWindows: React.FC<BulkCloseSelectionWindowsProps> = ({ onRefresh }) => {
  const { user } = useCustomAuth();
  const queryClient = useQueryClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [manualWindowsCount, setManualWindowsCount] = useState(0);
  const [manualWindowsDetails, setManualWindowsDetails] = useState<ManualWindowDetails[]>([]);
  const [bulkCloseReason, setBulkCloseReason] = useState('');

  // Load manual selection windows count and details
  const loadManualWindowsData = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔍 Loading manual selection windows data...');
      const result = await SubscriptionService.getManualSelectionWindowsCount();
      console.log('📊 Manual windows result:', result);
      setManualWindowsCount(result.total);
      setManualWindowsDetails(result.userDetails);
      
      if (result.total === 0) {
        console.log('ℹ️ No manually opened selection windows found');
      } else {
        console.log(`✅ Found ${result.total} manually opened selection windows:`, result.userDetails);
      }
    } catch (error) {
      console.error('❌ Error loading manual windows data:', error);
      toast.error('Failed to load selection window data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadManualWindowsData();
  }, []);

  // Handle bulk close action
  const handleBulkClose = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const result = await SubscriptionService.closeAllManualSelectionWindows(
        user.id,
        bulkCloseReason || 'Bulk closure from admin panel'
      );

      if (result.success) {
        toast.success(`Successfully closed ${result.closedCount} selection windows`);
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['subscription-management'] });
        
        // Refresh parent component
        if (onRefresh) {
          onRefresh();
        }
        
        // Reload our data
        await loadManualWindowsData();
        
        // Close dialog and reset form
        setShowConfirmDialog(false);
        setBulkCloseReason('');
      } else {
        toast.error(`Failed to close selection windows: ${result.error}`);
      }
    } catch (error) {
      console.error('Error during bulk close:', error);
      toast.error('An error occurred while closing selection windows');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Get cycle day badge color
  const getCycleDayBadgeColor = (cycleDay: number) => {
    if (cycleDay >= 24 && cycleDay <= 34) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (cycleDay > 34) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <X className="w-5 h-5 text-red-600" />
            Bulk Close Selection Windows
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadManualWindowsData}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
            {manualWindowsCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {manualWindowsCount} Open
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {manualWindowsCount === 0 ? (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              No manually opened selection windows found. All selection windows are either closed or operating on automatic schedule.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>{manualWindowsCount} selection windows</strong> are currently manually opened. 
                These windows will remain open until manually closed or until an order is placed.
              </AlertDescription>
            </Alert>

            {/* Manual Windows Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Currently Open Windows
              </h4>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {manualWindowsDetails.map((window, index) => (
                  <div key={window.rental_order_id} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{window.user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {window.user_phone}
                        </Badge>
                      </div>
                      <Badge className={`text-xs ${getCycleDayBadgeColor(window.cycle_day)}`}>
                        Day {window.cycle_day}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{window.subscription_plan} • {window.order_number}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(window.opened_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bulk Close Button */}
            <div className="pt-2 border-t">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                variant="destructive"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Close All {manualWindowsCount} Selection Windows
              </Button>
            </div>
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Confirm Bulk Closure
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  This will close <strong>{manualWindowsCount} selection windows</strong> for all users. 
                  Users will no longer be able to select toys until their next cycle or manual reopening.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Textarea
                  value={bulkCloseReason}
                  onChange={(e) => setBulkCloseReason(e.target.value)}
                  placeholder="Enter reason for bulk closure..."
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500">
                  This reason will be logged for audit purposes.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkClose}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Close All Windows
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BulkCloseSelectionWindows;
