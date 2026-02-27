import React from 'react';
import { useSubscriptionCycle } from '@/hooks/useSubscriptionCycle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Calendar, 
  Clock, 
  Gift, 
  AlertCircle, 
  CheckCircle,
  RefreshCw 
} from 'lucide-react';
import { format } from 'date-fns';

interface SubscriptionCycleDisplayProps {
  userId: string;
  enableDebugLogging?: boolean;
  onSelectToys?: () => void;
}

export function SubscriptionCycleDisplay({ 
  userId, 
  enableDebugLogging = false,
  onSelectToys 
}: SubscriptionCycleDisplayProps) {
  const {
    formattedStatus,
    nextImportantDate,
    selectionWindowInfo,
    cycleProgress,
    planInfo,
    canSelectToys,
    isLoading,
    isError,
    error,
    refetch,
    debug
  } = useSubscriptionCycle(userId, {
    enableDebugLogging,
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading subscription cycle...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Error loading subscription cycle</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="mt-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!planInfo.isActive) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">No Active Subscription</p>
              <p className="text-sm">Subscribe to start your toy adventure!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Cycle Status Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900">
                {formattedStatus?.title || 'Current Cycle'}
              </h3>
              <p className="text-blue-700 text-sm">
                {planInfo.planId} • {planInfo.status}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cycle Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Cycle Progress</span>
              <span className="font-medium text-blue-900">
                {formattedStatus?.progressText || '0%'}
              </span>
            </div>
            <Progress value={cycleProgress.percentage} className="h-2" />
            <p className="text-xs text-blue-600">
              {formattedStatus?.description || 'No cycle information'}
            </p>
          </div>

          {/* Selection Window Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/60">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Selection Window</span>
            </div>
            <Badge 
              variant={selectionWindowInfo.isOpen ? "default" : "secondary"}
              className={selectionWindowInfo.isOpen ? "bg-green-500" : ""}
            >
              {selectionWindowInfo.status}
            </Badge>
          </div>

          {/* Action Button */}
          {canSelectToys && onSelectToys && (
            <Button 
              onClick={onSelectToys}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Gift className="w-4 h-4 mr-2" />
              Select Toys for Next Cycle
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detailed Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cycle Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-4 h-4" />
              Cycle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Cycle</span>
              <span className="font-medium">#{cycleProgress.currentCycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Days Elapsed</span>
              <span className="font-medium">{cycleProgress.daysElapsed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Days Remaining</span>
              <span className="font-medium">{cycleProgress.daysRemaining}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Cycle Days</span>
              <span className="font-medium">{cycleProgress.totalDays}</span>
            </div>
          </CardContent>
        </Card>

        {/* Selection Window Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Selection Window
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <div className="flex items-center gap-2">
                {selectionWindowInfo.isOpen ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium">
                  {selectionWindowInfo.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
            
            {!selectionWindowInfo.isOpen && selectionWindowInfo.opensIn > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Opens In</span>
                <span className="font-medium">{selectionWindowInfo.opensIn} days</span>
              </div>
            )}
            
            {selectionWindowInfo.isOpen && selectionWindowInfo.closesIn > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Closes In</span>
                <span className="font-medium">{selectionWindowInfo.closesIn} days</span>
              </div>
            )}

            {canSelectToys && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✨ You can select toys now!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Important Date */}
      {nextImportantDate?.date && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next Important Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{nextImportantDate.description}</p>
                <p className="text-sm text-gray-600">
                  {format(nextImportantDate.date, 'EEEE, MMMM dd, yyyy')}
                </p>
              </div>
              <Badge variant="outline">
                {nextImportantDate.type.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Section (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={debug}
              className="w-full"
            >
              Log Debug Info to Console
            </Button>
            <div className="text-xs text-gray-500 space-y-1">
              <p>User ID: {userId}</p>
              <p>Plan: {planInfo.planId}</p>
              <p>Status: {planInfo.status}</p>
              <p>Can Select Toys: {canSelectToys ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SubscriptionCycleDisplay; 