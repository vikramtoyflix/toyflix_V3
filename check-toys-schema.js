#!/usr/bin/env node

/**
 * Check toys table schema
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';
const sql = postgres(connectionString);

async function checkToysSchema() {
  console.log('🔍 Checking toys table schema...\n');
  
  try {
    // Get column information for toys table
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'toys' 
      ORDER BY ordinal_position
    `;
    
    console.log('📊 TOYS TABLE COLUMNS:');
    console.log('======================');
    columns.forEach(col => {
      console.log(`${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });
    
    // Check for age-related columns specifically
    const ageColumns = columns.filter(col => 
      col.column_name.toLowerCase().includes('age')
    );
    
    console.log('\n🎯 AGE-RELATED COLUMNS:');
    console.log('=======================');
    if (ageColumns.length > 0) {
      ageColumns.forEach(col => {
        console.log(`✅ ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ No age-related columns found');
    }
    
    // Sample a few toys to see the data
    const sampleToys = await sql`
      SELECT id, name, age_range, category, created_at 
      FROM toys 
      LIMIT 3
    `;
    
    console.log('\n📋 SAMPLE TOYS DATA:');
    console.log('====================');
    sampleToys.forEach((toy, index) => {
      console.log(`${index + 1}. ${toy.name}`);
      console.log(`   Age Range: ${toy.age_range || 'Not specified'}`);
      console.log(`   Category: ${toy.category || 'Not specified'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await sql.end();
  }
}

checkToysSchema().catch(console.error); 