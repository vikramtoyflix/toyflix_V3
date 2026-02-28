/**
 * Links orphaned toy_image_* storage files to their toys by matching upload timestamps.
 * Logic: the orphaned files uploaded within 5 minutes of a toy's existing image = same toy.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wucwpyitzqjukcphczhr.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';
const BUCKET = 'toy-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
const WINDOW_MS = 5 * 60 * 1000; // 5 minute window

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // 1. Get all storage files
  console.log('Loading storage files...');
  let storageFiles = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.storage.from(BUCKET).list('', { limit: 1000, offset });
    if (!data || data.length === 0) break;
    storageFiles.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  ${storageFiles.length} files in storage`);

  // 2. Get all toy_images from DB
  console.log('Loading toy_images from DB...');
  let dbImages = [];
  offset = 0;
  while (true) {
    const { data } = await sb.from('toy_images').select('id,toy_id,image_url,created_at,display_order').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    dbImages.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  ${dbImages.length} rows in toy_images`);

  // 3. Find orphaned files
  const dbUrls = new Set(dbImages.map(r => r.image_url));
  const orphaned = storageFiles.filter(f => {
    const url = BASE_URL + encodeURIComponent(f.name);
    return !dbUrls.has(url) && f.name.startsWith('toy_image_');
  });
  console.log(`  ${orphaned.length} orphaned toy_image_* files`);

  // 4. For each orphaned file, extract its timestamp from filename
  // filename: toy_image_1772274798834_0_1772274798843.png → ts = 1772274798834
  const orphanedWithTs = orphaned.map(f => {
    const match = f.name.match(/toy_image_(\d+)_/);
    const ts = match ? parseInt(match[1]) : 0;
    return { name: f.name, url: BASE_URL + encodeURIComponent(f.name), ts, createdAt: new Date(f.created_at).getTime() };
  }).filter(f => f.ts > 0);

  // 5. For each toy in DB that only has 1 image (toy_image_ style), find orphaned files within 5 min window
  const countsByToy = {};
  dbImages.forEach(r => { countsByToy[r.toy_id] = (countsByToy[r.toy_id] || 0) + 1; });

  const singleImageEntries = dbImages.filter(r =>
    countsByToy[r.toy_id] === 1 && r.image_url.includes('toy_image_')
  );

  // Get toy names
  const singleToyIds = singleImageEntries.map(r => r.toy_id);
  const { data: toys } = await sb.from('toys').select('id,name').in('id', singleToyIds);
  const nameMap = {};
  toys?.forEach(t => nameMap[t.id] = t.name);

  let totalInserted = 0;
  let toysFixed = 0;

  for (const entry of singleImageEntries) {
    const existingTs = new Date(entry.created_at).getTime();

    // Find orphaned files uploaded within WINDOW_MS of the existing image
    const matches = orphanedWithTs.filter(o =>
      Math.abs(o.createdAt - existingTs) <= WINDOW_MS && o.url !== entry.image_url
    );

    if (matches.length === 0) continue;

    const toyName = nameMap[entry.toy_id] || entry.toy_id;
    console.log(`\n  "${toyName}" — found ${matches.length} matching orphaned files`);

    const toInsert = matches.map((m, i) => ({
      toy_id: entry.toy_id,
      image_url: m.url,
      display_order: 1 + i, // existing image is at 0
      is_primary: false,
    }));

    const { error } = await sb.from('toy_images').insert(toInsert);
    if (error) {
      console.error(`    ❌ Error: ${error.message}`);
    } else {
      console.log(`    ✅ Inserted ${toInsert.length} images`);
      totalInserted += toInsert.length;
      toysFixed++;
      // Remove matched from orphaned pool so they don't double-match
      matches.forEach(m => {
        const idx = orphanedWithTs.findIndex(o => o.url === m.url);
        if (idx !== -1) orphanedWithTs.splice(idx, 1);
      });
    }
  }

  console.log(`\n✅ Done! Inserted ${totalInserted} images across ${toysFixed} toys.`);

  // Final count
  const { data: finalCheck, error: ce } = await sb
    .from('toy_images')
    .select('toy_id', { count: 'exact' });
  if (!ce) {
    const fc = {};
    finalCheck?.forEach(r => fc[r.toy_id] = (fc[r.toy_id]||0)+1);
    const ones = Object.values(fc).filter(c => c === 1).length;
    const multis = Object.values(fc).filter(c => c > 1).length;
    console.log(`Final: ${ones} toys with 1 image, ${multis} toys with 2+ images`);
  }
}

main().catch(console.error);
