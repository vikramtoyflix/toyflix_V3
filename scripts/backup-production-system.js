import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Create backup directory with timestamp
const backupDir = `backups/pre-relational-schema-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
fs.mkdirSync(backupDir, { recursive: true });

console.log(`🛡️  Creating production backup in: ${backupDir}`);

async function backupTable(tableName, filename) {
  try {
    console.log(`📦 Backing up ${tableName}...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error backing up ${tableName}:`, error);
      return false;
    }
    
    const backupFile = path.join(backupDir, `${filename}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ ${tableName}: ${data?.length || 0} records → ${filename}.json`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to backup ${tableName}:`, error.message);
    return false;
  }
}

async function backupSchema() {
  try {
    console.log(`📋 Backing up database schema...`);
    
    // Get table information
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .neq('table_name', 'schema_migrations');
    
    if (tablesError) {
      console.error('❌ Error getting table list:', tablesError);
      return false;
    }
    
    // Get column information for each table
    const schemaInfo = {};
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);
      
      if (!columnsError) {
        schemaInfo[table.table_name] = {
          type: table.table_type,
          columns: columns
        };
      }
    }
    
    const schemaFile = path.join(backupDir, 'database-schema.json');
    fs.writeFileSync(schemaFile, JSON.stringify(schemaInfo, null, 2));
    
    console.log(`✅ Database schema → database-schema.json`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to backup schema:`, error.message);
    return false;
  }
}

async function createBackupReport() {
  const report = {
    timestamp: new Date().toISOString(),
    purpose: 'Pre-relational schema deployment backup',
    supabase_url: SUPABASE_URL,
    backup_directory: backupDir,
    files_created: fs.readdirSync(backupDir),
    next_steps: [
      '1. Deploy relational schema using: node scripts/deploy-relational-schema.js',
      '2. Test the new system thoroughly',
      '3. If rollback needed, restore from these backup files',
      '4. Keep this backup for at least 30 days'
    ]
  };
  
  const reportFile = path.join(backupDir, 'backup-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📊 Backup report → backup-report.json`);
}

async function main() {
  console.log('🚀 Starting production system backup...\n');
  
  const backupTasks = [
    // Core tables
    { table: 'toys', filename: 'toys-backup' },
    { table: 'users', filename: 'users-backup' },
    { table: 'subscriptions', filename: 'subscriptions-backup' },
    { table: 'orders', filename: 'orders-backup' },
    { table: 'toy_reviews', filename: 'toy-reviews-backup' },
    
    // Configuration tables
    { table: 'carousel_slides', filename: 'carousel-slides-backup' },
    { table: 'admin_settings', filename: 'admin-settings-backup' },
    
    // Any other important tables
    { table: 'profiles', filename: 'profiles-backup' },
  ];
  
  let successCount = 0;
  let totalTasks = backupTasks.length + 1; // +1 for schema backup
  
  // Backup all tables
  for (const task of backupTasks) {
    const success = await backupTable(task.table, task.filename);
    if (success) successCount++;
  }
  
  // Backup schema
  const schemaSuccess = await backupSchema();
  if (schemaSuccess) successCount++;
  
  // Create backup report
  await createBackupReport();
  
  console.log('\n🎯 Backup Summary:');
  console.log(`✅ Successful backups: ${successCount}/${totalTasks}`);
  console.log(`📁 Backup location: ${backupDir}`);
  
  if (successCount === totalTasks) {
    console.log('\n🎉 Production backup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set production environment variables:');
    console.log('   export SUPABASE_URL="your-production-url"');
    console.log('   export SUPABASE_SERVICE_KEY="your-production-service-key"');
    console.log('2. Deploy relational schema:');
    console.log('   node scripts/deploy-relational-schema.js');
    console.log('3. Test the system thoroughly');
    console.log('4. Monitor for any issues');
    
    return true;
  } else {
    console.log('\n⚠️  Some backups failed. Please review errors above.');
    console.log('Fix issues before proceeding with production deployment.');
    return false;
  }
}

main().catch(console.error); 