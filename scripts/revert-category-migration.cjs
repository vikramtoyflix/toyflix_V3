/**
 * Revert the subscription_category remap migration.
 * Puts DB back to: stem_toys=68, educational_toys=90, developmental_toys=12
 */
const { createClient } = require('@supabase/supabase-js');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY env var required');
  process.exit(1);
}
const supabase = createClient('https://wucwpyitzqjukcphczhr.supabase.co', key);

async function revert() {
  console.log('--- REVERTING (putting DB back to original) ---');

  // Step 1: educational_toys (68) -> stem_toys (these were former stem)
  console.log('Step 1: educational_toys (68) -> stem_toys');
  const { error: e1 } = await supabase
    .from('toys')
    .update({ subscription_category: 'stem_toys' })
    .eq('subscription_category', 'educational_toys');
  if (e1) {
    console.error('Step 1 FAILED:', e1.message);
    return;
  }
  console.log('Step 1 done.');

  // Step 2: 90 of developmental_toys (102) -> educational_toys
  // Take first 90 by id to revert (arbitrary but deterministic)
  const { data: devToys } = await supabase
    .from('toys')
    .select('id')
    .eq('subscription_category', 'developmental_toys')
    .order('id')
    .limit(90);
  const idsToRevert = (devToys || []).map((t) => t.id);
  if (idsToRevert.length > 0) {
    const { error: e2 } = await supabase
      .from('toys')
      .update({ subscription_category: 'educational_toys' })
      .in('id', idsToRevert);
    if (e2) {
      console.error('Step 2 FAILED:', e2.message);
      return;
    }
    console.log('Step 2: Moved', idsToRevert.length, 'developmental -> educational');
  }

  console.log('\n--- AFTER REVERT ---');
  const { data: after } = await supabase
    .from('toys')
    .select('subscription_category')
    .neq('category', 'ride_on_toys');
  const counts = {};
  (after || []).forEach((t) => {
    const c = t.subscription_category || 'NULL';
    counts[c] = (counts[c] || 0) + 1;
  });
  console.log(JSON.stringify(counts, null, 2));
}

revert().catch(console.error);
