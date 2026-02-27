-- COMPREHENSIVE ADMIN ORDER DETAILS SETUP
-- Run this in your Supabase SQL Editor

-- 1. Create comprehensive order details view
CREATE OR REPLACE VIEW admin_order_details_view AS
SELECT 
    -- ORDER BASIC INFO
    o.id as order_id,
    o.status as order_status,
    o.order_type,
    o.total_amount,
    COALESCE(o.base_amount, 0) as base_amount,
    COALESCE(o.gst_amount, 0) as gst_amount,
    COALESCE(o.discount_amount, 0) as discount_amount,
    o.coupon_code,
    o.created_at as order_placed_date,
    o.updated_at as order_last_updated,
    o.rental_start_date,
    o.rental_end_date,
    o.delivery_instructions,
    
    -- CUSTOMER INFORMATION
    cu.id as customer_id,
    cu.phone as customer_phone,
    cu.email as customer_email,
    cu.first_name as customer_first_name,
    cu.last_name as customer_last_name,
    CONCAT(cu.first_name, ' ', cu.last_name) as customer_full_name,
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
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) as total_quantity,
    (SELECT COALESCE(SUM(oi.total_price), 0) FROM order_items oi WHERE oi.order_id = o.id) as items_total_price,
    
    -- SUBSCRIPTION INFORMATION
    s.id as subscription_id,
    s.plan_type as subscription_plan_type,
    s.status as subscription_status,
    s.start_date as subscription_start_date,
    s.end_date as subscription_end_date,
    s.billing_cycle as subscription_billing_cycle,
    s.amount as subscription_amount

FROM orders o
LEFT JOIN custom_users cu ON o.user_id = cu.id
LEFT JOIN payment_orders po ON po.user_id = cu.id 
    AND po.created_at >= (o.created_at - INTERVAL '2 hours') 
    AND po.created_at <= (o.created_at + INTERVAL '2 hours')
LEFT JOIN subscriptions s ON s.user_id = cu.id 
    AND s.created_at >= (o.created_at - INTERVAL '1 day') 
    AND s.created_at <= (o.created_at + INTERVAL '1 day');

-- 2. Create order items detailed view
CREATE OR REPLACE VIEW admin_order_items_view AS
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    oi.quantity,
    COALESCE(oi.unit_price, 0) as unit_price,
    COALESCE(oi.total_price, 0) as total_price,
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
    CONCAT(cu.first_name, ' ', cu.last_name) as customer_name

FROM order_items oi
LEFT JOIN toys t ON oi.toy_id = t.id
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN custom_users cu ON o.user_id = cu.id;

-- 3. Create customer journey tracking function
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
               'customer_name', CONCAT(oi.first_name, ' ', oi.last_name),
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
    WHERE po.created_at >= oi.created_at - INTERVAL '2 hours'
    AND po.created_at <= oi.created_at + INTERVAL '2 hours'
    
    ORDER BY step_timestamp;
END;
$$ LANGUAGE plpgsql;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id_created_at ON payment_orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_created_at ON subscriptions(user_id, created_at);

-- 5. Test the views (run these to verify)
-- SELECT * FROM admin_order_details_view LIMIT 5;
-- SELECT * FROM admin_order_items_view LIMIT 5;

COMMENT ON VIEW admin_order_details_view IS 'Comprehensive view for admin panel showing all order, customer, payment, and subscription details';
COMMENT ON VIEW admin_order_items_view IS 'Detailed view of order items with toy information for admin panel';
