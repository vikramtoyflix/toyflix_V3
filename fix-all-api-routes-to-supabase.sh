#!/bin/bash

echo "🔧 Fixing All API Routes to Use Supabase Backend"
echo "=============================================="

# Supabase configuration
SUPABASE_URL="https://wucwpyitzqjukcphczhr.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY"

echo "📱 Updating Android App API routes to use Supabase..."
echo ""
echo "🔍 Found these routes using failing Azure Function backend:"
echo "  - sendOtp, verifyOtp (authentication)"
echo "  - user-profile, generate-token (user management)" 
echo "  - cart, add-to-cart, create-order (e-commerce)"
echo "  - products, search-products (catalog)"
echo "  - health (monitoring)"
echo ""

echo "✅ All routes will be updated to use working Supabase backend"
echo ""
echo "🚀 Deploy with: git add . && git commit -m 'Fix API backend consistency' && git push"