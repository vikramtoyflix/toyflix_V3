# 🎯 Inventory Management System Setup Guide

## What This Adds to Your Existing System

Your current admin panel already has:
- ✅ Toy management with inventory display (`available_quantity/total_quantity`)
- ✅ Bulk operations and search/filtering
- ✅ Add/Edit/Delete toys functionality

**This inventory system adds:**
- 🔗 **Links age-specific tables to main inventory** via `original_toy_id`
- 📊 **Real-time inventory tracking** across all age groups
- 🎯 **Age-specific inventory views** for admins
- 🔄 **Automated inventory updates** when orders are placed/returned
- 📈 **Inventory dashboard** with low stock alerts and analytics

## Quick Setup (3 Steps)

### Step 1: Run the Simple SQL Setup

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/wucwpyitzqjukcphczhr
2. **Click "SQL Editor"** in the left sidebar
3. **Copy and paste this code** (from `scripts/inventory-setup-simple.sql`):

```sql
-- SECTION 1: Populate original_toy_id (run this first)
UPDATE toys_1_2_years SET original_toy_id = toys.id FROM toys WHERE toys_1_2_years.name = toys.name AND toys_1_2_years.original_toy_id IS NULL;
UPDATE toys_2_3_years SET original_toy_id = toys.id FROM toys WHERE toys_2_3_years.name = toys.name AND toys_2_3_years.original_toy_id IS NULL;
UPDATE toys_3_4_years SET original_toy_id = toys.id FROM toys WHERE toys_3_4_years.name = toys.name AND toys_3_4_years.original_toy_id IS NULL;
UPDATE toys_4_6_years SET original_toy_id = toys.id FROM toys WHERE toys_4_6_years.name = toys.name AND toys_4_6_years.original_toy_id IS NULL;
UPDATE toys_6_8_years SET original_toy_id = toys.id FROM toys WHERE toys_6_8_years.name = toys.name AND toys_6_8_years.original_toy_id IS NULL;
```

4. **Click "Run"** - This links all age-specific toys to main inventory

### Step 2: Create Performance Indexes

Copy and paste this:

```sql
-- SECTION 2: Create indexes (run this second)
CREATE INDEX IF NOT EXISTS idx_toys_1_2_years_original_toy_id ON toys_1_2_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_2_3_years_original_toy_id ON toys_2_3_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_3_4_years_original_toy_id ON toys_3_4_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_4_6_years_original_toy_id ON toys_4_6_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_6_8_years_original_toy_id ON toys_6_8_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_inventory ON toys(available_quantity, total_quantity);
```

### Step 3: Verify Setup

Copy and paste this to check results:

```sql
-- SECTION 3: Verification query (run this to check results)
SELECT 
    'toys_1_2_years' as table_name,
    COUNT(*) as total_toys,
    COUNT(original_toy_id) as linked_toys,
    COUNT(*) - COUNT(original_toy_id) as unlinked_toys
FROM toys_1_2_years
UNION ALL
SELECT 
    'toys_2_3_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_2_3_years
UNION ALL
SELECT 
    'toys_3_4_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_3_4_years
UNION ALL
SELECT 
    'toys_4_6_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_4_6_years
UNION ALL
SELECT 
    'toys_6_8_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_6_8_years;
```

**Expected Result:** You should see all toys linked (unlinked_toys = 0 for all tables)

## How to Use the Enhanced Admin Panel

### New "Inventory" Button
Your existing admin panel now has an **"Inventory"** button in the header that toggles between:
- **Toy List View** (your existing table)
- **Inventory Dashboard** (new analytics view)

### Inventory Dashboard Features:
1. **Summary Cards**: Total toys, available, reserved, low stock
2. **Low Stock Alerts**: Toys with ≤3 items available
3. **Age Group Summary**: Inventory breakdown by age ranges
4. **Manual Adjustments**: Update inventory quantities with notes

### Integration with Existing Features:
- Your existing toy management table **already shows inventory** (`available_quantity/total_quantity`)
- All your existing bulk operations **continue to work**
- The new system **enhances** rather than replaces your current functionality

## Key Benefits:

1. **No Disruption**: Your existing admin panel continues working exactly as before
2. **Enhanced Analytics**: New inventory dashboard provides deeper insights
3. **Age-Specific Tracking**: See inventory breakdown by age groups
4. **Low Stock Alerts**: Proactive inventory management
5. **Real-Time Updates**: Inventory changes reflect immediately across all views
6. **Audit Trail**: Track all inventory adjustments with notes

## Files Added/Modified:

### New Files:
- `src/hooks/useInventoryManagement.ts` - Inventory tracking hooks
- `src/components/admin/InventoryDashboard.tsx` - New inventory dashboard
- `scripts/inventory-setup-simple.sql` - Simple SQL setup

### Enhanced Files:
- `src/components/admin/AdminToysContent.tsx` - Added inventory toggle
- `src/components/admin/toys/AdminToysContentHeader.tsx` - Added inventory button

Your existing toy management functionality remains **100% intact** while gaining powerful new inventory features! 