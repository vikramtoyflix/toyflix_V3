#!/usr/bin/env node
/**
 * Reassign developmental_toys and educational_toys by age:
 * - Younger ages (6m-2, 1-2, 2-3) → developmental_toys
 * - Older ages (3-4, 4-6, 6-8) → educational_toys
 *
 * Updates CSV and syncs to Supabase.
 *
 * Usage:
 *   node scripts/update-developmental-educational-by-age.js [csv-path] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
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

const DEVELOPMENTAL_AGES = ['6m-2 years', '1-2 years', '2-3 years'];
const EDUCATIONAL_AGES = ['3-4 years', '4-6 years', '6-8 years'];

function getFirstAgeBand(ageRange) {
  if (!ageRange) return null;
  let s = String(ageRange).trim();
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr[0]) return String(arr[0]).trim();
    } catch {}
  }
  const first = s.split(/[,;]/)[0]?.trim();
  return first || null;
}

function isDevelopmentalAge(ageBand) {
  if (!ageBand) return false;
  const lower = ageBand.toLowerCase();
  return DEVELOPMENTAL_AGES.some((a) => lower.includes(a) || a.includes(lower));
}

function isEducationalAge(ageBand) {
  if (!ageBand) return false;
  const lower = ageBand.toLowerCase();
  return EDUCATIONAL_AGES.some((a) => lower.includes(a) || a.includes(lower));
}

function getSubscriptionCategoryByAge(ageRange, currentCategory) {
  const first = getFirstAgeBand(ageRange);
  if (!first) return currentCategory;
  if (isDevelopmentalAge(first)) return 'developmental_toys';
  if (isEducationalAge(first)) return 'educational_toys';
  return currentCategory;
}

function normalizeRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/^\uFEFF/, '').trim();
    out[key] = v;
  }
  return out;
}

function loadCsv(csvPath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => rows.push(normalizeRow(row)))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function escapeCsv(val) {
  if (val == null) return '""';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return '"' + s + '"';
}

async function main() {
  const csvPath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'toys-by-category.csv');
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV not found:', csvPath);
    process.exit(1);
  }

  console.log('📂 Loading CSV:', csvPath);
  const rows = await loadCsv(csvPath);
  console.log(`   ${rows.length} rows`);

  const idToRow = new Map();
  rows.forEach((r, i) => {
    const id = r.id?.trim();
    if (id) idToRow.set(id, { row: r, index: i });
  });

  let devCount = 0;
  let eduCount = 0;
  let unchanged = 0;

  for (const [id, { row }] of idToRow) {
    const cat = (row.category || '').trim().toLowerCase();
    const subCat = (row.subscription_category || row.category || '').trim().toLowerCase();

    if (cat !== 'developmental_toys' && cat !== 'educational_toys' && cat !== 'stem_toys') continue;

    const ageRange = row.age_range;
    const newSub = getSubscriptionCategoryByAge(ageRange, subCat);

    if (newSub !== subCat) {
      row.subscription_category = newSub;
      if (newSub === 'developmental_toys') devCount++;
      else eduCount++;
    } else {
      unchanged++;
    }
  }

  console.log('\n📊 Reassignments by age:');
  console.log(`   → developmental_toys: ${devCount}`);
  console.log(`   → educational_toys:   ${eduCount}`);
  console.log(`   Unchanged:            ${unchanged}`);

  const headers = ['id', 'name', 'description', 'brand', 'category', 'subscription_category', 'age_range', 'retail_price', 'rental_price', 'available_quantity', 'total_quantity', 'image_url', 'sku', 'created_at'];
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    csvLines.push(headers.map((h) => escapeCsv(r[h])).join(','));
  }

  if (!dryRun) {
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log('\n✅ Updated CSV:', csvPath);

    console.log('\n🔄 Syncing to Supabase...');
    let updated = 0;
    for (const [id, { row }] of idToRow) {
      const cat = (row.category || '').trim().toLowerCase();
      const subCat = (row.subscription_category || '').trim().toLowerCase();
      if (cat !== 'developmental_toys' && cat !== 'educational_toys' && cat !== 'stem_toys') continue;

      const { error } = await supabase.from('toys').update({ subscription_category: subCat, updated_at: new Date().toISOString() }).eq('id', id);
      if (!error) updated++;
    }
    console.log(`   Updated ${updated} toys in Supabase`);
  } else {
    console.log('\n🔍 Dry run - no changes written. Remove --dry-run to apply.');
  }
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
