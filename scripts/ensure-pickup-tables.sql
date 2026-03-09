-- ========================================
-- ENSURE PICKUP SYSTEM TABLES EXIST
-- ========================================
-- This script ensures all pickup system tables exist before populating May 2025 data
-- Run this before executing the populate-may-2025-pickup-data.js script

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PICKUP SYSTEM CONFIG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS pickup_system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) NOT NULL CHECK (config_type IN ('string', 'integer', 'boolean', 'float')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PICKUP REQUESTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS pickup_requests (
    id TEXT PRIMARY KEY,
    rental_order_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    pickup_date DATE NOT NULL,
    pickup_time_slot VARCHAR(20) DEFAULT 'morning' CHECK (pickup_time_slot IN ('morning', 'afternoon', 'evening')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'failed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    special_instructions TEXT,
    pickup_type VARCHAR(20) DEFAULT 'return' CHECK (pickup_type IN ('return', 'exchange', 'maintenance')),
    estimated_toy_count INTEGER DEFAULT 0,
    actual_toy_count INTEGER,
    pickup_notes TEXT,
    driver_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_pickup_customer FOREIGN KEY (customer_id) REFERENCES custom_users(id) ON DELETE CASCADE
);

-- ========================================
-- SCHEDULED PICKUPS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS scheduled_pickups (
    id TEXT PRIMARY KEY,
    pickup_request_id TEXT NOT NULL,
    customer_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    pickup_date DATE NOT NULL,
    time_slot VARCHAR(20) DEFAULT 'morning',
    pickup_address JSONB,
    pincode VARCHAR(10),
    pickup_day_number INTEGER CHECK (pickup_day_number BETWEEN 1 AND 7),
    route_id TEXT,
    driver_id UUID,
    status VARCHAR(30) DEFAULT 'scheduled',
    capacity_used INTEGER DEFAULT 1,
    estimated_duration INTEGER DEFAULT 15, -- minutes
    actual_duration INTEGER,
    special_instructions TEXT,
    driver_assigned_at TIMESTAMP WITH TIME ZONE,
    pickup_started_at TIMESTAMP WITH TIME ZONE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_scheduled_pickup_request FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_pickup_customer FOREIGN KEY (customer_id) REFERENCES custom_users(id) ON DELETE CASCADE
);

-- ========================================
-- PICKUP ROUTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS pickup_routes (
    id TEXT PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    route_date DATE NOT NULL,
    driver_id UUID,
    status VARCHAR(30) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    total_pickups INTEGER DEFAULT 0,
    completed_pickups INTEGER DEFAULT 0,
    estimated_duration INTEGER DEFAULT 0, -- minutes
    actual_duration INTEGER,
    route_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PICKUP NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS pickup_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pickup_request_id TEXT NOT NULL,
    customer_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('advance_notice', 'day_before', 'morning_reminder', 'driver_assigned', 'pickup_started', 'pickup_completed')),
    notification_method VARCHAR(20) NOT NULL CHECK (notification_method IN ('sms', 'email', 'push', 'whatsapp')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    message_content TEXT,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_notification_pickup FOREIGN KEY (pickup_request_id) REFERENCES pickup_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_customer FOREIGN KEY (customer_id) REFERENCES custom_users(id) ON DELETE CASCADE
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Pickup requests indexes
CREATE INDEX IF NOT EXISTS idx_pickup_requests_customer ON pickup_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_date ON pickup_requests(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_rental_order ON pickup_requests(rental_order_id);

-- Scheduled pickups indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_date ON scheduled_pickups(pickup_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_route ON scheduled_pickups(route_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_driver ON scheduled_pickups(driver_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_status ON scheduled_pickups(status);

-- Pickup routes indexes
CREATE INDEX IF NOT EXISTS idx_pickup_routes_date ON pickup_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_driver ON pickup_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_status ON pickup_routes(status);

-- Pickup notifications indexes
CREATE INDEX IF NOT EXISTS idx_pickup_notifications_customer ON pickup_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_pickup_notifications_scheduled ON pickup_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_pickup_notifications_status ON pickup_notifications(status);

-- ========================================
-- INSERT DEFAULT CONFIGURATION
-- ========================================
INSERT INTO pickup_system_config (config_key, config_value, config_type, description, is_active)
VALUES 
    ('advance_notice_days', '5', 'integer', 'Days in advance to notify customers about pickups', true),
    ('max_daily_capacity', '25', 'integer', 'Maximum pickups that can be scheduled per day', true),
    ('pickup_cycle_days', '30', 'integer', 'Default rental cycle length in days', true),
    ('auto_schedule_enabled', 'true', 'boolean', 'Whether to automatically schedule pickups', true),
    ('min_pickups_per_day', '10', 'integer', 'Minimum pickups required to create a route', true),
    ('max_pickups_per_day', '25', 'integer', 'Maximum pickups allowed per day', true),
    ('default_time_slot', 'morning', 'string', 'Default pickup time slot', true),
    ('notification_enabled', 'true', 'boolean', 'Whether to send pickup notifications', true)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
DO $$
BEGIN
    -- Check if all tables exist
    PERFORM 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name IN (
        'pickup_system_config', 'pickup_requests', 'scheduled_pickups', 
        'pickup_routes', 'pickup_notifications'
    );
    
    RAISE NOTICE '✅ All pickup system tables have been created successfully';
    
    -- Show configuration
    RAISE NOTICE '📋 Pickup system configuration:';
    FOR rec IN SELECT config_key, config_value FROM pickup_system_config WHERE is_active = true ORDER BY config_key
    LOOP
        RAISE NOTICE '   - %: %', rec.config_key, rec.config_value;
    END LOOP;
    
END $$; 