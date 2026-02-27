#!/bin/bash

echo "🔧 Fixing Azure Waterfall Model - Redeploying Functions"
echo "======================================================="

# Configuration
FUNCTION_APP_NAME="toyflix-woocommerce-proxy-bjh8hchjagdtgnhp"
RESOURCE_GROUP="toyflix-rg"

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not installed. Install with: brew install azure-cli"
    exit 1
fi

if ! az account show > /dev/null 2>&1; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

echo "🔍 Checking Function App status..."
FUNCTION_STATUS=$(az functionapp show --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query "state" -o tsv 2>/dev/null)

if [ "$FUNCTION_STATUS" != "Running" ]; then
    echo "⚠️  Function App is not running. Current status: $FUNCTION_STATUS"
    echo "🔄 Starting Function App..."
    az functionapp start --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP
fi

echo "🔧 Updating Function App configuration..."

# Set correct environment variables
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "WC_DB_HOST=4.213.183.90" \
    "WC_DB_USER=toyflix_user" \
    "WC_DB_PASSWORD=toyflixX1@@" \
    "WC_DB_NAME=toyflix" \
    "WC_DB_PORT=3306" \
    "FUNCTIONS_WORKER_RUNTIME=node" \
    "NODE_ENV=production"

echo "🚀 Deploying fixed Azure Functions..."

# Deploy the fixed functions with proper auth level
cd azure-functions-fixed

# Create deployment package
echo "📦 Creating deployment package..."
npm install --production
zip -r ../azure-functions-deployment.zip . -x "node_modules/.cache/*" "*.sh"

cd ..

# Deploy the package
echo "☁️  Deploying to Azure..."
az functionapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $FUNCTION_APP_NAME \
  --src azure-functions-deployment.zip

echo "⏱️  Waiting for deployment to complete..."
sleep 30

echo "🧪 Testing endpoints..."
FUNCTION_URL="https://$FUNCTION_APP_NAME.centralindia-01.azurewebsites.net"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FUNCTION_URL/api/health")
echo "Health endpoint status: $HEALTH_STATUS"

# Test user lookup for the specific phone number
echo "Testing user lookup for 9108734535..."
USER_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FUNCTION_URL/api/user-by-phone/9108734535")
echo "User lookup status: $USER_STATUS"

if [ "$HEALTH_STATUS" = "200" ] && [ "$USER_STATUS" = "200" ]; then
    echo "✅ Waterfall model fixed successfully!"
    echo ""
    echo "📞 Test with phone 9108734535:"
    echo "   curl '$FUNCTION_URL/api/user-by-phone/9108734535'"
else
    echo "❌ Issues still exist. Check Azure Portal logs:"
    echo "   https://portal.azure.com → Function Apps → $FUNCTION_APP_NAME → Monitor"
fi

# Cleanup
rm -f azure-functions-deployment.zip

echo ""
echo "🔗 Azure Portal Links:"
echo "   Function App: https://portal.azure.com/#@/resource/subscriptions/your-sub/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME"
echo "   Logs: https://portal.azure.com/#@/resource/subscriptions/your-sub/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME/logs" 