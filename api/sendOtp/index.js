module.exports = async function (context, req) {
    // Set CORS headers
    context.res = {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
            "Content-Type": "application/json"
        }
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        context.log('=== SendOTP Function Started ===');
        
        let phoneNumber = null;
        
        // Parse form data from React Native
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            if (req.rawBody && typeof req.rawBody === 'string') {
                const params = new URLSearchParams(req.rawBody);
                phoneNumber = params.get('phoneNumber') || params.get('phone_number');
                context.log('Parsed from rawBody:', phoneNumber);
            } else if (req.body && typeof req.body === 'string') {
                const params = new URLSearchParams(req.body);
                phoneNumber = params.get('phoneNumber') || params.get('phone_number');
                context.log('Parsed from body string:', phoneNumber);
            } else if (req.body && typeof req.body === 'object') {
                phoneNumber = req.body.phoneNumber || req.body.phone_number;
                context.log('Parsed from body object:', phoneNumber);
            }
        } else if (req.body && typeof req.body === 'object') {
            phoneNumber = req.body.phoneNumber || req.body.phone_number;
            context.log('Parsed from JSON body:', phoneNumber);
        }

        if (!phoneNumber || phoneNumber.trim() === '') {
            context.log('ERROR: Phone number missing');
            context.res.status = 200;
            context.res.body = {
                success: false,
                message: "Phone number is required",
                data: {
                    phone_number: null,
                    otp_sent: false,
                    error: "missing_phone"
                }
            };
            return;
        }

        phoneNumber = decodeURIComponent(phoneNumber.trim());
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        context.log(`Processing OTP for clean phone: ${cleanPhone}`);

        // Get 2Factor API key from environment variables
        const twoFactorApiKey = process.env.TWOFACTOR_API_KEY;
        
        if (!twoFactorApiKey) {
            context.log('ERROR: 2Factor API key not configured');
            context.res.status = 200;
            context.res.body = {
                success: false,
                message: "SMS service not configured",
                data: {
                    phone_number: cleanPhone,
                    otp_sent: false,
                    error: "service_not_configured"
                }
            };
            return;
        }

        // Format phone number for 2Factor (should be in format: 91XXXXXXXXXX)
        const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber.substring(3) : 
                              phoneNumber.startsWith('91') ? phoneNumber.substring(2) : 
                              cleanPhone.length === 10 ? `91${cleanPhone}` : 
                              cleanPhone;

        context.log('Formatted phone for 2Factor:', formattedPhone);
        context.log('2Factor API Key exists:', !!twoFactorApiKey);

        try {
            // Call 2Factor API to send OTP
            context.log('Calling 2Factor API to send OTP');
            
            const twoFactorUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/${formattedPhone}/AUTOGEN`;
            
            const twoFactorResponse = await fetch(twoFactorUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            context.log('2Factor response status:', twoFactorResponse.status);
            
            if (twoFactorResponse.ok) {
                const twoFactorData = await twoFactorResponse.json();
                context.log('2Factor response data:', JSON.stringify(twoFactorData));

                if (twoFactorData.Status === "Success") {
                    // Store the session ID for verification later
                    const sessionId = twoFactorData.Details;
                    
                    context.res.status = 200;
                    context.res.body = {
                        success: true,
                        message: "OTP sent successfully via 2Factor",
                        data: {
                            phone_number: cleanPhone,
                            otp_sent: true,
                            expires_in: 300,
                            provider: "2factor",
                            session_id: sessionId
                        }
                    };
                    return;
                } else {
                    // Handle 2Factor API errors
                    context.log('2Factor API error:', twoFactorData.Details);
                    context.res.status = 200;
                    context.res.body = {
                        success: false,
                        message: "Failed to send OTP",
                        data: {
                            phone_number: cleanPhone,
                            otp_sent: false,
                            error: "sms_failed",
                            details: twoFactorData.Details || "Unknown error"
                        }
                    };
                    return;
                }
            } else {
                // Handle HTTP errors from 2Factor
                const errorText = await twoFactorResponse.text();
                context.log('2Factor HTTP error:', twoFactorResponse.status, errorText);
                
                context.res.status = 200;
                context.res.body = {
                    success: false,
                    message: "SMS service error",
                    data: {
                        phone_number: cleanPhone,
                        otp_sent: false,
                        error: "sms_service_error",
                        details: `HTTP ${twoFactorResponse.status}: ${errorText}`
                    }
                };
                return;
            }
            
        } catch (twoFactorError) {
            context.log('2Factor API call failed:', twoFactorError.message);
            context.log('Error stack:', twoFactorError.stack);
            
            // Determine error type
            let errorType = "connection_error";
            let errorMessage = "Failed to connect to SMS service";
            
            if (twoFactorError.message.includes('ENOTFOUND')) {
                errorType = "network_error";
                errorMessage = "Network error connecting to SMS service";
            } else if (twoFactorError.message.includes('ECONNREFUSED')) {
                errorType = "service_unavailable";
                errorMessage = "SMS service temporarily unavailable";
            } else if (twoFactorError.message.includes('ETIMEDOUT')) {
                errorType = "timeout_error";
                errorMessage = "SMS service request timed out";
            }
            
            context.res.status = 200;
            context.res.body = {
                success: false,
                message: errorMessage,
                data: {
                    phone_number: cleanPhone,
                    otp_sent: false,
                    error: errorType,
                    details: twoFactorError.message
                }
            };
        }

    } catch (error) {
        context.log('CRITICAL ERROR in sendOtp:', error.message);
        context.log('Error stack:', error.stack);
        
        // Always return a response to prevent 500 errors
        context.res.status = 200;
        context.res.body = {
            success: false,
            message: "Internal server error",
            data: {
                otp_sent: false,
                error: "server_error",
                details: error.message
            }
        };
    }
};