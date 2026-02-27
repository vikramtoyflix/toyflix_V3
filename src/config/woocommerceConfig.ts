/**
 * WooCommerce Service Configuration
 * Allows switching between direct VM connection and Azure Function proxy
 */

export interface WooCommerceConfig {
  useAzureFunction: boolean;
  azureFunctionUrl?: string;
  vmApiUrl: string;
  timeout: number;
}

// Environment-based configuration
export const getWooCommerceConfig = (): WooCommerceConfig => {
  // Use Azure Function by default in production, can be overridden by env var
  const useAzureFunction = process.env.VITE_USE_AZURE_FUNCTION !== 'false';
  
  // Use the deployed Azure Function URL
  const azureFunctionAppName = process.env.VITE_AZURE_FUNCTION_APP_NAME || 'toyflix-woocommerce-proxy-bjh8hchjagdtgnhp';
  const azureFunctionUrl = `https://${azureFunctionAppName}.centralindia-01.azurewebsites.net/api`;
  
  // Debug logging - always show in both dev and production for debugging
  console.log('🔧 WooCommerce Config Debug:', {
    useAzureFunction,
    azureFunctionAppName,
    azureFunctionUrl,
    vmApiUrl: 'http://4.213.183.90:3001',
    env_VITE_USE_AZURE_FUNCTION: process.env.VITE_USE_AZURE_FUNCTION,
    env_VITE_AZURE_FUNCTION_APP_NAME: process.env.VITE_AZURE_FUNCTION_APP_NAME
  });
  
  return {
    useAzureFunction,
    azureFunctionUrl: useAzureFunction ? azureFunctionUrl : undefined,
    vmApiUrl: 'http://4.213.183.90:3001',
    timeout: useAzureFunction ? 30000 : 15000 // Azure Functions need more time
  };
};

// Service factory to get the appropriate service based on configuration
export const getWooCommerceService = async () => {
  const config = getWooCommerceConfig();
  
  // Always log for debugging the current issue
  console.log(`🔧 WooCommerce Config: Using ${config.useAzureFunction ? 'Azure Function' : 'Direct VM'}`);
  console.log(`🌐 Endpoint: ${config.useAzureFunction ? config.azureFunctionUrl : config.vmApiUrl}`);
  
  if (config.useAzureFunction) {
    const { AzureFunctionWooCommerceService } = await import('@/services/azureFunctionWooCommerceService');
    return AzureFunctionWooCommerceService;
  } else {
    const { AzureWooCommerceService } = await import('@/services/azureWooCommerceService');
    return AzureWooCommerceService;
  }
};

// Default export for immediate use
export const WooCommerceConfig = getWooCommerceConfig(); 