-- ========================================
-- ENHANCED SELECTION WINDOW AUTO-CLOSE SYSTEM
-- Ensures selection windows are automatically closed when orders are placed
-- Addresses the queue order selection button deactivation issue
-- ========================================

-- ========================================
-- UPDATE CHECK CONSTRAINT TO INCLUDE auto_closed STATUS
-- ========================================

-- Drop existing constraint if it exists
ALTER TABLE public.rental_orders DROP CONSTRAINT IF EXISTS rental_orders_selection_window_status_check;

-- Add updated constraint with auto_closed status
ALTER TABLE public.rental_orders 
ADD CONSTRAINT rental_orders_selection_window_status_check 
CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed', 'auto_closed', 'auto_open'));

-- Enhanced function to automatically close selection window after any order placement
CREATE OR REPLACE FUNCTION enhanced_auto_close_selection_window_after_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_order_id UUID;
    v_current_status TEXT;
    v_is_manual_control BOOLEAN;
    v_user_id UUID;
BEGIN
    -- Only process for queue_orders and rental_orders tables
    IF TG_TABLE_NAME NOT IN ('queue_orders', 'rental_orders') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Extract user_id based on table
    IF TG_TABLE_NAME = 'queue_orders' THEN
        v_user_id := NEW.user_id;
    ELSIF TG_TABLE_NAME = 'rental_orders' THEN
        v_user_id := NEW.user_id;
    END IF;
    
    -- For INSERT operations (new orders)
    IF TG_OP = 'INSERT' THEN
        RAISE LOG 'Enhanced auto-close trigger: Processing new order for user %', v_user_id;
        
        -- Get the user's active rental order (subscription)
        SELECT id, selection_window_status, manual_selection_control
        INTO v_rental_order_id, v_current_status, v_is_manual_control
        FROM public.rental_orders
        WHERE user_id = v_user_id 
        AND subscription_status = 'active'
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- If we found an active subscription with an open selection window
        IF v_rental_order_id IS NOT NULL THEN
            RAISE LOG 'Enhanced auto-close trigger: Found active subscription % with status %', v_rental_order_id, v_current_status;
            
            -- Check if selection window is currently open
            IF v_current_status IN ('manual_open', 'auto_open', 'auto', 'open') THEN
                RAISE LOG 'Enhanced auto-close trigger: Closing selection window for rental order %', v_rental_order_id;
                
                -- Close the selection window
                UPDATE public.rental_orders
                SET 
                    selection_window_status = 'auto_closed',
                    selection_window_closed_at = NOW(),
                    selection_window_notes = COALESCE(selection_window_notes, '') || 
                        CASE 
                            WHEN TG_TABLE_NAME = 'queue_orders' THEN ' | Auto-closed after queue order placement'
                            ELSE ' | Auto-closed after order placement'
                        END,
                    manual_selection_control = false,
                    updated_at = NOW()
                WHERE id = v_rental_order_id;
                
                -- Log the closure
                RAISE LOG 'Enhanced auto-close trigger: Successfully closed selection window for user %', v_user_id;
                
                -- Insert audit log entry
                INSERT INTO public.admin_audit_logs (
                    action,
                    resource_type,
                    resource_id,
                    user_id,
                    admin_user_id,
                    action_details,
                    metadata,
                    created_at
                ) VALUES (
                    'selection_window_closure',
                    'rental_order',
                    v_rental_order_id,
                    v_user_id,
                    v_user_id, -- System closure, using user as admin
                    jsonb_build_object(
                        'trigger', 'auto_close_after_order',
                        'order_table', TG_TABLE_NAME,
                        'order_id', NEW.id,
                        'previous_status', v_current_status,
                        'new_status', 'auto_closed',
                        'reason', CASE 
                            WHEN TG_TABLE_NAME = 'queue_orders' THEN 'Queue order placement'
                            ELSE 'Order placement'
                        END
                    ),
                    jsonb_build_object(
                        'automated', true,
                        'trigger_name', 'enhanced_auto_close_selection_window_after_order'
                    ),
                    NOW()
                );
                
            ELSE
                RAISE LOG 'Enhanced auto-close trigger: Selection window already closed (status: %)', v_current_status;
            END IF;
        ELSE
            RAISE LOG 'Enhanced auto-close trigger: No active subscription found for user %', v_user_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_auto_close_selection_window_queue_orders ON public.queue_orders;
DROP TRIGGER IF EXISTS trigger_auto_close_selection_window_rental_orders ON public.rental_orders;

-- Create triggers for both tables
CREATE TRIGGER trigger_enhanced_auto_close_selection_window_queue_orders
    AFTER INSERT ON public.queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_close_selection_window_after_order();

CREATE TRIGGER trigger_enhanced_auto_close_selection_window_rental_orders
    AFTER INSERT ON public.rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_close_selection_window_after_order();

-- Create function to manually close selection windows (for admin use)
CREATE OR REPLACE FUNCTION manually_close_selection_window(
    p_user_id UUID,
    p_reason TEXT DEFAULT 'Manual closure by admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_rental_order_id UUID;
    v_current_status TEXT;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get the user's active rental order (subscription)
    SELECT id, selection_window_status
    INTO v_rental_order_id, v_current_status
    FROM public.rental_orders
    WHERE user_id = p_user_id 
    AND subscription_status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If we found an active subscription with an open selection window
    IF v_rental_order_id IS NOT NULL AND v_current_status IN ('manual_open', 'auto_open', 'auto', 'open') THEN
        -- Close the selection window
        UPDATE public.rental_orders
        SET 
            selection_window_status = 'manual_closed',
            selection_window_closed_at = NOW(),
            selection_window_notes = COALESCE(selection_window_notes, '') || ' | ' || p_reason,
            manual_selection_control = false,
            updated_at = NOW()
        WHERE id = v_rental_order_id;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        IF v_updated_count > 0 THEN
            RAISE LOG 'Manually closed selection window for user % (rental_order: %)', p_user_id, v_rental_order_id;
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Create function to check if user has recent queue orders (for UI logic)
CREATE OR REPLACE FUNCTION user_has_recent_queue_order(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_queue_count INTEGER := 0;
BEGIN
    SELECT COUNT(*)
    INTO v_queue_count
    FROM public.queue_orders
    WHERE user_id = p_user_id
    AND status IN ('processing', 'confirmed', 'preparing', 'shipped')
    AND created_at > NOW() - INTERVAL '7 days'; -- Recent within 7 days
    
    RETURN v_queue_count > 0;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION enhanced_auto_close_selection_window_after_order() IS 
'Enhanced trigger function that automatically closes selection windows when orders are placed. Addresses the issue where selection buttons remain active after queue order placement.';

COMMENT ON FUNCTION manually_close_selection_window(UUID, TEXT) IS 
'Allows manual closure of selection windows for admin operations or troubleshooting.';

COMMENT ON FUNCTION user_has_recent_queue_order(UUID) IS 
'Utility function to check if a user has recent queue orders, used for UI logic to disable selection buttons.';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_subscription_status 
ON public.rental_orders(user_id, subscription_status, selection_window_status);

CREATE INDEX IF NOT EXISTS idx_queue_orders_user_status_created 
ON public.queue_orders(user_id, status, created_at);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION enhanced_auto_close_selection_window_after_order() TO authenticated;
GRANT EXECUTE ON FUNCTION manually_close_selection_window(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_recent_queue_order(UUID) TO authenticated;
