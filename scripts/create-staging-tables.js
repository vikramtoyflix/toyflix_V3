import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createStagingTables() {
  console.log('🚀 Creating staging tables...');

  try {
    // Read the migration file
    const migrationSQL = readFileSync('supabase/migrations/20250102000000_create_migration_staging_tables.sql', 'utf8');
    
    console.log('📝 Loaded migration SQL file');

    // Execute the entire migration as one query
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Error executing migration:', error.message);
      
      // If it's a "already exists" error, that's okay
      if (error.message.includes('already exists')) {
        console.log('⚠️ Some objects already exist, continuing...');
      } else {
        process.exit(1);
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Test if the schema was created
    console.log('🔍 Verifying staging schema...');
    
    const { data: schemas, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'migration_staging'"
    });

    if (schemaError) {
      console.log('⚠️ Could not verify schema creation:', schemaError.message);
    } else if (schemas && schemas.length > 0) {
      console.log('✅ migration_staging schema created successfully!');
      
      // Test table creation
      const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'migration_staging'
          ORDER BY table_name
        `
      });

      if (tables && tables.length > 0) {
        console.log(`✅ Created ${tables.length} staging tables:`);
        tables.forEach(table => {
          console.log(`   • ${table.table_name}`);
        });
      }
    } else {
      console.log('⚠️ migration_staging schema not found - migration may have failed');
    }

    console.log('\n🎉 Staging tables setup completed!');
    console.log('Next steps:');
    console.log('1. Run: node scripts/check-staging-status.js');
    console.log('2. Run: node scripts/staging-migration.js --dry-run');
    console.log('3. Run: node scripts/staging-migration.js --users-only');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

createStagingTables(); 