# 🗄️ Toyflix Database Schema Overview

This document provides a complete overview of where users, orders, and subscriptions are stored in your Supabase database and what details are available.

## 📊 **Database Tables Summary**

| Table | Purpose | Current Records | Migration Status |
|-------|---------|-----------------|------------------|
| `custom_users` | Main user table | 58 | ✅ Migrating from WooCommerce |
| `orders` | Order management | 10 | ✅ Migrating from WooCommerce |
| `subscriptions` | Subscription management | 3 | ✅ Migrating from WooCommerce |
| `order_items` | Order line items | - | ✅ Migrating from WooCommerce |
| `payment_orders` | Payment tracking | - | ✅ Migrating from WooCommerce |

---

## 👥 **USERS TABLE: `custom_users`**

**Primary Table for User Management**

### **Core Fields:**
```sql
id                    UUID PRIMARY KEY (auto-generated)
phone                 TEXT UNIQUE NOT NULL (primary identifier)
email                 TEXT UNIQUE 
first_name            TEXT
last_name             TEXT
role                  app_role ENUM ('user', 'admin', 'premium') DEFAULT 'user'
phone_verified        BOOLEAN DEFAULT false
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
last_login            TIMESTAMP WITH TIME ZONE
```

### **Address Fields:**
```sql
address_line1         TEXT
address_line2         TEXT  
city                  TEXT
state                 TEXT
zip_code              TEXT
pincode               VARCHAR(6) (for Bangalore delivery validation)
latitude              NUMERIC
longitude             NUMERIC
```

### **Subscription Fields:**
```sql
subscription_plan     subscription_plan ENUM ('basic', 'premium', 'family')
subscription_active   BOOLEAN
subscription_end_date TIMESTAMPTZ
```

### **Profile Fields:**
```sql
avatar_url            TEXT
```

### **Migration Details:**
- **Source:** WooCommerce `wp_users` + `wp_usermeta` 
- **Primary Key:** Phone number (unique identifier)
- **Current Count:** 58 users (after sample migration)
- **Total Available:** 7,110 users in WordPress

---

## 📦 **ORDERS TABLE: `orders`**

**Order Management and Tracking**

### **Core Fields:**
```sql
id                    UUID PRIMARY KEY (auto-generated)
user_id               UUID REFERENCES custom_users(id) ON DELETE CASCADE
status                order_status ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
order_type            TEXT DEFAULT 'subscription'
created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
```

### **Financial Fields:**
```sql
total_amount          NUMERIC(10,2) NOT NULL DEFAULT 0
base_amount           NUMERIC(10,2) NOT NULL DEFAULT 0
gst_amount            NUMERIC(10,2) NOT NULL DEFAULT 0
discount_amount       NUMERIC(10,2) NOT NULL DEFAULT 0
coupon_code           TEXT
```

### **Delivery Fields:**
```sql
shipping_address      JSONB (structured address data)
delivery_instructions TEXT
rental_start_date     TIMESTAMP (for toy rental period)
rental_end_date       TIMESTAMP (for toy rental period)
```

### **Shipping Address JSON Structure:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "phone": "9876543210",
  "address1": "123 Main Street",
  "address2": "Apt 4B",
  "city": "Bangalore",
  "state": "Karnataka", 
  "postcode": "560001",
  "country": "IN"
}
```

### **Migration Details:**
- **Source:** WooCommerce `wp_posts` (post_type = 'shop_order') + metadata
- **Current Count:** 10 orders  
- **Total Available:** 2,561 orders in WordPress
- **Status Mapping:** WooCommerce statuses → Supabase enums

---

## 🔄 **SUBSCRIPTIONS TABLE: `subscriptions`**

**Subscription Management and Billing**

### **Core Fields:**
```sql
id                    UUID PRIMARY KEY (auto-generated)
user_id               UUID REFERENCES custom_users(id) ON DELETE CASCADE
plan_type             TEXT (mapped from WooCommerce billing period)
status                TEXT ('active', 'cancelled', 'expired', 'paused', 'pending')
created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
```

### **Billing Fields:**
```sql
total_amount          NUMERIC(10,2) (recurring amount)
billing_cycle         INTEGER (number of months: 1=monthly, 3=quarterly)
start_date            TIMESTAMP WITH TIME ZONE
end_date              TIMESTAMP WITH TIME ZONE
next_billing_date     TIMESTAMP WITH TIME ZONE
is_active             BOOLEAN
```

### **Legacy Fields (from existing schema):**
```sql
plan_id               TEXT NOT NULL
current_period_start  DATE NOT NULL DEFAULT CURRENT_DATE
current_period_end    DATE NOT NULL  
pause_balance         INTEGER NOT NULL DEFAULT 0
auto_renew            BOOLEAN NOT NULL DEFAULT true
subscription_type     subscription_type ENUM ('monthly', 'ride_on')
ride_on_toy_id        UUID REFERENCES toys(id)
```

### **Migration Details:**
- **Source:** WooCommerce `wp_posts` (post_type = 'shop_subscription') + metadata
- **Current Count:** 3 subscriptions
- **Total Available:** 3,258 subscriptions in WordPress
- **Plan Detection:** Automatically detects monthly/quarterly from billing period

---

## 🛍️ **ORDER ITEMS TABLE: `order_items`**

**Individual Items in Each Order**

### **Core Fields:**
```sql
id                    UUID PRIMARY KEY (auto-generated)
order_id              UUID REFERENCES orders(id) ON DELETE CASCADE
toy_id                UUID REFERENCES toys(id) (will be NULL initially)
quantity              INTEGER NOT NULL DEFAULT 1
created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
```

### **Pricing Fields:**
```sql
unit_price            NUMERIC(10,2)
total_price           NUMERIC(10,2)
rental_price          NUMERIC(10,2) (for migration)
```

### **Category Fields:**
```sql
subscription_category TEXT
age_group             TEXT
ride_on_toy_id        UUID REFERENCES toys(id)
```

### **Migration Details:**
- **Source:** WooCommerce `wp_woocommerce_order_items` + metadata
- **Product Mapping:** WooCommerce product IDs → Supabase toy IDs (manual mapping needed)
- **Current State:** `toy_id` will be NULL initially until product mapping is complete

---

## 💳 **PAYMENT ORDERS TABLE: `payment_orders`**

**Payment Tracking and Razorpay Integration**

### **Core Fields:**
```sql
id                    UUID PRIMARY KEY (auto-generated)
user_id               UUID REFERENCES custom_users(id) ON DELETE CASCADE
amount                NUMERIC(10,2) NOT NULL
currency              TEXT NOT NULL DEFAULT 'INR'
status                TEXT NOT NULL DEFAULT 'created'
order_type            TEXT NOT NULL
created_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now()
```

### **Razorpay Integration:**
```sql
razorpay_order_id     TEXT UNIQUE
razorpay_payment_id   TEXT
```

### **Order Details:**
```sql
order_items           JSONB (detailed breakdown of items and pricing)
```

### **Order Items JSON Structure:**
```json
{
  "order_id": "uuid",
  "items": [
    {
      "product_id": 123,
      "name": "Educational Toy Set",
      "quantity": 1,
      "total": 599.00
    }
  ]
}
```

---

## 🔗 **TABLE RELATIONSHIPS**

```
custom_users (1) ──→ (many) orders
custom_users (1) ──→ (many) subscriptions  
custom_users (1) ──→ (many) payment_orders

orders (1) ──→ (many) order_items
orders (1) ──→ (1) payment_orders (via user_id)

toys (1) ──→ (many) order_items
```

---

## 📈 **MIGRATION MAPPING**

### **User Migration:**
| WooCommerce Source | Supabase Target | Notes |
|-------------------|-----------------|-------|
| `wp_users.ID` | `custom_users.id` (new UUID) | Primary key transformation |
| `wp_usermeta.billing_phone` | `custom_users.phone` | Primary identifier |
| `wp_usermeta.billing_first_name` | `custom_users.first_name` | |
| `wp_usermeta.billing_address_1` | `custom_users.address_line1` | |
| `wp_usermeta.billing_city` | `custom_users.city` | |

### **Order Migration:**
| WooCommerce Source | Supabase Target | Notes |
|-------------------|-----------------|-------|
| `wp_posts.ID` (shop_order) | `orders.id` (new UUID) | |
| `wp_postmeta._customer_user` | `orders.user_id` | Mapped via user migration |
| `wp_postmeta._order_total` | `orders.total_amount` | |
| `wp_posts.post_status` | `orders.status` | Status enum mapping |

### **Subscription Migration:**
| WooCommerce Source | Supabase Target | Notes |
|-------------------|-----------------|-------|
| `wp_posts.ID` (shop_subscription) | `subscriptions.id` (new UUID) | |
| `wp_postmeta._customer_user` | `subscriptions.user_id` | Mapped via user migration |
| `wp_postmeta._billing_period` | `subscriptions.plan_type` | monthly/quarterly detection |
| `wp_postmeta._recurring_amount` | `subscriptions.total_amount` | |

---

## 🎯 **Current Migration Status**

### **Completed:**
✅ **Users:** 58 migrated (sample), 7,110 total available  
✅ **Data Transformation:** All mapping logic implemented  
✅ **Relationship Mapping:** User ID mapping working perfectly  
✅ **Status Mapping:** WooCommerce → Supabase enum conversion  

### **Ready for Full Migration:**
🚀 **Orders:** 2,561 available for migration  
🚀 **Subscriptions:** 3,258 available for migration  
🚀 **Order Items:** Available with each order  
🚀 **Payment Records:** Will be created for each order  

### **Post-Migration Tasks:**
📝 **Product Mapping:** Map WooCommerce product IDs to Supabase toy IDs  
📝 **Password Reset:** Users will need to reset passwords  
📝 **Phone Verification:** Mark migrated users for re-verification  
📝 **Subscription Activation:** Update user subscription status based on active subscriptions  

---

## 💡 **Key Features**

1. **Phone-Based Authentication:** Users identified by phone number (Indian mobile numbers)
2. **Comprehensive Address Storage:** Full address with pincode validation for Bangalore
3. **Flexible Subscription Plans:** Support for monthly, quarterly, and custom plans
4. **Detailed Order Tracking:** Complete order lifecycle from creation to delivery
5. **Razorpay Integration:** Full payment tracking and reconciliation
6. **Audit Trail:** Created/updated timestamps on all tables
7. **Data Relationships:** Proper foreign key constraints maintaining data integrity

This schema provides a robust foundation for your toy rental subscription service with complete user, order, and subscription management capabilities! 🎉 