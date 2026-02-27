-- Create admin audit logs table for tracking subscription deletions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  user_id UUID REFERENCES custom_users(id),
  admin_user_id UUID REFERENCES custom_users(id),
  action_details JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_action CHECK (action IN (
    'subscription_deletion', 
    'subscription_creation', 
    'subscription_modification',
    'user_modification',
    'bulk_operation'
  ))
);

-- Create indexes
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_admin_audit_logs_user ON admin_audit_logs(user_id);
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);

-- Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin-only access)
CREATE POLICY "Admin users can view audit logs" ON admin_audit_logs
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

-- Grant necessary permissions
GRANT SELECT, INSERT ON admin_audit_logs TO authenticated;

-- Add comment
COMMENT ON TABLE admin_audit_logs IS 'Tracks admin actions for audit and compliance purposes';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action performed (subscription_deletion, etc.)';
COMMENT ON COLUMN admin_audit_logs.resource_type IS 'Type of resource affected (rental_orders, etc.)';
COMMENT ON COLUMN admin_audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN admin_audit_logs.user_id IS 'ID of the user who owns the resource';
COMMENT ON COLUMN admin_audit_logs.admin_user_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN admin_audit_logs.action_details IS 'Detailed information about the action';
COMMENT ON COLUMN admin_audit_logs.metadata IS 'Additional metadata (IP, user agent, etc.)'; 