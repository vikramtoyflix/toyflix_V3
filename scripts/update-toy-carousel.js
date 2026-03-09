import { createClient } from '@supabase/supabase-js';

// Production Supabase credentials
const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// List of toys that should be featured in the carousel
const toysToFeature = [
  'foosball table',
  'trampoline',
  'air hockey',
  'baybee magic swing cars for kids',
  'ok play up & down roller coaster',
  'baybee cruiser pedal go kart racing ride',
  'little tikes coupe car for kids',
  'playgro indoor senior swing',
  'playgro 3 in 1 ride on plus rocker',
  'baybee actro tricycle with parental push',
  'baybee push ride on car for kids',
  'funskool activity walker',
  'indoor slide junior',
  'ok play activity center play pen for kids'
];

async function updateToyCarousel() {
  console.log('🚀 Starting toy carousel update with production database...');
  
  try {
    // Step 1: Get all toys from database
    console.log('📋 Fetching all toys from production...');
    const { data: allToys, error: fetchError } = await supabase
      .from('toys')
      .select('id, name, is_featured');
    
    if (fetchError) {
      console.error('❌ Error fetching toys:', fetchError);
      return;
    }
    
    console.log(`📦 Found ${allToys.length} toys in production database`);
    
    // Step 2: Remove all toys from carousel (set is_featured = false)
    console.log('🧹 Removing all toys from carousel...');
    const { error: clearError } = await supabase
      .from('toys')
      .update({ is_featured: false })
      .gt('created_at', '1900-01-01'); // This will match all rows
    
    if (clearError) {
      console.error('❌ Error clearing carousel:', clearError);
      return;
    }
    
    console.log('✅ All toys removed from carousel');
    
    // Step 3: Find and feature the specific toys
    console.log('🔍 Looking for specific toys to feature...');
    
    const foundToys = [];
    const notFoundToys = [];
    
    for (const toyName of toysToFeature) {
      // Try to find toy by exact name match (case insensitive)
      let toy = allToys.find(t => t.name.toLowerCase() === toyName.toLowerCase());
      
      // If not found, try partial match
      if (!toy) {
        toy = allToys.find(t => t.name.toLowerCase().includes(toyName.toLowerCase()) || 
                                toyName.toLowerCase().includes(t.name.toLowerCase()));
      }
      
      if (toy) {
        foundToys.push({ id: toy.id, name: toy.name, searchName: toyName });
        console.log(`✅ Found: "${toy.name}" for search: "${toyName}"`);
      } else {
        notFoundToys.push(toyName);
        console.log(`❌ Not found: "${toyName}"`);
      }
    }
    
    // Step 4: Update found toys to be featured
    if (foundToys.length > 0) {
      console.log(`🌟 Adding ${foundToys.length} toys to carousel...`);
      
      const toyIds = foundToys.map(t => t.id);
      const { error: updateError } = await supabase
        .from('toys')
        .update({ is_featured: true })
        .in('id', toyIds);
      
      if (updateError) {
        console.error('❌ Error updating toys:', updateError);
        return;
      }
      
      console.log('✅ Successfully updated featured toys!');
    }
    
    // Step 5: Report results
    console.log('\n📊 CAROUSEL UPDATE RESULTS:');
    console.log(`✅ Featured toys: ${foundToys.length}`);
    foundToys.forEach(toy => {
      console.log(`   - ${toy.name}`);
    });
    
    if (notFoundToys.length > 0) {
      console.log(`❌ Toys not found: ${notFoundToys.length}`);
      notFoundToys.forEach(toyName => {
        console.log(`   - ${toyName}`);
      });
      
      console.log('\n🔍 Available toys in database (showing first 20):');
      allToys.slice(0, 20).forEach(toy => {
        console.log(`   • ${toy.name}`);
      });
      
      if (allToys.length > 20) {
        console.log(`   ... and ${allToys.length - 20} more toys`);
      }
    }
    
    // Step 6: Verify the update
    console.log('\n🔍 Verifying carousel state...');
    const { data: featuredToys, error: verifyError } = await supabase
      .from('toys')
      .select('name, is_featured')
      .eq('is_featured', true);
    
    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }
    
    console.log(`🎯 Currently featured toys: ${featuredToys.length}`);
    featuredToys.forEach(toy => {
      console.log(`   ⭐ ${toy.name}`);
    });
    
    console.log('\n🎉 Carousel update completed successfully!');
    console.log('🌐 Check the admin panel and homepage to see the changes.');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the update
updateToyCarousel(); 