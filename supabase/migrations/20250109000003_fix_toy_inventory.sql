-- First, fix any negative values in the toys table
UPDATE toys
SET total_quantity = 0
WHERE total_quantity < 0;

UPDATE toys
SET available_quantity = 0
WHERE available_quantity < 0;

UPDATE toys
SET total_quantity = available_quantity
WHERE total_quantity < available_quantity;

-- Drop the existing sync trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_inventory_across_tables ON toys;

-- Drop the existing sync function
DROP FUNCTION IF EXISTS sync_inventory_across_tables();

-- Drop the toy_inventory table to recreate it cleanly
DROP TABLE IF EXISTS toy_inventory CASCADE;

-- Create toy_inventory table
CREATE TABLE toy_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    rented_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by TEXT,
    
    -- Add constraints
    CONSTRAINT valid_quantities CHECK (
        available_quantity >= 0 AND
        total_quantity >= 0 AND
        rented_quantity >= 0 AND
        available_quantity <= total_quantity AND
        rented_quantity <= total_quantity
    )
);

-- Create sync function with proper error handling
CREATE OR REPLACE FUNCTION sync_inventory_across_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_rented_quantity INTEGER;
    v_total_quantity INTEGER;
    v_available_quantity INTEGER;
BEGIN
    -- Ensure non-negative values and proper relationships
    v_total_quantity := GREATEST(0, NEW.total_quantity);
    v_available_quantity := GREATEST(0, LEAST(NEW.available_quantity, v_total_quantity));
    v_rented_quantity := GREATEST(0, v_total_quantity - v_available_quantity);

    -- Also update the source table to maintain consistency
    UPDATE toys 
    SET 
        total_quantity = v_total_quantity,
        available_quantity = v_available_quantity
    WHERE id = NEW.id;

    BEGIN
        -- Update or insert into toy_inventory using validated values
        INSERT INTO toy_inventory (
            toy_id,
            total_quantity,
            available_quantity,
            rented_quantity,
            updated_at,
            updated_by
        ) VALUES (
            NEW.id,
            v_total_quantity,      -- Use validated value
            v_available_quantity,  -- Use validated value
            v_rented_quantity,     -- Use validated value
            NEW.updated_at,
            'toys_table_sync'
        )
        ON CONFLICT (toy_id) DO UPDATE
        SET
            total_quantity = EXCLUDED.total_quantity,
            available_quantity = EXCLUDED.available_quantity,
            rented_quantity = EXCLUDED.rented_quantity,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by;

        RETURN NEW;
    EXCEPTION WHEN OTHERS THEN
        -- Log error and set safe default values
        RAISE WARNING 'Error in sync_inventory_across_tables: %', SQLERRM;
        
        -- Try one more time with safe defaults
        INSERT INTO toy_inventory (
            toy_id,
            total_quantity,
            available_quantity,
            rented_quantity,
            updated_at,
            updated_by
        ) VALUES (
            NEW.id,
            0,
            0,
            0,
            NEW.updated_at,
            'toys_table_sync_error'
        )
        ON CONFLICT (toy_id) DO UPDATE
        SET
            total_quantity = 0,
            available_quantity = 0,
            rented_quantity = 0,
            updated_at = NEW.updated_at,
            updated_by = 'toys_table_sync_error';
            
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing
CREATE TRIGGER trigger_sync_inventory_across_tables
    AFTER INSERT OR UPDATE OF total_quantity, available_quantity ON toys
    FOR EACH ROW
    EXECUTE FUNCTION sync_inventory_across_tables();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_toy_inventory_toy_id ON toy_inventory(toy_id);

-- Add RLS policies
ALTER TABLE toy_inventory ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can view toy inventory" ON toy_inventory
    FOR SELECT TO authenticated USING (true);

-- Allow admin users to modify toy inventory
CREATE POLICY "Admin users can modify toy inventory" ON toy_inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Initial sync of existing data with proper value handling
INSERT INTO toy_inventory (
    toy_id,
    total_quantity,
    available_quantity,
    rented_quantity,
    updated_at,
    updated_by
)
SELECT 
    id as toy_id,
    GREATEST(0, total_quantity) as total_quantity,
    GREATEST(0, LEAST(available_quantity, GREATEST(0, total_quantity))) as available_quantity,
    GREATEST(0, GREATEST(0, total_quantity) - GREATEST(0, LEAST(available_quantity, GREATEST(0, total_quantity)))) as rented_quantity,
    updated_at,
    'initial_sync'
FROM toys
ON CONFLICT (toy_id) DO UPDATE
SET
    total_quantity = GREATEST(0, EXCLUDED.total_quantity),
    available_quantity = GREATEST(0, LEAST(EXCLUDED.available_quantity, GREATEST(0, EXCLUDED.total_quantity))),
    rented_quantity = GREATEST(0, GREATEST(0, EXCLUDED.total_quantity) - GREATEST(0, LEAST(EXCLUDED.available_quantity, GREATEST(0, EXCLUDED.total_quantity)))),
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by; 