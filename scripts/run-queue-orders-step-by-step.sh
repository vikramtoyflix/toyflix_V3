#!/bin/bash

# Queue Orders Step-by-Step Migration Script
# This script applies the queue_orders table migration step by step to avoid parsing issues

set -e  # Exit on any error

echo "🚀 Starting step-by-step queue_orders migration..."

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

# Start Supabase if not running
echo "🔄 Starting Supabase services..."
supabase start

# Step 1: Create the table
echo "📝 Step 1: Creating queue_orders table..."
supabase db query --file scripts/create-queue-orders-step-by-step.sql

if [ $? -eq 0 ]; then
    echo "✅ Table created successfully"
else
    echo "❌ Table creation failed"
    exit 1
fi

# Step 2: Verify table exists
echo "🔍 Step 2: Verifying table creation..."
supabase db query --sql "SELECT table_name FROM information_schema.tables WHERE table_name = 'queue_orders';"

# Step 3: Try to create functions (optional)
echo "🔧 Step 3: Creating functions (optional)..."
if [ -f "scripts/create-queue-orders-functions.sql" ]; then
    supabase db query --file scripts/create-queue-orders-functions.sql
    if [ $? -eq 0 ]; then
        echo "✅ Functions created successfully"
    else
        echo "⚠️ Functions creation failed, but table is ready"
        echo "Note: You can add order numbers manually or try creating functions later"
    fi
else
    echo "⚠️ Functions file not found, skipping function creation"
fi

# Step 4: Test basic functionality
echo "🧪 Step 4: Testing basic functionality..."
supabase db query --sql "
INSERT INTO queue_orders (
    user_id, 
    selected_toys, 
    total_amount, 
    delivery_address,
    queue_order_type,
    order_number
) VALUES (
    gen_random_uuid(),
    '[{\"id\": \"test\", \"name\": \"Test Toy\"}]'::jsonb,
    0.00,
    '{\"test\": \"address\"}'::jsonb,
    'next_cycle',
    'QU-TEST-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT
) RETURNING id, order_number;
"

if [ $? -eq 0 ]; then
    echo "✅ Basic insert test passed"
else
    echo "❌ Basic insert test failed"
    exit 1
fi

# Step 5: Clean up test data
echo "🧹 Step 5: Cleaning up test data..."
supabase db query --sql "DELETE FROM queue_orders WHERE order_number LIKE 'QU-TEST-%';"

echo ""
echo "🎉 Queue orders migration completed successfully!"
echo ""
echo "✅ What was created:"
echo "- queue_orders table with all required fields"
echo "- Indexes for performance"
echo "- RLS policies for security"
echo "- Basic permissions for authenticated users"
echo ""
echo "Next steps:"
echo "1. Update your TypeScript definitions: supabase gen types typescript --linked"
echo "2. Test queue order creation in your application"
echo "3. Add order number generation logic to your app if functions failed"
echo ""
echo "Manual order number generation example:"
echo "order_number = 'QU-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')" 