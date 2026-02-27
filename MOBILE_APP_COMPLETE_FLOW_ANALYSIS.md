# Mobile App Complete Flow - Adding Toys & Creating Orders

## 🔄 Complete User Journey

### Flow 1: NEW SUBSCRIPTION (No existing orders)

```
Step 1: User Selects Plan
📱 Screen: Member.js or ProductPage
    ↓
User clicks "Subscribe" button
    ↓
Navigation: Categories screen
Parameters: { termId, memberId }
    - termId: Age group (71=2-3y, 73=6m-2y, 74=3-4y, etc.)
    - memberId: Plan ID (8822=Trial, 7826=6Month, 7827=6MonthPRO)

─────────────────────────────────

Step 2: Select Subcategories & Toys
📱 Screen: Categories.js
    ↓
A) Fetch Subcategories:
   API: /wp-json/custom-api/v1/get-mapped-category-data?term_id=71
   Returns: [
     { term_id: 72, name: 'Educational Toys' },
     { term_id: 76, name: 'Building Blocks' },
     { term_id: 38, name: 'Puzzles & Games' },
     { term_id: 83, name: 'Outdoor Toys' }
   ]
    ↓
B) User selects subcategory (e.g., 72 = Educational)
    ↓
C) Fetch Products:
   API: /wp-json/api/v1/product-by-category?categories=71&parent_id=72
   Returns: List of toys in that age + subcategory
    ↓
D) User selects 1 toy from EACH subcategory (4 total for Trial Plan)
    ↓
E) User clicks "Continue" button

─────────────────────────────────

Step 3: handleContinue() Logic
📱 Function: Categories.js → handleContinue()
    ↓
A) Fetch existing orders:
   API: /wp-json/api/v1/get-order?token=...
   Check: processingOrders and completeOrders
    ↓
B) IF no orders exist:
   → Proceed to addToCart()
    ↓
C) IF orders exist:
   → Check 24-day restriction
   → If < 24 days, show error
   → If >= 24 days, proceed to addToCart()

─────────────────────────────────

Step 4: addToCart() Function
📱 Function: Categories.js → addToCart()
    ↓
A) Validate: All categories selected (1 toy from each)
    ↓
B) Build product array:
   ```javascript
   selectedProducts = {
     72: { id: 'toy-uuid-1', quantity: 1 },  // Educational
     76: { id: 'toy-uuid-2', quantity: 1 },  // Building
     38: { id: 'toy-uuid-3', quantity: 1 },  // Puzzles
     83: { id: 'toy-uuid-4', quantity: 1 }   // Outdoor
   }
   
   selectedProductArray = [
     { product_id: 'toy-uuid-1', quantity: 1 },
     { product_id: 'toy-uuid-2', quantity: 1 },
     { product_id: 'toy-uuid-3', quantity: 1 },
     { product_id: 'toy-uuid-4', quantity: 1 }
   ]
   
   // Add membership plan if up===1
   if (up === 1 && memberId) {
     selectedProductArray.push({
       product_id: memberId,  // Plan ID (8822, 7826, etc.)
       quantity: 1
     });
   }
   ```
    ↓
C) Call API:
   POST /wp-json/api/v1/add-to-cart/
   Body: { 
     token: 'token_...',
     products: selectedProductArray  // Array with product_id field!
   }
    ↓
D) Expected Response:
   { status: "success" }  ← Mobile checks for "success" string!
    ↓
E) On Success:
   → Navigate to CartPage
   → Pass selectedProducts

─────────────────────────────────

Step 5: Cart Page
📱 Screen: CartPage.js
    ↓
Shows selected toys in cart
User can review selections
    ↓
User clicks "Proceed to Checkout"
    ↓
Navigate to Delivery screen

─────────────────────────────────

Step 6: Delivery Address
📱 Screen: Delivery.js
    ↓
User fills delivery address
    ↓
User clicks Submit
    ↓
A) Save address:
   API: /wp-json/api/v1/update-order-address
    ↓
B) On success, navigate based on conditions:
   - IF route.params.item exists → Payment (with item)
   - ELSE IF newmemb → Payment
   - ELSE IF hasActivePlan → createOrder() then done
   - ELSE → Payment

─────────────────────────────────

Step 7: Payment
📱 Screen: Payment.js
    ↓
A) Fetch cart products:
   API: /wp-json/api/v1/cart?token=...
    ↓
B) Calculate total (with GST)
    ↓
C) User clicks "Pay with Razorpay"
    ↓
D) Call createOrder():
   POST /wp-json/api/v1/create-order
   Body: {
     token: 'token_...',
     product_id: ['uuid1', 'uuid2', 'uuid3', 'uuid4'],
     price: 1,  // Total price
     payment_id: 0  // Or Razorpay payment ID
   }
    ↓
E) Expected Response:
   { 
     status: "success",  ← Checks for this!
     order_id: 'uuid' 
   }
    ↓
F) On Success:
   → Delete cart items
   → Show "Order Placed Successfully"
   → Navigate to Home
```

---

## 🎯 Current Issues in Flow

### Issue 1: addToCart() Sending product_id (FIXED!)

**Line 416 in Categories.js:**
```javascript
{ product_id: product.id, quantity: 1 }  // Sends product_id
```

**Backend expected:**
```javascript
{ id: product.id, quantity: 1 }  // Expected id
```

**Fix (Commit 4c82ed2):** Backend now accepts both! ✅

---

### Issue 2: Response Format Mismatch

**Mobile App Checks (Line 435):**
```javascript
if (response.data.status === "success") {  // ← Expects string "success"
    navigation.navigate('CartPage');
}
```

**Backend Returns:**
```javascript
{
  status: 200,  // ← Number, not string!
  message: "..."
}
```

**Problem:** Mobile checks for `status === "success"` but backend returns `status: 200`

**CRITICAL:** add-to-cart needs to return `status: "success"` not `status: 200`!

---

## 🐛 FOUND THE REAL BUG!

**add-to-cart returns (Lines 393-423):**
```javascript
context.res = {
    status: 200,
    headers: {...},
    body: JSON.stringify({
        status: 200,  // ← WRONG! Should be "success"
        message: '...',
        data: {...}
    })
};
```

**Mobile app expects:**
```javascript
{
    status: "success",  // ← String, not number!
    order_id: "...",
    message: "..."
}
```

---

## 🔧 CRITICAL FIX NEEDED

### Update add-to-cart Success Response

**File:** `/api/add-to-cart/index.js` (Lines 393-423)

**Change:**
```javascript
// FROM:
body: JSON.stringify({
    status: 200,  // ❌
    message: 'Items added to cart successfully',
    data: {...}
})

// TO:
body: JSON.stringify({
    status: "success",  // ✅ String "success"
    message: 'Items added to cart successfully',
    data: {...}
})
```

**This is why add-to-cart still fails!** Even with field fix, response format is wrong.

---

## 📋 Complete Fix List

### Already Fixed:
1. ✅ Signup flow
2. ✅ Ride-on category
3. ✅ Create order (returns status: "success" ✅)
4. ✅ Field names (product_id accepted)
5. ✅ Orders display format

### NEEDS FIX:
6. ❌ add-to-cart response format (status: 200 → "success")

---

## 🎯 Implementation Needed

**File:** `/api/add-to-cart/index.js`

**Lines to modify:**
- Line ~397: Change `status: 200` to `status: "success"`
- Line ~405: Add `cart_id` or similar for mobile compatibility

**This will fix the "Failed to add products to cart" error!**

---

**Ready to implement this final critical fix?**

