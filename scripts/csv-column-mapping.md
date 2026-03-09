# CSV to rental_orders Table Column Mapping

## 📊 **Direct Column Mappings**

| CSV Column | rental_orders Column | Transformation | Example |
|------------|---------------------|----------------|---------|
| `order_id` | `order_number` | `"WC-" + order_id` | `9205` → `"WC-9205"` |
| `order_date` | `created_at` | Direct copy | `"2024-04-10 13:02:53"` |
| `order_date` | `legacy_created_at` | Direct copy | `"2024-04-10 13:02:53"` |
| `order_status` | `status` | Status mapping | `"wc-pic-completed"` → `"delivered"` |
| `order_total` | `total_amount` | Parse to float | `"8258.82"` → `8258.82` |
| `payment_method` | `payment_method` | Direct copy | `"razorpay"` |
| `transaction_id` | `razorpay_payment_id` | Direct copy | `"pay_Nwq6S9AoU6sIKA"` |
| `date_paid` | Payment status logic | If exists → `"paid"` | `"2024-04-10 13:07:11"` → `"paid"` |
| `subscription_name` | `subscription_plan` | Plan name mapping | `"6 Month Plan PRO"` → `"Gold Pack PRO"` |
| `subscription_months` | Duration calculation | For rental end date | `"6"` → 6 months added |
| `first_purchase_date` | `rental_start_date` | Direct copy | `"2024-04-10"` |
| `delivery_completed_date` | `delivered_at` | Direct copy | `"2024-06-10"` |
| `estimated_delivery_date` | Reference only | For delivery planning | `"2024-06-10"` |

## 👤 **User Data Mappings**

| CSV Column | rental_orders Column | Transformation | Example |
|------------|---------------------|----------------|---------|
| `user_id` | Via phone lookup | Map to Supabase user_id | WC user `21` → Supabase UUID |
| `phone_numbers` | `user_phone` | Parse phone format | `"0: 9407756401; 1: 9407756401"` → `"9407756401"` |
| `first_name` | `shipping_address.firstName` | Extract from user data | `"Neha"` |
| `last_name` | `shipping_address.lastName` | Extract from user data | `"Mishra"` |
| `email` | `shipping_address.email` | Direct copy | `"nehamishraraipur@gmail.com"` |

## 🏠 **Address Mappings**

| CSV Column | rental_orders Column | Transformation | Example |
|------------|---------------------|----------------|---------|
| `billing_address` | `shipping_address` | Parse structured format | Parse key:value pairs |
| `shipping_address` | `shipping_address` | Parse structured format | `"city: Bengaluru; state: KA; ..."` |

### Address Parsing Example:
```
CSV: "city: Bengaluru; email: neha@gmail.com; phone: +919407756401; state: KA; country: IN; postcode: 560037; address_1: 159/178 R K Brindavan, room 305, challaghatta; last_name: Mishra; first_name: Neha"

→ 

rental_orders.shipping_address: {
  "firstName": "Neha",
  "lastName": "Mishra", 
  "email": "neha@gmail.com",
  "phone": "+919407756401",
  "address1": "159/178 R K Brindavan, room 305, challaghatta",
  "city": "Bengaluru",
  "state": "KA",
  "country": "IN",
  "postalCode": "560037",
  "addressType": "home"
}
```

## 🧸 **Product/Toys Data Mappings**

| CSV Columns | rental_orders Column | Transformation | Example |
|-------------|---------------------|----------------|---------|
| `product_id` | `toys_data[].id` | Direct copy | `"7652"` |
| `product_name` | `toys_data[].name` | Direct copy | `"Rocking Horse"` |
| `quantity` | `toys_data[].quantity` | Parse to int | `"1"` → `1` |
| `line_total` | `toys_data[].price` | Parse to float | `"0.00"` → `0` |

### Toys Data Processing:
- **Filter out subscription plans**: Skip products with names containing "Month Plan"
- **Deduplicate**: Remove duplicate product_id + product_name combinations
- **Categorize**: Auto-categorize toys (books, vehicles, educational, etc.)
- **Age groups**: Smart age detection from toy names

```javascript
// Example transformation:
CSV Rows:
- product_name: "6 Month Plan PRO" → SKIP (subscription plan)
- product_name: "Rocking Horse" → Include in toys_data
- product_name: "Jungle Animals Book" → Include in toys_data

Result toys_data: [
  {
    "id": "7652",
    "name": "Rocking Horse", 
    "category": "vehicles",
    "ageGroup": "mixed",
    "quantity": 1,
    "price": 0
  },
  {
    "id": "7824",
    "name": "Jungle Animals Book",
    "category": "books", 
    "ageGroup": "mixed",
    "quantity": 1,
    "price": 0
  }
]
```

## 📋 **Subscription Plan Mappings**

| CSV Value | rental_orders Value | Details |
|-----------|-------------------|---------|
| `"Trial Plan"` | `"Discovery Delight"` | Monthly plan, ₹1299 |
| `"6 Month Plan"` | `"Silver Pack"` | 6-month plan, ₹5999 |
| `"6 Month Plan PRO"` | `"Gold Pack PRO"` | 6-month premium, ₹7999 |
| `"6 Month Plan Pro"` | `"Gold Pack PRO"` | Handle variation |

## 💰 **Financial Calculations**

| rental_orders Column | Calculation | Example |
|---------------------|-------------|---------|
| `total_amount` | From CSV `order_total` OR plan default | `8258.82` |
| `base_amount` | `total_amount * 0.82` (excluding 18% GST) | `6772.23` |
| `gst_amount` | `total_amount * 0.18` (18% GST) | `1486.59` |
| `payment_amount` | Same as `total_amount` | `8258.82` |
| `payment_currency` | Always `"INR"` | `"INR"` |

## 🔄 **Status Mappings**

| CSV order_status | rental_orders status | Description |
|------------------|---------------------|-------------|
| `"wc-processing"` | `"confirmed"` | Order confirmed |
| `"wc-completed"` | `"delivered"` | Order completed |
| `"wc-pic-completed"` | `"delivered"` | Pickup completed |
| `"wc-cancelled"` | `"cancelled"` | Order cancelled |
| `"wc-pending"` | `"pending"` | Payment pending |

## 📅 **Date Calculations**

| rental_orders Column | Calculation | Example |
|---------------------|-------------|---------|
| `rental_start_date` | `first_purchase_date` OR `order_date` | `"2024-04-10"` |
| `rental_end_date` | Start date + plan duration | `"2024-04-10"` + 6 months = `"2024-10-10"` |
| `delivered_at` | `delivery_completed_date` | `"2024-06-10"` |
| `confirmed_at` | `order_date` if processing | `"2024-04-10 13:02:53"` |

## 🚫 **Unused/Default Fields**

| rental_orders Column | Default Value | Reason |
|---------------------|---------------|---------|
| `legacy_order_id` | `null` | UUID constraint issue |
| `subscription_id` | `null` | Will be populated later |
| `created_by` | `null` | UUID constraint |
| `updated_by` | `null` | UUID constraint |
| `razorpay_order_id` | `""` | Not in CSV |
| `razorpay_signature` | `""` | Not in CSV |
| `coupon_code` | `""` | Not in CSV |
| `cycle_number` | `1` | First cycle |
| `return_status` | `"not_returned"` | Default |

## 📊 **Data Volume Summary**

From CSV analysis:
- **10,990 total rows** (products across orders)
- **2,498 unique orders** 
- **1,011 unique users**
- **347 unique products**

Expected rental_orders output:
- **~2,498 rental orders** (one per unique order_id)
- **~3-8 toys per order** (after deduplication and filtering)
- **Complete address and payment data**
- **Proper subscription plan mapping**

This mapping ensures **complete data migration** with **proper business logic** applied! 🎯 