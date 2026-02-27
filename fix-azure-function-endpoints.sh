#!/bin/bash

echo "🔧 Fixing Azure Function API endpoint formats"
echo ""

# The correct Azure Function base URL
BASE_URL="https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net"

# Function to update API endpoint format in each file
update_api_file() {
    local file="$1"
    local action="$2"
    local endpoint="$3"
    
    echo "Updating $file -> /$endpoint"
    
    # Replace the old query parameter format with direct endpoint format
    sed -i '' "s|${BASE_URL}/api/woocommerce?action=${action}.*\`|${BASE_URL}/api/${endpoint}\`|g" "$file"
}

# Update specific mobile API routes with correct Azure Function endpoints
update_api_file "api/wp-json/api/v1/featured-products/index.js" "get_featured_products" "featured-products"
update_api_file "api/wp-json/api/v1/generate-token/index.js" "generate_token" "generate-token"
update_api_file "api/wp-json/api/v1/user-profile/index.js" "get_user_profile" "user-profile"
update_api_file "api/wp-json/api/v1/products/index.js" "get_products" "products"
update_api_file "api/wp-json/api/v1/search-products/index.js" "search_products" "search-products"
update_api_file "api/wp-json/api/v1/cart/index.js" "get_cart" "cart"
update_api_file "api/wp-json/api/v1/create-order/index.js" "create_order" "create-order"
update_api_file "api/wp-json/api/v1/add-to-cart/index.js" "add_to_cart" "add-to-cart"
update_api_file "api/sendOtp/index.js" "send_otp" "send-otp"
update_api_file "api/verifyOtp/index.js" "verify_otp" "verify-otp"

# Fix health endpoint specifically
sed -i '' 's|/api/woocommerce?action=|/api/|g' api/health/index.js

echo ""
echo "✅ Azure Function endpoint formats updated!"
echo ""
echo "📋 Testing a sample endpoint..."