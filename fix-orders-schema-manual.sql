-- Run this in your Supabase SQL Editor to add missing columns to orders table
-- This will fix the "column not found" errors

-- Add order_type column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'subscription';

-- Add base_amount column if it doesn't exist  
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add gst_amount column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add discount_amount column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add shipping_address column if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND table_schema = 'public'
ORDER BY ordinal_position; 