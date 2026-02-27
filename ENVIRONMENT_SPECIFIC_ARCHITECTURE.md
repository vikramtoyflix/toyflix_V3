# Environment-Specific WooCommerce Architecture

## Overview

I've created a **production-ready, environment-specific architecture** that automatically selects the appropriate WooCommerce service based on your deployment environment:

- **🖥️ Localhost**: Uses `LocalhostWooCommerceService` → Direct VM API
- **☁️ Production**: Uses `ProductionWooCommerceService` → Azure Function

## File Structure

```
src/
├── services/
│   ├── localhostWooCommerceService.ts    # Direct VM API service
│   ├── productionWooCommerceService.ts   # Azure Function service
│   └── azureWooCommerceService.ts        # Legacy (still available)
├── config/
│   └── environmentWooCommerceConfig.ts   # Environment detection & service factory
└── hooks/
    └── useEnvironmentWooCommerceData.ts  # Environment-aware hooks
```

## Key Features

### 🔄 **Automatic Environment Detection**
```typescript
// Detects environment based on hostname and NODE_ENV
const environment = getEnvironment(); // 'localhost' | 'production'
const service = getWooCommerceService(); // Returns appropriate service
```

### 📱 **Localhost Development** 
- **Service**: `LocalhostWooCommerceService`
- **Endpoint**: `http://4.213.183.90:3001` (Direct VM API)
- **Features**: Verbose logging, detailed errors, 10s timeout
- **Benefits**: Fast response times, detailed debugging

### ☁️ **Production Deployment**
- **Service**: `ProductionWooCommerceService` 
- **Endpoint**: `https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net`
- **Features**: Silent errors, production logging, 15s timeout
- **Benefits**: Scalable, managed service, cloud reliability

## Usage

### 🎯 **Main Hook (Recommended)**
```typescript
import { useEnvironmentWooCommerceIntegration } from '@/hooks/useEnvironmentWooCommerceData';

function Dashboard() {
  const {
    // Data
    user,                    // WooCommerce user profile
    subscriptions,           // User's subscription history
    currentToys,            // Currently active toys
    
    // Status
    isLoading,
    isError,
    hasWooCommerceData,
    
    // Environment info
    environment,            // 'Localhost Development' | 'Production'
    service,               // 'Direct VM API' | 'Azure Function'
    endpoint,              // Current API endpoint
    isLocalhost,           // boolean
    isProduction           // boolean
  } = useEnvironmentWooCommerceIntegration();

  return (
    <div>
      <p>Environment: {environment}</p>
      <p>Service: {service}</p>
      <p>User: {user?.first_name} {user?.last_name}</p>
      <p>Current Toys: {currentToys.length}</p>
    </div>
  );
}
```

### 🔍 **Data Availability Check**
```typescript
import { useHasEnvironmentWooCommerceData } from '@/hooks/useEnvironmentWooCommerceData';

function WooCommerceGate() {
  const { hasData, reason, environment } = useHasEnvironmentWooCommerceData();
  
  if (!hasData) {
    return <div>No WooCommerce data: {reason}</div>;
  }
  
  return <Dashboard />;
}
```

### ⚙️ **Individual Data Hooks**
```typescript
// Get user orders
const { orders, environment } = useEnvironmentUserOrders(userId);

// Get user subscriptions  
const { subscriptions, environment } = useEnvironmentUserSubscriptions(userId);
```

## Environment Configuration

### 🖥️ **Localhost Config**
```typescript
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
}
```

### ☁️ **Production Config**
```typescript
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
```

## Environment Detection Logic

The system automatically detects environment using:

### Browser Detection
```typescript
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || 
                   hostname === '127.0.0.1' || 
                   hostname.startsWith('192.168.');
```

### Node.js Detection
```typescript
const nodeEnv = process.env.NODE_ENV;
const isLocalhost = nodeEnv === 'development';
```

## Data Structure Consistency

Both services return **identical data structures**:

```typescript
// Both services return this format
{
  success: true,
  user: { ID: 1681, first_name: "Lavanya", ... },
  subscriptions: [...],
  currentToys: [...],
  environment: "localhost" | "production",
  proxy: "direct-vm-api" | "azure-function-fixed"
}
```

## Testing & Debugging

### 🧪 **Test All Services**
```typescript
import { testAllServices } from '@/config/environmentWooCommerceConfig';

// Test both localhost and production services
await testAllServices();
```

### 🔧 **Force Environment** (For Testing)
```typescript
import { forceEnvironment } from '@/config/environmentWooCommerceConfig';

// Force production environment on localhost
const restore = forceEnvironment('production');
// ... test production service ...
restore(); // Restore original detection
```

### 📊 **Environment Info**
```typescript
// Get current environment details
const envConfig = getCurrentEnvironmentConfig();
console.log('Current:', envConfig);

// Get service-specific info
const service = getWooCommerceService();
console.log('Service:', service.getEnvironmentInfo());
```

## Migration Path

### From Existing Code
1. **Keep existing imports working** - old hooks still function
2. **Gradual migration** - replace hooks one component at a time
3. **Zero breaking changes** - existing functionality preserved

### Replace This:
```typescript
// Old approach
import { AzureWooCommerceService } from '@/services/azureWooCommerceService';
const profile = await AzureWooCommerceService.getCompleteUserProfile(phone);
```

### With This:
```typescript
// New approach
import { useEnvironmentWooCommerceIntegration } from '@/hooks/useEnvironmentWooCommerceData';
const { user, subscriptions, currentToys } = useEnvironmentWooCommerceIntegration();
```

## Benefits

### 🚀 **Development Benefits**
- **Fast local development** with Direct VM API
- **Detailed debugging** information in localhost
- **Automatic service selection** - no manual configuration
- **Consistent data structures** across environments

### ☁️ **Production Benefits**
- **Scalable Azure Function** for production loads
- **Fixed data structure issues** from original Azure function
- **Production-optimized** logging and error handling
- **Cloud reliability** and managed infrastructure

### 🔧 **Developer Experience**
- **Single import** - no need to choose service manually
- **Environment indicators** in all responses
- **TypeScript support** with proper typing
- **Easy testing** of both environments

## Summary

This architecture provides:

✅ **Automatic environment detection**  
✅ **Localhost uses Direct VM API**  
✅ **Production uses Azure Function**  
✅ **Identical data structures**  
✅ **Zero breaking changes**  
✅ **Production-ready**  
✅ **Easy testing & debugging**  

Your application will automatically use the right service based on where it's running, with no manual configuration required! 