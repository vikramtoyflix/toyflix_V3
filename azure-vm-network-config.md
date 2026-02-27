# Azure VM Network Configuration for Static Web App Access

## Problem
Azure Static Web Apps cannot access Azure VM WooCommerce API (http://4.213.183.90:3001) due to networking restrictions.

## Solution 1: Configure Network Security Group (NSG)

### Step 1: Add Azure Static Web App IP Ranges to NSG
```bash
# Get Azure Static Web App outbound IP ranges
# These are the IP ranges that Azure Static Web Apps use for outbound connections

# Azure Static Web App outbound IP ranges (varies by region):
# West Europe: 20.50.2.0/23, 20.50.4.0/22, 20.50.8.0/21
# East US: 20.42.2.0/23, 20.42.4.0/22, 20.42.8.0/21
# Central US: 20.44.2.0/23, 20.44.4.0/22, 20.44.8.0/21

# Add inbound rule to NSG:
az network nsg rule create \
  --resource-group toyflix-rg \
  --nsg-name toyflix-vm-nsg \
  --name AllowStaticWebAppInbound \
  --protocol Tcp \
  --direction Inbound \
  --priority 1100 \
  --source-address-prefixes 20.50.2.0/23 20.50.4.0/22 20.50.8.0/21 \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 3001 \
  --access Allow
```

### Step 2: Allow Azure Service Traffic
```bash
# Allow all Azure services (simpler but less secure)
az network nsg rule create \
  --resource-group toyflix-rg \
  --nsg-name toyflix-vm-nsg \
  --name AllowAzureServices \
  --protocol Tcp \
  --direction Inbound \
  --priority 1200 \
  --source-address-prefixes AzureCloud \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 3001 \
  --access Allow
```

## Solution 2: Enable HTTPS on VM Server

### Current Issue: HTTP vs HTTPS
Azure Static Web Apps prefer HTTPS connections for security.

### Enable HTTPS on Express Server
```javascript
// Update azure-vm-server/woocommerce-server.js
const https = require('https');
const fs = require('fs');

// Add SSL certificate (use Let's Encrypt or Azure-managed certificate)
const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem')
};

https.createServer(options, app).listen(3001, () => {
  console.log('🚀 HTTPS WooCommerce API server running on port 3001');
});
```

## Solution 3: Use Azure API Management (Recommended)

### Create API Management Service
```bash
# Create API Management instance
az apim create \
  --resource-group toyflix-rg \
  --name toyflix-api-management \
  --location "East US" \
  --publisher-name "Toyflix" \
  --publisher-email "admin@toyflix.com" \
  --sku-name Consumption
```

### Configure API Management as Proxy
- Backend: http://4.213.183.90:3001
- Frontend: https://toyflix-api-management.azure-api.net
- This provides HTTPS endpoint and better security

## Solution 4: VM Firewall Configuration

### Ubuntu/Linux VM Firewall
```bash
# SSH into the VM and configure firewall
sudo ufw allow from 20.50.0.0/16 to any port 3001
sudo ufw allow from 20.42.0.0/16 to any port 3001
sudo ufw allow from 20.44.0.0/16 to any port 3001

# Or allow all Azure IP ranges
sudo ufw allow from 20.0.0.0/8 to any port 3001
sudo ufw reload
```

### Windows VM Firewall
```powershell
# Add inbound rule for Azure Static Web App IPs
New-NetFirewallRule -DisplayName "Allow Azure Static Web Apps" -Direction Inbound -Protocol TCP -LocalPort 3001 -RemoteAddress 20.50.0.0/16,20.42.0.0/16,20.44.0.0/16 -Action Allow
```

## Solution 5: Environment-Specific Configuration

### Update Service Configuration
```typescript
// Different endpoints for local vs production
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use HTTPS endpoint or API Management
    return 'https://toyflix-api-management.azure-api.net';
  }
  // Local development
  return 'http://4.213.183.90:3001';
};
```

## Quick Fix: Test with Azure Service Tag

### Allow Azure Cloud Service Tag
```bash
# This allows all Azure services - use for quick testing
az network nsg rule create \
  --resource-group toyflix-rg \
  --nsg-name toyflix-vm-nsg \
  --name AllowAzureCloudQuickFix \
  --protocol Tcp \
  --direction Inbound \
  --priority 1000 \
  --source-address-prefixes AzureCloud \
  --destination-port-ranges 3001 \
  --access Allow
```

## Verification Steps

1. **Check NSG Rules**: Ensure inbound rules allow Azure Static Web App IPs
2. **Test VM Connectivity**: Use Azure Cloud Shell to test connection
3. **Monitor Logs**: Check VM logs for connection attempts
4. **Use HTTPS**: Prefer HTTPS endpoints for production

## Recommended Approach

1. **Immediate**: Add Azure Cloud service tag to NSG
2. **Short-term**: Configure HTTPS on VM server
3. **Long-term**: Implement Azure API Management for better security and management 