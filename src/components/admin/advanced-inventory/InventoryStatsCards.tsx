import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Boxes
} from 'lucide-react';
import { InventorySummary } from '@/types/inventory';

interface InventoryStatsCardsProps {
  summary?: InventorySummary;
  isLoading: boolean;
  stockAlerts: number;
  pendingOrders: number;
}

export const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({
  summary,
  isLoading,
  stockAlerts,
  pendingOrders
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Inventory Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary ? formatCurrency(summary.total_inventory_value) : '₹0'}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {summary?.total_toys || 0} toys
          </p>
        </CardContent>
      </Card>

      {/* Available Stock */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Stock</CardTitle>
          <Package className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {summary?.total_available || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Ready for rental
          </p>
        </CardContent>
      </Card>

      {/* Stock Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${stockAlerts > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${stockAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {stockAlerts}
          </div>
          <p className="text-xs text-muted-foreground">
            {summary?.low_stock_toys || 0} low stock, {summary?.out_of_stock_toys || 0} out of stock
          </p>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {pendingOrders}
          </div>
          <p className="text-xs text-muted-foreground">
            Purchase orders waiting
          </p>
        </CardContent>
      </Card>
    </div>
  );
}; 