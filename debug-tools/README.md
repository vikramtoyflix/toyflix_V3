# Debug Tools

This folder contains debugging and testing tools that were used during development of the optimized authentication flow. These files are not part of the production application.

## Files

- `TestOTPFlow.tsx` - Debug page for testing OTP functionality
- `TestDBConnection.tsx` - Debug page for testing database connectivity  
- `DebugSpecificUser.tsx` - Debug page for testing specific user scenarios
- `test-complete-auth-flow.js` - Complete testing script for auth flow
- `test-optimized-auth-flow.js` - Testing script for optimized flow
- `deploy-auth-cleanup.js` - Deployment script for auth cleanup functionality
- `OPTIMIZED_AUTH_FLOW_DEPLOYMENT.md` - Deployment documentation

## Purpose

These tools were created to debug issues with:
- OTP verification flow
- User creation and profile completion detection
- Database connectivity to production Supabase
- Authentication state management
- Bangalore pincode validation

## Usage

These files are kept for reference and future debugging but are not included in the main application routes. 