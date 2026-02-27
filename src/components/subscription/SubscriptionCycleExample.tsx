import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscriptionCycle } from '@/hooks/useSubscriptionCycle';
import { Calendar, Clock, Gift, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const SubscriptionCycleExample: React.FC = () => {
  const {
    subscription,
    cycleInfo,
    selectionWindow,
    notifications,
    planConfig,
    isLoading,
    error,
    
    // Core functions
    getCycleNumber,
    getCycleProgress,
    canSelectToys,
    isSelectionWindowOpen,
    getDaysUntilNextCycle,
    getCycleTimeline,
    
    // Plan-specific functions
    getPlanFeatures,
    getMaxToysForCycle,
    
    // Real-time functions
    forceRefresh,
    getUnreadNotifications
  } = useSubscriptionCycle({
    enableNotifications: true,
    enableRealTimeUpdates: true,
    debugMode: false // Set to true in development
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading subscription cycle...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
          <Button onClick={forceRefresh} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
            <p className="text-gray-600">You don't have an active subscription yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unreadNotifications = getUnreadNotifications();
  const cycleTimeline = getCycleTimeline();
  const planFeatures = getPlanFeatures();
  const maxToys = getMaxToysForCycle();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="h-5 w-5" />
                <span>Subscription Cycle Management</span>
              </CardTitle>
              <CardDescription>
                {planConfig?.planId} • {subscription.status}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
              <Button onClick={forceRefresh} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span>Notifications ({unreadNotifications.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unreadNotifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    notification.priority === 'high' ? 'border-red-500 bg-red-50' :
                    notification.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                    </div>
                    {notification.actionRequired && (
                      <Badge variant="destructive">Action Required</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Current Cycle</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {cycleInfo?.currentCycle || 1}
                </div>
                <div className="text-sm text-gray-600">
                  Current Cycle Number
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(cycleInfo?.progressPercentage || 0)}%</span>
                </div>
                <Progress value={cycleInfo?.progressPercentage || 0} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Days Elapsed</span>
                  <div className="font-semibold">{cycleInfo?.daysIntoCurrentCycle || 0}</div>
                </div>
                <div>
                  <span className="text-gray-600">Days Remaining</span>
                  <div className="font-semibold">{cycleInfo?.daysRemainingInCycle || 0}</div>
                </div>
              </div>

              {cycleInfo && (
                <div className="text-xs text-gray-500">
                  <div>Start: {format(cycleInfo.cycleStartDate, 'MMM dd, yyyy')}</div>
                  <div>End: {format(cycleInfo.cycleEndDate, 'MMM dd, yyyy')}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Selection Window</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={
                  selectionWindow?.status === 'open' ? 'default' :
                  selectionWindow?.status === 'upcoming' ? 'secondary' :
                  selectionWindow?.status === 'closing_soon' ? 'destructive' : 'outline'
                }>
                  {selectionWindow?.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="text-center">
                <div className="text-lg font-semibold">
                  {selectionWindow?.reason || 'No window info'}
                </div>
              </div>

              {selectionWindow && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Opens: {format(selectionWindow.openDate, 'MMM dd, yyyy')}</div>
                  <div>Closes: {format(selectionWindow.closeDate, 'MMM dd, yyyy')}</div>
                  <div>Days until open: {selectionWindow.daysUntilOpen}</div>
                  <div>Days until close: {selectionWindow.daysUntilClose}</div>
                </div>
              )}

              <div className="flex items-center justify-center">
                <Button
                  disabled={!canSelectToys()}
                  className="w-full"
                  variant={canSelectToys() ? 'default' : 'outline'}
                >
                  {canSelectToys() ? 
                    <><CheckCircle className="h-4 w-4 mr-2" />Select Toys</> : 
                    'Selection Closed'
                  }
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Information */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
          <CardDescription>
            {planConfig?.planId} • Max {maxToys} toys per cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Plan Features</h4>
              <ul className="space-y-1 text-sm">
                {planFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Cycle Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Cycle Length</span>
                  <span>{planConfig?.cycleLengthDays || 30} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Selection Window</span>
                  <span>{planConfig?.selectionWindowStart || 30} - {planConfig?.selectionWindowEnd || 7} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Grace Period</span>
                  <span>{planConfig?.gracePeriodDays || 0} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Toys</span>
                  <span>{maxToys}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle Timeline */}
      {cycleTimeline && (
        <Card>
          <CardHeader>
            <CardTitle>Cycle Timeline</CardTitle>
            <CardDescription>
              Historical and upcoming cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Current Cycle</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Cycle {cycleTimeline.currentCycle.cycleNumber}</span>
                    <span>{Math.round(cycleTimeline.currentCycle.progress)}% complete</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(cycleTimeline.currentCycle.startDate, 'MMM dd')} - {format(cycleTimeline.currentCycle.endDate, 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              {cycleTimeline.futureCycles.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Upcoming Cycles</h4>
                  <div className="space-y-2">
                    {cycleTimeline.futureCycles.slice(0, 3).map((cycle) => (
                      <div key={cycle.cycleNumber} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span>Cycle {cycle.cycleNumber}</span>
                          <span className="text-sm text-gray-600">
                            {cycle.daysUntil > 0 ? `${cycle.daysUntil} days` : 'Starting soon'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(cycle.startDate, 'MMM dd')} - {format(cycle.endDate, 'MMM dd, yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Functions Demo</h4>
              <div className="space-y-1">
                <div>getCycleNumber(): {getCycleNumber()}</div>
                <div>getCycleProgress(): {Math.round(getCycleProgress())}%</div>
                <div>canSelectToys(): {canSelectToys().toString()}</div>
                <div>isSelectionWindowOpen(): {isSelectionWindowOpen().toString()}</div>
                <div>getDaysUntilNextCycle(): {getDaysUntilNextCycle()}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Subscription Info</h4>
              <div className="space-y-1">
                <div>ID: {subscription.id}</div>
                <div>Status: {subscription.status}</div>
                <div>Plan: {subscription.plan_type}</div>
                <div>Created: {format(subscription.created_at, 'MMM dd, yyyy')}</div>
                <div>Updated: {format(subscription.updated_at, 'MMM dd, yyyy')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 