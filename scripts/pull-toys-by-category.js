#!/usr/bin/env node
/**
 * Pull toys from Supabase grouped by category.
 * Outputs counts and optionally exports to CSV.
 *
 * Usage:
 *   node scripts/pull-toys-by-category.js [--csv]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '..', '.env.local') });
config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY env var is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function pullToysByCategory() {
  const { data: toys, error } = await supabase
    .from('toys')
    .select('id, name, category, subscription_category, age_range, available_quantity, retail_price')
    .order('category')
    .order('name');

  if (error) {
    console.error('❌', error.message);
    process.exit(1);
  }

  const byCategory = {};
  const bySubCategory = {};

  for (const t of toys || []) {
    const cat = t.category || 'uncategorized';
    const subCat = t.subscription_category || t.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    if (!bySubCategory[subCat]) bySubCategory[subCat] = [];
    byCategory[cat].push(t);
    if (subCat !== cat) bySubCategory[subCat].push(t);
    else bySubCategory[subCat].push(t);
  }

  // Dedupe bySubCategory - each toy appears in its subscription_category
  const bySub = {};
  for (const t of toys || []) {
    const subCat = t.subscription_category || t.category || 'uncategorized';
    if (!bySub[subCat]) bySub[subCat] = [];
    bySub[subCat].push(t);
  }

  console.log('\n📦 Toys by category\n' + '─'.repeat(50));
  for (const [cat, items] of Object.entries(byCategory).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${cat} (${items.length})`);
    items.slice(0, 10).forEach((t) => console.log(`   • ${t.name}`));
    if (items.length > 10) console.log(`   ... and ${items.length - 10} more`);
  }

  console.log('\n📦 Toys by subscription_category\n' + '─'.repeat(50));
  for (const [cat, items] of Object.entries(bySub).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`\n${cat} (${items.length})`);
    items.slice(0, 10).forEach((t) => console.log(`   • ${t.name}`));
    if (items.length > 10) console.log(`   ... and ${items.length - 10} more`);
  }

  const wantCsv = process.argv.includes('--csv');
  if (wantCsv) {
    const outPath = path.join(__dirname, '..', 'toys-by-category-pulled.csv');
    const headers = ['id', 'name', 'category', 'subscription_category', 'age_range', 'available_quantity', 'retail_price'];
    const rows = (toys || []).map((t) => headers.map((h) => `"${String(t[h] || '').replace(/"/g, '""')}"`).join(','));
    fs.writeFileSync(outPath, [headers.join(','), ...rows].join('\n'));
    console.log('\n✅ Exported to', outPath);
  }

  console.log('\n📊 Total:', toys?.length || 0, 'toys');
}

pullToysByCategory().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
