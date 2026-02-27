import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function debugDatabase() {
    console.log('🔍 Debugging database structure...');
    
    try {
        // Check what schemas exist
        console.log('\n📂 Available schemas:');
        const { data: schemas, error: schemaError } = await supabase
            .from('information_schema.schemata')
            .select('schema_name')
            .not('schema_name', 'like', 'pg_%')
            .not('schema_name', 'eq', 'information_schema');

        if (schemaError) {
            console.error('❌ Error getting schemas:', schemaError);
        } else {
            schemas.forEach(schema => console.log(`  - ${schema.schema_name}`));
        }

        // Check what tables exist in public schema
        console.log('\n📋 Tables in public schema:');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name, table_type')
            .eq('table_schema', 'public')
            .order('table_name');

        if (tablesError) {
            console.error('❌ Error getting tables:', tablesError);
        } else {
            tables.forEach(table => console.log(`  - ${table.table_name} (${table.table_type})`));
        }

        // Check if custom_users table exists and has data
        console.log('\n👥 Checking custom_users table:');
        try {
            const { data: users, error: usersError, count } = await supabase
                .from('custom_users')
                .select('*', { count: 'exact', head: true });

            if (usersError) {
                console.error('❌ custom_users table error:', usersError);
            } else {
                console.log(`✅ custom_users table has ${count} records`);
            }
        } catch (error) {
            console.error('❌ custom_users table error:', error);
        }

        // Try different possible names for orders table
        const possibleOrderTables = ['rental_orders', 'orders', 'payment_orders', 'wc_orders'];
        
        console.log('\n📦 Checking for order tables:');
        for (const tableName of possibleOrderTables) {
            try {
                const { data, error, count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.log(`❌ ${tableName}: ${error.message}`);
                } else {
                    console.log(`✅ ${tableName}: ${count} records`);
                    
                    // Get sample record to see structure
                    const { data: sample } = await supabase
                        .from(tableName)
                        .select('*')
                        .limit(1);
                    
                    if (sample && sample.length > 0) {
                        console.log(`   📋 Columns: ${Object.keys(sample[0]).join(', ')}`);
                    }
                }
            } catch (err) {
                console.log(`❌ ${tableName}: ${err.message}`);
            }
        }

        // Check migration_staging schema if it exists
        console.log('\n🔄 Checking migration_staging schema:');
        try {
            const { data: migrationTables, error: migrationError } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'migration_staging')
                .order('table_name');

            if (migrationError) {
                console.error('❌ No migration_staging schema or error:', migrationError);
            } else {
                migrationTables.forEach(table => console.log(`  - migration_staging.${table.table_name}`));
                
                // Check orders_staging table
                const { data, error, count } = await supabase
                    .schema('migration_staging')
                    .from('orders_staging')
                    .select('*', { count: 'exact', head: true });

                if (error) {
                    console.error('❌ orders_staging error:', error);
                } else {
                    console.log(`✅ migration_staging.orders_staging: ${count} records`);
                }
            }
        } catch (err) {
            console.log('❌ migration_staging schema not accessible');
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the script
debugDatabase()
    .then(() => {
        console.log('\n🎉 Database debugging completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 