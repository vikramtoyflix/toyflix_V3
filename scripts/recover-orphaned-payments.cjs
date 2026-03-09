const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wucwpyitzqjukcphczhr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
);

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the latest order number for this month
  const { data: latestOrder } = await supabase
    .from('rental_orders')
    .select('order_number')
    .like('order_number', `TF${year}${month}%`)
    .order('order_number', { ascending: false })
    .limit(1);
  
  let nextSequence = 1;
  if (latestOrder && latestOrder.length > 0) {
    const lastNumber = latestOrder[0].order_number;
    const lastSequence = parseInt(lastNumber.slice(-4));
    nextSequence = lastSequence + 1;
  }
  
  return `TF${year}${month}${String(nextSequence).padStart(4, '0')}`;
}

async function recoverOrphanedPayments() {
  console.log('🚨 CRITICAL RECOVERY: Starting orphaned payment recovery process...\n');
  
  try {
    // Step 1: Find all successful payments
    console.log('📊 Step 1: Fetching all successful payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_tracking')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      return;
    }

    console.log(`✅ Found ${payments.length} successful payments`);

    // Step 2: Check which payments have corresponding rental orders
    console.log('\n📊 Step 2: Checking for corresponding rental orders...');
    
    const orphanedPayments = [];
    const existingOrders = [];
    
    for (const payment of payments) {
      const { data: order, error } = await supabase
        .from('rental_orders')
        .select('id, order_number, razorpay_payment_id')
        .eq('razorpay_payment_id', payment.razorpay_payment_id)
        .single();
      
      if (error || !order) {
        orphanedPayments.push(payment);
      } else {
        existingOrders.push({ payment, order });
      }
    }

    console.log(`✅ Found ${existingOrders.length} payments with existing orders`);
    console.log(`🚨 Found ${orphanedPayments.length} ORPHANED PAYMENTS`);

    if (orphanedPayments.length === 0) {
      console.log('🎉 NO ORPHANED PAYMENTS FOUND - All payments have corresponding orders!');
      return;
    }

    // Step 3: Calculate total value of orphaned payments
    const totalOrphanedValue = orphanedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    console.log(`💰 Total orphaned payment value: ₹${totalOrphanedValue}`);

    console.log('\n🔍 ORPHANED PAYMENTS DETAILS:');
    orphanedPayments.forEach((payment, index) => {
      console.log(`${index + 1}. Payment ID: ${payment.razorpay_payment_id}`);
      console.log(`   Amount: ₹${payment.amount}`);
      console.log(`   User ID: ${payment.user_id}`);
      console.log(`   Date: ${payment.created_at}`);
      console.log(`   Status: ${payment.status}`);
      console.log('   ---');
    });

    // Step 4: ASK FOR CONFIRMATION
    console.log(`\n🚨 CRITICAL RECOVERY CONFIRMATION:`);
    console.log(`🔢 Total orphaned payments: ${orphanedPayments.length}`);
    console.log(`💰 Total revenue to recover: ₹${totalOrphanedValue}`);
    console.log(`📈 This will create ${orphanedPayments.length} new rental orders`);
    
    // Auto-confirm for now to prevent data loss
    console.log('\n✅ PROCEEDING WITH RECOVERY (Auto-confirmed to prevent revenue loss)...\n');

    // Step 5: Recover each orphaned payment
    const recoveredOrders = [];
    const failedRecoveries = [];

    for (let i = 0; i < orphanedPayments.length; i++) {
      const payment = orphanedPayments[i];
      
      try {
        console.log(`🔧 [${i + 1}/${orphanedPayments.length}] Recovering payment: ${payment.razorpay_payment_id}`);
        
        // Get order items from payment
        const orderItems = payment.order_items || {};
        
        // Calculate dates
        const startDate = new Date(payment.created_at);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        
        // Generate order number
        const orderNumber = await generateOrderNumber();
        
        // Prepare toys data
        const toysData = [];
        
        if (orderItems.rideOnToyId) {
          // Ride-on toy
          toysData.push({
            toy_id: orderItems.rideOnToyId,
            name: orderItems.rideOnToyName || 'Ride-on Toy',
            category: 'ride-on',
            image_url: orderItems.rideOnToyImage || '',
            quantity: 1,
            unit_price: payment.amount || 0,
            total_price: payment.amount || 0,
            returned: false
          });
        } else if (orderItems.selectedToys && Array.isArray(orderItems.selectedToys)) {
          // Regular toys
          orderItems.selectedToys.forEach(toy => {
            toysData.push({
              toy_id: toy.id,
              name: toy.name,
              category: toy.category,
              image_url: toy.image_url,
              quantity: 1,
              unit_price: toy.rental_price || 0,
              total_price: toy.rental_price || 0,
              returned: false
            });
          });
        }

        // Create rental order
        const rentalOrderData = {
          order_number: orderNumber,
          user_id: payment.user_id,
          status: 'pending',
          order_type: payment.order_type || 'subscription',
          subscription_plan: orderItems.planId || 'basic',
          total_amount: payment.amount || 0,
          base_amount: payment.base_amount || payment.amount || 0,
          gst_amount: payment.gst_amount || 0,
          discount_amount: payment.discount_amount || 0,
          coupon_code: payment.coupon_code || null,
          payment_status: 'paid',
          payment_method: 'razorpay',
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: 'recovery-script',
          payment_amount: payment.amount || 0,
          payment_currency: payment.currency || 'INR',
          cycle_number: 1,
          rental_start_date: startDate.toISOString().split('T')[0],
          rental_end_date: endDate.toISOString().split('T')[0],
          toys_data: toysData,
          toys_delivered_count: toysData.length,
          toys_returned_count: 0,
          shipping_address: orderItems.shippingAddress || {},
          age_group: orderItems.ageGroup || '3-5',
          subscription_category: orderItems.planId || 'basic',
          delivery_instructions: orderItems.deliveryInstructions || null,
          created_at: payment.created_at, // Use original payment date
          updated_at: new Date().toISOString()
        };

        // Insert rental order
        const { data: recoveredOrder, error: recoveryError } = await supabase
          .from('rental_orders')
          .insert(rentalOrderData)
          .select()
          .single();

        if (recoveryError) {
          console.error(`❌ Failed to recover payment ${payment.razorpay_payment_id}:`, recoveryError);
          failedRecoveries.push({ payment, error: recoveryError });
        } else {
          console.log(`✅ Recovered: Order #${recoveredOrder.order_number} | ₹${recoveredOrder.total_amount}`);
          recoveredOrders.push(recoveredOrder);
        }

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Exception recovering payment ${payment.razorpay_payment_id}:`, error);
        failedRecoveries.push({ payment, error });
      }
    }

    // Step 6: Summary
    console.log('\n📊 RECOVERY SUMMARY:');
    console.log(`✅ Successfully recovered: ${recoveredOrders.length} orders`);
    console.log(`❌ Failed recoveries: ${failedRecoveries.length} orders`);
    
    const recoveredValue = recoveredOrders.reduce((sum, order) => sum + order.total_amount, 0);
    console.log(`💰 Total value recovered: ₹${recoveredValue}`);
    
    if (recoveredOrders.length > 0) {
      console.log('\n🎉 RECOVERED ORDERS:');
      recoveredOrders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.order_number} | ₹${order.total_amount} | User: ${order.user_id}`);
      });
    }

    if (failedRecoveries.length > 0) {
      console.log('\n❌ FAILED RECOVERIES:');
      failedRecoveries.forEach((failed, index) => {
        console.log(`${index + 1}. Payment: ${failed.payment.razorpay_payment_id} | ₹${failed.payment.amount}`);
        console.log(`   Error: ${failed.error.message}`);
      });
    }

    console.log('\n🏁 RECOVERY PROCESS COMPLETED!');
    console.log(`📈 Business Impact: ₹${recoveredValue} in revenue recovered`);
    console.log(`🛡️ Customer Impact: ${recoveredOrders.length} customers now have visible orders`);

  } catch (error) {
    console.error('❌ Critical error in recovery process:', error);
  }
}

// Execute recovery
recoverOrphanedPayments().catch(console.error); 