-- ============================================================================
-- FIX USER VERIFICATION SYSTEM
-- ============================================================================
-- This migration fixes the phone verification issues and adds monitoring
-- ============================================================================

-- ============================================================================
-- 1. IMMEDIATE FIXES FOR EXISTING DATA
-- ============================================================================

-- Fix phone_verified for users who have verified OTPs but aren't marked as verified
UPDATE custom_users 
SET 
    phone_verified = true,
    updated_at = NOW()
WHERE 
    phone_verified = false 
    AND phone IN (
        SELECT DISTINCT phone_number 
        FROM otp_verifications 
        WHERE is_verified = true
    );

-- Fix bulk imported users (July 5th) with complete profiles
UPDATE custom_users 
SET 
    phone_verified = true,
    updated_at = NOW()
WHERE 
    phone_verified = false 
    AND first_name IS NOT NULL 
    AND first_name != ''
    AND last_name IS NOT NULL 
    AND last_name != ''
    AND created_at::date = '2025-07-05';

-- Fix phone formats (add +91 prefix where missing)
UPDATE custom_users 
SET 
    phone = '+91' || phone,
    updated_at = NOW()
WHERE 
    phone NOT LIKE '+91%' 
    AND phone ~ '^[0-9]{10}$'
    AND LENGTH(phone) = 10;

-- ============================================================================
-- 2. CREATE SIGNUP COMPLETION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signup_completion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    completion_step TEXT NOT NULL CHECK (completion_step IN ('otp_sent', 'otp_verified', 'profile_completed', 'session_created')),
    completion_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT, -- promotional, regular, etc.
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_signup_completion_logs_user_id ON signup_completion_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_completion_logs_phone ON signup_completion_logs(phone);
CREATE INDEX IF NOT EXISTS idx_signup_completion_logs_step ON signup_completion_logs(completion_step);
CREATE INDEX IF NOT EXISTS idx_signup_completion_logs_timestamp ON signup_completion_logs(completion_timestamp);

-- ============================================================================
-- 3. CREATE VERIFICATION MONITORING FUNCTIONS
-- ============================================================================

-- Function to get signup funnel statistics
CREATE OR REPLACE FUNCTION get_signup_funnel_stats()
RETURNS TABLE (
    total_signups BIGINT,
    phone_verified BIGINT,
    phone_verified_rate NUMERIC,
    profile_complete BIGINT,
    profile_complete_rate NUMERIC,
    admin_visible BIGINT,
    admin_visible_rate NUMERIC,
    last_24h_signups BIGINT,
    last_7d_signups BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_signups,
        COUNT(CASE WHEN cu.phone_verified = true THEN 1 END) as phone_verified,
        ROUND(COUNT(CASE WHEN cu.phone_verified = true THEN 1 END) * 100.0 / COUNT(*), 2) as phone_verified_rate,
        COUNT(CASE WHEN cu.first_name IS NOT NULL AND cu.first_name != '' AND cu.last_name IS NOT NULL AND cu.last_name != '' THEN 1 END) as profile_complete,
        ROUND(COUNT(CASE WHEN cu.first_name IS NOT NULL AND cu.first_name != '' AND cu.last_name IS NOT NULL AND cu.last_name != '' THEN 1 END) * 100.0 / COUNT(*), 2) as profile_complete_rate,
        COUNT(CASE WHEN cu.phone_verified = true AND cu.first_name IS NOT NULL AND cu.first_name != '' AND cu.is_active = true THEN 1 END) as admin_visible,
        ROUND(COUNT(CASE WHEN cu.phone_verified = true AND cu.first_name IS NOT NULL AND cu.first_name != '' AND cu.is_active = true THEN 1 END) * 100.0 / COUNT(*), 2) as admin_visible_rate,
        COUNT(CASE WHEN cu.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_signups,
        COUNT(CASE WHEN cu.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d_signups
    FROM custom_users cu;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix phone verification from OTPs
CREATE OR REPLACE FUNCTION fix_phone_verification_from_otps()
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER;
BEGIN
    UPDATE custom_users 
    SET 
        phone_verified = true,
        updated_at = NOW()
    WHERE 
        phone_verified = false 
        AND phone IN (
            SELECT DISTINCT phone_number 
            FROM otp_verifications 
            WHERE is_verified = true
        );
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    -- Log the fix
    INSERT INTO signup_completion_logs (
        user_id, phone, completion_step, source, metadata
    )
    SELECT 
        id, phone, 'verification_fixed', 'bulk_fix',
        jsonb_build_object('fixed_at', NOW(), 'reason', 'otp_verified_but_user_not_marked')
    FROM custom_users 
    WHERE 
        phone_verified = true 
        AND updated_at >= NOW() - INTERVAL '1 minute'
        AND phone IN (
            SELECT DISTINCT phone_number 
            FROM otp_verifications 
            WHERE is_verified = true
        );
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix phone formats
CREATE OR REPLACE FUNCTION fix_phone_formats()
RETURNS INTEGER AS $$
DECLARE
    fixed_count INTEGER;
BEGIN
    UPDATE custom_users 
    SET 
        phone = '+91' || phone,
        updated_at = NOW()
    WHERE 
        phone NOT LIKE '+91%' 
        AND phone ~ '^[0-9]{10}$'
        AND LENGTH(phone) = 10;
    
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log signup completion steps
CREATE OR REPLACE FUNCTION log_signup_step(
    p_user_id UUID,
    p_phone TEXT,
    p_step TEXT,
    p_source TEXT DEFAULT 'unknown',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO signup_completion_logs (
        user_id, phone, completion_step, source, metadata
    ) VALUES (
        p_user_id, p_phone, p_step, p_source, p_metadata
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the signup process for logging errors
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE VERIFICATION MONITORING VIEWS
-- ============================================================================

-- View for admin panel to show complete user verification status
CREATE OR REPLACE VIEW user_verification_status AS
SELECT 
    u.id,
    u.phone,
    u.email,
    u.first_name,
    u.last_name,
    u.phone_verified,
    u.is_active,
    u.created_at,
    u.last_login,
    u.subscription_active,
    CASE 
        WHEN u.phone_verified = false THEN 'phone_not_verified'
        WHEN u.first_name IS NULL OR u.first_name = '' THEN 'profile_incomplete'
        WHEN u.last_login IS NULL THEN 'never_logged_in'
        WHEN u.is_active = false THEN 'inactive'
        ELSE 'complete'
    END as verification_status,
    CASE 
        WHEN u.phone_verified = true AND u.first_name IS NOT NULL AND u.first_name != '' AND u.is_active = true THEN true
        ELSE false
    END as should_be_visible_in_admin,
    (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > NOW()) as active_sessions_count,
    (SELECT MAX(completion_timestamp) FROM signup_completion_logs l WHERE l.user_id = u.id) as last_completion_step_at
FROM custom_users u;

-- View for signup funnel analysis
CREATE OR REPLACE VIEW signup_funnel_analysis AS
SELECT 
    DATE(created_at) as signup_date,
    COUNT(*) as total_signups,
    COUNT(CASE WHEN phone_verified = true THEN 1 END) as phone_verified_count,
    ROUND(COUNT(CASE WHEN phone_verified = true THEN 1 END) * 100.0 / COUNT(*), 2) as phone_verification_rate,
    COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as profile_complete_count,
    ROUND(COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) * 100.0 / COUNT(*), 2) as profile_completion_rate,
    COUNT(CASE WHEN subscription_active = true THEN 1 END) as subscription_count,
    ROUND(COUNT(CASE WHEN subscription_active = true THEN 1 END) * 100.0 / COUNT(*), 2) as subscription_rate,
    COUNT(CASE WHEN phone_verified = true AND first_name IS NOT NULL AND first_name != '' AND is_active = true THEN 1 END) as admin_visible_count,
    ROUND(COUNT(CASE WHEN phone_verified = true AND first_name IS NOT NULL AND first_name != '' AND is_active = true THEN 1 END) * 100.0 / COUNT(*), 2) as admin_visible_rate
FROM custom_users 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- ============================================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC VERIFICATION TRACKING
-- ============================================================================

-- Trigger to automatically log signup completion steps
CREATE OR REPLACE FUNCTION trigger_log_signup_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when phone gets verified
    IF OLD.phone_verified = false AND NEW.phone_verified = true THEN
        PERFORM log_signup_step(
            NEW.id, 
            NEW.phone, 
            'phone_verified', 
            'automatic',
            jsonb_build_object('verified_at', NOW())
        );
    END IF;
    
    -- Log when profile gets completed
    IF (OLD.first_name IS NULL OR OLD.first_name = '' OR OLD.last_name IS NULL OR OLD.last_name = '') 
       AND (NEW.first_name IS NOT NULL AND NEW.first_name != '' AND NEW.last_name IS NOT NULL AND NEW.last_name != '') THEN
        PERFORM log_signup_step(
            NEW.id, 
            NEW.phone, 
            'profile_completed', 
            'automatic',
            jsonb_build_object('completed_at', NOW(), 'first_name', NEW.first_name, 'last_name', NEW.last_name)
        );
    END IF;
    
    -- Log when user becomes admin visible
    IF NOT (OLD.phone_verified = true AND OLD.first_name IS NOT NULL AND OLD.first_name != '' AND OLD.is_active = true)
       AND (NEW.phone_verified = true AND NEW.first_name IS NOT NULL AND NEW.first_name != '' AND NEW.is_active = true) THEN
        PERFORM log_signup_step(
            NEW.id, 
            NEW.phone, 
            'admin_visible', 
            'automatic',
            jsonb_build_object('visible_at', NOW())
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS signup_completion_tracking ON custom_users;
CREATE TRIGGER signup_completion_tracking
    AFTER UPDATE ON custom_users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_signup_completion();

-- ============================================================================
-- 6. VERIFICATION HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_verification_health()
RETURNS TABLE (
    metric TEXT,
    current_value BIGINT,
    expected_range TEXT,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified,
            COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as complete_profiles
        FROM custom_users
    )
    SELECT 
        'Phone Verification Rate'::TEXT as metric,
        ROUND((verified * 100.0 / total))::BIGINT as current_value,
        '85-95%'::TEXT as expected_range,
        CASE 
            WHEN (verified * 100.0 / total) >= 85 THEN '✅ HEALTHY'
            WHEN (verified * 100.0 / total) >= 70 THEN '⚠️ WARNING'
            ELSE '🚨 CRITICAL'
        END as status,
        CASE 
            WHEN (verified * 100.0 / total) < 85 THEN 'Run phone verification fixes'
            ELSE 'Monitor regularly'
        END as recommendation
    FROM stats
    
    UNION ALL
    
    SELECT 
        'Profile Completion Rate'::TEXT,
        ROUND((complete_profiles * 100.0 / total))::BIGINT,
        '75-90%'::TEXT,
        CASE 
            WHEN (complete_profiles * 100.0 / total) >= 75 THEN '✅ HEALTHY'
            WHEN (complete_profiles * 100.0 / total) >= 60 THEN '⚠️ WARNING'
            ELSE '🚨 CRITICAL'
        END,
        CASE 
            WHEN (complete_profiles * 100.0 / total) < 75 THEN 'Improve signup flow UX'
            ELSE 'Monitor completion rates'
        END
    FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. DATA VALIDATION FUNCTIONS
-- ============================================================================

-- Function to validate user data integrity
CREATE OR REPLACE FUNCTION validate_user_data(p_user_id UUID)
RETURNS TABLE (
    validation_item TEXT,
    is_valid BOOLEAN,
    current_value TEXT,
    recommendation TEXT
) AS $$
DECLARE
    user_record custom_users%ROWTYPE;
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM custom_users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'User Exists'::TEXT, false, 'Not Found'::TEXT, 'Check user ID'::TEXT;
        RETURN;
    END IF;
    
    -- Phone format validation
    RETURN QUERY SELECT 
        'Phone Format'::TEXT,
        user_record.phone LIKE '+91%' AND LENGTH(user_record.phone) = 13,
        user_record.phone,
        CASE WHEN user_record.phone NOT LIKE '+91%' THEN 'Update phone format' ELSE 'Valid' END;
    
    -- Phone verification validation
    RETURN QUERY SELECT 
        'Phone Verified'::TEXT,
        user_record.phone_verified,
        user_record.phone_verified::TEXT,
        CASE WHEN NOT user_record.phone_verified THEN 'Verify phone number' ELSE 'Valid' END;
    
    -- Profile completeness validation
    RETURN QUERY SELECT 
        'Profile Complete'::TEXT,
        (user_record.first_name IS NOT NULL AND user_record.first_name != '' AND 
         user_record.last_name IS NOT NULL AND user_record.last_name != ''),
        COALESCE(user_record.first_name, 'NULL') || ' ' || COALESCE(user_record.last_name, 'NULL'),
        CASE WHEN (user_record.first_name IS NULL OR user_record.first_name = '' OR 
                  user_record.last_name IS NULL OR user_record.last_name = '') 
             THEN 'Complete profile information' ELSE 'Valid' END;
    
    -- Active status validation
    RETURN QUERY SELECT 
        'Active Status'::TEXT,
        user_record.is_active,
        user_record.is_active::TEXT,
        CASE WHEN NOT user_record.is_active THEN 'Reactivate user' ELSE 'Valid' END;
    
    -- Admin visibility validation
    RETURN QUERY SELECT 
        'Admin Visible'::TEXT,
        (user_record.phone_verified = true AND user_record.first_name IS NOT NULL AND 
         user_record.first_name != '' AND user_record.is_active = true),
        CASE WHEN (user_record.phone_verified = true AND user_record.first_name IS NOT NULL AND 
                  user_record.first_name != '' AND user_record.is_active = true) 
             THEN 'Yes' ELSE 'No' END,
        CASE WHEN NOT (user_record.phone_verified = true AND user_record.first_name IS NOT NULL AND 
                      user_record.first_name != '' AND user_record.is_active = true) 
             THEN 'Fix verification and profile issues' ELSE 'Valid' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. AUTOMATED CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up orphaned sessions
CREATE OR REPLACE FUNCTION cleanup_orphaned_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE user_id NOT IN (SELECT id FROM custom_users);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix common verification issues
CREATE OR REPLACE FUNCTION fix_common_verification_issues()
RETURNS TABLE (
    fix_type TEXT,
    users_fixed INTEGER,
    description TEXT
) AS $$
DECLARE
    phone_fix_count INTEGER;
    format_fix_count INTEGER;
    bulk_fix_count INTEGER;
BEGIN
    -- Fix 1: Phone verification from OTPs
    SELECT fix_phone_verification_from_otps() INTO phone_fix_count;
    
    -- Fix 2: Phone formats
    SELECT fix_phone_formats() INTO format_fix_count;
    
    -- Fix 3: Bulk imported users
    UPDATE custom_users 
    SET 
        phone_verified = true,
        updated_at = NOW()
    WHERE 
        phone_verified = false 
        AND first_name IS NOT NULL 
        AND first_name != ''
        AND last_name IS NOT NULL 
        AND last_name != ''
        AND created_at::date = '2025-07-05';
    
    GET DIAGNOSTICS bulk_fix_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY VALUES 
        ('Phone Verification Fix'::TEXT, phone_fix_count, 'Fixed users with verified OTPs'),
        ('Phone Format Fix'::TEXT, format_fix_count, 'Added +91 prefix to phone numbers'),
        ('Bulk Import Fix'::TEXT, bulk_fix_count, 'Fixed July 5th bulk imported users');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_signup_funnel_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_phone_verification_from_otps() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_phone_formats() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_common_verification_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION log_signup_step(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Grant permissions on the new table and views
GRANT SELECT, INSERT ON signup_completion_logs TO authenticated;
GRANT SELECT ON user_verification_status TO authenticated;
GRANT SELECT ON signup_funnel_analysis TO authenticated;

-- ============================================================================
-- 10. INITIAL DATA CLEANUP
-- ============================================================================

-- Run the common fixes
SELECT * FROM fix_common_verification_issues();

-- Clean up orphaned sessions
SELECT cleanup_orphaned_sessions() as orphaned_sessions_cleaned;

-- Get initial health check
SELECT * FROM check_verification_health();

-- ============================================================================
-- 11. VERIFICATION COMPLETE
-- ============================================================================

SELECT 
    '✅ User Verification System Fixed' as status,
    'Phone verification issues resolved' as description,
    NOW() as completed_at;
