-- Migration Staging Tables for WooCommerce Data
-- These tables will hold migrated data before integration into live system

-- Create staging schema for migration data
CREATE SCHEMA IF NOT EXISTS migration_staging;

-- Create staging table for users
CREATE TABLE migration_staging.users_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_user_id INTEGER NOT NULL, -- Original WordPress user ID
    phone TEXT NOT NULL,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    role TEXT DEFAULT 'user',
    subscription_active BOOLEAN DEFAULT false,
    subscription_plan TEXT,
    phone_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    wp_created_at TIMESTAMP WITH TIME ZONE, -- Original WordPress creation date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Migration metadata
    migration_batch TEXT, -- Track which batch this was migrated in
    migration_status TEXT DEFAULT 'pending', -- pending, reviewed, integrated, rejected
    integration_notes TEXT, -- Notes about integration process
    integrated_user_id UUID, -- Reference to final custom_users.id after integration
    
    -- Constraints
    UNIQUE(wp_user_id),
    UNIQUE(phone)
);

-- Create staging table for orders
CREATE TABLE migration_staging.orders_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_order_id INTEGER NOT NULL, -- Original WordPress order ID
    wp_customer_id INTEGER, -- Original WordPress customer ID
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    
    -- Order details
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT,
    wp_status TEXT, -- Original WooCommerce status
    currency TEXT DEFAULT 'INR',
    
    -- Shipping address (from WooCommerce)
    shipping_address JSONB,
    
    -- Dates
    wp_created_at TIMESTAMP WITH TIME ZONE, -- Original WordPress creation date
    wp_updated_at TIMESTAMP WITH TIME ZONE, -- Original WordPress update date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Migration metadata
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_order_id UUID, -- Reference to final orders.id after integration
    
    -- Constraints
    UNIQUE(wp_order_id)
);

-- Create staging table for order items
CREATE TABLE migration_staging.order_items_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_order_item_id INTEGER NOT NULL, -- Original WordPress order item ID
    staged_order_id UUID REFERENCES migration_staging.orders_staging(id),
    
    -- Product details from WooCommerce
    wp_product_id INTEGER, -- Original WooCommerce product ID
    product_name TEXT, -- Original product name
    product_sku TEXT, -- Product SKU if available
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    
    -- Toy mapping (to be filled during review process)
    mapped_toy_id UUID, -- Will reference toys.id after manual mapping
    mapping_confidence TEXT, -- high, medium, low, manual
    mapping_notes TEXT, -- Notes about the mapping decision
    
    -- Migration metadata
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending', -- pending, mapped, integrated, unmappable
    integration_notes TEXT,
    integrated_item_id UUID, -- Reference to final order_items.id after integration
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints
    UNIQUE(wp_order_item_id)
);

-- Create staging table for subscriptions
CREATE TABLE migration_staging.subscriptions_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_subscription_id INTEGER NOT NULL, -- Original WordPress subscription ID
    wp_customer_id INTEGER, -- Original WordPress customer ID
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    
    -- Subscription details
    plan_type TEXT, -- monthly, quarterly, etc.
    status TEXT,
    wp_status TEXT, -- Original WooCommerce status
    total_amount NUMERIC(10,2) DEFAULT 0,
    billing_cycle INTEGER DEFAULT 1, -- months
    
    -- Dates
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    wp_created_at TIMESTAMP WITH TIME ZONE,
    wp_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Migration metadata
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_subscription_id UUID, -- Reference to final subscriptions.id after integration
    
    -- Constraints
    UNIQUE(wp_subscription_id)
);

-- Create staging table for payment records
CREATE TABLE migration_staging.payments_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staged_order_id UUID REFERENCES migration_staging.orders_staging(id),
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    
    -- Payment details
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT,
    order_type TEXT DEFAULT 'subscription',
    
    -- Order items breakdown
    order_items JSONB,
    
    -- Migration metadata
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_payment_id UUID, -- Reference to final payment_orders.id after integration
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product mapping helper table
CREATE TABLE migration_staging.product_toy_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_product_id INTEGER NOT NULL,
    wp_product_name TEXT,
    wp_product_sku TEXT,
    
    -- Potential toy matches
    suggested_toy_id UUID, -- Reference to toys.id
    suggested_toy_name TEXT,
    mapping_confidence TEXT, -- high, medium, low
    mapping_method TEXT, -- name_match, sku_match, manual, category_match
    
    -- Manual review
    is_reviewed BOOLEAN DEFAULT false,
    reviewer_notes TEXT,
    final_toy_id UUID, -- Final decision after review
    mapping_status TEXT DEFAULT 'pending', -- pending, mapped, unmappable, needs_review
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(wp_product_id)
);

-- Create migration batch tracking table
CREATE TABLE migration_staging.migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL UNIQUE,
    migration_type TEXT NOT NULL, -- users, orders, subscriptions, combined
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'running', -- running, completed, failed, paused
    
    -- Statistics
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    
    -- Configuration
    source_filters JSONB, -- Any filters applied during migration
    migration_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_users_staging_wp_user_id ON migration_staging.users_staging(wp_user_id);
CREATE INDEX idx_users_staging_phone ON migration_staging.users_staging(phone);
CREATE INDEX idx_users_staging_migration_status ON migration_staging.users_staging(migration_status);

CREATE INDEX idx_orders_staging_wp_order_id ON migration_staging.orders_staging(wp_order_id);
CREATE INDEX idx_orders_staging_wp_customer_id ON migration_staging.orders_staging(wp_customer_id);
CREATE INDEX idx_orders_staging_migration_status ON migration_staging.orders_staging(migration_status);

CREATE INDEX idx_order_items_staging_wp_product_id ON migration_staging.order_items_staging(wp_product_id);
CREATE INDEX idx_order_items_staging_mapping_status ON migration_staging.order_items_staging(migration_status);

CREATE INDEX idx_subscriptions_staging_wp_subscription_id ON migration_staging.subscriptions_staging(wp_subscription_id);
CREATE INDEX idx_subscriptions_staging_migration_status ON migration_staging.subscriptions_staging(migration_status);

CREATE INDEX idx_product_toy_mapping_wp_product_id ON migration_staging.product_toy_mapping(wp_product_id);
CREATE INDEX idx_product_toy_mapping_status ON migration_staging.product_toy_mapping(mapping_status);

-- Create views for easy reporting
CREATE VIEW migration_staging.migration_summary AS
SELECT 
    mb.batch_name,
    mb.migration_type,
    mb.status as batch_status,
    mb.total_records,
    mb.successful_records,
    mb.failed_records,
    mb.start_time,
    mb.end_time,
    CASE 
        WHEN mb.total_records > 0 THEN 
            ROUND((mb.successful_records::DECIMAL / mb.total_records) * 100, 2)
        ELSE 0 
    END as success_percentage
FROM migration_staging.migration_batches mb
ORDER BY mb.created_at DESC;

CREATE VIEW migration_staging.product_mapping_summary AS
SELECT 
    mapping_status,
    COUNT(*) as count,
    ROUND((COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM migration_staging.product_toy_mapping)) * 100, 2) as percentage
FROM migration_staging.product_toy_mapping
GROUP BY mapping_status
ORDER BY count DESC;

-- Create function to automatically suggest toy mappings based on name similarity
CREATE OR REPLACE FUNCTION migration_staging.suggest_toy_mappings()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    mapping_record RECORD;
    toy_record RECORD;
    suggestion_count INTEGER := 0;
BEGIN
    -- Loop through unmapped products
    FOR mapping_record IN 
        SELECT wp_product_id, wp_product_name, wp_product_sku
        FROM migration_staging.product_toy_mapping 
        WHERE mapping_status = 'pending'
    LOOP
        -- Try to find matching toys by name similarity
        SELECT id, name INTO toy_record
        FROM toys 
        WHERE LOWER(name) LIKE '%' || LOWER(SPLIT_PART(mapping_record.wp_product_name, ' ', 1)) || '%'
           OR LOWER(mapping_record.wp_product_name) LIKE '%' || LOWER(SPLIT_PART(name, ' ', 1)) || '%'
        LIMIT 1;
        
        IF FOUND THEN
            UPDATE migration_staging.product_toy_mapping
            SET 
                suggested_toy_id = toy_record.id,
                suggested_toy_name = toy_record.name,
                mapping_confidence = 'medium',
                mapping_method = 'name_match',
                mapping_status = 'needs_review'
            WHERE wp_product_id = mapping_record.wp_product_id;
            
            suggestion_count := suggestion_count + 1;
        END IF;
    END LOOP;
    
    RETURN suggestion_count;
END;
$$;

-- Add comments for documentation
COMMENT ON SCHEMA migration_staging IS 'Staging area for WooCommerce migration data before integration';
COMMENT ON TABLE migration_staging.users_staging IS 'Staging table for migrated WooCommerce users';
COMMENT ON TABLE migration_staging.orders_staging IS 'Staging table for migrated WooCommerce orders';
COMMENT ON TABLE migration_staging.order_items_staging IS 'Staging table for migrated WooCommerce order items';
COMMENT ON TABLE migration_staging.subscriptions_staging IS 'Staging table for migrated WooCommerce subscriptions';
COMMENT ON TABLE migration_staging.product_toy_mapping IS 'Mapping table to link WooCommerce products to Supabase toys';
COMMENT ON FUNCTION migration_staging.suggest_toy_mappings() IS 'Automatically suggests toy mappings based on name similarity';

-- Grant permissions (adjust as needed for your setup)
-- GRANT USAGE ON SCHEMA migration_staging TO your_app_role;
-- GRANT ALL ON ALL TABLES IN SCHEMA migration_staging TO your_app_role; 