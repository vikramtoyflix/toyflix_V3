
-- Add sku column to the toys table
ALTER TABLE public.toys 
ADD COLUMN sku TEXT;

-- Add a unique constraint to prevent duplicate SKUs (allowing nulls)
CREATE UNIQUE INDEX toys_sku_unique 
ON public.toys (sku) 
WHERE sku IS NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.toys.sku IS 'Stock Keeping Unit - unique identifier for inventory management';
