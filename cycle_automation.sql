-- =====================================
-- CYCLE AUTOMATION SCRIPTS
-- =====================================

-- 1. UPDATE SELECTION WINDOW STATUS (Run daily)
-- Updates selection_window_status based on current date
UPDATE subscription_management 
SET 
    selection_window_status = CASE 
        WHEN CURRENT_DATE < selection_window_start THEN 'upcoming'
        WHEN CURRENT_DATE BETWEEN selection_window_start AND selection_window_end THEN 'open'
        ELSE 'closed'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE selection_window_status != CASE 
        WHEN CURRENT_DATE < selection_window_start THEN 'upcoming'
        WHEN CURRENT_DATE BETWEEN selection_window_start AND selection_window_end THEN 'open'
        ELSE 'closed'
    END;

-- 2. ACTIVATE PENDING CYCLES (Run daily)
-- Move cycles from pending to active when their start date arrives
UPDATE subscription_management 
SET 
    cycle_status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE cycle_status = 'pending'
AND cycle_start_date <= CURRENT_DATE;

-- 3. COMPLETE FINISHED CYCLES (Run daily)
-- Move cycles from active to completed when their end date passes
UPDATE subscription_management 
SET 
    cycle_status = 'completed',
    updated_at = CURRENT_TIMESTAMP
WHERE cycle_status = 'active'
AND cycle_end_date < CURRENT_DATE;

-- 4. ADMIN OVERRIDE FUNCTION (for manual interventions)
-- Enable selection window for specific user
CREATE OR REPLACE FUNCTION admin_enable_cycle_selection(
    p_user_id UUID,
    p_admin_user_id UUID,
    p_reason TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_cycle_id UUID;
BEGIN
    -- Find user's current active cycle
    SELECT cycle_id INTO v_cycle_id
    FROM subscription_management 
    WHERE user_id = p_user_id 
    AND cycle_status = 'active'
    ORDER BY cycle_number DESC
    LIMIT 1;
    
    IF v_cycle_id IS NULL THEN
        RAISE EXCEPTION 'No active cycle found for user';
    END IF;
    
    -- Enable selection (extend window to tomorrow)
    UPDATE subscription_management 
    SET 
        selection_window_status = 'open',
        selection_window_end = CURRENT_DATE + INTERVAL '1 day',
        updated_at = CURRENT_TIMESTAMP
    WHERE cycle_id = v_cycle_id;
    
    -- Log the admin action (you might want a separate audit table)
    INSERT INTO admin_actions (admin_user_id, action_type, target_user_id, reason, created_at)
    VALUES (p_admin_user_id, 'enable_cycle_selection', p_user_id, p_reason, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;  -- In case admin_actions table doesn't exist yet
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. BULK CYCLE STATUS CHECK (for monitoring dashboard)
CREATE OR REPLACE FUNCTION get_cycle_summary()
RETURNS TABLE(
    status_type TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.selection_window_status::TEXT,
        COUNT(*)::BIGINT,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscription_management), 2)
    FROM subscription_management sm
    GROUP BY sm.selection_window_status
    UNION ALL
    SELECT 
        ('cycle_' || sm.cycle_status)::TEXT,
        COUNT(*)::BIGINT,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM subscription_management), 2)
    FROM subscription_management sm
    GROUP BY sm.cycle_status;
END;
$$ LANGUAGE plpgsql;

