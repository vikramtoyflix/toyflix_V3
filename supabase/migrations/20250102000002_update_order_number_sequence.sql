-- Migration: Update Order Number Generation to Start from 30000
-- This migration adds a sequence and function to automatically generate order numbers starting from 30000

-- 1. Create sequence for order numbers starting from 30000
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 30000 INCREMENT 1;

-- 2. Create function to generate order numbers with 30000+ format
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
BEGIN
    -- Generate order number in format: 30000, 30001, 30002, etc.
    RETURN nextval('public.order_number_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Update rental_orders table to use auto-generation for order_number
ALTER TABLE public.rental_orders 
ALTER COLUMN order_number SET DEFAULT public.generate_order_number();

-- 4. For any existing records without order_number, generate them
UPDATE public.rental_orders 
SET order_number = public.generate_order_number()
WHERE order_number IS NULL OR order_number = '';

-- 5. Add index for better performance on order_number lookups
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number_search 
ON public.rental_orders(order_number) WHERE order_number IS NOT NULL;

-- 6. Add comment explaining the sequence
COMMENT ON SEQUENCE public.order_number_seq IS 'Sequence for generating rental order numbers starting from 30000';
COMMENT ON FUNCTION public.generate_order_number() IS 'Generates sequential order numbers starting from 30000';

-- 7. Grant necessary permissions
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role; 