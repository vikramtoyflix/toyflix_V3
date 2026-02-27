/**
 * WhatsApp Configuration
 * Update the phone number here to change the support WhatsApp number
 */

export const WHATSAPP_CONFIG = {
  // Your business WhatsApp number (include country code without + sign)
  // Example: For +91 9876543210, use '919876543210'
  SUPPORT_PHONE_NUMBER: '919108928610', // 🔧 ToyJoyBox Support WhatsApp Number
  
  // Default messages
  DEFAULT_MESSAGES: {
    SELECTION_WINDOW_SUPPORT: (userName?: string, userPhone?: string, status?: string) => 
      `Hi ToyJoyBox Support Team! 👋\n\n` +
      `${userName ? `My name is ${userName}.\n` : ''}` +
      `${userPhone ? `My registered phone number is ${userPhone}.\n` : ''}` +
      `\nI need help with my toy selection window.\n` +
      `${status ? `Current status: ${status}\n` : ''}` +
      `\nCould you please help me select toys for my next delivery?\n\n` +
      `Thank you! 🙏`,
    
    GENERAL_SUPPORT: (userName?: string, userPhone?: string, inquiry?: string) =>
      `Hi ToyJoyBox Support Team! 👋\n\n` +
      `${userName ? `My name is ${userName}.\n` : ''}` +
      `${userPhone ? `My registered phone number is ${userPhone}.\n` : ''}` +
      `\nI have a question about ToyJoyBox services.\n` +
      `${inquiry ? `Question: ${inquiry}\n` : ''}` +
      `\nCould you please help me?\n\n` +
      `Thank you! 🙏`,
    
    ORDER_SUPPORT: (userName?: string, userPhone?: string, orderId?: string, issue?: string) =>
      `Hi ToyJoyBox Support Team! 👋\n\n` +
      `${userName ? `My name is ${userName}.\n` : ''}` +
      `${userPhone ? `My registered phone number is ${userPhone}.\n` : ''}` +
      `${orderId ? `Order ID: ${orderId}\n` : ''}` +
      `\nI need help with my order.\n` +
      `${issue ? `Issue: ${issue}\n` : ''}` +
      `\nCould you please assist me?\n\n` +
      `Thank you! 🙏`
  }
};

// Instructions for updating the WhatsApp number:
// 1. Replace '919876543210' above with your actual WhatsApp business number
// 2. Include the country code (e.g., 91 for India, 1 for USA)
// 3. Do not include the + sign or any spaces/dashes
// 4. Example formats:
//    - India: '919876543210' (for +91 98765 43210)
//    - USA: '15551234567' (for +1 555 123 4567)
//    - UK: '447700900123' (for +44 7700 900123)
