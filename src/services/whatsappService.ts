import { WHATSAPP_CONFIG } from '@/config/whatsapp';

/**
 * WhatsApp Contact Service
 * Handles opening WhatsApp with pre-filled messages for customer support
 */

export class WhatsAppService {
  // Get phone number from configuration
  private static get SUPPORT_PHONE_NUMBER() {
    return WHATSAPP_CONFIG.SUPPORT_PHONE_NUMBER;
  }
  
  /**
   * Open WhatsApp with a pre-filled support message
   */
  static openSupport(options: {
    userPhone?: string;
    userName?: string;
    issue?: string;
    orderId?: string;
    customMessage?: string;
  } = {}) {
    const { userPhone, userName, issue, orderId, customMessage } = options;
    
    let message = customMessage || this.generateSupportMessage({
      userPhone,
      userName,
      issue,
      orderId
    });
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${this.SUPPORT_PHONE_NUMBER}?text=${encodedMessage}`;
    
    // Open WhatsApp in new tab/window
    window.open(whatsappUrl, '_blank');
    
    console.log('📱 Opening WhatsApp support with message:', message);
  }
  
  /**
   * Generate a default support message
   */
  private static generateSupportMessage(options: {
    userPhone?: string;
    userName?: string;
    issue?: string;
    orderId?: string;
  }) {
    const { userPhone, userName, issue, orderId } = options;
    
    let message = `Hi ToyJoyBox Support Team! 👋\n\n`;
    
    if (userName) {
      message += `My name is ${userName}.\n`;
    }
    
    if (userPhone) {
      message += `My registered phone number is ${userPhone}.\n`;
    }
    
    if (orderId) {
      message += `Order ID: ${orderId}\n`;
    }
    
    if (issue) {
      message += `\nIssue: ${issue}\n`;
    } else {
      message += `\nI need help with my toy subscription. Could you please assist me?\n`;
    }
    
    message += `\nThank you! 🙏`;
    
    return message;
  }
  
  /**
   * Open WhatsApp for selection window support
   */
  static openSelectionWindowSupport(options: {
    userPhone?: string;
    userName?: string;
    selectionStatus?: string;
  } = {}) {
    const { userPhone, userName, selectionStatus } = options;
    
    const message = WHATSAPP_CONFIG.DEFAULT_MESSAGES.SELECTION_WINDOW_SUPPORT(
      userName,
      userPhone,
      selectionStatus
    );
    
    this.openSupport({ customMessage: message });
  }
  
  /**
   * Open WhatsApp for order-related support
   */
  static openOrderSupport(options: {
    userPhone?: string;
    userName?: string;
    orderId?: string;
    orderIssue?: string;
  } = {}) {
    const { userPhone, userName, orderId, orderIssue } = options;
    
    const message = WHATSAPP_CONFIG.DEFAULT_MESSAGES.ORDER_SUPPORT(
      userName,
      userPhone,
      orderId,
      orderIssue
    );
    
    this.openSupport({ customMessage: message });
  }
  
  /**
   * Open WhatsApp for general inquiry
   */
  static openGeneralSupport(options: {
    userPhone?: string;
    userName?: string;
    inquiry?: string;
  } = {}) {
    const { userPhone, userName, inquiry } = options;
    
    const message = WHATSAPP_CONFIG.DEFAULT_MESSAGES.GENERAL_SUPPORT(
      userName,
      userPhone,
      inquiry
    );
    
    this.openSupport({ customMessage: message });
  }
}
