#!/bin/bash

# Export Supabase Data for Azure Migration
# Run this script with: bash azure-migration/02-export-supabase-data.sh

set -e

echo "📤 Starting Supabase Data Export..."

# Load Supabase configuration
source .env 2>/dev/null || true

SUPABASE_URL=${VITE_SUPABASE_URL:-"https://wucwpyitzqjukcphczhr.supabase.co"}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in environment"
    echo "Please set it in your .env file or environment variables"
    exit 1
fi

# Create export directory
EXPORT_DIR="azure-migration/exports/$(date +%Y%m%d_%H%M%S)"
mkdir -p $EXPORT_DIR

echo "📁 Export directory: $EXPORT_DIR"

# Function to export table data
export_table() {
    local table_name=$1
    local file_name=$2
    
    echo "📦 Exporting $table_name..."
    
    curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/${table_name}?select=*" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        > "$EXPORT_DIR/${file_name}.json"
    
    local count=$(jq length "$EXPORT_DIR/${file_name}.json" 2>/dev/null || echo "0")
    echo "  ✅ Exported $count records"
}

# Function to export schema
export_schema() {
    echo "🏗️  Exporting database schema..."
    
    # Get schema information via Supabase API
    curl -s -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/get_schema_info" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        > "$EXPORT_DIR/schema_info.json" 2>/dev/null || echo "Schema export via API failed"
    
    # Copy local migration files
    cp -r supabase/migrations/* "$EXPORT_DIR/" 2>/dev/null || true
    
    echo "  ✅ Schema files copied"
}

echo ""
echo "🚀 Starting Data Export Process..."

# Export all tables
export_table "custom_users" "users"
export_table "user_sessions" "user_sessions"
export_table "toys" "toys"
export_table "toy_categories" "toy_categories"
export_table "age_bands" "age_bands"
export_table "toy_age_band" "toy_age_band"
export_table "toy_category_bridge" "toy_category_bridge"
export_table "subscriptions" "subscriptions"
export_table "user_entitlements" "user_entitlements"
export_table "orders" "orders"
export_table "order_items" "order_items"
export_table "payment_orders" "payment_orders"
export_table "billing_records" "billing_records"
export_table "admin_requests" "admin_requests"
export_table "admin_settings" "admin_settings"
export_table "reviews" "reviews"
export_table "otp_verifications" "otp_verifications"

# Export schema
export_schema

# Create data summary
echo "📊 Creating Data Summary..."
cat > "$EXPORT_DIR/export_summary.json" << EOF
{
  "export_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "supabase_url": "$SUPABASE_URL",
  "export_directory": "$EXPORT_DIR",
  "tables_exported": [
    "custom_users",
    "user_sessions", 
    "toys",
    "toy_categories",
    "age_bands",
    "toy_age_band",
    "toy_category_bridge",
    "subscriptions",
    "user_entitlements",
    "orders",
    "order_items",
    "payment_orders",
    "billing_records",
    "admin_requests",
    "admin_settings",
    "reviews",
    "otp_verifications"
  ],
  "file_sizes": {
EOF

# Add file sizes to summary
for file in "$EXPORT_DIR"/*.json; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "export_summary.json" ]; then
        filename=$(basename "$file" .json)
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        records=$(jq length "$file" 2>/dev/null || echo "0")
        echo "    \"$filename\": {\"size_bytes\": $size, \"record_count\": $records}," >> "$EXPORT_DIR/export_summary.json"
    fi
done

# Close JSON
echo "    \"export_complete\": true" >> "$EXPORT_DIR/export_summary.json"
echo "  }" >> "$EXPORT_DIR/export_summary.json"
echo "}" >> "$EXPORT_DIR/export_summary.json"

# Create verification script
cat > "$EXPORT_DIR/verify_export.sh" << 'EOF'
#!/bin/bash
echo "🔍 Verifying Export Data..."
for file in *.json; do
    if [ -f "$file" ]; then
        echo "📄 $file:"
        echo "  Records: $(jq length "$file" 2>/dev/null || echo "Invalid JSON")"
        echo "  Size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null) bytes"
    fi
done
EOF

chmod +x "$EXPORT_DIR/verify_export.sh"

echo ""
echo "✅ Supabase Data Export Complete!"
echo ""
echo "📋 Export Summary:"
echo "  📁 Directory: $EXPORT_DIR"
echo "  📊 Summary: $EXPORT_DIR/export_summary.json"
echo "  🔍 Verification: $EXPORT_DIR/verify_export.sh"
echo ""
echo "🚀 Next Steps:"
echo "  1. Verify export: bash $EXPORT_DIR/verify_export.sh"
echo "  2. Run database migration: bash azure-migration/03-migrate-database.sh"
echo ""
echo "💡 Export directory saved for rollback purposes"

# Save export path for next script
echo "EXPORT_DIR=$EXPORT_DIR" > azure-migration/config/latest-export.env 