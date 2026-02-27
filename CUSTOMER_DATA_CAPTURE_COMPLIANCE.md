# CUSTOMER DATA CAPTURE COMPLIANCE GUIDE

## 🎯 **CRITICAL REQUIREMENT**
**ALL customer journey data MUST be captured and tracked consistently. This is how we track customers and ensure business compliance.**

---

## 📋 **MANDATORY DATA CAPTURE POINTS**

### **1. CUSTOMER REGISTRATION** ✅
**Location**: `SignupFirstAuth.tsx`, `ProfileForm.tsx`
**Required Fields**:
- ✅ Phone number (primary identifier)
- ✅ First name, Last name
- ✅ Email address
- ✅ Phone verification status
- ✅ Registration timestamp

**Storage**: `custom_users` table

### **2. ADDRESS COLLECTION** ✅
**Location**: `PaymentFlow.tsx` - Address form
**Required Fields**:
- ✅ First name, Last name (delivery recipient)
- ✅ Street address (address_line1)
- ✅ Apartment/Suite (address_line2)
- ✅ City, State, PIN code
- ✅ Country (default: India)
- ✅ GPS coordinates (latitude, longitude)
- ✅ Plus code (auto-generated)
- ✅ Delivery instructions

**Storage**: `orders.shipping_address` (JSONB)

### **3. PAYMENT PROCESSING** ✅
**Location**: `razorpay-order` → `razorpay-verify` functions
**Required Fields**:
- ✅ Razorpay order ID
- ✅ Razorpay payment ID
- ✅ Payment signature
- ✅ Payment amount (base + GST)
- ✅ Payment currency
- ✅ Payment status
- ✅ Payment timestamps

**Storage**: 
- Primary: `payment_orders` table
- Backup: `payment_tracking` table
- Verification: `subscription_tracking` table

### **4. ORDER CREATION** ✅
**Location**: `orderService.ts`, `razorpay-verify` function
**Required Fields**:
- ✅ User ID (foreign key)
- ✅ Order status progression
- ✅ Total amount breakdown
- ✅ Coupon codes applied
- ✅ Order type (subscription/ride_on)
- ✅ Rental dates
- ✅ Order timestamps (created, confirmed, shipped, delivered)

**Storage**: `orders` table

### **5. SUBSCRIPTION TRACKING** ✅
**Location**: `razorpay-verify` function
**Required Fields**:
- ✅ Subscription plan details
- ✅ Start and end dates
- ✅ Payment verification
- ✅ Selected toys/preferences
- ✅ Age group
- ✅ Subscription status

**Storage**: `subscription_tracking` table

---

## 🔄 **DATA FLOW VERIFICATION**

### **Customer Journey Tracking Flow**:

```
1. REGISTRATION
   ↓
   SignupFirstAuth.tsx → custom_users table
   
2. PROFILE COMPLETION
   ↓
   ProfileForm.tsx → custom_users table (update)
   
3. PLAN SELECTION
   ↓
   PaymentFlow.tsx → Local state
   
4. ADDRESS CAPTURE
   ↓
   PaymentFlow.tsx → standardizeShippingAddress()
   
5. PAYMENT INITIATION
   ↓
   useRazorpay.ts → razorpay-order function → payment_orders/payment_tracking
   
6. PAYMENT COMPLETION
   ↓
   razorpay-verify function → subscription_tracking + orders table
   
7. ADMIN VISIBILITY
   ↓
   ComprehensiveOrderDetails.tsx → Displays ALL captured data
```

---

## 📊 **COMPREHENSIVE VIEW REQUIREMENTS**

### **MUST DISPLAY ALL CAPTURED DATA**:

#### **Customer Information** ✅
- Full name, phone, email
- Registration date
- Phone verification status
- Subscription status

#### **Shipping Address** ✅
- Complete delivery address
- GPS coordinates
- Plus code
- Delivery instructions

#### **Payment Details** ✅
- Razorpay order ID
- Razorpay payment ID
- Payment amount and currency
- Payment status and timestamps

#### **Order Information** ✅
- Order status progression
- Selected toys/items
- Subscription details
- Order timeline

#### **Subscription Data** ✅
- Plan type and duration
- Start and end dates
- Payment verification
- Active status

---

## 🚨 **COMPLIANCE CHECKS**

### **Mandatory Verification Points**:

1. **Registration Data** - Every user MUST have:
   - Phone number (verified)
   - Name and email
   - Registration timestamp

2. **Address Data** - Every order MUST have:
   - Complete shipping address
   - GPS coordinates when available
   - Plus code for precise delivery

3. **Payment Data** - Every transaction MUST have:
   - Razorpay order and payment IDs
   - Payment verification signature
   - Complete amount breakdown

4. **Order Data** - Every order MUST have:
   - User association
   - Status timestamps
   - Complete item details

5. **Admin Visibility** - Comprehensive view MUST show:
   - ALL captured customer data
   - Complete payment information
   - Full order timeline

---

## 🔧 **CURRENT IMPLEMENTATION STATUS**

### **✅ COMPLIANT COMPONENTS**:
- ✅ `SignupFirstAuth.tsx` - Customer registration
- ✅ `PaymentFlow.tsx` - Address and payment capture
- ✅ `razorpay-order` function - Payment initiation
- ✅ `razorpay-verify` function - Payment verification
- ✅ `ComprehensiveOrderDetails.tsx` - Admin visibility

### **✅ VERIFIED DATA TABLES**:
- ✅ `custom_users` - Customer profiles
- ✅ `orders` - Order records with shipping addresses
- ✅ `payment_tracking` - Payment data (13 records)
- ✅ `subscription_tracking` - Subscription data (9 records)
- ✅ `order_items` - Item details

---

## 🎯 **STRICT COMPLIANCE REQUIREMENTS**

### **NON-NEGOTIABLE RULES**:

1. **NO DATA LOSS** - Every customer interaction MUST be captured
2. **COMPLETE TRACKING** - Full journey from registration to delivery
3. **PAYMENT VERIFICATION** - ALL Razorpay details MUST be stored
4. **ADMIN VISIBILITY** - Complete data MUST be visible in comprehensive view
5. **AUDIT TRAIL** - Every order MUST have complete timestamp progression

### **FAILURE POINTS TO MONITOR**:
- ❌ Missing payment IDs in comprehensive view
- ❌ Incomplete shipping addresses
- ❌ Missing customer registration data
- ❌ Broken payment verification flow
- ❌ Incomplete order status tracking

---

## 🚀 **VERIFICATION COMMANDS**

### **Check Customer Data Capture**:
```bash
# Verify customer registration data
SELECT count(*) FROM custom_users WHERE phone IS NOT NULL;

# Verify payment data capture
SELECT count(*) FROM payment_tracking WHERE razorpay_payment_id IS NOT NULL;

# Verify subscription tracking
SELECT count(*) FROM subscription_tracking WHERE status = 'active';

# Verify order completeness
SELECT count(*) FROM orders WHERE shipping_address IS NOT NULL;
```

---

## 📈 **SUCCESS METRICS**

### **100% Data Capture Rate Required**:
- ✅ Customer registration: 100% complete profiles
- ✅ Address capture: 100% orders with shipping addresses
- ✅ Payment tracking: 100% payments with Razorpay IDs
- ✅ Order tracking: 100% orders with status progression
- ✅ Admin visibility: 100% data visible in comprehensive view

---

**⚠️ CRITICAL**: Any deviation from this data capture process compromises customer tracking and business operations. ALL components MUST maintain strict compliance with these requirements. 