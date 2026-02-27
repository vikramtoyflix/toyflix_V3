#!/bin/bash

echo "🔧 Fixing mobile API routes to use correct Azure Function backend"
echo "OLD: http://4.213.183.90:3001"
echo "NEW: https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net"
echo ""

# Define the correct Azure Function URL
OLD_URL="http://4.213.183.90:3001"
NEW_URL="https://toyflix-woocommerce-proxy-bjh8hchjagdtgnhp.centralindia-01.azurewebsites.net"

# Find all API route files and update them
find api -name "index.js" -type f | while read file; do
    if grep -q "$OLD_URL" "$file"; then
        echo "Updating: $file"
        sed -i '' "s|$OLD_URL|$NEW_URL|g" "$file"
    fi
done

echo ""
echo "✅ All mobile API routes updated!"
echo ""
echo "📋 Updated routes:"
find api -name "index.js" -type f -exec grep -l "$NEW_URL" {} \;