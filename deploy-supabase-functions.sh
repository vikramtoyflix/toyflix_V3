#!/bin/bash
# Deploy Supabase Edge Functions required for payment flow
# Run from project root: ./deploy-supabase-functions.sh

set -e
echo "Deploying razorpay-order and razorpay-verify..."
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
echo "✅ Payment functions deployed. Test a payment to verify."
