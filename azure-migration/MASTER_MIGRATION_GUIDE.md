# 🚀 **ToyFlix: Complete Supabase to Azure Migration Guide**

This guide provides automated scripts to migrate your entire ToyFlix application from Supabase to Azure.

## 📋 **Migration Overview**

### **What Will Be Migrated:**
- ✅ **Database**: PostgreSQL → Azure Database for PostgreSQL
- ✅ **Authentication**: Supabase Auth → Custom JWT + Azure Functions
- ✅ **Serverless Functions**: Supabase Edge Functions → Azure Functions
- ✅ **File Storage**: Supabase Storage → Azure Blob Storage
- ✅ **All Data**: Users, toys, orders, subscriptions, etc.

### **Migration Architecture:**
```
BEFORE (Supabase)                    AFTER (Azure)
┌─────────────────────┐            ┌─────────────────────┐
│ Supabase PostgreSQL │  ────────→ │ Azure PostgreSQL    │
│ Supabase Auth       │  ────────→ │ Custom JWT Auth     │
│ Supabase Functions  │  ────────→ │ Azure Functions     │
│ Supabase Storage    │  ────────→ │ Azure Blob Storage  │
└─────────────────────┘            └─────────────────────┘
```

## 🛠️ **Prerequisites**

### **1. Install Required Tools**
```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# PostgreSQL client (for data migration)
# macOS:
brew install postgresql

# Ubuntu:
sudo apt-get install postgresql-client

# Verify installations
az --version
func --version
psql --version
jq --version
```

### **2. Login to Azure**
```bash
az login
az account show  # Verify correct subscription
```

### **3. Set Environment Variables**
Create/update your `.env` file:
```bash
# Add these to your .env file
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
VITE_SUPABASE_URL=https://wucwpyitzqjukcphczhr.supabase.co
```

## 🚀 **Step-by-Step Migration**

### **Step 1: Setup Azure Infrastructure (15-20 minutes)**
```bash
# Make scripts executable
chmod +x azure-migration/*.sh

# Run the infrastructure setup
bash azure-migration/01-setup-azure-infrastructure.sh
```

**What this does:**
- Creates Azure Resource Group
- Sets up Azure PostgreSQL Database
- Creates Azure Storage Account
- Sets up Azure Functions
- Configures Application Insights
- Sets up firewall rules and permissions

**Expected Output:**
```
✅ Azure Infrastructure Setup Complete!
📋 Summary:
  ✅ Resource Group: toyflix-rg
  ✅ PostgreSQL Server: toyflix-db-server.postgres.database.azure.com
  ✅ Database: toyflix_production
  ✅ Storage Account: toyflixstorage1234567890
  ✅ Function App: toyflix-functions-1234567890
```

### **Step 2: Export Supabase Data (5-10 minutes)**
```bash
bash azure-migration/02-export-supabase-data.sh
```

**What this does:**
- Exports all table data from Supabase
- Downloads database schema
- Creates backup files for rollback
- Verifies data integrity

**Expected Output:**
```
✅ Supabase Data Export Complete!
📋 Export Summary:
  📁 Directory: azure-migration/exports/20240115_143022
  📊 Summary: export_summary.json
  🔍 Verification: verify_export.sh
```

### **Step 3: Migrate Database (10-15 minutes)**
```bash
bash azure-migration/03-migrate-database.sh
```

**What this does:**
- Creates complete database schema in Azure PostgreSQL
- Imports all data from Supabase export
- Sets up indexes and constraints
- Verifies data migration

**Expected Output:**
```
✅ Database Migration Complete!
📋 Migration Summary:
  ✅ Schema migrated to Azure PostgreSQL
  ✅ Data imported from Supabase export
  ✅ Indexes and constraints created
  ✅ Default data populated
```

### **Step 4: Deploy Azure Functions (10-15 minutes)**
```bash
bash azure-migration/04-deploy-functions.sh
```

**What this does:**
- Converts Supabase Edge Functions to Azure Functions
- Deploys authentication, payment, and OTP functions
- Configures environment variables
- Tests deployed functions

**Expected Output:**
```
✅ Azure Functions Deployment Complete!
🔗 Function Endpoints:
  📱 Send OTP: https://toyflix-functions-xxx.azurewebsites.net/api/send-otp
  🔐 Auth Signin: https://toyflix-functions-xxx.azurewebsites.net/api/auth-signin
  💳 Razorpay Order: https://toyflix-functions-xxx.azurewebsites.net/api/razorpay-order
```

## ⚙️ **Step 5: Update Frontend Configuration**

### **5.1 Update Azure Static Web Apps Configuration**

Create `azure-frontend-config.ts`:
```typescript
// Azure configuration for ToyFlix
export const azureConfig = {
  // Database connection (for admin functions)
  database: {
    host: 'toyflix-db-server.postgres.database.azure.com',
    database: 'toyflix_production',
    ssl: true
  },
  
  // Azure Functions endpoints
  functions: {
    baseUrl: 'https://toyflix-functions-xxx.azurewebsites.net',
    endpoints: {
      sendOtp: '/api/send-otp',
      authSignin: '/api/auth-signin',
      razorpayOrder: '/api/razorpay-order',
      razorpayVerify: '/api/razorpay-verify'
    }
  },
  
  // Azure Blob Storage
  storage: {
    accountName: 'toyflixstorage123',
    containerName: 'toy-images',
    baseUrl: 'https://toyflixstorage123.blob.core.windows.net'
  }
};
```

### **5.2 Update Azure Static Web Apps Environment Variables**

In Azure Portal → Static Web Apps → Configuration:
```
VITE_AZURE_FUNCTIONS_URL=https://toyflix-functions-xxx.azurewebsites.net
VITE_AZURE_STORAGE_URL=https://toyflixstorage123.blob.core.windows.net
VITE_DATABASE_TYPE=azure
```

### **5.3 Update Frontend Services**

Replace Supabase client calls with Azure Function calls:

**Before (Supabase):**
```typescript
// Old Supabase calls
await supabase.functions.invoke('send-otp', { body: { phone } })
await supabase.functions.invoke('razorpay-order', { body: orderData })
```

**After (Azure):**
```typescript
// New Azure Function calls
await fetch(`${azureConfig.functions.baseUrl}/api/send-otp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone })
})

await fetch(`${azureConfig.functions.baseUrl}/api/razorpay-order`, {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
})
```

## 🧪 **Step 6: Testing and Verification**

### **6.1 Test Database Connection**
```bash
# Load configuration
source azure-migration/config/azure-config.env

# Test database connection
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_ENDPOINT" \
  -U "$DB_ADMIN_USER@$DB_SERVER_NAME" \
  -d "$DB_NAME" \
  -c "SELECT COUNT(*) FROM custom_users;"
```

### **6.2 Test Azure Functions**
```bash
# Test OTP function
curl -X POST https://toyflix-functions-xxx.azurewebsites.net/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Test authentication
curl -X POST https://toyflix-functions-xxx.azurewebsites.net/api/auth-signin \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'
```

### **6.3 Test Frontend Integration**
1. **Authentication Flow**: Sign up/sign in with phone number
2. **Payment Flow**: Create test subscription order
3. **Admin Functions**: Access admin panel
4. **Toy Management**: Add/edit toys
5. **Order Processing**: Create and track orders

## 📊 **Monitoring and Maintenance**

### **Azure Portal Monitoring**
- **Database**: Monitor CPU, memory, connections
- **Functions**: Monitor execution count, duration, errors  
- **Storage**: Monitor bandwidth and requests
- **Application Insights**: Track performance and errors

### **Key Metrics to Watch**
```bash
# Database performance
az monitor metrics list \
  --resource toyflix-db-server \
  --resource-group toyflix-rg \
  --metric-names cpu_percent,memory_percent

# Function performance  
az monitor app-insights metrics show \
  --app toyflix-insights \
  --resource-group toyflix-rg \
  --metrics requests/count,requests/duration
```

## 🔄 **Rollback Plan (If Needed)**

### **Quick Rollback to Supabase**
```bash
# 1. Revert frontend environment variables
# 2. Switch back to Supabase endpoints
# 3. Supabase data is preserved (not deleted during migration)

# Emergency rollback script
bash azure-migration/rollback-to-supabase.sh
```

### **Data Recovery**
All Supabase data exports are preserved in `azure-migration/exports/` directory for recovery.

## 💰 **Cost Estimation**

### **Monthly Azure Costs (Estimated)**
- **Azure Database for PostgreSQL**: $50-150/month
- **Azure Functions**: $5-20/month  
- **Azure Blob Storage**: $10-30/month
- **Application Insights**: $5-15/month
- **Total**: ~$70-215/month

### **Cost Optimization Tips**
- Use Azure Reserved Instances for 30-50% savings
- Set up auto-scaling to reduce idle costs
- Monitor unused resources and clean up regularly
- Use Azure Cost Management alerts

## 🆘 **Troubleshooting**

### **Common Issues**

**1. Database Connection Failed**
```bash
# Check firewall rules
az postgres server firewall-rule list \
  --resource-group toyflix-rg \
  --server-name toyflix-db-server

# Add your IP if needed
az postgres server firewall-rule create \
  --resource-group toyflix-rg \
  --server toyflix-db-server \
  --name "AllowMyNewIP" \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

**2. Azure Functions Not Responding**
```bash
# Check function app logs
az functionapp log tail \
  --name toyflix-functions-xxx \
  --resource-group toyflix-rg

# Restart function app
az functionapp restart \
  --name toyflix-functions-xxx \
  --resource-group toyflix-rg
```

**3. Authentication Issues**
- Verify JWT_SECRET is set in Azure Functions
- Check database user sessions table
- Ensure CORS headers are properly configured

### **Support Resources**
- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Azure Support**: Create support ticket in Azure Portal
- **Community**: Stack Overflow with `azure` tags

## ✅ **Migration Success Checklist**

- [ ] ✅ Azure infrastructure created successfully
- [ ] ✅ Supabase data exported and verified
- [ ] ✅ Database schema migrated to Azure PostgreSQL
- [ ] ✅ All table data imported successfully
- [ ] ✅ Azure Functions deployed and responding
- [ ] ✅ Frontend configuration updated
- [ ] ✅ Authentication flow working
- [ ] ✅ Payment processing functional
- [ ] ✅ Admin panel accessible
- [ ] ✅ Monitoring and alerts configured
- [ ] ✅ Backup and rollback plan tested

## 🎉 **Post-Migration Benefits**

### **Performance Improvements**
- **Faster Database Queries**: Azure PostgreSQL optimizations
- **Better Caching**: Azure CDN and Redis integration
- **Improved Monitoring**: Application Insights analytics

### **Enterprise Features**
- **Advanced Security**: Azure AD integration options
- **Compliance**: SOC, ISO, HIPAA certifications
- **Disaster Recovery**: Multi-region backup options
- **Scaling**: Auto-scaling based on demand

### **Cost Benefits**
- **Predictable Pricing**: No per-request pricing surprises
- **Reserved Instances**: Long-term cost savings
- **Free Tier**: Generous free tiers for development

---

## 🚀 **Ready to Migrate?**

**Total Migration Time**: 1-2 hours (mostly automated)

**Start your migration:**
```bash
chmod +x azure-migration/*.sh
bash azure-migration/01-setup-azure-infrastructure.sh
```

**Need Help?** 
- Each script includes detailed logging and error handling
- Configuration files are saved for rollback purposes  
- All data exports are preserved for safety

**Let's migrate your ToyFlix to Azure! 🎯** 