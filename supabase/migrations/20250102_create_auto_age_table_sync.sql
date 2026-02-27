-- Migration: Auto-sync new toys to age-based tables
-- Description: Automatically inserts new toys into appropriate age-based tables on creation
-- Date: 2025-01-02

-- Drop existing function if it exists (for safety during development)
DROP FUNCTION IF EXISTS auto_insert_toy_to_age_tables() CASCADE;

-- Create function to automatically insert new toys into age-based tables
CREATE OR REPLACE FUNCTION auto_insert_toy_to_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    v_table_name TEXT;
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    -- Only process INSERT operations
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Get the age range for the new toy
    v_age_range := NEW.age_range;
    
    -- Log the operation
    RAISE NOTICE 'Processing new toy: % with age_range: %', NEW.name, v_age_range;
    
    -- Determine which age-based table(s) this toy should be inserted into
    -- Parse age_range and map to appropriate tables
    IF v_age_range IS NULL OR v_age_range = '' THEN
        RAISE WARNING 'Toy % has no age_range specified, skipping age table insertion', NEW.name;
        RETURN NEW;
    END IF;
    
    -- Map age ranges to table names (handle multiple age ranges)
    -- Example age_range formats: "1-2 years", "2-3", "1-2,2-3", "3-4 years", etc.
    
    -- Clean up age range string
    v_age_range := LOWER(TRIM(v_age_range));
    v_age_range := REPLACE(v_age_range, ' years', '');
    v_age_range := REPLACE(v_age_range, ' year', '');
    v_age_range := REPLACE(v_age_range, 'years', '');
    v_age_range := REPLACE(v_age_range, 'year', '');
    
    -- Check for each age range and add corresponding table
    IF v_age_range ILIKE '%1-2%' OR v_age_range ILIKE '%1 to 2%' THEN
        v_age_tables := v_age_tables || 'toys_1_2_years';
    END IF;
    
    IF v_age_range ILIKE '%2-3%' OR v_age_range ILIKE '%2 to 3%' THEN
        v_age_tables := v_age_tables || 'toys_2_3_years';
    END IF;
    
    IF v_age_range ILIKE '%3-4%' OR v_age_range ILIKE '%3 to 4%' THEN
        v_age_tables := v_age_tables || 'toys_3_4_years';
    END IF;
    
    IF v_age_range ILIKE '%4-6%' OR v_age_range ILIKE '%4 to 6%' OR v_age_range ILIKE '%4-5%' OR v_age_range ILIKE '%5-6%' THEN
        v_age_tables := v_age_tables || 'toys_4_6_years';
    END IF;
    
    IF v_age_range ILIKE '%6-8%' OR v_age_range ILIKE '%6 to 8%' OR v_age_range ILIKE '%6-7%' OR v_age_range ILIKE '%7-8%' THEN
        v_age_tables := v_age_tables || 'toys_6_8_years';
    END IF;
    
    -- If no specific age tables matched, try to infer from min_age and max_age
    IF array_length(v_age_tables, 1) IS NULL AND (NEW.min_age IS NOT NULL OR NEW.max_age IS NOT NULL) THEN
        DECLARE
            min_age INTEGER := COALESCE(NEW.min_age, 1);
            max_age INTEGER := COALESCE(NEW.max_age, 8);
        BEGIN
            IF min_age <= 2 AND max_age >= 1 THEN
                v_age_tables := v_age_tables || 'toys_1_2_years';
            END IF;
            IF min_age <= 3 AND max_age >= 2 THEN
                v_age_tables := v_age_tables || 'toys_2_3_years';
            END IF;
            IF min_age <= 4 AND max_age >= 3 THEN
                v_age_tables := v_age_tables || 'toys_3_4_years';
            END IF;
            IF min_age <= 6 AND max_age >= 4 THEN
                v_age_tables := v_age_tables || 'toys_4_6_years';
            END IF;
            IF min_age <= 8 AND max_age >= 6 THEN
                v_age_tables := v_age_tables || 'toys_6_8_years';
            END IF;
        END;
    END IF;
    
    -- If still no age tables determined, log warning and continue
    IF array_length(v_age_tables, 1) IS NULL THEN
        RAISE WARNING 'Could not determine age table for toy % with age_range: %', NEW.name, NEW.age_range;
        RETURN NEW;
    END IF;
    
    -- Insert toy into each determined age table
    FOREACH v_table_name IN ARRAY v_age_tables
    LOOP
        BEGIN
            -- Check if the age table exists
            SELECT COUNT(*) INTO v_count
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = v_table_name;
            
            IF v_count = 0 THEN
                RAISE WARNING 'Age table % does not exist, skipping insertion for toy %', v_table_name, NEW.name;
                CONTINUE;
            END IF;
            
            -- Check if toy already exists in this age table (to prevent duplicates)
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', v_table_name)
            INTO v_count USING NEW.id;
            
            IF v_count > 0 THEN
                RAISE NOTICE 'Toy % already exists in table %, skipping insertion', NEW.name, v_table_name;
                CONTINUE;
            END IF;
            
            -- Build dynamic INSERT statement
            v_sql := format('
                INSERT INTO %I (
                    id, name, description, category, age_range, brand, pack,
                    retail_price, rental_price, image_url, available_quantity, 
                    total_quantity, rating, min_age, max_age,
                    show_strikethrough_pricing, display_order, is_featured,
                    subscription_category, sku, reorder_level, reorder_quantity,
                    supplier_id, purchase_cost, last_restocked_date, inventory_status,
                    weight_kg, dimensions_cm, barcode, internal_notes,
                    seasonal_availability, condition_rating, maintenance_required,
                    last_maintenance_date, original_toy_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
                    $30, $31, $32, $33, $34, $35, $36
                )', v_table_name);
            
            -- Execute the INSERT
            EXECUTE v_sql USING
                NEW.name, NEW.description, NEW.category, NEW.age_range, NEW.brand, NEW.pack,
                NEW.retail_price, NEW.rental_price, NEW.image_url, NEW.available_quantity,
                NEW.total_quantity, NEW.rating, NEW.min_age, NEW.max_age,
                NEW.show_strikethrough_pricing, NEW.display_order, NEW.is_featured,
                NEW.subscription_category, NEW.sku, NEW.reorder_level, NEW.reorder_quantity,
                NEW.supplier_id, NEW.purchase_cost, NEW.last_restocked_date, NEW.inventory_status,
                NEW.weight_kg, NEW.dimensions_cm, NEW.barcode, NEW.internal_notes,
                NEW.seasonal_availability, NEW.condition_rating, NEW.maintenance_required,
                NEW.last_maintenance_date, NEW.id, NEW.created_at, NEW.updated_at;
            
            RAISE NOTICE 'Successfully inserted toy % into age table %', NEW.name, v_table_name;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the main toy insertion
            RAISE WARNING 'Failed to insert toy % into age table %: %', NEW.name, v_table_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically insert new toys into age tables
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;

CREATE TRIGGER trigger_auto_insert_toy_to_age_tables
    AFTER INSERT ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_toy_to_age_tables();

-- Add helpful comment
COMMENT ON FUNCTION auto_insert_toy_to_age_tables() IS 
'Automatically inserts newly created toys into appropriate age-based tables (toys_1_2_years, toys_2_3_years, etc.) based on the toy''s age_range field';

COMMENT ON TRIGGER trigger_auto_insert_toy_to_age_tables ON toys IS 
'Triggers automatic insertion of new toys into age-based tables for subscription flow compatibility';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully created auto_insert_toy_to_age_tables function and trigger';
    RAISE NOTICE 'New toys will now automatically be inserted into appropriate age-based tables';
END $$; 