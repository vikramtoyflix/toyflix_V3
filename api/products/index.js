module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: Products (Simplified Route)');
        
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        // Get available products
        const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/toys?available_quantity=gt.0&order=is_featured.desc,name.asc&limit=50`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey
            }
        });

        if (!supabaseResponse.ok) {
            throw new Error(`Supabase error: ${supabaseResponse.status} ${supabaseResponse.statusText}`);
        }

        const data = await supabaseResponse.json();
        
        context.log(`✅ Products: Found ${data.length} available toys`);
        
        // Format for Android app
        const formattedData = data.map(toy => ({
            id: toy.id,
            title: toy.name,
            image: toy.image_url,
            price: toy.retail_price || toy.rental_price || 199,
            description: toy.description,
            category: toy.category,
            available_quantity: toy.available_quantity,
            is_featured: toy.is_featured || false
        }));
        
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: {
                success: true,
                data: formattedData,
                count: formattedData.length,
                backend: "supabase-simplified",
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('❌ Products failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { 
                success: false, 
                error: error.message,
                backend: "supabase-simplified",
                timestamp: new Date().toISOString()
            }
        };
    }
};