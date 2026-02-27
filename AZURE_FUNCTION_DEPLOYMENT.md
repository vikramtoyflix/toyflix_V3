# Azure Function Deployment Guide for WooCommerce Proxy

## Overview
This Azure Function acts as a proxy between your Static Web App and the WooCommerce VM, eliminating networking issues.

## Architecture
```
Static Web App → Azure Function (HTTPS) → VM (HTTP) → WooCommerce Database
```

## Step 1: Prerequisites

### Install Azure Functions Core Tools
```bash
# macOS (using Homebrew)
brew tap azure/functions
brew install azure-functions-core-tools@4

# Windows (using npm)
npm install -g azure-functions-core-tools@4

# Or download from: https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local
```

### Install Azure CLI
```bash
# macOS
brew install azure-cli

# Windows
# Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login
```

## Step 2: Create Azure Function App

### Option A: Azure Portal
1. **Go to Azure Portal** → **Create a resource** → **Function App**
2. **Configure:**
   - **Function App name**: `toyflix-woocommerce-proxy`
   - **Resource Group**: Use your existing resource group
   - **Runtime stack**: Node.js
   - **Version**: 18 LTS
   - **Region**: Same as your Static Web App
   - **Operating System**: Linux
   - **Plan type**: Consumption (Serverless)

### Option B: Azure CLI
```bash
# Set variables
RESOURCE_GROUP="your-resource-group-name"
FUNCTION_APP_NAME="toyflix-woocommerce-proxy"
STORAGE_ACCOUNT="toyflixtoyflixstorage$(date +%s)"
REGION="eastus"  # Change to your preferred region

# Create storage account (required for Function Apps)
az storage account create \
  --name $STORAGE_ACCOUNT \
  --location $REGION \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $REGION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT \
  --os-type Linux
```

## Step 3: Deploy the Function Code

### Navigate to Function Directory
```bash
cd azure-functions
```

### Install Dependencies
```bash
npm install
```

### Deploy to Azure
```bash
# Deploy using Azure Functions Core Tools
func azure functionapp publish toyflix-woocommerce-proxy

# Or use Azure CLI
az functionapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name toyflix-woocommerce-proxy \
  --src azure-functions.zip
```

## Step 4: Configure Environment Variables

### Option A: Azure Portal
1. **Go to Function App** → **Configuration** → **Application settings**
2. **Add these settings:**
   - `VM_API_URL`: `http://4.213.183.90:3001`
   - `FUNCTIONS_WORKER_RUNTIME`: `node`

### Option B: Azure CLI
```bash
az functionapp config appsettings set \
  --name toyflix-woocommerce-proxy \
  --resource-group $RESOURCE_GROUP \
  --settings \
    VM_API_URL="http://4.213.183.90:3001" \
    FUNCTIONS_WORKER_RUNTIME="node"
```

## Step 5: Test the Function

### Get Function URL
```bash
# Get the function app URL
az functionapp show \
  --name toyflix-woocommerce-proxy \
  --resource-group $RESOURCE_GROUP \
  --query "defaultHostName" --output tsv
```

### Test Endpoints
```bash
# Replace YOUR_FUNCTION_URL with the actual URL
FUNCTION_URL="https://toyflix-woocommerce-proxy.azurewebsites.net"

# Test health endpoint
curl "${FUNCTION_URL}/api/health"

# Test user lookup
curl "${FUNCTION_URL}/api/user-by-phone/9980111432"

# Test subscription cycle
curl "${FUNCTION_URL}/api/subscription-cycle/3438"
```

## Step 6: Update Your Static Web App

### Add Environment Variable
Add this to your Static Web App environment variables:
```
VITE_AZURE_FUNCTION_APP_NAME=toyflix-woocommerce-proxy
```

### Update Service Configuration
In your React app, create an environment variable to switch between services:

```typescript
// Create src/config/woocommerceConfig.ts
export const WooCommerceConfig = {
  useAzureFunction: process.env.VITE_USE_AZURE_FUNCTION === 'true',
  azureFunctionUrl: process.env.VITE_AZURE_FUNCTION_APP_NAME 
    ? `https://${process.env.VITE_AZURE_FUNCTION_APP_NAME}.azurewebsites.net/api`
    : undefined
};
```

## Step 7: Enable CORS (if needed)

### Option A: Azure Portal
1. **Function App** → **API** → **CORS**
2. **Add allowed origins:**
   - `https://your-static-web-app-url.azurestaticapps.net`
   - `http://localhost:3000` (for development)

### Option B: Azure CLI
```bash
az functionapp cors add \
  --name toyflix-woocommerce-proxy \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins \
    "https://your-static-web-app-url.azurestaticapps.net" \
    "http://localhost:3000"
```

## Step 8: Monitor and Debug

### View Logs
```bash
# Stream logs
func azure functionapp logstream toyflix-woocommerce-proxy

# Or in Azure Portal: Function App → Monitoring → Log stream
```

### Enable Application Insights
1. **Function App** → **Application Insights** → **Turn on**
2. **Create new Application Insights resource**
3. **Apply settings**

## Step 9: Verify Everything Works

### Test Connection Flow
```bash
# Test the complete flow
curl -X GET \
  -H "Content-Type: application/json" \
  "https://toyflix-woocommerce-proxy.azurewebsites.net/api/health"

# Should return:
# {
#   "success": true,
#   "data": { "status": "healthy", "database": "connected" },
#   "proxy": "azure-function",
#   "timestamp": "2025-06-25T..."
# }
```

### Update React App
Once the Function is working, update your service imports to use the Azure Function instead:

```typescript
// In your hooks/services, replace:
import { AzureWooCommerceService } from '@/services/azureWooCommerceService';

// With:
import { AzureFunctionWooCommerceService as AzureWooCommerceService } from '@/services/azureFunctionWooCommerceService';
```

## Troubleshooting

### Common Issues

1. **Function App not starting:**
   - Check Node.js version (should be 18)
   - Verify package.json dependencies
   - Check Application Insights logs

2. **VM connection fails:**
   - Verify VM_API_URL environment variable
   - Check VM is running and accessible
   - Test VM directly: `curl http://4.213.183.90:3001/api/health`

3. **CORS errors:**
   - Add your Static Web App URL to CORS origins
   - Include both production and preview URLs

4. **Timeout errors:**
   - Increase function timeout in host.json
   - Check VM response times
   - Consider adding retry logic

### Performance Optimization

1. **Connection pooling** (for high traffic)
2. **Caching responses** (if data doesn't change frequently)
3. **Monitoring and alerting** through Application Insights

## Cost Considerations

- **Consumption plan**: Pay per execution (very cost-effective)
- **Estimated cost**: $0.20-$2.00/month for typical usage
- **Free tier**: 1M requests/month included

## Security Best Practices

1. **Use Managed Identity** for VM access (future enhancement)
2. **Enable Authentication** on Function App if needed
3. **Use Application Insights** for monitoring
4. **Regularly update dependencies**

## Next Steps

Once this is working:
1. Consider moving VM API to HTTPS
2. Implement caching in Azure Function
3. Add authentication/authorization
4. Set up monitoring and alerts 