-- ========================================
-- PICKUP SYSTEM DATABASE SCHEMA
-- Day-wise Pincode Pickup Management System
-- ========================================

-- ========================================
-- 1. PINCODE PICKUP SCHEDULE TABLE
-- Maps pincodes to specific pickup days
-- ========================================

CREATE TABLE IF NOT EXISTS public.pincode_pickup_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Pincode information
    pincode VARCHAR(6) NOT NULL,
    area_name VARCHAR(100),
    zone VARCHAR(50), -- North, South, East, West Bangalore
    
    -- Day assignment
    pickup_day VARCHAR(10) NOT NULL CHECK (pickup_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    delivery_day VARCHAR(10) NOT NULL CHECK (delivery_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    
    -- Capacity management
    max_pickups_per_day INTEGER DEFAULT 25,
    min_pickups_per_day INTEGER DEFAULT 10,
    current_capacity_used INTEGER DEFAULT 0,
    
    -- Status and priority
    is_active BOOLEAN DEFAULT TRUE,
    priority_level INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low priority
    
    -- Operational details
    estimated_travel_time_minutes INTEGER DEFAULT 30, -- Average travel time in this area
    pickup_window_start TIME DEFAULT '09:00:00',
    pickup_window_end TIME DEFAULT '18:00:00',
    
    -- Administrative
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    UNIQUE(pincode)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pincode_pickup_schedule_pincode ON public.pincode_pickup_schedule(pincode);
CREATE INDEX IF NOT EXISTS idx_pincode_pickup_schedule_pickup_day ON public.pincode_pickup_schedule(pickup_day);
CREATE INDEX IF NOT EXISTS idx_pincode_pickup_schedule_zone ON public.pincode_pickup_schedule(zone);
CREATE INDEX IF NOT EXISTS idx_pincode_pickup_schedule_active ON public.pincode_pickup_schedule(is_active);

-- ========================================
-- 2. PICKUP ROUTES TABLE
-- Tracks daily pickup schedules and routes
-- ========================================

CREATE TABLE IF NOT EXISTS public.pickup_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Route identification
    route_name VARCHAR(100) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_day VARCHAR(10) NOT NULL,
    
    -- Route details
    assigned_driver_id UUID, -- Can link to staff/driver table later
    assigned_driver_name VARCHAR(100),
    vehicle_number VARCHAR(20),
    
    -- Capacity and planning
    total_planned_pickups INTEGER DEFAULT 0,
    total_completed_pickups INTEGER DEFAULT 0,
    total_failed_pickups INTEGER DEFAULT 0,
    
    -- Timing
    route_start_time TIME,
    route_end_time TIME,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Geographic coverage
    covered_pincodes TEXT[], -- Array of pincodes covered in this route
    covered_zones VARCHAR(100), -- Areas covered: "South Bangalore, BTM, Jayanagar"
    
    -- Route optimization
    optimized_order JSONB, -- Optimized sequence of pickup addresses
    total_distance_km DECIMAL(8,2),
    total_fuel_cost DECIMAL(8,2),
    
    -- Status tracking
    route_status VARCHAR(20) DEFAULT 'planned' CHECK (route_status IN ('planned', 'in_progress', 'completed', 'cancelled', 'failed')),
    
    -- Performance metrics
    success_rate DECIMAL(5,2), -- Percentage of successful pickups
    customer_satisfaction_score DECIMAL(3,2), -- Average rating from customers
    
    -- Administrative
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    UNIQUE(route_name, pickup_date)
);

-- Create indexes for pickup routes
CREATE INDEX IF NOT EXISTS idx_pickup_routes_pickup_date ON public.pickup_routes(pickup_date);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_pickup_day ON public.pickup_routes(pickup_day);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_status ON public.pickup_routes(route_status);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_driver ON public.pickup_routes(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_pickup_routes_pincodes ON public.pickup_routes USING GIN(covered_pincodes);

-- ========================================
-- 3. SCHEDULED PICKUPS TABLE
-- Individual pickup appointments
-- ========================================

CREATE TABLE IF NOT EXISTS public.scheduled_pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    rental_order_id UUID REFERENCES public.rental_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.custom_users(id) ON DELETE CASCADE,
    pickup_route_id UUID REFERENCES public.pickup_routes(id) ON DELETE SET NULL,
    
    -- Pickup scheduling
    scheduled_pickup_date DATE NOT NULL,
    scheduled_pickup_time_start TIME,
    scheduled_pickup_time_end TIME,
    pickup_day VARCHAR(10) NOT NULL,
    
    -- Customer information
    customer_name VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_address JSONB,
    pincode VARCHAR(6) NOT NULL,
    
    -- Subscription cycle information
    subscription_id UUID,
    cycle_number INTEGER,
    cycle_end_date DATE,
    days_into_cycle INTEGER, -- Which day of the 30-day cycle
    
    -- Toys information
    toys_to_pickup JSONB, -- Array of toys that need to be picked up
    toys_count INTEGER DEFAULT 0,
    estimated_pickup_value DECIMAL(10,2),
    
    -- Pickup execution
    actual_pickup_date DATE,
    actual_pickup_time TIME,
    pickup_status VARCHAR(20) DEFAULT 'scheduled' CHECK (pickup_status IN ('scheduled', 'confirmed', 'in_transit', 'completed', 'failed', 'rescheduled', 'cancelled')),
    
    -- Completion details
    toys_actually_collected JSONB,
    toys_collected_count INTEGER DEFAULT 0,
    toys_missing_count INTEGER DEFAULT 0,
    toys_damaged_count INTEGER DEFAULT 0,
    
    -- Customer interaction
    customer_was_present BOOLEAN,
    pickup_notes TEXT,
    customer_feedback TEXT,
    customer_satisfaction INTEGER, -- 1-5 rating
    
    -- Notification tracking
    notification_sent_date DATE,
    days_advance_notice INTEGER DEFAULT 5,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Rescheduling
    reschedule_count INTEGER DEFAULT 0,
    reschedule_reason TEXT,
    original_scheduled_date DATE,
    
    -- Administrative
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for scheduled pickups
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_rental_order ON public.scheduled_pickups(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_user ON public.scheduled_pickups(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_route ON public.scheduled_pickups(pickup_route_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_date ON public.scheduled_pickups(scheduled_pickup_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_status ON public.scheduled_pickups(pickup_status);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_pincode ON public.scheduled_pickups(pincode);
CREATE INDEX IF NOT EXISTS idx_scheduled_pickups_subscription ON public.scheduled_pickups(subscription_id);

-- ========================================
-- 4. EXTEND EXISTING TABLES
-- Add pickup tracking to existing rental_orders and dispatch_orders
-- ========================================

-- Add pickup tracking fields to rental_orders
ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS pickup_scheduled_date DATE,
ADD COLUMN IF NOT EXISTS pickup_status VARCHAR(20) DEFAULT 'not_scheduled' CHECK (pickup_status IN ('not_scheduled', 'scheduled', 'confirmed', 'in_transit', 'completed', 'failed', 'rescheduled')),
ADD COLUMN IF NOT EXISTS pickup_notification_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pickup_notification_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_pickup_id UUID REFERENCES public.scheduled_pickups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS customer_pickup_day VARCHAR(10), -- Store customer's area pickup day
ADD COLUMN IF NOT EXISTS pickup_cycle_day INTEGER; -- Which day of cycle pickup was scheduled

-- Add pickup tracking to dispatch_orders if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispatch_orders' AND table_schema = 'public') THEN
        ALTER TABLE public.dispatch_orders 
        ADD COLUMN IF NOT EXISTS return_pickup_scheduled_date DATE,
        ADD COLUMN IF NOT EXISTS return_pickup_status VARCHAR(20) DEFAULT 'pending' CHECK (return_pickup_status IN ('pending', 'scheduled', 'in_transit', 'completed', 'failed')),
        ADD COLUMN IF NOT EXISTS scheduled_pickup_id UUID REFERENCES public.scheduled_pickups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ========================================
-- 5. PICKUP SYSTEM CONFIGURATION TABLE
-- System-wide settings for pickup management
-- ========================================

CREATE TABLE IF NOT EXISTS public.pickup_system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration key-value pairs
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'integer', 'boolean', 'json')),
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Administrative
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default configuration
INSERT INTO public.pickup_system_config (config_key, config_value, config_type, description) VALUES
('advance_notice_days', '5', 'integer', 'Days in advance to notify customers about pickup'),
('pickup_window_start', '09:00', 'string', 'Default pickup window start time'),
('pickup_window_end', '18:00', 'string', 'Default pickup window end time'),
('max_daily_capacity', '25', 'integer', 'Maximum pickups per day per area'),
('min_daily_capacity', '10', 'integer', 'Minimum pickups per day per area'),
('pickup_cycle_days', '[28,29,30]', 'json', 'Days in subscription cycle when pickup can be scheduled'),
('auto_schedule_enabled', 'true', 'boolean', 'Whether to automatically schedule pickups'),
('notification_enabled', 'true', 'boolean', 'Whether to send pickup notifications'),
('reschedule_limit', '2', 'integer', 'Maximum number of reschedules allowed per pickup'),
('route_optimization_enabled', 'true', 'boolean', 'Whether to optimize pickup routes')
ON CONFLICT (config_key) DO NOTHING;

-- ========================================
-- 6. FUNCTIONS FOR PICKUP MANAGEMENT
-- ========================================

-- Function to get pickup day for a pincode
CREATE OR REPLACE FUNCTION get_pickup_day_for_pincode(p_pincode VARCHAR(6))
RETURNS VARCHAR(10) AS $$
DECLARE
    v_pickup_day VARCHAR(10);
BEGIN
    SELECT pickup_day INTO v_pickup_day
    FROM public.pincode_pickup_schedule
    WHERE pincode = p_pincode AND is_active = TRUE;
    
    RETURN COALESCE(v_pickup_day, 'monday'); -- Default to Monday if not found
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next pickup date based on pincode and cycle
CREATE OR REPLACE FUNCTION calculate_next_pickup_date(
    p_pincode VARCHAR(6),
    p_cycle_start_date DATE,
    p_current_cycle_day INTEGER DEFAULT NULL
)
RETURNS DATE AS $$
DECLARE
    v_pickup_day VARCHAR(10);
    v_cycle_day INTEGER;
    v_target_date DATE;
    v_pickup_date DATE;
BEGIN
    -- Get pickup day for pincode
    SELECT pickup_day INTO v_pickup_day
    FROM public.pincode_pickup_schedule
    WHERE pincode = p_pincode AND is_active = TRUE;
    
    -- Default to Monday if not found
    v_pickup_day := COALESCE(v_pickup_day, 'monday');
    
    -- Determine cycle day to schedule pickup (default to day 28)
    v_cycle_day := COALESCE(p_current_cycle_day, 28);
    
    -- Calculate target date (cycle start + cycle day)
    v_target_date := p_cycle_start_date + INTERVAL '1 day' * (v_cycle_day - 1);
    
    -- Find next occurrence of pickup day on or after target date
    v_pickup_date := v_target_date + INTERVAL '1 day' * (
        (CASE v_pickup_day
            WHEN 'monday' THEN 1
            WHEN 'tuesday' THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday' THEN 4
            WHEN 'friday' THEN 5
            WHEN 'saturday' THEN 6
            WHEN 'sunday' THEN 0
        END - EXTRACT(DOW FROM v_target_date) + 7) % 7
    );
    
    RETURN v_pickup_date;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-schedule pickup for rental order
CREATE OR REPLACE FUNCTION auto_schedule_pickup_for_order(p_rental_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order_record RECORD;
    v_pickup_date DATE;
    v_pickup_day VARCHAR(10);
    v_scheduled_pickup_id UUID;
BEGIN
    -- Get order details
    SELECT ro.*, cu.phone, cu.full_name, 
           COALESCE(ro.shipping_address->>'pincode', cu.zip_code) as customer_pincode
    INTO v_order_record
    FROM public.rental_orders ro
    JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.id = p_rental_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental order not found: %', p_rental_order_id;
    END IF;
    
    -- Calculate pickup date
    v_pickup_date := calculate_next_pickup_date(
        v_order_record.customer_pincode,
        v_order_record.rental_start_date,
        28 -- Schedule at day 28 of cycle
    );
    
    -- Get pickup day
    v_pickup_day := get_pickup_day_for_pincode(v_order_record.customer_pincode);
    
    -- Create scheduled pickup
    INSERT INTO public.scheduled_pickups (
        rental_order_id,
        user_id,
        scheduled_pickup_date,
        pickup_day,
        customer_name,
        customer_phone,
        customer_address,
        pincode,
        subscription_id,
        cycle_number,
        cycle_end_date,
        days_into_cycle,
        toys_to_pickup,
        toys_count,
        notification_sent_date,
        pickup_status
    ) VALUES (
        p_rental_order_id,
        v_order_record.user_id,
        v_pickup_date,
        v_pickup_day,
        v_order_record.customer_name,
        v_order_record.phone,
        v_order_record.shipping_address,
        v_order_record.customer_pincode,
        v_order_record.subscription_id,
        v_order_record.cycle_number,
        v_order_record.rental_end_date,
        28,
        v_order_record.toys_data,
        COALESCE(jsonb_array_length(v_order_record.toys_data), 0),
        v_pickup_date - INTERVAL '5 days', -- 5 days advance notice
        'scheduled'
    ) RETURNING id INTO v_scheduled_pickup_id;
    
    -- Update rental order
    UPDATE public.rental_orders
    SET pickup_scheduled_date = v_pickup_date,
        pickup_status = 'scheduled',
        scheduled_pickup_id = v_scheduled_pickup_id,
        customer_pickup_day = v_pickup_day,
        pickup_cycle_day = 28
    WHERE id = p_rental_order_id;
    
    RETURN v_scheduled_pickup_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. TRIGGERS FOR AUTOMATIC PICKUP SCHEDULING
-- ========================================

-- Trigger function to auto-schedule pickup when order is delivered
CREATE OR REPLACE FUNCTION trigger_auto_schedule_pickup()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-schedule pickup when order status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Schedule pickup for day 28 of cycle
        PERFORM auto_schedule_pickup_for_order(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on rental_orders
DROP TRIGGER IF EXISTS trigger_auto_pickup_schedule ON public.rental_orders;
CREATE TRIGGER trigger_auto_pickup_schedule
    AFTER UPDATE ON public.rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_schedule_pickup();

-- ========================================
-- 8. VIEWS FOR PICKUP MANAGEMENT
-- ========================================

-- View for daily pickup schedules
CREATE OR REPLACE VIEW public.daily_pickup_schedule AS
SELECT 
    pr.id as route_id,
    pr.route_name,
    pr.pickup_date,
    pr.pickup_day,
    pr.assigned_driver_name,
    pr.route_status,
    COUNT(sp.id) as total_pickups,
    COUNT(CASE WHEN sp.pickup_status = 'completed' THEN 1 END) as completed_pickups,
    COUNT(CASE WHEN sp.pickup_status = 'failed' THEN 1 END) as failed_pickups,
    STRING_AGG(DISTINCT sp.pincode, ', ') as covered_pincodes,
    SUM(sp.toys_count) as total_toys_to_collect
FROM public.pickup_routes pr
LEFT JOIN public.scheduled_pickups sp ON pr.id = sp.pickup_route_id
GROUP BY pr.id, pr.route_name, pr.pickup_date, pr.pickup_day, pr.assigned_driver_name, pr.route_status
ORDER BY pr.pickup_date, pr.route_name;

-- View for pickup performance metrics
CREATE OR REPLACE VIEW public.pickup_performance_metrics AS
SELECT 
    pickup_day,
    COUNT(*) as total_scheduled_pickups,
    COUNT(CASE WHEN pickup_status = 'completed' THEN 1 END) as completed_pickups,
    COUNT(CASE WHEN pickup_status = 'failed' THEN 1 END) as failed_pickups,
    ROUND(
        COUNT(CASE WHEN pickup_status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as success_rate,
    AVG(customer_satisfaction) as avg_customer_satisfaction,
    SUM(toys_collected_count) as total_toys_collected
FROM public.scheduled_pickups
WHERE scheduled_pickup_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY pickup_day
ORDER BY pickup_day;

-- ========================================
-- 9. POPULATE INITIAL PINCODE DATA
-- (Based on the Bangalore pincodes from the WordPress system)
-- ========================================

-- Insert Bangalore pincode mapping (sample data - you can expand this)
INSERT INTO public.pincode_pickup_schedule (pincode, area_name, zone, pickup_day, delivery_day) VALUES
-- Monday - Central Bangalore
('560002', 'Bangalore City', 'Central', 'monday', 'monday'),
('560004', 'Bangalore Cantonment', 'Central', 'monday', 'monday'),
('560011', 'Shivajinagar', 'Central', 'monday', 'monday'),
('560018', 'Malleswaram', 'Central', 'monday', 'monday'),

-- Tuesday - South Bangalore  
('560041', 'Jayanagar', 'South', 'tuesday', 'tuesday'),
('560034', 'Bommanahalli', 'South', 'tuesday', 'tuesday'),
('560047', 'Padmanabhanagar', 'South', 'tuesday', 'tuesday'),
('560076', 'BTM Layout', 'South', 'tuesday', 'tuesday'),

-- Wednesday - East Bangalore
('560037', 'Whitefield', 'East', 'wednesday', 'wednesday'),
('560048', 'ITPL', 'East', 'wednesday', 'wednesday'),
('560066', 'Whitefield Extension', 'East', 'wednesday', 'wednesday'),
('560067', 'Whitefield Road', 'East', 'wednesday', 'wednesday'),

-- Thursday - West Bangalore
('560020', 'Rajajinagar', 'West', 'thursday', 'thursday'),
('560010', 'Yeshwantpur', 'West', 'thursday', 'thursday'),
('560022', 'Vijayanagar', 'West', 'thursday', 'thursday'),

-- Friday - North Bangalore
('560024', 'Hebbal', 'North', 'friday', 'friday'),
('560077', 'RT Nagar', 'North', 'friday', 'friday'),
('560032', 'Sadashivanagar', 'North', 'friday', 'friday')

ON CONFLICT (pincode) DO NOTHING;

-- Add pickup_day column to custom_users if it doesn't exist
ALTER TABLE public.custom_users 
ADD COLUMN IF NOT EXISTS pickup_day VARCHAR(10);

-- Update existing users with pickup day based on their pincode
UPDATE public.custom_users cu
SET pickup_day = pps.pickup_day
FROM public.pincode_pickup_schedule pps
WHERE cu.zip_code = pps.pincode
AND pps.is_active = TRUE;

COMMENT ON TABLE public.pincode_pickup_schedule IS 'Maps pincodes to specific pickup days for efficient route planning';
COMMENT ON TABLE public.pickup_routes IS 'Daily pickup routes and driver assignments';
COMMENT ON TABLE public.scheduled_pickups IS 'Individual pickup appointments linked to rental orders';
COMMENT ON TABLE public.pickup_system_config IS 'System-wide configuration for pickup management'; 