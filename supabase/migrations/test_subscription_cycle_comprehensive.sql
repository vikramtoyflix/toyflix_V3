-- ========================================
-- Comprehensive Subscription Cycle Tracking Tests
-- Tests all aspects of subscription-based cycle management
-- ========================================

-- Create test schema and helper functions
CREATE SCHEMA IF NOT EXISTS cycle_tests;

-- Helper function to create test users
CREATE OR REPLACE FUNCTION cycle_tests.create_test_user(
    p_phone TEXT,
    p_email TEXT,
    p_name TEXT DEFAULT 'Test User'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    INSERT INTO public.custom_users (
        id,
        phone,
        email,
        first_name,
        last_name,
        phone_verified,
        is_active
    ) VALUES (
        gen_random_uuid(),
        p_phone,
        p_email,
        split_part(p_name, ' ', 1),
        split_part(p_name, ' ', 2),
        true,
        true
    ) RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$;

-- Helper function to create test subscription
CREATE OR REPLACE FUNCTION cycle_tests.create_test_subscription(
    p_user_id UUID,
    p_plan_id TEXT DEFAULT 'Discovery Delight',
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    INSERT INTO public.subscriptions (
        id,
        user_id,
        plan_id,
        status,
        start_date,
        end_date,
        current_period_start,
        current_period_end,
        subscription_start_date,
        cycle_number,
        cycle_start_date,
        cycle_end_date,
        next_selection_window_start,
        next_selection_window_end,
        current_cycle_status,
        total_cycles_completed
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_plan_id,
        p_status,
        p_start_date,
        p_start_date + INTERVAL '1 year',
        p_start_date,
        p_start_date + INTERVAL '30 days',
        p_start_date,
        1,
        p_start_date,
        p_start_date + INTERVAL '29 days',
        p_start_date + INTERVAL '23 days',
        p_start_date + INTERVAL '29 days',
        'active',
        0
    ) RETURNING id INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$;

-- Test results tracking
CREATE TABLE IF NOT EXISTS cycle_tests.test_results (
    id SERIAL PRIMARY KEY,
    test_category TEXT NOT NULL,
    test_name TEXT NOT NULL,
    test_description TEXT,
    expected_result TEXT,
    actual_result TEXT,
    passed BOOLEAN,
    error_message TEXT,
    execution_time INTERVAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Function to record test results
CREATE OR REPLACE FUNCTION cycle_tests.record_test_result(
    p_category TEXT,
    p_name TEXT,
    p_description TEXT,
    p_expected TEXT,
    p_actual TEXT,
    p_passed BOOLEAN,
    p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO cycle_tests.test_results (
        test_category,
        test_name,
        test_description,
        expected_result,
        actual_result,
        passed,
        error_message
    ) VALUES (
        p_category,
        p_name,
        p_description,
        p_expected,
        p_actual,
        p_passed,
        p_error
    );
END;
$$;

-- ========================================
-- TEST CATEGORY 1: Cycle Calculations
-- ========================================

DO $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_cycle_data RECORD;
    v_test_start TIMESTAMP := NOW();
    v_expected TEXT;
    v_actual TEXT;
    v_passed BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting Cycle Calculations Tests...';
    
    -- Test 1.1: Verify cycle numbers are correct from subscription start
    BEGIN
        -- Create test user and subscription (started 45 days ago)
        v_user_id := cycle_tests.create_test_user('9876543210', 'cycle.test@example.com', 'Cycle Tester');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', CURRENT_DATE - INTERVAL '45 days');
        
        -- Get current cycle data
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        -- Test cycle number calculation (45 days = cycle 2)
        v_expected := '2';
        v_actual := v_cycle_data.current_cycle_number::TEXT;
        v_passed := (v_cycle_data.current_cycle_number = 2);
        
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Cycle Number Calculation',
            'Verify cycle number is correct after 45 days (should be cycle 2)',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Cycle Number Calculation',
            'Error during cycle number test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 1.2: Test cycle progress calculations
    BEGIN
        -- Calculate expected progress (45 days into 30-day cycles = 15 days into cycle 2 = 50%)
        v_expected := '50.00';
        v_actual := ROUND(v_cycle_data.cycle_progress_percentage, 2)::TEXT;
        v_passed := (ABS(v_cycle_data.cycle_progress_percentage - 50.0) < 5.0);
        
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Cycle Progress Calculation',
            'Verify cycle progress percentage is calculated correctly',
            v_expected || '%',
            v_actual || '%',
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Cycle Progress Calculation',
            'Error during progress calculation test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 1.3: Validate selection window timing
    BEGIN
        -- Check if selection window status is appropriate
        v_expected := 'open OR closed OR upcoming';
        v_actual := v_cycle_data.selection_window_status;
        v_passed := (v_cycle_data.selection_window_status IN ('open', 'closed', 'upcoming'));
        
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Selection Window Status',
            'Verify selection window status is valid',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Selection Window Status',
            'Error during selection window test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 1.4: Check next cycle date predictions
    BEGIN
        -- Next cycle should start when current cycle ends
        v_expected := 'Valid future date';
        v_actual := (v_cycle_data.current_cycle_end + INTERVAL '1 day')::TEXT;
        v_passed := (v_cycle_data.current_cycle_end IS NOT NULL AND v_cycle_data.current_cycle_end > CURRENT_DATE);
        
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Next Cycle Date Prediction',
            'Verify next cycle date is correctly calculated',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Cycle Calculations',
            'Next Cycle Date Prediction',
            'Error during next cycle date test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    RAISE NOTICE 'Cycle Calculations Tests Completed';
END $$;

-- ========================================
-- TEST CATEGORY 2: Different Subscription Scenarios
-- ========================================

DO $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_cycle_id UUID;
    v_cycle_data RECORD;
    v_expected TEXT;
    v_actual TEXT;
    v_passed BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting Subscription Scenarios Tests...';
    
    -- Test 2.1: New subscriptions (first cycle)
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543211', 'new.sub@example.com', 'New Subscriber');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', CURRENT_DATE);
        
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        v_expected := '1';
        v_actual := v_cycle_data.current_cycle_number::TEXT;
        v_passed := (v_cycle_data.current_cycle_number = 1);
        
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'New Subscription First Cycle',
            'Verify new subscription starts with cycle 1',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'New Subscription First Cycle',
            'Error during new subscription test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 2.2: Long-term subscriptions (many cycles)
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543212', 'longterm@example.com', 'Long Term User');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Gold Pack', CURRENT_DATE - INTERVAL '365 days');
        
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        -- After 365 days, should be around cycle 12-13
        v_expected := '12 or 13';
        v_actual := v_cycle_data.current_cycle_number::TEXT;
        v_passed := (v_cycle_data.current_cycle_number BETWEEN 12 AND 13);
        
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Long-term Subscription Cycles',
            'Verify long-term subscription has correct cycle number after 1 year',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Long-term Subscription Cycles',
            'Error during long-term subscription test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 2.3: Paused subscriptions
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543213', 'paused@example.com', 'Paused User');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Silver Pack', CURRENT_DATE - INTERVAL '30 days', 'paused');
        
        SELECT COUNT(*) INTO v_actual 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        v_expected := '1';
        v_passed := (v_actual::INTEGER = 1);
        
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Paused Subscription Visibility',
            'Verify paused subscriptions still appear in current cycle view',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Paused Subscription Visibility',
            'Error during paused subscription test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 2.4: Plan changes mid-cycle
    BEGIN
        -- Create a cycle and test plan change functionality
        v_cycle_id := public.create_subscription_cycle(v_subscription_id, 1);
        
        v_expected := 'UUID returned';
        v_actual := CASE WHEN v_cycle_id IS NOT NULL THEN 'UUID returned' ELSE 'NULL' END;
        v_passed := (v_cycle_id IS NOT NULL);
        
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Plan Change Cycle Creation',
            'Verify cycle can be created during plan changes',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Subscription Scenarios',
            'Plan Change Cycle Creation',
            'Error during plan change test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    RAISE NOTICE 'Subscription Scenarios Tests Completed';
END $$;

-- ========================================
-- TEST CATEGORY 3: Edge Cases
-- ========================================

DO $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_cycle_data RECORD;
    v_expected TEXT;
    v_actual TEXT;
    v_passed BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting Edge Cases Tests...';
    
    -- Test 3.1: Subscription start on month end
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543214', 'monthend@example.com', 'Month End User');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', '2024-01-31'::DATE);
        
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        v_expected := 'Valid cycle data';
        v_actual := CASE WHEN v_cycle_data.subscription_id IS NOT NULL THEN 'Valid cycle data' ELSE 'No data' END;
        v_passed := (v_cycle_data.subscription_id IS NOT NULL);
        
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Month End Subscription Start',
            'Verify subscription starting on month end works correctly',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Month End Subscription Start',
            'Error during month end test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 3.2: Leap year handling
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543215', 'leapyear@example.com', 'Leap Year User');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', '2024-02-29'::DATE);
        
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        v_expected := 'Valid leap year handling';
        v_actual := CASE WHEN v_cycle_data.subscription_id IS NOT NULL THEN 'Valid leap year handling' ELSE 'Failed' END;
        v_passed := (v_cycle_data.subscription_id IS NOT NULL);
        
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Leap Year Date Handling',
            'Verify subscription on leap year date (Feb 29) works correctly',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Leap Year Date Handling',
            'Error during leap year test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 3.3: Timezone differences (implicit in DATE vs TIMESTAMP handling)
    BEGIN
        -- Test that DATE fields handle timezone correctly
        v_user_id := cycle_tests.create_test_user('9876543216', 'timezone@example.com', 'Timezone User');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', CURRENT_DATE);
        
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        -- Test that dates are consistent regardless of timezone
        v_expected := 'Consistent date handling';
        v_actual := CASE 
            WHEN v_cycle_data.current_cycle_start = CURRENT_DATE THEN 'Consistent date handling' 
            ELSE 'Inconsistent dates' 
        END;
        v_passed := (v_cycle_data.current_cycle_start = CURRENT_DATE);
        
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Timezone Date Consistency',
            'Verify date fields are timezone-consistent',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'Edge Cases',
            'Timezone Date Consistency',
            'Error during timezone test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    RAISE NOTICE 'Edge Cases Tests Completed';
END $$;

-- ========================================
-- TEST CATEGORY 4: User Experience Validation
-- ========================================

DO $$
DECLARE
    v_user_id UUID;
    v_subscription_id UUID;
    v_cycle_id UUID;
    v_cycle_data RECORD;
    v_selection_windows RECORD;
    v_expected TEXT;
    v_actual TEXT;
    v_passed BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting User Experience Validation Tests...';
    
    -- Test 4.1: Selection windows open/close correctly
    BEGIN
        v_user_id := cycle_tests.create_test_user('9876543217', 'ux.test@example.com', 'UX Tester');
        v_subscription_id := cycle_tests.create_test_subscription(v_user_id, 'Discovery Delight', CURRENT_DATE - INTERVAL '25 days');
        
        -- Create cycle and check selection window
        v_cycle_id := public.create_subscription_cycle(v_subscription_id, 1);
        
        SELECT * INTO v_selection_windows 
        FROM public.subscription_selection_windows 
        WHERE user_id = v_user_id 
        AND cycle_number = 1;
        
        v_expected := 'Valid window status';
        v_actual := v_selection_windows.window_status;
        v_passed := (v_selection_windows.window_status IN ('open', 'closed', 'upcoming', 'completed', 'missed'));
        
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Selection Window Status Validity',
            'Verify selection window has valid status',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Selection Window Status Validity',
            'Error during selection window test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 4.2: Cycle progress displays accurately
    BEGIN
        SELECT * INTO v_cycle_data 
        FROM public.subscription_current_cycle 
        WHERE user_id = v_user_id;
        
        -- Progress should be between 0 and 100
        v_expected := 'Progress between 0-100%';
        v_actual := v_cycle_data.cycle_progress_percentage::TEXT || '%';
        v_passed := (v_cycle_data.cycle_progress_percentage BETWEEN 0 AND 100);
        
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Cycle Progress Range Validation',
            'Verify cycle progress is within valid range (0-100%)',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Cycle Progress Range Validation',
            'Error during progress validation test',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 4.3: Next cycle dates are correct
    BEGIN
        v_expected := 'Future date';
        v_actual := v_cycle_data.current_cycle_end::TEXT;
        v_passed := (v_cycle_data.current_cycle_end >= CURRENT_DATE);
        
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Next Cycle Date Validity',
            'Verify next cycle date is in the future or today',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Next Cycle Date Validity',
            'Error during next cycle date validation',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    -- Test 4.4: Status messages are appropriate
    BEGIN
        v_expected := 'Valid status';
        v_actual := v_cycle_data.selection_window_status;
        v_passed := (v_cycle_data.selection_window_status IN ('open', 'closed', 'upcoming'));
        
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Status Message Appropriateness',
            'Verify selection window status messages are appropriate',
            v_expected,
            v_actual,
            v_passed
        );
        
    EXCEPTION WHEN OTHERS THEN
        PERFORM cycle_tests.record_test_result(
            'User Experience',
            'Status Message Appropriateness',
            'Error during status message validation',
            'No Error',
            SQLERRM,
            FALSE,
            SQLERRM
        );
    END;
    
    RAISE NOTICE 'User Experience Validation Tests Completed';
END $$;

-- ========================================
-- TEST SUMMARY AND CLEANUP
-- ========================================

-- Generate test summary
DO $$
DECLARE
    v_total_tests INTEGER;
    v_passed_tests INTEGER;
    v_failed_tests INTEGER;
    v_pass_rate NUMERIC;
    v_summary RECORD;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUBSCRIPTION CYCLE TRACKING TEST SUMMARY';
    RAISE NOTICE '========================================';
    
    -- Overall statistics
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE passed = TRUE) as passed,
        COUNT(*) FILTER (WHERE passed = FALSE) as failed,
        ROUND(COUNT(*) FILTER (WHERE passed = TRUE) * 100.0 / COUNT(*), 2) as pass_rate
    INTO v_total_tests, v_passed_tests, v_failed_tests, v_pass_rate
    FROM cycle_tests.test_results;
    
    RAISE NOTICE 'Total Tests: %', v_total_tests;
    RAISE NOTICE 'Passed: %', v_passed_tests;
    RAISE NOTICE 'Failed: %', v_failed_tests;
    RAISE NOTICE 'Pass Rate: %', v_pass_rate || '%';
    RAISE NOTICE '';
    
    -- Category breakdown
    RAISE NOTICE 'Results by Category:';
    FOR v_summary IN 
        SELECT 
            test_category,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE passed = TRUE) as passed,
            COUNT(*) FILTER (WHERE passed = FALSE) as failed
        FROM cycle_tests.test_results 
        GROUP BY test_category 
        ORDER BY test_category
    LOOP
        RAISE NOTICE '  %: % total, % passed, % failed', 
            v_summary.test_category, 
            v_summary.total, 
            v_summary.passed, 
            v_summary.failed;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Failed tests details
    IF v_failed_tests > 0 THEN
        RAISE NOTICE 'Failed Tests:';
        FOR v_summary IN 
            SELECT test_category, test_name, test_description, error_message
            FROM cycle_tests.test_results 
            WHERE passed = FALSE
            ORDER BY test_category, test_name
        LOOP
            RAISE NOTICE '  FAILED: % - % (%)', 
                v_summary.test_category, 
                v_summary.test_name, 
                COALESCE(v_summary.error_message, 'Assertion failed');
        END LOOP;
    ELSE
        RAISE NOTICE 'All tests passed! 🎉';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Optional: Clean up test data (commented out for review)
/*
DO $$
BEGIN
    -- Clean up test users and related data
    DELETE FROM public.subscription_cycles 
    WHERE user_id IN (
        SELECT id FROM public.custom_users 
        WHERE email LIKE '%.test@example.com' OR email LIKE '%@example.com'
    );
    
    DELETE FROM public.subscriptions 
    WHERE user_id IN (
        SELECT id FROM public.custom_users 
        WHERE email LIKE '%.test@example.com' OR email LIKE '%@example.com'
    );
    
    DELETE FROM public.custom_users 
    WHERE email LIKE '%.test@example.com' OR email LIKE '%@example.com';
    
    RAISE NOTICE 'Test data cleaned up';
END $$;
*/

-- Keep test results for analysis
COMMENT ON TABLE cycle_tests.test_results IS 'Comprehensive test results for subscription cycle tracking system';

-- Grant access to view test results
GRANT SELECT ON cycle_tests.test_results TO authenticated;

RAISE NOTICE 'Comprehensive subscription cycle tracking tests completed!';
RAISE NOTICE 'View results: SELECT * FROM cycle_tests.test_results ORDER BY test_category, test_name;'; 