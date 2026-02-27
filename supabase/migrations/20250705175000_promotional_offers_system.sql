-- ================================================================================================
-- PROMOTIONAL OFFERS SYSTEM DATABASE SCHEMA
-- ================================================================================================

-- Enable RLS globally
ALTER DATABASE postgres SET "app.settings.enable_rls" = true;

-- ================================================================================================
-- DEPENDENCY CHECKS
-- ================================================================================================

-- Ensure required tables exist before proceeding
DO $$
BEGIN
    -- Check if custom_users table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_users') THEN
        RAISE EXCEPTION 'Required table public.custom_users does not exist. Please run core database migration first.';
    END IF;
    
    -- Check if custom_users has required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'custom_users' AND column_name = 'id') THEN
        RAISE EXCEPTION 'Required column custom_users.id does not exist.';
    END IF;
    
    -- Check if user_sessions table exists (for RLS policies)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
        RAISE EXCEPTION 'Required table public.user_sessions does not exist. Please run core database migration first.';
    END IF;
    
    RAISE NOTICE 'All dependencies verified. Proceeding with promotional offers migration.';
END $$;

-- ================================================================================================
-- PROMOTIONAL OFFERS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS promotional_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('discount_percentage', 'discount_amount', 'free_month', 'free_toys', 'upgrade')),
    value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    target_plans TEXT[] DEFAULT '{}',
    usage_limit INTEGER, -- null = unlimited
    usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    auto_apply BOOLEAN DEFAULT false,
    stackable BOOLEAN DEFAULT false,
    first_time_users_only BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.custom_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT positive_value CHECK (value > 0),
    CONSTRAINT valid_percentage CHECK (
        (type = 'discount_percentage' AND value <= 100) OR 
        (type != 'discount_percentage')
    ),
    CONSTRAINT positive_min_order CHECK (min_order_value >= 0),
    CONSTRAINT positive_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0)
);

-- Verify table was created successfully
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'promotional_offers') THEN
        RAISE EXCEPTION 'Failed to create promotional_offers table';
    END IF;
    RAISE NOTICE 'promotional_offers table created successfully';
END $$;

-- ================================================================================================
-- USER OFFER ASSIGNMENTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS user_offer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES public.custom_users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    order_id UUID, -- Reference to rental_orders
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Unique constraint to prevent duplicate assignments
    UNIQUE(user_id, offer_id),
    
    -- Constraints
    CONSTRAINT valid_usage_dates CHECK (
        (is_used = false AND used_at IS NULL) OR 
        (is_used = true AND used_at IS NOT NULL)
    )
);

-- ================================================================================================
-- OFFER USAGE HISTORY TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS offer_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    order_id UUID, -- Reference to rental_orders
    discount_amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET,
    
    -- Constraints
    CONSTRAINT positive_discount CHECK (discount_amount >= 0),
    CONSTRAINT positive_original_amount CHECK (original_amount > 0),
    CONSTRAINT valid_final_amount CHECK (final_amount >= 0),
    CONSTRAINT valid_discount_calculation CHECK (final_amount = original_amount - discount_amount)
);

-- ================================================================================================
-- OFFER CATEGORIES TABLE (for organization)
-- ================================================================================================

CREATE TABLE IF NOT EXISTS offer_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color_code TEXT, -- For UI display
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================================
-- OFFER CATEGORY ASSIGNMENTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS offer_category_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES offer_categories(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(offer_id, category_id)
);

-- ================================================================================================
-- OFFER REDEMPTION RULES TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS offer_redemption_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('age_range', 'location', 'subscription_duration', 'order_count', 'total_spent')),
    rule_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Example rule_value structures:
    -- age_range: {"min_age": 0, "max_age": 12}
    -- location: {"states": ["Delhi", "Mumbai"], "cities": ["Pune"]}
    -- subscription_duration: {"min_months": 3}
    -- order_count: {"min_orders": 5}
    -- total_spent: {"min_amount": 5000}
);

-- ================================================================================================
-- OFFER TEMPLATES TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS offer_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.custom_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Template data structure example:
    -- {
    --   "type": "discount_percentage",
    --   "value": 20,
    --   "min_order_value": 1000,
    --   "duration_days": 30,
    --   "target_plans": ["basic", "standard"]
    -- }
);

-- ================================================================================================
-- PROMOTIONAL CAMPAIGNS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS promotional_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('seasonal', 'referral', 'loyalty', 'welcome', 'retention')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    budget_limit DECIMAL(10,2),
    spent_amount DECIMAL(10,2) DEFAULT 0,
    target_audience JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.custom_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_campaign_dates CHECK (end_date > start_date),
    CONSTRAINT positive_budget CHECK (budget_limit IS NULL OR budget_limit > 0),
    CONSTRAINT valid_spent_amount CHECK (spent_amount >= 0)
);

-- ================================================================================================
-- CAMPAIGN OFFER ASSIGNMENTS TABLE
-- ================================================================================================

CREATE TABLE IF NOT EXISTS campaign_offer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES promotional_campaigns(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES promotional_offers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(campaign_id, offer_id)
);

-- ================================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================================

-- Promotional offers indexes
CREATE INDEX IF NOT EXISTS idx_promotional_offers_code ON promotional_offers(code);
CREATE INDEX IF NOT EXISTS idx_promotional_offers_type ON promotional_offers(type);
CREATE INDEX IF NOT EXISTS idx_promotional_offers_active ON promotional_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_offers_dates ON promotional_offers(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotional_offers_created_by ON promotional_offers(created_by);
CREATE INDEX IF NOT EXISTS idx_promotional_offers_target_plans ON promotional_offers USING GIN(target_plans);

-- User offer assignments indexes
CREATE INDEX IF NOT EXISTS idx_user_offer_assignments_user_id ON user_offer_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_offer_assignments_offer_id ON user_offer_assignments(offer_id);
CREATE INDEX IF NOT EXISTS idx_user_offer_assignments_assigned_by ON user_offer_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_user_offer_assignments_used ON user_offer_assignments(is_used);
CREATE INDEX IF NOT EXISTS idx_user_offer_assignments_order_id ON user_offer_assignments(order_id);

-- Offer usage history indexes
CREATE INDEX IF NOT EXISTS idx_offer_usage_history_offer_id ON offer_usage_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_usage_history_user_id ON offer_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_usage_history_order_id ON offer_usage_history(order_id);
CREATE INDEX IF NOT EXISTS idx_offer_usage_history_used_at ON offer_usage_history(used_at);

-- Offer categories indexes
CREATE INDEX IF NOT EXISTS idx_offer_categories_name ON offer_categories(name);
CREATE INDEX IF NOT EXISTS idx_offer_categories_active ON offer_categories(is_active);

-- Offer redemption rules indexes
CREATE INDEX IF NOT EXISTS idx_offer_redemption_rules_offer_id ON offer_redemption_rules(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemption_rules_type ON offer_redemption_rules(rule_type);

-- Promotional campaigns indexes
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_type ON promotional_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_active ON promotional_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_dates ON promotional_campaigns(start_date, end_date);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE promotional_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_redemption_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_offer_assignments ENABLE ROW LEVEL SECURITY;

-- Promotional offers policies
CREATE POLICY "promotional_offers_admin_full_access" ON promotional_offers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "promotional_offers_user_read_active" ON promotional_offers
    FOR SELECT USING (
        is_active = true 
        AND start_date <= NOW() 
        AND end_date >= NOW()
        AND EXISTS (
            SELECT 1 FROM public.user_sessions us
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
        )
    );

-- User offer assignments policies
CREATE POLICY "user_offer_assignments_admin_full_access" ON user_offer_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "user_offer_assignments_user_read_own" ON user_offer_assignments
    FOR SELECT USING (
        user_id IN (
            SELECT user_id FROM public.user_sessions 
            WHERE session_token = current_setting('app.current_user_session_token', true)
            AND expires_at > NOW()
            AND is_active = true
        )
    );

-- Offer usage history policies
CREATE POLICY "offer_usage_history_admin_full_access" ON offer_usage_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "offer_usage_history_user_read_own" ON offer_usage_history
    FOR SELECT USING (
        user_id IN (
            SELECT user_id FROM public.user_sessions 
            WHERE session_token = current_setting('app.current_user_session_token', true)
            AND expires_at > NOW()
            AND is_active = true
        )
    );

-- Offer categories policies (read-only for users)
CREATE POLICY "offer_categories_admin_full_access" ON offer_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

CREATE POLICY "offer_categories_user_read_active" ON offer_categories
    FOR SELECT USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM public.user_sessions us
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
        )
    );

-- Offer category assignments policies
CREATE POLICY "offer_category_assignments_admin_full_access" ON offer_category_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Offer redemption rules policies (admin only)
CREATE POLICY "offer_redemption_rules_admin_only" ON offer_redemption_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Offer templates policies (admin only)
CREATE POLICY "offer_templates_admin_only" ON offer_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Promotional campaigns policies (admin only)
CREATE POLICY "promotional_campaigns_admin_only" ON promotional_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- Campaign offer assignments policies (admin only)
CREATE POLICY "campaign_offer_assignments_admin_only" ON campaign_offer_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users cu
            JOIN public.user_sessions us ON cu.id = us.user_id
            WHERE us.session_token = current_setting('app.current_user_session_token', true)
            AND us.expires_at > NOW()
            AND us.is_active = true
            AND cu.role = 'admin'
        )
    );

-- ================================================================================================
-- HELPER FUNCTIONS
-- ================================================================================================

-- Function to check if offer is valid for user
CREATE OR REPLACE FUNCTION is_offer_valid_for_user(p_offer_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    offer_record promotional_offers%ROWTYPE;
    user_record public.custom_users%ROWTYPE;
    assignment_exists BOOLEAN;
BEGIN
    -- Get offer details
    SELECT * INTO offer_record FROM promotional_offers WHERE id = p_offer_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get user details
    SELECT * INTO user_record FROM public.custom_users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if offer is active
    IF NOT offer_record.is_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check date range
    IF NOW() < offer_record.start_date OR NOW() > offer_record.end_date THEN
        RETURN FALSE;
    END IF;
    
    -- Check usage limit
    IF offer_record.usage_limit IS NOT NULL AND offer_record.usage_count >= offer_record.usage_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has this offer assigned (if it's not auto-apply)
    IF NOT offer_record.auto_apply THEN
        SELECT EXISTS(
            SELECT 1 FROM user_offer_assignments 
            WHERE user_id = p_user_id AND offer_id = p_offer_id AND NOT is_used
        ) INTO assignment_exists;
        
        IF NOT assignment_exists THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check first-time user restriction
    IF offer_record.first_time_users_only THEN
        IF EXISTS(SELECT 1 FROM rental_orders WHERE user_id = p_user_id) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check target plans (if user has subscription)
    IF array_length(offer_record.target_plans, 1) > 0 THEN
        IF NOT EXISTS(
            SELECT 1 FROM public.custom_users 
            WHERE id = p_user_id 
            AND subscription_active = true
            AND subscription_plan = ANY(offer_record.target_plans)
        ) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate discount amount
CREATE OR REPLACE FUNCTION calculate_offer_discount(
    p_offer_id UUID, 
    p_order_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    offer_record promotional_offers%ROWTYPE;
    discount_amount DECIMAL;
BEGIN
    -- Get offer details
    SELECT * INTO offer_record FROM promotional_offers WHERE id = p_offer_id;
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Check minimum order value
    IF p_order_amount < offer_record.min_order_value THEN
        RETURN 0;
    END IF;
    
    -- Calculate discount based on type
    CASE offer_record.type
        WHEN 'discount_percentage' THEN
            discount_amount := p_order_amount * (offer_record.value / 100);
        WHEN 'discount_amount' THEN
            discount_amount := offer_record.value;
        ELSE
            discount_amount := 0;
    END CASE;
    
    -- Apply maximum discount limit
    IF offer_record.max_discount_amount IS NOT NULL THEN
        discount_amount := LEAST(discount_amount, offer_record.max_discount_amount);
    END IF;
    
    -- Ensure discount doesn't exceed order amount
    discount_amount := LEAST(discount_amount, p_order_amount);
    
    RETURN ROUND(discount_amount, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply offer to user
CREATE OR REPLACE FUNCTION apply_offer_to_user(
    p_offer_id UUID,
    p_user_id UUID,
    p_order_id UUID,
    p_order_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
    offer_record promotional_offers%ROWTYPE;
    discount_amount DECIMAL;
    final_amount DECIMAL;
    result JSONB;
BEGIN
    -- Validate offer for user
    IF NOT is_offer_valid_for_user(p_offer_id, p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Offer not valid for user');
    END IF;
    
    -- Calculate discount
    discount_amount := calculate_offer_discount(p_offer_id, p_order_amount);
    final_amount := p_order_amount - discount_amount;
    
    -- Get offer details
    SELECT * INTO offer_record FROM promotional_offers WHERE id = p_offer_id;
    
    -- Insert usage history
    INSERT INTO offer_usage_history (
        offer_id, user_id, order_id, discount_amount, 
        original_amount, final_amount, used_at
    ) VALUES (
        p_offer_id, p_user_id, p_order_id, discount_amount, 
        p_order_amount, final_amount, NOW()
    );
    
    -- Update usage count
    UPDATE promotional_offers 
    SET usage_count = usage_count + 1 
    WHERE id = p_offer_id;
    
    -- Mark user assignment as used (if exists)
    UPDATE user_offer_assignments 
    SET is_used = true, used_at = NOW(), order_id = p_order_id
    WHERE user_id = p_user_id AND offer_id = p_offer_id AND NOT is_used;
    
    -- Build result
    result := jsonb_build_object(
        'success', true,
        'offer_code', offer_record.code,
        'offer_name', offer_record.name,
        'discount_amount', discount_amount,
        'final_amount', final_amount,
        'savings', discount_amount
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available offers for user
CREATE OR REPLACE FUNCTION get_available_offers_for_user(p_user_id UUID)
RETURNS TABLE(
    offer_id UUID,
    code TEXT,
    name TEXT,
    description TEXT,
    type TEXT,
    value DECIMAL,
    min_order_value DECIMAL,
    max_discount_amount DECIMAL,
    end_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        po.id,
        po.code,
        po.name,
        po.description,
        po.type,
        po.value,
        po.min_order_value,
        po.max_discount_amount,
        po.end_date
    FROM promotional_offers po
    LEFT JOIN user_offer_assignments uoa ON po.id = uoa.offer_id AND uoa.user_id = p_user_id
    WHERE po.is_active = true
      AND po.start_date <= NOW()
      AND po.end_date >= NOW()
      AND (po.usage_limit IS NULL OR po.usage_count < po.usage_limit)
      AND (po.auto_apply = true OR (uoa.id IS NOT NULL AND uoa.is_used = false))
      AND is_offer_valid_for_user(po.id, p_user_id)
    ORDER BY po.value DESC;
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
CREATE TRIGGER update_promotional_offers_updated_at
    BEFORE UPDATE ON promotional_offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotional_campaigns_updated_at
    BEFORE UPDATE ON promotional_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update campaign spent amount
CREATE OR REPLACE FUNCTION update_campaign_spent_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign spent amount when offer is used
    IF TG_OP = 'INSERT' THEN
        UPDATE promotional_campaigns 
        SET spent_amount = spent_amount + NEW.discount_amount
        WHERE id IN (
            SELECT campaign_id FROM campaign_offer_assignments 
            WHERE offer_id = NEW.offer_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply campaign spent amount trigger
CREATE TRIGGER update_campaign_spent_on_offer_usage
    AFTER INSERT ON offer_usage_history
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_spent_amount();

-- ================================================================================================
-- INITIAL DATA SETUP
-- ================================================================================================

-- Insert offer categories
INSERT INTO offer_categories (name, description, color_code, display_order) VALUES
('Welcome', 'Welcome offers for new users', '#4CAF50', 1),
('Seasonal', 'Seasonal and holiday offers', '#FF9800', 2),
('Loyalty', 'Loyalty rewards for existing customers', '#2196F3', 3),
('Referral', 'Referral program offers', '#9C27B0', 4),
('Clearance', 'Clearance and inventory offers', '#F44336', 5),
('Upgrade', 'Plan upgrade incentives', '#607D8B', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert offer templates
INSERT INTO offer_templates (name, description, template_data, category, created_by) VALUES
('Welcome 20% Off', 'Standard welcome offer for new users', 
 '{"type": "discount_percentage", "value": 20, "min_order_value": 999, "duration_days": 30, "first_time_users_only": true}', 
 'Welcome', 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('Flat ₹500 Off', 'Flat discount offer', 
 '{"type": "discount_amount", "value": 500, "min_order_value": 2000, "duration_days": 15}', 
 'Seasonal', 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('Free Month', 'Free month subscription extension', 
 '{"type": "free_month", "value": 1, "target_plans": ["basic", "standard"], "duration_days": 7}', 
 'Loyalty', 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('Plan Upgrade', 'Free plan upgrade offer', 
 '{"type": "upgrade", "value": 1, "target_plans": ["trial", "basic"], "duration_days": 30}', 
 'Upgrade', 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Insert sample promotional offers
INSERT INTO promotional_offers (
    code, name, description, type, value, min_order_value, max_discount_amount, 
    target_plans, usage_limit, start_date, end_date, is_active, auto_apply, 
    first_time_users_only, created_by
) VALUES
('WELCOME20', 'Welcome 20% Off', 'Get 20% off your first order', 'discount_percentage', 20.00, 999.00, 500.00, 
 '{}', 1000, NOW(), NOW() + INTERVAL '30 days', true, true, true, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('FLAT500', 'Flat ₹500 Off', 'Get flat ₹500 off on orders above ₹2000', 'discount_amount', 500.00, 2000.00, 500.00, 
 '{}', 500, NOW(), NOW() + INTERVAL '15 days', true, false, false, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('FREEMONTH', 'Free Month Extension', 'Get 1 free month subscription extension', 'free_month', 1.00, 0.00, NULL, 
 '{"basic", "standard"}', 100, NOW(), NOW() + INTERVAL '7 days', true, false, false, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('UPGRADE25', '25% Off Upgrade', 'Get 25% off when upgrading your plan', 'discount_percentage', 25.00, 0.00, 1000.00, 
 '{"trial", "basic"}', 200, NOW(), NOW() + INTERVAL '30 days', true, true, false, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('SEASONAL15', 'Seasonal 15% Off', 'Seasonal offer - 15% off all orders', 'discount_percentage', 15.00, 1500.00, 750.00, 
 '{}', NULL, NOW(), NOW() + INTERVAL '60 days', true, true, false, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- Insert sample promotional campaigns
INSERT INTO promotional_campaigns (
    name, description, campaign_type, start_date, end_date, budget_limit, 
    target_audience, is_active, created_by
) VALUES
('Welcome Campaign', 'Welcome offers for new users', 'welcome', NOW(), NOW() + INTERVAL '90 days', 50000.00, 
 '{"new_users": true, "age_range": {"min": 25, "max": 45}}', true, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('Holiday Season', 'Holiday season promotional campaign', 'seasonal', NOW(), NOW() + INTERVAL '45 days', 100000.00, 
 '{"all_users": true, "exclude_trial": true}', true, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1)),
('Loyalty Rewards', 'Loyalty rewards for existing customers', 'loyalty', NOW(), NOW() + INTERVAL '180 days', 75000.00, 
 '{"min_orders": 5, "subscription_months": 3}', true, 
 (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Link offers to campaigns
INSERT INTO campaign_offer_assignments (campaign_id, offer_id)
SELECT 
    (SELECT id FROM promotional_campaigns WHERE name = 'Welcome Campaign'),
    (SELECT id FROM promotional_offers WHERE code = 'WELCOME20')
WHERE EXISTS (SELECT 1 FROM promotional_campaigns WHERE name = 'Welcome Campaign')
  AND EXISTS (SELECT 1 FROM promotional_offers WHERE code = 'WELCOME20')
ON CONFLICT DO NOTHING;

INSERT INTO campaign_offer_assignments (campaign_id, offer_id)
SELECT 
    (SELECT id FROM promotional_campaigns WHERE name = 'Holiday Season'),
    (SELECT id FROM promotional_offers WHERE code = 'SEASONAL15')
WHERE EXISTS (SELECT 1 FROM promotional_campaigns WHERE name = 'Holiday Season')
  AND EXISTS (SELECT 1 FROM promotional_offers WHERE code = 'SEASONAL15')
ON CONFLICT DO NOTHING;

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
    '20250705175000_promotional_offers_system',
    'Created comprehensive promotional offers system with 9 tables: promotional_offers, user_offer_assignments, offer_usage_history, offer_categories, offer_category_assignments, offer_redemption_rules, offer_templates, promotional_campaigns, campaign_offer_assignments. Includes RLS policies, helper functions, sample data, and complete audit trail system.',
    NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
    description = EXCLUDED.description,
    applied_at = EXCLUDED.applied_at;

-- ================================================================================================
-- GRANTS AND PERMISSIONS
-- ================================================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON promotional_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_offer_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_usage_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_category_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_redemption_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON promotional_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_offer_assignments TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION is_offer_valid_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_offer_discount TO authenticated;
GRANT EXECUTE ON FUNCTION apply_offer_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_offers_for_user TO authenticated;

-- ================================================================================================
-- DOCUMENTATION
-- ================================================================================================

COMMENT ON TABLE promotional_offers IS 'Main table for storing promotional offers and discounts';
COMMENT ON TABLE user_offer_assignments IS 'Links users to specific promotional offers';
COMMENT ON TABLE offer_usage_history IS 'Complete history of offer usage with discount amounts';
COMMENT ON TABLE offer_categories IS 'Categories for organizing promotional offers';
COMMENT ON TABLE offer_category_assignments IS 'Links offers to categories';
COMMENT ON TABLE offer_redemption_rules IS 'Advanced rules for offer redemption eligibility';
COMMENT ON TABLE offer_templates IS 'Templates for creating standard promotional offers';
COMMENT ON TABLE promotional_campaigns IS 'Marketing campaigns containing multiple offers';
COMMENT ON TABLE campaign_offer_assignments IS 'Links campaigns to their associated offers';

COMMENT ON FUNCTION is_offer_valid_for_user IS 'Check if a promotional offer is valid for a specific user';
COMMENT ON FUNCTION calculate_offer_discount IS 'Calculate the discount amount for an offer and order';
COMMENT ON FUNCTION apply_offer_to_user IS 'Apply a promotional offer to a user order';
COMMENT ON FUNCTION get_available_offers_for_user IS 'Get all available offers for a specific user';

-- ================================================================================================
-- COMPLETION LOG
-- ================================================================================================

-- Log the completion of this migration
INSERT INTO public.migration_log (
    migration_name, 
    description, 
    applied_at
) VALUES (
    '20250705175000_promotional_offers_system',
    'Created comprehensive promotional offers system with 9 tables: promotional_offers, user_offer_assignments, offer_usage_history, offer_categories, offer_category_assignments, offer_redemption_rules, offer_templates, promotional_campaigns, campaign_offer_assignments. Includes RLS policies, helper functions, sample data, and complete audit trail system.',
    NOW()
) ON CONFLICT (migration_name) DO UPDATE SET
    description = EXCLUDED.description,
    applied_at = EXCLUDED.applied_at; 