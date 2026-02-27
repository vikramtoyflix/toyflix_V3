-- ========================================
-- AUTO-CLOSE SELECTION WINDOW AFTER ORDER PLACEMENT
-- Ensures selection window is automatically closed when orders are placed
-- ========================================

-- Create function to automatically close selection window after order placement
CREATE OR REPLACE FUNCTION auto_close_selection_window_after_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_order_id UUID;
    v_current_status TEXT;
    v_is_manual_control BOOLEAN;
BEGIN
    -- Only process for queue_orders and rental_orders tables
    IF TG_TABLE_NAME NOT IN ('queue_orders', 'rental_orders') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- For INSERT operations (new orders)
    IF TG_OP = 'INSERT' THEN
        -- Get the user's active rental order (subscription)
        SELECT id, selection_window_status, manual_selection_control
        INTO v_rental_order_id, v_current_status, v_is_manual_control
        FROM public.rental_orders
        WHERE user_id = NEW.user_id 
        AND subscription_status = 'active'
        LIMIT 1;
        
        -- If we found an active subscription with an open selection window
        IF v_rental_order_id IS NOT NULL THEN
            -- Check if selection window is currently open
            IF v_current_status IN ('manual_open', 'auto_open', 'auto') OR 
               (NOT v_is_manual_control AND v_current_status = 'auto') THEN
                
                -- Close the selection window
                UPDATE public.rental_orders
                SET 
                    selection_window_status = 'manual_closed',
                    manual_selection_control = true,
                    selection_window_closed_at = NOW(),
                    selection_window_notes = COALESCE(
                        selection_window_notes || E'\n', 
                        ''
                    ) || 'Auto-closed after order placement: ' || 
                    COALESCE(NEW.order_number, 'Order #' || NEW.id::text),
                    updated_at = NOW()
                WHERE id = v_rental_order_id;
                
                -- Log the action in audit_log if the table exists
                BEGIN
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
                        v_rental_order_id,
                        'selection_window_auto_close',
                        jsonb_build_object(
                            'selection_window_status', v_current_status,
                            'manual_selection_control', v_is_manual_control
                        ),
                        jsonb_build_object(
                            'selection_window_status', 'manual_closed',
                            'manual_selection_control', true,
                            'trigger_table', TG_TABLE_NAME,
                            'trigger_order', NEW.order_number
                        ),
                        NEW.user_id,
                        NOW()
                    );
                EXCEPTION
                    WHEN OTHERS THEN
                        -- Ignore audit log errors to prevent blocking the main operation
                        NULL;
                END;
                
                RAISE NOTICE 'Selection window auto-closed for user % after order placement in %', 
                    NEW.user_id, TG_TABLE_NAME;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for queue_orders table
DROP TRIGGER IF EXISTS trigger_auto_close_selection_window_queue_orders ON public.queue_orders;
CREATE TRIGGER trigger_auto_close_selection_window_queue_orders
    AFTER INSERT ON public.queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_close_selection_window_after_order();

-- Create triggers for rental_orders table (for new subscription orders)
DROP TRIGGER IF EXISTS trigger_auto_close_selection_window_rental_orders ON public.rental_orders;
CREATE TRIGGER trigger_auto_close_selection_window_rental_orders
    AFTER INSERT ON public.rental_orders
    FOR EACH ROW
    WHEN (NEW.subscription_status = 'active')
    EXECUTE FUNCTION auto_close_selection_window_after_order();

-- Create a manual function to close selection window for a specific user
CREATE OR REPLACE FUNCTION close_selection_window_for_user(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Manual closure after order placement'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_order_id UUID;
    v_current_status TEXT;
    v_is_manual_control BOOLEAN;
    v_updated_count INTEGER;
BEGIN
    -- Get the user's active rental order (subscription)
    SELECT id, selection_window_status, manual_selection_control
    INTO v_rental_order_id, v_current_status, v_is_manual_control
    FROM public.rental_orders
    WHERE user_id = p_user_id 
    AND subscription_status = 'active'
    LIMIT 1;
    
    -- If no active subscription found
    IF v_rental_order_id IS NULL THEN
        RAISE NOTICE 'No active subscription found for user %', p_user_id;
        RETURN TRUE; -- Not an error condition
    END IF;
    
    -- Check if selection window is currently open
    IF v_current_status NOT IN ('manual_open', 'auto_open', 'auto') AND 
       (v_is_manual_control OR v_current_status != 'auto') THEN
        RAISE NOTICE 'Selection window already closed for user %', p_user_id;
        RETURN TRUE; -- Already closed
    END IF;
    
    -- Close the selection window
    UPDATE public.rental_orders
    SET 
        selection_window_status = 'manual_closed',
        manual_selection_control = true,
        selection_window_closed_at = NOW(),
        selection_window_notes = COALESCE(
            selection_window_notes || E'\n', 
            ''
        ) || p_reason,
        updated_at = NOW()
    WHERE id = v_rental_order_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RAISE NOTICE 'Selection window closed for user % (rental_order: %)', p_user_id, v_rental_order_id;
        RETURN TRUE;
    ELSE
        RAISE WARNING 'Failed to close selection window for user %', p_user_id;
        RETURN FALSE;
    END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_close_selection_window_after_order() TO authenticated;
GRANT EXECUTE ON FUNCTION close_selection_window_for_user(UUID, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION auto_close_selection_window_after_order() IS 'Trigger function to automatically close selection window when orders are placed';
COMMENT ON FUNCTION close_selection_window_for_user(UUID, TEXT) IS 'Manual function to close selection window for a specific user with custom reason';

-- Final validation
DO $$
BEGIN
    -- Check if the function was created successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'auto_close_selection_window_after_order'
    ) THEN
        RAISE EXCEPTION 'auto_close_selection_window_after_order function was not created successfully';
    END IF;
    
    -- Check if the manual function was created successfully
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'close_selection_window_for_user'
    ) THEN
        RAISE EXCEPTION 'close_selection_window_for_user function was not created successfully';
    END IF;
    
    RAISE NOTICE 'Auto-close selection window system added successfully';
END $$;
