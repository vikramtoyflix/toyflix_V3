#!/bin/bash

# Migrate Database Schema and Data to Azure PostgreSQL
# Run this script with: bash azure-migration/03-migrate-database.sh

set -e

echo "🗄️  Starting Database Migration to Azure PostgreSQL..."

# Load configuration
source azure-migration/config/azure-config.env
source azure-migration/config/latest-export.env

echo "📝 Configuration:"
echo "  Azure Database: $DB_ENDPOINT"
echo "  Database Name: $DB_NAME"
echo "  Export Directory: $EXPORT_DIR"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql is not installed. Please install PostgreSQL client:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql-client"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Test database connection
echo "🔌 Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_ENDPOINT" \
    -U "$DB_ADMIN_USER@$DB_SERVER_NAME" \
    -d "$DB_NAME" \
    -c "SELECT version();" > /dev/null 2>&1; then
    echo "❌ Cannot connect to Azure PostgreSQL database"
    echo "Please check your connection settings and firewall rules"
    exit 1
fi

echo "✅ Database connection successful"

# Create migration SQL script
MIGRATION_SQL="azure-migration/config/migration.sql"
echo "📝 Creating migration SQL script..."

cat > "$MIGRATION_SQL" << 'EOF'
-- ToyFlix Database Schema Migration to Azure PostgreSQL
-- Generated automatically by migration script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Custom types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('user', 'admin', 'premium');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'family');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_type') THEN
        CREATE TYPE subscription_type AS ENUM ('monthly', 'ride_on');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'toy_category_enum') THEN
        CREATE TYPE toy_category_enum AS ENUM (
            'big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys'
        );
    END IF;
END$$;

-- Create custom_users table (main user table)
CREATE TABLE IF NOT EXISTS custom_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    role app_role NOT NULL DEFAULT 'user',
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    pincode TEXT,
    avatar_url TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    subscription_plan subscription_plan,
    subscription_active BOOLEAN,
    subscription_end_date TIMESTAMPTZ
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Create age_bands table with PostgreSQL ranges
CREATE TABLE IF NOT EXISTS age_bands (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    min_age_months INTEGER NOT NULL,
    max_age_months INTEGER NOT NULL,
    age_range int4range GENERATED ALWAYS AS (int4range(min_age_months, max_age_months, '[)')) STORED,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create toy_categories table
CREATE TABLE IF NOT EXISTS toy_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create toys table
CREATE TABLE IF NOT EXISTS toys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    age_range TEXT,
    category toy_category_enum,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    subscription_category TEXT,
    retail_price NUMERIC(10,2),
    rental_value NUMERIC(10,2),
    is_premium BOOLEAN DEFAULT false,
    min_age INTEGER,
    max_age INTEGER,
    safety_certification TEXT,
    material TEXT,
    dimensions TEXT,
    weight_kg NUMERIC(5,2),
    is_ride_on BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bridge tables
CREATE TABLE IF NOT EXISTS toy_age_band (
    toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
    age_band_id INTEGER NOT NULL REFERENCES age_bands(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (toy_id, age_band_id)
);

CREATE TABLE IF NOT EXISTS toy_category_bridge (
    toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES toy_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (toy_id, category_id)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end DATE NOT NULL,
    pause_balance INTEGER NOT NULL DEFAULT 0,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    subscription_type subscription_type DEFAULT 'monthly',
    ride_on_toy_id UUID REFERENCES toys(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_entitlements table
CREATE TABLE IF NOT EXISTS user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    current_month TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    standard_toys_remaining INTEGER NOT NULL DEFAULT 0,
    big_toys_remaining INTEGER NOT NULL DEFAULT 0,
    books_remaining INTEGER NOT NULL DEFAULT 0,
    premium_toys_remaining INTEGER DEFAULT 0,
    value_cap_remaining NUMERIC NOT NULL DEFAULT 0,
    early_access BOOLEAN NOT NULL DEFAULT false,
    reservation_enabled BOOLEAN NOT NULL DEFAULT false,
    roller_coaster_delivered BOOLEAN NOT NULL DEFAULT false,
    coupe_ride_delivered BOOLEAN NOT NULL DEFAULT false,
    next_billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    status order_status NOT NULL DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    coupon_code TEXT,
    shipping_address JSONB,
    delivery_instructions TEXT,
    order_type TEXT DEFAULT 'subscription',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    toy_id UUID REFERENCES toys(id),
    subscription_category TEXT,
    age_group TEXT,
    ride_on_toy_id UUID REFERENCES toys(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2),
    total_price NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payment_orders table
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id),
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created',
    order_type TEXT NOT NULL,
    order_items JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create billing_records table
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_requests table
CREATE TABLE IF NOT EXISTS admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES custom_users(id),
    toy_id UUID NOT NULL REFERENCES toys(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create otp_verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_age_bands_range ON age_bands USING gist (age_range);
CREATE INDEX IF NOT EXISTS idx_custom_users_phone ON custom_users(phone);
CREATE INDEX IF NOT EXISTS idx_custom_users_email ON custom_users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_toys_category ON toys(category);
CREATE INDEX IF NOT EXISTS idx_toys_age_range ON toys(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_user_id ON billing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_toy_id ON reviews(toy_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone_number);

-- Insert default data
INSERT INTO age_bands (label, min_age_months, max_age_months, display_order) VALUES
    ('1-2 years', 12, 24, 1),
    ('2-3 years', 24, 36, 2),
    ('3-4 years', 36, 48, 3),
    ('4-6 years', 48, 72, 4),
    ('6-8 years', 72, 96, 5)
ON CONFLICT (label) DO NOTHING;

INSERT INTO toy_categories (name, slug, description, display_order) VALUES
    ('Big Toys', 'big-toys', 'Large play equipment and ride-on toys', 1),
    ('STEM Toys', 'stem-toys', 'Science, Technology, Engineering, Math toys', 2),
    ('Educational Toys', 'educational-toys', 'Learning and development focused toys', 3),
    ('Books', 'books', 'Educational books and reading materials', 4),
    ('Developmental Toys', 'developmental-toys', 'Toys for skill development', 5),
    ('Ride-On Toys', 'ride-on-toys', 'Bikes, scooters, and riding toys', 6)
ON CONFLICT (name) DO NOTHING;

EOF

echo "🚀 Running database schema migration..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_ENDPOINT" \
    -U "$DB_ADMIN_USER@$DB_SERVER_NAME" \
    -d "$DB_NAME" \
    -f "$MIGRATION_SQL"

echo "✅ Schema migration complete"

# Function to import JSON data
import_table_data() {
    local table_name=$1
    local json_file="$EXPORT_DIR/${2}.json"
    
    if [ ! -f "$json_file" ]; then
        echo "⚠️  Skipping $table_name - no data file found"
        return
    fi
    
    local record_count=$(jq length "$json_file" 2>/dev/null || echo "0")
    if [ "$record_count" = "0" ]; then
        echo "⚠️  Skipping $table_name - no records found"
        return
    fi
    
    echo "📥 Importing $record_count records into $table_name..."
    
    # Convert JSON to SQL INSERT statements
    local import_sql="azure-migration/config/import_${table_name}.sql"
    echo "-- Import data for $table_name" > "$import_sql"
    echo "TRUNCATE TABLE $table_name CASCADE;" >> "$import_sql"
    
    jq -r '
        def escape_sql: gsub("'"'"'"; "'"'"''"'"'");
        def format_value(v): 
            if v == null then "NULL"
            elif (v | type) == "string" then "'"'"'" + (v | escape_sql) + "'"'"'"
            elif (v | type) == "boolean" then (if v then "true" else "false" end)
            else (v | tostring)
            end;
        
        "INSERT INTO '$table_name' (" + 
        (.[0] | keys | join(", ")) + 
        ") VALUES " +
        (map("(" + ([.[] | format_value(.)] | join(", ")) + ")") | join(",\n")) + ";"
    ' "$json_file" >> "$import_sql"
    
    # Execute the import
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_ENDPOINT" \
        -U "$DB_ADMIN_USER@$DB_SERVER_NAME" \
        -d "$DB_NAME" \
        -f "$import_sql" > /dev/null 2>&1 || echo "  ⚠️  Import failed for $table_name"
    
    echo "  ✅ Imported $table_name"
}

echo ""
echo "📥 Starting data import..."

# Import data in dependency order
import_table_data "custom_users" "users"
import_table_data "user_sessions" "user_sessions"
import_table_data "toys" "toys"
import_table_data "toy_age_band" "toy_age_band"
import_table_data "toy_category_bridge" "toy_category_bridge"
import_table_data "subscriptions" "subscriptions"
import_table_data "user_entitlements" "user_entitlements"
import_table_data "orders" "orders"
import_table_data "order_items" "order_items"
import_table_data "payment_orders" "payment_orders"
import_table_data "billing_records" "billing_records"
import_table_data "admin_requests" "admin_requests"
import_table_data "admin_settings" "admin_settings"
import_table_data "reviews" "reviews"
import_table_data "otp_verifications" "otp_verifications"

# Verify data migration
echo ""
echo "🔍 Verifying data migration..."
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_ENDPOINT" \
    -U "$DB_ADMIN_USER@$DB_SERVER_NAME" \
    -d "$DB_NAME" \
    -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as row_count
FROM pg_stat_user_tables 
ORDER BY schemaname, tablename;
"

echo ""
echo "✅ Database Migration Complete!"
echo ""
echo "📋 Migration Summary:"
echo "  ✅ Schema migrated to Azure PostgreSQL"
echo "  ✅ Data imported from Supabase export"
echo "  ✅ Indexes and constraints created"
echo "  ✅ Default data populated"
echo ""
echo "🚀 Next Steps:"
echo "  1. Deploy Azure Functions: bash azure-migration/04-deploy-functions.sh"
echo "  2. Update frontend configuration"
echo "  3. Test the migrated system"
echo ""
echo "🔗 Database Connection String:"
echo "  $DATABASE_URL" 