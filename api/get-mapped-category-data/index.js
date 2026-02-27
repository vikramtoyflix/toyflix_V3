const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';

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
        context.log('📱 Mobile API: Get mapped category data request');
        
        // Get term_id from query params
        const term_id = req.query.term_id || req.body?.term_id;
        const token = req.query.token || req.body?.token;
        
        context.log(`📱 Mapped category request - Term ID: ${term_id}, Token: ${token ? 'present' : 'missing'}`);
        
        if (!token) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'Please first sign up.',
                    data: []
                }
            };
        }
        
        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Validate token
        const { data: user, error: userError } = await supabase
            .from('custom_users')
            .select('id')
            .eq('signup_token', token)
            .single();
            
        if (userError || !user) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 403,
                    message: 'Invalid token. Please sign up again.',
                    data: []
                }
            };
        }
        
        // Set default term_id to 0 if empty
        const tagId = parseInt(term_id) || 0;
        
        // Map original tag IDs to new tag IDs (matching WordPress logic)
        const tag_map = {
            0: [72, 76, 38, 83], // Mapping term_id 0
            71: [72, 76, 38, 83], // 6m-2 years
            74: [72, 76, 38, 83], // 2-3 years
            77: [72, 76, 38, 83], // 3-4 years
            75: [72, 76, 38, 83], // 4-6 years
            73: [72, 76, 38, 83], // 6-8 years
        };
        
        // Check if the passed tag ID exists in the mapping
        if (!tag_map.hasOwnProperty(tagId)) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 400,
                    message: 'Invalid tag ID.',
                    data: []
                }
            };
        }
        
        // Get the mapped tag IDs (array)
        const mapped_tag_ids = tag_map[tagId];
        
        // Create category data based on mapped IDs (matching WordPress structure)
        const categoryMap = {
            72: { term_id: 72, name: 'Educational Toys' },
            76: { term_id: 76, name: 'Building Blocks' },
            38: { term_id: 38, name: 'Puzzles & Games' },
            83: { term_id: 83, name: 'Outdoor Toys' }
        };
        
        // Build category data in the order of mapped tag IDs
        const category_data = mapped_tag_ids.map(id => categoryMap[id]).filter(Boolean);
        
        context.log(`✅ Found ${category_data.length} mapped categories for term_id: ${tagId}`);
        
        if (category_data.length > 0) {
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 200,
                    message: 'Category data retrieved successfully.',
                    data: category_data
                }
            };
        } else {
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: {
                    status: 404,
                    message: 'No data found for the mapped tag IDs.',
                    data: []
                }
            };
        }
        
    } catch (error) {
        context.log.error('❌ Error in get-mapped-category-data:', error);
        
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: {
                status: 500,
                message: 'Internal server error',
                data: []
            }
        };
    }
};
