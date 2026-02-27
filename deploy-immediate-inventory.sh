#!/bin/bash
# 🚀 Deploy Immediate Inventory Deduction System
# This script deploys the immediate inventory deduction system to Supabase

set -e  # Exit on any error

echo "🚀 Deploying Immediate Inventory Deduction System..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Error: Please run this script from the toy-joy-box-club directory${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Current directory: $(pwd)${NC}"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20250115000000_immediate_inventory_deduction.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration file found${NC}"

# Show what will be deployed
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo "   • Creates immediate_inventory_deduction() function"
echo "   • Creates handle_inventory_return() function"
echo "   • Sets up triggers for rental_orders (immediate deduction)"
echo "   • Sets up triggers for queue_orders (immediate deduction)"
echo "   • Replaces old status-dependent triggers"
echo "   • Includes verification and monitoring functions"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️ Deployment cancelled${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 Applying migration...${NC}"

# Apply the migration
if supabase db push; then
    echo -e "${GREEN}✅ Migration applied successfully!${NC}"
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}💡 Try running the migration manually in Supabase SQL Editor${NC}"
    exit 1
fi

# Test the deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"

# Run verification (this will work if connected to remote DB)
echo -e "${YELLOW}📝 Run this command in Supabase SQL Editor to verify:${NC}"
echo "SELECT test_immediate_deduction();"
echo ""

echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}📊 Next Steps:${NC}"
echo "1. Verify installation: Run 'SELECT test_immediate_deduction();' in Supabase SQL Editor"
echo "2. Test with a sample order to confirm immediate deduction"
echo "3. Monitor inventory movements in the inventory_movements table"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "• Full guide: DEPLOY_IMMEDIATE_INVENTORY_SYSTEM.md"
echo "• Monitoring queries included in the guide"
echo ""
echo -e "${BLUE}🔍 Monitor with these queries:${NC}"
echo "• Recent deductions: SELECT * FROM inventory_movements WHERE movement_type = 'IMMEDIATE_DEDUCTION' ORDER BY created_at DESC LIMIT 10;"
echo "• System status: SELECT test_immediate_deduction();"
echo ""
echo -e "${GREEN}✅ Your inventory will now be deducted IMMEDIATELY when ANY order is placed!${NC}" 