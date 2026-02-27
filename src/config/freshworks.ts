/**
 * Freshworks CRM & WhatsApp Business API Configuration
 * Environment-based configuration for ToyFlix integrations
 */

export interface FreshworksConfig {
  crm: {
    domain: string;
    apiKey: string;
    apiVersion: string;
    baseUrl: string;
  };
  whatsapp: {
    phoneId: string;
    accessToken: string;
    templateName: string;
    baseUrl: string;
  };
  timeouts: {
    defaultTimeout: number;
    whatsappTimeout: number;
  };
}

export const freshworksConfig: FreshworksConfig = {
  crm: {
    domain: import.meta.env.VITE_FRESHWORKS_DOMAIN || 'https://toyflix-team.myfreshworks.com',
    apiKey: import.meta.env.VITE_FRESHWORKS_API_KEY || '',
    apiVersion: 'v3',
    baseUrl: '',
  },
  whatsapp: {
    phoneId: import.meta.env.VITE_WHATSAPP_PHONE_ID || '',
    accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
    templateName: import.meta.env.VITE_WHATSAPP_TEMPLATE_NAME || 'toyflix_promotion',
    baseUrl: 'https://graph.facebook.com/v18.0',
  },
  timeouts: {
    defaultTimeout: 10000, // 10 seconds for CRM calls
    whatsappTimeout: 15000, // 15 seconds for WhatsApp calls
  },
};

// Initialize base URLs
freshworksConfig.crm.baseUrl = `${freshworksConfig.crm.domain}/crm/sales/api`;

/**
 * Age group mapping for CRM custom fields
 */
export const ageGroupMapping: Record<string, string> = {
  '1-2': '6m-2 years',
  '2-3': '2-3 years',
  '3-4': '3-4 years',
  '4-6': '4-6 years',
  '6-8': '6-8 years',
  'all': '1-8 years',
};

/**
 * Product to tag mapping for customer segmentation
 */
export const productTagMapping: Record<string, string> = {
  'discovery-delight': 'Trail plan deal',
  'silver-pack': '6 Months plan deal',
  'gold-pack': '6 Months pro plan deal',
  'ride_on_fixed': 'Car plan deal',
  'trial': 'Trail plan deal',
};

/**
 * Environment validation
 */
export const validateFreshworksConfig = (): { isValid: boolean; missingKeys: string[] } => {
  const requiredKeys = [
    'VITE_FRESHWORKS_DOMAIN',
    'VITE_FRESHWORKS_API_KEY',
    'VITE_WHATSAPP_PHONE_ID',
    'VITE_WHATSAPP_ACCESS_TOKEN',
  ];

  const missingKeys = requiredKeys.filter(key => !import.meta.env[key]);

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
};

/**
 * Development mode check
 */
export const isDevelopmentMode = (): boolean => {
  return import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
}; 