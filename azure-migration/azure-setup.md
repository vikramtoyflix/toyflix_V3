# Azure Infrastructure Setup Guide

## 🚀 Required Azure Services

### 1. **Azure Database for PostgreSQL**
```bash
# Create resource group
az group create --name toyflix-rg --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group toyflix-rg \
  --name toyflix-db-server \
  --location eastus \
  --admin-user toyflic_admin \
  --admin-password "YourSecurePassword123!" \
  --sku-name GP_Gen5_2 \
  --version 13

# Create database
az postgres db create \
  --resource-group toyflix-rg \
  --server-name toyflix-db-server \
  --name toyflix_production
```

### 2. **Azure AD B2C for Authentication**
```bash
# Create B2C tenant (via Azure Portal)
# 1. Go to Azure Portal > Create Resource > Azure AD B2C
# 2. Create new tenant: toyflix-b2c
# 3. Configure user flows for sign-up/sign-in
```

### 3. **Azure Functions**
```bash
# Create Function App
az functionapp create \
  --resource-group toyflix-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name toyflix-functions \
  --storage-account toyfixstorage
```

### 4. **Azure Blob Storage**
```bash
# Create storage account
az storage account create \
  --name toyflixstorage \
  --resource-group toyflix-rg \
  --location eastus \
  --sku Standard_LRS

# Create containers
az storage container create \
  --name toy-images \
  --account-name toyflixstorage \
  --public-access blob
```

### 5. **Azure Application Insights**
```bash
# Create Application Insights
az monitor app-insights component create \
  --app toyflix-insights \
  --location eastus \
  --resource-group toyflix-rg \
  --application-type web
```

## 🔧 Configuration

### Database Connection String
```
Server=toyflix-db-server.postgres.database.azure.com;Database=toyflix_production;Port=5432;User Id=toyflic_admin@toyflix-db-server;Password=YourSecurePassword123!;Ssl Mode=Require;
```

### Environment Variables for Azure Functions
```
DATABASE_URL=postgresql://toyflix_admin:password@toyflix-db-server.postgres.database.azure.com:5432/toyflix_production
AZURE_STORAGE_CONNECTION_STRING=<storage-connection-string>
JWT_SECRET=<your-jwt-secret>
RAZORPAY_KEY_ID=<your-razorpay-key>
RAZORPAY_KEY_SECRET=<your-razorpay-secret>
``` 