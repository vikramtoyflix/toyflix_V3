import { LocalhostWooCommerceService } from '@/services/localhostWooCommerceService';
import { ProductionWooCommerceService } from '@/services/productionWooCommerceService';

// Environment detection
export const getEnvironment = (): 'localhost' | 'production' => {
  // Check if running on localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    
    console.log(`🌍 Environment detected: ${isLocalhost ? 'LOCALHOST' : 'PRODUCTION'} (hostname: ${hostname})`);
    return isLocalhost ? 'localhost' : 'production';
  }
  
  // Server-side or build-time
  const nodeEnv = process.env.NODE_ENV;
  console.log(`🌍 Environment detected: ${nodeEnv === 'development' ? 'LOCALHOST' : 'PRODUCTION'} (NODE_ENV: ${nodeEnv})`);
  return nodeEnv === 'development' ? 'localhost' : 'production';
};

// Service factory - returns appropriate service based on environment
export const getWooCommerceService = () => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'localhost':
      console.log('🔧 Using LocalhostWooCommerceService (Direct VM API)');
      return LocalhostWooCommerceService;
    
    case 'production':
      console.log('🔧 Using ProductionWooCommerceService (Azure Function)');
      return ProductionWooCommerceService;
    
    default:
      console.warn('⚠️ Unknown environment, defaulting to localhost service');
      return LocalhostWooCommerceService;
  }
};

// Environment configuration
export const environmentConfig = {
  localhost: {
    name: 'Localhost Development',
    service: 'Direct VM API',
    endpoint: 'http://4.213.183.90:3001',
    timeout: 10000,
    features: {
      debugging: true,
      verboseLogging: true,
      errorDetails: true
    }
  },
  production: {
    name: 'Production',
    service: 'Azure Function',
    endpoint: 'https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net',
    timeout: 15000,
    features: {
      debugging: false,
      verboseLogging: false,
      errorDetails: false
    }
  }
};

// Get current environment configuration
export const getCurrentEnvironmentConfig = () => {
  const environment = getEnvironment();
  return environmentConfig[environment];
};

// Test both services (useful for debugging)
export const testAllServices = async () => {
  console.log('🧪 Testing all WooCommerce services...\n');
  
  // Test localhost service
  console.log('1️⃣ Testing LocalhostWooCommerceService...');
  try {
    const localhostHealth = await LocalhostWooCommerceService.testConnection();
    console.log(`   Result: ${localhostHealth ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error: any) {
    console.log(`   Result: ❌ FAIL - ${error.message}`);
  }
  
  // Test production service
  console.log('\n2️⃣ Testing ProductionWooCommerceService...');
  try {
    const productionHealth = await ProductionWooCommerceService.testConnection();
    console.log(`   Result: ${productionHealth ? '✅ PASS' : '❌ FAIL'}`);
  } catch (error: any) {
    console.log(`   Result: ❌ FAIL - ${error.message}`);
  }
  
  console.log('\n📊 Service Information:');
  console.log('   Localhost:', LocalhostWooCommerceService.getEnvironmentInfo());
  console.log('   Production:', ProductionWooCommerceService.getEnvironmentInfo());
  
  console.log('\n🔄 Current Service Selection:');
  const currentService = getWooCommerceService();
  console.log('   Selected:', currentService.getEnvironmentInfo());
};

// Force environment (useful for testing)
export const forceEnvironment = (env: 'localhost' | 'production') => {
  console.log(`🔧 Force switching to ${env} environment`);
  
  // Override the getEnvironment function temporarily
  const originalGetEnvironment = getEnvironment;
  (globalThis as any).__toyflix_forced_environment = env;
  
  return () => {
    console.log('🔧 Restoring original environment detection');
    delete (globalThis as any).__toyflix_forced_environment;
  };
};

// Enhanced environment detection with force override
export const getEnvironmentWithOverride = (): 'localhost' | 'production' => {
  // Check for forced environment first
  if ((globalThis as any).__toyflix_forced_environment) {
    const forced = (globalThis as any).__toyflix_forced_environment;
    console.log(`🔧 Using forced environment: ${forced}`);
    return forced;
  }
  
  return getEnvironment();
}; 