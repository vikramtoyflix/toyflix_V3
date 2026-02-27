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
        context.log('📱 Mobile API: User profile request (Real Supabase Data)');
        
        // Get auth token from query params (Android app sends it this way)
        let token = req.query.token;
        
        // Handle URL decoding issues - decode the token properly
        if (token) {
            token = decodeURIComponent(token);
            // Remove any whitespace that might have been introduced
            token = token.trim();
        }
        
        context.log(`📱 User profile request - Token: ${token ? `"${token}" (${token.length} chars)` : 'missing'}`);
        
        if (!token) {
            throw new Error('Authentication token required');
        }
        
        // Extract phone number from token if it's in format: token_PHONE_TIMESTAMP
        let phoneNumber = token;
        const tokenMatch = token.match(/^token_(\d+)_\d+$/);
        if (tokenMatch) {
            phoneNumber = tokenMatch[1];
            context.log(`📱 Extracted phone from token: ${phoneNumber}`);
        }
        
        // Use same Supabase configuration as website
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        let user = null;
        
        // Try multiple phone formats for token lookup (enhanced for better matching)
        const phoneFormats = [
            phoneNumber,                                      // Extracted phone number or original token
            phoneNumber.replace(/^\+91/, ''),                // Remove +91 prefix
            phoneNumber.replace(/^91/, ''),                  // Remove 91 prefix  
            phoneNumber.replace(/^\+?91/, ''),               // Remove any 91 prefix with optional +
            phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`, // Add +91 prefix if not present
            phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber}`,   // Add 91 prefix if not present
            phoneNumber.replace(/[^\d]/g, ''),               // Only digits
            phoneNumber.replace(/[^\d]/g, '').slice(-10),    // Last 10 digits only
            phoneNumber.trim(),                              // Remove whitespace
            phoneNumber.replace(/\s+/g, ''),                 // Remove all spaces
        ];
        
        // Also try with common patterns for 10-digit numbers
        const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
        if (cleanPhone.length >= 10) {
            const last10 = cleanPhone.slice(-10);
            phoneFormats.push(
                last10,                                   // Clean 10 digits
                `+91${last10}`,                          // +91 + 10 digits
                `91${last10}`,                           // 91 + 10 digits
            );
        }
        
        const uniqueFormats = [...new Set(phoneFormats)];
        
        context.log(`🔍 Trying phone formats: ${uniqueFormats.join(', ')}`);
        
        for (const phoneFormat of uniqueFormats) {
            const response = await fetch(`${supabaseUrl}/rest/v1/custom_users?phone=eq.${encodeURIComponent(phoneFormat)}&select=*`, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const users = await response.json();
                if (users && users.length > 0) {
                    user = users[0];
                    context.log(`✅ User found with phone format: ${phoneFormat}`);
                    break;
                }
            }
        }
        
        if (!user) {
            throw new Error('User not found');
        }
        
        // Fetch subscription details if available
        let subscriptionDetails = null;
        try {
            const subResponse = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=*`, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (subResponse.ok) {
                const subscriptions = await subResponse.json();
                if (subscriptions && subscriptions.length > 0) {
                    subscriptionDetails = subscriptions[0];
                }
            }
        } catch (subError) {
            context.log('Warning: Could not fetch subscription details:', subError.message);
        }
        
        // Format response for Android app compatibility (EXACT structure expected)
        const userProfileResponse = {
            status: 200,
            message: 'User profile retrieved successfully',
            data: {
                id: user.id,
                username: user.phone,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                nickname: user.first_name || 'User',
                email: user.email || '',
                phone: user.phone,
                mobile: user.phone,
                pincode: user.zip_code || user.pincode || '',
                address: user.address_line1 || '',
                city: user.city || '',
                state: user.state || '',
                verified: user.phone_verified || false,
                active: user.is_active || false,
                created_at: user.created_at,
                updated_at: user.updated_at,
                role: user.role || 'user',
                termId: subscriptionDetails?.plan_id || null,
                subscription_details: subscriptionDetails ? {
                    subscription_status: subscriptionDetails.status || 'Inactive',
                    plan_name: subscriptionDetails.plan_name || 'Basic',
                    start_date: subscriptionDetails.start_date,
                    end_date: subscriptionDetails.end_date,
                    toys_limit: subscriptionDetails.toys_limit || 2
                } : null,
                has_used_trial: user.has_used_trial || false
            },
            backend: "supabase-real-data",
            timestamp: new Date().toISOString()
        };
        
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: userProfileResponse
        };

    } catch (error) {
        context.log.error('❌ Mobile API: User profile failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { 
                status: 500,
                message: error.message,
                data: null,
                backend: "supabase-real-data",
                timestamp: new Date().toISOString()
            }
        };
    }
};