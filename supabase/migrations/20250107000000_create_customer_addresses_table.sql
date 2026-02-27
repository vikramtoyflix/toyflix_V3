-- Create customer_addresses table for managing multiple addresses per customer
-- This addresses the issue where repeat customers have to enter their address every time

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  
  -- Address identification
  address_type text CHECK (address_type IN ('home', 'work', 'other')) DEFAULT 'home',
  is_default boolean DEFAULT false,
  
  -- Personal details for delivery
  first_name text,
  last_name text,
  phone text,
  email text,
  
  -- Address fields
  address_line_1 text NOT NULL,
  address_line_2 text,
  landmark text,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  postal_code text,
  
  -- Location data for precise delivery
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  plus_code text,
  
  -- Delivery preferences
  delivery_instructions text,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT customer_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.custom_users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_is_default ON public.customer_addresses(customer_id, is_default) WHERE is_default = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own addresses
CREATE POLICY "Users can view own addresses" ON public.customer_addresses
  FOR SELECT USING (customer_id = auth.uid());

-- Users can insert their own addresses
CREATE POLICY "Users can insert own addresses" ON public.customer_addresses
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses" ON public.customer_addresses
  FOR UPDATE USING (customer_id = auth.uid());

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses" ON public.customer_addresses
  FOR DELETE USING (customer_id = auth.uid());

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses" ON public.customer_addresses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all addresses
CREATE POLICY "Admins can manage all addresses" ON public.customer_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.custom_users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to ensure only one default address per customer
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this address as default, unset all other defaults for this customer
  IF NEW.is_default = true THEN
    UPDATE public.customer_addresses 
    SET is_default = false 
    WHERE customer_id = NEW.customer_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default address
CREATE TRIGGER trigger_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_customer_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_addresses_updated_at();

-- Migrate existing addresses from custom_users table
-- This will create a default address for users who have address data in their profile
INSERT INTO public.customer_addresses (
  customer_id,
  address_type,
  is_default,
  first_name,
  last_name,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  latitude,
  longitude,
  created_at,
  updated_at
)
SELECT 
  id as customer_id,
  'home' as address_type,
  true as is_default,
  first_name,
  last_name,
  address_line1 as address_line_1,
  address_line2 as address_line_2,
  city,
  state,
  zip_code as postal_code,
  latitude,
  longitude,
  created_at,
  updated_at
FROM public.custom_users 
WHERE address_line1 IS NOT NULL 
  AND address_line1 != ''
  AND city IS NOT NULL 
  AND city != ''
  AND state IS NOT NULL 
  AND state != ''
  AND (zip_code IS NOT NULL AND zip_code != '')
ON CONFLICT DO NOTHING;

-- Comment explaining the solution
COMMENT ON TABLE public.customer_addresses IS 'Stores multiple addresses per customer to solve the issue where repeat customers have to enter their address every time they place an order. Customers can now select from saved addresses or add new ones.';
