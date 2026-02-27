import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Package, Loader2 } from 'lucide-react';
import { getUserSubscriptionPlan, getSubscriptionPlanDisplay, getUpgradeSuggestion, type UserSubscriptionPlan } from '@/utils/subscriptionUtils';

interface SubscriptionPlanBannerProps {
  userId: string;
  showUpgradeButton?: boolean;
  className?: string;
}

export const SubscriptionPlanBanner: React.FC<SubscriptionPlanBannerProps> = ({
  userId,
  showUpgradeButton = true,
  className = ''
}) => {
  const [userSubscriptionPlan, setUserSubscriptionPlan] = useState<UserSubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSubscriptionPlan = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Loading subscription plan for banner...');
        const plan = await getUserSubscriptionPlan(userId);
        setUserSubscriptionPlan(plan);
        console.log('✅ Subscription plan loaded:', plan);
      } catch (error) {
        console.error('❌ Error loading subscription plan:', error);
        setUserSubscriptionPlan(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionPlan();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className={`border-gray-200 bg-gray-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            <div className="flex-1">
              <div className="w-32 h-4 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-48 h-3 bg-gray-300 rounded animate-pulse mt-2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userSubscriptionPlan) {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">No Active Subscription</h3>
              <p className="text-sm text-amber-700 mt-1">
                Subscribe to a plan to manage your toy queue and enjoy automatic deliveries.
              </p>
              {showUpgradeButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.location.href = '/subscription'}
                >
                  View Subscription Plans
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planDisplay = getSubscriptionPlanDisplay(userSubscriptionPlan.planType);
  
  if (userSubscriptionPlan.isFreeQueueUpdates) {
    // Premium plan banner (Silver/Gold)
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-green-900">Change Toys Anytime</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {planDisplay.icon} {planDisplay.name}
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You can change your toy selection for your next box anytime - completely free! 
                No extra fees when you want different toys.
              </p>
              <div className="flex items-center space-x-1 mt-2 text-xs text-green-600">
                <Crown className="w-3 h-3" />
                <span>Premium Benefit</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } else {
    // Discovery Delight plan banner
    const upgradeSuggestion = getUpgradeSuggestion(userSubscriptionPlan.planType);
    
    return (
      <Card className={`border-blue-200 bg-blue-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-blue-900">Queue Update Pricing</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {planDisplay.icon} {planDisplay.name}
                </Badge>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Changing toys costs ₹199 + GST (₹235 total) with Discovery Delight plan.
              </p>
              {upgradeSuggestion && showUpgradeButton && (
                <div className="mt-2 p-2 bg-blue-100 rounded-md">
                  <p className="text-xs text-blue-800 font-medium">💡 Upgrade Suggestion:</p>
                  <p className="text-xs text-blue-700 mt-1">{upgradeSuggestion.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => window.location.href = upgradeSuggestion.upgradeUrl}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}; 