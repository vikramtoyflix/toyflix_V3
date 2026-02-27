-- Campaign Leads Table for storing lead data from campaign landing pages
-- This table will capture potential customers who sign up through marketing campaigns

CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  child_age TEXT NOT NULL,
  source TEXT DEFAULT 'campaign_landing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional fields for tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes TEXT,
  
  -- Conversion tracking
  converted_to_user_id UUID REFERENCES public.custom_users(id),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaign_leads_phone ON public.campaign_leads(phone);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_created_at ON public.campaign_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_source ON public.campaign_leads(source);

-- Enable RLS (Row Level Security)
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert campaign leads (for public form submissions)
CREATE POLICY "Allow public insert campaign leads"
  ON public.campaign_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated admin users can read campaign leads
CREATE POLICY "Allow admin read campaign leads"
  ON public.campaign_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_users
      WHERE custom_users.id = auth.uid()
      AND custom_users.role = 'admin'
    )
  );

-- Policy: Only authenticated admin users can update campaign leads
CREATE POLICY "Allow admin update campaign leads"
  ON public.campaign_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_users
      WHERE custom_users.id = auth.uid()
      AND custom_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.custom_users
      WHERE custom_users.id = auth.uid()
      AND custom_users.role = 'admin'
    )
  );

-- Policy: Only authenticated admin users can delete campaign leads
CREATE POLICY "Allow admin delete campaign leads"
  ON public.campaign_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.custom_users
      WHERE custom_users.id = auth.uid()
      AND custom_users.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_campaign_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
DROP TRIGGER IF EXISTS set_campaign_leads_updated_at ON public.campaign_leads;
CREATE TRIGGER set_campaign_leads_updated_at
  BEFORE UPDATE ON public.campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_leads_updated_at();

-- Add comment to table
COMMENT ON TABLE public.campaign_leads IS 'Stores lead information from marketing campaign landing pages';
