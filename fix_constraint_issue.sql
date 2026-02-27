-- ========================================
-- ROBUST FIX: Selection Window Constraint Update
-- Handles existing constraint gracefully
-- ========================================

-- Method 1: Try to modify the existing constraint
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'rental_orders_selection_window_status_check'
        AND constraint_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Constraint exists, dropping and recreating...';
        
        -- Drop the existing constraint
        ALTER TABLE public.rental_orders DROP CONSTRAINT rental_orders_selection_window_status_check;
        
        -- Add the updated constraint
        ALTER TABLE public.rental_orders 
        ADD CONSTRAINT rental_orders_selection_window_status_check 
        CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed', 'auto_closed', 'auto_open'));
        
        RAISE NOTICE 'Constraint successfully updated';
    ELSE
        RAISE NOTICE 'Constraint does not exist, creating new one...';
        
        -- Add the constraint
        ALTER TABLE public.rental_orders 
        ADD CONSTRAINT rental_orders_selection_window_status_check 
        CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed', 'auto_closed', 'auto_open'));
        
        RAISE NOTICE 'New constraint created';
    END IF;
END $$;

-- Update any existing records that might have invalid status
UPDATE public.rental_orders 
SET selection_window_status = 'auto'
WHERE selection_window_status IS NULL 
   OR selection_window_status = '' 
   OR selection_window_status NOT IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed', 'auto_closed', 'auto_open');

-- Add default values for any NULL columns
UPDATE public.rental_orders 
SET 
    manual_selection_control = COALESCE(manual_selection_control, false),
    selection_window_notes = COALESCE(selection_window_notes, 'System default')
WHERE manual_selection_control IS NULL OR selection_window_notes IS NULL;

-- Verify the fix worked
DO $$
DECLARE
    total_count INTEGER;
    valid_status_count INTEGER;
    valid_control_count INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN selection_window_status IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN manual_selection_control IS NOT NULL THEN 1 END)
    INTO total_count, valid_status_count, valid_control_count
    FROM public.rental_orders;
    
    RAISE NOTICE 'Fix verification: Total records: %, Records with valid status: %, Records with valid control: %', 
        total_count, valid_status_count, valid_control_count;
        
    IF total_count = valid_status_count AND total_count = valid_control_count THEN
        RAISE NOTICE 'SUCCESS: All records have valid selection window fields';
    ELSE
        RAISE WARNING 'Some records still have invalid values';
    END IF;
END $$;


