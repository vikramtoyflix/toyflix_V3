-- First, fix any invalid quantities
UPDATE public.toys 
SET available_quantity = 0
WHERE available_quantity < 0;

UPDATE public.toys
SET total_quantity = 0
WHERE total_quantity < 0;

UPDATE public.toys
SET total_quantity = available_quantity
WHERE total_quantity < available_quantity;

-- Now add the constraint
ALTER TABLE public.toys
ADD CONSTRAINT valid_quantities CHECK (
    available_quantity >= 0 AND
    total_quantity >= 0 AND
    available_quantity <= total_quantity
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT valid_quantities ON public.toys IS 'Ensures available_quantity is non-negative and does not exceed total_quantity'; 