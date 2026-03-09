#!/usr/bin/env node
/**
 * Sync toys from toys-by-category.csv to Supabase.
 * Updates category, subscription_category, and other fields for existing toys by id.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/sync-toys-from-csv.js [path-to-csv]
 *
 * Default CSV path: ./toys-by-category.csv (or pass as first arg)
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
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, or VITE_SUPABASE_SERVICE_ROLE_KEY env var is required');
  console.error('   Set it in .env.local or: export SUPABASE_SERVICE_ROLE_KEY=xxx');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const VALID_CATEGORIES = ['big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys'];

function parseAgeRange(val) {
  if (!val || val === '') return null;
  const s = String(val).trim();
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.join(', ') : s;
    } catch {
      return s;
    }
  }
  return s;
}

function parseNum(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function parseIntSafe(val) {
  if (val === '' || val == null) return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
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

async function syncToys(csvPath) {
  console.log('📂 Reading CSV:', csvPath);
  const rows = await loadCsv(csvPath);
  console.log(`✅ Parsed ${rows.length} rows`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const id = row.id?.trim();
    if (!id) {
      skipped++;
      continue;
    }

    const category = (row.category || '').trim().toLowerCase();
    const subCat = (row.subscription_category || row.category || '').trim().toLowerCase();

    const payload = {
      name: (row.name || '').trim() || undefined,
      description: (row.description || '').trim() || undefined,
      brand: (row.brand || '').trim() || undefined,
      category: VALID_CATEGORIES.includes(category) ? category : undefined,
      subscription_category: VALID_CATEGORIES.includes(subCat) ? subCat : undefined,
      age_range: parseAgeRange(row.age_range) || undefined,
      retail_price: parseNum(row.retail_price),
      rental_price: parseNum(row.rental_price),
      available_quantity: parseIntSafe(row.available_quantity),
      total_quantity: parseIntSafe(row.total_quantity),
      image_url: (row.image_url || '').trim() || undefined,
      sku: (row.sku || '').trim() || undefined,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const { error } = await supabase.from('toys').update(payload).eq('id', id);

    if (error) {
      console.error(`❌ ${id} (${row.name?.slice(0, 30)}):`, error.message);
      errors++;
    } else {
      updated++;
      if (updated % 50 === 0) process.stdout.write(`.`);
    }
  }

  console.log('\n');
  console.log('📊 Sync complete:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
}

const csvPath = process.argv[2] || path.join(__dirname, '..', 'toys-by-category.csv');
if (!fs.existsSync(csvPath)) {
  console.error('❌ CSV not found:', csvPath);
  process.exit(1);
}

syncToys(csvPath).catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
