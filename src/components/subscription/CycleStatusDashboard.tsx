import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from 'react-router-dom';
import { useNextCycleManager } from '@/hooks/useNextCycle';
import { NextCycleToySelection } from './NextCycleToySelection';
import { QueuedToysDisplay } from './QueuedToysDisplay';
import { SubscriptionService } from '@/services/subscriptionService';
import { 
  Clock, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Truck,
  Star,
  Play,
  Pause,
  RotateCcw,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CycleStatusDashboardProps {
  userId: string;
}

export const CycleStatusDashboard = ({ userId }: CycleStatusDashboardProps) => {
  const navigate = useNavigate();
  // const [showToySelection, setShowToySelection] = useState(false); // Removed - now using dedicated page
  const [selectionWindowStatus, setSelectionWindowStatus] = useState<any>(null);
  const [isLoadingWindowStatus, setIsLoadingWindowStatus] = useState(true);
  
  const nextCycleManager = useNextCycleManager(userId);

  const {
    eligibility,
    queuedToys,
    subscriptionDetails,
    isLoadingEligibility,
    isLoadingQueue,
    isLoadingSubscription,
    hasQueue,
    hasActiveSubscription,
    toyLimit,
    queuedToyCount,
    removeToys,
    isRemoving
  } = nextCycleManager;

  // 🎯 FIX: Use the same method that works for queue eligibility
  const fetchSelectionWindowStatus = async () => {
    if (!userId) return;
    
    setIsLoadingWindowStatus(true);
    try {
      console.log('🔍 Fetching selection window status for user:', userId);
      // 🔧 FIX: Use getCurrentSubscriptionCycle instead of getActiveSubscription + calculateCycleData
      const cycleData = await SubscriptionService.getCurrentSubscriptionCycle(userId);
      console.log('🎯 Current cycle data (fixed method):', {
        selection_window_status: cycleData?.selection_window_status,
        manual_selection_control: cycleData?.manual_selection_control,
        current_cycle_day: cycleData?.current_cycle_day
      });
      
      if (cycleData) {
        setSelectionWindowStatus(cycleData);
      }
    } catch (error) {
      console.error('Error fetching selection window status:', error);
    } finally {
      setIsLoadingWindowStatus(false);
    }
  };

  useEffect(() => {
    fetchSelectionWindowStatus();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchSelectionWindowStatus, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered by user');
    await fetchSelectionWindowStatus();
    nextCycleManager.refreshQueue();
    nextCycleManager.refreshEligibility();
  };

  // 🎯 NEW: Determine selection window eligibility based on day 24-34 logic
  const selectionEligibility = useMemo(() => {
    if (!selectionWindowStatus) {
      return {
        canQueue: false,
        isSelectionOpen: false,
        reason: 'No subscription data available',
        status: 'unknown',
        cycleDay: 0,
        daysUntilOpens: 0,
        daysUntilCloses: 0,
        isManualControl: false
      };
    }

    const cycleDay = selectionWindowStatus.current_cycle_day || 1;
    const isManualControl = selectionWindowStatus.manual_selection_control || false;
    const windowStatus = selectionWindowStatus.selection_window_status;

    let canQueue = false;
    let isSelectionOpen = false;
    let reason = '';
    let status = 'closed';
    let daysUntilOpens = Math.max(0, 24 - cycleDay);
    let daysUntilCloses = Math.max(0, 34 - cycleDay);

    if (isManualControl) {
      // Manual control is active
      if (windowStatus === 'manual_open') {
        canQueue = true;
        isSelectionOpen = true;
        status = 'manual_open';
        reason = 'Selection window manually opened by admin';
      } else {
        canQueue = false;
        isSelectionOpen = false;
        status = 'manual_closed';
        reason = 'Selection window manually closed by admin';
      }
    } else {
      // Auto logic: Day 24-34
      if (cycleDay >= 24 && cycleDay <= 34) {
        canQueue = true;
        isSelectionOpen = true;
        status = 'auto_open';
        reason = `Selection window open (Day ${cycleDay} of cycle)`;
      } else if (cycleDay < 24) {
        canQueue = false;
        isSelectionOpen = false;
        status = 'auto_closed_early';
        reason = `Selection opens in ${daysUntilOpens} days (Day 24)`;
      } else {
        canQueue = false;
        isSelectionOpen = false;
        status = 'auto_closed_late';
        reason = 'Selection window has closed for this cycle';
      }
    }

    return {
      canQueue,
      isSelectionOpen,
      reason,
      status,
      cycleDay,
      daysUntilOpens,
      daysUntilCloses,
      isManualControl,
      windowStatus
    };
  }, [selectionWindowStatus]);

  // Loading state
  if (isLoadingEligibility || isLoadingQueue || isLoadingSubscription || isLoadingWindowStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-blue-300 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Loading cycle status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No active subscription
  if (!hasActiveSubscription) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active subscription found. Please subscribe to access next cycle features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate progress based on new logic
  const cycleDays = 30;
  const currentCycleDay = selectionEligibility.cycleDay;
  const progressPercentage = (currentCycleDay / cycleDays) * 100;
  const daysRemaining = Math.max(0, cycleDays - currentCycleDay);

  // Status badges with new logic
  const getStatusBadge = () => {
    if (hasQueue) return <Badge className="bg-green-100 text-green-800">Toys Queued</Badge>;
    
    if (selectionEligibility.isManualControl) {
      if (selectionEligibility.isSelectionOpen) {
        return <Badge className="bg-purple-100 text-purple-800">Manual Open</Badge>;
      } else {
        return <Badge className="bg-orange-100 text-orange-800">Manual Closed</Badge>;
      }
    }
    
    if (selectionEligibility.isSelectionOpen) {
      return <Badge className="bg-blue-100 text-blue-800">Selection Open</Badge>;
    }
    
    return <Badge variant="secondary">Selection Closed</Badge>;
  };

  const getPriorityLevel = () => {
    if (selectionEligibility.isSelectionOpen && !hasQueue) return 'high';
    if (selectionEligibility.daysUntilOpens <= 3) return 'medium';
    return 'low';
  };

  const priority = getPriorityLevel();

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Rental Cycle Status
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Cycle Progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Current Cycle Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Day {currentCycleDay} of {cycleDays}
              </span>
            </div>
            
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {daysRemaining} days remaining
              </span>
              <span className="font-medium">
                {Math.round(progressPercentage)}% complete
              </span>
            </div>
            
            {/* 🎯 NEW: Selection Window Timing */}
            <div className="bg-blue-50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">Selection Window Status</span>
              </div>
              <p className="text-blue-700">{selectionEligibility.reason}</p>
              {selectionEligibility.isManualControl && (
                <p className="text-purple-700 text-xs mt-1">
                  ⚙️ Manual control active - Admin has overridden automatic timing
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Subscription Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Plan</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {subscriptionDetails?.planName || 'Unknown'}
              </p>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Toy Limit</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {toyLimit} toys per cycle
              </p>
            </div>
            
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Truck className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Next Queue</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {queuedToyCount} / {toyLimit} selected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Cycle Queue Status */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Toy Selection Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Queue Status Alert */}
          {hasQueue ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                You have {queuedToyCount} toys queued for your next cycle! 
                Your toys will be automatically processed when your current cycle ends.
              </AlertDescription>
            </Alert>
          ) : selectionEligibility.canQueue ? (
            <Alert className="border-blue-200 bg-blue-50">
              <Play className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                🎯 Selection window is open! Select your toys now for the next cycle.
                {selectionEligibility.isManualControl 
                  ? ' (Manually opened by admin)'
                  : ` Window closes in ${selectionEligibility.daysUntilCloses} days.`
                }
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-gray-200 bg-gray-50">
              <Pause className="h-4 w-4 text-gray-600" />
              <AlertDescription className="text-gray-800">
                {selectionEligibility.reason}
                {selectionEligibility.daysUntilOpens > 0 && (
                  <span> Check back in {selectionEligibility.daysUntilOpens} days!</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Queued Toys Display */}
          {hasQueue && queuedToys && (
            <QueuedToysDisplay 
              queuedToys={queuedToys}
              canModify={queuedToys.canModify}
              onEdit={() => navigate('/select-toys')}
              onRemove={() => removeToys(userId)}
              isRemoving={isRemoving}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {selectionEligibility.canQueue && !hasQueue && (
              <Button 
                onClick={() => navigate('/select-toys')}
                className="flex-1"
              >
                <Package className="h-4 w-4 mr-2" />
                Select Toys for Next Cycle
              </Button>
            )}

            {hasQueue && queuedToys?.canModify && selectionEligibility.canQueue && (
              <Button 
                onClick={() => navigate('/select-toys')}
                variant="outline"
                className="flex-1"
              >
                Edit Queue
              </Button>
            )}

            {hasQueue && (
              <Button 
                onClick={() => removeToys(userId)}
                variant="destructive"
                disabled={isRemoving}
                className="flex-1"
              >
                {isRemoving ? 'Removing...' : 'Cancel Queue'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Priority Indicator */}
      {priority === 'high' && selectionEligibility.isSelectionOpen && !hasQueue && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Action Recommended:</strong> Your selection window is open! 
            {selectionEligibility.isManualControl 
              ? ' This window was manually opened by admin - select your toys before it\'s closed.'
              : ` Select your toys now - window closes in ${selectionEligibility.daysUntilCloses} days.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Toy Selection Modal removed - now using dedicated page at /select-toys */}
    </div>
  );
}; 