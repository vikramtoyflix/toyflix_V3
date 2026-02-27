-- Enhanced User Roles and Permissions System for ToyFlix
-- This migration adds comprehensive role-based access control and user lifecycle management
-- while maintaining full backward compatibility with existing custom_users table

-- ================================================================================================
-- 1. ENHANCED USER PERMISSION ROLES TABLE
-- ================================================================================================

-- Table to store custom roles with JSON-based permissions
CREATE TABLE IF NOT EXISTS public.user_permission_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.custom_users(id),
    
    -- Constraints
    CONSTRAINT valid_permissions CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT valid_role_name CHECK (length(name) >= 2 AND length(name) <= 50),
    CONSTRAINT valid_display_name CHECK (length(display_name) >= 2 AND length(display_name) <= 100)
);

-- ================================================================================================
-- 2. USER ROLE ASSIGNMENTS TABLE (Many-to-Many)
-- ================================================================================================

-- Table to manage user-role assignments with expiration and audit trail
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.user_permission_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.custom_users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Ensure unique active assignments
    UNIQUE(user_id, role_id),
    
    -- Constraints
    CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > assigned_at),
    CONSTRAINT valid_notes_length CHECK (length(notes) <= 1000)
);

-- ================================================================================================
-- 3. USER LIFECYCLE EVENTS TABLE
-- ================================================================================================

-- Table to track all user lifecycle changes for comprehensive audit trail
CREATE TABLE IF NOT EXISTS public.user_lifecycle_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    performed_by UUID REFERENCES public.custom_users(id),
    reason TEXT,
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'created', 'activated', 'deactivated', 'suspended', 'verified',
        'role_assigned', 'role_removed', 'password_reset', 'profile_updated',
        'subscription_changed', 'promotion_applied', 'status_changed'
    )),
    CONSTRAINT valid_reason_length CHECK (length(reason) <= 500),
    CONSTRAINT valid_notes_length CHECK (length(notes) <= 2000)
);

-- ================================================================================================
-- 4. INDEXES FOR PERFORMANCE OPTIMIZATION
-- ================================================================================================

-- Indexes for user_permission_roles
CREATE INDEX IF NOT EXISTS idx_user_permission_roles_name ON public.user_permission_roles(name);
CREATE INDEX IF NOT EXISTS idx_user_permission_roles_active ON public.user_permission_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permission_roles_system ON public.user_permission_roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_user_permission_roles_created_at ON public.user_permission_roles(created_at);

-- Indexes for user_role_assignments
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON public.user_role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_expires_at ON public.user_role_assignments(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_assigned_at ON public.user_role_assignments(assigned_at);

-- Indexes for user_lifecycle_events
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_events_user_id ON public.user_lifecycle_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_events_event_type ON public.user_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_events_created_at ON public.user_lifecycle_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_events_performed_by ON public.user_lifecycle_events(performed_by);

-- ================================================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_permission_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_permission_roles
CREATE POLICY "Admin users can manage roles" ON public.user_permission_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage roles" ON public.user_permission_roles
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view active roles" ON public.user_permission_roles
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_role_assignments
CREATE POLICY "Admin users can manage role assignments" ON public.user_role_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.custom_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage role assignments" ON public.user_role_assignments
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own role assignments" ON public.user_role_assignments
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for user_lifecycle_events
CREATE POLICY "Admin users can view all lifecycle events" ON public.user_lifecycle_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.custom_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can manage lifecycle events" ON public.user_lifecycle_events
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their own lifecycle events" ON public.user_lifecycle_events
    FOR SELECT USING (user_id = auth.uid());

-- ================================================================================================
-- 6. UTILITY FUNCTIONS
-- ================================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    effective_permissions JSONB := '{}'::jsonb;
    role_permissions JSONB;
BEGIN
    -- Get all active, non-expired role permissions for the user
    SELECT jsonb_agg(upr.permissions) INTO role_permissions
    FROM public.user_role_assignments ura
    JOIN public.user_permission_roles upr ON ura.role_id = upr.id
    WHERE ura.user_id = user_id_param
    AND ura.is_active = true
    AND upr.is_active = true
    AND (ura.expires_at IS NULL OR ura.expires_at > now());
    
    -- Merge all permissions (simple OR logic for now)
    IF role_permissions IS NOT NULL THEN
        SELECT jsonb_object_agg(
            key,
            CASE 
                WHEN jsonb_typeof(value) = 'object' THEN value
                ELSE value
            END
        ) INTO effective_permissions
        FROM (
            SELECT key, jsonb_agg(value) as value
            FROM jsonb_array_elements(role_permissions) AS perm,
                 jsonb_each(perm)
            GROUP BY key
        ) AS merged_perms;
    END IF;
    
    RETURN COALESCE(effective_permissions, '{}'::jsonb);
END;
$$;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param UUID, permission_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    permissions JSONB;
    path_parts TEXT[];
    current_level JSONB;
    i INTEGER;
BEGIN
    -- Get user's effective permissions
    permissions := public.get_user_effective_permissions(user_id_param);
    
    -- Split permission path (e.g., 'users.write' -> ['users', 'write'])
    path_parts := string_to_array(permission_path, '.');
    current_level := permissions;
    
    -- Navigate through permission path
    FOR i IN 1..array_length(path_parts, 1) LOOP
        IF current_level ? path_parts[i] THEN
            current_level := current_level -> path_parts[i];
        ELSE
            RETURN false;
        END IF;
    END LOOP;
    
    -- Check if final value is true
    RETURN (current_level = 'true'::jsonb);
END;
$$;

-- ================================================================================================
-- 7. TRIGGERS
-- ================================================================================================

-- Trigger to update updated_at on user_permission_roles
CREATE TRIGGER update_user_permission_roles_updated_at
    BEFORE UPDATE ON public.user_permission_roles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log role assignment changes
CREATE OR REPLACE FUNCTION public.log_role_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.user_lifecycle_events (
            user_id, event_type, new_state, performed_by, reason
        ) VALUES (
            NEW.user_id,
            'role_assigned',
            jsonb_build_object(
                'role_id', NEW.role_id,
                'expires_at', NEW.expires_at,
                'notes', NEW.notes
            ),
            NEW.assigned_by,
            'Role assigned: ' || COALESCE(NEW.notes, 'No reason provided')
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = true AND NEW.is_active = false THEN
            INSERT INTO public.user_lifecycle_events (
                user_id, event_type, previous_state, new_state, performed_by, reason
            ) VALUES (
                NEW.user_id,
                'role_removed',
                jsonb_build_object('role_id', OLD.role_id),
                jsonb_build_object('role_id', NEW.role_id, 'deactivated', true),
                auth.uid(),
                'Role deactivated'
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.user_lifecycle_events (
            user_id, event_type, previous_state, performed_by, reason
        ) VALUES (
            OLD.user_id,
            'role_removed',
            jsonb_build_object('role_id', OLD.role_id),
            auth.uid(),
            'Role assignment deleted'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for role assignment changes
CREATE TRIGGER log_role_assignment_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION public.log_role_assignment_change();

-- ================================================================================================
-- 8. DEFAULT ROLES AND INITIAL DATA
-- ================================================================================================

-- Insert default system roles with comprehensive permissions
INSERT INTO public.user_permission_roles (
    name, display_name, description, permissions, is_system_role, created_at
) VALUES 
(
    'super_admin',
    'Super Administrator',
    'Full system access with all privileges including system management',
    '{
        "all": true,
        "system": {"read": true, "write": true, "delete": true, "configure": true},
        "users": {"read": true, "write": true, "delete": true, "impersonate": true},
        "orders": {"read": true, "write": true, "delete": true, "cancel": true, "refund": true},
        "subscriptions": {"read": true, "write": true, "modify": true, "extend": true, "cancel": true},
        "toys": {"read": true, "write": true, "delete": true, "manage_inventory": true},
        "offers": {"read": true, "create": true, "assign": true, "delete": true},
        "analytics": {"read": true, "export": true, "advanced": true},
        "billing": {"read": true, "write": true, "process_refunds": true},
        "reports": {"read": true, "create": true, "export": true, "schedule": true}
    }'::jsonb,
    true,
    now()
),
(
    'admin',
    'Administrator',
    'Standard admin access for day-to-day operations including user and order management',
    '{
        "users": {"read": true, "write": true, "delete": true},
        "orders": {"read": true, "write": true, "cancel": true, "modify": true},
        "subscriptions": {"read": true, "modify": true, "extend": true, "pause": true},
        "toys": {"read": true, "write": true, "manage_inventory": true},
        "offers": {"read": true, "create": true, "assign": true},
        "analytics": {"read": true, "export": true},
        "billing": {"read": true, "write": true},
        "reports": {"read": true, "create": true, "export": true}
    }'::jsonb,
    true,
    now()
),
(
    'customer_support',
    'Customer Support',
    'Customer support access for user assistance and order support',
    '{
        "users": {"read": true, "write": true},
        "orders": {"read": true, "write": true, "modify": true},
        "subscriptions": {"read": true, "extend": true, "pause": true},
        "toys": {"read": true},
        "offers": {"read": true, "assign": true},
        "analytics": {"read": true},
        "billing": {"read": true},
        "reports": {"read": true}
    }'::jsonb,
    true,
    now()
),
(
    'order_manager',
    'Order Manager',
    'Specialized role for order processing and fulfillment management',
    '{
        "orders": {"read": true, "write": true, "cancel": true, "modify": true, "dispatch": true},
        "subscriptions": {"read": true, "modify": true},
        "toys": {"read": true, "manage_inventory": true},
        "users": {"read": true},
        "analytics": {"read": true},
        "reports": {"read": true, "export": true}
    }'::jsonb,
    true,
    now()
),
(
    'marketing_manager',
    'Marketing Manager',
    'Marketing focused role for promotional campaigns and offer management',
    '{
        "offers": {"read": true, "create": true, "assign": true, "delete": true},
        "users": {"read": true},
        "analytics": {"read": true, "export": true, "marketing": true},
        "reports": {"read": true, "create": true, "export": true},
        "campaigns": {"read": true, "create": true, "manage": true}
    }'::jsonb,
    true,
    now()
),
(
    'user',
    'Regular User',
    'Standard user access for customer-facing functionality',
    '{
        "profile": {"read": true, "write": true},
        "orders": {"read": true},
        "subscriptions": {"read": true},
        "toys": {"read": true},
        "offers": {"read": true}
    }'::jsonb,
    true,
    now()
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = now();

-- ================================================================================================
-- 9. ASSIGN EXISTING ADMIN USERS TO ADMIN ROLE
-- ================================================================================================

-- Assign existing admin users to the new admin role
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, notes)
SELECT 
    cu.id as user_id,
    upr.id as role_id,
    cu.id as assigned_by,
    'Migrated from existing admin role during system upgrade'
FROM public.custom_users cu
CROSS JOIN public.user_permission_roles upr
WHERE cu.role = 'admin' 
AND upr.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura 
    WHERE ura.user_id = cu.id AND ura.role_id = upr.id
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Assign existing regular users to the user role
INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, notes)
SELECT 
    cu.id as user_id,
    upr.id as role_id,
    (SELECT id FROM public.custom_users WHERE role = 'admin' LIMIT 1) as assigned_by,
    'Migrated from existing user role during system upgrade'
FROM public.custom_users cu
CROSS JOIN public.user_permission_roles upr
WHERE cu.role = 'user' 
AND upr.name = 'user'
AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura 
    WHERE ura.user_id = cu.id AND ura.role_id = upr.id
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ================================================================================================
-- 10. CREATE INITIAL LIFECYCLE EVENTS FOR EXISTING USERS
-- ================================================================================================

-- Log initial lifecycle events for existing users
INSERT INTO public.user_lifecycle_events (
    user_id, event_type, new_state, reason, notes
)
SELECT 
    id,
    'created',
    jsonb_build_object(
        'role', role,
        'is_active', is_active,
        'phone_verified', phone_verified,
        'migration', true
    ),
    'System migration - initial user state recorded',
    'User existed before enhanced role system implementation'
FROM public.custom_users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_lifecycle_events ule 
    WHERE ule.user_id = custom_users.id AND ule.event_type = 'created'
);

-- ================================================================================================
-- 11. GRANT NECESSARY PERMISSIONS
-- ================================================================================================

-- Grant permissions for admin users to access new tables
GRANT ALL ON public.user_permission_roles TO authenticated;
GRANT ALL ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_lifecycle_events TO authenticated;

-- Grant permissions for service role
GRANT ALL ON public.user_permission_roles TO service_role;
GRANT ALL ON public.user_role_assignments TO service_role;
GRANT ALL ON public.user_lifecycle_events TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_user_effective_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT) TO authenticated;

-- ================================================================================================
-- 12. ADD HELPFUL COMMENTS
-- ================================================================================================

-- Table comments
COMMENT ON TABLE public.user_permission_roles IS 'Enhanced role system with JSON-based permissions for granular access control';
COMMENT ON TABLE public.user_role_assignments IS 'Many-to-many relationship between users and roles with expiration and audit trail';
COMMENT ON TABLE public.user_lifecycle_events IS 'Comprehensive audit trail for all user lifecycle changes and administrative actions';

-- Column comments for user_permission_roles
COMMENT ON COLUMN public.user_permission_roles.permissions IS 'JSONB structure defining granular permissions for this role';
COMMENT ON COLUMN public.user_permission_roles.is_system_role IS 'System roles cannot be deleted and are managed by the application';

-- Column comments for user_role_assignments
COMMENT ON COLUMN public.user_role_assignments.expires_at IS 'Optional expiration date for time-limited role assignments';
COMMENT ON COLUMN public.user_role_assignments.notes IS 'Administrative notes explaining the reason for role assignment';

-- Column comments for user_lifecycle_events
COMMENT ON COLUMN public.user_lifecycle_events.event_type IS 'Type of lifecycle event (created, activated, role_assigned, etc.)';
COMMENT ON COLUMN public.user_lifecycle_events.previous_state IS 'State before the change (for audit purposes)';
COMMENT ON COLUMN public.user_lifecycle_events.new_state IS 'State after the change (for audit purposes)';

-- ================================================================================================
-- MIGRATION COMPLETE
-- ================================================================================================

-- Log the successful migration
DO $$
BEGIN
    RAISE NOTICE 'Enhanced User Roles and Permissions System migration completed successfully!';
    RAISE NOTICE 'Added tables: user_permission_roles, user_role_assignments, user_lifecycle_events';
    RAISE NOTICE 'Added % default roles', (SELECT COUNT(*) FROM public.user_permission_roles WHERE is_system_role = true);
    RAISE NOTICE 'Migrated % existing users to new role system', (SELECT COUNT(*) FROM public.user_role_assignments);
    RAISE NOTICE 'System is ready for enhanced user management!';
END $$; 