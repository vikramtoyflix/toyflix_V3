-- ========================================
-- ADD SELECTION WINDOW CONTROL FIELDS
-- Implements day 24-34 selection window with manual admin controls
-- ========================================

-- Add selection window control fields to rental_orders table
ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_status TEXT DEFAULT 'auto' 
CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed'));

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_opened_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_closed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS manual_selection_control BOOLEAN DEFAULT false;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_auto_close_date DATE;

ALTER TABLE public.rental_orders 
ADD COLUMN IF NOT EXISTS selection_window_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_selection_window_status 
ON public.rental_orders(selection_window_status);

CREATE INDEX IF NOT EXISTS idx_rental_orders_selection_window_control 
ON public.rental_orders(manual_selection_control, selection_window_status);

-- Add compound index for active subscriptions with selection window
CREATE INDEX IF NOT EXISTS idx_rental_orders_active_selection 
ON public.rental_orders(user_id, subscription_status, selection_window_status) 
WHERE subscription_status = 'active';

-- Add comments for documentation
COMMENT ON COLUMN public.rental_orders.selection_window_status IS 'Selection window control: auto (day 24-34), manual_open (admin opened), manual_closed (admin closed), force_open (always open), force_closed (always closed)';
COMMENT ON COLUMN public.rental_orders.selection_window_opened_at IS 'Timestamp when selection window was opened (auto or manual)';
COMMENT ON COLUMN public.rental_orders.selection_window_closed_at IS 'Timestamp when selection window was closed (auto or manual)';
COMMENT ON COLUMN public.rental_orders.manual_selection_control IS 'Boolean indicating if admin has manually controlled the selection window';
COMMENT ON COLUMN public.rental_orders.selection_window_auto_close_date IS 'Calculated date when auto selection window should close (day 34)';
COMMENT ON COLUMN public.rental_orders.selection_window_notes IS 'Admin notes about selection window actions';

-- Create function to calculate selection window status based on cycle day
CREATE OR REPLACE FUNCTION calculate_selection_window_status(
    p_rental_start_date DATE,
    p_manual_control BOOLEAN DEFAULT false,
    p_current_status TEXT DEFAULT 'auto'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_days_elapsed INTEGER;
    v_cycle_day INTEGER;
BEGIN
    -- Calculate days elapsed since rental start
    v_days_elapsed := EXTRACT(DAY FROM (CURRENT_DATE - p_rental_start_date));
    v_cycle_day := v_days_elapsed + 1; -- Day 1 is the first day
    
    -- If manual control is enabled, don't change status automatically
    IF p_manual_control THEN
        RETURN p_current_status;
    END IF;
    
    -- Auto logic: Day 24-34 window
    IF v_cycle_day >= 24 AND v_cycle_day <= 34 THEN
        RETURN 'auto_open';
    ELSE
        RETURN 'auto_closed';
    END IF;
END;
$$;

-- Create function to get current cycle day
CREATE OR REPLACE FUNCTION get_current_cycle_day(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXTRACT(DAY FROM (CURRENT_DATE - p_rental_start_date)) + 1;
END;
$$;

-- Create function to get days until selection window opens
CREATE OR REPLACE FUNCTION get_days_until_selection_opens(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    IF v_cycle_day >= 24 THEN
        RETURN 0; -- Already at or past day 24
    ELSE
        RETURN 24 - v_cycle_day; -- Days until day 24
    END IF;
END;
$$;

-- Create function to get days until selection window closes
CREATE OR REPLACE FUNCTION get_days_until_selection_closes(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cycle_day INTEGER;
BEGIN
    v_cycle_day := get_current_cycle_day(p_rental_start_date);
    
    IF v_cycle_day > 34 THEN
        RETURN 0; -- Already past day 34
    ELSE
        RETURN 34 - v_cycle_day; -- Days until day 34
    END IF;
END;
$$;

-- Create function for manual selection window control
CREATE OR REPLACE FUNCTION control_selection_window(
    p_rental_order_id UUID,
    p_action TEXT, -- 'open' or 'close'
    p_admin_user_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rental_order RECORD;
    v_new_status TEXT;
    v_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get rental order details
    SELECT * INTO v_rental_order
    FROM public.rental_orders 
    WHERE id = p_rental_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental order not found: %', p_rental_order_id;
    END IF;
    
    -- Set timestamp
    v_timestamp := NOW();
    
    -- Determine new status based on action
    IF p_action = 'open' THEN
        v_new_status := 'manual_open';
    ELSIF p_action = 'close' THEN
        v_new_status := 'manual_closed';
    ELSE
        RAISE EXCEPTION 'Invalid action: %. Must be "open" or "close"', p_action;
    END IF;
    
    -- Update rental order
    UPDATE public.rental_orders 
    SET 
        selection_window_status = v_new_status,
        manual_selection_control = true,
        selection_window_opened_at = CASE 
            WHEN p_action = 'open' THEN v_timestamp
            ELSE selection_window_opened_at
        END,
        selection_window_closed_at = CASE 
            WHEN p_action = 'close' THEN v_timestamp
            ELSE selection_window_closed_at
        END,
        selection_window_notes = COALESCE(p_notes, selection_window_notes),
        updated_at = v_timestamp,
        updated_by = p_admin_user_id
    WHERE id = p_rental_order_id;
    
    -- Log the action
    INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_by,
        changed_at
    ) VALUES (
        'rental_orders',
        p_rental_order_id,
        'selection_window_' || p_action,
        jsonb_build_object(
            'selection_window_status', v_rental_order.selection_window_status,
            'manual_selection_control', v_rental_order.manual_selection_control
        ),
        jsonb_build_object(
            'selection_window_status', v_new_status,
            'manual_selection_control', true,
            'notes', p_notes
        ),
        p_admin_user_id,
        v_timestamp
    );
    
    RETURN true;
END;
$$;

-- Create function to reset selection window to auto after manual closure
CREATE OR REPLACE FUNCTION reset_selection_window_to_auto(p_rental_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rental_order RECORD;
    v_new_cycle_start DATE;
    v_new_auto_close_date DATE;
BEGIN
    -- Get rental order details
    SELECT * INTO v_rental_order
    FROM public.rental_orders 
    WHERE id = p_rental_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rental order not found: %', p_rental_order_id;
    END IF;
    
    -- Calculate next cycle start date (add 30 days to current rental_start_date)
    v_new_cycle_start := v_rental_order.rental_start_date + INTERVAL '30 days';
    v_new_auto_close_date := v_new_cycle_start + INTERVAL '34 days';
    
    -- Update rental order for next cycle
    UPDATE public.rental_orders 
    SET 
        rental_start_date = v_new_cycle_start,
        rental_end_date = v_new_cycle_start + INTERVAL '29 days',
        cycle_number = v_rental_order.cycle_number + 1,
        selection_window_status = 'auto',
        manual_selection_control = false,
        selection_window_opened_at = NULL,
        selection_window_closed_at = NULL,
        selection_window_auto_close_date = v_new_auto_close_date,
        selection_window_notes = NULL,
        updated_at = NOW()
    WHERE id = p_rental_order_id;
    
    RETURN true;
END;
$$;

-- Create view for selection window dashboard
CREATE OR REPLACE VIEW public.selection_window_dashboard AS
SELECT 
    ro.id as rental_order_id,
    ro.user_id,
    ro.order_number,
    ro.subscription_plan,
    ro.cycle_number,
    ro.rental_start_date,
    ro.rental_end_date,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    ro.selection_window_closed_at,
    ro.selection_window_notes,
    
    -- Current cycle day
    get_current_cycle_day(ro.rental_start_date) as current_cycle_day,
    
    -- Selection window timing
    get_days_until_selection_opens(ro.rental_start_date) as days_until_opens,
    get_days_until_selection_closes(ro.rental_start_date) as days_until_closes,
    
    -- Auto window status
    calculate_selection_window_status(ro.rental_start_date, ro.manual_selection_control, ro.selection_window_status) as auto_status,
    
    -- Effective window status (considering manual overrides)
    CASE 
        WHEN ro.manual_selection_control THEN
            CASE 
                WHEN ro.selection_window_status IN ('manual_open', 'force_open') THEN 'open'
                WHEN ro.selection_window_status IN ('manual_closed', 'force_closed') THEN 'closed'
                ELSE 'unknown'
            END
        ELSE
            CASE 
                WHEN get_current_cycle_day(ro.rental_start_date) >= 24 AND get_current_cycle_day(ro.rental_start_date) <= 34 THEN 'open'
                ELSE 'closed'
            END
    END as effective_status,
    
    -- User details (FIXED: using first_name and last_name instead of full_name)
    CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, '')) as user_name,
    cu.phone as user_phone,
    cu.email as user_email,
    
    ro.created_at,
    ro.updated_at
FROM public.rental_orders ro
JOIN public.custom_users cu ON ro.user_id = cu.id
WHERE ro.subscription_status = 'active'
ORDER BY ro.rental_start_date DESC;

-- Update existing records to set default auto close dates
UPDATE public.rental_orders 
SET selection_window_auto_close_date = rental_start_date + INTERVAL '34 days'
WHERE selection_window_auto_close_date IS NULL 
AND rental_start_date IS NOT NULL;

-- Grant necessary permissions
GRANT SELECT ON public.selection_window_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_selection_window_status(DATE, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_cycle_day(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_days_until_selection_opens(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_days_until_selection_closes(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.control_selection_window(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_selection_window_to_auto(UUID) TO authenticated;

-- Final validation
DO $$
BEGIN
    -- Check if the columns were added successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rental_orders' 
        AND column_name = 'selection_window_status'
    ) THEN
        RAISE EXCEPTION 'selection_window_status column was not added successfully';
    END IF;
    
    -- Check if functions were created
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'control_selection_window'
    ) THEN
        RAISE EXCEPTION 'control_selection_window function was not created successfully';
    END IF;
    
    RAISE NOTICE 'Selection window control system added successfully';
END $$; 