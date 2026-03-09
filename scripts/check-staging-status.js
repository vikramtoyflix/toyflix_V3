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

async function executeSQL(sql, params = []) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sql,
      params: params 
    });
    
    if (error) {
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function checkStagingStatus() {
  console.log('🔍 Checking staging tables status...\n');

  try {
    // Check if staging schema exists
    const { data: schemas } = await executeSQL(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'migration_staging'
    `);

    if (!schemas || schemas.length === 0) {
      console.log('❌ migration_staging schema does not exist');
      return;
    }

    console.log('✅ migration_staging schema exists\n');

    // Check tables and their counts
    const tables = [
      'users_staging',
      'orders_staging', 
      'order_items_staging',
      'subscriptions_staging',
      'payments_staging',
      'product_toy_mapping',
      'migration_batches'
    ];

    for (const table of tables) {
      try {
        const { data: count } = await executeSQL(`
          SELECT COUNT(*) as count FROM migration_staging.${table}
        `);
        
        console.log(`📊 ${table}: ${count?.[0]?.count || 0} records`);
      } catch (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      }
    }

    console.log('\n📈 Migration Batches:');
    const { data: batches } = await executeSQL(`
      SELECT batch_name, migration_type, status, total_records, successful_records, failed_records, start_time
      FROM migration_staging.migration_batches 
      ORDER BY start_time DESC 
      LIMIT 5
    `);

    if (batches && batches.length > 0) {
      batches.forEach(batch => {
        console.log(`  • ${batch.batch_name} (${batch.migration_type}): ${batch.status} - ${batch.successful_records}/${batch.total_records} success`);
      });
    } else {
      console.log('  No migration batches found');
    }

    console.log('\n🗺️ Product Mapping Status:');
    const { data: mappingStats } = await executeSQL(`
      SELECT mapping_status, COUNT(*) as count
      FROM migration_staging.product_toy_mapping 
      GROUP BY mapping_status
      ORDER BY count DESC
    `);

    if (mappingStats && mappingStats.length > 0) {
      mappingStats.forEach(stat => {
        console.log(`  • ${stat.mapping_status}: ${stat.count} products`);
      });
    } else {
      console.log('  No product mappings found');
    }

    console.log('\n🔍 Sample Data:');
    
    // Show sample users
    const { data: sampleUsers } = await executeSQL(`
      SELECT first_name, last_name, phone, migration_status, created_at
      FROM migration_staging.users_staging 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (sampleUsers && sampleUsers.length > 0) {
      console.log('👥 Recent Users:');
      sampleUsers.forEach(user => {
        console.log(`  • ${user.first_name} ${user.last_name} (${user.phone}) - ${user.migration_status}`);
      });
    }

    // Show sample orders
    const { data: sampleOrders } = await executeSQL(`
      SELECT wp_order_id, total_amount, status, migration_status, created_at
      FROM migration_staging.orders_staging 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (sampleOrders && sampleOrders.length > 0) {
      console.log('\n📦 Recent Orders:');
      sampleOrders.forEach(order => {
        console.log(`  • Order #${order.wp_order_id}: ₹${order.total_amount} - ${order.status} (${order.migration_status})`);
      });
    }

    // Show sample product mappings
    const { data: sampleMappings } = await executeSQL(`
      SELECT wp_product_name, suggested_toy_name, mapping_status, mapping_confidence
      FROM migration_staging.product_toy_mapping 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (sampleMappings && sampleMappings.length > 0) {
      console.log('\n🧸 Product Mappings:');
      sampleMappings.forEach(mapping => {
        console.log(`  • ${mapping.wp_product_name} → ${mapping.suggested_toy_name || 'unmapped'} (${mapping.mapping_status})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking staging status:', error.message);
  }
}

checkStagingStatus(); 