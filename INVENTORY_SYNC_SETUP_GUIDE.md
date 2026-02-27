# 🎯 **Inventory Sync Setup Guide**

## **🚨 PROBLEM**

When you edit toys in the admin (EditToy page), changes are made to the **main `toys` table**, but the **age-specific tables are NOT updated**. This means:

- ✅ Admin sees updated inventory in inventory management  
- ❌ Users see **stale inventory** in subscription flow (still shows old stock levels)
- ❌ Out-of-stock items still appear as available in toy selection

## **✅ SOLUTION**

The `inventory-sync-solution.sql` script creates **automatic synchronization** between:
- **Main table**: `toys` (where EditToy saves changes)
- **Age tables**: `toys_1_2_years`, `toys_2_3_years`, etc. (used by subscription flow)

### **🎯 UX Approach: Show Out-of-Stock Toys**

**IMPORTANT**: Out-of-stock toys will be **shown with "Out of Stock" indicators** rather than hidden. This allows customers to:
- ✅ See that the toy exists in your inventory
- ✅ Know it will be available again soon
- ✅ Plan their future selections
- ✅ Add to wishlist for when it's back in stock

## **�� SETUP STEPS**

### **Step 1: Run the SQL Script**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/wucwpyitzqjukcphczhr
2. **Click "SQL Editor"** in the left sidebar  
3. **Copy the entire content** of `inventory-sync-solution.sql`
4. **Paste and click "Run"**

### **Step 2: Initial Sync**

Run this query to sync all existing toys:

```sql
SELECT * FROM sync_all_toy_inventory_to_age_tables();
```

### **Step 3: Verify Setup**

Check sync status:

```sql
SELECT * FROM check_inventory_sync_status();
```

Should show **100% sync coverage** for all age tables.

## **🧪 TESTING**

### **Test Scenario 1: Out of Stock Display**

1. **Go to EditToy page** in admin
2. **Set a toy's available_quantity to 0**
3. **Save changes**
4. **Check subscription flow** - toy should appear with **"Out of Stock"** button (disabled)

### **Test Scenario 2: Back in Stock**

1. **Set the same toy's available_quantity to 5**
2. **Save changes** 
3. **Check subscription flow** - toy should show **"Select Toy"** button (enabled)

### **Test Scenario 3: Low Stock Warning**

1. **Set a toy's available_quantity to 1**
2. **Save changes**
3. **Check subscription flow** - toy should be selectable with low stock indicator

### **Test Scenario 3: Check Sync**

Run this query to verify sync:

```sql
SELECT 
    age_table.name,
    age_table.available_quantity as age_table_qty,
    main_table.available_quantity as main_table_qty,
    CASE 
        WHEN age_table.available_quantity = main_table.available_quantity THEN '✅ SYNCED'
        ELSE '❌ OUT OF SYNC'
    END as sync_status
FROM toys_3_4_years age_table
JOIN toys main_table ON age_table.original_toy_id = main_table.id
LIMIT 10;
```

## **🎯 RESULT**

After setup:

- ✅ **EditToy changes** automatically sync to **all age tables**
- ✅ **Subscription flow** shows **real-time inventory**  
- ✅ **Out-of-stock items** automatically disappear from toy selection
- ✅ **Low stock warnings** appear correctly in user interface
- ✅ **No manual sync** needed - everything is automatic!

## **🔧 TECHNICAL DETAILS**

### **What the Script Creates:**

1. **Database Trigger**: Runs whenever `toys.available_quantity` or `toys.total_quantity` changes
2. **Sync Function**: Updates all 5 age-specific tables automatically  
3. **Verification Functions**: Check sync status and troubleshoot issues
4. **Initial Sync**: One-time sync of all existing inventory

### **Tables Synchronized:**

- `toys_1_2_years` ← `toys`
- `toys_2_3_years` ← `toys`  
- `toys_3_4_years` ← `toys`
- `toys_4_6_years` ← `toys`
- `toys_6_8_years` ← `toys`

### **Fields Synchronized:**

- `available_quantity`
- `total_quantity`  
- `updated_at`

## **✅ SUCCESS CRITERIA**

After implementation, users will experience:

1. **Real-time inventory** in subscription flow
2. **Accurate toy availability** during toy selection
3. **Automatic out-of-stock handling** 
4. **Consistent inventory** across admin and user interfaces

**No more stale inventory in subscription flow!** 🎉 