/**
 * Syncs toy-images bucket (flat naming: toyname_timestamp.jpg) to toy_images table.
 * For each toy, finds all matching files in storage and inserts missing ones into DB.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wucwpyitzqjukcphczhr.supabase.co';
const SERVICE_KEY  = 'process.env.SUPABASE_SERVICE_KEY';
const BUCKET      = 'toy-images';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildPublicUrl(filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

async function listAllStorageFiles() {
  const allFiles = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await sb.storage.from(BUCKET).list('', { limit, offset });
    if (error) { console.error('Storage list error:', error); break; }
    if (!data || data.length === 0) break;
    allFiles.push(...data.map(f => f.name));
    if (data.length < limit) break;
    offset += limit;
  }
  return allFiles;
}

async function main() {
  console.log('Loading all toys from DB...');
  const { data: toys, error: toysErr } = await sb.from('toys').select('id,name');
  if (toysErr) { console.error('Toys fetch error:', toysErr); return; }
  console.log(`Found ${toys.length} toys`);

  console.log('Loading all existing toy_images from DB...');
  const { data: existingImages, error: imgErr } = await sb.from('toy_images').select('toy_id,image_url');
  if (imgErr) { console.error('toy_images fetch error:', imgErr); return; }

  // Build a set of already-known image URLs per toy
  const existingByToy = {};
  for (const img of existingImages) {
    if (!existingByToy[img.toy_id]) existingByToy[img.toy_id] = new Set();
    existingByToy[img.toy_id].add(img.image_url);
  }

  console.log('Listing all storage files...');
  const allFiles = await listAllStorageFiles();
  console.log(`Found ${allFiles.length} files in storage`);

  // Build a map: slug -> [filename, filename, ...]
  const filesBySlug = {};
  for (const filename of allFiles) {
    // Strip the trailing _timestamp.ext  →  toy_slug
    const slug = filename.replace(/_\d{13,}\.[^.]+$/, '');
    if (!filesBySlug[slug]) filesBySlug[slug] = [];
    filesBySlug[slug].push(filename);
  }

  let totalInserted = 0;
  let toysUpdated = 0;

  for (const toy of toys) {
    const toySlug = slugify(toy.name);
    const matchingFiles = filesBySlug[toySlug] || [];

    if (matchingFiles.length === 0) continue;

    // Sort by timestamp (filename order = upload order)
    matchingFiles.sort();

    const existingUrls = existingByToy[toy.id] || new Set();
    const toInsert = [];

    matchingFiles.forEach((filename, i) => {
      const url = buildPublicUrl(filename);
      if (existingUrls.has(url)) return; // already in DB

      toInsert.push({
        toy_id: toy.id,
        image_url: url,
        display_order: existingUrls.size + i + 1,
        is_primary: existingUrls.size === 0 && i === 0, // primary only if no images at all
      });
    });

    if (toInsert.length === 0) continue;

    const { error: insertErr } = await sb.from('toy_images').insert(toInsert);
    if (insertErr) {
      console.error(`Error inserting images for "${toy.name}":`, insertErr.message);
    } else {
      console.log(`  ✅ "${toy.name}" → added ${toInsert.length} image(s) (total now: ${existingUrls.size + toInsert.length})`);
      totalInserted += toInsert.length;
      toysUpdated++;
    }
  }

  console.log(`\n✅ Done! Inserted ${totalInserted} new image rows across ${toysUpdated} toys.`);

  // Show remaining toys with only 1 image
  const { data: stillOne } = await sb.rpc('count_toys_by_image_count').catch(() => ({ data: null }));
  const { data: check } = await sb
    .from('toy_images')
    .select('toy_id')
    .then(async ({ data }) => {
      if (!data) return { data: null };
      const counts = {};
      data.forEach(r => { counts[r.toy_id] = (counts[r.toy_id] || 0) + 1; });
      const oneOnly = Object.values(counts).filter(c => c === 1).length;
      const multi = Object.values(counts).filter(c => c > 1).length;
      console.log(`\nFinal state: ${oneOnly} toys with 1 image, ${multi} toys with 2+ images`);
      return { data };
    });
}

main().catch(console.error);
