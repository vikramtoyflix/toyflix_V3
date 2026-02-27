-- Create function to create admin_settings table
CREATE OR REPLACE FUNCTION create_admin_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create admin_settings table if it doesn't exist
  CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Create function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $trigger$ language 'plpgsql';

  -- Create trigger for updated_at
  DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
  CREATE TRIGGER update_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  -- Create RLS policies
  ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

  -- Only allow authenticated users with admin role to access admin_settings
  CREATE POLICY "Allow admins to manage admin_settings"
    ON admin_settings
    USING (
      auth.uid() IN (
        SELECT user_id FROM user_roles WHERE role = 'admin'
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT user_id FROM user_roles WHERE role = 'admin'
      )
    );

  -- Allow Edge Functions to access admin_settings
  CREATE POLICY "Allow service role to manage admin_settings"
    ON admin_settings
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');
END;
$$; 