/**
 * Simple JavaScript Example - Core Concepts
 * 
 * This shows the key database queries without React complexity.
 * You can adapt these patterns to any frontend framework.
 */

// 1. Initialize Supabase client (works in any JavaScript environment)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'your-supabase-url',
  'your-supabase-anon-key'
);

// 2. CORE PATTERN: Get enriched customer profile
async function getCustomerProfile(customerId) {
  const { data: customer, error } = await supabase
    .from('enriched_customer_view')
    .select(`
      id,
      username,
      first_name,
      last_name,
      email,
      phone,
      total_lifetime_value,
      total_orders,
      historical_orders_count,
      historical_lifetime_value,
      has_historical_data,
      customer_tier,
      data_source
    `)
    .eq('id', customerId)
    .single();

  if (error) {
    console.error('Error fetching customer:', error);
    return null;
  }

  console.log('📊 Customer Profile:', {
    name: `${customer.first_name} ${customer.last_name}`,
    tier: customer.customer_tier,
    totalValue: customer.total_lifetime_value,
    historicalValue: customer.historical_lifetime_value,
    totalOrders: customer.total_orders,
    historicalOrders: customer.historical_orders_count,
    hasHistoricalData: customer.has_historical_data
  });

  return customer;
}

// 3. CORE PATTERN: Get unified order history (current + historical)
async function getOrderHistory(customerId) {
  const { data: orders, error } = await supabase
    .from('unified_order_history')
    .select(`
      id,
      order_date,
      total_amount,
      status,
      is_current,
      data_source,
      item_count
    `)
    .eq('customer_id', customerId)
    .order('is_current', { ascending: false })  // Current orders first
    .order('order_date', { ascending: false }); // Then by date (newest first)

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  // Separate current and historical orders for display
  const currentOrders = orders.filter(order => order.is_current);
  const historicalOrders = orders.filter(order => !order.is_current);

  console.log('📋 Order Summary:', {
    totalOrders: orders.length,
    currentOrders: currentOrders.length,
    historicalOrders: historicalOrders.length,
    totalValue: orders.reduce((sum, order) => sum + order.total_amount, 0)
  });

  return { all: orders, current: currentOrders, historical: historicalOrders };
}

// 4. CORE PATTERN: Get order details (works for both current and historical)
async function getOrderDetails(orderId) {
  const { data: items, error } = await supabase
    .from('order_items_detail_view')
    .select(`
      id,
      product_name,
      quantity,
      unit_price,
      total_price
    `)
    .eq('order_id', orderId);

  if (error) {
    console.error('Error fetching order items:', error);
    return [];
  }

  console.log('🛍️ Order Items:', items);
  return items;
}

// 5. CORE PATTERN: Search customers with unified data
async function searchCustomers(searchTerm, tier = 'all') {
  let query = supabase
    .from('customer_business_intelligence')
    .select(`
      id,
      username,
      first_name,
      last_name,
      email,
      phone_normalized,
      total_lifetime_value,
      total_orders,
      customer_tier,
      has_historical_data,
      data_source
    `);

  // Add search filter
  if (searchTerm) {
    query = query.or(`
      first_name.ilike.%${searchTerm}%,
      last_name.ilike.%${searchTerm}%,
      email.ilike.%${searchTerm}%,
      username.ilike.%${searchTerm}%,
      phone_normalized.like.%${searchTerm}%
    `);
  }

  // Add tier filter
  if (tier !== 'all') {
    query = query.eq('customer_tier', tier);
  }

  // Sort by lifetime value (highest first)
  query = query.order('total_lifetime_value', { ascending: false });

  const { data: customers, error } = await query;

  if (error) {
    console.error('Error searching customers:', error);
    return [];
  }

  console.log('🔍 Search Results:', {
    totalFound: customers.length,
    withHistoricalData: customers.filter(c => c.has_historical_data).length,
    averageValue: customers.reduce((sum, c) => sum + c.total_lifetime_value, 0) / customers.length
  });

  return customers;
}

// 6. USAGE EXAMPLES

async function demonstrateUsage() {
  console.log('🚀 Demonstrating Unified Customer History Views\n');

  // Example: Get a specific customer's complete profile
  const customerId = 'some-customer-uuid';
  
  console.log('1️⃣ Getting customer profile...');
  const customer = await getCustomerProfile(customerId);
  
  if (customer) {
    console.log('\n2️⃣ Getting order history...');
    const orders = await getOrderHistory(customerId);
    
    if (orders.all.length > 0) {
      console.log('\n3️⃣ Getting details for latest order...');
      const latestOrder = orders.all[0];
      const orderItems = await getOrderDetails(latestOrder.id);
    }
  }

  console.log('\n4️⃣ Searching for high-value customers...');
  const highValueCustomers = await searchCustomers('', 'high_value');

  console.log('\n5️⃣ Searching by phone number...');
  const phoneResults = await searchCustomers('9876543210');

  console.log('\n✅ Demo complete! Check the console for detailed outputs.');
}

// 7. HELPER FUNCTIONS

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// 8. KEY BENEFITS OF THIS APPROACH

/*
✅ WHAT THIS ACHIEVES:

1. UNIFIED DATA ACCESS
   - Single query gets complete customer picture
   - No need to join current + historical tables manually
   - Consistent API regardless of data source

2. SMART SORTING
   - Current orders always appear first
   - Historical orders follow chronologically
   - No confusion about timeline

3. RICH ANALYTICS
   - Combined lifetime value calculations
   - Historical data contribution visible
   - Segment customers by data completeness

4. FLEXIBLE SEARCHING
   - Search across all data sources simultaneously
   - Phone number normalization enables better matching
   - Filter by customer tiers and attributes

5. PERFORMANCE OPTIMIZED
   - Database views pre-calculate aggregations
   - Efficient queries with proper indexing
   - Minimal frontend complexity

6. FUTURE-PROOF
   - Easy to add more historical data sources
   - Views abstract away underlying table complexity
   - Frontend code doesn't need to change
*/

// Run the demonstration
// demonstrateUsage();

// Export functions for use in other modules
export {
  getCustomerProfile,
  getOrderHistory,
  getOrderDetails,
  searchCustomers,
  formatCurrency,
  formatDate
}; 