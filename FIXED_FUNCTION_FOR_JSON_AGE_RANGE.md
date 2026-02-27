# 🔧 FINAL FIX - Function for JSON Age Range Format

## **🎯 Problem Identified:**
Your `age_range` is stored as JSON arrays like `["2-3 years"]`, but our function expects plain text.

## **✅ SOLUTION: Updated Function**

**Step 1:** Drop the old function and create the fixed one:

```sql
-- Drop the old function
DROP FUNCTION IF EXISTS auto_insert_toy_to_age_tables() CASCADE;

-- Create FIXED function that handles JSON age_range format
CREATE OR REPLACE FUNCTION auto_insert_toy_to_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_age_range TEXT;
    v_age_array JSONB;
    v_age_item TEXT;
    v_age_tables TEXT[];
    v_table_name TEXT;
    v_sql TEXT;
    v_count INTEGER;
    i INTEGER;
BEGIN
    -- Only process INSERT operations
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Get the age range for the new toy
    v_age_range := NEW.age_range;
    
    -- Log the operation
    RAISE NOTICE 'Processing new toy: % with age_range: %', NEW.name, v_age_range;
    
    -- Skip if no age range specified
    IF v_age_range IS NULL OR v_age_range = '' THEN
        RAISE WARNING 'Toy % has no age_range specified, skipping age table insertion', NEW.name;
        RETURN NEW;
    END IF;
    
    -- Initialize empty array
    v_age_tables := ARRAY[]::TEXT[];
    
    -- Handle both JSON array format and plain text format
    BEGIN
        -- Try to parse as JSON array first
        v_age_array := v_age_range::JSONB;
        
        -- If it's a JSON array, process each element
        IF jsonb_typeof(v_age_array) = 'array' THEN
            FOR i IN 0..jsonb_array_length(v_age_array) - 1
            LOOP
                v_age_item := jsonb_extract_path_text(v_age_array, i::text);
                
                -- Clean up the age item
                v_age_item := LOWER(TRIM(v_age_item));
                v_age_item := REPLACE(v_age_item, ' years', '');
                v_age_item := REPLACE(v_age_item, ' year', '');
                v_age_item := REPLACE(v_age_item, 'years', '');
                v_age_item := REPLACE(v_age_item, 'year', '');
                
                -- Check which age tables this item belongs to
                IF v_age_item ILIKE '%1-2%' OR v_age_item ILIKE '%1 to 2%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_1_2_years');
                END IF;
                
                IF v_age_item ILIKE '%2-3%' OR v_age_item ILIKE '%2 to 3%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_2_3_years');
                END IF;
                
                IF v_age_item ILIKE '%3-4%' OR v_age_item ILIKE '%3 to 4%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_3_4_years');
                END IF;
                
                IF v_age_item ILIKE '%4-6%' OR v_age_item ILIKE '%4 to 6%' OR v_age_item ILIKE '%4-5%' OR v_age_item ILIKE '%5-6%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_4_6_years');
                END IF;
                
                IF v_age_item ILIKE '%6-8%' OR v_age_item ILIKE '%6 to 8%' OR v_age_item ILIKE '%6-7%' OR v_age_item ILIKE '%7-8%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_6_8_years');
                END IF;
            END LOOP;
        ELSE
            -- Handle single JSON string value
            v_age_item := v_age_array::TEXT;
            v_age_item := REPLACE(v_age_item, '"', ''); -- Remove quotes
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- If JSON parsing fails, treat as plain text
        v_age_item := v_age_range;
    END;
    
    -- If we didn't get age tables from JSON processing, try plain text processing
    IF array_length(v_age_tables, 1) IS NULL AND v_age_item IS NOT NULL THEN
        -- Clean up age range string
        v_age_item := LOWER(TRIM(v_age_item));
        v_age_item := REPLACE(v_age_item, ' years', '');
        v_age_item := REPLACE(v_age_item, ' year', '');
        v_age_item := REPLACE(v_age_item, 'years', '');
        v_age_item := REPLACE(v_age_item, 'year', '');
        
        -- Handle comma-separated values in plain text
        DECLARE 
            age_parts TEXT[];
            age_part TEXT;
        BEGIN
            age_parts := string_to_array(v_age_item, ',');
            
            FOREACH age_part IN ARRAY age_parts
            LOOP
                age_part := TRIM(age_part);
                
                IF age_part ILIKE '%1-2%' OR age_part ILIKE '%1 to 2%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_1_2_years');
                END IF;
                
                IF age_part ILIKE '%2-3%' OR age_part ILIKE '%2 to 3%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_2_3_years');
                END IF;
                
                IF age_part ILIKE '%3-4%' OR age_part ILIKE '%3 to 4%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_3_4_years');
                END IF;
                
                IF age_part ILIKE '%4-6%' OR age_part ILIKE '%4 to 6%' OR age_part ILIKE '%4-5%' OR age_part ILIKE '%5-6%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_4_6_years');
                END IF;
                
                IF age_part ILIKE '%6-8%' OR age_part ILIKE '%6 to 8%' OR age_part ILIKE '%6-7%' OR age_part ILIKE '%7-8%' THEN
                    v_age_tables := array_append(v_age_tables, 'toys_6_8_years');
                END IF;
            END LOOP;
        END;
    END IF;
    
    -- Remove duplicates from age_tables array
    v_age_tables := ARRAY(SELECT DISTINCT unnest(v_age_tables));
    
    -- If no specific age tables matched, try to infer from min_age and max_age
    IF array_length(v_age_tables, 1) IS NULL AND (NEW.min_age IS NOT NULL OR NEW.max_age IS NOT NULL) THEN
        DECLARE
            min_age INTEGER := COALESCE(NEW.min_age, 1);
            max_age INTEGER := COALESCE(NEW.max_age, 8);
        BEGIN
            IF min_age <= 2 AND max_age >= 1 THEN
                v_age_tables := array_append(v_age_tables, 'toys_1_2_years');
            END IF;
            IF min_age <= 3 AND max_age >= 2 THEN
                v_age_tables := array_append(v_age_tables, 'toys_2_3_years');
            END IF;
            IF min_age <= 4 AND max_age >= 3 THEN
                v_age_tables := array_append(v_age_tables, 'toys_3_4_years');
            END IF;
            IF min_age <= 6 AND max_age >= 4 THEN
                v_age_tables := array_append(v_age_tables, 'toys_4_6_years');
            END IF;
            IF min_age <= 8 AND max_age >= 6 THEN
                v_age_tables := array_append(v_age_tables, 'toys_6_8_years');
            END IF;
        END;
    END IF;
    
    -- If still no age tables determined, log warning and continue
    IF array_length(v_age_tables, 1) IS NULL THEN
        RAISE WARNING 'Could not determine age table for toy % with age_range: %', NEW.name, NEW.age_range;
        RETURN NEW;
    END IF;
    
    -- Log which tables we're targeting
    RAISE NOTICE 'Will insert toy % into % age tables', NEW.name, array_length(v_age_tables, 1);
    
    -- Insert toy into each determined age table
    FOR i IN 1..array_length(v_age_tables, 1)
    LOOP
        v_table_name := v_age_tables[i];
        
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
            
            -- Check if toy already exists in this age table
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', v_table_name)
            INTO v_count USING NEW.id;
            
            IF v_count > 0 THEN
                RAISE NOTICE 'Toy % already exists in table %, skipping insertion', NEW.name, v_table_name;
                CONTINUE;
            END IF;
            
            -- Build dynamic INSERT statement (simplified to avoid column mismatch issues)
            v_sql := format('
                INSERT INTO %I (
                    id, name, description, category, age_range, brand,
                    retail_price, rental_price, image_url, available_quantity, 
                    total_quantity, rating, show_strikethrough_pricing, 
                    display_order, is_featured, subscription_category, 
                    original_toy_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                )', v_table_name);
            
            -- Execute the INSERT with core fields only
            EXECUTE v_sql USING
                NEW.name, NEW.description, NEW.category, NEW.age_range, NEW.brand,
                NEW.retail_price, NEW.rental_price, NEW.image_url, NEW.available_quantity,
                NEW.total_quantity, NEW.rating, NEW.show_strikethrough_pricing,
                NEW.display_order, NEW.is_featured, NEW.subscription_category,
                NEW.id, NEW.created_at, NEW.updated_at;
            
            RAISE NOTICE 'Successfully inserted toy % into age table %', NEW.name, v_table_name;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the main toy insertion
            RAISE WARNING 'Failed to insert toy % into age table %: %', NEW.name, v_table_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Step 2:** Recreate the trigger:

```sql
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;

-- Create trigger to automatically insert new toys into age tables
CREATE TRIGGER trigger_auto_insert_toy_to_age_tables
    AFTER INSERT ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_toy_to_age_tables();
```

**Step 3:** Test with your existing toys (optional):

```sql
-- Manually sync your recent "test" toy
INSERT INTO toys_2_3_years (
    id, name, description, category, age_range, brand,
    retail_price, rental_price, image_url, available_quantity, 
    total_quantity, rating, show_strikethrough_pricing, 
    display_order, is_featured, subscription_category, 
    original_toy_id, created_at, updated_at
) 
SELECT 
    gen_random_uuid(),
    name, description, category, age_range, brand,
    retail_price, rental_price, image_url, available_quantity,
    total_quantity, rating, show_strikethrough_pricing,
    display_order, is_featured, subscription_category,
    id as original_toy_id, created_at, updated_at
FROM toys 
WHERE id = '5527aa47-c6f1-43a4-994a-4d3fedc4d115';
```

## **🎯 Key Changes Made:**

1. **JSON Array Parsing**: Handles `["2-3 years"]` format
2. **Backwards Compatibility**: Still works with plain text
3. **Multiple Age Ranges**: Properly processes arrays with multiple values
4. **Simplified INSERT**: Reduced column count to avoid schema mismatches
5. **Better Logging**: More detailed debugging output

After applying this fix, new toys should automatically appear in the correct age-based tables! 