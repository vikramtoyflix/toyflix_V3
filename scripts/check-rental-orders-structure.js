import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

// Expected columns for rental_orders table
const expectedColumns = [
  'id', 'order_number', 'user_id', 'legacy_order_id', 'legacy_created_at', 'migrated_at',
  'status', 'order_type', 'subscription_plan', 'subscription_id', 'subscription_category', 'age_group',
  'total_amount', 'base_amount', 'gst_amount', 'discount_amount', 'payment_amount', 'payment_currency',
  'payment_status', 'payment_method', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'coupon_code',
  'cycle_number', 'rental_start_date', 'rental_end_date',
  'delivery_date', 'returned_date', 'return_status',
  'toys_data', 'toys_delivered_count', 'toys_returned_count',
  'shipping_address', 'delivery_instructions', 'pickup_instructions',
  'next_cycle_address', 'next_cycle_toys_selected', 'next_cycle_prepared',
  'quality_rating', 'feedback', 'damage_reported', 'damage_details',
  'admin_notes', 'internal_status', 'dispatch_tracking_number', 'return_tracking_number',
  'user_phone',
  'created_at', 'updated_at', 'created_by', 'updated_by',
  'confirmed_at', 'shipped_at', 'delivered_at', 'cancelled_at'
];

async function checkRentalOrdersStructure() {
    console.log('🔍 Checking rental_orders table structure...');
    console.log('=' .repeat(80));
    
    try {
        // 1. Check if table exists and get basic info
        const { data, error, count } = await supabase
            .from('rental_orders')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ rental_orders table does not exist or cannot be accessed:', error);
            return false;
        }

        console.log(`✅ rental_orders table exists with ${count} records`);

        // 2. Get table structure by fetching one record
        const { data: sampleData, error: sampleError } = await supabase
            .from('rental_orders')
            .select('*')
            .limit(1);

        let actualColumns = [];
        
        if (sampleError && sampleError.code !== 'PGRST116') {
            console.error('❌ Error getting table structure:', sampleError);
            return false;
        }

        if (sampleData && sampleData.length > 0) {
            actualColumns = Object.keys(sampleData[0]);
            console.log(`📋 Table has data. Found ${actualColumns.length} columns from sample record.`);
        } else {
            console.log('📋 Table is empty. Let me check columns using information schema...');
            
            // Try to get column info from information_schema
            try {
                const { data: columnData, error: columnError } = await supabase
                    .from('information_schema.columns')
                    .select('column_name, data_type, is_nullable')
                    .eq('table_schema', 'public')
                    .eq('table_name', 'rental_orders')
                    .order('ordinal_position');

                if (!columnError && columnData) {
                    actualColumns = columnData.map(col => col.column_name);
                    console.log(`📋 Found ${actualColumns.length} columns from schema.`);
                    
                    console.log('\n📊 Column Details:');
                    columnData.forEach(col => {
                        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
                    });
                }
            } catch (schemaError) {
                console.log('⚠️ Could not access information_schema, will test with insert attempt...');
            }
        }

        if (actualColumns.length === 0) {
            console.log('⚠️ Could not determine table structure. Testing with sample insert...');
            
            // Try a test insert to see what columns are expected
            try {
                const testData = {
                    order_number: 'TEST-001',
                    user_id: '00000000-0000-0000-0000-000000000000',
                    status: 'pending',
                    rental_start_date: '2025-01-01',
                    rental_end_date: '2025-01-31'
                };
                
                const { error: insertError } = await supabase
                    .from('rental_orders')
                    .insert(testData)
                    .select();
                
                if (!insertError) {
                    console.log('✅ Basic required columns are present');
                    // Clean up test record
                    await supabase
                        .from('rental_orders')
                        .delete()
                        .eq('order_number', 'TEST-001');
                } else {
                    console.log('❌ Insert test failed:', insertError.message);
                }
            } catch (testError) {
                console.log('❌ Test insert failed:', testError.message);
            }
        }

        // 3. Compare with expected columns
        if (actualColumns.length > 0) {
            console.log('\n🔍 Column Comparison:');
            console.log(`Expected: ${expectedColumns.length} columns`);
            console.log(`Actual: ${actualColumns.length} columns`);
            
            const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
            const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
            
            if (missingColumns.length === 0) {
                console.log('✅ All expected columns are present!');
            } else {
                console.log(`❌ Missing ${missingColumns.length} columns:`);
                missingColumns.forEach(col => console.log(`  - ${col}`));
            }
            
            if (extraColumns.length > 0) {
                console.log(`ℹ️ Extra columns (${extraColumns.length}):`);
                extraColumns.forEach(col => console.log(`  - ${col}`));
            }
            
            // 4. Check key columns for migration
            const criticalColumns = ['toys_data', 'subscription_plan', 'user_phone', 'cycle_number'];
            const missingCritical = criticalColumns.filter(col => !actualColumns.includes(col));
            
            if (missingCritical.length === 0) {
                console.log('✅ All critical columns for migration are present!');
            } else {
                console.log(`❌ Missing critical columns for migration:`);
                missingCritical.forEach(col => console.log(`  - ${col}`));
            }
        }

        // 5. Test essential operations
        console.log('\n🧪 Testing essential operations...');
        
        // Test user lookup
        try {
            const { data: users, error: userError } = await supabase
                .from('custom_users')
                .select('id, phone')
                .limit(1);
            
            if (userError) {
                console.log('❌ custom_users table issue:', userError.message);
            } else {
                console.log(`✅ custom_users table accessible (${users?.length || 0} users found)`);
            }
        } catch (userTestError) {
            console.log('❌ custom_users test failed:', userTestError.message);
        }

        // Test OTP table
        try {
            const { data: otpData, error: otpError } = await supabase
                .from('otp_verifications')
                .select('*', { count: 'exact', head: true });
            
            if (otpError) {
                console.log('❌ otp_verifications table issue:', otpError.message);
            } else {
                console.log(`✅ otp_verifications table accessible (${otpData || 0} records)`);
            }
        } catch (otpTestError) {
            console.log('❌ otp_verifications test failed:', otpTestError.message);
        }

        return actualColumns.length > 0;

    } catch (error) {
        console.error('💥 Unexpected error:', error);
        return false;
    }
}

// Run the script
checkRentalOrdersStructure()
    .then((success) => {
        console.log('\n' + '='.repeat(80));
        if (success) {
            console.log('🎉 rental_orders table structure check completed successfully');
            console.log('✅ The table appears ready for migration operations');
        } else {
            console.log('❌ rental_orders table has structural issues');
            console.log('⚠️ Migration may fail - consider running table creation script');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 