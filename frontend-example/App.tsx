import React, { useState } from 'react';
import CustomerList from './CustomerList';
import CustomerOrderHistory from './CustomerOrderHistory';

const App: React.FC = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Toyflix CRM</h1>
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Unified Data View
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showStats ? 'Hide' : 'Show'} Stats
              </button>
              
              {selectedCustomerId && (
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ← Back to Customer List
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Panel */}
      {showStats && <StatsPanel />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {selectedCustomerId ? (
          <CustomerOrderHistory 
            customerId={selectedCustomerId} 
          />
        ) : (
          <CustomerList 
            onSelectCustomer={setSelectedCustomerId} 
          />
        )}
      </main>
    </div>
  );
};

// Statistics Panel Component
const StatsPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // This would typically be a custom function or view in your database
      // For demo purposes, we'll show how you might aggregate the data
      
      // You could create a database function like this:
      // CREATE OR REPLACE FUNCTION get_dashboard_stats()
      // RETURNS JSON AS $$
      // BEGIN
      //   RETURN json_build_object(
      //     'total_customers', (SELECT COUNT(*) FROM enriched_customer_view),
      //     'historical_customers', (SELECT COUNT(*) FROM enriched_customer_view WHERE has_historical_data = true),
      //     'total_orders', (SELECT SUM(total_orders) FROM enriched_customer_view),
      //     'total_revenue', (SELECT SUM(total_lifetime_value) FROM enriched_customer_view),
      //     'historical_revenue', (SELECT SUM(historical_lifetime_value) FROM enriched_customer_view WHERE historical_lifetime_value > 0)
      //   );
      // END;
      // $$ LANGUAGE plpgsql;

      const mockStats = {
        total_customers: 1004,
        historical_customers: 850,
        current_customers: 154,
        total_orders: 12563,
        total_revenue: 2845000,
        historical_revenue: 1920000,
        average_order_value: 2300
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.total_customers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Customers</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.historical_customers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">With History</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.current_customers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Current Only</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.total_orders.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Orders</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_revenue)}</p>
            <p className="text-sm text-gray-500">Total Revenue</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.historical_revenue)}</p>
            <p className="text-sm text-gray-500">Historical</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.average_order_value)}</p>
            <p className="text-sm text-gray-500">Avg Order</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 