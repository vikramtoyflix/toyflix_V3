/**
 * Freshworks Integration Hook
 * React hook for easy access to CRM and WhatsApp integrations
 * Provides methods for user registration and order completion events
 */

import { useCallback } from 'react';
import { 
  FreshworksIntegrationService, 
  type UserRegistrationEvent, 
  type OrderCompletionEvent,
  type IntegrationResult 
} from '@/services/freshworksIntegrationService';
import { toast } from '@/hooks/use-toast';

export const useFreshworksIntegration = () => {
  /**
   * Handle user registration with CRM integration
   */
  const handleUserRegistration = useCallback(async (
    user: {
      id: string;
      first_name: string;
      last_name?: string;
      phone: string;
      email?: string;
    },
    source: 'signup' | 'admin_created' | 'profile_completed' = 'profile_completed'
  ): Promise<IntegrationResult> => {
    try {
      const event: UserRegistrationEvent = {
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone,
        email: user.email,
        source
      };

      const result = await FreshworksIntegrationService.handleUserRegistration(event);

      // Show user-friendly notifications
      if (result.success) {
        if (source === 'profile_completed' && result.whatsappResult?.success) {
          toast({
            title: "Welcome to ToyFlix! 🎉",
            description: "We've sent you a welcome message on WhatsApp.",
            duration: 5000,
          });
        }
      } else if (result.errors && result.errors.length > 0) {
        console.error('Freshworks integration errors:', result.errors);
        // Don't show error toast to user for CRM failures (silent fallback)
      }

      return result;
    } catch (error: any) {
      console.error('User registration integration error:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }, []);

  /**
   * Handle order completion with CRM and WhatsApp integration
   */
  const handleOrderCompletion = useCallback(async (
    order: {
      user_id: string;
      phone: string;
      email: string;
      first_name: string;
      last_name?: string;
      subscription_plan: string;
      age_group: string;
      total_amount: number;
      order_number: string;
      payment_id?: string;
    }
  ): Promise<IntegrationResult> => {
    try {
      const event: OrderCompletionEvent = {
        userId: order.user_id,
        phoneNumber: order.phone,
        email: order.email,
        firstName: order.first_name,
        lastName: order.last_name,
        subscriptionPlan: order.subscription_plan,
        ageGroup: order.age_group,
        totalAmount: order.total_amount,
        orderNumber: order.order_number,
        paymentId: order.payment_id
      };

      const result = await FreshworksIntegrationService.handleOrderCompletion(event);

      // Show user-friendly notifications
      if (result.success) {
        if (result.whatsappResult?.success) {
          toast({
            title: "Order Confirmed! 📱",
            description: "Check your WhatsApp for subscription details.",
            duration: 5000,
          });
        }
      } else if (result.errors && result.errors.length > 0) {
        console.error('Order completion integration errors:', result.errors);
        // Don't show error toast to user for CRM failures (silent fallback)
      }

      return result;
    } catch (error: any) {
      console.error('Order completion integration error:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }, []);

  /**
   * Send renewal reminder via WhatsApp
   */
  const sendRenewalReminder = useCallback(async (
    phoneNumber: string,
    customerName: string,
    expiryDate: string
  ) => {
    try {
      const result = await FreshworksIntegrationService.sendRenewalReminder(
        phoneNumber,
        customerName,
        expiryDate
      );

      if (result.success) {
        toast({
          title: "Reminder Sent! 📅",
          description: `Renewal reminder sent to ${customerName}`,
          duration: 3000,
        });
      } else {
        throw new Error(result.error || 'Failed to send reminder');
      }

      return result;
    } catch (error: any) {
      console.error('Renewal reminder error:', error);
      toast({
        title: "Failed to Send Reminder",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Send cycle notification via WhatsApp
   */
  const sendCycleNotification = useCallback(async (
    phoneNumber: string,
    customerName: string,
    toyNames: string[]
  ) => {
    try {
      const result = await FreshworksIntegrationService.sendCycleNotification(
        phoneNumber,
        customerName,
        toyNames
      );

      if (result.success) {
        toast({
          title: "Notification Sent! 🚚",
          description: `Cycle notification sent to ${customerName}`,
          duration: 3000,
        });
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }

      return result;
    } catch (error: any) {
      console.error('Cycle notification error:', error);
      toast({
        title: "Failed to Send Notification",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Send bulk promotional campaign
   */
  const sendBulkCampaign = useCallback(async (
    recipients: Array<{
      phoneNumber: string;
      customerName: string;
      message: string;
      imageUrl?: string;
    }>,
    delayBetweenMessages: number = 2000
  ) => {
    try {
      console.log(`Starting bulk campaign for ${recipients.length} recipients`);
      
      const results = await FreshworksIntegrationService.sendBulkCampaign(
        recipients,
        delayBetweenMessages
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: "Campaign Sent! 📢",
          description: `${successCount} messages sent successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
          duration: 5000,
        });
      }

      if (failureCount > 0) {
        toast({
          title: "Some Messages Failed",
          description: `${failureCount} out of ${recipients.length} messages failed to send`,
          variant: "destructive",
          duration: 5000,
        });
      }

      return results;
    } catch (error: any) {
      console.error('Bulk campaign error:', error);
      toast({
        title: "Campaign Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      return recipients.map(() => ({ success: false, error: error.message }));
    }
  }, []);

  /**
   * Test integration (for admin use)
   */
  const testIntegration = useCallback(async (testPhone: string, testName: string) => {
    try {
      console.log('Testing Freshworks integration...');
      
      const result = await FreshworksIntegrationService.testIntegration(testPhone, testName);

      if (result.success) {
        toast({
          title: "Integration Test Successful! ✅",
          description: "Both CRM and WhatsApp integrations are working",
          duration: 5000,
        });
      } else {
        toast({
          title: "Integration Test Failed",
          description: result.errors?.join(', ') || 'Unknown error',
          variant: "destructive",
          duration: 5000,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Integration test error:', error);
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, errors: [error.message] };
    }
  }, []);

  /**
   * Get integration status
   */
  const getIntegrationStatus = useCallback(() => {
    return FreshworksIntegrationService.getIntegrationStatus();
  }, []);

  return {
    // Core integration methods
    handleUserRegistration,
    handleOrderCompletion,
    
    // Communication methods
    sendRenewalReminder,
    sendCycleNotification,
    sendBulkCampaign,
    
    // Admin methods
    testIntegration,
    getIntegrationStatus,
  };
}; 