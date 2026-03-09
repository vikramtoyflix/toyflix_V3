import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://xqpwvkjxjwrwjuqjuquz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxcHd2a2p4and3d2p1cWp1cXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNzE1NjI5MSwiZXhwIjoyMDMyNzMyMjkxfQ.UlL1WpwW4jht4jqd8mIQRkj_vKNVlTx8_Bpk2mEhMdM';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSamplePaymentData() {
  console.log('🚀 Creating sample payment and subscription data...');

  try {
    // Step 1: Get existing users and orders
    const { data: users, error: usersError } = await supabase
      .from('custom_users')
      .select('*')
      .limit(2);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(2);

    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    if (!users.length || !orders.length) {
      console.log('❌ No users or orders found. Please run create-sample-orders.js first');
      return;
    }

    console.log(`📊 Found ${users.length} users and ${orders.length} orders`);

    // Step 2: Create subscribers data (subscription status)
    const subscribersData = users.map((user, index) => ({
      user_id: user.id,
      email: user.email || `${user.phone}@example.com`,
      subscribed: true,
      subscription_tier: index === 0 ? 'premium' : 'basic',
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      payment_status: 'completed',
      last_payment_date: new Date().toISOString(),
      razorpay_customer_id: `cust_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert subscribers
    const { data: insertedSubscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .upsert(subscribersData, { onConflict: 'user_id' })
      .select();

    if (subscribersError) {
      console.warn('⚠️ Error creating subscribers (table may not exist):', subscribersError.message);
    } else {
      console.log(`✅ Subscribers created: ${insertedSubscribers.length}`);
    }

    // Step 3: Try to create payment tracking data (if table exists)
    console.log('💳 Attempting to create payment tracking data...');
    
    const paymentTrackingData = orders.map((order, index) => ({
      razorpay_order_id: `order_${Math.random().toString(36).substr(2, 12)}`,
      razorpay_payment_id: `pay_${Math.random().toString(36).substr(2, 12)}`,
      user_id: order.user_id,
      base_amount: order.base_amount || order.total_amount * 0.85,
      gst_amount: order.gst_amount || order.total_amount * 0.15,
      total_amount: order.total_amount,
      currency: 'INR',
      status: index === 0 ? 'completed' : 'created',
      order_type: 'subscription',
      order_items: {
        plan_id: index === 0 ? 'premium' : 'basic',
        selected_toys: ['toy1', 'toy2'],
        age_group: '3-5',
        shipping_address: {
          first_name: users[index]?.first_name || 'Sample',
          last_name: users[index]?.last_name || 'User',
          phone: users[index]?.phone || '9876543210',
          address_line1: 'Sample Address',
          city: 'Bangalore',
          state: 'Karnataka',
          postcode: '560001',
          country: 'India'
        }
      },
      user_email: users[index]?.email || `${users[index]?.phone}@example.com`,
      user_phone: users[index]?.phone || '9876543210',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Try to insert payment tracking data using raw SQL (since table might not be in types)
    for (const paymentData of paymentTrackingData) {
      try {
        const { error: paymentError } = await supabase
          .from('payment_tracking')
          .insert(paymentData);
        
        if (paymentError) {
          console.warn('⚠️ Payment tracking insert failed:', paymentError.message);
        } else {
          console.log('✅ Payment tracking record created');
        }
      } catch (paymentException) {
        console.warn('⚠️ Payment tracking table may not exist:', paymentException.message);
      }
    }

    // Step 4: Try to create subscription tracking data
    console.log('📅 Attempting to create subscription tracking data...');
    
    const subscriptionTrackingData = users.map((user, index) => ({
      user_id: user.id,
      razorpay_payment_id: paymentTrackingData[index]?.razorpay_payment_id || `pay_${Math.random().toString(36).substr(2, 12)}`,
      razorpay_order_id: paymentTrackingData[index]?.razorpay_order_id || `order_${Math.random().toString(36).substr(2, 12)}`,
      plan_id: index === 0 ? 'premium' : 'basic',
      subscription_type: 'monthly',
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      current_period_start: new Date().toISOString().split('T')[0],
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      selected_toys: ['educational_toy_1', 'musical_toy_2'],
      age_group: '3-5',
      ride_on_toy_id: null,
      payment_amount: orders[index]?.total_amount || 1500,
      payment_currency: 'INR',
      order_items: {
        plan_id: index === 0 ? 'premium' : 'basic',
        selected_toys: ['toy1', 'toy2'],
        age_group: '3-5'
      },
      shipping_address: {
        first_name: user.first_name || 'Sample',
        last_name: user.last_name || 'User',
        phone: user.phone || '9876543210',
        address_line1: 'Sample Address',
        city: 'Bangalore',
        state: 'Karnataka',
        postcode: '560001',
        country: 'India'
      },
      delivery_instructions: null,
      synced_to_main: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    for (const subscriptionData of subscriptionTrackingData) {
      try {
        const { error: subscriptionError } = await supabase
          .from('subscription_tracking')
          .insert(subscriptionData);
        
        if (subscriptionError) {
          console.warn('⚠️ Subscription tracking insert failed:', subscriptionError.message);
        } else {
          console.log('✅ Subscription tracking record created');
        }
      } catch (subscriptionException) {
        console.warn('⚠️ Subscription tracking table may not exist:', subscriptionException.message);
      }
    }

    // Step 5: Update orders with shipping address JSON
    console.log('📦 Updating orders with shipping address data...');
    
    for (let i = 0; i < orders.length && i < users.length; i++) {
      const order = orders[i];
      const user = users[i];
      
      const shippingAddress = {
        first_name: user.first_name || 'Sample',
        last_name: user.last_name || 'User',
        phone: user.phone || '9876543210',
        email: user.email || `${user.phone}@example.com`,
        address_line1: `${i + 1} Sample Street, Sample Layout`,
        address_line2: i === 0 ? 'Near Sample Mall' : '',
        city: 'Bangalore',
        state: 'Karnataka',
        postcode: '56000' + (i + 1),
        country: 'India'
      };

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          shipping_address: shippingAddress,
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.warn(`⚠️ Error updating order ${order.id}:`, updateError.message);
      } else {
        console.log(`✅ Order ${order.id} updated with shipping address`);
      }
    }

    console.log('\n🎉 Sample payment and subscription data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Subscribers: ${subscribersData.length}`);
    console.log(`   - Payment Tracking: ${paymentTrackingData.length} (attempted)`);
    console.log(`   - Subscription Tracking: ${subscriptionTrackingData.length} (attempted)`);
    console.log(`   - Orders Updated: ${orders.length}`);
    console.log('\n🔗 You can now test the enhanced comprehensive order details with:');
    console.log('   - Subscription status information');
    console.log('   - Payment verification placeholders');
    console.log('   - Enhanced shipping address data');
    console.log('   - Subscription period information');

  } catch (error) {
    console.error('❌ Error creating sample payment data:', error.message);
    process.exit(1);
  }
}

// Run the script
createSamplePaymentData(); 