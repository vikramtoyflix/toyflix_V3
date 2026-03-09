import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function getTableStructure() {
    console.log('🔍 Getting rental_orders table structure...');
    
    try {
        // Get a real user ID first
        const { data: users, error: userError } = await supabase
            .from('custom_users')
            .select('id')
            .limit(1);

        if (userError || !users || users.length === 0) {
            console.error('❌ No valid users found:', userError);
            return;
        }

        const validUserId = users[0].id;
        console.log('✅ Found valid user ID:', validUserId);

        // Try to insert a test record with valid user ID
        const testData = {
            order_number: 'STRUCTURE-TEST-001',
            user_id: validUserId,
            status: 'pending',
            rental_start_date: '2025-01-01',
            rental_end_date: '2025-01-31',
            toys_data: []
        };

        console.log('🧪 Testing insert with valid user ID...');
        const { data: insertedData, error: insertError } = await supabase
            .from('rental_orders')
            .insert(testData)
            .select()
            .single();

        if (insertError) {
            console.log('❌ Insert failed:', insertError.message);
            console.log('❌ Insert error details:', insertError);
            
            // Try to understand what columns are missing
            if (insertError.message.includes('null value in column')) {
                console.log('⚠️ Some required columns are missing NULL constraints');
            }
        } else {
            console.log('✅ Test insert successful!');
            console.log('📋 Table structure from inserted record:');
            
            const columns = Object.keys(insertedData);
            console.log(`📊 Found ${columns.length} columns:`);
            columns.sort().forEach((col, index) => {
                const value = insertedData[col];
                const type = typeof value;
                console.log(`  ${(index + 1).toString().padStart(2)}: ${col.padEnd(25)} = ${value} (${type})`);
            });

            // Check critical migration columns
            const criticalColumns = ['toys_data', 'subscription_plan', 'user_phone', 'cycle_number', 'total_amount'];
            console.log('\n🔑 Critical migration columns:');
            criticalColumns.forEach(col => {
                const exists = columns.includes(col);
                console.log(`  ${exists ? '✅' : '❌'} ${col}`);
            });

            // Clean up test record
            await supabase
                .from('rental_orders')
                .delete()
                .eq('order_number', 'STRUCTURE-TEST-001');
            console.log('🧹 Cleaned up test record');
        }

        // Also check current data count
        const { data: existingData, error: countError, count } = await supabase
            .from('rental_orders')
            .select('*', { count: 'exact', head: true });

        if (!countError) {
            console.log(`\n📊 Current rental_orders data: ${count} records`);
        }

        // Check for existing migrated data
        if (count && count > 0) {
            const { data: sampleRecord, error: sampleError } = await supabase
                .from('rental_orders')
                .select('order_number, subscription_plan, toys_data, user_phone, status')
                .limit(1);

            if (!sampleError && sampleRecord && sampleRecord.length > 0) {
                console.log('\n📄 Sample existing record:');
                console.log(JSON.stringify(sampleRecord[0], null, 2));
            }
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

// Run the script
getTableStructure()
    .then(() => {
        console.log('\n🎉 Table structure check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 