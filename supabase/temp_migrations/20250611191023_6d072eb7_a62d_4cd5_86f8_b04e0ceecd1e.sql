
-- Add cycle tracking fields to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS current_cycle_start DATE,
ADD COLUMN IF NOT EXISTS current_cycle_end DATE,
ADD COLUMN IF NOT EXISTS toys_delivered_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS toys_return_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_selection_window_start TIMESTAMP WITH TIME ZONE;

-- Add cycle tracking to user_entitlements
ALTER TABLE public.user_entitlements
ADD COLUMN IF NOT EXISTS toys_in_possession BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS current_cycle_toys JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selection_window_active BOOLEAN DEFAULT FALSE;

-- Create enum for cycle status
DO $$ BEGIN
    CREATE TYPE cycle_status_enum AS ENUM ('selection', 'delivery_pending', 'toys_in_possession', 'return_pending', 'cycle_complete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Handle the cycle_status column properly
DO $$ 
BEGIN
    -- Check if cycle_status column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'subscriptions' 
               AND column_name = 'cycle_status') THEN
        -- Drop the default first
        ALTER TABLE public.subscriptions ALTER COLUMN cycle_status DROP DEFAULT;
        -- Convert the column type
        ALTER TABLE public.subscriptions 
        ALTER COLUMN cycle_status TYPE cycle_status_enum 
        USING CASE 
            WHEN cycle_status = 'selection' THEN 'selection'::cycle_status_enum
            WHEN cycle_status = 'delivery_pending' THEN 'delivery_pending'::cycle_status_enum
            WHEN cycle_status = 'toys_in_possession' THEN 'toys_in_possession'::cycle_status_enum
            WHEN cycle_status = 'return_pending' THEN 'return_pending'::cycle_status_enum
            WHEN cycle_status = 'cycle_complete' THEN 'cycle_complete'::cycle_status_enum
            ELSE 'selection'::cycle_status_enum
        END;
        -- Set the new default
        ALTER TABLE public.subscriptions ALTER COLUMN cycle_status SET DEFAULT 'selection'::cycle_status_enum;
    ELSE
        -- Add the column with the enum type
        ALTER TABLE public.subscriptions 
        ADD COLUMN cycle_status cycle_status_enum DEFAULT 'selection'::cycle_status_enum;
    END IF;
END $$;

-- Create function to check if user is near 24-day mark (selection window)
CREATE OR REPLACE FUNCTION public.is_selection_window_active(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cycle_start DATE;
    days_in_cycle INTEGER;
    selection_active BOOLEAN DEFAULT FALSE;
BEGIN
    -- Get current cycle information
    SELECT 
        s.current_cycle_start,
        EXTRACT(DAY FROM (CURRENT_DATE - s.current_cycle_start))
    INTO cycle_start, days_in_cycle
    FROM subscriptions s
    WHERE s.user_id = user_id_param 
    AND s.status = 'active';
    
    -- Selection window is active from day 24-30 of the cycle
    IF days_in_cycle >= 24 AND days_in_cycle <= 30 THEN
        selection_active := TRUE;
    END IF;
    
    RETURN selection_active;
END;
$$;

-- Create function to get user's current cycle status
CREATE OR REPLACE FUNCTION public.get_user_cycle_status(user_id_param UUID)
RETURNS TABLE (
    has_active_subscription BOOLEAN,
    cycle_status cycle_status_enum,
    toys_in_possession BOOLEAN,
    selection_window_active BOOLEAN,
    days_in_current_cycle INTEGER,
    plan_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (s.id IS NOT NULL) as has_active_subscription,
        COALESCE(s.cycle_status, 'selection'::cycle_status_enum) as cycle_status,
        COALESCE(ue.toys_in_possession, FALSE) as toys_in_possession,
        public.is_selection_window_active(user_id_param) as selection_window_active,
        COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - s.current_cycle_start))::INTEGER, 0) as days_in_current_cycle,
        s.plan_id
    FROM subscriptions s
    LEFT JOIN user_entitlements ue ON ue.subscription_id = s.id
    WHERE s.user_id = user_id_param 
    AND s.status IN ('active', 'paused')
    LIMIT 1;
    
    -- If no active subscription found, return default values
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            FALSE as has_active_subscription,
            'selection'::cycle_status_enum as cycle_status,
            FALSE as toys_in_possession,
            FALSE as selection_window_active,
            0 as days_in_current_cycle,
            NULL::TEXT as plan_id;
    END IF;
END;
$$;
