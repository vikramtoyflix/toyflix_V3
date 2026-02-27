module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: Profile update request');
        
        // Get token from query params (Android app sends it this way)
        let token = req.query.token || req.body.token;
        
        // Handle URL decoding issues - decode the token properly
        if (token) {
            token = decodeURIComponent(token);
            // Remove any whitespace that might have been introduced
            token = token.trim();
        }
        
        if (!token) {
            throw new Error('Authentication token required');
        }

        context.log(`📱 Profile update - Token: ${token ? `"${token}" (${token.length} chars)` : 'missing'}`);
        
        // Extract phone number from token if it's in format: token_PHONE_TIMESTAMP
        let phoneNumber = token;
        const tokenMatch = token.match(/^token_(\d+)_\d+$/);
        if (tokenMatch) {
            phoneNumber = tokenMatch[1];
            context.log(`📱 Extracted phone from token: ${phoneNumber}`);
        }

        // Parse form data from Android app (URL-encoded)
        let profileData = {};
        
        if (req.body) {
            // Handle URL-encoded data from Android app
            if (typeof req.body === 'string') {
                // Parse URL-encoded string
                const params = new URLSearchParams(req.body);
                profileData = {
                    first_name: params.get('first_name'),
                    last_name: params.get('last_name'),
                    nickname: params.get('nickname'),
                    email: params.get('email'),
                    pincode: params.get('pincode'),
                    mobile: params.get('mobile')
                };
            } else {
                // Handle JSON data
                profileData = req.body;
            }
        }

        context.log('📱 Profile data received:', profileData);

        const { first_name, last_name, nickname, email, pincode, mobile } = profileData;
        
        if (!first_name || !last_name) {
            throw new Error('First name and last name are required');
        }

        // Use same Supabase configuration as website
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
        
        // Find user by token (assuming token is phone number)
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
        
        context.log(`🔍 Looking up user with formats: ${uniqueFormats.join(', ')}`);
        
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

        // ========== NEW SIGNUP DETECTION LOGIC ==========
        // Check if this is a new user signup (profile completion)
        const isNewUserSignup = !user.first_name || !user.last_name || 
                                user.first_name.trim() === '' || user.last_name.trim() === '';

        if (isNewUserSignup) {
            context.log('🆕 New user signup detected - calling auth-complete-profile edge function');
            
            // Call auth-complete-profile Supabase edge function (same as website)
            const completeProfileResponse = await fetch(
                `${supabaseUrl}/functions/v1/auth-complete-profile`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        firstName: first_name,
                        lastName: last_name,
                        email: email || null,
                        pincode: pincode || null
                    })
                }
            );
            
            if (!completeProfileResponse.ok) {
                const errorText = await completeProfileResponse.text();
                context.log.error('❌ auth-complete-profile edge function failed:', errorText);
                throw new Error('Failed to complete user profile');
            }
            
            const profileResult = await completeProfileResponse.json();
            
            if (!profileResult.success) {
                throw new Error(profileResult.error || 'Profile completion failed');
            }
            
            context.log('✅ Profile completed via auth-complete-profile edge function:', {
                userId: profileResult.user.id,
                sessionCreated: !!profileResult.session,
                freshworksIntegration: 'triggered'
            });
            
            // Return response with session token for mobile app authentication
            const response = {
                status: 200,
                message: 'Profile completed successfully',
                data: {
                    id: profileResult.user.id,
                    first_name: profileResult.user.first_name,
                    last_name: profileResult.user.last_name,
                    nickname: profileResult.user.first_name,
                    email: profileResult.user.email,
                    phone: profileResult.user.phone,
                    mobile: profileResult.user.phone,
                    pincode: profileResult.user.zip_code || pincode,
                    updated_at: profileResult.user.updated_at,
                    // Include session token from auth-complete-profile
                    session_token: profileResult.session?.access_token,
                    token_type: profileResult.session?.token_type,
                    expires_at: profileResult.session?.expires_at
                },
                backend: "supabase-auth-complete-profile",
                timestamp: new Date().toISOString()
            };
            
            context.res = {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: response
            };
            
            return; // Exit early - profile completed via edge function
        }

        // ========== EXISTING USER PROFILE UPDATE LOGIC ==========
        context.log('📝 Existing user profile update - using direct database update');
        
        // Update user profile using direct Supabase REST API (for existing users only)
        const updateData = {
            first_name: first_name,
            last_name: last_name,
            email: email || user.email,
            zip_code: pincode || user.zip_code,
            updated_at: new Date().toISOString()
        };

        // Remove null/undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
                delete updateData[key];
            }
        });

        context.log('📱 Updating existing user with data:', updateData);

        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/custom_users?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            context.log.error('❌ Supabase update failed:', errorText);
            throw new Error('Failed to update profile in database');
        }

        const updatedUsers = await updateResponse.json();
        const updatedUser = updatedUsers[0];

        context.log('✅ Existing user profile updated successfully:', updatedUser.id);

        // Return response in format expected by Android app
        const response = {
            status: 200,
            message: 'Profile updated successfully',
            data: {
                id: updatedUser.id,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                nickname: updatedUser.first_name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                mobile: updatedUser.phone,
                pincode: updatedUser.zip_code || updatedUser.pincode,
                updated_at: updatedUser.updated_at
            },
            backend: "supabase-real-data",
            timestamp: new Date().toISOString()
        };
        
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: response
        };

    } catch (error) {
        context.log.error('❌ Mobile API: Profile update failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { 
                status: 500,
                message: error.message || 'Profile update failed',
                data: null,
                backend: "supabase-real-data",
                timestamp: new Date().toISOString()
            }
        };
    }
};
