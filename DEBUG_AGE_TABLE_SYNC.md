# 🔍 Debug Guide - Age Table Sync Issues

## **🎯 Problem**: Toy appears in `toys` table but NOT in age-based tables

Let's systematically debug this step by step.

## **Step 1: Check if Trigger Exists**
Run this to verify the trigger was created:

```sql
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_insert_toy_to_age_tables';
```

**Expected**: Should return 1 row showing the trigger exists.

## **Step 2: Check if Function Exists**
```sql
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'auto_insert_toy_to_age_tables';
```

**Expected**: Should return 1 row showing the function exists.

## **Step 3: Check Recent Toy Details**
Find the toy you just added:

```sql
SELECT 
    id,
    name,
    age_range,
    min_age,
    max_age,
    category,
    subscription_category,
    created_at
FROM toys 
ORDER BY created_at DESC 
LIMIT 5;
```

**Note the toy's ID and age_range** - we'll use this for testing.

## **Step 4: Check if Toy Exists in Any Age Table**
Replace `YOUR_TOY_ID` with the actual toy ID from Step 3:

```sql
-- Check toys_1_2_years
SELECT COUNT(*) as count_1_2, 'toys_1_2_years' as table_name
FROM toys_1_2_years WHERE original_toy_id = 'YOUR_TOY_ID'
UNION ALL
-- Check toys_2_3_years  
SELECT COUNT(*) as count_2_3, 'toys_2_3_years' as table_name
FROM toys_2_3_years WHERE original_toy_id = 'YOUR_TOY_ID'
UNION ALL
-- Check toys_3_4_years
SELECT COUNT(*) as count_3_4, 'toys_3_4_years' as table_name
FROM toys_3_4_years WHERE original_toy_id = 'YOUR_TOY_ID'
UNION ALL
-- Check toys_4_6_years
SELECT COUNT(*) as count_4_6, 'toys_4_6_years' as table_name
FROM toys_4_6_years WHERE original_toy_id = 'YOUR_TOY_ID'
UNION ALL
-- Check toys_6_8_years
SELECT COUNT(*) as count_6_8, 'toys_6_8_years' as table_name
FROM toys_6_8_years WHERE original_toy_id = 'YOUR_TOY_ID';
```

**Expected**: Should show 1 for the matching age table, 0 for others.

## **Step 5: Check Supabase Logs**
1. Go to your **Supabase Dashboard**
2. Click **Logs** in the sidebar
3. Look for messages like:
   - `"Processing new toy: [TOY_NAME] with age_range: [AGE]"`
   - Any error messages from the trigger

## **Step 6: Manual Test the Function**
Let's manually test the function logic with your toy's data. Replace values with your actual toy data:

```sql
DO $$
DECLARE
    test_age_range TEXT := '2-3 years'; -- Replace with your toy's age_range
    v_age_tables TEXT[];
    v_table_name TEXT;
    i INTEGER;
BEGIN
    -- Initialize array
    v_age_tables := ARRAY[]::TEXT[];
    
    -- Clean up age range
    test_age_range := LOWER(TRIM(test_age_range));
    test_age_range := REPLACE(test_age_range, ' years', '');
    test_age_range := REPLACE(test_age_range, ' year', '');
    test_age_range := REPLACE(test_age_range, 'years', '');
    test_age_range := REPLACE(test_age_range, 'year', '');
    
    RAISE NOTICE 'Cleaned age range: %', test_age_range;
    
    -- Test age range matching
    IF test_age_range ILIKE '%1-2%' OR test_age_range ILIKE '%1 to 2%' THEN
        v_age_tables := array_append(v_age_tables, 'toys_1_2_years');
        RAISE NOTICE 'Matched: toys_1_2_years';
    END IF;
    
    IF test_age_range ILIKE '%2-3%' OR test_age_range ILIKE '%2 to 3%' THEN
        v_age_tables := array_append(v_age_tables, 'toys_2_3_years');
        RAISE NOTICE 'Matched: toys_2_3_years';
    END IF;
    
    IF test_age_range ILIKE '%3-4%' OR test_age_range ILIKE '%3 to 4%' THEN
        v_age_tables := array_append(v_age_tables, 'toys_3_4_years');
        RAISE NOTICE 'Matched: toys_3_4_years';
    END IF;
    
    IF test_age_range ILIKE '%4-6%' OR test_age_range ILIKE '%4 to 6%' OR test_age_range ILIKE '%4-5%' OR test_age_range ILIKE '%5-6%' THEN
        v_age_tables := array_append(v_age_tables, 'toys_4_6_years');
        RAISE NOTICE 'Matched: toys_4_6_years';
    END IF;
    
    IF test_age_range ILIKE '%6-8%' OR test_age_range ILIKE '%6 to 8%' OR test_age_range ILIKE '%6-7%' OR test_age_range ILIKE '%7-8%' THEN
        v_age_tables := array_append(v_age_tables, 'toys_6_8_years');
        RAISE NOTICE 'Matched: toys_6_8_years';
    END IF;
    
    -- Show results
    IF array_length(v_age_tables, 1) IS NULL THEN
        RAISE NOTICE 'NO AGE TABLES MATCHED!';
    ELSE
        FOR i IN 1..array_length(v_age_tables, 1)
        LOOP
            RAISE NOTICE 'Will insert into table: %', v_age_tables[i];
        END LOOP;
    END IF;
END $$;
```

## **Step 7: Check Age Table Schemas**
Verify the age tables have the required columns:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'toys_2_3_years' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

Look for the `original_toy_id` column - this is crucial!

## **🔧 Common Issues & Solutions:**

### **Issue 1: Trigger Not Created**
```sql
-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_insert_toy_to_age_tables ON toys;
CREATE TRIGGER trigger_auto_insert_toy_to_age_tables
    AFTER INSERT ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_insert_toy_to_age_tables();
```

### **Issue 2: Age Tables Missing `original_toy_id` Column**
```sql
-- Add missing column to age tables
ALTER TABLE toys_1_2_years ADD COLUMN IF NOT EXISTS original_toy_id UUID;
ALTER TABLE toys_2_3_years ADD COLUMN IF NOT EXISTS original_toy_id UUID;
ALTER TABLE toys_3_4_years ADD COLUMN IF NOT EXISTS original_toy_id UUID;
ALTER TABLE toys_4_6_years ADD COLUMN IF NOT EXISTS original_toy_id UUID;
ALTER TABLE toys_6_8_years ADD COLUMN IF NOT EXISTS original_toy_id UUID;
```

### **Issue 3: Age Range Format Mismatch**
If your toy's age_range is in a different format, we might need to adjust the pattern matching.

### **Issue 4: Trigger Firing But Function Failing**
Check the Supabase logs for specific error messages.

## **🧪 Manual Test Insert**
If the trigger isn't working, test manual insertion. Replace values with your toy data:

```sql
-- Manual test insert (replace with your toy's actual data)
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
WHERE name = 'YOUR_TOY_NAME'; -- Replace with your toy name
```

## **📋 Report Back:**

Please run the queries above and let me know:
1. **Step 1 result**: Does the trigger exist?
2. **Step 2 result**: Does the function exist?
3. **Step 3 result**: What's your toy's age_range and ID?
4. **Step 4 result**: Is the toy in any age table?
5. **Step 5 result**: Any error messages in logs?
6. **Step 6 result**: What does the manual test show?

This will help me pinpoint exactly what's going wrong! 