-- Remap subscription_category for common terminology:
-- Step 2 = Educational (educational_toys), Step 3 = Developmental (developmental_toys)
-- 1. Current "Educational" toys (educational_toys) -> Developmental (developmental_toys)
-- 2. Current "STEM" toys (stem_toys) -> Educational (educational_toys)

-- Order matters: first move educational_toys to developmental_toys, then stem_toys to educational_toys.

BEGIN;

-- 1. Toys currently tagged as "Educational" become "Developmental" (Step 3)
UPDATE public.toys
SET subscription_category = 'developmental_toys'
WHERE subscription_category = 'educational_toys';

-- 2. Toys currently tagged as "STEM" become "Educational" (Step 2)
UPDATE public.toys
SET subscription_category = 'educational_toys'
WHERE subscription_category = 'stem_toys';

COMMIT;
