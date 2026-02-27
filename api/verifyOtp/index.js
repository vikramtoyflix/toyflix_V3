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
        context.log('=== VerifyOTP Function Started ===');
        
        let phoneNumber = null;
        let otp = null;
        
        // Parse form data from React Native
        if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            if (req.rawBody && typeof req.rawBody === 'string') {
                const params = new URLSearchParams(req.rawBody);
                phoneNumber = params.get('phoneNumber') || params.get('phone_number');
                otp = params.get('otp');
                context.log('Parsed from rawBody:', { phoneNumber, otp });
            } else if (req.body && typeof req.body === 'string') {
                const params = new URLSearchParams(req.body);
                phoneNumber = params.get('phoneNumber') || params.get('phone_number');
                otp = params.get('otp');
                context.log('Parsed from body string:', { phoneNumber, otp });
            } else if (req.body && typeof req.body === 'object') {
                phoneNumber = req.body.phoneNumber || req.body.phone_number;
                otp = req.body.otp;
                context.log('Parsed from body object:', { phoneNumber, otp });
            }
        } else if (req.body && typeof req.body === 'object') {
            phoneNumber = req.body.phoneNumber || req.body.phone_number;
            otp = req.body.otp;
            context.log('Parsed from JSON body:', { phoneNumber, otp });
        }

        context.log('Final extracted values:', { phoneNumber, otp });

        if (!phoneNumber || !otp) {
            context.res.status = 200;
            context.res.body = {
                success: false,
                message: "Phone number and OTP are required",
                data: {
                    verified: false,
                    error: "missing_parameters",
                    debug: {
                        phoneNumber: phoneNumber,
                        otp: otp,
                        contentType: req.headers['content-type']
                    }
                }
            };
            return;
        }

        phoneNumber = decodeURIComponent(phoneNumber.trim());
        otp = otp.trim();
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        
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
                    verified: false,
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
            // Call 2Factor API to verify OTP
            context.log('Calling 2Factor API to verify OTP');
            
            const twoFactorUrl = `https://2factor.in/API/V1/${twoFactorApiKey}/SMS/VERIFY/${formattedPhone}/${otp}`;
            
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
                    // OTP verified successfully
                    context.res.status = 200;
                    context.res.body = {
                        success: true,
                        message: "OTP verified successfully via 2Factor",
                        data: {
                            phone_number: cleanPhone,
                            verified: true,
                            user_token: `2factor_${cleanPhone}_${Date.now()}`,
                            user_id: null, // Will be set by auth service
                            provider: "2factor"
                        }
                    };
                    return;
                } else if (twoFactorData.Status === "Error") {
                    // Handle specific 2Factor errors
                    let errorType = "verification_failed";
                    let errorMessage = "OTP verification failed";
                    
                    if (twoFactorData.Details.includes("Invalid OTP")) {
                        errorType = "invalid_otp";
                        errorMessage = "Invalid OTP entered";
                    } else if (twoFactorData.Details.includes("OTP Expired")) {
                        errorType = "otp_expired";
                        errorMessage = "OTP has expired";
                    } else if (twoFactorData.Details.includes("No Session Found")) {
                        errorType = "no_session";
                        errorMessage = "No OTP session found. Please request a new OTP";
                    } else if (twoFactorData.Details.includes("Max Retry reached")) {
                        errorType = "max_retry";
                        errorMessage = "Maximum retry attempts reached. Please request a new OTP";
                    }
                    
                    context.log('2Factor verification error:', twoFactorData.Details);
                    context.res.status = 200;
                    context.res.body = {
                        success: false,
                        message: errorMessage,
                        data: {
                            phone_number: cleanPhone,
                            verified: false,
                            error: errorType,
                            details: twoFactorData.Details
                        }
                    };
                    return;
                } else {
                    // Unknown response format
                    context.log('Unknown 2Factor response:', twoFactorData);
                    context.res.status = 200;
                    context.res.body = {
                        success: false,
                        message: "Unable to verify OTP",
                        data: {
                            phone_number: cleanPhone,
                            verified: false,
                            error: "unknown_response",
                            details: "Unexpected response from SMS service"
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
                    message: "SMS verification service error",
                    data: {
                        phone_number: cleanPhone,
                        verified: false,
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
            let errorMessage = "Failed to connect to SMS verification service";
            
            if (twoFactorError.message.includes('ENOTFOUND')) {
                errorType = "network_error";
                errorMessage = "Network error connecting to SMS service";
            } else if (twoFactorError.message.includes('ECONNREFUSED')) {
                errorType = "service_unavailable";
                errorMessage = "SMS verification service temporarily unavailable";
            } else if (twoFactorError.message.includes('ETIMEDOUT')) {
                errorType = "timeout_error";
                errorMessage = "SMS verification request timed out";
            }
            
            context.res.status = 200;
            context.res.body = {
                success: false,
                message: errorMessage,
                data: {
                    phone_number: cleanPhone,
                    verified: false,
                    error: errorType,
                    details: twoFactorError.message
                }
            };
        }

    } catch (error) {
        context.log('CRITICAL ERROR in verifyOtp:', error.message);
        context.log('Error stack:', error.stack);
        
        // Always return a response to prevent 500 errors
        context.res.status = 200;
        context.res.body = {
            success: false,
            message: "Internal server error",
            data: {
                verified: false,
                error: "server_error",
                details: error.message
            }
        };
    }
};