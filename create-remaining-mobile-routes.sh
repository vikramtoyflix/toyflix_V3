#!/bin/bash

echo "🚀 Creating remaining mobile API routes..."

# Define GET routes that need query parameter support
declare -A get_routes=(
    ["wp-json/api/v1/cart"]="get_cart"
    ["wp-json/api/v1/get-order"]="get_order"
    ["wp-json/api/v1/product-by-category"]="get_product_by_category"
    ["wp-json/api/v1/get-all-product-by-category"]="get_all_product_by_category"
    ["wp-json/api/v1/check-phone-exists"]="check_phone_exists"
    ["wp-json/api/v1/get-order-address"]="get_order_address"
    ["wp-json/custom-api/v1/product-category-list"]="get_product_category_list"
    ["wp-json/custom-api/v1/get-mapped-category-data"]="get_mapped_category_data"
)

# Define POST routes that need request body support
declare -A post_routes=(
    ["wp-json/api/v1/create-order"]="create_order"
    ["wp-json/api/v1/add-to-cart"]="add_to_cart"
    ["wp-json/api/v1/removed-to-cart"]="remove_from_cart"
    ["wp-json/api/v1/update-order-address"]="update_order_address"
    ["wp-json/api/v1/logout"]="logout"
    ["wp-json/api/v1/delete_account"]="delete_account"
    ["wp-json/api/v1/update-user-profile"]="update_user_profile"
    ["wp-json/api/v1/sign-up"]="sign_up"
    ["wp-json/api/v1/save-reserved-product"]="save_reserved_product"
    ["wp-json/custom/v1/validate-coupon"]="validate_coupon"
)

# Create GET routes
for route in "${!get_routes[@]}"; do
    action="${get_routes[$route]}"
    dir="api/$route"
    
    echo "Creating GET route: $route"
    
    # Create function.json
    cat > "$dir/function.json" << END
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "options"],
      "route": "$route"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
END

    # Create index.js
    cat > "$dir/index.js" << 'END'
module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: ACTION_PLACEHOLDER request');
        
        // Build query string from all query parameters
        const queryParams = new URLSearchParams(req.query).toString();
        const vmApiUrl = `http://4.213.183.90:3001/api/woocommerce?action=ACTION_PLACEHOLDER&${queryParams}`;
        
        const vmResponse = await fetch(vmApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MobileApp-Proxy/1.0'
            }
        });

        const data = await vmResponse.json();
        
        context.res = {
            status: vmResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: data
        };

    } catch (error) {
        context.log.error('❌ Mobile API: ACTION_PLACEHOLDER failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { error: error.message, success: false }
        };
    }
};
END

    # Replace placeholder with actual action
    sed -i '' "s/ACTION_PLACEHOLDER/$action/g" "$dir/index.js"

done

# Create POST routes
for route in "${!post_routes[@]}"; do
    action="${post_routes[$route]}"
    dir="api/$route"
    
    echo "Creating POST route: $route"
    
    # Create function.json
    cat > "$dir/function.json" << END
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post", "options"],
      "route": "$route"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
END

    # Create index.js
    cat > "$dir/index.js" << 'END'
module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: ACTION_PLACEHOLDER request');
        
        const requestBody = req.body;
        const vmApiUrl = `http://4.213.183.90:3001/api/woocommerce?action=ACTION_PLACEHOLDER`;
        
        const vmResponse = await fetch(vmApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await vmResponse.json();
        
        context.res = {
            status: vmResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: data
        };

    } catch (error) {
        context.log.error('❌ Mobile API: ACTION_PLACEHOLDER failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { error: error.message, success: false }
        };
    }
};
END

    # Replace placeholder with actual action
    sed -i '' "s/ACTION_PLACEHOLDER/$action/g" "$dir/index.js"

done

echo "✅ All remaining mobile API routes created!"
echo ""
echo "📋 Summary:"
echo "✅ GET routes: ${#get_routes[@]} created"
echo "✅ POST routes: ${#post_routes[@]} created"
echo ""
echo "🚀 Next step: Run 'git add . && git commit -m \"Add mobile API routes\" && git push' to deploy"