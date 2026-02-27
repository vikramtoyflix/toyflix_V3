-- Comprehensive Fix for Selection Windows Count Issue
-- This addresses all possible scenarios where selection windows might be manually opened

-- First, let's see what we actually have in the database
SELECT 'Current selection window states:' as info;
SELECT 
    selection_window_status,
    manual_selection_control,
    COUNT(*) as count
FROM public.rental_orders
WHERE subscription_status = 'active'
GROUP BY selection_window_status, manual_selection_control
ORDER BY selection_window_status, manual_selection_control;

-- Now let's create a comprehensive function that handles all cases
CREATE OR REPLACE FUNCTION get_manual_selection_windows_count()
RETURNS TABLE (
    total_manual_open INTEGER,
    user_details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_details JSONB;
BEGIN
    -- Count manually opened selection windows with comprehensive criteria
    SELECT COUNT(*)
    INTO v_count
    FROM public.rental_orders ro
    WHERE ro.subscription_status = 'active'
    AND (
        -- Case 1: Explicitly manual_open status with manual control
        (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true)
        OR
        -- Case 2: Manual control is true and status suggests it's open (legacy cases)
        (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open'))
        OR
        -- Case 3: Force open status (admin forced open)
        (ro.selection_window_status = 'force_open')
        OR
        -- Case 4: Manual control is true but status might be 'auto' (edge case)
        (ro.manual_selection_control = true AND ro.selection_window_status = 'auto' AND ro.selection_window_opened_at IS NOT NULL)
    );
    
    -- Get user details for manually opened windows
    SELECT jsonb_agg(
        jsonb_build_object(
            'rental_order_id', ro.id,
            'user_id', ro.user_id,
            'user_name', TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))),
            'user_phone', cu.phone,
            'order_number', ro.order_number,
            'opened_at', ro.selection_window_opened_at,
            'cycle_day', GREATEST(1, EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date)) + 1),
            'subscription_plan', ro.subscription_plan,
            'window_status', ro.selection_window_status,
            'manual_control', ro.manual_selection_control,
            'debug_info', jsonb_build_object(
                'rental_start_date', ro.rental_start_date,
                'current_date', CURRENT_DATE,
                'days_diff', EXTRACT(DAY FROM (CURRENT_DATE - ro.rental_start_date))
            )
        )
    )
    INTO v_details
    FROM public.rental_orders ro
    JOIN public.custom_users cu ON ro.user_id = cu.id
    WHERE ro.subscription_status = 'active'
    AND (
        -- Same criteria as count query
        (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true)
        OR
        (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open'))
        OR
        (ro.selection_window_status = 'force_open')
        OR
        (ro.manual_selection_control = true AND ro.selection_window_status = 'auto' AND ro.selection_window_opened_at IS NOT NULL)
    );
    
    -- Return results
    RETURN QUERY SELECT 
        v_count,
        COALESCE(v_details, '[]'::jsonb);
        
    -- Log for debugging
    RAISE NOTICE 'Found % manually opened selection windows', v_count;
END;
$$;

-- Also update the bulk close function to use the same criteria
CREATE OR REPLACE FUNCTION close_all_manual_selection_windows(
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT 'Bulk closure of all manually opened selection windows'
)
RETURNS TABLE (
    closed_count INTEGER,
    affected_users UUID[],
    details JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected_orders UUID[];
    v_affected_users UUID[];
    v_closed_count INTEGER := 0;
    v_order_record RECORD;
    v_details JSONB := '[]'::jsonb;
BEGIN
    -- Find all rental orders with manually opened selection windows using same criteria
    FOR v_order_record IN
        SELECT 
            id,
            user_id,
            order_number,
            selection_window_status,
            manual_selection_control,
            selection_window_opened_at
        FROM public.rental_orders
        WHERE subscription_status = 'active'
        AND (
            -- Same comprehensive criteria as count function
            (selection_window_status = 'manual_open' AND manual_selection_control = true)
            OR
            (manual_selection_control = true AND selection_window_status IN ('manual_open', 'open'))
            OR
            (selection_window_status = 'force_open')
            OR
            (manual_selection_control = true AND selection_window_status = 'auto' AND selection_window_opened_at IS NOT NULL)
        )
    LOOP
        -- Close the selection window
        UPDATE public.rental_orders
        SET 
            selection_window_status = 'manual_closed',
            selection_window_closed_at = NOW(),
            selection_window_notes = COALESCE(
                selection_window_notes || E'\n', 
                ''
            ) || p_reason || ' (Admin: ' || p_admin_user_id::text || ')',
            updated_at = NOW(),
            updated_by = p_admin_user_id
        WHERE id = v_order_record.id;
        
        -- Track the closure
        v_closed_count := v_closed_count + 1;
        v_affected_orders := array_append(v_affected_orders, v_order_record.id);
        v_affected_users := array_append(v_affected_users, v_order_record.user_id);
        
        -- Add to details
        v_details := v_details || jsonb_build_object(
            'rental_order_id', v_order_record.id,
            'user_id', v_order_record.user_id,
            'order_number', v_order_record.order_number,
            'was_opened_at', v_order_record.selection_window_opened_at,
            'closed_at', NOW(),
            'original_status', v_order_record.selection_window_status
        );
        
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
                v_order_record.id,
                'selection_window_bulk_close',
                jsonb_build_object(
                    'selection_window_status', v_order_record.selection_window_status,
                    'manual_selection_control', v_order_record.manual_selection_control
                ),
                jsonb_build_object(
                    'selection_window_status', 'manual_closed',
                    'manual_selection_control', true,
                    'bulk_action', true,
                    'reason', p_reason
                ),
                p_admin_user_id,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignore audit log errors to prevent blocking the main operation
                NULL;
        END;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT 
        v_closed_count,
        v_affected_users,
        v_details;
        
    RAISE NOTICE 'Bulk closed % selection windows for % users', v_closed_count, array_length(v_affected_users, 1);
END;
$$;

-- Test the updated function
SELECT 'Testing updated function:' as test;
SELECT * FROM get_manual_selection_windows_count();

-- Show what would be affected by bulk close (without actually closing)
SELECT 'Windows that would be closed by bulk operation:' as test;
SELECT 
    ro.id,
    ro.user_id,
    ro.order_number,
    ro.selection_window_status,
    ro.manual_selection_control,
    ro.selection_window_opened_at,
    TRIM(CONCAT(COALESCE(cu.first_name, ''), ' ', COALESCE(cu.last_name, ''))) as user_name,
    cu.phone
FROM public.rental_orders ro
LEFT JOIN public.custom_users cu ON ro.user_id = cu.id
WHERE ro.subscription_status = 'active'
AND (
    (ro.selection_window_status = 'manual_open' AND ro.manual_selection_control = true)
    OR
    (ro.manual_selection_control = true AND ro.selection_window_status IN ('manual_open', 'open'))
    OR
    (ro.selection_window_status = 'force_open')
    OR
    (ro.manual_selection_control = true AND ro.selection_window_status = 'auto' AND ro.selection_window_opened_at IS NOT NULL)
);
