# Razorpay Payment Capture Testing Guide

## Overview
This guide helps verify that Razorpay Order IDs and Payment IDs are being properly captured in the admin panel.

## Recent Fixes Applied

### 1. Edge Function Updates
- **razorpay-order function**: Now stores payment data in `payment_orders` table (primary) with fallback to `payment_tracking`
- **razorpay-verify function**: Updated to check both tables and properly store payment IDs after verification

### 2. Admin Panel Enhancement
- **ComprehensiveOrderDetails.tsx**: Now fetches payment data from both `payment_orders` and `payment_tracking` tables
- Enhanced UI to display Razorpay Order ID and Payment ID with copy-to-clipboard functionality

### 3. Database Structure
- Primary payment storage: `payment_orders` table
- Backup payment storage: `payment_tracking` table
- Both tables now capture `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`

### 4. Shipping Address Standardization
- **PaymentFlow.tsx**: Collects address in frontend format (`zip_code`, `apartment`)
- **Address Standardization**: Automatically converts to backend format (`postcode`, `address_line2`)
- **Complete Customer Data**: Includes customer name, phone, email from profile
- **Orders Table**: Stores standardized address as JSON for admin panel display

## Testing Steps

### Step 1: Verify Website is Running
```bash
npm run dev
```
- Check that the website loads at http://localhost:8089 (or similar port)
- Ensure admin panel is accessible

### Step 2: Process a Test Payment
1. **Register a new user** or use existing credentials
2. **Navigate to subscription page**
3. **Select a subscription plan** (monthly, quarterly, etc.)
4. **Proceed to payment**
5. **Use Razorpay test credentials**:
   - Test Card: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: Any 3 digits
   - Name: Any name

### Step 3: Verify Payment Capture
1. **Check browser console** for payment logs:
   - Look for "Payment successful, verifying..." messages
   - Check for Razorpay response with order_id and payment_id

2. **Check admin panel**:
   - Navigate to admin orders section
   - Open comprehensive order details for the new order
   - Verify the following are displayed:
     - ✅ Razorpay Order ID (format: order_XXXXXXXXXXXXX)
     - ✅ Razorpay Payment ID (format: pay_XXXXXXXXXXXXX)
     - ✅ Payment Status (should show "completed")
     - ✅ Complete shipping address with customer name, phone, email
     - ✅ Properly formatted address fields (address_line1, address_line2, city, state, postcode)

### Step 4: Database Verification
Run the test script to check database:
```bash
node scripts/test-razorpay-payment-capture.js
```

Expected output should show:
- Payment Orders: > 0
- Order IDs captured: ✅ YES
- Payment IDs captured: ✅ YES

## Troubleshooting

### Issue: Payment IDs Not Showing
**Possible causes:**
1. Edge functions not deploying properly
2. Database connection issues
3. Razorpay credentials not configured

**Solutions:**
1. Check Supabase Edge Function logs
2. Verify environment variables in Supabase dashboard
3. Redeploy edge functions

### Issue: Admin Panel Shows "Not completed"
**Possible causes:**
1. Payment verification failed
2. Database write permissions
3. Table schema mismatch

**Solutions:**
1. Check browser network tab for failed requests
2. Verify RLS policies on payment tables
3. Check table schemas match expected structure

### Issue: Orders Not Appearing in Admin
**Possible causes:**
1. Order creation failed after payment
2. User ID mismatch
3. Admin query filtering issues

**Solutions:**
1. Check comprehensive order details component logs
2. Verify user authentication flow
3. Check order creation in razorpay-verify function

## Expected Data Flow

### 1. Payment Initiation
```
Frontend → razorpay-order function → payment_orders table
```
- Creates Razorpay order
- Stores order data with `razorpay_order_id`
- Status: "created"

### 2. Payment Completion
```
Razorpay → Frontend → razorpay-verify function → payment_orders table
```
- Verifies payment signature
- Updates record with `razorpay_payment_id`
- Status: "completed"

### 3. Admin Display
```
Admin Panel → ComprehensiveOrderDetails → payment_orders/payment_tracking tables
```
- Fetches payment data for order
- Displays Razorpay IDs in UI
- Shows payment verification status

## Success Criteria

✅ **Payment Order ID captured**: Visible in admin panel  
✅ **Payment ID captured**: Visible in admin panel after payment completion  
✅ **Payment status accurate**: Shows "completed" for successful payments  
✅ **Copy functionality works**: Can copy payment IDs to clipboard  
✅ **Data consistency**: Same data across database and admin panel  

## Test Scenarios

### Scenario 1: Successful Payment
1. Complete payment flow
2. Verify both IDs captured
3. Check payment status = "completed"

### Scenario 2: Failed Payment
1. Cancel payment or use invalid card
2. Verify order ID captured but no payment ID
3. Check payment status = "created" or "failed"

### Scenario 3: Multiple Payments
1. Process multiple payments
2. Verify each payment has unique IDs
3. Check admin panel shows all payments correctly

## Monitoring

### Real-time Monitoring
- Browser console logs during payment
- Network tab for API calls
- Supabase Edge Function logs

### Post-payment Verification
- Admin panel comprehensive view
- Database queries for payment data
- User subscription status updates

## Contact Information
If issues persist after following this guide:
1. Check Supabase Edge Function logs
2. Verify Razorpay dashboard for payment records
3. Review browser console for JavaScript errors
4. Test with different browsers/devices 