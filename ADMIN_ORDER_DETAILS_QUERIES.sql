-- COMPREHENSIVE ADMIN ORDER DETAILS QUERIES
-- Complete order information with customer data, payments, and items

-- ========================================
-- 1. COMPLETE ORDER DETAILS VIEW
-- ========================================

-- Main query to get ALL order information for admin panel
CREATE OR REPLACE VIEW admin_order_details_view AS
SELECT 
    -- ORDER BASIC INFO
    o.id as order_id,
    o.status as order_status,
    o.order_type,
    o.total_amount,
    o.base_amount,
    o.gst_amount,
    o.discount_amount,
    o.coupon_code,
    o.created_at as order_placed_date,
    o.updated_at as order_last_updated,
    o.confirmed_at,
    o.shipped_at,
    o.delivered_at,
    o.rental_start_date,
    o.rental_end_date,
    o.delivery_instructions,
    
    -- CUSTOMER INFORMATION
    cu.id as customer_id,
    cu.phone as customer_phone,
    cu.email as customer_email,
    cu.first_name as customer_first_name,
    cu.last_name as customer_last_name,
    (cu.first_name || ' ' || cu.last_name) as customer_full_name,
    cu.phone_verified,
    cu.subscription_active as customer_has_active_subscription,
    cu.subscription_plan as customer_current_plan,
    cu.created_at as customer_registration_date,
    
    -- SHIPPING ADDRESS (from JSONB)
    o.shipping_address->>'firstName' as shipping_first_name,
    o.shipping_address->>'lastName' as shipping_last_name,
    o.shipping_address->>'phone' as shipping_phone,
    o.shipping_address->>'email' as shipping_email,
    o.shipping_address->>'address1' as shipping_address_line1,
    o.shipping_address->>'address2' as shipping_address_line2,
    o.shipping_address->>'city' as shipping_city,
    o.shipping_address->>'state' as shipping_state,
    o.shipping_address->>'postcode' as shipping_postcode,
    o.shipping_address->>'country' as shipping_country,
    
    -- PAYMENT INFORMATION
    po.id as payment_order_id,
    po.razorpay_order_id,
    po.razorpay_payment_id,
    po.amount as payment_amount,
    po.currency as payment_currency,
    po.status as payment_status,
    po.order_type as payment_order_type,
    po.created_at as payment_created_date,
    po.updated_at as payment_updated_date,
    
    -- ORDER ITEMS COUNT AND SUMMARY
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as total_items_count,
    (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) as total_quantity,
    (SELECT SUM(oi.total_price) FROM order_items oi WHERE oi.order_id = o.id) as items_total_price,
    
    -- SUBSCRIPTION INFORMATION (if order is subscription-based)
    s.id as subscription_id,
    s.plan_type as subscription_plan_type,
    s.status as subscription_status,
    s.start_date as subscription_start_date,
    s.end_date as subscription_end_date,
    s.billing_cycle as subscription_billing_cycle,
    s.amount as subscription_amount

FROM orders o
LEFT JOIN custom_users cu ON o.user_id = cu.id
LEFT JOIN payment_orders po ON po.user_id = cu.id AND po.created_at >= (o.created_at - INTERVAL '1 hour') AND po.created_at <= (o.created_at + INTERVAL '1 hour')
LEFT JOIN subscriptions s ON s.user_id = cu.id AND s.created_at >= (o.created_at - INTERVAL '1 day') AND s.created_at <= (o.created_at + INTERVAL '1 day');

-- ========================================
-- 2. ORDER ITEMS DETAILED VIEW
-- ========================================

CREATE OR REPLACE VIEW admin_order_items_view AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.subscription_category,
    oi.age_group,
    oi.created_at as item_added_date,
    
    -- TOY/PRODUCT INFORMATION
    t.id as toy_id,
    t.name as toy_name,
    t.description as toy_description,
    t.image_url as toy_image,
    t.category as toy_category,
    t.age_group as toy_age_group,
    t.price as toy_price,
    
    -- ORDER INFORMATION
    o.status as order_status,
    o.created_at as order_date,
    
    -- CUSTOMER INFORMATION
    cu.phone as customer_phone,
    (cu.first_name || ' ' || cu.last_name) as customer_name

FROM order_items oi
LEFT JOIN toys t ON oi.toy_id = t.id
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN custom_users cu ON o.user_id = cu.id;

-- ========================================
-- 3. SPECIFIC QUERIES FOR ADMIN PANEL
-- ========================================

-- Query 1: Get complete order details by order ID
-- Use this when admin clicks on an order to view details
/*
SELECT * FROM admin_order_details_view 
WHERE order_id = 'YOUR_ORDER_ID_HERE'
*/

-- Query 2: Get all order items for a specific order
-- Use this to show the items list in order details
/*
SELECT * FROM admin_order_items_view 
WHERE order_id = 'YOUR_ORDER_ID_HERE'
ORDER BY item_added_date;
*/

-- Query 3: Get payment tracking for specific order
CREATE OR REPLACE FUNCTION get_order_payment_details(order_uuid UUID)
RETURNS TABLE (
    payment_id UUID,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    payment_amount DECIMAL(10,2),
    payment_status TEXT,
    payment_method TEXT,
    gateway_response JSONB,
    payment_created_at TIMESTAMPTZ,
    payment_completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.id,
        po.razorpay_order_id,
        po.razorpay_payment_id,
        po.amount,
        po.status,
        'razorpay'::TEXT as method,
        po.order_items as gateway_response,
        po.created_at,
        po.updated_at
    FROM payment_orders po
    JOIN orders o ON po.user_id = o.user_id
    WHERE o.id = order_uuid
    AND po.created_at >= (SELECT created_at - INTERVAL '2 hours' FROM orders WHERE id = order_uuid)
    AND po.created_at <= (SELECT created_at + INTERVAL '2 hours' FROM orders WHERE id = order_uuid)
    ORDER BY po.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. CUSTOMER JOURNEY TRACKING QUERIES
-- ========================================

-- Query to track complete customer journey for an order
CREATE OR REPLACE FUNCTION get_customer_order_journey(order_uuid UUID)
RETURNS TABLE (
    step_name TEXT,
    step_description TEXT,
    step_timestamp TIMESTAMPTZ,
    step_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH order_info AS (
        SELECT o.*, cu.phone, cu.first_name, cu.last_name
        FROM orders o
        LEFT JOIN custom_users cu ON o.user_id = cu.id
        WHERE o.id = order_uuid
    )
    SELECT 'Order Created'::TEXT, 
           'Customer placed the order'::TEXT,
           oi.created_at,
           jsonb_build_object(
               'customer_phone', oi.phone,
               'customer_name', oi.first_name || ' ' || oi.last_name,
               'order_total', oi.total_amount,
               'order_type', oi.order_type
           )
    FROM order_info oi
    
    UNION ALL
    
    SELECT 'Payment Initiated'::TEXT,
           'Payment process started'::TEXT,
           po.created_at,
           jsonb_build_object(
               'payment_amount', po.amount,
               'razorpay_order_id', po.razorpay_order_id,
               'payment_status', po.status
           )
    FROM payment_orders po
    JOIN order_info oi ON po.user_id = (SELECT user_id FROM orders WHERE id = order_uuid)
    WHERE po.created_at >= oi.created_at - INTERVAL '1 hour'
    AND po.created_at <= oi.created_at + INTERVAL '1 hour'
    
    UNION ALL
    
    SELECT 'Order Confirmed'::TEXT,
           'Order was confirmed'::TEXT,
           oi.confirmed_at,
           jsonb_build_object('confirmed_by', 'system')
    FROM order_info oi
    WHERE oi.confirmed_at IS NOT NULL
    
    UNION ALL
    
    SELECT 'Order Shipped'::TEXT,
           'Order was shipped'::TEXT,
           oi.shipped_at,
           jsonb_build_object('shipping_status', 'shipped')
    FROM order_info oi
    WHERE oi.shipped_at IS NOT NULL
    
    UNION ALL
    
    SELECT 'Order Delivered'::TEXT,
           'Order was delivered'::TEXT,
           oi.delivered_at,
           jsonb_build_object('delivery_status', 'delivered')
    FROM order_info oi
    WHERE oi.delivered_at IS NOT NULL
    
    ORDER BY step_timestamp;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. ADMIN DASHBOARD SUMMARY QUERIES
-- ========================================

-- Get order summary for admin dashboard
CREATE OR REPLACE VIEW admin_orders_summary AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.total_amount,
    o.created_at as order_date,
    (cu.first_name || ' ' || cu.last_name) as customer_name,
    cu.phone as customer_phone,
    po.razorpay_payment_id,
    po.status as payment_status,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count,
    CASE 
        WHEN o.status = 'delivered' THEN '✅'
        WHEN o.status = 'shipped' THEN '🚚'
        WHEN o.status = 'confirmed' THEN '✔️'
        WHEN o.status = 'pending' THEN '⏳'
        WHEN o.status = 'cancelled' THEN '❌'
        ELSE '❓'
    END as status_emoji
FROM orders o
LEFT JOIN custom_users cu ON o.user_id = cu.id
LEFT JOIN payment_orders po ON po.user_id = cu.id 
    AND po.created_at >= (o.created_at - INTERVAL '1 hour') 
    AND po.created_at <= (o.created_at + INTERVAL '1 hour')
ORDER BY o.created_at DESC;

-- ========================================
-- 6. SAMPLE USAGE QUERIES
-- ========================================

-- Example: Get complete order details for admin panel
/*
-- Replace 'your-order-id' with actual order ID
SELECT * FROM admin_order_details_view WHERE order_id = 'your-order-id';

-- Get order items
SELECT * FROM admin_order_items_view WHERE order_id = 'your-order-id';

-- Get payment details
SELECT * FROM get_order_payment_details('your-order-id');

-- Get customer journey
SELECT * FROM get_customer_order_journey('your-order-id');
*/

-- ========================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id_created_at ON payment_orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_created_at ON subscriptions(user_id, created_at);

-- ========================================
-- 8. EXAMPLE TEST QUERIES
-- ========================================

-- Test query to see all orders with complete details
-- Run this to verify the schema works
/*
SELECT 
    order_id,
    customer_full_name,
    customer_phone,
    order_status,
    payment_status,
    total_amount,
    payment_amount,
    razorpay_payment_id,
    order_placed_date,
    total_items_count,
    shipping_city,
    shipping_address_line1
FROM admin_order_details_view 
ORDER BY order_placed_date DESC 
LIMIT 10;
*/ 