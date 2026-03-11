#!/bin/bash
# Deploy Supabase Edge Functions required for payment flow
# Run from project root: ./deploy-supabase-functions.sh

set -e
echo "Deploying razorpay-order, razorpay-verify, razorpay-reconcile, release-abandoned-orders..."
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
supabase functions deploy razorpay-reconcile
supabase functions deploy release-abandoned-orders
echo "✅ Payment functions deployed. Test a payment to verify."
echo ""
echo "Cron (optional): Call release-abandoned-orders hourly to release unpaid orders after 25 mins."
echo "  curl -X POST 'https://<project>.supabase.co/functions/v1/release-abandoned-orders' \\"
echo "    -H 'Authorization: Bearer <anon-or-service-key>'"
