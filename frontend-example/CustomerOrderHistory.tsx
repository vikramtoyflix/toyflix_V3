import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface EnrichedCustomer {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized: string;
  total_lifetime_value: number;
  total_orders: number;
  average_order_value: number;
  customer_tier: string;
  primary_child_age_group: string;
  has_historical_data: boolean;
  historical_orders_count: number;
  historical_lifetime_value: number;
  data_source: 'current' | 'historical' | 'merged';
}

interface OrderHistory {
  id: string;
  order_date: string;
  total_amount: number;
  status: string;
  data_source: 'current' | 'historical';
  is_current: boolean;
  item_count: number;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const CustomerOrderHistory: React.FC<{ customerId: string }> = ({ customerId }) => {
  const [customer, setCustomer] = useState<EnrichedCustomer | null>(null);
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'historical' | 'all'>('all');

  useEffect(() => {
    fetchCustomerData();
    fetchOrderHistory();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      // Fetch enriched customer profile from unified view
      const { data: customerData, error } = await supabase
        .from('enriched_customer_view')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      setCustomer(customerData);
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      // Fetch unified order history (current + historical, properly sorted)
      const { data: ordersData, error } = await supabase
        .from('unified_order_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_current', { ascending: false }) // Current orders first
        .order('order_date', { ascending: false }); // Then by date (newest first)

      if (error) throw error;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId: string, isCurrentOrder: boolean) => {
    try {
      // Query appropriate table based on order source
      const tableName = isCurrentOrder ? 'order_items' : 'migration_order_items';
      
      const { data: itemsData, error } = await supabase
        .from('order_items_detail_view')
        .select('*')
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(itemsData || []);
      setSelectedOrder(orderId);
    } catch (error) {
      console.error('Error fetching order items:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'current') return order.is_current;
    if (activeTab === 'historical') return !order.is_current;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading customer data...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Customer Profile Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {customer.first_name?.[0]}{customer.last_name?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {customer.first_name} {customer.last_name}
                </h1>
                <p className="text-gray-600">@{customer.username}</p>
                <p className="text-sm text-gray-500">{customer.email}</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Customer Tier</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                customer.customer_tier === 'high_value' ? 'bg-gold-100 text-gold-800' :
                customer.customer_tier === 'regular' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {customer.customer_tier?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            {customer.has_historical_data && (
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
                <p className="text-xs text-gray-500">Historical Data</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(customer.total_lifetime_value)}
            </p>
            <p className="text-sm text-gray-500">Total Lifetime Value</p>
            {customer.historical_lifetime_value > 0 && (
              <p className="text-xs text-green-600">
                +{formatCurrency(customer.historical_lifetime_value)} historical
              </p>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{customer.total_orders}</p>
            <p className="text-sm text-gray-500">Total Orders</p>
            {customer.historical_orders_count > 0 && (
              <p className="text-xs text-green-600">
                +{customer.historical_orders_count} historical
              </p>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(customer.average_order_value)}
            </p>
            <p className="text-sm text-gray-500">Average Order Value</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{customer.primary_child_age_group}</p>
            <p className="text-sm text-gray-500">Primary Age Group</p>
          </div>
        </div>
      </div>

      {/* Order History Section */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Order History</h2>
            
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {['all', 'current', 'historical'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  <span className="ml-1 text-xs">
                    ({tab === 'all' ? orders.length : 
                      tab === 'current' ? orders.filter(o => o.is_current).length :
                      orders.filter(o => !o.is_current).length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="divide-y divide-gray-200">
          {filteredOrders.map((order) => (
            <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      order.is_current ? 'bg-blue-500' : 'bg-orange-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Order #{order.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.order_date)} • 
                        <span className="ml-1 capitalize">{order.status}</span> • 
                        <span className="ml-1">{order.item_count} items</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.is_current ? 'Current System' : 'Historical Data'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => fetchOrderItems(order.id, order.is_current)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No orders found for the selected filter.
          </div>
        )}
      </div>

      {/* Order Details Modal/Panel */}
      {selectedOrder && orderItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Details</h3>
            <button
              onClick={() => {
                setSelectedOrder(null);
                setOrderItems([]);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-gray-600">
                    Quantity: {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderHistory; 