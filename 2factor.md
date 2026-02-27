# 2Factor SMS Integration Documentation

## Overview
This document outlines the integration of 2Factor SMS service for OTP (One-Time Password) authentication in the Toy Joy Box Club application.

## Configuration
To use the 2Factor SMS service, you need to set up the following environment variable:

```
TWOFACTOR_API_KEY=your_2factor_api_key_here
```

### Getting the API Key
1. Sign up at [2Factor.in](https://2factor.in/)
2. Navigate to the dashboard
3. Copy your API key from the account settings
4. Add the API key to your environment variables

## API Endpoints

### Send OTP
**Endpoint**: `/api/sendOtp`
**Method**: POST

#### Request Parameters
- `phoneNumber` or `phone_number` (string, required): The phone number to send OTP to

#### Response Format
```json
{
  "success": true,
  "message": "OTP sent successfully via 2Factor",
  "data": {
    "phone_number": "9876543210",
    "otp_sent": true,
    "expires_in": 300,
    "provider": "2factor",
    "session_id": "session_id_from_2factor"
  }
}
```

#### Error Responses
```json
{
  "success": false,
  "message": "Failed to send OTP",
  "data": {
    "phone_number": "9876543210",
    "otp_sent": false,
    "error": "sms_failed",
    "details": "Error details from 2Factor"
  }
}
```

### Verify OTP
**Endpoint**: `/api/verifyOtp`
**Method**: POST

#### Request Parameters
- `phoneNumber` or `phone_number` (string, required): The phone number
- `otp` (string, required): The OTP received by the user

#### Response Format
```json
{
  "success": true,
  "message": "OTP verified successfully via 2Factor",
  "data": {
    "phone_number": "9876543210",
    "verified": true,
    "user_token": "2factor_9876543210_1234567890",
    "user_id": null,
    "provider": "2factor"
  }
}
```

#### Error Responses
```json
{
  "success": false,
  "message": "Invalid OTP entered",
  "data": {
    "phone_number": "9876543210",
    "verified": false,
    "error": "invalid_otp",
    "details": "Invalid OTP"
  }
}
```

## Phone Number Formatting
The API automatically formats phone numbers for 2Factor:
- Numbers with +91 prefix: Removes the +91
- Numbers with 91 prefix: Removes the 91
- 10-digit numbers: Adds 91 prefix
- Other formats: Uses as-is

## Error Handling

### Error Types
1. **service_not_configured**: 2Factor API key not set
2. **sms_failed**: 2Factor API returned an error
3. **sms_service_error**: HTTP error from 2Factor
4. **connection_error**: Failed to connect to 2Factor
5. **network_error**: Network connectivity issues
6. **service_unavailable**: 2Factor service down
7. **timeout_error**: Request timed out
8. **invalid_otp**: Invalid OTP entered
9. **otp_expired**: OTP has expired
10. **no_session**: No OTP session found
11. **max_retry**: Maximum retry attempts reached
12. **server_error**: Internal server error

### Security Considerations
- All mock/development fallbacks have been removed
- OTPs are only validated through 2Factor service
- No OTP bypass attempts are possible
- API key is securely stored in environment variables

## Testing
To test the integration:
1. Ensure the TWOFACTOR_API_KEY environment variable is set
2. Use a real phone number for testing
3. Check the logs for detailed error information
4. Verify that OTPs are sent and can be verified

## Rate Limiting
2Factor has built-in rate limiting:
- Maximum 3 OTP verification attempts per session
- Session expires after 5 minutes
- New OTP can be requested after session expiry

## Migration from Mock/Fallback
The following changes were made:
- Removed mock OTP generation in sendOtp API
- Removed fallback verification in verifyOtp API
- Integrated real 2Factor API calls
- Added comprehensive error handling
- Maintained same response formats for mobile app compatibility

## Monitoring
Monitor the following metrics:
- OTP send success rate
- OTP verification success rate
- Error types and frequencies
- Response times

## Troubleshooting
1. **OTP not received**: Check phone number format and 2Factor credits
2. **Verification failed**: Ensure OTP is entered correctly and within time limit
3. **Service errors**: Check API key configuration and 2Factor service status
4. **Network errors**: Verify internet connectivity and firewall settings