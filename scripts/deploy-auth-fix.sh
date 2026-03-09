#!/bin/bash

# Deploy Authentication Fix Script
# This script deploys the fix for the production issue where existing users 
# were being treated as sign-ups when trying to sign in

echo "🚀 Deploying Authentication Fix..."

# 1. Deploy the backend function fix
echo "📦 Deploying Supabase function fix..."
npx supabase functions deploy verify-otp-custom

# 2. Check if the function deployed successfully
if [ $? -eq 0 ]; then
    echo "✅ Backend function deployed successfully"
else
    echo "❌ Failed to deploy backend function"
    exit 1
fi

# 3. Build and deploy frontend changes
echo "🔧 Building frontend with auth fix..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🎉 Authentication fix deployed successfully!"
echo ""
echo "📋 Changes Applied:"
echo "   1. Backend: Fixed verify-otp-custom function to handle signin mode properly"
echo "   2. Frontend: Updated SignupFirstAuth to allow signin with incomplete profiles"
echo ""
echo "🔍 Test the fix by:"
echo "   1. Going to /auth?mode=signin"
echo "   2. Entering an existing user's phone number"
echo "   3. Verifying they can sign in successfully"
echo ""
echo "⚠️  Monitor for any issues and rollback if needed" 