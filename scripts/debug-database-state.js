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

async function debugDatabaseState() {
  console.log('🔍 Debugging database state...\n');

  try {
    // Check all schemas
    console.log('📋 Available schemas:');
    const { data: schemas } = await executeSQL(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

    if (schemas && schemas.length > 0) {
      schemas.forEach(schema => {
        console.log(`  • ${schema.schema_name}`);
      });
    }

    // Check for any tables with 'staging' in the name
    console.log('\n🔍 Tables containing "staging":');
    const { data: stagingTables } = await executeSQL(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%staging%'
      ORDER BY table_schema, table_name
    `);

    if (stagingTables && stagingTables.length > 0) {
      stagingTables.forEach(table => {
        console.log(`  • ${table.table_schema}.${table.table_name}`);
      });
    } else {
      console.log('  No tables with "staging" found');
    }

    // Check for any tables with 'users' in the name
    console.log('\n👥 Tables containing "users":');
    const { data: userTables } = await executeSQL(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%users%'
      ORDER BY table_schema, table_name
    `);

    if (userTables && userTables.length > 0) {
      userTables.forEach(table => {
        console.log(`  • ${table.table_schema}.${table.table_name}`);
      });
    }

    // Check all tables in public schema
    console.log('\n🏠 Tables in public schema:');
    const { data: publicTables } = await executeSQL(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (publicTables && publicTables.length > 0) {
      publicTables.forEach(table => {
        console.log(`  • ${table.table_name}`);
      });
    }

    // Try to create just the schema first
    console.log('\n🧪 Testing schema creation:');
    const { data: schemaResult, error: schemaError } = await executeSQL(`
      CREATE SCHEMA IF NOT EXISTS migration_staging;
    `);

    if (schemaError) {
      console.log(`❌ Schema creation error: ${schemaError.message}`);
    } else {
      console.log('✅ Schema creation successful');
    }

    // Try to create just the users_staging table
    console.log('\n🧪 Testing users_staging table creation:');
    const { data: tableResult, error: tableError } = await executeSQL(`
      CREATE TABLE IF NOT EXISTS migration_staging.users_staging (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wp_user_id INTEGER NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    if (tableError) {
      console.log(`❌ Table creation error: ${tableError.message}`);
    } else {
      console.log('✅ Table creation successful');
    }

  } catch (error) {
    console.error('❌ Error debugging database:', error.message);
  }
}

debugDatabaseState(); 