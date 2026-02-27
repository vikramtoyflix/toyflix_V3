import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Package, RefreshCw } from 'lucide-react';
import { useFixedSubscriptionStatus } from '@/hooks/useSubscriptionFix';
import { useSubscriptionUpdate } from '@/hooks/useSubscriptionUpdate';

export const SubscriptionOverview = () => {
  const { 
    data: subscriptionStatus, 
    isLoading, 
    error,
    refetch 
  } = useFixedSubscriptionStatus();
  
  const updateSubscription = useSubscriptionUpdate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionStatus?.hasActiveSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
            <p className="text-gray-600">Subscribe to start your toy rental journey!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Subscription
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="h-8 px-3"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline" className="text-green-600 border-green-200">
                ✅ Active
              </Badge>
              {subscriptionStatus.source === 'user_profile' && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  🔄 Profile Based
                </Badge>
              )}
              {subscriptionStatus.source === 'subscriptions_table' && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  📋 Table Record
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Plan:</span>
              </div>
              <span className="capitalize">{subscriptionStatus.subscriptionPlan?.replace('_', ' ') || 'Basic'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className="w-5 h-5" />
                <span className="font-medium">Status:</span>
              </div>
              <Badge variant="default">
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Detection Source:</span>
              </div>
              <span className="capitalize">
                {subscriptionStatus.source === 'user_profile' ? 'User Profile Flag' : 'Subscription Record'}
              </span>
            </div>

            {subscriptionStatus.source === 'user_profile' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>✅ SUBSCRIPTION DETECTION FIX WORKING!</strong><br />
                  Your subscription was detected from your user profile's <code>subscription_active</code> flag.
                  This fixes the "No Active Subscription" issue you were experiencing.
                </p>
              </div>
            )}

            {/* Test Subscription Update */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSubscription.mutate({ plan: 'premium' })}
                disabled={updateSubscription.isPending}
              >
                Test Premium
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSubscription.mutate({ plan: 'basic' })}
                disabled={updateSubscription.isPending}
              >
                Test Basic
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSubscription.mutate({ plan: 'pro' })}
                disabled={updateSubscription.isPending}
              >
                Test Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>🔍 Subscription Detection Debug:</p>
            <p>• Source: {subscriptionStatus.source}</p>
            <p>• Plan: {subscriptionStatus.subscriptionPlan}</p>
            <p>• Active: {subscriptionStatus.hasActiveSubscription ? 'Yes' : 'No'}</p>
            {subscriptionStatus.source === 'user_profile' && (
              <p className="text-green-600">✅ Fixed: Using subscription_active fallback</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionOverview;
