module.exports = async function (context, req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers: corsHeaders };
        return;
    }

    try {
        context.log('📱 Mobile API: Delete account request');
        
        // Get token from request body (Android app sends it this way)
        let token = req.body?.token;
        
        // Handle URL decoding issues - decode the token properly
        if (token) {
            token = decodeURIComponent(token);
            // Remove any whitespace that might have been introduced
            token = token.trim();
        }
        
        if (!token) {
            throw new Error('Authentication token required');
        }

        context.log(`📱 Delete account - Token: ${token ? `"${token}" (${token.length} chars)` : 'missing'}`);
        
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
                    break;
                }
            }
        }
        
        if (!user) {
            throw new Error('User not found');
        }

        // Mark user as deleted (soft delete)
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/custom_users?id=eq.${user.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_active: false,
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        });

        if (!deleteResponse.ok) {
            throw new Error('Failed to delete account');
        }

        context.log('✅ Account deleted successfully:', user.id);

        // Return response in format expected by Android app
        const response = {
            status: 200,
            message: 'Account deleted successfully',
            backend: "supabase-real-data",
            timestamp: new Date().toISOString()
        };
        
        context.res = {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: response
        };

    } catch (error) {
        context.log.error('❌ Mobile API: Account deletion failed:', error.message);
        
        context.res = {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: { 
                status: 500,
                message: error.message || 'Account deletion failed',
                backend: "supabase-real-data",
                timestamp: new Date().toISOString()
            }
        };
    }
};
