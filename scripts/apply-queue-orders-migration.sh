#!/bin/bash

# Queue Orders Migration Script
# This script applies the queue_orders table migration using Supabase CLI

set -e  # Exit on any error

echo "🚀 Starting queue_orders table migration..."

# Check if we're in the correct directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: supabase/config.toml not found. Please run this script from the project root."
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed."
    echo "Please install it with: npm install -g supabase"
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20250103120000_create_queue_orders_table.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file found: $MIGRATION_FILE"

# Start Supabase (in case it's not running)
echo "🔄 Starting Supabase services..."
supabase start

# Apply the migration
echo "⚡ Applying queue_orders migration..."
supabase db reset --linked

# Alternative: Apply specific migration if reset doesn't work
# supabase db push --linked

echo "✅ Migration applied successfully!"

# Verify the table was created
echo "🔍 Verifying queue_orders table creation..."
supabase db query --sql "SELECT table_name FROM information_schema.tables WHERE table_name = 'queue_orders';" --format table

# Test the order number generation function
echo "🧪 Testing order number generation function..."
supabase db query --sql "SELECT generate_queue_order_number();" --format table

# Show table structure
echo "📊 Queue orders table structure:"
supabase db query --sql "\\d queue_orders" --format table

echo ""
echo "🎉 Queue orders migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Generate TypeScript definitions: supabase gen types typescript --linked > src/types/supabase.ts"
echo "2. Update your application code to use the new queue_orders table"
echo "3. Test queue order creation in your application"
echo ""
echo "Table created with the following key features:"
echo "- ✅ Automatic order number generation (QU-YYYYMMDD-XXXX format)"
echo "- ✅ Row Level Security (RLS) policies for user access"
echo "- ✅ Proper indexes for performance"
echo "- ✅ Automatic timestamp management"
echo "- ✅ Queue order type validation"
echo "- ✅ Payment status tracking"
echo "- ✅ JSONB fields for flexible data storage" 