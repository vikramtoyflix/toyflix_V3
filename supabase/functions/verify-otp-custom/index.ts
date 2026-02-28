import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const generateJWT = async (userId: string, phone: string) => {
  const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'super-secret-jwt-token-with-at-least-32-characters-long';
  
  const payload = {
    sub: userId,
    phone: phone,
    iss: "toyflix",
    exp: getNumericDate(60 * 60), // 1 hour expiration
  };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
};

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Verify OTP Custom Function Started v6 ===');
  console.log('Request method:', req.method);
  console.log('Timestamp:', new Date().toISOString());
  console.log('JWT_SECRET available:', !!Deno.env.get('JWT_SECRET'));
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp, mode = 'signup' } = await req.json();
    console.log('Received verification request for phone:', phone, 'with OTP:', otp, 'mode:', mode);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Server configuration error',
        message: 'Missing Supabase configuration'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { 
      auth: { persistSession: false } 
    });

    // 1. Verify OTP
    console.log('Starting OTP verification process...');
    console.log('Input values:', { phone, otp });

    // Generate phone number variations to handle different formats
    const phoneVariations = [
      phone,                          // Original input
      phone.replace(/^\+91/, ''),     // Remove +91 prefix
      phone.startsWith('+91') ? phone : `+91${phone}`, // Add +91 if not present
      phone.replace(/^\+?91/, ''),    // Remove any 91 prefix
      `91${phone.replace(/^\+?91/, '')}` // Add 91 without +
    ];
    const uniquePhoneFormats = [...new Set(phoneVariations)];
    console.log('Phone number variations to check:', uniquePhoneFormats);

    // First, let's check what OTPs exist for this phone number
    const { data: allOtps, error: checkError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .in('phone_number', uniquePhoneFormats)
      .order('created_at', { ascending: false })
      .limit(5);  // Get last 5 OTPs for debugging

    if (checkError) {
      console.error('Error checking existing OTPs:', checkError);
    } else {
      console.log('Recent OTPs in database:', allOtps?.length || 0);
      if (allOtps && allOtps.length > 0) {
        console.log('Recent OTP records:', allOtps.map(otp => ({
          phone: otp.phone_number,
          otp: otp.otp_code,
          created: otp.created_at,
          expires: otp.expires_at,
          verified: otp.is_verified,
          provider: otp.provider,
          session_id: otp.session_id
        })));
      }
    }

    // Get the most recent unverified OTP record to check the session_id
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_verifications')
      .select('*')
      .in('phone_number', uniquePhoneFormats)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error('Error fetching OTP record:', otpError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch OTP record',
        message: otpError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!otpRecord) {
      console.error('No unverified OTP record found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No OTP record found',
        message: 'Please request a new OTP'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      console.error('OTP has expired:', otpRecord.expires_at);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OTP has expired',
        message: 'This OTP has expired. Please request a new one.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const twoFactorApiKey = Deno.env.get('TWOFACTOR_API_KEY');

    // Dev mode: verify against locally stored OTP code
    if (!twoFactorApiKey || otpRecord.provider === 'dev' || otpRecord.session_id === 'dev-mode') {
      console.log('Dev mode OTP verification');
      if (otpRecord.otp_code !== otp) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP',
          message: 'The OTP you entered is incorrect. Please try again.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Production: verify via 2Factor API using session_id
      if (!otpRecord.session_id) {
        console.error('No session_id found for OTP record id:', otpRecord.id);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid OTP session',
          message: 'Your verification session is missing. Please request a new OTP.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verifyUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/VERIFY/${otpRecord.session_id}/${otp}`;
      console.log('Calling 2Factor verify API, session_id:', otpRecord.session_id);

      try {
        const verifyResponse = await fetch(verifyUrl, { method: 'GET' });
        const verifyResult = await verifyResponse.json();
        console.log('2Factor verification response:', verifyResult);

        if (verifyResult.Status !== 'Success') {
          console.error('2Factor verification failed:', verifyResult);
          const detail = verifyResult.Details || '';
          const message = detail.includes('Invalid API / SessionId')
            ? 'Your verification session has expired. Please request a new OTP.'
            : detail.includes('OTP Mismatch')
            ? 'The OTP you entered is incorrect. Please try again.'
            : detail || 'Verification failed. Please try again.';

          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Invalid OTP',
            message,
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('2Factor OTP verified successfully for phone:', phone);
      } catch (verifyError: any) {
        console.error('2Factor verification request failed:', verifyError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Verification service error',
          message: verifyError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Mark OTP as verified in our database
    const { error: updateError } = await supabaseAdmin
      .from('otp_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString(),
        attempts: (otpRecord.attempts || 0) + 1
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Failed to mark OTP as verified:', updateError);
    }

    // Continue with user lookup and session creation...

    // 2. Find or create user in `custom_users` - check multiple phone formats
    console.log('🔍 Looking up user with phone format variations...');
    
    // Generate multiple phone format variations to handle inconsistent storage
    const phoneVariationsForUser = [
      phone,                          // Original input (e.g., "8939758254" or "+918939758254")
      phone.replace(/^\+91/, ''),     // Remove +91 prefix if present (e.g., "8939758254")
      phone.startsWith('+91') ? phone : `+91${phone}`, // Add +91 prefix if not present (e.g., "+918939758254")
      phone.replace(/^\+?91/, ''),    // Remove any 91 prefix (e.g., "8939758254")
      `91${phone.replace(/^\+?91/, '')}` // Add 91 prefix without + (e.g., "918939758254")
    ];

    // Remove duplicates
    const uniquePhoneFormatsForUser = [...new Set(phoneVariationsForUser)];
    console.log('🔍 Checking phone variations for user lookup:', uniquePhoneFormatsForUser);

    let user = null;
    let userError = null;

    // Try each phone format variation until we find the user
    for (const phoneFormat of uniquePhoneFormatsForUser) {
      console.log(`🔍 Trying phone format: "${phoneFormat}"`);
      
      const { data: userData, error: lookupError } = await supabaseAdmin
        .from('custom_users')
        .select('*')
        .eq('phone', phoneFormat)
        .maybeSingle();

      if (lookupError) {
        console.log(`❌ Error with phone format "${phoneFormat}":`, lookupError.message);
        userError = lookupError;
        continue;
      }

      if (userData) {
        console.log(`✅ User found with phone format: "${phoneFormat}"`);
        user = userData;
        
        // If we found the user with a different format, update their phone to the consistent format
        if (phoneFormat !== phone) {
          console.log(`🔄 Normalizing phone format from "${phoneFormat}" to "${phone}"`);
          const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('custom_users')
            .update({ phone: phone })
            .eq('id', userData.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('⚠️ Warning: Could not normalize phone format:', updateError.message);
            // Continue with original user data
          } else {
            user = updatedUser;
            console.log('✅ Phone format normalized successfully');
          }
        }
        break;
      }
    }

    console.log('🔍 Final user lookup result:', { userExists: !!user, userError: userError?.message });

    let isNewUser = false;
    if (!user) {
      if (mode === 'signin') {
        console.log('🔍 SIGNIN MODE - User not found, returning error');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Account not found. Please sign up first or check your phone number.' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('🔍 SIGNUP MODE - Creating minimal user record for profile completion');
        // For new users in signup mode, create a minimal record to store the phone verification
        // but don't authenticate them until profile is complete
        const { data: newUser, error: newUserError } = await supabaseAdmin
          .from('custom_users')
          .insert({ 
            phone: phone, 
            phone_verified: true,
            first_name: null,  // Explicitly set to null to indicate incomplete profile
            last_name: null    // Explicitly set to null to indicate incomplete profile
          })
          .select()
          .single();
        
        if (newUserError) {
          console.error('🔍 Error creating minimal user record:', newUserError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to create user account',
            message: newUserError.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        user = newUser;
        isNewUser = true;
        console.log('🔍 Minimal user record created:', {
          id: user.id,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          phone_verified: user.phone_verified
        });
        
        // Return early for new users - don't create session yet
        return new Response(JSON.stringify({ 
          success: true, 
          otpVerified: true,
          profileComplete: false,
          user: {
            id: user.id,
            phone: user.phone,
            phone_verified: user.phone_verified,
            first_name: user.first_name,
            last_name: user.last_name
          },
          message: 'OTP verified successfully. Please complete your profile to create your account.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      console.log('🔍 Existing user found:', {
        id: user.id,
        phone: user.phone,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_verified: user.phone_verified
      });
      // Update phone_verified for existing user
      const { data: updatedUser, error: updateUserError } = await supabaseAdmin
        .from('custom_users')
        .update({ phone_verified: true })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateUserError) {
        console.error('🔍 Error updating user phone verification:', updateUserError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Failed to update user verification status',
          message: updateUserError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = updatedUser;
      console.log('🔍 User phone verified updated');
    }

    // 3. Check if profile is complete before creating session
    const isProfileComplete = user.first_name && user.last_name && user.first_name.trim() && user.last_name.trim();
    console.log('🔍 Profile completeness check:', {
      userId: user.id,
      isNewUser,
      isProfileComplete,
      firstName: user.first_name,
      lastName: user.last_name,
      mode: mode
    });

    // 4. Handle profile completion based on mode
    if (mode === 'signin') {
      // For signin mode, authenticate existing users regardless of profile completeness
      console.log('🔍 SIGNIN MODE - Authenticating existing user regardless of profile completeness');
      // Continue to session creation below
    } else if (mode === 'signup' && !isProfileComplete) {
      // For signup mode, require profile completion
      console.log('🔍 SIGNUP MODE - Profile incomplete, returning OTP verification success without session');
      return new Response(JSON.stringify({ 
        success: true, 
        otpVerified: true,
        profileComplete: false,
        user: {
          id: user.id,
          phone: user.phone,
          phone_verified: user.phone_verified,
          first_name: user.first_name,
          last_name: user.last_name
        },
        message: 'OTP verified successfully. Please complete your profile to continue.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Update last login and generate session (for both complete and incomplete profiles in signin mode)
    console.log('🔍 Updating last login and generating session');
    
    // Update last login for users
    const { data: loggedInUser, error: loginUpdateError } = await supabaseAdmin
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    
    if (loginUpdateError) {
      console.error('🔍 Error updating last login:', loginUpdateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update login status',
        message: loginUpdateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    user = loggedInUser;

    const accessToken = await generateJWT(user.id, user.phone);
    const refreshToken = crypto.randomUUID(); // Simple refresh token
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30); // 30 days

    await supabaseAdmin.from('user_sessions').insert({
      user_id: user.id,
      session_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      refresh_expires_at: new Date(refreshExpiresAt * 1000).toISOString(),
    });
    
    const session = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
    };
    
    // Determine if profile is complete for response
    const finalIsProfileComplete = user.first_name && user.last_name && user.first_name.trim() && user.last_name.trim();
    
    console.log('🔍 Session created successfully for user:', user.id, 'Profile complete:', finalIsProfileComplete);
    return new Response(JSON.stringify({ 
      success: true, 
      otpVerified: true,
      profileComplete: finalIsProfileComplete,
      user, 
      session 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
