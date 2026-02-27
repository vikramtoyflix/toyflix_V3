#!/bin/bash

# Deploy Fixed Azure Functions for WooCommerce Proxy
# This fixes the double-nesting issues in user-by-phone and order-items endpoints

echo "🚀 Deploying Fixed Azure Functions..."

# Set the function app name
FUNCTION_APP_NAME="toyflix-woocommerce-proxy"
RESOURCE_GROUP="toyflix-rg"

# Check if Azure CLI is logged in
if ! az account show > /dev/null 2>&1; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd azure-functions-fixed
npm install

# Create zip file for deployment
echo "📁 Creating deployment package..."
zip -r ../azure-functions-fixed.zip . -x "node_modules/*" "*.sh"
cd ..

# Deploy the functions
echo "☁️ Deploying to Azure Function App: $FUNCTION_APP_NAME..."
az functionapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $FUNCTION_APP_NAME \
    --src azure-functions-fixed.zip

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🔧 Fixed Endpoints:"
    echo "  - Health: https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    echo "  - User by Phone: https://$FUNCTION_APP_NAME.azurewebsites.net/api/user-by-phone/{phone}"
    echo "  - Subscription Cycle: https://$FUNCTION_APP_NAME.azurewebsites.net/api/subscription-cycle/{userId}"  
    echo "  - Order Items: https://$FUNCTION_APP_NAME.azurewebsites.net/api/order-items/{orderId}"
    echo ""
    echo "🔄 Changes made:"
    echo "  ✅ Fixed user-by-phone: Removed double nesting"
    echo "  ✅ Fixed order-items: Removed double nesting"
    echo "  ✅ Health & subscription-cycle: Maintained working structure"
    echo "  ✅ All endpoints now return consistent single-nested data"
    echo ""
    echo "🧪 Test the fixed endpoints:"
    echo "  curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"
    echo "  curl https://$FUNCTION_APP_NAME.azurewebsites.net/api/user-by-phone/9606189690"
else
    echo "❌ Deployment failed!"
    exit 1
fi

# Clean up
rm -f azure-functions-fixed.zip
echo "✨ Deployment complete!" 