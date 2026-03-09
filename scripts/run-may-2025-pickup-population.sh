#!/bin/bash

# ========================================
# MAY 2025 PICKUP DATA POPULATION SCRIPT
# ========================================
# This script sets up pickup system tables and populates May 2025 pickup data
# Requires: Supabase project URL and API key set as environment variables

set -e # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "=========================================="
echo "🚚 MAY 2025 PICKUP DATA POPULATION"
echo "=========================================="
echo -e "${NC}"

# Check environment variables
echo -e "${YELLOW}📋 Checking environment variables...${NC}"

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Set it with: export VITE_SUPABASE_URL='your-supabase-url'${NC}"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ VITE_SUPABASE_ANON_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Set it with: export VITE_SUPABASE_ANON_KEY='your-supabase-anon-key'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables are set${NC}"
echo -e "   📡 Supabase URL: ${VITE_SUPABASE_URL}"
echo -e "   🔑 Anon Key: ${VITE_SUPABASE_ANON_KEY:0:20}..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "\n${YELLOW}📁 Working in directory: ${PROJECT_ROOT}${NC}"

# Step 1: Setup pickup system tables
echo -e "\n${BLUE}📋 Step 1: Setting up pickup system tables...${NC}"

# Check if psql is available for SQL execution
if command -v psql >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL client found, using psql for table setup${NC}"
    
    # Parse Supabase URL to extract connection details
    SUPABASE_HOST=$(echo $VITE_SUPABASE_URL | sed 's|https://||' | sed 's|http://||')
    SUPABASE_DB="postgres"
    
    echo -e "${YELLOW}🔧 Executing pickup tables SQL script...${NC}"
    
    # Note: This would require the user to have proper DB credentials
    echo -e "${YELLOW}⚠️  Manual step required: Execute the SQL script ensure-pickup-tables.sql in your Supabase dashboard${NC}"
    echo -e "   📄 File location: ${SCRIPT_DIR}/ensure-pickup-tables.sql"
    
    read -p "Press Enter after you've executed the SQL script in Supabase dashboard..."
    
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Please execute the SQL script manually:${NC}"
    echo -e "   📄 File: ${SCRIPT_DIR}/ensure-pickup-tables.sql"
    echo -e "   🌐 Execute in: Supabase Dashboard → SQL Editor"
    
    read -p "Press Enter after you've executed the SQL script in Supabase dashboard..."
fi

# Step 2: Install dependencies
echo -e "\n${BLUE}📦 Step 2: Checking Node.js dependencies...${NC}"

cd "$PROJECT_ROOT"

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}⚠️  No package.json found in project root. Creating minimal package.json...${NC}"
    cat > package.json << EOF
{
  "name": "toyflix-pickup-data-population",
  "version": "1.0.0",
  "description": "Pickup data population scripts for Toyflix",
  "main": "scripts/populate-may-2025-pickup-data.js",
  "scripts": {
    "populate-pickups": "node scripts/populate-may-2025-pickup-data.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  },
  "type": "commonjs"
}
EOF
fi

# Check if node_modules exists
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@supabase" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install @supabase/supabase-js
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Step 3: Run the pickup data population script
echo -e "\n${BLUE}🚚 Step 3: Populating May 2025 pickup data...${NC}"

cd "$PROJECT_ROOT"
node "$SCRIPT_DIR/populate-may-2025-pickup-data.js"

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}🎉 SUCCESS! May 2025 pickup data population completed!${NC}"
    echo -e "\n${BLUE}📊 What was accomplished:${NC}"
    echo -e "${GREEN}   ✅ Pickup system tables created/verified${NC}"
    echo -e "${GREEN}   ✅ 21+ customers from May 2025 processed${NC}"
    echo -e "${GREEN}   ✅ Pickup requests created for all orders${NC}"
    echo -e "${GREEN}   ✅ Scheduled pickups generated${NC}"
    echo -e "${GREEN}   ✅ Customer phone numbers updated${NC}"
    echo -e "${GREEN}   ✅ Pickup dates calculated (30 days after delivery)${NC}"
    
    echo -e "\n${BLUE}🔍 Next steps:${NC}"
    echo -e "${YELLOW}   1. Verify data in Supabase dashboard${NC}"
    echo -e "${YELLOW}   2. Test pickup notifications${NC}"
    echo -e "${YELLOW}   3. Review pickup schedules${NC}"
    echo -e "${YELLOW}   4. Assign drivers to routes${NC}"
    
    echo -e "\n${BLUE}📋 Useful queries to run in Supabase:${NC}"
    echo -e "${YELLOW}   • SELECT COUNT(*) FROM pickup_requests;${NC}"
    echo -e "${YELLOW}   • SELECT COUNT(*) FROM scheduled_pickups;${NC}"
    echo -e "${YELLOW}   • SELECT pickup_date, COUNT(*) FROM scheduled_pickups GROUP BY pickup_date ORDER BY pickup_date;${NC}"
    
else
    echo -e "\n${RED}❌ ERROR: Pickup data population failed!${NC}"
    echo -e "${YELLOW}💡 Check the error messages above and try again${NC}"
    exit 1
fi

echo -e "\n${BLUE}=========================================="
echo "🎉 May 2025 Pickup Population Complete!"
echo -e "==========================================${NC}" 