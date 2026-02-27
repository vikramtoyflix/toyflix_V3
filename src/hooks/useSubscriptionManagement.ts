
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionService } from '@/services/subscriptionService';
import { SubscriptionOperation } from '@/types/subscription';

export const useSubscriptionManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleOperation = async (
    operation: () => Promise<SubscriptionOperation>,
    successMessage?: string
  ): Promise<SubscriptionOperation> => {
    setIsLoading(true);
    try {
      const result = await operation();
      
      if (result.success) {
        toast({
          title: "Success",
          description: successMessage || result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return { success: false, message: errorMessage, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async (planId: string, userId: string) => {
    return handleOperation(
      () => SubscriptionService.subscribe(planId, userId),
      "Successfully subscribed to plan!"
    );
  };

  const pauseSubscription = async (userId: string, months: number) => {
    return handleOperation(
      () => SubscriptionService.pauseSubscription(userId, months),
      `Subscription paused for ${months} months`
    );
  };

  const resumeSubscription = async (userId: string) => {
    return handleOperation(
      () => SubscriptionService.resumeSubscription(userId),
      "Subscription resumed successfully"
    );
  };

  const upgradePlan = async (userId: string, newPlanId: string) => {
    return handleOperation(
      () => SubscriptionService.upgradePlan(userId, newPlanId),
      "Plan upgraded successfully"
    );
  };

  const cancelSubscription = async (userId: string) => {
    return handleOperation(
      () => SubscriptionService.cancelSubscription(userId),
      "Subscription cancelled successfully"
    );
  };

  const renewSubscription = async (userId: string) => {
    return handleOperation(
      () => SubscriptionService.renewSubscription(userId),
      "Subscription renewed successfully"
    );
  };

  const generateMonthlyCycle = async (userId: string) => {
    return handleOperation(
      () => SubscriptionService.generateMonthlyCycle(userId),
      "Monthly cycle generated successfully"
    );
  };

  const queryUserEntitlements = async (userId: string) => {
    return handleOperation(
      () => SubscriptionService.queryUserEntitlements(userId)
    );
  };

  return {
    isLoading,
    subscribe,
    pauseSubscription,
    resumeSubscription,
    upgradePlan,
    cancelSubscription,
    renewSubscription,
    generateMonthlyCycle,
    queryUserEntitlements,
  };
};
