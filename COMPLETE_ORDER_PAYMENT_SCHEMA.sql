-- COMPREHENSIVE ORDER & PAYMENT TRACKING SCHEMA
-- Complete customer order lifecycle with payment tracking
-- Includes: Customers, Orders, Payments, Delivery, Returns, Audit

-- ========================================
-- 1. ENUM TYPES
-- ========================================

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed', 
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

CREATE TYPE payment_method AS ENUM (
  'razorpay',
  'upi',
  'card',
  'netbanking',
  'wallet',
  'cash_on_delivery',
  'bank_transfer'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'paused',
  'cancelled',
  'expired',
  'pending'
);

CREATE TYPE delivery_status AS ENUM (
  'pending',
  'assigned',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned'
);

CREATE TYPE refund_status AS ENUM (
  'requested',
  'approved',
  'processing',
  'completed',
  'rejected'
);

-- ========================================
-- 2. CUSTOMER MANAGEMENT
-- ========================================

-- Main customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  
  -- Account status
  phone_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  account_locked BOOLEAN DEFAULT false,
  
  -- Preferences
  preferred_language TEXT DEFAULT 'en',
  marketing_consent BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT now()
);

-- Customer addresses
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Address details
  address_type TEXT CHECK (address_type IN ('home', 'work', 'other')),
  is_default BOOLEAN DEFAULT false,
  
  -- Address fields
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  landmark TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  postal_code TEXT NOT NULL,
  
  -- Location data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Delivery preferences
  delivery_instructions TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 3. SUBSCRIPTION MANAGEMENT
-- ========================================

-- Subscription plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Plan details
  duration_months INTEGER NOT NULL,
  toy_limit INTEGER,
  category TEXT, -- e.g., 'basic', 'premium', 'family'
  age_groups TEXT[], -- Array of age groups
  
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  
  -- Plan features
  features JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Subscription details
  status subscription_status DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  auto_renewal BOOLEAN DEFAULT true,
  
  -- Pricing
  monthly_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Billing
  next_billing_date DATE,
  last_billing_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 4. PRODUCT & TOY MANAGEMENT
-- ========================================

-- Toys/Products catalog
CREATE TABLE toys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Product details
  sku TEXT UNIQUE,
  category TEXT,
  age_group TEXT,
  brand TEXT,
  
  -- Pricing
  mrp DECIMAL(10,2),
  rental_price DECIMAL(10,2),
  security_deposit DECIMAL(10,2),
  
  -- Media
  images JSONB, -- Array of image URLs
  videos JSONB, -- Array of video URLs
  
  -- Inventory
  total_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- SEO
  slug TEXT UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 5. ORDER MANAGEMENT
-- ========================================

-- Main orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- Human readable order number
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Order details
  status order_status DEFAULT 'pending',
  order_type TEXT CHECK (order_type IN ('subscription', 'one_time', 'replacement', 'add_on')),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Discounts & Coupons
  coupon_code TEXT,
  discount_percentage DECIMAL(5,2),
  
  -- Shipping address (snapshot)
  shipping_address JSONB NOT NULL,
  
  -- Delivery details
  delivery_date DATE,
  pickup_date DATE,
  delivery_instructions TEXT,
  
  -- Rental period
  rental_start_date DATE,
  rental_end_date DATE,
  
  -- Order notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items (individual toys in an order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  toy_id UUID NOT NULL REFERENCES toys(id),
  
  -- Item details
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Rental specific
  rental_start_date DATE,
  rental_end_date DATE,
  security_deposit DECIMAL(10,2),
  
  -- Item status
  item_status TEXT DEFAULT 'pending',
  returned_at TIMESTAMPTZ,
  condition_on_return TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 6. PAYMENT TRACKING
-- ========================================

-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference TEXT UNIQUE NOT NULL, -- Our internal reference
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status DEFAULT 'pending',
  method payment_method,
  
  -- Gateway details (Razorpay)
  gateway_name TEXT DEFAULT 'razorpay',
  gateway_order_id TEXT, -- Razorpay order ID
  gateway_payment_id TEXT, -- Razorpay payment ID
  gateway_signature TEXT, -- Razorpay signature for verification
  
  -- Transaction details
  gateway_response JSONB, -- Full gateway response
  failure_reason TEXT,
  gateway_fee DECIMAL(10,2),
  
  -- Processing timestamps
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment webhooks (for audit and debugging)
CREATE TABLE payment_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  
  -- Webhook details
  event_type TEXT NOT NULL,
  webhook_data JSONB NOT NULL,
  signature TEXT,
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  received_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 7. REFUNDS & RETURNS
-- ========================================

-- Refund requests
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Refund details
  refund_amount DECIMAL(10,2) NOT NULL,
  refund_reason TEXT,
  status refund_status DEFAULT 'requested',
  
  -- Gateway details
  gateway_refund_id TEXT, -- Razorpay refund ID
  gateway_response JSONB,
  
  -- Processing
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 8. DELIVERY TRACKING
-- ========================================

-- Delivery partners
CREATE TABLE delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  api_endpoint TEXT,
  api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery tracking
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_partner_id UUID REFERENCES delivery_partners(id),
  
  -- Delivery details
  tracking_number TEXT,
  status delivery_status DEFAULT 'pending',
  
  -- Personnel
  delivery_person_name TEXT,
  delivery_person_phone TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_time_slot TEXT,
  
  -- Completion
  delivered_at TIMESTAMPTZ,
  delivered_to TEXT, -- Person who received
  delivery_signature TEXT, -- Path to signature image
  delivery_photo TEXT, -- Path to delivery photo
  
  -- Failed delivery
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery status updates (tracking history)
CREATE TABLE delivery_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  
  -- Update details
  status TEXT NOT NULL,
  message TEXT,
  location TEXT,
  
  -- Tracking
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Source
  updated_by TEXT, -- 'system', 'delivery_partner', 'admin'
  source_reference TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 9. CUSTOMER COMMUNICATION
-- ========================================

-- Notifications/Messages sent to customers
CREATE TABLE customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  
  -- Notification details
  type TEXT NOT NULL, -- 'sms', 'email', 'push', 'whatsapp'
  subject TEXT,
  message TEXT NOT NULL,
  
  -- Delivery
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  failure_reason TEXT,
  
  -- External references
  provider TEXT, -- 'twilio', 'sendgrid', etc.
  provider_message_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 10. AUDIT & TRACKING
-- ========================================

-- Order status history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Status change
  from_status order_status,
  to_status order_status NOT NULL,
  
  -- Context
  reason TEXT,
  notes TEXT,
  changed_by UUID REFERENCES customers(id), -- Could be customer or admin
  changed_by_type TEXT DEFAULT 'system', -- 'customer', 'admin', 'system'
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment audit log
CREATE TABLE payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  
  -- Action details
  action TEXT NOT NULL, -- 'created', 'updated', 'completed', 'failed', 'refunded'
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  performed_by TEXT,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer activity log
CREATE TABLE customer_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL, -- 'login', 'order_placed', 'payment_made', etc.
  description TEXT,
  metadata JSONB,
  
  -- Session info
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 11. INDEXES FOR PERFORMANCE
-- ========================================

-- Customer indexes
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;

-- Order indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Payment indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Delivery indexes
CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX idx_deliveries_tracking_number ON deliveries(tracking_number);
CREATE INDEX idx_deliveries_status ON deliveries(status);

-- ========================================
-- 12. TRIGGERS FOR AUTO-UPDATES
-- ========================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toys_updated_at BEFORE UPDATE ON toys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order status history trigger
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_type)
        VALUES (NEW.id, OLD.status, NEW.status, 'system');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER order_status_change_log 
    AFTER UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION log_order_status_change();

-- ========================================
-- 13. VIEWS FOR COMMON QUERIES
-- ========================================

-- Complete order view with all related data
CREATE VIEW order_complete_view AS
SELECT 
    o.id as order_id,
    o.order_number,
    o.status as order_status,
    o.total_amount,
    o.created_at as order_date,
    
    -- Customer info
    c.id as customer_id,
    c.phone as customer_phone,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email as customer_email,
    
    -- Payment info
    p.id as payment_id,
    p.status as payment_status,
    p.gateway_payment_id,
    p.completed_at as payment_completed_at,
    
    -- Delivery info
    d.id as delivery_id,
    d.status as delivery_status,
    d.tracking_number,
    d.delivered_at,
    
    -- Order items count
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count,
    (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_quantity

FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN payments p ON o.id = p.order_id
LEFT JOIN deliveries d ON o.id = d.order_id;

-- Customer summary view
CREATE VIEW customer_summary_view AS
SELECT 
    c.id as customer_id,
    c.phone,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email,
    c.created_at as registration_date,
    c.last_login,
    
    -- Order stats
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date,
    
    -- Subscription info
    s.status as subscription_status,
    sp.name as current_plan,
    
    -- Activity
    c.is_active,
    c.phone_verified,
    c.email_verified

FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN subscriptions s ON c.id = s.customer_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
GROUP BY c.id, s.status, sp.name;

-- ========================================
-- 14. FUNCTIONS FOR COMMON OPERATIONS
-- ========================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TF' || TO_CHAR(now(), 'YYYYMMDD') || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

-- Calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2);
BEGIN
    SELECT 
        COALESCE(subtotal, 0) - COALESCE(discount_amount, 0) + COALESCE(tax_amount, 0) + COALESCE(shipping_amount, 0)
    INTO total
    FROM orders 
    WHERE id = order_uuid;
    
    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 15. SAMPLE DATA QUERIES
-- ========================================

/*
-- Insert sample customer
INSERT INTO customers (phone, email, first_name, last_name, phone_verified) 
VALUES ('+919591488772', 'customer@example.com', 'John', 'Doe', true);

-- Insert sample subscription plan
INSERT INTO subscription_plans (name, description, duration_months, toy_limit, base_price)
VALUES ('Basic Plan', 'Basic toy rental plan', 1, 3, 599.00);

-- Insert sample toy
INSERT INTO toys (name, description, category, age_group, rental_price)
VALUES ('Educational Blocks', 'Colorful building blocks', 'Educational', '2-5 years', 99.00);

-- Create sample order
INSERT INTO orders (order_number, customer_id, status, subtotal, total_amount, shipping_address)
VALUES (
    generate_order_number(),
    (SELECT id FROM customers WHERE phone = '+919591488772'),
    'pending',
    599.00,
    599.00,
    '{"address": "123 Main St", "city": "Bangalore", "state": "Karnataka"}'::jsonb
);
*/

-- ========================================
-- END OF SCHEMA
-- ========================================

COMMENT ON SCHEMA public IS 'Complete order and payment tracking schema for toy rental business'; 