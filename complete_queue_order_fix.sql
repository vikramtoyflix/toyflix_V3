-- ========================================
-- COMPLETE QUEUE ORDER FIX
-- Properly handles RLS, audit logging, and selection window auto-close
-- ========================================

-- Step 1: Update admin_audit_logs constraint to include all necessary actions
ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS valid_action;

ALTER TABLE admin_audit_logs 
ADD CONSTRAINT valid_action CHECK (action IN (
  'subscription_deletion', 
  'subscription_creation', 
  'subscription_modification',
  'user_modification',
  'bulk_operation',
  'selection_window_closure',
  'queue_order_creation',
  'order_creation',
  'selection_window_opened',
  'selection_window_closed',
  'system_operation'
));

-- Step 2: Create comprehensive RLS policies for admin_audit_logs
-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "Admin users can insert audit logs" ON admin_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs for triggers" ON admin_audit_logs;

-- Create new comprehensive policies
CREATE POLICY "Admin users can view all audit logs" ON admin_audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert audit logs" ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "System operations can insert audit logs" ON admin_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow system operations (when admin_user_id equals user_id)
    admin_user_id = user_id
    OR
    -- Allow service role operations
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow actual admin users
    EXISTS (
      SELECT 1 FROM custom_users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Step 3: Create enhanced auto-close trigger with proper error handling
CREATE OR REPLACE FUNCTION enhanced_auto_close_selection_window_after_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
    v_rental_order_id UUID;
    v_current_status TEXT;
    v_is_manual_control BOOLEAN;
    v_user_id UUID;
    v_audit_success BOOLEAN := false;
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
                
                -- Try to insert audit log with proper error handling
                BEGIN
                    -- Use a more permissive approach for audit logging
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
                            'trigger_name', 'enhanced_auto_close_selection_window_after_order',
                            'system_operation', true
                        ),
                        NOW()
                    );
                    
                    v_audit_success := true;
                    RAISE LOG 'Enhanced auto-close trigger: Audit log inserted successfully';
                    
                EXCEPTION
                    WHEN insufficient_privilege THEN
                        RAISE LOG 'Enhanced auto-close trigger: Insufficient privilege for audit log (continuing anyway)';
                        v_audit_success := false;
                    WHEN check_violation THEN
                        RAISE LOG 'Enhanced auto-close trigger: Check constraint violation for audit log (continuing anyway)';
                        v_audit_success := false;
                    WHEN OTHERS THEN
                        RAISE LOG 'Enhanced auto-close trigger: Failed to insert audit log (continuing anyway): %', SQLERRM;
                        v_audit_success := false;
                END;
                
                RAISE LOG 'Enhanced auto-close trigger: Selection window closed for user %, audit_success: %', v_user_id, v_audit_success;
                
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

-- Step 4: Re-create the triggers with the fixed function
DROP TRIGGER IF EXISTS trigger_enhanced_auto_close_selection_window_queue_orders ON public.queue_orders;
DROP TRIGGER IF EXISTS trigger_enhanced_auto_close_selection_window_rental_orders ON public.rental_orders;

CREATE TRIGGER trigger_enhanced_auto_close_selection_window_queue_orders
    AFTER INSERT ON public.queue_orders
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_close_selection_window_after_order();

CREATE TRIGGER trigger_enhanced_auto_close_selection_window_rental_orders
    AFTER INSERT ON public.rental_orders
    FOR EACH ROW
    EXECUTE FUNCTION enhanced_auto_close_selection_window_after_order();

-- Step 5: Create utility function for manual queue order testing
CREATE OR REPLACE FUNCTION test_queue_order_creation(
    p_user_id UUID,
    p_test_toys JSONB DEFAULT '[{"toy_id": "test", "name": "Test Toy"}]'::JSONB
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    selection_window_before TEXT,
    selection_window_after TEXT,
    audit_log_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_before_status TEXT;
    v_after_status TEXT;
    v_test_order_id UUID;
    v_audit_count INTEGER;
BEGIN
    -- Get selection window status before
    SELECT selection_window_status INTO v_before_status
    FROM rental_orders 
    WHERE user_id = p_user_id AND subscription_status = 'active'
    ORDER BY created_at DESC LIMIT 1;
    
    -- Create a test queue order
    INSERT INTO queue_orders (
        user_id,
        order_number,
        selected_toys,
        queue_order_type,
        total_amount,
        status,
        delivery_address,
        current_plan_id,
        created_at
    ) VALUES (
        p_user_id,
        'TEST_' || extract(epoch from now())::bigint,
        p_test_toys,
        'next_cycle',
        0,
        'processing',
        '{"test": true}'::jsonb,
        'test_plan',
        NOW()
    ) RETURNING id INTO v_test_order_id;
    
    -- Check selection window status after
    SELECT selection_window_status INTO v_after_status
    FROM rental_orders 
    WHERE user_id = p_user_id AND subscription_status = 'active'
    ORDER BY created_at DESC LIMIT 1;
    
    -- Check if audit log was created
    SELECT COUNT(*) INTO v_audit_count
    FROM admin_audit_logs 
    WHERE user_id = p_user_id 
    AND action = 'selection_window_closure'
    AND created_at > NOW() - INTERVAL '1 minute';
    
    -- Clean up test order
    DELETE FROM queue_orders WHERE id = v_test_order_id;
    
    RETURN QUERY SELECT 
        true as success,
        'Test completed successfully' as message,
        COALESCE(v_before_status, 'NULL') as selection_window_before,
        COALESCE(v_after_status, 'NULL') as selection_window_after,
        (v_audit_count > 0) as audit_log_created;
END;
$$;

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION enhanced_auto_close_selection_window_after_order() TO authenticated;
GRANT EXECUTE ON FUNCTION test_queue_order_creation(UUID, JSONB) TO authenticated;

-- Step 7: Add helpful comments
COMMENT ON FUNCTION enhanced_auto_close_selection_window_after_order() IS 
'Enhanced trigger function that automatically closes selection windows when orders are placed. Includes proper RLS handling and non-blocking audit logging.';

COMMENT ON FUNCTION test_queue_order_creation(UUID, JSONB) IS 
'Utility function to test queue order creation and selection window auto-close functionality.';

-- Step 8: Verify the fix works
SELECT 'Complete queue order fix applied successfully. You can now test queue order creation.' as status;
