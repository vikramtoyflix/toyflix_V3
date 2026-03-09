-- Step-by-Step Staging Tables Creation
-- Run each step separately in Supabase SQL Editor

-- STEP 1: Create the schema
CREATE SCHEMA IF NOT EXISTS migration_staging;

-- STEP 2: Create users_staging table
CREATE TABLE IF NOT EXISTS migration_staging.users_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_user_id INTEGER NOT NULL,
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
    wp_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_user_id UUID,
    UNIQUE(wp_user_id),
    UNIQUE(phone)
);

-- STEP 3: Create orders_staging table
CREATE TABLE IF NOT EXISTS migration_staging.orders_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_order_id INTEGER NOT NULL,
    wp_customer_id INTEGER,
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    total_amount NUMERIC(10,2) DEFAULT 0,
    status TEXT,
    wp_status TEXT,
    currency TEXT DEFAULT 'INR',
    shipping_address JSONB,
    wp_created_at TIMESTAMP WITH TIME ZONE,
    wp_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_order_id UUID,
    UNIQUE(wp_order_id)
);

-- STEP 4: Create order_items_staging table
CREATE TABLE IF NOT EXISTS migration_staging.order_items_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_order_item_id INTEGER NOT NULL,
    staged_order_id UUID REFERENCES migration_staging.orders_staging(id),
    wp_product_id INTEGER,
    product_name TEXT,
    product_sku TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    mapped_toy_id UUID,
    mapping_confidence TEXT,
    mapping_notes TEXT,
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_item_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(wp_order_item_id)
);

-- STEP 5: Create product_toy_mapping table (MOST IMPORTANT)
CREATE TABLE IF NOT EXISTS migration_staging.product_toy_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_product_id INTEGER NOT NULL,
    wp_product_name TEXT,
    wp_product_sku TEXT,
    suggested_toy_id UUID,
    suggested_toy_name TEXT,
    mapping_confidence TEXT,
    mapping_method TEXT,
    is_reviewed BOOLEAN DEFAULT false,
    reviewer_notes TEXT,
    final_toy_id UUID,
    mapping_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(wp_product_id)
);

-- STEP 6: Create migration_batches table
CREATE TABLE IF NOT EXISTS migration_staging.migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name TEXT NOT NULL UNIQUE,
    migration_type TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'running',
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    source_filters JSONB,
    migration_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 7: Create subscriptions_staging table
CREATE TABLE IF NOT EXISTS migration_staging.subscriptions_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_subscription_id INTEGER NOT NULL,
    wp_customer_id INTEGER,
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    plan_type TEXT,
    status TEXT,
    wp_status TEXT,
    total_amount NUMERIC(10,2) DEFAULT 0,
    billing_cycle INTEGER DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    wp_created_at TIMESTAMP WITH TIME ZONE,
    wp_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_subscription_id UUID,
    UNIQUE(wp_subscription_id)
);

-- STEP 8: Create payments_staging table
CREATE TABLE IF NOT EXISTS migration_staging.payments_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staged_order_id UUID REFERENCES migration_staging.orders_staging(id),
    staged_user_id UUID REFERENCES migration_staging.users_staging(id),
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT,
    order_type TEXT DEFAULT 'subscription',
    order_items JSONB,
    migration_batch TEXT,
    migration_status TEXT DEFAULT 'pending',
    integration_notes TEXT,
    integrated_payment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- STEP 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_staging_wp_user_id ON migration_staging.users_staging(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_users_staging_phone ON migration_staging.users_staging(phone);
CREATE INDEX IF NOT EXISTS idx_users_staging_migration_status ON migration_staging.users_staging(migration_status);

CREATE INDEX IF NOT EXISTS idx_orders_staging_wp_order_id ON migration_staging.orders_staging(wp_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_staging_wp_customer_id ON migration_staging.orders_staging(wp_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_staging_migration_status ON migration_staging.orders_staging(migration_status);

CREATE INDEX IF NOT EXISTS idx_order_items_staging_wp_product_id ON migration_staging.order_items_staging(wp_product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_staging_mapping_status ON migration_staging.order_items_staging(migration_status);

CREATE INDEX IF NOT EXISTS idx_product_toy_mapping_wp_product_id ON migration_staging.product_toy_mapping(wp_product_id);
CREATE INDEX IF NOT EXISTS idx_product_toy_mapping_status ON migration_staging.product_toy_mapping(mapping_status);

-- STEP 10: Test the setup
SELECT 'Staging tables created successfully!' as message;

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'migration_staging'
ORDER BY table_name; 