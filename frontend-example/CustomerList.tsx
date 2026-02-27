import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface CustomerSummary {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_normalized: string;
  total_lifetime_value: number;
  total_orders: number;
  customer_tier: string;
  has_historical_data: boolean;
  historical_orders_count: number;
  data_source: 'current' | 'historical' | 'merged';
  last_order_date: string;
}

interface CustomerListProps {
  onSelectCustomer: (customerId: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'orders' | 'recent'>('value');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      // Fetch customer summary from business intelligence view
      const { data: customersData, error } = await supabase
        .from('customer_business_intelligence')
        .select(`
          id,
          username,
          email,
          first_name,
          last_name,
          phone_normalized,
          total_lifetime_value,
          total_orders,
          customer_tier,
          has_historical_data,
          historical_orders_count,
          data_source,
          last_order_date
        `)
        .order('total_lifetime_value', { ascending: false });

      if (error) throw error;
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCustomers = customers
    .filter(customer => {
      const matchesSearch = 
        customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone_normalized?.includes(searchTerm);

      const matchesTier = filterTier === 'all' || customer.customer_tier === filterTier;

      return matchesSearch && matchesTier;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'value':
          return b.total_lifetime_value - a.total_lifetime_value;
        case 'orders':
          return b.total_orders - a.total_orders;
        case 'recent':
          return new Date(b.last_order_date || 0).getTime() - new Date(a.last_order_date || 0).getTime();
        default:
          return 0;
      }
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No orders';
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
        <span className="ml-2 text-gray-600">Loading customers...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header with Search and Filters */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customer Directory</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAndSortedCustomers.length} of {customers.length} customers
            </p>
          </div>

          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter by Tier */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Tiers</option>
              <option value="high_value">High Value</option>
              <option value="regular">Regular</option>
              <option value="new">New</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="value">Lifetime Value</option>
              <option value="orders">Order Count</option>
              <option value="name">Name</option>
              <option value="recent">Recent Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
        {filteredAndSortedCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer.id)}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {customer.first_name?.[0]}{customer.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">@{customer.username}</p>
                    <p className="text-xs text-gray-400 truncate">{customer.email}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Lifetime Value</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(customer.total_lifetime_value)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold">{customer.total_orders}</span>
                      {customer.historical_orders_count > 0 && (
                        <span className="text-xs text-orange-600">
                          (+{customer.historical_orders_count})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Order</span>
                    <span className="text-sm text-gray-900">
                      {formatDate(customer.last_order_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                customer.customer_tier === 'high_value' ? 'bg-yellow-100 text-yellow-800' :
                customer.customer_tier === 'regular' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {customer.customer_tier?.replace('_', ' ').toUpperCase()}
              </span>

              <div className="flex items-center space-x-2">
                {customer.has_historical_data && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" title="Has Historical Data"></div>
                )}
                <div className={`w-2 h-2 rounded-full ${
                  customer.data_source === 'current' ? 'bg-blue-500' :
                  customer.data_source === 'historical' ? 'bg-orange-500' :
                  'bg-green-500'
                }`} title={`Data Source: ${customer.data_source}`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedCustomers.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-2">No customers found matching your criteria</p>
        </div>
      )}
    </div>
  );
};

export default CustomerList; 