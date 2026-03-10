# Payment Verification Fix (Order Not in Admin)

## Problem
- Payment succeeds on Razorpay
- User sees "We couldn't confirm your order automatically"
- Order doesn't appear in admin panel

## Root Causes Addressed

1. **User not in custom_users** – `payment_orders` and `rental_orders` require `user_id` FK to `custom_users`. If the user wasn't in `custom_users`, inserts failed.
2. **Amount in wrong unit** – `payment_orders` stores amount in rupees; some paths were using paise.
3. **Missing user contact in orderItems** – `userPhone` and `userEmail` were not passed through, so verification couldn't use them.

## Changes Made

### razorpay-order (Supabase Edge Function)
- Ensure user exists in `custom_users` before storing payment (upsert with `ignoreDuplicates`)
- Fix amount handling: always store rupees in DB (amount from frontend is in paise)
- Use `userPhone`/`userEmail` from `orderItems` when provided

### razorpay-verify (Supabase Edge Function)
- Return clearer error messages for debugging
- Add `code` field in error response

### PaymentFlow.tsx
- Add `userPhone` and `userEmail` to `orderItems` passed to Razorpay

### useRazorpay.ts
- Improve error logging for verification failures

## Deployment (REQUIRED – orders won't appear until you deploy)

**The payment fixes only work after deploying the Supabase Edge Functions.**

```bash
# From project root
./deploy-supabase-functions.sh
```

Or manually:

```bash
supabase functions deploy razorpay-order
supabase functions deploy razorpay-verify
```

**If you skip this step, payments will succeed on Razorpay but orders will NOT appear in the admin panel.**

## Verification

1. Run a test payment (use Razorpay test mode if available).
2. Confirm the order appears in the admin panel.
3. Check Supabase function logs for any remaining errors.
