
-- Create custom users table to replace dependency on auth.users
CREATE TABLE custom_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Create user sessions table for managing active sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create JWT secrets table for token signing
CREATE TABLE jwt_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id TEXT UNIQUE NOT NULL,
  secret_key TEXT NOT NULL,
  algorithm TEXT DEFAULT 'HS256',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Insert initial JWT secret
INSERT INTO jwt_secrets (key_id, secret_key, algorithm, is_active) 
VALUES ('primary', encode(gen_random_bytes(32), 'base64'), 'HS256', true);

-- Add indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_custom_users_phone ON custom_users(phone);
CREATE INDEX idx_custom_users_email ON custom_users(email);

-- Add RLS policies
ALTER TABLE custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jwt_secrets ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view their own profile" ON custom_users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON custom_users
  FOR UPDATE USING (id = auth.uid());

-- Sessions are managed by edge functions only
CREATE POLICY "Service role can manage sessions" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- JWT secrets are admin only
CREATE POLICY "Service role can manage JWT secrets" ON jwt_secrets
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_users_updated_at 
  BEFORE UPDATE ON custom_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
