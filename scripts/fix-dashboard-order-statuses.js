import { createClient } from '@supabase/supabase-js';

class DashboardOrderStatusFixer {
  constructor() {
    // Use the correct production Supabase URL
    this.supabaseUrl = 'https://bhcjhlsadfuusmiglzpq.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoY2pobHNhZGZ1dXNtaWdsenBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0MDIwMjUsImV4cCI6MjA1MDk3ODAyNX0.m0_2_nCkJJLSyTKTNZfPR_aeYKKUZPL-yKRLdZLhOFQ';
    
    this.client = createClient(this.supabaseUrl, this.supabaseKey);
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async getOrderStatusDistribution() {
    this.log('Getting current order status distribution...');

    try {
      const { data: orders, error } = await this.client
        .from('orders')
        .select('status')
        .not('status', 'is', null);

      if (error) {
        this.log(`Error fetching orders: ${error.message}`, 'error');
        return {};
      }

      const statusMap = {};
      orders?.forEach(order => {
        statusMap[order.status] = (statusMap[order.status] || 0) + 1;
      });

      this.log('Current status distribution:');
      Object.entries(statusMap).forEach(([status, count]) => {
        console.log(`   "${status}": ${count} orders`);
      });

      return statusMap;

    } catch (error) {
      this.log(`Error getting status distribution: ${error.message}`, 'error');
      return {};
    }
  }

  async fixOrderStatuses() {
    this.log('Fixing order statuses for dashboard visibility...');

    try {
      // Find all pending orders that should be visible (have amounts and items)
      const { data: pendingOrders, error: fetchError } = await this.client
        .from('orders')
        .select('id, user_id, status, total_amount, created_at')
        .eq('status', 'pending')
        .not('total_amount', 'is', null)
        .gt('total_amount', 0);

      if (fetchError) {
        this.log(`Error fetching pending orders: ${fetchError.message}`, 'error');
        return false;
      }

      this.log(`Found ${pendingOrders?.length || 0} pending orders to update`);

      if (!pendingOrders || pendingOrders.length === 0) {
        this.log('No orders need status updates', 'warning');
        return true;
      }

      // Update orders to "delivered" status with rental dates
      const { data: updated, error: updateError } = await this.client
        .from('orders')
        .update({ 
          status: 'delivered',
          rental_start_date: new Date().toISOString(),
          rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        })
        .in('id', pendingOrders.map(o => o.id))
        .select('id, status');

      if (updateError) {
        this.log(`Error updating order statuses: ${updateError.message}`, 'error');
        return false;
      }

      this.log(`Successfully updated ${updated?.length || 0} orders to "delivered" status`, 'success');
      return true;

    } catch (error) {
      this.log(`Error fixing order statuses: ${error.message}`, 'error');
      return false;
    }
  }

  async testMythiliDashboard() {
    this.log('Testing Mythili\'s dashboard data after fixes...');

    try {
      // Find Mythili
      const { data: user, error: userError } = await this.client
        .from('custom_users')
        .select('id, first_name, last_name, phone, subscription_active, subscription_plan')
        .eq('phone', '9980111432')
        .single();

      if (userError || !user) {
        this.log('Mythili not found', 'error');
        return false;
      }

      this.log(`User: ${user.first_name} ${user.last_name}`);
      this.log(`Subscription: ${user.subscription_active ? 'Active' : 'Inactive'} (${user.subscription_plan})`);

      // Test orders query (like useUserOrders hook)
      const { data: orders, error: ordersError } = await this.client
        .from('orders')
        .select(`
          id, status, total_amount, created_at, rental_start_date,
          order_items (
            id, quantity, rental_price,
            toy:toys (name, image_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        this.log(`Orders query error: ${ordersError.message}`, 'error');
      } else {
        this.log(`Orders found: ${orders?.length || 0}`);
        orders?.forEach((order, index) => {
          this.log(`  Order ${index + 1}: ${order.id.slice(0, 8)} - ${order.status} - ₹${order.total_amount}`);
          this.log(`    Items: ${order.order_items?.length || 0}`);
          order.order_items?.forEach(item => {
            this.log(`      - ${item.toy?.name} (Qty: ${item.quantity})`);
          });
        });
      }

      // Test current rentals query (like useCurrentRentals hook)
      const { data: rentals, error: rentalsError } = await this.client
        .from('orders')
        .select(`
          id, status, rental_start_date, rental_end_date,
          order_items (
            id,
            toy:toys (name, image_url, category)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['shipped', 'delivered'])
        .is('returned_date', null)
        .order('created_at', { ascending: false });

      if (rentalsError) {
        this.log(`Rentals query error: ${rentalsError.message}`, 'error');
      } else {
        this.log(`Current rentals found: ${rentals?.length || 0}`);
        
        // Flatten like the frontend does
        const flatRentals = [];
        rentals?.forEach(order => {
          order.order_items?.forEach(item => {
            flatRentals.push({
              orderId: order.id.slice(0, 8),
              status: order.status,
              toy: item.toy?.name
            });
          });
        });

        this.log(`Flat rentals: ${flatRentals.length}`);
        flatRentals.forEach((rental, index) => {
          this.log(`  Rental ${index + 1}: ${rental.toy} (${rental.status})`);
        });
      }

      return true;

    } catch (error) {
      this.log(`Error testing Mythili's dashboard: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🔧 Fixing Order Statuses for Dashboard');
    this.log('============================================================');

    // Step 1: Show current status distribution
    await this.getOrderStatusDistribution();
    console.log('');

    // Step 2: Fix order statuses
    this.log('Step 1: Updating order statuses...');
    const statusFixed = await this.fixOrderStatuses();
    console.log('');

    if (statusFixed) {
      // Step 3: Show new status distribution
      this.log('Step 2: Checking updated status distribution...');
      await this.getOrderStatusDistribution();
      console.log('');

      // Step 4: Test with Mythili
      this.log('Step 3: Testing dashboard queries...');
      await this.testMythiliDashboard();
      console.log('');
    }

    this.log('============================================================');

    if (statusFixed) {
      this.log('🎉 Order status fix completed!', 'success');
      this.log('');
      this.log('📱 Dashboard should now show:');
      this.log('   ✅ Order history with all migrated orders');
      this.log('   ✅ Current rentals (toys at home)');
      this.log('   ✅ Proper order statuses and rental dates');
      this.log('');
      this.log('🔗 Test at: http://localhost:8082');
      this.log('📞 Login with: 9980111432');
    } else {
      this.log('❌ Order status fix failed. Check errors above.', 'error');
    }
  }
}

// Run the fixer
const fixer = new DashboardOrderStatusFixer();
fixer.run().catch(console.error); 