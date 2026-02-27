import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Package, 
  RefreshCw, 
  Search,
  Download,
  Activity,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { 
  useInventoryDashboard, 
  useLowStockToys, 
  useRecordInventoryMovement,
  useSyncAllInventory,
  ComprehensiveInventoryStatus,
  InventoryAlert,
  InventoryMovement
} from '@/hooks/useInventoryManagement';
import { toast } from 'sonner';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OUT_OF_STOCK': return 'destructive';
    case 'LOW_STOCK': return 'secondary';
    case 'MEDIUM_STOCK': return 'secondary';
    case 'GOOD_STOCK': return 'default';
    default: return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OUT_OF_STOCK': return <XCircle className="h-4 w-4" />;
    case 'LOW_STOCK': return <AlertTriangle className="h-4 w-4" />;
    case 'MEDIUM_STOCK': return <Package className="h-4 w-4" />;
    case 'GOOD_STOCK': return <CheckCircle className="h-4 w-4" />;
    default: return <Package className="h-4 w-4" />;
  }
};

const InventoryDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Hooks with improved error handling
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    refetch
  } = useInventoryDashboard();
  
  const { data: lowStockToys } = useLowStockToys(3);
  const recordMovement = useRecordInventoryMovement();
  const syncAllInventory = useSyncAllInventory();

  // Extract data with fallbacks
  const inventoryStatus = dashboardData?.inventoryStatus || [];
  const inventoryAlerts = dashboardData?.inventoryAlerts || [];
  const recentMovements = dashboardData?.recentMovements || [];
  const inventorySummary = dashboardData?.inventorySummary || {
    total_toys: 0,
    total_inventory: 0,
    total_available: 0,
    total_reserved: 0,
    total_rented: 0,
    low_stock_toys: 0,
    out_of_stock_toys: 0,
    medium_stock_toys: 0,
    good_stock_toys: 0,
  };

  // Filtered inventory data
  const filteredInventory = useMemo(() => {
    if (!inventoryStatus || inventoryStatus.length === 0) return [];
    
    return inventoryStatus.filter(toy => {
      const matchesSearch = toy.toy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           toy.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || toy.inventory_status === filterStatus;
      const matchesCategory = filterCategory === 'all' || toy.category === filterCategory;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [inventoryStatus, searchTerm, filterStatus, filterCategory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    if (!inventoryStatus || inventoryStatus.length === 0) return [];
    return Array.from(new Set(inventoryStatus.map(toy => toy.category).filter(Boolean)));
  }, [inventoryStatus]);

  const handleQuickAdjustment = async (toyId: string, change: number, reason: string) => {
    try {
      await recordMovement.mutateAsync({
        toyId,
        movementType: 'ADJUSTMENT',
        quantityChange: change,
        movementReason: reason,
        notes: `Quick adjustment: ${change > 0 ? '+' : ''}${change}`
      });
      toast.success('Inventory adjusted successfully');
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      toast.error('Failed to adjust inventory');
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Inventory data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const handleSyncAll = async () => {
    try {
      toast.info('Starting full inventory sync...');
      await syncAllInventory.mutateAsync();
      toast.success('Full inventory sync completed successfully');
      handleRefresh(); // Refresh data after sync
    } catch (error) {
      console.error('Error syncing all inventory:', error);
      toast.error('Failed to sync all inventory');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inventory data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Error loading inventory data</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Real-time inventory tracking and management for your toy rental business
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncAll}
            disabled={syncAllInventory.isPending}
          >
            <Zap className="h-4 w-4 mr-2" />
            {syncAllInventory.isPending ? 'Syncing...' : 'Sync Inventory'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventorySummary.total_inventory}</div>
            <p className="text-xs text-muted-foreground">
              {inventorySummary.total_toys} different toys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventorySummary.total_available}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for rental
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {inventorySummary.low_stock_toys}
            </div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inventorySummary.out_of_stock_toys}
            </div>
            <p className="text-xs text-muted-foreground">
              Unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts 
            {inventoryAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {inventoryAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search toys..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="MEDIUM_STOCK">Medium Stock</option>
                  <option value="GOOD_STOCK">Good Stock</option>
                </select>
                <select 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                                     <option value="all">All Categories</option>
                   {categories.map((category: string) => (
                     <option key={category} value={category}>{category}</option>
                   ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>
                Showing {filteredInventory.length} of {inventoryStatus.length} toys
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Toy Name</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Age Range</th>
                      <th className="text-left p-2">Available</th>
                      <th className="text-left p-2">Total</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((toy) => (
                      <tr key={toy.toy_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{toy.toy_name}</td>
                        <td className="p-2">{toy.category}</td>
                        <td className="p-2">{toy.age_range}</td>
                        <td className="p-2">{toy.available_quantity}</td>
                        <td className="p-2">{toy.total_quantity}</td>
                        <td className="p-2">
                          <Badge variant={getStatusColor(toy.inventory_status)}>
                            {getStatusIcon(toy.inventory_status)}
                            <span className="ml-1">
                              {toy.inventory_status.replace('_', ' ')}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleQuickAdjustment(toy.toy_id, 1, 'Manual increase')}
                            >
                              +1
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleQuickAdjustment(toy.toy_id, 5, 'Restock')}
                            >
                              +5
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Alerts</CardTitle>
              <CardDescription>
                Toys that need immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">No alerts!</p>
                    <p className="text-muted-foreground">All inventory levels are healthy</p>
                  </div>
                ) : (
                  inventoryAlerts.map((alert) => (
                    <Alert key={alert.id} className="border-l-4 border-l-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <strong>{alert.toy?.name || 'Unknown Toy'}</strong> - {alert.message}
                            <div className="text-sm text-muted-foreground">
                              Current: {alert.current_value} | Threshold: {alert.threshold_value}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => alert.toy_id && handleQuickAdjustment(alert.toy_id, 5, 'Restocking')}
                            >
                              Add 5
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => alert.toy_id && handleQuickAdjustment(alert.toy_id, 10, 'Restocking')}
                            >
                              Add 10
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inventory Movements</CardTitle>
              <CardDescription>
                Recent changes to inventory levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMovements.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">No movements recorded</p>
                    <p className="text-muted-foreground">Inventory movements will appear here</p>
                  </div>
                ) : (
                  recentMovements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{movement.toys?.name || 'Unknown Toy'}</p>
                        <p className="text-sm text-muted-foreground">
                          {movement.movement_type} - {movement.quantity_change} units
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {movement.notes && (
                        <div className="text-sm text-muted-foreground max-w-xs">
                          {movement.notes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryDashboard; 