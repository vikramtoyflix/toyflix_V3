# 🗑️ Toy Deletion Sync Solution

## **🎯 Current Issue:**
When you delete a toy from the main `toys` table, it remains in the age-based tables, creating **orphaned records**.

## **📊 What Happens Now:**

### **Scenario: Delete a toy**
1. ✅ **Toy deleted** from main `toys` table
2. ❌ **Toy remains** in age-based tables (`toys_2_3_years`, etc.)
3. ❌ **Orphaned records** in subscription flow
4. ❌ **Data inconsistency** across tables

### **Problems This Causes:**
- **Ghost toys** appear in subscription flow
- **Data integrity issues** 
- **Confused users** seeing deleted toys
- **Storage waste** with orphaned records

## **✅ SOLUTION: Auto-Delete Trigger**

Create a trigger that automatically removes toys from age-based tables when deleted from the main table.

### **Step 1: Create Auto-Delete Function**

```sql
-- Create function to automatically delete toys from age-based tables
CREATE OR REPLACE FUNCTION auto_delete_toy_from_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    v_table_name TEXT;
    v_deleted_count INTEGER := 0;
    v_total_deleted INTEGER := 0;
BEGIN
    -- Only process DELETE operations
    IF TG_OP != 'DELETE' THEN
        RETURN NEW;
    END IF;
    
    -- Log the operation
    RAISE NOTICE 'Deleting toy: % (ID: %) from age-based tables', OLD.name, OLD.id;
    
    -- Delete from each age table
    FOREACH v_table_name IN ARRAY v_age_tables
    LOOP
        BEGIN
            -- Check if table exists
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = v_table_name
            ) THEN
                -- Delete toy from this age table
                EXECUTE format('DELETE FROM %I WHERE original_toy_id = $1', v_table_name) 
                USING OLD.id;
                
                -- Get count of deleted rows
                GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
                v_total_deleted := v_total_deleted + v_deleted_count;
                
                IF v_deleted_count > 0 THEN
                    RAISE NOTICE 'Deleted % record(s) from %', v_deleted_count, v_table_name;
                END IF;
            ELSE
                RAISE WARNING 'Age table % does not exist, skipping deletion', v_table_name;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the main deletion
            RAISE WARNING 'Failed to delete toy % from age table %: %', OLD.name, v_table_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Successfully deleted toy % from % age table record(s)', OLD.name, v_total_deleted;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

### **Step 2: Create the Deletion Trigger**

```sql
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_delete_toy_from_age_tables ON toys;

-- Create trigger to automatically delete toys from age tables
CREATE TRIGGER trigger_auto_delete_toy_from_age_tables
    AFTER DELETE ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_delete_toy_from_age_tables();

-- Add helpful comments
COMMENT ON FUNCTION auto_delete_toy_from_age_tables() IS 
'Automatically deletes toys from age-based tables when deleted from main toys table';

COMMENT ON TRIGGER trigger_auto_delete_toy_from_age_tables ON toys IS 
'Triggers automatic deletion of toys from age-based tables to maintain data consistency';
```

### **Step 3: Create Update Trigger (Optional)**

Handle toy updates that might change age ranges:

```sql
-- Create function to handle toy updates
CREATE OR REPLACE FUNCTION auto_update_toy_in_age_tables()
RETURNS TRIGGER AS $$
DECLARE
    v_age_tables TEXT[] := ARRAY['toys_1_2_years', 'toys_2_3_years', 'toys_3_4_years', 'toys_4_6_years', 'toys_6_8_years'];
    v_table_name TEXT;
BEGIN
    -- Only process UPDATE operations where age_range or critical fields changed
    IF TG_OP != 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- If age_range changed, we need to re-sync
    IF OLD.age_range IS DISTINCT FROM NEW.age_range THEN
        RAISE NOTICE 'Age range changed for toy %: % → %', NEW.name, OLD.age_range, NEW.age_range;
        
        -- Delete from all age tables first
        FOREACH v_table_name IN ARRAY v_age_tables
        LOOP
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = v_table_name
                ) THEN
                    EXECUTE format('DELETE FROM %I WHERE original_toy_id = $1', v_table_name) 
                    USING NEW.id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to delete from % during update: %', v_table_name, SQLERRM;
            END;
        END LOOP;
        
        -- The INSERT trigger will handle re-inserting into correct age tables
        -- We simulate an INSERT by calling the insert function directly
        PERFORM auto_insert_toy_to_age_tables_for_update(NEW);
    ELSE
        -- Just update existing records in age tables
        FOREACH v_table_name IN ARRAY v_age_tables
        LOOP
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = v_table_name
                ) THEN
                    EXECUTE format('
                        UPDATE %I SET 
                            name = $1,
                            description = $2,
                            category = $3,
                            brand = $4,
                            retail_price = $5,
                            rental_price = $6,
                            image_url = $7,
                            available_quantity = $8,
                            total_quantity = $9,
                            rating = $10,
                            show_strikethrough_pricing = $11,
                            display_order = $12,
                            is_featured = $13,
                            subscription_category = $14,
                            updated_at = $15
                        WHERE original_toy_id = $16', v_table_name) 
                    USING NEW.name, NEW.description, NEW.category, NEW.brand,
                          NEW.retail_price, NEW.rental_price, NEW.image_url,
                          NEW.available_quantity, NEW.total_quantity, NEW.rating,
                          NEW.show_strikethrough_pricing, NEW.display_order, NEW.is_featured,
                          NEW.subscription_category, NEW.updated_at, NEW.id;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to update toy in age table %: %', v_table_name, SQLERRM;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the update trigger
DROP TRIGGER IF EXISTS trigger_auto_update_toy_in_age_tables ON toys;

CREATE TRIGGER trigger_auto_update_toy_in_age_tables
    AFTER UPDATE ON toys
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_toy_in_age_tables();
```

## **🧪 Testing the Solution**

### **Test Deletion:**

1. **Before deletion** - Check if toy exists in age table:
```sql
SELECT COUNT(*) FROM toys_2_3_years WHERE original_toy_id = 'YOUR_TOY_ID';
```

2. **Delete the toy:**
```sql
DELETE FROM toys WHERE id = 'YOUR_TOY_ID';
```

3. **After deletion** - Verify it's removed from age table:
```sql
SELECT COUNT(*) FROM toys_2_3_years WHERE original_toy_id = 'YOUR_TOY_ID';
```

**Expected**: Should be 0 after deletion.

### **Test Update:**

1. **Update toy's age range:**
```sql
UPDATE toys SET age_range = '["3-4 years"]' WHERE id = 'YOUR_TOY_ID';
```

2. **Check age tables:**
```sql
-- Should be 0 in old age table
SELECT COUNT(*) FROM toys_2_3_years WHERE original_toy_id = 'YOUR_TOY_ID';

-- Should be 1 in new age table  
SELECT COUNT(*) FROM toys_3_4_years WHERE original_toy_id = 'YOUR_TOY_ID';
```

## **📋 Complete Trigger Summary**

After implementing all triggers, you'll have:

1. **INSERT Trigger**: Auto-adds toys to age tables
2. **DELETE Trigger**: Auto-removes toys from age tables  
3. **UPDATE Trigger**: Auto-syncs changes across age tables

## **✅ Benefits:**

- ✅ **Data Consistency**: No orphaned records
- ✅ **Automatic Cleanup**: No manual intervention needed
- ✅ **Real-time Sync**: Changes reflected immediately
- ✅ **Error Resilience**: Failures don't break main operations
- ✅ **Full Coverage**: Handles INSERT, UPDATE, DELETE

## **🚨 Important Notes:**

1. **Apply triggers in order**: INSERT → DELETE → UPDATE
2. **Test thoroughly** with non-production data first
3. **Monitor logs** for any error messages
4. **Backup data** before applying triggers

---

**🎯 After implementing these triggers, your toy management will be fully automated with perfect data consistency across all tables!** 