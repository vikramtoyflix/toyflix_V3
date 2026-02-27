// File: src/components/debug/PaymentTest.tsx
// CREATE NEW FILE for testing

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCombinedSubscriptions } from '@/hooks/useSubscriptionTracking';
import { useCustomAuth } from '@/hooks/useCustomAuth';

export const PaymentTest = () => {
  const { user } = useCustomAuth();
  const { 
    data: subscriptions, 
    hasActiveSubscription, 
    hasRecentSubscription,
    trackingCount,
    legacyCount,
    isLoading 
  } = useCombinedSubscriptions();

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Please log in to test payment tracking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Tracking Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{trackingCount}</div>
            <div className="text-sm text-gray-600">New Subscriptions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{legacyCount}</div>
            <div className="text-sm text-gray-600">Legacy Subscriptions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {hasActiveSubscription ? '✅' : '❌'}
            </div>
            <div className="text-sm text-gray-600">Has Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {hasRecentSubscription ? '🆕' : '⏳'}
            </div>
            <div className="text-sm text-gray-600">Recent Payment</div>
          </div>
        </div>

        {subscriptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Subscriptions Found:</h4>
            {subscriptions.map((sub, index) => (
              <div key={sub.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">
                  {sub.plan_id} - {sub.status}
                </span>
                <div className="flex gap-2">
                  <Badge variant={sub.source === 'tracking' ? 'default' : 'outline'}>
                    {sub.source}
                  </Badge>
                  {sub.payment_amount > 0 && (
                    <Badge variant="outline">
                      ₹{sub.payment_amount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2">✅ System Status</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• New tracking tables created</li>
            <li>• Payment verification updated</li>
            <li>• Dashboard showing combined data</li>
            <li>• {hasRecentSubscription ? 'Recent payments working!' : 'Ready for payments'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};