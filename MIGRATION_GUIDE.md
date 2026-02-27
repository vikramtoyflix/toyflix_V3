# 🚀 Rental Orders Migration Guide

This guide explains how to migrate existing orders from the fragmented `orders`/`order_items` tables to the unified `rental_orders` table.

## 📋 Overview

The migration consolidates order data from multiple tables into a single, comprehensive `rental_orders` table:

**Before (Fragmented):**
- `orders` - Basic order information
- `order_items` - Individual toy details
- `payment_orders` - Payment tracking
- `subscription_tracking` - Subscription data

**After (Unified):**
- `rental_orders` - All order data in one table with JSONB fields

## 🛠️ Migration Options

### Option 1: JavaScript Migration (Recommended)

**File:** `migrate-existing-orders-to-rental.js`

**Features:**
- ✅ Detailed progress tracking
- ✅ Individual error handling
- ✅ Comprehensive validation
- ✅ Rollback safety (doesn't delete original data)

**Usage:**
```bash
# Run the migration
node migrate-existing-orders-to-rental.js

# Validation only
node migrate-existing-orders-to-rental.js --validate

# Dry run (preview only)
node migrate-existing-orders-to-rental.js --dry-run
```

### Option 2: SQL Migration

**File:** `migrate-existing-orders.sql`

**Features:**
- ✅ Fast bulk operation
- ✅ Database-native processing
- ✅ Built-in validation
- ✅ Automatic indexing

**Usage:**
```bash
# Run the SQL migration
psql $DATABASE_URL -f migrate-existing-orders.sql

# Or if you have the connection string
psql "postgresql://user:pass@host:port/database" -f migrate-existing-orders.sql
```

## 🔍 Verification

After running either migration, verify the results:

```bash
# Check migration status
node verify-migration.js
```

The verification script provides:
- 📊 Record counts comparison
- ✅ Migration completeness check
- 🔐 Data integrity validation
- 💰 Financial data verification
- ⏰ Recent activity analysis

## 📊 Expected Results

### Successful Migration Output:
```
🎉 MIGRATION COMPLETE!
========================
📦 Total original orders: 150
✅ Successfully migrated: 150
🆕 New rental orders: 5
📈 Success rate: 100.0%

🎯 PERFECT MIGRATION! All orders successfully transferred.
```

### Migration Statistics:
- **Total Orders**: Count from `orders` table
- **Migrated Orders**: Orders with `legacy_order_id` in `rental_orders`
- **New Orders**: Orders without `legacy_order_id` (created after migration)
- **Success Rate**: Percentage of successfully migrated orders

## 🔧 Troubleshooting

### Common Issues:

#### 1. Permission Errors
```bash
Error: Failed to fetch existing orders: permission denied
```
**Solution:** Ensure you're using the service role key, not the anon key.

#### 2. Missing Environment Variables
```bash
Error: SUPABASE_SERVICE_ROLE_KEY not found
```
**Solution:** Set environment variables:
```bash
export VITE_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### 3. Partial Migration
```bash
⚠️ PARTIAL: 25 orders still need migration.
```
**Solution:** Re-run the migration script. It will skip already migrated orders.

#### 4. Data Integrity Issues
```bash
🧸 Orders with empty toys_data: 5
```
**Solution:** Check source data in `order_items` table for these orders.

## 📁 Data Mapping

### Order Information:
| Source | Target | Notes |
|--------|--------|-------|
| `orders.id` | `rental_orders.legacy_order_id` | Links to original order |
| `orders.user_id` | `rental_orders.user_id` | User reference |
| `orders.status` | `rental_orders.status` | Order status |
| `orders.total_amount` | `rental_orders.total_amount` | Financial amount |
| `orders.shipping_address` | `rental_orders.shipping_address` | JSONB field |

### Order Items:
| Source | Target | Notes |
|--------|--------|-------|
| `order_items.*` + `toys.*` | `rental_orders.toys_data` | JSONB array |

### Payment Data:
| Source | Target | Notes |
|--------|--------|-------|
| `payment_orders.razorpay_*` | `rental_orders.razorpay_*` | Payment tracking |
| `payment_orders.status` | `rental_orders.payment_status` | Payment status |

## 🎯 Post-Migration Steps

### 1. Verify Migration
```bash
node verify-migration.js
```

### 2. Test Admin Dashboard
- Open admin panel
- Check order details display
- Verify all data is visible

### 3. Test User Dashboard
- Check user order history
- Verify cycle calculations
- Test order details view

### 4. Create Test Order
- Place a new order
- Verify it goes to `rental_orders`
- Check admin visibility

### 5. Monitor New Orders
```sql
-- Check recent orders
SELECT id, order_number, status, created_at, legacy_order_id 
FROM rental_orders 
ORDER BY created_at DESC 
LIMIT 10;
```

## ⚠️ Important Notes

### Data Safety:
- ✅ **Migration is NON-DESTRUCTIVE** - Original tables remain unchanged
- ✅ **Rollback possible** - Can revert by querying original tables
- ✅ **Incremental** - Re-running skips already migrated orders

### Performance:
- 🚀 **Faster queries** - Single table instead of joins
- 🚀 **Better admin performance** - Direct JSONB access
- 🚀 **Improved user experience** - Unified data structure

### Future Considerations:
- 📦 **Archive old tables** after successful migration and testing
- 🔧 **Update TypeScript types** to include `rental_orders`
- 📊 **Monitor performance** improvements

## 🆘 Support

If you encounter issues:

1. **Check logs** for detailed error messages
2. **Run verification** to identify specific problems
3. **Review data integrity** checks
4. **Re-run migration** for partial failures

The migration is designed to be safe and repeatable. You can run it multiple times without data corruption.

---

## 📞 Emergency Rollback

If needed, you can temporarily revert admin components to use old tables by updating the queries in:
- `src/components/admin/ComprehensiveOrderDetails.tsx`
- `src/hooks/useAdminOrders.ts`

However, this should only be a temporary measure while resolving migration issues.

---

**✅ Ready to migrate? Run the verification first, then choose your migration method!** 