#!/bin/bash

# =========================================================
# Migrate Rental Orders to Pickup System
# =========================================================
# This script migrates your existing rental orders to the
# pickup system tables so the dashboard can display them

echo "🚀 Toyflix Pickup System Migration"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/migrate-rentals-to-pickup-system.js" ]; then
    echo "❌ Error: Please run this script from the toy-joy-box-club directory"
    echo "💡 Run: cd toy-joy-box-club && ./run-pickup-migration.sh"
    exit 1
fi

echo "📊 About to migrate your rental orders to pickup system tables:"
echo "   • scheduled_pickups"
echo "   • pickup_routes" 
echo "   • pincode_pickup_schedule"
echo "   • pickup_system_config"
echo ""

read -p "🤔 Do you want to continue? (y/N): " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Running pickup system migration..."
echo ""

# Run the Node.js migration script
node scripts/migrate-rentals-to-pickup-system.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Migration completed successfully!"
    echo "📊 Your pickup dashboard should now show data"
    echo "🔄 Refresh your browser to see the updated dashboard"
    echo ""
    echo "🌐 Pickup Dashboard URL: http://localhost:8081/admin (Select Pickup Dashboard)"
else
    echo ""
    echo "❌ Migration failed!"
    echo "💡 Check the error messages above for troubleshooting"
    exit 1
fi 