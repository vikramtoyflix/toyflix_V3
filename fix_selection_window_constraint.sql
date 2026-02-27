-- ========================================
-- EMERGENCY FIX: Update selection window status constraint
-- Fixes admin panel subscription creation issue
-- ========================================

-- Step 1: Drop existing constraint (use CASCADE if needed)
DO $$
BEGIN
    -- Try to drop the constraint
    BEGIN
        ALTER TABLE public.rental_orders DROP CONSTRAINT rental_orders_selection_window_status_check;
        RAISE NOTICE 'Successfully dropped existing constraint';
    EXCEPTION
        WHEN undefined_object THEN
            RAISE NOTICE 'Constraint does not exist, proceeding...';
        WHEN OTHERS THEN
            RAISE NOTICE 'Error dropping constraint: %', SQLERRM;
    END;
END $$;

-- Step 2: Add updated constraint with all valid statuses
ALTER TABLE public.rental_orders 
ADD CONSTRAINT rental_orders_selection_window_status_check 
CHECK (selection_window_status IN ('auto', 'manual_open', 'manual_closed', 'force_open', 'force_closed', 'auto_closed', 'auto_open'));

-- Update any existing records that might have invalid status
UPDATE public.rental_orders 
SET selection_window_status = 'auto'
WHERE selection_window_status IS NULL OR selection_window_status = '';

-- Add default values for any NULL columns
UPDATE public.rental_orders 
SET 
    manual_selection_control = COALESCE(manual_selection_control, false),
    selection_window_notes = COALESCE(selection_window_notes, 'System default')
WHERE manual_selection_control IS NULL OR selection_window_notes IS NULL;

-- Verify the fix
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN selection_window_status IS NOT NULL THEN 1 END) as records_with_status,
    COUNT(CASE WHEN manual_selection_control IS NOT NULL THEN 1 END) as records_with_control
FROM public.rental_orders;
