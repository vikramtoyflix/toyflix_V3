/**
 * WhatsApp Business API Service
 * Handles promotional messages and customer communication via WhatsApp
 * Integrates with Facebook Graph API for WhatsApp Business
 */

import { freshworksConfig } from '@/config/freshworks';

// Type definitions for WhatsApp messages
export interface WhatsAppTemplateMessage {
  phoneNumber: string;
  templateName: string;
  headerImageUrl?: string;
  bodyText: string;
  language?: string;
}

export interface WhatsAppMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

export interface WhatsAppPromoMessage {
  phoneNumber: string;
  customerName: string;
  message: string;
  imageUrl?: string;
}

export class WhatsAppBusinessService {
  private static readonly baseUrl = freshworksConfig.whatsapp.baseUrl;
  private static readonly accessToken = freshworksConfig.whatsapp.accessToken;
  private static readonly phoneId = freshworksConfig.whatsapp.phoneId;
  private static readonly templateName = freshworksConfig.whatsapp.templateName;

  /**
   * Make HTTP request to WhatsApp API with timeout and error handling
   */
  private static async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), freshworksConfig.timeouts.whatsappTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Format phone number for WhatsApp API (add India country code if needed)
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // If starts with +91, remove the +
    if (phoneNumber.startsWith('+91')) {
      return cleanPhone;
    }
    
    // If starts with 91, keep as is
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return cleanPhone;
    }
    
    // If 10 digits, add 91 prefix (India)
    if (cleanPhone.length === 10) {
      return `91${cleanPhone}`;
    }
    
    return cleanPhone;
  }

  /**
   * Send template message via WhatsApp
   */
  static async sendTemplateMessage(request: WhatsAppTemplateMessage): Promise<WhatsAppMessageResponse> {
    try {
      console.log('📱 Sending WhatsApp template message to:', request.phoneNumber);

      const formattedPhone = this.formatPhoneNumber(request.phoneNumber);
      
      // Prepare message body according to WhatsApp Business API format
      const messageBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: request.templateName || this.templateName,
          language: {
            code: request.language || 'en_US'
          },
          components: [] as any[]
        }
      };

      // Add header with image if provided
      if (request.headerImageUrl) {
        messageBody.template.components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: request.headerImageUrl
              }
            }
          ]
        });
      }

      // Add body text
      if (request.bodyText) {
        messageBody.template.components.push({
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: request.bodyText
            }
          ]
        });
      }

      const url = `${this.baseUrl}/${this.phoneId}/messages`;
      const response = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify(messageBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ WhatsApp API error:', response.status, errorData);
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData.error?.message || 'WhatsApp API error'}`,
          details: errorData
        };
      }

      const result = await response.json();
      console.log('✅ WhatsApp message sent successfully:', result.messages?.[0]?.id);

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        details: result
      };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send promotional message (using default template)
   */
  static async sendPromotionalMessage(request: WhatsAppPromoMessage): Promise<WhatsAppMessageResponse> {
    console.log('🎯 Sending promotional WhatsApp message');

    return await this.sendTemplateMessage({
      phoneNumber: request.phoneNumber,
      templateName: this.templateName,
      headerImageUrl: request.imageUrl || 'https://i.ibb.co/hFVFrvC/TFwhatsapp1.jpg', // Default ToyFlix image
      bodyText: request.message,
      language: 'en_US'
    });
  }

  /**
   * Send welcome message for new subscribers
   */
  static async sendWelcomeMessage(
    phoneNumber: string,
    customerName: string,
    subscriptionPlan: string
  ): Promise<WhatsAppMessageResponse> {
    const welcomeMessage = `Welcome to ToyFlix, ${customerName}! 🎉\n\nThank you for subscribing to our ${subscriptionPlan}. Get ready for an amazing toy rental experience!\n\nYour toys will be delivered soon. We can't wait for your little one to start playing! 🧸`;

    return await this.sendPromotionalMessage({
      phoneNumber,
      customerName,
      message: welcomeMessage,
      imageUrl: 'https://i.ibb.co/hFVFrvC/TFwhatsapp1.jpg'
    });
  }

  /**
   * Send subscription renewal reminder
   */
  static async sendRenewalReminder(
    phoneNumber: string,
    customerName: string,
    expiryDate: string
  ): Promise<WhatsAppMessageResponse> {
    const reminderMessage = `Hi ${customerName}! 📅\n\nYour ToyFlix subscription is expiring on ${expiryDate}. Don't let the fun stop!\n\nRenew your subscription to continue enjoying premium toys for your little one. Visit our website or contact us to renew. 🎪`;

    return await this.sendPromotionalMessage({
      phoneNumber,
      customerName,
      message: reminderMessage
    });
  }

  /**
   * Send cycle notification (toys shipping soon)
   */
  static async sendCycleNotification(
    phoneNumber: string,
    customerName: string,
    toyNames: string[]
  ): Promise<WhatsAppMessageResponse> {
    const toysText = toyNames.length > 0 ? toyNames.join(', ') : 'your selected toys';
    const cycleMessage = `Hi ${customerName}! 🚚\n\nGreat news! ${toysText} will be shipped to you soon as part of your current ToyFlix cycle.\n\nExpected delivery: 2-3 business days. Get ready for some fun! 🎈`;

    return await this.sendPromotionalMessage({
      phoneNumber,
      customerName,
      message: cycleMessage
    });
  }

  /**
   * Send custom promotional campaign message
   */
  static async sendCampaignMessage(
    phoneNumber: string,
    customerName: string,
    campaignMessage: string,
    imageUrl?: string
  ): Promise<WhatsAppMessageResponse> {
    return await this.sendPromotionalMessage({
      phoneNumber,
      customerName,
      message: campaignMessage,
      imageUrl
    });
  }

  /**
   * Get message delivery status
   */
  static async getMessageStatus(messageId: string): Promise<any> {
    try {
      console.log('📊 Checking WhatsApp message status:', messageId);

      const url = `${this.baseUrl}/${messageId}`;
      const response = await this.makeRequest(url);

      if (!response.ok) {
        console.error('❌ Failed to get message status:', response.status);
        return null;
      }

      const status = await response.json();
      console.log('✅ Message status retrieved:', status);
      return status;
    } catch (error: any) {
      console.error('❌ Error getting message status:', error.message);
      return null;
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): { isValid: boolean; formatted: string; error?: string } {
    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      
      // Check if it's a valid Indian number (91 + 10 digits)
      if (formatted.length === 12 && formatted.startsWith('91')) {
        return { isValid: true, formatted };
      }
      
      return {
        isValid: false,
        formatted,
        error: 'Invalid phone number format. Expected Indian mobile number (10 digits).'
      };
    } catch (error: any) {
      return {
        isValid: false,
        formatted: phoneNumber,
        error: error.message
      };
    }
  }

  /**
   * Bulk send messages (with rate limiting)
   */
  static async sendBulkMessages(
    messages: WhatsAppPromoMessage[],
    delayBetweenMessages: number = 1000 // 1 second delay between messages
  ): Promise<WhatsAppMessageResponse[]> {
    console.log(`📱 Sending ${messages.length} bulk WhatsApp messages`);
    
    const results: WhatsAppMessageResponse[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        const result = await this.sendPromotionalMessage(message);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Message ${i + 1}/${messages.length} sent successfully`);
        } else {
          console.error(`❌ Message ${i + 1}/${messages.length} failed:`, result.error);
        }
        
        // Add delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));
        }
      } catch (error: any) {
        console.error(`❌ Error sending message ${i + 1}:`, error.message);
        results.push({
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Bulk message summary: ${successCount}/${messages.length} sent successfully`);
    
    return results;
  }
} 