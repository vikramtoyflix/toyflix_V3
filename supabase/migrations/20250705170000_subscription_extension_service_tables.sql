-- ================================================================================================
-- SUBSCRIPTION EXTENSION SERVICE DATABASE SCHEMA
-- ================================================================================================

-- Enable RLS
ALTER DATABASE postgres SET "app.settings.enable_rls" = true;

-- ================================================================================================
-- USER SUBSCRIPTIONS TABLE (if not exists)
-- ================================================================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('Discovery Delight', 'Silver Pack', 'Gold Pack PRO', 'Ride-On Monthly')),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'pending', 'suspended')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi-annual', 'annual')),
    auto_renewal BOOLEAN DEFAULT true,
    base_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('card', 'upi', 'net_banking', 'wallet', 'cash')),
    next_billing_date TIMESTAMP WITH TIME ZONE,
    grace_period_end TIMESTAMP WITH TIME ZONE,
    pause_count INTEGER DEFAULT 0,
    extension_days INTEGER DEFAULT 0,
    free_months_added INTEGER DEFAULT 0,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- SUBSCRIPTION ACTIONS TABLE (Audit Trail)
-- ================================================================================================

CREATE TABLE IF NOT EXISTS subscription_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('plan_change', 'pause', 'resume', 'cancel', 'extend', 'add_free_month', 'billing_update', 'credit', 'refund')),
    action_data JSONB NOT NULL,
    performed_by TEXT NOT NULL, -- User ID or 'system'
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    amount_change DECIMAL(10,2),
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- BILLING ADJUSTMENTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS billing_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund', 'discount')),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT, -- Order ID, subscription ID, or ticket ID
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    performed_by TEXT NOT NULL, -- User ID or 'system'
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- SUBSCRIPTION HISTORY TABLE (for plan changes)
-- ================================================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    previous_plan_type TEXT NOT NULL,
    new_plan_type TEXT NOT NULL,
    previous_amount DECIMAL(10,2) NOT NULL,
    new_amount DECIMAL(10,2) NOT NULL,
    prorated_amount DECIMAL(10,2) NOT NULL,
    change_reason TEXT,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- SUBSCRIPTION EXTENSIONS TABLE (detailed tracking)
-- ================================================================================================

CREATE TABLE IF NOT EXISTS subscription_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    extension_type TEXT NOT NULL CHECK (extension_type IN ('days', 'free_month', 'pause_compensation')),
    days_added INTEGER NOT NULL,
    reason TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    original_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    new_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- SUBSCRIPTION PAUSES TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS subscription_pauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    pause_start TIMESTAMP WITH TIME ZONE NOT NULL,
    pause_end TIMESTAMP WITH TIME ZONE,
    pause_days INTEGER NOT NULL,
    reason TEXT,
    performed_by TEXT NOT NULL,
    resumed_at TIMESTAMP WITH TIME ZONE,
    resumed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================================

-- User subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_type ON user_subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_billing_cycle ON user_subscriptions(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Subscription actions indexes
CREATE INDEX IF NOT EXISTS idx_subscription_actions_subscription_id ON subscription_actions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_actions_action_type ON subscription_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_subscription_actions_performed_by ON subscription_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_subscription_actions_performed_at ON subscription_actions(performed_at);

-- Billing adjustments indexes
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_user_id ON billing_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_type ON billing_adjustments(type);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_processed ON billing_adjustments(processed);
CREATE INDEX IF NOT EXISTS idx_billing_adjustments_reference_id ON billing_adjustments(reference_id);

-- Subscription history indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_effective_date ON subscription_history(effective_date);

-- Subscription extensions indexes
CREATE INDEX IF NOT EXISTS idx_subscription_extensions_subscription_id ON subscription_extensions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_extensions_extension_type ON subscription_extensions(extension_type);
CREATE INDEX IF NOT EXISTS idx_subscription_extensions_performed_at ON subscription_extensions(performed_at);

-- Subscription pauses indexes
CREATE INDEX IF NOT EXISTS idx_subscription_pauses_subscription_id ON subscription_pauses(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_pauses_pause_start ON subscription_pauses(pause_start);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pauses ENABLE ROW LEVEL SECURITY;

-- User subscriptions policies
CREATE POLICY "user_subscriptions_select" ON user_subscriptions
    FOR SELECT USING (
        user_id IN (
            SELECT user_id FROM user_sessions 
            WHERE session_token = current_setting('app.current_user_session_token', true)
            AND expires_at > NOW()
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "user_subscriptions_insert" ON user_subscriptions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "user_subscriptions_update" ON user_subscriptions
    FOR UPDATE USING (
        user_id IN (
            SELECT user_id FROM user_sessions 
            WHERE session_token = current_setting('app.current_user_session_token', true)
            AND expires_at > NOW()
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Subscription actions policies (admin only for modifications)
CREATE POLICY "subscription_actions_select" ON subscription_actions
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM user_subscriptions 
            WHERE user_id IN (
                SELECT user_id FROM user_sessions 
                WHERE session_token = current_setting('app.current_user_session_token', true)
                AND expires_at > NOW()
                AND is_active = true
            )
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "subscription_actions_insert" ON subscription_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Billing adjustments policies (admin only)
CREATE POLICY "billing_adjustments_select" ON billing_adjustments
    FOR SELECT USING (
        user_id IN (
            SELECT user_id FROM user_sessions 
            WHERE session_token = current_setting('app.current_user_session_token', true)
            AND expires_at > NOW()
            AND is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "billing_adjustments_insert" ON billing_adjustments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Subscription history policies (read-only for users, full access for admins)
CREATE POLICY "subscription_history_select" ON subscription_history
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM user_subscriptions 
            WHERE user_id IN (
                SELECT user_id FROM user_sessions 
                WHERE session_token = current_setting('app.current_user_session_token', true)
                AND expires_at > NOW()
                AND is_active = true
            )
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "subscription_history_insert" ON subscription_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Subscription extensions policies
CREATE POLICY "subscription_extensions_select" ON subscription_extensions
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM user_subscriptions 
            WHERE user_id IN (
                SELECT user_id FROM user_sessions 
                WHERE session_token = current_setting('app.current_user_session_token', true)
                AND expires_at > NOW()
                AND is_active = true
            )
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "subscription_extensions_insert" ON subscription_extensions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Subscription pauses policies
CREATE POLICY "subscription_pauses_select" ON subscription_pauses
    FOR SELECT USING (
        subscription_id IN (
            SELECT id FROM user_subscriptions 
            WHERE user_id IN (
                SELECT user_id FROM user_sessions 
                WHERE session_token = current_setting('app.current_user_session_token', true)
                AND expires_at > NOW()
                AND is_active = true
            )
        )
        OR EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "subscription_pauses_insert" ON subscription_pauses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM custom_users cu
            JOIN user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- ================================================================================================
-- HELPER FUNCTIONS
-- ================================================================================================

-- Function to get current user ID from session token
CREATE OR REPLACE FUNCTION get_current_user_id_from_session()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT user_id FROM user_sessions 
        WHERE session_token = current_setting('app.current_user_session_token', true)
        AND expires_at > NOW()
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM custom_users cu
        JOIN user_sessions us ON cu.id = us.user_id
        WHERE us.session_token = current_setting('app.current_user_session_token', true)
        AND us.expires_at > NOW()
        AND us.is_active = true
        AND cu.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate prorated amount
CREATE OR REPLACE FUNCTION calculate_prorated_amount(
    current_plan_price DECIMAL,
    new_plan_price DECIMAL,
    remaining_days INTEGER,
    billing_cycle TEXT DEFAULT 'monthly'
)
RETURNS DECIMAL AS $calculate_prorated$
DECLARE
    cycle_multiplier INTEGER;
    cycle_discount DECIMAL;
    current_monthly_price DECIMAL;
    new_monthly_price DECIMAL;
    current_daily_rate DECIMAL;
    new_daily_rate DECIMAL;
    days_in_month INTEGER := 30;
BEGIN
    -- Set cycle parameters
    CASE billing_cycle
        WHEN 'monthly' THEN cycle_multiplier := 1; cycle_discount := 0;
        WHEN 'quarterly' THEN cycle_multiplier := 3; cycle_discount := 0.05;
        WHEN 'semi-annual' THEN cycle_multiplier := 6; cycle_discount := 0.10;
        WHEN 'annual' THEN cycle_multiplier := 12; cycle_discount := 0.15;
        ELSE cycle_multiplier := 1; cycle_discount := 0;
    END CASE;

    -- Calculate effective monthly prices
    current_monthly_price := current_plan_price * (1 - cycle_discount);
    new_monthly_price := new_plan_price * (1 - cycle_discount);

    -- Calculate daily rates
    current_daily_rate := current_monthly_price / days_in_month;
    new_daily_rate := new_monthly_price / days_in_month;

    -- Return prorated difference
    RETURN ROUND((new_daily_rate - current_daily_rate) * remaining_days, 2);
END;
$calculate_prorated$ LANGUAGE plpgsql;

-- Function to get subscription stats
CREATE OR REPLACE FUNCTION get_subscription_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    subscription_record user_subscriptions%ROWTYPE;
    stats JSON;
BEGIN
    SELECT * INTO subscription_record 
    FROM user_subscriptions 
    WHERE user_id = p_user_id 
    AND status IN ('active', 'paused')
    ORDER BY created_at DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT json_build_object(
        'subscription_id', subscription_record.id,
        'plan_type', subscription_record.plan_type,
        'status', subscription_record.status,
        'current_period_start', subscription_record.current_period_start,
        'current_period_end', subscription_record.current_period_end,
        'days_remaining', GREATEST(0, EXTRACT(DAY FROM subscription_record.current_period_end - NOW())),
        'extension_days', subscription_record.extension_days,
        'free_months_added', subscription_record.free_months_added,
        'pause_count', subscription_record.pause_count,
        'auto_renewal', subscription_record.auto_renewal,
        'total_amount', subscription_record.total_amount
    ) INTO stats;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================================================
-- TRIGGERS FOR AUDIT TRAIL
-- ================================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log subscription changes
CREATE OR REPLACE FUNCTION log_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log plan changes
        IF OLD.plan_type != NEW.plan_type THEN
            INSERT INTO subscription_history (
                subscription_id, previous_plan_type, new_plan_type,
                previous_amount, new_amount, prorated_amount,
                change_reason, effective_date, performed_by
            ) VALUES (
                NEW.id, OLD.plan_type, NEW.plan_type,
                OLD.total_amount, NEW.total_amount,
                NEW.total_amount - OLD.total_amount,
                'Plan change', NOW(), 'system'
            );
        END IF;

        -- Log extensions
        IF OLD.extension_days != NEW.extension_days THEN
            INSERT INTO subscription_extensions (
                subscription_id, extension_type, days_added,
                reason, performed_by, original_end_date, new_end_date
            ) VALUES (
                NEW.id, 'days', NEW.extension_days - OLD.extension_days,
                'Extension applied', 'system', OLD.current_period_end, NEW.current_period_end
            );
        END IF;

        -- Log pauses
        IF OLD.status != NEW.status AND NEW.status = 'paused' THEN
            INSERT INTO subscription_pauses (
                subscription_id, pause_start, pause_days,
                reason, performed_by
            ) VALUES (
                NEW.id, NOW(), 0, 'Subscription paused', 'system'
            );
        END IF;

        -- Log resume
        IF OLD.status = 'paused' AND NEW.status = 'active' THEN
            UPDATE subscription_pauses 
            SET pause_end = NOW(), resumed_at = NOW(), resumed_by = 'system'
            WHERE subscription_id = NEW.id AND pause_end IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply subscription change trigger
CREATE TRIGGER log_subscription_changes
    AFTER UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION log_subscription_change();

-- ================================================================================================
-- INITIAL DATA SETUP
-- ================================================================================================

-- Insert default subscription plans metadata (for reference)
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_type TEXT PRIMARY KEY,
    price DECIMAL(10,2) NOT NULL,
    max_toys INTEGER NOT NULL,
    max_extensions INTEGER NOT NULL,
    features JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO subscription_plans (plan_type, price, max_toys, max_extensions, features) VALUES
('Discovery Delight', 1299.00, 4, 30, '["Monthly plan", "3 toys + 1 book", "Premium quality guaranteed"]'),
('Silver Pack', 5999.00, 6, 90, '["6 months plan", "110+ toys selection", "Big adventure toys", "Free delivery"]'),
('Gold Pack PRO', 7999.00, 8, 180, '["6 months PRO plan", "220+ premium toys", "Early access", "Priority support"]'),
('Ride-On Monthly', 1999.00, 1, 30, '["Monthly plan", "Large ride-on toys", "No age restrictions", "Premium quality"]')
ON CONFLICT (plan_type) DO UPDATE SET
    price = EXCLUDED.price,
    max_toys = EXCLUDED.max_toys,
    max_extensions = EXCLUDED.max_extensions,
    features = EXCLUDED.features;

-- ================================================================================================
-- COMPLETION LOG
-- ================================================================================================

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log the completion of this migration
INSERT INTO public.migration_log (
    migration_name, 
    description, 
    applied_at
) VALUES (
    '20250705170000_subscription_extension_service_tables',
    'Created comprehensive database schema for SubscriptionExtensionService including user_subscriptions, subscription_actions, billing_adjustments, subscription_history, subscription_extensions, and subscription_pauses tables with proper RLS policies, indexes, and helper functions',
    NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
    description = EXCLUDED.description,
    applied_at = EXCLUDED.applied_at;

-- ================================================================================================
-- GRANTS AND PERMISSIONS
-- ================================================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT ON subscription_actions TO authenticated;
GRANT SELECT, INSERT ON billing_adjustments TO authenticated;
GRANT SELECT, INSERT ON subscription_history TO authenticated;
GRANT SELECT, INSERT ON subscription_extensions TO authenticated;
GRANT SELECT, INSERT ON subscription_pauses TO authenticated;
GRANT SELECT ON subscription_plans TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ================================================================================================
-- DOCUMENTATION
-- ================================================================================================

COMMENT ON TABLE user_subscriptions IS 'Main subscription table storing user subscription details';
COMMENT ON TABLE subscription_actions IS 'Audit trail for all subscription actions and changes';
COMMENT ON TABLE billing_adjustments IS 'Records of billing adjustments, credits, and refunds';
COMMENT ON TABLE subscription_history IS 'History of plan changes with prorated amounts';
COMMENT ON TABLE subscription_extensions IS 'Detailed tracking of subscription extensions';
COMMENT ON TABLE subscription_pauses IS 'Records of subscription pauses and resumes';
COMMENT ON TABLE subscription_plans IS 'Master data for subscription plan configurations';

COMMENT ON FUNCTION calculate_prorated_amount IS 'Calculate prorated amount for plan changes';
COMMENT ON FUNCTION get_subscription_stats IS 'Get comprehensive subscription statistics for a user';
COMMENT ON FUNCTION get_current_user_id_from_session IS 'Get current user ID from session token';
COMMENT ON FUNCTION is_current_user_admin IS 'Check if current user has admin privileges';

-- ================================================================================================
-- COMPLETION LOG
-- ================================================================================================

-- Log the completion of this migration
INSERT INTO public.migration_log (
    migration_name, 
    description, 
    applied_at
) VALUES (
    '20250705170000_subscription_extension_service_tables',
    'Created comprehensive database schema for SubscriptionExtensionService including user_subscriptions, subscription_actions, billing_adjustments, subscription_history, subscription_extensions, and subscription_pauses tables with proper RLS policies, indexes, and helper functions',
    NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
    description = EXCLUDED.description,
    applied_at = EXCLUDED.applied_at; 