-- Fix order_items table by adding missing columns
-- Run this in Supabase SQL Editor to add the missing unit_price and total_price columns

-- First check if order_items table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating order_items table...';
        
        CREATE TABLE public.order_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
            toy_id UUID REFERENCES public.toys(id),
            subscription_category TEXT,
            age_group TEXT,
            ride_on_toy_id UUID REFERENCES public.toys(id),
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price NUMERIC(10,2),
            total_price NUMERIC(10,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        RAISE NOTICE 'order_items table created successfully';
    ELSE
        RAISE NOTICE 'order_items table already exists, adding missing columns...';
    END IF;
END $$;

-- Add unit_price column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Add total_price column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

-- Add subscription_category column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS subscription_category TEXT;

-- Add age_group column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add ride_on_toy_id column if it doesn't exist
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS ride_on_toy_id UUID REFERENCES public.toys(id);

-- Verify the columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'order_items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add comment for documentation
COMMENT ON TABLE public.order_items IS 'Individual items within orders - updated with missing columns for admin order creation';
COMMENT ON COLUMN public.order_items.unit_price IS 'Price per unit of the item';
COMMENT ON COLUMN public.order_items.total_price IS 'Total price for this line item (unit_price * quantity)'; 