# Create Order Endpoint - Full Implementation Plan

## 🎯 Problem

**Mobile App Payment Flow:**
```
User selects toys → Add to cart → Fill delivery → Click "Pay with Razorpay"
    ↓
Calls: /wp-json/api/v1/create-order
Body: { token, product_id: [array], price, payment_id }
    ↓
Azure Function: /api/proxy/index.js → createOrderFromSupabase()
    ↓
Currently: Returns MOCK data (doesn't create real order!) ❌
```

**Result:** Order appears successful but nothing saved in database!

---

## 📊 What Mobile App Sends

**From Payment.js (Lines 227-237):**
```javascript
const paymentData = {
    token: 'token_8595968253_1763144400419',
    product_id: ['uuid1', 'uuid2', 'uuid3'],  // Array of toy IDs
    price: 1,  // Total price (often 1 rupee for testing)
    payment_id: 0  // Payment ID from Razorpay (0 if not paid yet)
};

await axios.post('https://toyflix.in/wp-json/api/v1/create-order', paymentData);
```

**Expected Response:**
```javascript
{
    status: 'success',  // ← Mobile app checks this!
    order_id: 'uuid',
    message: 'Order created successfully'
}
```

---

## 🔍 Current Implementation (MOCK)

**File:** `/api/proxy/index.js` (Lines 1268-1329)

```javascript
async function createOrderFromSupabase(body, query, method, context) {
    // ... token validation ...
    
    // For now, return a mock successful order creation ❌
    const orderId = `order_${Date.now()}`;
    return {
        status: 200,  // ← Wrong format! Mobile needs 'success'
        message: 'Order created successfully',
        data: { order_id: orderId }
    };
}
```

**Problems:**
1. ❌ Returns status: 200 (mobile expects status: 'success')
2. ❌ Doesn't actually create order in database
3. ❌ Doesn't validate product IDs
4. ❌ Doesn't create order items
5. ❌ Mock order ID not real UUID

---

## ✅ Reference Implementation: add-to-cart

**File:** `/api/add-to-cart/index.js` (Lines 266-442)

This endpoint DOES create real orders! We can copy its logic:

```javascript
// 1. Validate user (✅)
// 2. Validate products exist (✅)
// 3. Check subscription limits (✅)
// 4. Create rental_order (✅)
// 5. Create rental_order_items (✅)
// 6. Update toy inventory (✅)
```

---

## 🔧 Implementation Plan

### Replace createOrderFromSupabase() in proxy/index.js

**Current (Lines 1268-1329):** Mock implementation  
**New:** Real database integration (similar to add-to-cart)

### New Implementation:

```javascript
async function createOrderFromSupabase(body, query, method, context) {
    try {
        context.log('📦 CREATE ORDER: Processing real order creation');
        
        const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
        
        // Extract parameters from body
        const token = body?.token || query?.token;
        const product_ids = body?.product_id || body?.product_ids || body?.items;
        const price = body?.price || 0;
        const payment_id = body?.payment_id || null;
        
        context.log('📦 Request params:', {
            has_token: !!token,
            product_ids: product_ids,
            price: price,
            payment_id: payment_id
        });
        
        // Validate token
        if (!token) {
            return {
                status: 'error',
                message: 'Authentication token required',
                order_id: null
            };
        }
        
        // Validate product_ids
        if (!product_ids || (Array.isArray(product_ids) && product_ids.length === 0)) {
            return {
                status: 'error',
                message: 'Product IDs are required',
                order_id: null
            };
        }
        
        // Ensure product_ids is an array
        const productIdsArray = Array.isArray(product_ids) ? product_ids : [product_ids];
        
        context.log('📦 Product IDs to order:', productIdsArray);
        
        // Find user by token
        let phoneNumber = token;
        const tokenMatch = token.match(/^token_(\d+)_\d+$/);
        if (tokenMatch) {
            phoneNumber = tokenMatch[1];
        }
        
        // Try multiple phone formats
        let user = null;
        const phoneFormats = [
            phoneNumber,
            phoneNumber.replace(/^\+91/, ''),
            `+91${phoneNumber.replace(/^\+?91/, '')}`,
        ];
        
        for (const phoneFormat of phoneFormats) {
            const response = await fetch(
                `${supabaseUrl}/rest/v1/custom_users?phone=eq.${encodeURIComponent(phoneFormat)}&select=*`,
                {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.ok) {
                const users = await response.json();
                if (users && users.length > 0) {
                    user = users[0];
                    break;
                }
            }
        }
        
        if (!user) {
            context.log('❌ User not found for token:', token);
            return {
                status: 'error',
                message: 'Invalid token - user not found',
                order_id: null
            };
        }
        
        context.log('✅ User found:', user.id);
        
        // Validate products exist
        const productsResponse = await fetch(
            `${supabaseUrl}/rest/v1/toys?id=in.(${productIdsArray.join(',')})&select=id,name,available_quantity`,
            {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!productsResponse.ok) {
            context.log('❌ Failed to validate products');
            return {
                status: 'error',
                message: 'Failed to validate products',
                order_id: null
            };
        }
        
        const products = await productsResponse.json();
        
        if (!products || products.length === 0) {
            context.log('❌ No valid products found:', productIdsArray);
            return {
                status: 'error',
                message: 'Invalid product IDs - products not found in database',
                order_id: null,
                debug: {
                    requested: productIdsArray,
                    found: 0
                }
            };
        }
        
        context.log('✅ Products validated:', products.length);
        
        // Create rental order
        const orderData = {
            user_id: user.id,
            status: 'pending',
            order_type: 'subscription',
            subscription_plan: user.subscription_plan || 'basic',
            total_amount: price || 0,
            base_amount: price || 0,
            gst_amount: 0,
            payment_status: payment_id ? 'completed' : 'pending',
            payment_method: payment_id ? 'razorpay' : null,
            razorpay_payment_id: payment_id || null,
            toys_data: products.map(p => ({
                toy_id: p.id,
                name: p.name,
                quantity: 1,
                unit_price: 0,
                total_price: 0,
                returned: false
            })),
            created_at: new Date().toISOString()
        };
        
        context.log('📦 Creating order:', orderData);
        
        const createOrderResponse = await fetch(
            `${supabaseUrl}/rest/v1/rental_orders`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(orderData)
            }
        );
        
        if (!createOrderResponse.ok) {
            const errorText = await createOrderResponse.text();
            context.log('❌ Failed to create order:', errorText);
            return {
                status: 'error',
                message: 'Failed to create order in database',
                order_id: null
            };
        }
        
        const createdOrders = await createOrderResponse.json();
        const createdOrder = createdOrders[0];
        
        context.log('✅ Order created successfully:', createdOrder.id);
        
        // Return format mobile app expects
        return {
            status: 'success',  // ← Mobile app checks for 'success'!
            order_id: createdOrder.id,
            message: 'Order created successfully',
            data: {
                order_id: createdOrder.id,
                order_number: createdOrder.order_number,
                total_items: products.length,
                total_amount: price,
                order_status: createdOrder.status,
                created_at: createdOrder.created_at
            }
        };
        
    } catch (error) {
        context.log('❌ Error in createOrderFromSupabase:', error);
        return {
            status: 'error',
            message: error.message || 'Internal server error',
            order_id: null
        };
    }
}
```

---

## 🎯 Key Changes

### 1. Real Database Integration ✅
- Creates actual order in `rental_orders` table
- Stores product IDs in `toys_data` JSONB field
- Generates real UUID order_id

### 2. Proper Response Format ✅
```javascript
// Mobile app expects:
{
    status: 'success',  // ← Not status: 200!
    order_id: 'real-uuid'
}
```

### 3. Product Validation ✅
- Validates product IDs exist in database
- Returns helpful error if not found

### 4. User Validation ✅
- Extracts phone from token
- Finds user in custom_users
- Validates user exists

---

## 📋 Files to Modify

1. **/api/proxy/index.js** - Replace createOrderFromSupabase() function (lines 1268-1329)

**Lines to Replace:** ~60 lines  
**New Implementation:** ~180 lines  
**Net Change:** +120 lines

---

## 🧪 Testing After Implementation

### Test Flow:
1. Mobile app → Select toys
2. Add to cart
3. Go to delivery
4. Click "Pay with Razorpay"
5. **Check:** Order created in database
6. **Check:** rental_orders table has new entry
7. **Check:** Order ID is real UUID
8. **Check:** toys_data contains selected toys

### Azure Logs to Check:
```
📦 CREATE ORDER: Processing real order creation
📦 Request params: {product_ids: [...]}
✅ User found: user-uuid
✅ Products validated: 3
📦 Creating order: {...}
✅ Order created successfully: order-uuid
```

---

## ⚡ Implementation Ready

**Files:** 1 file  
**Risk:** Low (isolated function)  
**Testing:** Easy (mobile app payment flow)  
**Impact:** HIGH (fixes payment/order creation!)

**Ready to implement?**

