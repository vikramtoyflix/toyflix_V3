import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function checkTable() {
    console.log('🔍 Checking rental_orders table...');
    
    try {
        // Try to query the table directly
        const { data, error, count } = await supabase
            .from('rental_orders')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Error accessing rental_orders table:', error);
            console.log('🔍 Table likely does not exist');
            return false;
        }

        console.log(`✅ rental_orders table exists with ${count} records`);

        // Get a sample record to see the structure
        const { data: sampleData, error: sampleError } = await supabase
            .from('rental_orders')
            .select('*')
            .limit(1);

        if (sampleError) {
            console.error('❌ Error getting sample data:', sampleError);
        } else if (sampleData && sampleData.length > 0) {
            console.log('📋 Sample record structure:');
            console.log(Object.keys(sampleData[0]));
            console.log('\n📄 Sample record data:');
            console.log(JSON.stringify(sampleData[0], null, 2));
        }

        // Check status distribution
        const { data: statusData, error: statusError } = await supabase
            .from('rental_orders')
            .select('status, count(*)', { count: 'exact' })
            .limit(10);

        if (!statusError && statusData) {
            console.log('\n📊 Status distribution:');
            statusData.forEach(item => {
                console.log(`  ${item.status}: ${item.count}`);
            });
        }

        // Check subscription plans
        const { data: planData, error: planError } = await supabase
            .from('rental_orders')
            .select('subscription_plan, count(*)', { count: 'exact' })
            .limit(10);

        if (!planError && planData) {
            console.log('\n📋 Subscription plans:');
            planData.forEach(item => {
                console.log(`  ${item.subscription_plan}: ${item.count}`);
            });
        }

        return true;

    } catch (error) {
        console.error('💥 Unexpected error:', error);
        return false;
    }
}

// Run the script
checkTable()
    .then((exists) => {
        if (exists) {
            console.log('🎉 rental_orders table is accessible and has data');
        } else {
            console.log('❌ rental_orders table does not exist or is not accessible');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 