#!/bin/bash

# Azure Infrastructure Setup for ToyFlix Migration
# Run this script with: bash azure-migration/01-setup-azure-infrastructure.sh

set -e

echo "🚀 Starting Azure Infrastructure Setup for ToyFlix Migration..."

# Configuration
RESOURCE_GROUP="toyflix-rg"
LOCATION="eastus"
DB_SERVER_NAME="toyflix-db-server"
DB_NAME="toyflix_production"
DB_ADMIN_USER="toyflix_admin"
STORAGE_ACCOUNT="toyflixstorage$(date +%s)"  # Add timestamp to make unique
FUNCTION_APP="toyflix-functions-$(date +%s)"
APP_INSIGHTS="toyflix-insights"

# Generate secure password
DB_PASSWORD="ToyFlix$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-12)2024!"

echo "📝 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Database Server: $DB_SERVER_NAME"
echo "  Database: $DB_NAME"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  Function App: $FUNCTION_APP"

# Step 1: Create Resource Group
echo "🏗️  Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Step 2: Create PostgreSQL Server
echo "🗄️  Creating PostgreSQL Server (this may take 5-10 minutes)..."
az postgres server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password "$DB_PASSWORD" \
  --sku-name GP_Gen5_2 \
  --version 13 \
  --ssl-enforcement Enabled

# Step 3: Configure Firewall Rules
echo "🔥 Configuring Database Firewall..."
az postgres server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $DB_SERVER_NAME \
  --name "AllowAzureServices" \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your current IP
MY_IP=$(curl -s ipinfo.io/ip)
az postgres server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $DB_SERVER_NAME \
  --name "AllowMyIP" \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Step 4: Create Database
echo "📦 Creating Database..."
az postgres db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name $DB_NAME

# Step 5: Create Storage Account
echo "💾 Creating Storage Account..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

# Get storage connection string
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString --output tsv)

# Step 6: Create Blob Containers
echo "📁 Creating Blob Containers..."
az storage container create \
  --name toy-images \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

az storage container create \
  --name uploads \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

# Step 7: Create Function App
echo "⚡ Creating Function App..."
az functionapp create \
  --resource-group $RESOURCE_GROUP \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name $FUNCTION_APP \
  --storage-account $STORAGE_ACCOUNT

# Step 8: Create Application Insights
echo "📊 Creating Application Insights..."
az monitor app-insights component create \
  --app $APP_INSIGHTS \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get Application Insights key
INSIGHTS_KEY=$(az monitor app-insights component show \
  --app $APP_INSIGHTS \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey --output tsv)

# Step 9: Configure Function App Settings
echo "⚙️  Configuring Function App Environment Variables..."
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "DATABASE_URL=postgresql://$DB_ADMIN_USER@$DB_SERVER_NAME:$DB_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require" \
    "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING" \
    "APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY" \
    "FUNCTIONS_EXTENSION_VERSION=~4" \
    "WEBSITE_NODE_DEFAULT_VERSION=~18"

# Step 10: Save Configuration
echo "💾 Saving Configuration..."
mkdir -p azure-migration/config

cat > azure-migration/config/azure-config.env << EOF
# Azure Infrastructure Configuration
RESOURCE_GROUP=$RESOURCE_GROUP
LOCATION=$LOCATION
DB_SERVER_NAME=$DB_SERVER_NAME
DB_NAME=$DB_NAME
DB_ADMIN_USER=$DB_ADMIN_USER
DB_PASSWORD=$DB_PASSWORD
STORAGE_ACCOUNT=$STORAGE_ACCOUNT
FUNCTION_APP=$FUNCTION_APP
APP_INSIGHTS=$APP_INSIGHTS

# Connection Strings
DATABASE_URL=postgresql://$DB_ADMIN_USER@$DB_SERVER_NAME:$DB_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
APPINSIGHTS_INSTRUMENTATIONKEY=$INSIGHTS_KEY

# Endpoints
DB_ENDPOINT=$DB_SERVER_NAME.postgres.database.azure.com
STORAGE_ENDPOINT=https://$STORAGE_ACCOUNT.blob.core.windows.net
FUNCTION_ENDPOINT=https://$FUNCTION_APP.azurewebsites.net
EOF

echo ""
echo "✅ Azure Infrastructure Setup Complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Resource Group: $RESOURCE_GROUP"
echo "  ✅ PostgreSQL Server: $DB_SERVER_NAME.postgres.database.azure.com"
echo "  ✅ Database: $DB_NAME"
echo "  ✅ Storage Account: $STORAGE_ACCOUNT"
echo "  ✅ Function App: $FUNCTION_APP"
echo "  ✅ Application Insights: $APP_INSIGHTS"
echo ""
echo "🔑 Database Credentials:"
echo "  Username: $DB_ADMIN_USER@$DB_SERVER_NAME"
echo "  Password: $DB_PASSWORD"
echo ""
echo "📝 Configuration saved to: azure-migration/config/azure-config.env"
echo ""
echo "🚀 Next Steps:"
echo "  1. Run: bash azure-migration/02-export-supabase-data.sh"
echo "  2. Run: bash azure-migration/03-migrate-database.sh"
echo "  3. Run: bash azure-migration/04-deploy-functions.sh"
echo ""
echo "⚠️  Important: Save your database password securely!"
echo "   Database Password: $DB_PASSWORD" 