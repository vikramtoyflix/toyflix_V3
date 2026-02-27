-- Create customer drop tracking tables
-- This will help identify where users abandon the subscription flow

-- Main drop tracking table
CREATE TABLE IF NOT EXISTS customer_drops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES custom_users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  drop_step TEXT NOT NULL,
  drop_reason TEXT,
  flow_type TEXT NOT NULL, -- 'subscription', 'ride_on', 'queue_management'
  plan_id TEXT,
  age_group TEXT,
  selected_toys_count INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2),
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  time_on_page_seconds INTEGER,
  interactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop step definitions
CREATE TABLE IF NOT EXISTS drop_steps (
  id SERIAL PRIMARY KEY,
  step_name TEXT UNIQUE NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default drop steps
INSERT INTO drop_steps (step_name, step_order, description, is_critical) VALUES
  ('auth_required', 1, 'User redirected to authentication', TRUE),
  ('auth_completed', 2, 'User completed authentication', FALSE),
  ('age_selection', 3, 'Age group selection step', FALSE),
  ('toy_selection', 4, 'Toy selection step', TRUE),
  ('cart_summary', 5, 'Cart summary and review step', TRUE),
  ('payment_initiated', 6, 'Payment process initiated', TRUE),
  ('payment_failed', 7, 'Payment failed or abandoned', TRUE),
  ('payment_success', 8, 'Payment completed successfully', FALSE);

-- Drop reasons table
CREATE TABLE IF NOT EXISTS drop_reasons (
  id SERIAL PRIMARY KEY,
  reason_code TEXT UNIQUE NOT NULL,
  reason_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'technical', 'user_choice', 'pricing', 'trust'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common drop reasons
INSERT INTO drop_reasons (reason_code, reason_name, category, description) VALUES
  ('auth_required', 'Authentication Required', 'user_choice', 'User left when authentication was required'),
  ('pricing_concern', 'Pricing Concern', 'pricing', 'User abandoned due to pricing'),
  ('technical_issue', 'Technical Issue', 'technical', 'User encountered technical problems'),
  ('trust_concern', 'Trust/Security Concern', 'trust', 'User concerned about security/trust'),
  ('competitor_switch', 'Switched to Competitor', 'user_choice', 'User chose competitor'),
  ('not_ready', 'Not Ready to Purchase', 'user_choice', 'User not ready to commit'),
  ('delivery_concern', 'Delivery Concern', 'trust', 'User concerned about delivery'),
  ('age_restriction', 'Age Restriction Issue', 'user_choice', 'User found age restrictions limiting'),
  ('toy_availability', 'Toy Availability Issue', 'technical', 'Desired toys not available'),
  ('payment_method', 'Payment Method Issue', 'technical', 'Preferred payment method not available'),
  ('timeout', 'Session Timeout', 'technical', 'User session expired'),
  ('page_error', 'Page Error', 'technical', 'User encountered page error'),
  ('slow_loading', 'Slow Page Loading', 'technical', 'Page took too long to load'),
  ('mobile_issue', 'Mobile Experience Issue', 'technical', 'Poor mobile experience'),
  ('unknown', 'Unknown Reason', 'user_choice', 'Reason not specified');

-- User journey tracking table
CREATE TABLE IF NOT EXISTS user_journey_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES custom_users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_drops_user_id ON customer_drops(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_drops_session_id ON customer_drops(session_id);
CREATE INDEX IF NOT EXISTS idx_customer_drops_drop_step ON customer_drops(drop_step);
CREATE INDEX IF NOT EXISTS idx_customer_drops_created_at ON customer_drops(created_at);
CREATE INDEX IF NOT EXISTS idx_customer_drops_flow_type ON customer_drops(flow_type);
CREATE INDEX IF NOT EXISTS idx_user_journey_events_session_id ON user_journey_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_events_user_id ON user_journey_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_events_timestamp ON user_journey_events(timestamp);

-- Create RLS policies
ALTER TABLE customer_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_events ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own drop data
CREATE POLICY "Users can view own drop data" ON customer_drops
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own journey events" ON user_journey_events
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to insert/update
CREATE POLICY "Service role can manage drop data" ON customer_drops
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage journey events" ON user_journey_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_customer_drops_updated_at 
  BEFORE UPDATE ON customer_drops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 