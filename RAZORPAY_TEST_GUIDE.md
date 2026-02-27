# 🧪 Razorpay Testing Guide with ONERUPEE Coupon

## **🎯 Test Coupon Code: `ONERUPEE`**

### **What it does:**
- Reduces the total amount to exactly **₹1** (100 paise)
- Perfect for testing Razorpay payment flow without spending much money
- Meets Razorpay's minimum payment requirement of ₹1

---

## **🚀 How to Test the Complete Payment Flow**

### **Step 1: Access Your App**
1. Open your browser and go to: `http://localhost:8082/`
2. Sign in with your phone number
3. Navigate to the subscription page

### **Step 2: Apply the Test Coupon**
1. Select any subscription plan (Discovery Delight, Silver Pack, etc.)
2. Choose your age group and toys
3. In the **"Coupon Code"** section, enter: `ONERUPEE`
4. Click **"Apply"**
5. ✅ You should see: **"Test coupon applied! Total is now ₹1 for Razorpay testing!"**

### **Step 3: Verify the Amount**
- **Payment Breakdown** should show:
  - Plan Amount: ₹[original amount]
  - GST (18%): ₹[gst amount]
  - Subtotal: ₹[subtotal]
  - **Coupon Discount (ONERUPEE)**: -₹[discount amount]
  - **Total Amount**: **₹1** ✅

### **Step 4: Test Razorpay Payment**
1. Click **"Pay Now"** button
2. Razorpay modal should open with **₹1.00** as the amount
3. Use Razorpay test card details for testing:
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
4. Complete the payment

### **Step 5: Verify Success**
1. Payment should complete successfully
2. You should see: **"Payment Successful! 🎉"**
3. Check your dashboard - new subscription should appear
4. Check the `subscription_tracking` table in Supabase

---

## **🔧 Available Test Coupons**

| Coupon Code | Effect | Use Case |
|-------------|---------|----------|
| `ONERUPEE` | Makes total exactly ₹1 | **Razorpay testing** |
| `FREECODE` | Makes order FREE (₹0) | Free order testing |
| `TESTFREE` | Makes order FREE (₹0) | Free order testing |
| `QA2025` | Makes order FREE (₹0) | QA testing |
| `TEST50` | 50% discount | Percentage discount testing |
| `TEST200` | ₹200 off | Fixed amount discount testing |

---

## **🎯 Testing Scenarios**

### **Scenario 1: Minimum Payment Test**
- **Coupon**: `ONERUPEE`
- **Expected**: Total becomes ₹1, Razorpay payment succeeds
- **Purpose**: Test minimum payment amount handling

### **Scenario 2: Free Order Test**  
- **Coupon**: `FREECODE`
- **Expected**: Total becomes ₹0, no Razorpay payment required
- **Purpose**: Test free order flow

### **Scenario 3: Partial Discount Test**
- **Coupon**: `TEST50` or `TEST200`
- **Expected**: Partial discount applied, normal payment flow
- **Purpose**: Test discount calculations

---

## **📊 Verification Steps**

### **After Payment Completion:**

1. **Check Supabase Tables:**
   ```sql
   -- Check payment tracking
   SELECT * FROM payment_tracking WHERE user_id = '[your-user-id]' ORDER BY created_at DESC LIMIT 5;
   
   -- Check subscription tracking  
   SELECT * FROM subscription_tracking WHERE user_id = '[your-user-id]' ORDER BY created_at DESC LIMIT 5;
   
   -- Check entitlements tracking
   SELECT * FROM entitlements_tracking WHERE user_id = '[your-user-id]' ORDER BY created_at DESC LIMIT 5;
   ```

2. **Check Dashboard:**
   - New subscription should appear
   - Entitlements should be updated
   - Order history should show the new order

3. **Check Razorpay Dashboard:**
   - Payment of ₹1.00 should appear
   - Status should be "Captured"
   - Test payment should be marked as successful

---

## **🐛 Troubleshooting**

### **If coupon doesn't apply:**
- Make sure you're entering exactly: `ONERUPEE` (case insensitive)
- Refresh the page and try again
- Check browser console for errors

### **If payment fails:**
- Verify Razorpay test credentials are set in Supabase secrets
- Check that the amount is exactly ₹1 (100 paise)
- Try using different test card numbers

### **If order doesn't appear:**
- Check Supabase logs for any database errors
- Verify that the payment verification webhook completed
- Check the `subscription_tracking` table directly

---

## **✅ Success Criteria**

Your test is successful when:
1. ✅ ONERUPEE coupon reduces total to ₹1
2. ✅ Razorpay payment modal opens with ₹1.00
3. ✅ Test payment completes successfully
4. ✅ Subscription appears in dashboard
5. ✅ Database tables are updated correctly

---

**🎉 Happy Testing!** 

The ONERUPEE coupon makes Razorpay testing affordable and realistic while testing the complete payment flow. 