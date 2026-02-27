/**
 * Freshworks Integration Service
 * Main orchestrator for CRM and WhatsApp integrations
 * Handles user registration and order completion events
 */

import { FreshworksCRMService, type FreshworksAPIResponse } from './freshworksCRMService';
import { WhatsAppBusinessService, type WhatsAppMessageResponse } from './whatsappBusinessService';
import { isDevelopmentMode, validateFreshworksConfig } from '@/config/freshworks';

// Type definitions for integration events
export interface UserRegistrationEvent {
  userId: string;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  source: 'signup' | 'admin_created' | 'profile_completed';
}

export interface OrderCompletionEvent {
  userId: string;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName?: string;
  subscriptionPlan: string;
  ageGroup: string;
  totalAmount: number;
  orderNumber: string;
  paymentId?: string;
}

export interface IntegrationResult {
  success: boolean;
  crmResult?: FreshworksAPIResponse;
  whatsappResult?: WhatsAppMessageResponse;
  errors?: string[];
  skipped?: string[];
}

export class FreshworksIntegrationService {
  private static isEnabled = true;

  /**
   * Initialize integration service and validate configuration
   */
  static initialize(): { isValid: boolean; errors: string[] } {
    console.log('🔧 Initializing Freshworks Integration Service');

    const configValidation = validateFreshworksConfig();
    const errors: string[] = [];

    if (!configValidation.isValid) {
      errors.push(`Missing environment variables: ${configValidation.missingKeys.join(', ')}`);
      console.warn('⚠️ Freshworks integration disabled due to missing configuration');
      this.isEnabled = false;
    }

    if (isDevelopmentMode()) {
      console.log('🔧 Running in development mode - Freshworks integration enabled but with verbose logging');
    }

    console.log(`✅ Freshworks Integration Service ${this.isEnabled ? 'enabled' : 'disabled'}`);
    return { isValid: configValidation.isValid, errors };
  }

  /**
   * Handle user registration event (called after successful signup/profile completion)
   */
  static async handleUserRegistration(event: UserRegistrationEvent): Promise<IntegrationResult> {
    console.log('👤 Processing user registration event:', event.source, event.phoneNumber);

    if (!this.isEnabled) {
      return { 
        success: true, 
        skipped: ['CRM integration disabled due to configuration'] 
      };
    }

    const results: IntegrationResult = { success: true, errors: [], skipped: [] };

    try {
      // Create/update contact in Freshworks CRM
      console.log('📝 Creating/updating Freshworks contact...');
      const crmResult = await FreshworksCRMService.handleUserRegistration(
        event.firstName,
        event.phoneNumber,
        event.email
      );

      results.crmResult = crmResult;

      if (!crmResult.success) {
        console.error('❌ CRM contact creation failed:', crmResult.error);
        results.errors?.push(`CRM: ${crmResult.error}`);
      } else {
        console.log('✅ CRM contact created/updated successfully:', crmResult.contactId);
      }

      // Send welcome WhatsApp message for completed registrations
      if (event.source === 'profile_completed' && event.firstName) {
        console.log('📱 Sending welcome WhatsApp message...');
        try {
          const whatsappResult = await WhatsAppBusinessService.sendWelcomeMessage(
            event.phoneNumber,
            event.firstName,
            'ToyFlix Subscription'
          );

          results.whatsappResult = whatsappResult;

          if (!whatsappResult.success) {
            console.error('❌ WhatsApp welcome message failed:', whatsappResult.error);
            results.errors?.push(`WhatsApp: ${whatsappResult.error}`);
          } else {
            console.log('✅ WhatsApp welcome message sent:', whatsappResult.messageId);
          }
        } catch (whatsappError: any) {
          console.error('❌ WhatsApp service error:', whatsappError.message);
          results.errors?.push(`WhatsApp: ${whatsappError.message}`);
        }
      } else {
        results.skipped?.push('WhatsApp welcome message (not a completed registration)');
      }

    } catch (error: any) {
      console.error('❌ User registration integration error:', error.message);
      results.success = false;
      results.errors?.push(`Integration: ${error.message}`);
    }

    this.logResult('User Registration', results);
    return results;
  }

  /**
   * Handle order completion event (called after successful payment)
   */
  static async handleOrderCompletion(event: OrderCompletionEvent): Promise<IntegrationResult> {
    console.log('💳 Processing order completion event:', event.orderNumber, event.phoneNumber);

    if (!this.isEnabled) {
      return { 
        success: true, 
        skipped: ['CRM integration disabled due to configuration'] 
      };
    }

    const results: IntegrationResult = { success: true, errors: [], skipped: [] };

    try {
      // Update contact in Freshworks CRM with subscription details
      console.log('📝 Updating Freshworks contact with subscription data...');
      const crmResult = await FreshworksCRMService.handleOrderCompletion(
        event.phoneNumber,
        event.email,
        event.subscriptionPlan,
        event.ageGroup
      );

      results.crmResult = crmResult;

      if (!crmResult.success) {
        console.error('❌ CRM subscription update failed:', crmResult.error);
        results.errors?.push(`CRM: ${crmResult.error}`);
      } else {
        console.log('✅ CRM contact updated with subscription data:', crmResult.contactId);
      }

      // Send subscription confirmation WhatsApp message
      if (event.firstName) {
        console.log('📱 Sending subscription confirmation WhatsApp message...');
        try {
          const whatsappResult = await WhatsAppBusinessService.sendWelcomeMessage(
            event.phoneNumber,
            event.firstName,
            event.subscriptionPlan
          );

          results.whatsappResult = whatsappResult;

          if (!whatsappResult.success) {
            console.error('❌ WhatsApp confirmation message failed:', whatsappResult.error);
            results.errors?.push(`WhatsApp: ${whatsappResult.error}`);
          } else {
            console.log('✅ WhatsApp confirmation message sent:', whatsappResult.messageId);
          }
        } catch (whatsappError: any) {
          console.error('❌ WhatsApp service error:', whatsappError.message);
          results.errors?.push(`WhatsApp: ${whatsappError.message}`);
        }
      } else {
        results.skipped?.push('WhatsApp confirmation message (no customer name available)');
      }

    } catch (error: any) {
      console.error('❌ Order completion integration error:', error.message);
      results.success = false;
      results.errors?.push(`Integration: ${error.message}`);
    }

    this.logResult('Order Completion', results);
    return results;
  }

  /**
   * Send renewal reminder to customers
   */
  static async sendRenewalReminder(
    phoneNumber: string,
    customerName: string,
    expiryDate: string
  ): Promise<WhatsAppMessageResponse> {
    console.log('📅 Sending renewal reminder to:', phoneNumber);

    if (!this.isEnabled) {
      return { 
        success: false, 
        error: 'WhatsApp integration disabled due to configuration' 
      };
    }

    try {
      return await WhatsAppBusinessService.sendRenewalReminder(
        phoneNumber,
        customerName,
        expiryDate
      );
    } catch (error: any) {
      console.error('❌ Renewal reminder error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send cycle notification (toys shipping)
   */
  static async sendCycleNotification(
    phoneNumber: string,
    customerName: string,
    toyNames: string[]
  ): Promise<WhatsAppMessageResponse> {
    console.log('🚚 Sending cycle notification to:', phoneNumber);

    if (!this.isEnabled) {
      return { 
        success: false, 
        error: 'WhatsApp integration disabled due to configuration' 
      };
    }

    try {
      return await WhatsAppBusinessService.sendCycleNotification(
        phoneNumber,
        customerName,
        toyNames
      );
    } catch (error: any) {
      console.error('❌ Cycle notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk promotional campaign
   */
  static async sendBulkCampaign(
    recipients: Array<{
      phoneNumber: string;
      customerName: string;
      message: string;
      imageUrl?: string;
    }>,
    delayBetweenMessages: number = 2000 // 2 seconds delay to avoid rate limiting
  ): Promise<WhatsAppMessageResponse[]> {
    console.log(`📢 Sending bulk campaign to ${recipients.length} recipients`);

    if (!this.isEnabled) {
      return recipients.map(() => ({ 
        success: false, 
        error: 'WhatsApp integration disabled due to configuration' 
      }));
    }

    try {
      const messages = recipients.map(recipient => ({
        phoneNumber: recipient.phoneNumber,
        customerName: recipient.customerName,
        message: recipient.message,
        imageUrl: recipient.imageUrl
      }));

      return await WhatsAppBusinessService.sendBulkMessages(messages, delayBetweenMessages);
    } catch (error: any) {
      console.error('❌ Bulk campaign error:', error.message);
      return recipients.map(() => ({ success: false, error: error.message }));
    }
  }

  /**
   * Get integration status and configuration
   */
  static getIntegrationStatus() {
    const configValidation = validateFreshworksConfig();
    
    return {
      enabled: this.isEnabled,
      configValid: configValidation.isValid,
      missingConfig: configValidation.missingKeys,
      developmentMode: isDevelopmentMode(),
      services: {
        crm: this.isEnabled,
        whatsapp: this.isEnabled
      }
    };
  }

  /**
   * Test integration (for admin purposes)
   */
  static async testIntegration(testPhone: string, testName: string): Promise<IntegrationResult> {
    console.log('🧪 Testing Freshworks integration with:', testPhone);

    if (!this.isEnabled) {
      return { 
        success: false, 
        errors: ['Integration disabled due to configuration'] 
      };
    }

    const results: IntegrationResult = { success: true, errors: [], skipped: [] };

    try {
      // Test CRM contact creation
      const crmResult = await FreshworksCRMService.createContact({
        firstName: testName,
        phoneNumber: testPhone,
        additionalTags: ['test_contact']
      });

      results.crmResult = crmResult;

      if (!crmResult.success) {
        results.errors?.push(`CRM Test Failed: ${crmResult.error}`);
      }

      // Test WhatsApp message
      const whatsappResult = await WhatsAppBusinessService.sendPromotionalMessage({
        phoneNumber: testPhone,
        customerName: testName,
        message: `Hi ${testName}! This is a test message from ToyFlix to verify our WhatsApp integration. 🧪✅`
      });

      results.whatsappResult = whatsappResult;

      if (!whatsappResult.success) {
        results.errors?.push(`WhatsApp Test Failed: ${whatsappResult.error}`);
      }

      results.success = (results.errors?.length || 0) === 0;

    } catch (error: any) {
      console.error('❌ Integration test error:', error.message);
      results.success = false;
      results.errors?.push(`Test Error: ${error.message}`);
    }

    this.logResult('Integration Test', results);
    return results;
  }

  /**
   * Log integration results
   */
  private static logResult(operation: string, result: IntegrationResult) {
    if (result.success) {
      console.log(`✅ ${operation} integration completed successfully`);
      if (result.skipped && result.skipped.length > 0) {
        console.log('⚠️ Skipped operations:', result.skipped);
      }
    } else {
      console.error(`❌ ${operation} integration failed:`, result.errors);
    }

    if (isDevelopmentMode()) {
      console.log(`📊 ${operation} detailed result:`, result);
    }
  }
}

// Initialize on module load
FreshworksIntegrationService.initialize(); 