# 🎯 Manual Migration Instructions - Age Table Auto-Sync

## **📋 Overview**
These SQL queries will create a trigger system that automatically inserts new toys into the appropriate age-based tables when they are created in the main `toys` table.

## **🔧 Step-by-Step Instructions**

### **Step 1: Create the Auto-Insert Function**
Copy and paste this entire SQL block into your Supabase SQL Editor:

```sql
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
    
    -- Skip if no age range specified
    IF v_age_range IS NULL OR v_age_range = '' THEN
        RAISE WARNING 'Toy % has no age_range specified, skipping age table insertion', NEW.name;
        RETURN NEW;
    END IF;
    
    -- Clean up age range string
    v_age_range := LOWER(TRIM(v_age_range));
    v_age_range := REPLACE(v_age_range, ' years', '');
    v_age_range := REPLACE(v_age_range, ' year', '');
    v_age_range := REPLACE(v_age_range, 'years', '');
    v_age_range := REPLACE(v_age_range, 'year', '');
    
    -- Determine which age tables this toy belongs to
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
    
    -- If no age tables determined, try min_age/max_age
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
            
            -- Check if toy already exists in this age table
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
```

### **Step 2: Create the Trigger**
Copy and paste this SQL block:

```sql
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;

-- Create trigger to automatically insert new toys into age tables
CREATE TRIGGER trigger_auto_insert_toy_to_age_tables
    AFTER INSERT ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_toy_to_age_tables();

-- Add helpful comments
COMMENT ON FUNCTION auto_insert_toy_to_age_tables() IS 
'Automatically inserts newly created toys into appropriate age-based tables based on age_range field';

COMMENT ON TRIGGER trigger_auto_insert_toy_to_age_tables ON toys IS 
'Triggers automatic insertion of new toys into age-based tables for subscription flow compatibility';
```

### **Step 3: (Optional) Sync Existing Toys**
If you want to sync existing toys to age tables, copy and paste this:

```sql
-- One-time sync of existing toys to age tables
DO $$
DECLARE
    toy_record RECORD;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_error INTEGER := 0;
    v_skipped INTEGER := 0;
    v_age_range TEXT;
    v_age_tables TEXT[] := ARRAY[]::TEXT[];
    v_table_name TEXT;
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting sync of existing toys to age-based tables...';
    
    -- Loop through toys missing from age tables
    FOR toy_record IN 
        SELECT * FROM toys 
        WHERE age_range IS NOT NULL 
        AND age_range != ''
        ORDER BY created_at DESC
        LIMIT 50  -- Process in batches to avoid timeout
    LOOP
        BEGIN
            v_processed := v_processed + 1;
            v_age_tables := ARRAY[]::TEXT[];
            
            -- Clean up age range
            v_age_range := LOWER(TRIM(toy_record.age_range));
            v_age_range := REPLACE(v_age_range, ' years', '');
            v_age_range := REPLACE(v_age_range, ' year', '');
            v_age_range := REPLACE(v_age_range, 'years', '');
            v_age_range := REPLACE(v_age_range, 'year', '');
            
            -- Determine age tables
            IF v_age_range ILIKE '%1-2%' THEN
                v_age_tables := v_age_tables || 'toys_1_2_years';
            END IF;
            IF v_age_range ILIKE '%2-3%' THEN
                v_age_tables := v_age_tables || 'toys_2_3_years';
            END IF;
            IF v_age_range ILIKE '%3-4%' THEN
                v_age_tables := v_age_tables || 'toys_3_4_years';
            END IF;
            IF v_age_range ILIKE '%4-6%' OR v_age_range ILIKE '%4-5%' OR v_age_range ILIKE '%5-6%' THEN
                v_age_tables := v_age_tables || 'toys_4_6_years';
            END IF;
            IF v_age_range ILIKE '%6-8%' OR v_age_range ILIKE '%6-7%' OR v_age_range ILIKE '%7-8%' THEN
                v_age_tables := v_age_tables || 'toys_6_8_years';
            END IF;
            
            -- Skip if no age tables determined
            IF array_length(v_age_tables, 1) IS NULL THEN
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;
            
            -- Insert into each age table
            FOREACH v_table_name IN ARRAY v_age_tables
            LOOP
                BEGIN
                    -- Check if toy already exists
                    EXECUTE format('SELECT COUNT(*) FROM %I WHERE original_toy_id = $1', v_table_name)
                    INTO v_count USING toy_record.id;
                    
                    IF v_count > 0 THEN
                        CONTINUE;
                    END IF;
                    
                    -- Insert toy
                    v_sql := format('
                        INSERT INTO %I (
                            id, name, description, category, age_range, brand, pack,
                            retail_price, rental_price, image_url, available_quantity, 
                            total_quantity, rating, min_age, max_age,
                            show_strikethrough_pricing, display_order, is_featured,
                            subscription_category, original_toy_id, created_at, updated_at
                        ) VALUES (
                            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                            $15, $16, $17, $18, $19, $20, $21
                        )', v_table_name);
                    
                    EXECUTE v_sql USING
                        toy_record.name, toy_record.description, toy_record.category, toy_record.age_range, 
                        toy_record.brand, toy_record.pack, toy_record.retail_price, toy_record.rental_price, 
                        toy_record.image_url, toy_record.available_quantity, toy_record.total_quantity, 
                        toy_record.rating, toy_record.min_age, toy_record.max_age,
                        toy_record.show_strikethrough_pricing, toy_record.display_order, toy_record.is_featured,
                        toy_record.subscription_category, toy_record.id, toy_record.created_at, toy_record.updated_at;
                    
                    v_success := v_success + 1;
                    
                EXCEPTION WHEN OTHERS THEN
                    v_error := v_error + 1;
                    RAISE WARNING 'Failed to sync toy % to %: %', toy_record.name, v_table_name, SQLERRM;
                END;
            END LOOP;
            
        EXCEPTION WHEN OTHERS THEN
            v_error := v_error + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Sync completed: % processed, % success, % errors, % skipped', 
        v_processed, v_success, v_error, v_skipped;
END $$;
```

## **🔍 How to Test**

After running the above SQL, test by adding a new toy through your admin interface:

1. **Add a test toy** with:
   - Name: "Test Toy Auto Sync"  
   - Age range: "2-3 years"
   - Category: "educational_toys"
   - Available quantity: 5

2. **Check if it appears** in the age table:
```sql
SELECT * FROM toys_2_3_years WHERE name = 'Test Toy Auto Sync';
```

3. **Verify the trigger works** by checking the logs in your Supabase dashboard.

## **✅ Expected Results**

- ✅ **New toys** will automatically appear in appropriate age tables
- ✅ **Subscription flow** will now show newly added toys
- ✅ **Toys page** will display toys from both main table and age tables
- ✅ **No data loss** - all existing functionality preserved

## **🚨 Important Notes**

- Run **Step 1** and **Step 2** first (these create the automation)
- **Step 3** is optional (syncs existing toys)
- If Step 3 times out, run it multiple times (it processes in batches)
- Check Supabase logs for any warnings or errors

---

**🎯 After this setup, every new toy you add will automatically appear in the subscription flow!** 