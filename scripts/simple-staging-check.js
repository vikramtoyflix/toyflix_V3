import { createClient } from '@supabase/supabase-js';
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

async function simpleStagingCheck() {
  console.log('🔍 Checking staging tables (simple method)...\n');

  try {
    // Test if we can query the staging schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'migration_staging');

    if (error) {
      console.log('❌ Cannot access information_schema.tables:', error.message);
      console.log('\n💡 This might mean:');
      console.log('   1. The staging tables don\'t exist yet');
      console.log('   2. There\'s a permissions issue');
      console.log('   3. The schema hasn\'t been created');
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Staging tables found:');
      data.forEach(table => {
        console.log(`   • ${table.table_name}`);
      });

      // Try to count records in users_staging
      const { data: userCount, error: userError } = await supabase
        .from('migration_staging.users_staging')
        .select('*', { count: 'exact', head: true });

      if (!userError) {
        console.log(`\n📊 Users in staging: ${userCount?.length || 0}`);
      }

      // Try to count records in product_toy_mapping
      const { data: mappingCount, error: mappingError } = await supabase
        .from('migration_staging.product_toy_mapping')
        .select('*', { count: 'exact', head: true });

      if (!mappingError) {
        console.log(`📊 Product mappings: ${mappingCount?.length || 0}`);
      }

    } else {
      console.log('❌ No staging tables found');
      console.log('\n📋 Next steps:');
      console.log('   1. Copy the content from scripts/staging-tables-step-by-step.sql');
      console.log('   2. Paste it into your Supabase SQL Editor');
      console.log('   3. Run the SQL to create staging tables');
    }

  } catch (error) {
    console.error('❌ Error checking staging tables:', error.message);
    console.log('\n💡 Try running the SQL manually in Supabase Dashboard:');
    console.log('   Copy scripts/staging-tables-step-by-step.sql to SQL Editor');
  }
}

simpleStagingCheck(); 