-- ========================================
-- TOY EXCHANGE SYSTEM DATABASE SCHEMA
-- Intelligent Dispatch & Pickup Management for Toy Rental Business
-- ========================================

-- ========================================
-- 1. TOY EXCHANGES TABLE
-- Main table for managing toy exchanges, pickups, and dispatches
-- ========================================

CREATE TABLE IF NOT EXISTS public.toy_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Order Classification
    rental_order_id UUID REFERENCES public.rental_orders(id) ON DELETE CASCADE,
    exchange_type VARCHAR(20) NOT NULL CHECK (exchange_type IN ('EXCHANGE', 'PICKUP_ONLY', 'DISPATCH_ONLY', 'FIRST_DELIVERY')),
    order_classification VARCHAR(10) NOT NULL CHECK (order_classification IN ('SUB', 'QU', 'REGULAR')),
    
    -- Customer Information
    customer_id UUID REFERENCES public.custom_users(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_address JSONB,
    pincode VARCHAR(6) NOT NULL,
    assigned_day VARCHAR(10) NOT NULL CHECK (assigned_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    
    -- Subscription Context
    subscription_plan VARCHAR(50),
    cycle_number INTEGER,
    is_pause_order BOOLEAN DEFAULT FALSE,
    is_resume_order BOOLEAN DEFAULT FALSE,
    
    -- Exchange Details
    scheduled_date DATE NOT NULL,
    scheduled_time_slot VARCHAR(20), -- "10:00-12:00"
    
    -- Toys Information
    toys_to_pickup JSONB DEFAULT '[]'::jsonb, -- Old toys to collect
    toys_to_dispatch JSONB DEFAULT '[]'::jsonb, -- New toys to deliver
    pickup_toy_count INTEGER DEFAULT 0,
    dispatch_toy_count INTEGER DEFAULT 0,
    
    -- Execution Status
    exchange_status VARCHAR(20) DEFAULT 'scheduled' CHECK (exchange_status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'failed', 'cancelled', 'rescheduled')),
    pickup_completed BOOLEAN DEFAULT FALSE,
    dispatch_completed BOOLEAN DEFAULT FALSE,
    
    -- Route Information (simplified - no driver assignment)
    route_sequence INTEGER, -- Order in the daily route
    estimated_duration_minutes INTEGER DEFAULT 30,
    
    -- Completion Details
    actual_exchange_date DATE,
    actual_exchange_time TIME,
    toys_actually_collected JSONB DEFAULT '[]'::jsonb,
    toys_actually_delivered JSONB DEFAULT '[]'::jsonb,
    exchange_notes TEXT,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    
    -- Quality Control
    toys_condition_on_pickup JSONB DEFAULT '[]'::jsonb, -- Condition assessment of returned toys
    toys_condition_on_dispatch JSONB DEFAULT '[]'::jsonb, -- Condition of dispatched toys
    
    -- Administrative
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_rental_order ON public.toy_exchanges(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_customer ON public.toy_exchanges(customer_id);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_date ON public.toy_exchanges(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_day ON public.toy_exchanges(assigned_day);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_pincode ON public.toy_exchanges(pincode);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_status ON public.toy_exchanges(exchange_status);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_type ON public.toy_exchanges(exchange_type);

-- ========================================
-- 2. EXCHANGE CAPACITY MANAGEMENT TABLE
-- Track daily capacity by pincode and day
-- ========================================

CREATE TABLE IF NOT EXISTS public.exchange_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Location and Time
    pincode VARCHAR(6) NOT NULL,
    assigned_day VARCHAR(10) NOT NULL,
    service_date DATE NOT NULL,
    
    -- Capacity Information
    max_exchanges_per_day INTEGER DEFAULT 25,
    current_exchanges_count INTEGER DEFAULT 0,
    available_capacity INTEGER GENERATED ALWAYS AS (max_exchanges_per_day - current_exchanges_count) STORED,
    
    -- Time Slot Management
    available_time_slots JSONB DEFAULT '["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"]'::jsonb,
    booked_time_slots JSONB DEFAULT '[]'::jsonb,
    
    -- Zone Information
    zone VARCHAR(50), -- North, South, East, West Bangalore
    area_name VARCHAR(100),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Administrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Constraints
    UNIQUE(pincode, service_date)
);

-- Create indexes for capacity management
CREATE INDEX IF NOT EXISTS idx_exchange_capacity_pincode_date ON public.exchange_capacity(pincode, service_date);
CREATE INDEX IF NOT EXISTS idx_exchange_capacity_day ON public.exchange_capacity(assigned_day);
CREATE INDEX IF NOT EXISTS idx_exchange_capacity_zone ON public.exchange_capacity(zone);

-- ========================================
-- 3. SUBSCRIPTION PAUSE/RESUME TRACKING
-- Track pause and resume operations for Silver/Gold plans
-- ========================================

CREATE TABLE IF NOT EXISTS public.subscription_pause_resume (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Subscription Information
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.custom_users(id) ON DELETE CASCADE,
    subscription_plan VARCHAR(50) NOT NULL,
    
    -- Operation Type
    operation_type VARCHAR(10) NOT NULL CHECK (operation_type IN ('PAUSE', 'RESUME')),
    operation_status VARCHAR(20) DEFAULT 'requested' CHECK (operation_status IN ('requested', 'scheduled', 'in_progress', 'completed', 'failed')),
    
    -- Pause Details (for PAUSE operations)
    pause_requested_at TIMESTAMP WITH TIME ZONE,
    toys_to_collect JSONB DEFAULT '[]'::jsonb,
    pickup_scheduled_date DATE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Resume Details (for RESUME operations)
    resume_requested_at TIMESTAMP WITH TIME ZONE,
    toys_to_deliver JSONB DEFAULT '[]'::jsonb,
    dispatch_scheduled_date DATE,
    dispatch_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Customer Information
    customer_pincode VARCHAR(6),
    customer_assigned_day VARCHAR(10),
    
    -- Exchange Reference
    exchange_id UUID REFERENCES public.toy_exchanges(id) ON DELETE SET NULL,
    
    -- Administrative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for pause/resume tracking
CREATE INDEX IF NOT EXISTS idx_pause_resume_subscription ON public.subscription_pause_resume(subscription_id);
CREATE INDEX IF NOT EXISTS idx_pause_resume_user ON public.subscription_pause_resume(user_id);
CREATE INDEX IF NOT EXISTS idx_pause_resume_operation ON public.subscription_pause_resume(operation_type);
CREATE INDEX IF NOT EXISTS idx_pause_resume_status ON public.subscription_pause_resume(operation_status);

-- ========================================
-- 4. EXTEND EXISTING TABLES
-- Add exchange tracking to existing rental_orders
-- ========================================

-- Add exchange tracking fields to rental_orders
ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS exchange_scheduled_date DATE,
ADD COLUMN IF NOT EXISTS exchange_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS exchange_status VARCHAR(20) DEFAULT 'not_scheduled',
ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES public.toy_exchanges(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requires_pickup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS requires_dispatch BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_pause_order BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_resume_order BOOLEAN DEFAULT FALSE;

-- ========================================
-- 5. FUNCTIONS FOR INTELLIGENT EXCHANGE MANAGEMENT
-- ========================================

-- Function to determine exchange type for an order
CREATE OR REPLACE FUNCTION determine_exchange_type(p_rental_order_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_order_record RECORD;
    v_current_toys_count INTEGER;
    v_exchange_type TEXT;
BEGIN
    -- Get order details
    SELECT ro.*, cu.phone, cu.full_name, cu.zip_code
    INTO v_order_record
    FROM public.rental_orders ro
    JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.id = p_rental_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental order not found: %', p_rental_order_id;
    END IF;
    
    -- Check if customer has current toys (from previous orders)
    SELECT COUNT(*)
    INTO v_current_toys_count
    FROM public.rental_orders
    WHERE user_id = v_order_record.user_id
      AND status IN ('delivered', 'active')
      AND id != p_rental_order_id
      AND toys_returned_count < toys_delivered_count;
    
    -- Determine exchange type based on order context
    IF v_order_record.is_pause_order THEN
        v_exchange_type := 'PICKUP_ONLY';
    ELSIF v_order_record.is_resume_order THEN
        v_exchange_type := 'DISPATCH_ONLY';
    ELSIF v_order_record.cycle_number = 1 THEN
        v_exchange_type := 'FIRST_DELIVERY';
    ELSIF v_current_toys_count > 0 THEN
        v_exchange_type := 'EXCHANGE';
    ELSE
        v_exchange_type := 'DISPATCH_ONLY';
    END IF;
    
    RETURN v_exchange_type;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-schedule exchange for rental order
CREATE OR REPLACE FUNCTION auto_schedule_exchange(p_rental_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_order_record RECORD;
    v_exchange_type TEXT;
    v_pincode VARCHAR(6);
    v_assigned_day VARCHAR(10);
    v_scheduled_date DATE;
    v_time_slot VARCHAR(20);
    v_exchange_id UUID;
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
    
    -- Determine exchange type
    v_exchange_type := determine_exchange_type(p_rental_order_id);
    
    -- Get pincode assignment
    SELECT pincode, pickup_day INTO v_pincode, v_assigned_day
    FROM public.pincode_pickup_schedule
    WHERE pincode = v_order_record.customer_pincode AND is_active = TRUE;
    
    -- Default to Monday if pincode not found
    v_pincode := COALESCE(v_pincode, v_order_record.customer_pincode);
    v_assigned_day := COALESCE(v_assigned_day, 'monday');
    
    -- Calculate next available date for the assigned day
    v_scheduled_date := calculate_next_pickup_date(v_pincode, v_order_record.rental_start_date, 28);
    
    -- Get next available time slot
    v_time_slot := get_next_available_time_slot(v_pincode, v_scheduled_date);
    
    -- Create exchange record
    INSERT INTO public.toy_exchanges (
        rental_order_id,
        exchange_type,
        order_classification,
        customer_id,
        customer_name,
        customer_phone,
        customer_address,
        pincode,
        assigned_day,
        subscription_plan,
        cycle_number,
        is_pause_order,
        is_resume_order,
        scheduled_date,
        scheduled_time_slot,
        toys_to_pickup,
        toys_to_dispatch,
        pickup_toy_count,
        dispatch_toy_count,
        exchange_status
    ) VALUES (
        p_rental_order_id,
        v_exchange_type,
        CASE 
            WHEN v_order_record.order_type = 'subscription' AND v_order_record.cycle_number > 1 THEN 'SUB'
            WHEN v_order_record.order_type = 'subscription' AND v_order_record.cycle_number = 1 THEN 'REGULAR'
            ELSE 'QU'
        END,
        v_order_record.user_id,
        v_order_record.full_name,
        v_order_record.phone,
        v_order_record.shipping_address,
        v_pincode,
        v_assigned_day,
        v_order_record.subscription_plan,
        v_order_record.cycle_number,
        COALESCE(v_order_record.is_pause_order, FALSE),
        COALESCE(v_order_record.is_resume_order, FALSE),
        v_scheduled_date,
        v_time_slot,
        CASE 
            WHEN v_exchange_type IN ('EXCHANGE', 'PICKUP_ONLY') THEN get_current_toys_for_user(v_order_record.user_id)
            ELSE '[]'::jsonb
        END,
        CASE 
            WHEN v_exchange_type IN ('EXCHANGE', 'DISPATCH_ONLY', 'FIRST_DELIVERY') THEN v_order_record.toys_data
            ELSE '[]'::jsonb
        END,
        CASE 
            WHEN v_exchange_type IN ('EXCHANGE', 'PICKUP_ONLY') THEN jsonb_array_length(get_current_toys_for_user(v_order_record.user_id))
            ELSE 0
        END,
        CASE 
            WHEN v_exchange_type IN ('EXCHANGE', 'DISPATCH_ONLY', 'FIRST_DELIVERY') THEN jsonb_array_length(v_order_record.toys_data)
            ELSE 0
        END,
        'scheduled'
    ) RETURNING id INTO v_exchange_id;
    
    -- Update rental order with exchange information
    UPDATE public.rental_orders
    SET exchange_scheduled_date = v_scheduled_date,
        exchange_type = v_exchange_type,
        exchange_status = 'scheduled',
        exchange_id = v_exchange_id,
        requires_pickup = (v_exchange_type IN ('EXCHANGE', 'PICKUP_ONLY')),
        requires_dispatch = (v_exchange_type IN ('EXCHANGE', 'DISPATCH_ONLY', 'FIRST_DELIVERY'))
    WHERE id = p_rental_order_id;
    
    RETURN v_exchange_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get current toys for a user (from active orders)
CREATE OR REPLACE FUNCTION get_current_toys_for_user(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_current_toys JSONB := '[]'::jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(toy_data), '[]'::jsonb)
    INTO v_current_toys
    FROM (
        SELECT jsonb_array_elements(toys_data) as toy_data
        FROM public.rental_orders
        WHERE user_id = p_user_id
          AND status IN ('delivered', 'active')
          AND toys_returned_count < toys_delivered_count
    ) current_toys_query;
    
    RETURN v_current_toys;
END;
$$ LANGUAGE plpgsql;

-- Function to get next available time slot for a pincode/date
CREATE OR REPLACE FUNCTION get_next_available_time_slot(p_pincode VARCHAR(6), p_date DATE)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_available_slots JSONB;
    v_booked_slots JSONB;
    v_slot TEXT;
BEGIN
    -- Get available time slots for the pincode
    SELECT available_time_slots, booked_time_slots
    INTO v_available_slots, v_booked_slots
    FROM public.exchange_capacity
    WHERE pincode = p_pincode AND service_date = p_date;
    
    -- If no capacity record exists, create one with default slots
    IF NOT FOUND THEN
        INSERT INTO public.exchange_capacity (pincode, assigned_day, service_date, available_time_slots, booked_time_slots)
        VALUES (
            p_pincode,
            get_pickup_day_for_pincode(p_pincode),
            p_date,
            '["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"]'::jsonb,
            '[]'::jsonb
        );
        
        RETURN '09:00-11:00'; -- Return first available slot
    END IF;
    
    -- Find first available slot that's not booked
    FOR v_slot IN SELECT jsonb_array_elements_text(v_available_slots)
    LOOP
        IF NOT (v_booked_slots ? v_slot) THEN
            RETURN v_slot;
        END IF;
    END LOOP;
    
    -- If all slots are booked, return the first slot (will need manual handling)
    RETURN jsonb_array_elements_text(v_available_slots) LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to book a time slot
CREATE OR REPLACE FUNCTION book_time_slot(p_pincode VARCHAR(6), p_date DATE, p_time_slot VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    v_current_booked JSONB;
BEGIN
    -- Get current booked slots
    SELECT booked_time_slots INTO v_current_booked
    FROM public.exchange_capacity
    WHERE pincode = p_pincode AND service_date = p_date;
    
    -- Add the new slot to booked slots
    UPDATE public.exchange_capacity
    SET booked_time_slots = COALESCE(v_current_booked, '[]'::jsonb) || to_jsonb(p_time_slot),
        current_exchanges_count = current_exchanges_count + 1,
        updated_at = NOW()
    WHERE pincode = p_pincode AND service_date = p_date;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. TRIGGERS FOR AUTOMATIC EXCHANGE SCHEDULING
-- ========================================

-- Trigger function to auto-schedule exchange when order status changes
CREATE OR REPLACE FUNCTION trigger_auto_schedule_exchange()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-schedule exchange when order status changes to 'processing'
    IF NEW.status = 'processing' AND (OLD.status IS NULL OR OLD.status != 'processing') THEN
        -- Only schedule if not already scheduled
        IF NEW.exchange_id IS NULL THEN
            PERFORM auto_schedule_exchange(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on rental_orders
DROP TRIGGER IF EXISTS trigger_auto_exchange_schedule ON public.rental_orders;
CREATE TRIGGER trigger_auto_exchange_schedule
    AFTER UPDATE ON public.rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_schedule_exchange();

-- ========================================
-- 7. VIEWS FOR EXCHANGE MANAGEMENT
-- ========================================

-- View for daily exchange schedule
CREATE OR REPLACE VIEW public.daily_exchange_schedule AS
SELECT 
    te.id as exchange_id,
    te.scheduled_date,
    te.assigned_day,
    te.scheduled_time_slot,
    te.exchange_type,
    te.order_classification,
    te.customer_name,
    te.customer_phone,
    te.pincode,
    te.subscription_plan,
    te.cycle_number,
    te.pickup_toy_count,
    te.dispatch_toy_count,
    te.exchange_status,
    te.is_pause_order,
    te.is_resume_order,
    ro.order_number,
    ro.total_amount,
    CASE 
        WHEN te.exchange_type = 'EXCHANGE' THEN 'Pickup & Dispatch'
        WHEN te.exchange_type = 'PICKUP_ONLY' THEN 'Pickup Only'
        WHEN te.exchange_type = 'DISPATCH_ONLY' THEN 'Dispatch Only'
        WHEN te.exchange_type = 'FIRST_DELIVERY' THEN 'First Delivery'
    END as operation_description
FROM public.toy_exchanges te
JOIN public.rental_orders ro ON te.rental_order_id = ro.id
ORDER BY te.scheduled_date, te.assigned_day, te.scheduled_time_slot;

-- View for exchange performance metrics
CREATE OR REPLACE VIEW public.exchange_performance_metrics AS
SELECT 
    assigned_day,
    COUNT(*) as total_scheduled_exchanges,
    COUNT(CASE WHEN exchange_status = 'completed' THEN 1 END) as completed_exchanges,
    COUNT(CASE WHEN exchange_status = 'failed' THEN 1 END) as failed_exchanges,
    ROUND(
        COUNT(CASE WHEN exchange_status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as success_rate,
    AVG(customer_satisfaction) as avg_customer_satisfaction,
    SUM(pickup_toy_count) as total_toys_collected,
    SUM(dispatch_toy_count) as total_toys_delivered
FROM public.toy_exchanges
WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY assigned_day
ORDER BY assigned_day;

-- View for pincode capacity status
CREATE OR REPLACE VIEW public.pincode_capacity_status AS
SELECT 
    pps.pincode,
    pps.area_name,
    pps.zone,
    pps.pickup_day as assigned_day,
    ec.service_date,
    ec.max_exchanges_per_day,
    ec.current_exchanges_count,
    ec.available_capacity,
    CASE 
        WHEN ec.available_capacity > 10 THEN 'High'
        WHEN ec.available_capacity > 5 THEN 'Medium'
        WHEN ec.available_capacity > 0 THEN 'Low'
        ELSE 'Full'
    END as capacity_status
FROM public.pincode_pickup_schedule pps
LEFT JOIN public.exchange_capacity ec ON pps.pincode = ec.pincode 
    AND ec.service_date = CURRENT_DATE
WHERE pps.is_active = TRUE
ORDER BY pps.zone, pps.pincode;

-- ========================================
-- 8. POPULATE INITIAL DATA
-- ========================================

-- Insert default exchange capacity for existing pincodes
INSERT INTO public.exchange_capacity (pincode, assigned_day, service_date, max_exchanges_per_day)
SELECT 
    pps.pincode,
    pps.pickup_day,
    CURRENT_DATE + INTERVAL '1 day' * generate_series(0, 30), -- Next 30 days
    25 -- Default capacity
FROM public.pincode_pickup_schedule pps
WHERE pps.is_active = TRUE
ON CONFLICT (pincode, service_date) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.toy_exchanges IS 'Main table for managing toy exchanges, pickups, and dispatches with intelligent order classification';
COMMENT ON TABLE public.exchange_capacity IS 'Daily capacity management for exchanges by pincode and date';
COMMENT ON TABLE public.subscription_pause_resume IS 'Tracking pause and resume operations for Silver/Gold pack subscriptions';

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_scheduled_date_day ON public.toy_exchanges(scheduled_date, assigned_day);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_customer_phone ON public.toy_exchanges(customer_phone);
CREATE INDEX IF NOT EXISTS idx_toy_exchanges_subscription_plan ON public.toy_exchanges(subscription_plan);