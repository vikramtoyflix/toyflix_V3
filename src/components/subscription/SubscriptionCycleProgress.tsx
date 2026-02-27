import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { SubscriptionCycleService, SubscriptionCycleData } from '@/services/subscriptionCycleService';

interface SubscriptionCycleProgressProps {
  userId: string;
  className?: string;
}

export const SubscriptionCycleProgress: React.FC<SubscriptionCycleProgressProps> = ({
  userId,
  className = ''
}) => {
  const [cycleData, setCycleData] = useState<SubscriptionCycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cycleService = new SubscriptionCycleService();

  useEffect(() => {
    const fetchCycleData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await cycleService.getCurrentCycle(userId);
        setCycleData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cycle information');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchCycleData();
    }
  }, [userId]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'progress-critical';
    if (percentage >= 75) return 'progress-high';
    if (percentage >= 50) return 'progress-medium';
    return 'progress-low';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'upcoming':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'paused':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusMessage = (status: string, daysRemaining: number) => {
    switch (status) {
      case 'open':
        return daysRemaining <= 1 ? '⚠️ Selection ends soon!' : 'Choose your toys now!';
      case 'closed':
        return 'Cycle complete!';
      case 'upcoming':
        return 'Get ready to choose!';
      case 'paused':
        return 'Subscription paused';
      default:
        return 'Status unknown';
    }
  };

  const getProgressLabel = (cycleNumber: number, percentage: number) => {
    if (percentage < 10) return 'Just started!';
    if (percentage > 95) return 'Almost done!';
    return `${Math.round(percentage)}% complete`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cycle information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="p-6">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Unable to load cycle information</p>
            <p className="text-gray-500 text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cycleData) {
    return (
      <Card className={`${className} border-gray-200`}>
        <CardContent className="p-6">
          <div className="text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No active subscription found</p>
            <p className="text-gray-500 text-sm mt-2">Start a subscription to see your cycle progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    current_cycle_number,
    cycle_progress_percentage,
    days_remaining,
    selection_window_status,
    current_cycle_start,
    current_cycle_end,
    subscription_start_date,
    subscription_status,
    plan_id
  } = cycleData;

  const progressPercentage = Math.min(100, Math.max(0, cycle_progress_percentage));
  const isUrgent = days_remaining <= 1 && selection_window_status === 'open';
  const isPaused = subscription_status === 'paused';

  return (
    <Card 
      className={`${className} ${isPaused ? 'border-orange-200 bg-orange-50' : ''}`}
      role="region"
      aria-label="Subscription Cycle Progress"
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span role="heading" aria-level={2}>
            Cycle {current_cycle_number}
          </span>
          <Badge 
            variant={isPaused ? 'secondary' : 'default'}
            className={isPaused ? 'bg-orange-100 text-orange-800' : ''}
          >
            {plan_id}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div 
          className="space-y-3"
          data-testid="progress-container"
          data-progress-level={getProgressColor(progressPercentage)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {getProgressLabel(current_cycle_number, progressPercentage)}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className={`h-3 progress-bar ${getProgressColor(progressPercentage)}`}
            role="progressbar"
            aria-valuenow={Math.round(progressPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Cycle ${current_cycle_number} progress: ${Math.round(progressPercentage)}% complete`}
          />
        </div>

        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                {days_remaining === 1 ? '1 day remaining' : `${days_remaining} days remaining`}
              </p>
              <p className="text-xs text-gray-500">
                Ends: {formatDate(current_cycle_end)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                Started: {formatDate(subscription_start_date)}
              </p>
              <p className="text-xs text-gray-500">
                Cycle started: {formatDate(current_cycle_start)}
              </p>
            </div>
          </div>
        </div>

        {/* Selection Window Status */}
        <div className={`p-4 rounded-lg border ${
          selection_window_status === 'open' 
            ? 'bg-green-50 border-green-200' 
            : selection_window_status === 'upcoming'
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon(selection_window_status)}
            <div className="flex-1">
              <p className="font-medium">
                {isPaused 
                  ? 'Subscription Paused' 
                  : selection_window_status === 'open' 
                  ? 'Selection Window Open'
                  : selection_window_status === 'upcoming'
                  ? 'Selection Window Upcoming'
                  : 'Selection Window Closed'
                }
              </p>
              <p className="text-sm text-gray-600">
                {isPaused 
                  ? `Cycle ${current_cycle_number} - ${Math.round(progressPercentage)}%`
                  : getStatusMessage(selection_window_status, days_remaining)
                }
              </p>
            </div>
          </div>
        </div>

        {/* Urgent Action Alert */}
        {isUrgent && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-800">
                  ⚠️ Selection ends soon!
                </p>
                <p className="text-sm text-red-600">
                  Only {days_remaining} day{days_remaining !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 