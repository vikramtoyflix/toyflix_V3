// Mobile-compatible Azure Function for check-phone-exists
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
        context.log('📱 Mobile API: Check phone exists request');
        context.log('📱 Full request object:', JSON.stringify(req, null, 2));
        
        // Handle React Native FormData - multiple extraction methods
        let phone;
        
        // Method 1: Direct body access
        if (req.body && typeof req.body === 'object') {
            phone = req.body.phone || req.body.phone_number;
            context.log('📱 Method 1 (object body):', phone);
        }
        
        // Method 2: String body parsing
        if (!phone && req.body && typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                phone = parsed.phone || parsed.phone_number;
                context.log('📱 Method 2 (JSON parse):', phone);
            } catch (e) {
                // Try to extract from form-data string
                const phoneMatch = req.body.match(/(?:phone|phone_number)["\s]*[:\=]["\s]*([0-9]+)/);
                if (phoneMatch) {
                    phone = phoneMatch[1];
                    context.log('📱 Method 2 (regex):', phone);
                }
            }
        }
        
        // Method 3: Query parameters
        if (!phone && req.query) {
            phone = req.query.phone || req.query.phone_number;
            context.log('📱 Method 3 (query):', phone);
        }
        
        // Method 4: Check if phone is in URL path
        if (!phone && req.url) {
            const urlMatch = req.url.match(/phone[=:]([0-9]+)/);
            if (urlMatch) {
                phone = urlMatch[1];
                context.log('📱 Method 4 (URL):', phone);
            }
        }
        
        // Method 5: Raw body examination
        if (!phone && req.rawBody) {
            const phoneMatch = req.rawBody.match(/[0-9]{10}/);
            if (phoneMatch) {
                phone = phoneMatch[0];
                context.log('📱 Method 5 (raw body):', phone);
            }
        }
        
        context.log(`📱 Final extracted phone: ${phone}`);
        
        // Validate phone number
        if (!phone) {
            context.log('❌ No phone number found in request');
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 404,
                    message: 'Phone number cannot be null',
                    posted_data: phone,
                    debug: {
                        contentType: req.headers['content-type'],
                        bodyType: typeof req.body,
                        hasQuery: !!req.query,
                        bodyKeys: req.body ? Object.keys(req.body) : [],
                        queryKeys: req.query ? Object.keys(req.query) : []
                    }
                })
            };
        }
        
        // Clean and validate phone number
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length < 10) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 404,
                    message: 'Phone number must be at least 10 digits',
                    posted_data: phone
                })
            };
        }
        
        // Get last 10 digits for matching
        const phoneLastTen = cleanPhone.slice(-10);
        
        // Search for user with multiple phone formats using REST API
        const phoneFormats = [
            phoneLastTen,
            `91${phoneLastTen}`,
            `+91${phoneLastTen}`,
            cleanPhone
        ];
        
        context.log(`🔍 Searching for phone formats: ${phoneFormats.join(', ')}`);
        
        let user = null;
        
        // Try each phone format using REST API
        for (const phoneFormat of phoneFormats) {
            const response = await fetch(`${supabaseUrl}/rest/v1/custom_users?phone=eq.${encodeURIComponent(phoneFormat)}&select=*`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    user = data[0];
                    break;
                }
            }
        }
        
        if (user) {
            context.log(`✅ User found: ${user.id}`);
            
            // Generate token if user doesn't have one (matching WordPress logic)
            if (!user.signup_token) {
                const token = generateRandomToken(20);
                
                // Update user with token using REST API
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/custom_users?id=eq.${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        signup_token: token,
                        last_login: new Date().toISOString()
                    })
                });
                    
                if (!updateResponse.ok) {
                    context.log.error('Failed to save token:', updateResponse.statusText);
                    return context.res = {
                        status: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            status: 500,
                            message: 'Failed to save the signup token',
                            posted_data: phone
                        })
                    };
                }
            }
            
            // Return success response (mobile app compatible format)
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 200,
                    message: 'Phone number exists',
                    data: {
                        phone_exists: true,
                        user_id: user.id,
                        phone_verified: user.phone_verified || false
                    }
                })
            };
        } else {
            context.log(`❌ User not found for phone: ${phone}`);
            
            // Return not found response (matching WordPress format)
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 404,
                    message: 'No data available',
                    posted_data: phone
                })
            };
        }
        
    } catch (error) {
        context.log.error('❌ Error in check-phone-exists:', error);
        
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 500,
                message: 'Internal server error',
                posted_data: req.body?.phone || req.body?.phone_number || 'unknown'
            })
        };
    }
};

// Helper function to generate random token (matching WordPress wp_generate_password)
function generateRandomToken(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}