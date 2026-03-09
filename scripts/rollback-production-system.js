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

async function listBackups() {
  const backupsDir = 'backups';
  if (!fs.existsSync(backupsDir)) {
    console.log('❌ No backups directory found');
    return [];
  }
  
  const backupFolders = fs.readdirSync(backupsDir)
    .filter(name => name.startsWith('pre-relational-schema-'))
    .sort()
    .reverse(); // Most recent first
  
  return backupFolders;
}

async function selectBackup() {
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('❌ No backup folders found');
    console.log('Expected format: backups/pre-relational-schema-YYYY-MM-DD-timestamp/');
    process.exit(1);
  }
  
  console.log('📁 Available backups:');
  backups.forEach((backup, index) => {
    const reportPath = path.join('backups', backup, 'backup-report.json');
    let timestamp = 'Unknown date';
    
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        timestamp = new Date(report.timestamp).toLocaleString();
      } catch (e) {
        // Continue with Unknown date
      }
    }
    
    console.log(`${index + 1}. ${backup} (${timestamp})`);
  });
  
  // For now, use the most recent backup (index 0)
  // In a real implementation, you might want to prompt the user
  return path.join('backups', backups[0]);
}

async function restoreTable(backupDir, tableName, filename) {
  const backupFile = path.join(backupDir, `${filename}.json`);
  
  if (!fs.existsSync(backupFile)) {
    console.log(`⚠️  Backup file not found: ${filename}.json`);
    return false;
  }
  
  try {
    console.log(`🔄 Restoring ${tableName}...`);
    
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    if (!Array.isArray(backupData) || backupData.length === 0) {
      console.log(`⚠️  No data to restore for ${tableName}`);
      return true;
    }
    
    // Clear existing data (DANGEROUS - only in emergency rollback)
    console.log(`🗑️  Clearing existing ${tableName} data...`);
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', ''); // Delete all records
    
    if (deleteError && !deleteError.message.includes('0 rows')) {
      console.error(`❌ Error clearing ${tableName}:`, deleteError);
      return false;
    }
    
    // Restore data in batches
    const batchSize = 100;
    let restored = 0;
    
    for (let i = 0; i < backupData.length; i += batchSize) {
      const batch = backupData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.error(`❌ Error restoring batch for ${tableName}:`, insertError);
        return false;
      }
      
      restored += batch.length;
      console.log(`📦 Restored ${restored}/${backupData.length} records for ${tableName}`);
    }
    
    console.log(`✅ ${tableName}: ${restored} records restored`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to restore ${tableName}:`, error.message);
    return false;
  }
}

async function cleanupRelationalSchema() {
  console.log('🧹 Cleaning up relational schema tables...');
  
  const tablesToCleanup = [
    'toys_with_age_bands', // Materialized view
    'toy_category_bridge',
    'toy_age_band',
    'toy_categories',
    'age_bands'
  ];
  
  for (const table of tablesToCleanup) {
    try {
      // Try to drop as materialized view first
      await supabase.rpc('exec_sql', { 
        sql: `DROP MATERIALIZED VIEW IF EXISTS ${table} CASCADE;` 
      });
      
      // Then try to drop as table
      await supabase.rpc('exec_sql', { 
        sql: `DROP TABLE IF EXISTS ${table} CASCADE;` 
      });
      
      console.log(`🗑️  Cleaned up ${table}`);
    } catch (error) {
      console.log(`⚠️  Could not clean up ${table} (may not exist): ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚨 PRODUCTION ROLLBACK SCRIPT');
  console.log('⚠️  WARNING: This will restore your database to a previous backup!');
  console.log('⚠️  All data created after the backup will be LOST!');
  console.log('');
  
  // In a real implementation, you'd want a confirmation prompt here
  console.log('🔍 Selecting most recent backup...');
  
  const backupDir = await selectBackup();
  
  if (!fs.existsSync(backupDir)) {
    console.log(`❌ Backup directory not found: ${backupDir}`);
    process.exit(1);
  }
  
  console.log(`📁 Using backup: ${backupDir}`);
  
  // Load backup report
  const reportPath = path.join(backupDir, 'backup-report.json');
  let report = null;
  
  if (fs.existsSync(reportPath)) {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`📊 Backup created: ${new Date(report.timestamp).toLocaleString()}`);
  }
  
  console.log('\n🚀 Starting rollback process...\n');
  
  // Step 1: Clean up relational schema
  await cleanupRelationalSchema();
  
  // Step 2: Restore core tables
  const restoreTasks = [
    { table: 'toys', filename: 'toys-backup' },
    { table: 'users', filename: 'users-backup' },
    { table: 'subscriptions', filename: 'subscriptions-backup' },
    { table: 'orders', filename: 'orders-backup' },
    { table: 'toy_reviews', filename: 'toy-reviews-backup' },
    { table: 'carousel_slides', filename: 'carousel-slides-backup' },
    { table: 'admin_settings', filename: 'admin-settings-backup' },
    { table: 'profiles', filename: 'profiles-backup' },
  ];
  
  let successCount = 0;
  
  for (const task of restoreTasks) {
    const success = await restoreTable(backupDir, task.table, task.filename);
    if (success) successCount++;
  }
  
  console.log('\n🎯 Rollback Summary:');
  console.log(`✅ Successful restores: ${successCount}/${restoreTasks.length}`);
  
  if (successCount === restoreTasks.length) {
    console.log('\n🎉 Production rollback completed successfully!');
    console.log('\n📋 Post-Rollback Steps:');
    console.log('1. Test your application thoroughly');
    console.log('2. Monitor for any issues');
    console.log('3. Update your team about the rollback');
    console.log('4. Plan for re-deployment if needed');
    
    return true;
  } else {
    console.log('\n⚠️  Some restores failed. Please review errors above.');
    console.log('Your system may be in an inconsistent state.');
    console.log('Consider manual intervention or contact support.');
    return false;
  }
}

main().catch(console.error); 