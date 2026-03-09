#!/usr/bin/env node

/**
 * Migrate Existing Rental Orders to Pickup System
 * 
 * This script migrates existing rental_orders data to the pickup system tables
 * (scheduled_pickups, pickup_routes, pincode_pickup_schedule, pickup_system_config)
 * so the pickup dashboard can display the data properly.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase configuration
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the SQL migration file
const sqlFilePath = path.join(process.cwd(), 'scripts', 'migrate-rentals-to-pickup-system.sql');

async function runMigration() {
  console.log('🚀 Starting Pickup System Migration...\n');
  
  try {
    // Check if SQL file exists
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    // Read the SQL migration script
    console.log('📄 Reading migration SQL script...');
    const migrationSQL = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('✅ SQL script loaded successfully');
    console.log(`📊 Script size: ${migrationSQL.length} characters\n`);

    // Execute the migration
    console.log('🔄 Executing pickup system migration...');
    console.log('⏳ This may take a few moments...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify the migration results
    console.log('🔍 Verifying migration results...\n');
    
    const verificationQueries = [
      { name: 'Scheduled Pickups', table: 'scheduled_pickups' },
      { name: 'Pickup Routes', table: 'pickup_routes' },
      { name: 'Pincode Schedules', table: 'pincode_pickup_schedule' },
      { name: 'System Config', table: 'pickup_system_config' }
    ];

    for (const query of verificationQueries) {
      try {
        const { count, error: countError } = await supabase
          .from(query.table)
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.log(`❌ Error checking ${query.name}: ${countError.message}`);
        } else {
          console.log(`✅ ${query.name}: ${count} records`);
        }
      } catch (err) {
        console.log(`⚠️ Could not verify ${query.name}: ${err.message}`);
      }
    }

    console.log('\n🎉 Pickup System Migration Completed Successfully!');
    console.log('📊 The pickup dashboard should now display your rental data.');
    console.log('🔄 Refresh your browser to see the updated pickup dashboard.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('1. Make sure you have the correct Supabase permissions');
    console.error('2. Check that all required tables exist');
    console.error('3. Verify your rental_orders table has data');
    console.error('4. Run the pickup system schema migration first if needed\n');
    process.exit(1);
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration }; 