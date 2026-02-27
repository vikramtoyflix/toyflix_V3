# WooCommerce to Supabase Migration Guide

This guide walks you through migrating your WooCommerce users and orders to your new Supabase-powered Toyflix website.

## 🎯 Overview

The migration process involves:
1. **WordPress Plugin**: Exposes WooCommerce data via REST API
2. **Node.js Script**: Fetches data from WordPress and inserts into Supabase
3. **Data Mapping**: Transforms WooCommerce schema to Supabase schema

## 📋 Prerequisites

- Access to WordPress admin panel (https://toyflix.in/wp-admin)
- Node.js installed on your machine
- Supabase service role key
- WordPress admin credentials

## 🔧 Setup Instructions

### Step 1: Install WordPress Plugin

1. Upload `wordpress-migration-plugin/toyflix-migration-api.php` to your WordPress site:
   ```
   /wp-content/plugins/toyflix-migration-api/toyflix-migration-api.php
   ```

2. Activate the plugin in WordPress Admin:
   - Go to **Plugins > Installed Plugins**
   - Find "Toyflix Migration API"
   - Click **Activate**

3. Verify installation:
   - Go to **Settings > Migration API**
   - Test the API endpoints

### Step 2: Create WordPress Application Password

1. In WordPress Admin, go to **Users > Your Profile**
2. Scroll to **Application Passwords**
3. Add new password:
   - Name: "Migration Script"
   - Click **Add New Application Password**
4. **Save the generated password** - you'll need it for the migration script

### Step 3: Get Supabase Service Key

1. Go to your Supabase Dashboard
2. Navigate to **Settings > API**
3. Copy the **service_role** key (not the anon key)
4. **Keep this secure** - it has admin access to your database

### Step 4: Install Migration Dependencies

```bash
# Install Node.js dependencies for migration
npm install axios @supabase/supabase-js uuid

# Or use the provided package.json
cp package-migration.json package.json
npm install
```

### Step 5: Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export SUPABASE_SERVICE_KEY="your_supabase_service_key_here"
export WP_USERNAME="your_wordpress_admin_username"
export WP_APP_PASSWORD="your_wordpress_application_password"
```

## 🧪 Testing Connections

Before running the migration, test your connections:

```bash
node scripts/test-migration-connection.js
```

This will verify:
- ✅ WordPress API accessibility
- ✅ Supabase database connectivity
- ✅ Authentication credentials
- ✅ Required tables exist

## 🚀 Running the Migration

### Dry Run (Recommended First)

Test the migration without inserting data:

```bash
node scripts/woocommerce-migration.js --dry-run
```

This will:
- Fetch all data from WordPress
- Transform it for Supabase
- Show you what would be migrated
- **No data will be inserted**

### Users Only Migration

Migrate only users first:

```bash
node scripts/woocommerce-migration.js --users-only
```

### Orders Only Migration

Migrate orders (requires users to be migrated first):

```bash
node scripts/woocommerce-migration.js --orders-only
```

### Subscriptions Only Migration

Migrate subscriptions (requires users to be migrated first):

```bash
node scripts/woocommerce-migration.js --subscriptions-only
```

### Combined Migration (Recommended)

Migrate users, orders, and subscriptions together:

```bash
node scripts/woocommerce-migration.js --combined
```

### Full Migration (Legacy)

Migrate users, orders, and subscriptions separately:

```bash
node scripts/woocommerce-migration.js
```

## 📊 Data Mapping

### Users Migration

| WooCommerce Field | Supabase Field | Notes |
|------------------|----------------|-------|
| `ID` | `id` (UUID) | New UUID generated |
| `billing_phone` | `phone` | Primary identifier |
| `user_email` | `email` | |
| `billing_first_name` | `first_name` | |
| `billing_last_name` | `last_name` | |
| `billing_address_1` | `address_line1` | |
| `billing_address_2` | `address_line2` | |
| `billing_city` | `city` | |
| `billing_state` | `state` | |
| `billing_postcode` | `zip_code` | |
| `user_registered` | `created_at` | |

### Orders Migration

| WooCommerce Field | Supabase Field | Notes |
|------------------|----------------|-------|
| `ID` | `id` (UUID) | New UUID generated |
| `customer_id` | `user_id` | Mapped via user migration |
| `total` | `total_amount` | |
| `post_status` | `status` | Mapped to enum values |
| Billing fields | `shipping_address` | JSON object |
| `post_date` | `created_at` | |

### Subscriptions Migration

| WooCommerce Field | Supabase Field | Notes |
|------------------|----------------|-------|
| `ID` | `id` (UUID) | New UUID generated |
| `customer_id` | `user_id` | Mapped via user migration |
| `billing_period` | `plan_type` | Mapped to monthly/quarterly |
| `post_status` | `status` | Mapped to enum values |
| `recurring_amount` | `total_amount` | |
| `schedule_start` | `start_date` | |
| `schedule_end` | `end_date` | |
| `schedule_next_payment` | `next_billing_date` | |
| `billing_interval` | `billing_cycle` | Number of months |

### Status Mapping

| WooCommerce Status | Supabase Status |
|-------------------|-----------------|
| `wc-pending` | `pending` |
| `wc-processing` | `pending` |
| `wc-completed` | `delivered` |
| `wc-cancelled` | `cancelled` |
| `wc-refunded` | `cancelled` |
| `wc-failed` | `cancelled` |

### Subscription Status Mapping

| WooCommerce Status | Supabase Status |
|-------------------|-----------------|
| `wc-active` | `active` |
| `wc-cancelled` | `cancelled` |
| `wc-expired` | `expired` |
| `wc-on-hold` | `paused` |
| `wc-pending` | `pending` |
| `wc-pending-cancel` | `cancelled` |

## ⚠️ Important Notes

### Phone Number Requirement
- Users without phone numbers will be **skipped**
- Phone is the primary identifier in your new system
- Check migration logs for skipped users

### Password Reset Required
- WordPress password hashes are incompatible with Supabase
- All migrated users will need to reset their passwords
- Consider sending password reset emails post-migration

### Order Items
- WooCommerce products need to be mapped to your Supabase toys
- Order items will have `toy_id` as `null` initially
- You'll need to create a separate mapping script

## 📝 Migration Logs

The script generates detailed logs:
- `migration-log-{timestamp}.json` - Complete migration log
- Console output with emojis for easy reading
- Error details for troubleshooting

## 🔍 Troubleshooting

### Common Issues

**WordPress API 404 Error**
```
Solution: Ensure the migration plugin is installed and activated
```

**WordPress API 401 Error**
```
Solution: Check your WordPress credentials and application password
```

**Supabase Permission Denied**
```
Solution: Verify you're using the service_role key, not anon key
```

**Users Skipped (No Phone)**
```
Solution: Update WooCommerce users to include phone numbers
```

### Debugging Steps

1. **Test connections first**:
   ```bash
   node scripts/test-migration-connection.js
   ```

2. **Run dry run**:
   ```bash
   node scripts/woocommerce-migration.js --dry-run
   ```

3. **Check WordPress API directly**:
   Visit: `https://toyflix.in/wp-json/migration/v1/users?per_page=5`

4. **Verify Supabase tables**:
   Check your Supabase dashboard for table structure

## 📈 Post-Migration Tasks

### 1. Verify Data
- Check user counts match
- Verify order totals
- Test user authentication

### 2. Update Subscription Status
- Run queries to activate subscriptions for delivered orders
- Update subscription plans based on order history

### 3. Map Products to Toys
- Create mapping between WooCommerce product IDs and Supabase toy IDs
- Update order items with correct toy references

### 4. Send Password Reset Emails
- Use Supabase Auth to send password reset emails
- Or create a custom notification system

### 5. Update User Verification Status
- Consider marking migrated users as unverified
- Require phone verification on first login

## 🔒 Security Considerations

- **Service Key**: Never commit to version control
- **Application Password**: Revoke after migration
- **Backup**: Take database backups before migration
- **Test Environment**: Run migration on staging first

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review migration logs
3. Test connections independently
4. Verify WordPress plugin installation

## 🎉 Success Checklist

- [ ] WordPress plugin installed and activated
- [ ] Environment variables configured
- [ ] Connection test passes
- [ ] Dry run completes successfully
- [ ] Users migrated without errors
- [ ] Orders migrated and linked to users
- [ ] Migration logs reviewed
- [ ] Post-migration verification complete

---

**Migration Status**: Ready for implementation
**Estimated Time**: 30-60 minutes depending on data size
**Rollback Plan**: Restore from Supabase backup if needed 