/**
 * Smart orphan linker: matches orphaned toy_image_* files to single-image toys
 * using filename timestamp proximity. Each orphan is assigned to at most one toy
 * (closest match wins). Only assigns 2-3 closest orphans per toy to avoid
 * bulk-assigning 10+ unrelated images from the same upload session.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wucwpyitzqjukcphczhr.supabase.co';
const SERVICE_KEY  = 'process.env.SUPABASE_SERVICE_KEY';
const BUCKET = 'toy-images';
const BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

// Max orphans to assign per toy (keeps it from over-assigning shared session files)
const MAX_PER_TOY = 3;
// Max time gap in ms between existing image ts and orphan ts
const MAX_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function extractTs(filename) {
  const m = filename.match(/toy_image_(\d+)_/);
  return m ? parseInt(m[1]) : 0;
}

async function main() {
  // 1. Load all DB images
  let dbImages = [];
  let offset = 0;
  while (true) {
    const { data } = await sb.from('toy_images').select('toy_id,image_url,display_order').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    dbImages.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${dbImages.length} DB image rows`);

  const counts = {};
  dbImages.forEach(r => counts[r.toy_id] = (counts[r.toy_id] || 0) + 1);
  const maxOrderByToy = {};
  dbImages.forEach(r => {
    maxOrderByToy[r.toy_id] = Math.max(maxOrderByToy[r.toy_id] || 0, r.display_order);
  });

  // Only process toys with exactly 1 image that uses toy_image_ naming
  const singles = dbImages.filter(r => counts[r.toy_id] === 1 && r.image_url.includes('toy_image_'));

  // 2. Load all storage files
  let storageFiles = [];
  offset = 0;
  while (true) {
    const { data } = await sb.storage.from(BUCKET).list('', { limit: 1000, offset });
    if (!data || data.length === 0) break;
    storageFiles.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Loaded ${storageFiles.length} storage files`);

  // 3. Find orphaned files
  const dbUrls = new Set(dbImages.map(r => r.image_url));
  const orphaned = storageFiles
    .filter(f => !dbUrls.has(BASE_URL + encodeURIComponent(f.name)) && f.name.startsWith('toy_image_'))
    .map(f => ({ name: f.name, url: BASE_URL + encodeURIComponent(f.name), ts: extractTs(f.name) }))
    .filter(f => f.ts > 0)
    .sort((a, b) => a.ts - b.ts);
  console.log(`Found ${orphaned.length} orphaned files`);

  // 4. Get toy names
  const { data: toys } = await sb.from('toys').select('id,name').in('id', singles.map(r => r.toy_id));
  const nameMap = {};
  toys?.forEach(t => nameMap[t.id] = t.name);

  // 5. Build candidate list: for each single-image toy, find orphans within MAX_GAP_MS
  const candidates = singles.map(s => {
    const existingTs = extractTs(s.image_url);
    const nearby = orphaned
      .filter(o => Math.abs(o.ts - existingTs) <= MAX_GAP_MS)
      .sort((a, b) => Math.abs(a.ts - existingTs) - Math.abs(b.ts - existingTs));
    return { toyId: s.toy_id, name: nameMap[s.toy_id], existingTs, nearby };
  }).filter(c => c.nearby.length > 0);

  // 6. Greedy assignment: sort toys by fewest candidates first (most constrained),
  // assign closest MAX_PER_TOY orphans to each, mark them as used
  candidates.sort((a, b) => a.nearby.length - b.nearby.length);
  const usedUrls = new Set();
  const assignments = [];

  for (const candidate of candidates) {
    const available = candidate.nearby.filter(o => !usedUrls.has(o.url));
    const toAssign = available.slice(0, MAX_PER_TOY);
    if (toAssign.length === 0) continue;
    toAssign.forEach(o => usedUrls.add(o.url));
    assignments.push({ ...candidate, toAssign });
  }

  console.log(`\nWill insert images for ${assignments.length} toys:\n`);

  let totalInserted = 0;

  for (const a of assignments) {
    const startOrder = (maxOrderByToy[a.toyId] || 0) + 1;
    const rows = a.toAssign.map((o, i) => ({
      toy_id: a.toyId,
      image_url: o.url,
      display_order: startOrder + i,
      is_primary: false,
    }));

    const { error } = await sb.from('toy_images').insert(rows);
    if (error) {
      console.error(`  ❌ "${a.name}": ${error.message}`);
    } else {
      console.log(`  ✅ "${a.name}" → +${rows.length} image(s)`);
      totalInserted += rows.length;
    }
  }

  console.log(`\n✅ Done! Inserted ${totalInserted} images across ${assignments.length} toys.`);

  // Final tally
  let allImgs = [];
  offset = 0;
  while (true) {
    const { data } = await sb.from('toy_images').select('toy_id').range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allImgs.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  const finalCounts = {};
  allImgs.forEach(r => finalCounts[r.toy_id] = (finalCounts[r.toy_id] || 0) + 1);
  const ones = Object.values(finalCounts).filter(c => c === 1).length;
  const multi = Object.values(finalCounts).filter(c => c > 1).length;
  console.log(`\nFinal: ${ones} toys with 1 image, ${multi} toys with 2+ images`);
}

main().catch(console.error);
