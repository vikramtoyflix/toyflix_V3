// Use REST API for Azure Functions compatibility
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
        context.log('📱 Mobile API: Generate token request');
        
        // Handle React Native axios form-data format
        let phone_number, fcm_token;
        
        context.log('📱 Request details:', {
            method: req.method,
            contentType: req.headers['content-type'],
            hasBody: !!req.body,
            bodyType: typeof req.body,
            query: req.query
        });
        
        // Try multiple ways to get the data
        if (req.body) {
            if (typeof req.body === 'string') {
                try {
                    const parsed = JSON.parse(req.body);
                    phone_number = parsed.phone_number || parsed.phone;
                    fcm_token = parsed.fcm_token;
                } catch (e) {
                    // Parse form data manually
                    const phoneMatch = req.body.match(/name="phone_number"[^]*?([0-9]+)/);
                    const fcmMatch = req.body.match(/name="fcm_token"[^]*?([^"]+)/);
                    if (phoneMatch) phone_number = phoneMatch[1];
                    if (fcmMatch) fcm_token = fcmMatch[1];
                }
            } else if (typeof req.body === 'object') {
                phone_number = req.body.phone_number || req.body.phone;
                fcm_token = req.body.fcm_token;
            }
        }
        
        // Fallback to query parameters
        if (!phone_number) {
            phone_number = req.query?.phone_number || req.query?.phone;
        }
        if (!fcm_token) {
            fcm_token = req.query?.fcm_token;
        }
        
        context.log(`📱 Generate token for phone: ${phone_number}`);
        
        if (!phone_number) {
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 400,
                    message: 'Phone number is required'
                })
            };
        }
        
        // Clean phone number
        const cleanPhone = phone_number.replace(/\D/g, '');
        const phoneLastTen = cleanPhone.slice(-10);
        
        // Search for user with multiple phone formats using REST API
        const phoneFormats = [
            phoneLastTen,
            `91${phoneLastTen}`,
            `+91${phoneLastTen}`,
            cleanPhone
        ];
        
        let user = null;
        
        // Try each phone format
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
        
        if (!user) {
            context.log(`❌ User not found for phone: ${phone_number}`);
            return context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 404,
                    message: 'Please sign up first, then try again.'
                })
            };
        }
        
        context.log(`✅ User found: ${user.id}`);
        
        // Generate or get existing token
        let token = user.signup_token;
        
        if (!token) {
            token = generateRandomToken(20);
            
            // Update user with new token using REST API
            const updateData = {
                signup_token: token,
                last_login: new Date().toISOString()
            };
            
            if (fcm_token) {
                updateData.fcm_token = fcm_token;
            }
            
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/custom_users?id=eq.${user.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(updateData)
            });
                
            if (!updateResponse.ok) {
                context.log.error('Failed to save token:', updateResponse.statusText);
                return context.res = {
                    status: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        status: 500,
                        message: 'Failed to save the signup token',
                        posted_data: phone_number
                    })
                };
            }
            
            context.log(`✅ New token generated for user: ${user.id}`);
            
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 200,
                    message: 'Token generated successfully.',
                    data: token,
                    user_data: {
                        user_id: user.id,
                        phone_verified: user.phone_verified || true,
                        skip_intro: true,
                        direct_to_dashboard: true,
                        navigation_ready: true
                    }
                })
            };
        } else {
            // Update FCM token if provided
            if (fcm_token) {
                await fetch(`${supabaseUrl}/rest/v1/custom_users?id=eq.${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        fcm_token: fcm_token,
                        last_login: new Date().toISOString()
                    })
                });
            }
            
            context.log(`✅ Existing token returned for user: ${user.id}`);
            
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    status: 200,
                    message: 'Token already exists.',
                    token: token,
                    user_data: {
                        user_id: user.id,
                        phone_verified: user.phone_verified || true,
                        skip_intro: true,
                        direct_to_dashboard: true,
                        navigation_ready: true
                    }
                })
            };
        }
        
    } catch (error) {
        context.log.error('❌ Error in generate-token:', error);
        
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                status: 500,
                message: 'Internal server error'
            })
        };
    }
};

// Helper function to generate random token
function generateRandomToken(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}