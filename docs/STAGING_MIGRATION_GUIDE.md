# Staging Migration Guide

## Overview

This guide explains the staging migration approach for safely migrating WooCommerce data to your Supabase system. Instead of directly inserting data into your live tables, we first stage the data in separate tables where it can be reviewed, mapped, and validated before final integration.

## Why Use Staging?

1. **Safety**: Protect your live system from potentially corrupted or mismatched data
2. **Review**: Manually review and map WooCommerce products to your existing toys
3. **Validation**: Ensure data quality before integration
4. **Rollback**: Easy to discard staging data if issues are found
5. **Incremental**: Process data in batches and integrate gradually

## Staging Schema

The staging system creates a separate `migration_staging` schema with these tables:

### Core Staging Tables

- **`users_staging`**: WooCommerce users with migration metadata
- **`orders_staging`**: WooCommerce orders linked to staged users
- **`order_items_staging`**: Individual order items with product details
- **`subscriptions_staging`**: WooCommerce subscriptions
- **`payments_staging`**: Payment records

### Mapping & Control Tables

- **`product_toy_mapping`**: Maps WooCommerce products to your toys
- **`migration_batches`**: Tracks migration runs and statistics

## Key Features

### 1. Product-to-Toy Mapping

The most critical aspect is mapping WooCommerce products to your existing toys:

```sql
-- View unmapped products
SELECT wp_product_name, wp_product_id 
FROM migration_staging.product_toy_mapping 
WHERE mapping_status = 'pending';

-- Manually map a product to a toy
UPDATE migration_staging.product_toy_mapping 
SET final_toy_id = 'your-toy-uuid',
    mapping_status = 'mapped',
    reviewer_notes = 'Manual mapping verified'
WHERE wp_product_id = 123;
```

### 2. Migration Status Tracking

Each record has a `migration_status` field:
- `pending`: Newly migrated, needs review
- `reviewed`: Manually reviewed and approved
- `integrated`: Successfully integrated into live system
- `rejected`: Rejected and won't be integrated

### 3. Batch Tracking

Every migration run creates a batch record with statistics:
- Total records processed
- Success/failure counts
- Migration type (users, orders, combined)
- Start/end timestamps

## Migration Process

### Step 1: Create Staging Tables

First, ensure the staging tables are created. You can either:

1. **Via Supabase Dashboard**: Copy the SQL from `supabase/migrations/20250102000000_create_migration_staging_tables.sql` and run it in the SQL editor

2. **Via Migration Script**: Run the apply script:
```bash
node scripts/apply-staging-migration.js
```

### Step 2: Run Staging Migration

```bash
# Dry run to test (no data inserted)
node scripts/staging-migration.js --dry-run

# Migrate users only
node scripts/staging-migration.js --users-only

# Migrate orders only (requires users first)
node scripts/staging-migration.js --orders-only

# Full migration
node scripts/staging-migration.js
```

### Step 3: Review Staged Data

After migration, review the data:

```sql
-- Check migration summary
SELECT * FROM migration_staging.migration_summary;

-- Review product mappings
SELECT wp_product_name, suggested_toy_name, mapping_status 
FROM migration_staging.product_toy_mapping;

-- Check staged users
SELECT first_name, last_name, phone, migration_status 
FROM migration_staging.users_staging 
LIMIT 10;
```

### Step 4: Map Products to Toys

This is the most important step. You need to map each WooCommerce product to your existing toys:

```sql
-- See your existing toys
SELECT id, name, category, age_range FROM toys ORDER BY name;

-- Map products manually
UPDATE migration_staging.product_toy_mapping 
SET final_toy_id = 'toy-uuid-here',
    mapping_status = 'mapped',
    reviewer_notes = 'Verified match'
WHERE wp_product_name LIKE '%Product Name%';
```

### Step 5: Integration (Future)

Once data is reviewed and products are mapped, you can integrate the staging data into your live system. This will be implemented in a separate integration script.

## Data Mapping

### User Fields
| WooCommerce | Staging Table | Notes |
|-------------|---------------|-------|
| ID | wp_user_id | Original WP user ID |
| billing_phone | phone | Primary identifier |
| user_email | email | Email address |
| billing_first_name | first_name | First name |
| billing_last_name | last_name | Last name |
| billing_address_1 | address_line1 | Address |
| billing_city | city | City |
| billing_state | state | State |
| billing_postcode | zip_code | ZIP code |

### Order Fields
| WooCommerce | Staging Table | Notes |
|-------------|---------------|-------|
| ID | wp_order_id | Original WP order ID |
| customer_id | wp_customer_id | Links to WP user |
| total | total_amount | Order total |
| post_status | wp_status | Original status |
| billing_* | shipping_address | JSON object |

### Product Mapping
| WooCommerce | Staging Table | Target |
|-------------|---------------|--------|
| product_id | wp_product_id | toys.id |
| order_item_name | wp_product_name | toys.name |
| - | final_toy_id | Manual mapping |

## Troubleshooting

### Common Issues

1. **Phone Number Missing**: Users without phone numbers are skipped
2. **Product Mapping**: Most products will need manual mapping
3. **User References**: Orders reference users that may not exist

### SQL Queries for Debugging

```sql
-- Users without phone numbers
SELECT COUNT(*) FROM migration_staging.users_staging WHERE phone IS NULL;

-- Orders with unmapped users
SELECT COUNT(*) FROM migration_staging.orders_staging WHERE staged_user_id IS NULL;

-- Unmapped products
SELECT COUNT(*) FROM migration_staging.product_toy_mapping WHERE mapping_status = 'pending';

-- Migration statistics
SELECT 
    migration_status,
    COUNT(*) as count
FROM migration_staging.users_staging 
GROUP BY migration_status;
```

## Next Steps

1. **Create Staging Tables**: Apply the migration to create staging schema
2. **Run Test Migration**: Start with `--dry-run` to test
3. **Migrate Users**: Run users-only migration first
4. **Review Data**: Check staged data quality
5. **Map Products**: Critical step for order integration
6. **Migrate Orders**: Run orders migration
7. **Integration Planning**: Plan integration into live system

## Security Notes

- Staging tables contain sensitive customer data
- Ensure proper access controls
- Consider data retention policies
- Plan secure data disposal after integration 