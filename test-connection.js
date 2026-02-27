#!/usr/bin/env node

/**
 * Simple connection test for Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.Gp5Ui_5bHVDcMNKANfFIuGUhN-lKLIVnJH7xoKhqzek'
);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test basic connection
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    console.log('✅ Connection successful!');
    console.log(`📦 Found ${ordersCount || 0} orders in database`);
    
    // Test rental_orders table
    const { count: rentalCount } = await supabase
      .from('rental_orders')
      .select('*', { count: 'exact', head: true });
    
    console.log(`🏠 Found ${rentalCount || 0} rental orders in database`);
    
    console.log('\n🎉 Database connection test successful!');
    console.log('✅ Ready to run migration scripts');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection().catch(console.error); 