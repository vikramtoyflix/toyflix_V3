#!/bin/bash

echo "🔄 Updating mobile API routes to use Supabase backend"
echo ""

# Supabase configuration
SUPABASE_URL="https://wucwpyitzqjukcphczhr.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY"

# Example: Update featured products to use Supabase
cat > api/wp-json/api/v1/featured-products/index.js << 'EOF'
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
        context.log('📱 Mobile API: Featured products via Supabase');
        
        // Use Supabase to get featured products
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        // Query Supabase for products marked as featured
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/toys?featured=eq.true&select=*`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            }
        });

        if (!supabaseResponse.ok) {
            throw new Error(`Supabase error: ${supabaseResponse.status}`);
        }

        const data = await supabaseResponse.json();
        
        // Format data for mobile app compatibility
        const formattedData = data.map(toy => ({
            id: toy.id,
            title: toy.name,
            image: toy.image_url,
            price: toy.price || 199,
            description: toy.description
        }));
        
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: formattedData
        };

    } catch (error) {
        context.log.error('❌ Mobile API: Featured products failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { error: error.message, success: false }
        };
    }
};
EOF

echo "✅ Updated featured products to use Supabase"
echo ""
echo "🚀 This approach:"
echo "  ✅ Uses your working Supabase database"
echo "  ✅ Avoids Azure Function authentication issues" 
echo "  ✅ Direct connection from Static Web App to Supabase"
echo "  ✅ More reliable and modern architecture"