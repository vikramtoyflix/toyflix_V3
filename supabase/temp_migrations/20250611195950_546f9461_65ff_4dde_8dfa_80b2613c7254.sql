
-- Create admin_requests table for handling subscription cancellation requests
CREATE TABLE admin_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own requests
CREATE POLICY "Users can view own requests" ON admin_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests" ON admin_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX idx_admin_requests_status ON admin_requests(status);
