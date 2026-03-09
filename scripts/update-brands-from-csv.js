#!/usr/bin/env node
/**
 * Update brand details in Supabase toys table from CSV.
 * Only updates the `brand` field for toys matched by id.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/update-brands-from-csv.js [path-to-csv]
 *
 * Default: /Users/vikrama.m/Downloads/toys-by-category-with-brands-standardized.csv
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
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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

async function updateBrands(csvPath) {
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

    const brand = (row.brand || '').trim();
    const payload = {
      brand: brand || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('toys').update(payload).eq('id', id);

    if (error) {
      console.error(`❌ ${id} (${row.name?.slice(0, 30)}):`, error.message);
      errors++;
    } else {
      updated++;
      if (updated % 50 === 0) process.stdout.write('.');
    }
  }

  console.log('\n');
  console.log('📊 Brand update complete:');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors:  ${errors}`);
}

const defaultPath = '/Users/vikrama.m/Downloads/toys-by-category-with-brands-standardized.csv';
const csvPath = process.argv[2] || defaultPath;

if (!fs.existsSync(csvPath)) {
  console.error('❌ CSV not found:', csvPath);
  process.exit(1);
}

updateBrands(csvPath).catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
