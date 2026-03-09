#!/usr/bin/env node

/**
 * Script to run the queue_orders table migration
 * This applies the SQL migration to create the queue_orders table and related functions
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL.includes('your-') || SUPABASE_SERVICE_KEY.includes('your-')) {
  console.error('❌ Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting queue_orders table migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250103120000_create_queue_orders_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');

    // Execute the migration
    console.log('⚡ Executing migration SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log('✅ Migration executed successfully!');
    
    // Verify table creation
    console.log('🔍 Verifying queue_orders table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('queue_orders')
      .select('count(*)')
      .limit(1);

    if (tableError) {
      console.warn('⚠️ Table verification failed:', tableError.message);
      console.log('Note: This might be expected if RLS policies prevent direct access');
    } else {
      console.log('✅ queue_orders table is accessible');
    }

    // Test order number generation
    console.log('🧪 Testing order number generation...');
    const { data: orderNumber, error: orderError } = await supabase
      .rpc('generate_queue_order_number');

    if (orderError) {
      console.warn('⚠️ Order number generation test failed:', orderError.message);
    } else {
      console.log('✅ Order number generation works:', orderNumber);
    }

    console.log('\n🎉 Queue orders migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your Supabase TypeScript definitions');
    console.log('2. Test queue order creation in your application');
    console.log('3. Verify RLS policies are working correctly');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Starting queue_orders table migration (direct SQL)...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250103120000_create_queue_orders_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded successfully');

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`⚡ Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        }
      } catch (stmtError) {
        console.error(`Statement ${i + 1} error:`, stmtError.message);
        // Continue with other statements
      }
    }

    console.log('✅ Migration statements executed!');

  } catch (error) {
    console.error('❌ Direct migration failed:', error.message);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Queue Orders Migration Script

Usage:
  node run-queue-orders-migration.js [options]

Options:
  --direct    Use direct SQL execution method
  --help, -h  Show this help message

Environment Variables:
  VITE_SUPABASE_URL           Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY   Supabase service role key

Examples:
  node run-queue-orders-migration.js
  node run-queue-orders-migration.js --direct
`);
    process.exit(0);
  }

  if (args.includes('--direct')) {
    runMigrationDirect();
  } else {
    runMigration();
  }
}

module.exports = { runMigration, runMigrationDirect }; 