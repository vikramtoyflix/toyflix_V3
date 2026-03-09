import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc'
);

async function createTestDispatchOrder() {
    console.log('🚀 Creating test dispatch order...');
    
    try {
        // Get a valid user ID first
        const { data: users, error: userError } = await supabase
            .from('custom_users')
            .select('id, phone')
            .limit(1);

        if (userError || !users || users.length === 0) {
            console.error('❌ No valid users found:', userError);
            return;
        }

        const validUser = users[0];
        console.log('✅ Using user:', validUser.id, validUser.phone);

        // Create test toys data
        const testToysData = [
            {
                id: 'toy-001',
                name: 'Building Blocks Set',
                title: 'Educational Building Blocks',
                description: 'Colorful wooden building blocks for creative play',
                category: 'educational',
                ageGroup: '3-6',
                quantity: 1,
                price: 0,
                deliveryStatus: 'pending',
                returnStatus: 'not_returned',
                condition: 'new',
                notes: ''
            },
            {
                id: 'toy-002', 
                name: 'Puzzle Book',
                title: 'Brain Training Puzzle Book',
                description: 'Activity book with various puzzles and games',
                category: 'books',
                ageGroup: '4-8',
                quantity: 1,
                price: 0,
                deliveryStatus: 'pending',
                returnStatus: 'not_returned',
                condition: 'new',
                notes: ''
            },
            {
                id: 'toy-003',
                name: 'Musical Toy Piano',
                title: 'Mini Piano for Kids',
                description: 'Small electronic piano with colorful keys',
                category: 'musical',
                ageGroup: '2-5',
                quantity: 1,
                price: 0,
                deliveryStatus: 'pending',
                returnStatus: 'not_returned',
                condition: 'new',
                notes: ''
            }
        ];

        // Test shipping address
        const testShippingAddress = {
            firstName: 'Test',
            lastName: 'Customer',
            phone: validUser.phone,
            address1: '123 Test Street',
            address2: 'Apt 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400001',
            country: 'IN',
            landmark: 'Near Test Mall',
            addressType: 'home'
        };

        // Create test order ready for dispatch
        const testOrderData = {
            order_number: `TEST-DISPATCH-${Date.now()}`,
            user_id: validUser.id,
            user_phone: validUser.phone,
            status: 'confirmed', // Ready for dispatch
            order_type: 'subscription',
            subscription_plan: 'Silver Pack',
            subscription_category: 'mixed',
            age_group: '3-8',
            
            // Financial info
            total_amount: 5999,
            base_amount: 4919,
            gst_amount: 1080,
            payment_amount: 5999,
            payment_status: 'paid',
            payment_method: 'razorpay',
            
            // Rental period
            cycle_number: 1,
            rental_start_date: new Date().toISOString().split('T')[0],
            rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            
            // Toys and delivery
            toys_data: testToysData,
            toys_delivered_count: 0,
            toys_returned_count: 0,
            shipping_address: testShippingAddress,
            
            // Admin info
            admin_notes: 'Test order created for dispatch testing',
            internal_status: 'active',
            
            // Timestamps
            created_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString()
        };

        console.log('📦 Creating test order with data:', {
            order_number: testOrderData.order_number,
            user_phone: testOrderData.user_phone,
            status: testOrderData.status,
            toys_count: testOrderData.toys_data.length
        });

        // Insert the test order
        const { data: insertedOrder, error: insertError } = await supabase
            .from('rental_orders')
            .insert([testOrderData])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error creating test order:', insertError);
            throw insertError;
        }

        console.log('✅ Test dispatch order created successfully!');
        console.log('📋 Order details:');
        console.log(`   - Order Number: ${insertedOrder.order_number}`);
        console.log(`   - Customer Phone: ${insertedOrder.user_phone}`);
        console.log(`   - Status: ${insertedOrder.status}`);
        console.log(`   - Subscription Plan: ${insertedOrder.subscription_plan}`);
        console.log(`   - Toys Count: ${insertedOrder.toys_data.length}`);
        console.log(`   - Total Amount: ₹${insertedOrder.total_amount}`);

        // Verify the order appears in dispatch queries
        const { data: pendingOrders, error: queryError } = await supabase
            .from('rental_orders')
            .select('id, order_number, status, user_phone, toys_data')
            .in('status', ['confirmed', 'pending']);

        if (queryError) {
            console.error('❌ Error querying orders:', queryError);
        } else {
            console.log(`\n📊 Total orders ready for dispatch: ${pendingOrders.length}`);
            pendingOrders.forEach(order => {
                console.log(`   - ${order.order_number}: ${order.status} (${order.toys_data?.length || 0} toys)`);
            });
        }

        return insertedOrder;

    } catch (error) {
        console.error('💥 Failed to create test dispatch order:', error);
        throw error;
    }
}

// Run the script
createTestDispatchOrder()
    .then((order) => {
        console.log('\n🎉 Test dispatch order creation completed successfully');
        console.log('✅ You can now test the dispatch functionality in the admin panel');
        console.log('🔗 Go to: Admin Panel → Dispatch → Pending Dispatch tab');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }); 