import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Activity, 
  Calendar as CalendarIcon, 
  Download, 
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Clock,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { 
  useInventoryDashboard,
  useLowStockToys,
  InventoryMovement,
  ComprehensiveInventoryStatus 
} from '@/hooks/useInventoryManagement';
import { formatDistance, format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

interface ReportFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  category?: string;
  movementType?: string;
  customStartDate?: Date;
  customEndDate?: Date;
}

const InventoryReports: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month'
  });
  const [selectedChart, setSelectedChart] = useState<'movements' | 'stock' | 'trends'>('movements');

  // Hooks
  const { inventoryStatus, recentMovements, inventorySummary, isLoading } = useInventoryDashboard();
  const { data: lowStockToys } = useLowStockToys(3);

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (filters.dateRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      case 'custom':
        startDate = filters.customStartDate || subDays(now, 30);
        endDate = filters.customEndDate || now;
        break;
      default:
        startDate = subDays(now, 30);
    }

    return { startDate, endDate };
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  // Filter movements based on selected criteria
  const filteredMovements = useMemo(() => {
    if (!recentMovements) return [];
    
    return recentMovements.filter(movement => {
      const movementDate = new Date(movement.created_at);
      
      // Date range filter
      if (movementDate < dateRange.startDate || movementDate > dateRange.endDate) {
        return false;
      }
      
      // Category filter
      if (filters.category && movement.toys?.category !== filters.category) {
        return false;
      }
      
      // Movement type filter
      if (filters.movementType && movement.movement_type !== filters.movementType) {
        return false;
      }
      
      return true;
    });
  }, [recentMovements, dateRange, filters.category, filters.movementType]);

  // Chart data preparation
  const movementChartData = useMemo(() => {
    const groupedData: Record<string, { date: string; in: number; out: number; net: number }> = {};
    
    filteredMovements.forEach(movement => {
      const date = format(new Date(movement.created_at), 'MMM dd');
      
      if (!groupedData[date]) {
        groupedData[date] = { date, in: 0, out: 0, net: 0 };
      }
      
      if (movement.quantity_change > 0) {
        groupedData[date].in += movement.quantity_change;
        groupedData[date].net += movement.quantity_change;
      } else {
        groupedData[date].out += Math.abs(movement.quantity_change);
        groupedData[date].net += movement.quantity_change;
      }
    });
    
    return Object.values(groupedData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredMovements]);

  const categoryDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    inventoryStatus?.forEach(toy => {
      const category = toy.category.replace('_', ' ').toUpperCase();
      distribution[category] = (distribution[category] || 0) + toy.total_quantity;
    });
    
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [inventoryStatus]);

  const stockLevelData = useMemo(() => {
    if (!inventoryStatus) return [];
    
    return inventoryStatus.map(toy => ({
      name: toy.toy_name.length > 20 ? toy.toy_name.substring(0, 20) + '...' : toy.toy_name,
      available: toy.available_quantity,
      total: toy.total_quantity,
      utilization: toy.total_quantity > 0 ? ((toy.total_quantity - toy.available_quantity) / toy.total_quantity * 100) : 0
    })).slice(0, 20); // Top 20 toys
  }, [inventoryStatus]);

  const movementTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    
    filteredMovements.forEach(movement => {
      const type = movement.movement_type.replace('_', ' ');
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [filteredMovements]);

  // Statistics calculations
  const statistics = useMemo(() => {
    const totalMovements = filteredMovements.length;
    const totalIn = filteredMovements
      .filter(m => m.quantity_change > 0)
      .reduce((sum, m) => sum + m.quantity_change, 0);
    const totalOut = filteredMovements
      .filter(m => m.quantity_change < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);
    const netChange = totalIn - totalOut;
    
    const averageUtilization = inventoryStatus 
      ? inventoryStatus.reduce((sum, toy) => {
          return sum + (toy.total_quantity > 0 
            ? (toy.total_quantity - toy.available_quantity) / toy.total_quantity * 100 
            : 0);
        }, 0) / inventoryStatus.length
      : 0;

    return {
      totalMovements,
      totalIn,
      totalOut,
      netChange,
      averageUtilization: Math.round(averageUtilization),
      lowStockCount: lowStockToys?.length || 0,
      outOfStockCount: inventorySummary?.out_of_stock_toys || 0
    };
  }, [filteredMovements, inventoryStatus, lowStockToys, inventorySummary]);

  const topPerformingToys = useMemo(() => {
    const toyActivity: Record<string, { toy: ComprehensiveInventoryStatus; activity: number }> = {};
    
    inventoryStatus?.forEach(toy => {
      const activityCount = filteredMovements.filter(m => m.toy_id === toy.toy_id).length;
      toyActivity[toy.toy_id] = { toy, activity: activityCount };
    });
    
    return Object.values(toyActivity)
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10);
  }, [inventoryStatus, filteredMovements]);

  const exportReport = (reportType: string) => {
    let csvContent = '';
    let filename = '';
    
    switch (reportType) {
      case 'movements':
        csvContent = [
          ['Date', 'Toy', 'Type', 'Change', 'Reason'].join(','),
          ...filteredMovements.map(m => [
            format(new Date(m.created_at), 'yyyy-MM-dd HH:mm'),
            m.toys?.name || 'Unknown',
            m.movement_type.replace('_', ' '),
            m.quantity_change,
            m.movement_reason || ''
          ].join(','))
        ].join('\n');
        filename = `inventory-movements-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
      
      case 'stock-levels':
        csvContent = [
          ['Toy', 'Category', 'Total', 'Available', 'Rented', 'Status'].join(','),
          ...(inventoryStatus || []).map(toy => [
            toy.toy_name,
            toy.category,
            toy.total_quantity,
            toy.available_quantity,
            toy.rented_quantity,
            toy.inventory_status
          ].join(','))
        ].join('\n');
        filename = `stock-levels-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
      
      case 'summary':
        csvContent = [
          ['Metric', 'Value'].join(','),
          ['Total Movements', statistics.totalMovements],
          ['Items In', statistics.totalIn],
          ['Items Out', statistics.totalOut],
          ['Net Change', statistics.netChange],
          ['Average Utilization %', statistics.averageUtilization],
          ['Low Stock Items', statistics.lowStockCount],
          ['Out of Stock Items', statistics.outOfStockCount]
        ].map(row => row.join(',')).join('\n');
        filename = `inventory-summary-${format(new Date(), 'yyyy-MM-dd')}`;
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${reportType} report exported successfully`);
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into your inventory performance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => exportReport('summary')}>
            <Download className="h-4 w-4 mr-2" />
            Export Summary
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="quarter">Last 3 months</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={filters.category || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  category: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="big_toys">Big Toys</SelectItem>
                  <SelectItem value="stem_toys">STEM Toys</SelectItem>
                  <SelectItem value="educational_toys">Educational</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="developmental_toys">Developmental</SelectItem>
                  <SelectItem value="ride_on_toys">Ride-On</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Movement Type</label>
              <Select 
                value={filters.movementType || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  movementType: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="RENTAL_OUT">Rental Out</SelectItem>
                  <SelectItem value="RENTAL_RETURN">Rental Return</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                  <SelectItem value="PURCHASE">Purchase</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chart Type</label>
              <Select 
                value={selectedChart} 
                onValueChange={(value: any) => setSelectedChart(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movements">Movement Trends</SelectItem>
                  <SelectItem value="stock">Stock Levels</SelectItem>
                  <SelectItem value="trends">Utilization Trends</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Movements</p>
                <p className="text-2xl font-bold">{statistics.totalMovements}</p>
                <p className="text-xs text-muted-foreground">
                  {filters.dateRange === 'week' ? 'Last 7 days' : 
                   filters.dateRange === 'month' ? 'This month' : 
                   'Selected period'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Net Change</p>
                <p className={`text-2xl font-bold ${statistics.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {statistics.netChange >= 0 ? '+' : ''}{statistics.netChange}
                </p>
                <p className="text-xs text-muted-foreground">
                  In: {statistics.totalIn} | Out: {statistics.totalOut}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Utilization</p>
                <p className="text-2xl font-bold">{statistics.averageUtilization}%</p>
                <p className="text-xs text-muted-foreground">
                  Across all toys
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.lowStockCount + statistics.outOfStockCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statistics.outOfStockCount} out, {statistics.lowStockCount} low
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Charts & Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedChart === 'movements' && 'Inventory Movements Over Time'}
                  {selectedChart === 'stock' && 'Current Stock Levels'}
                  {selectedChart === 'trends' && 'Inventory Utilization Trends'}
                </CardTitle>
                <CardDescription>
                  {selectedChart === 'movements' && 'Daily inventory in/out movements'}
                  {selectedChart === 'stock' && 'Available vs total inventory by toy'}
                  {selectedChart === 'trends' && 'Percentage utilization of inventory'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedChart === 'movements' && (
                      <AreaChart data={movementChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="in" 
                          stackId="1" 
                          stroke="#82ca9d" 
                          fill="#82ca9d" 
                          name="Items In"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="out" 
                          stackId="2" 
                          stroke="#ff7300" 
                          fill="#ff7300" 
                          name="Items Out"
                        />
                      </AreaChart>
                    )}
                    
                    {selectedChart === 'stock' && (
                      <BarChart data={stockLevelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="available" fill="#82ca9d" name="Available" />
                        <Bar dataKey="total" fill="#8884d8" name="Total" />
                      </BarChart>
                    )}
                    
                    {selectedChart === 'trends' && (
                      <LineChart data={stockLevelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={100}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                        <Line 
                          type="monotone" 
                          dataKey="utilization" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="Utilization %"
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Total inventory by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Movement Types */}
            <Card>
              <CardHeader>
                <CardTitle>Movement Types</CardTitle>
                <CardDescription>Breakdown of movement activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movementTypeData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Toys</CardTitle>
                <CardDescription>Most active toys by movement frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformingToys.map((item, index) => (
                    <div key={item.toy.toy_id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{item.toy.toy_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.toy.category.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.activity} movements</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((item.toy.total_quantity - item.toy.available_quantity) / item.toy.total_quantity * 100)}% utilized
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Toys requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockToys?.slice(0, 10).map((toy) => (
                    <div key={toy.id} className="flex items-center justify-between p-3 border rounded border-l-4 border-l-red-500">
                      <div>
                        <p className="font-medium">{toy.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {toy.category.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          {toy.available_quantity} / {toy.total_quantity}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {toy.available_quantity === 0 ? 'Out of stock' : 'Low stock'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Reports Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => exportReport('movements')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Movements</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportReport('stock-levels')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Stock Levels</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportReport('summary')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Summary</span>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Movement Details</CardTitle>
              <CardDescription>
                Detailed view of inventory movements ({filteredMovements.length} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Toy</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.slice(0, 50).map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-sm">
                        {format(new Date(movement.created_at), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.toys?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {movement.toys?.category?.replace('_', ' ')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {movement.movement_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {movement.movement_reason || movement.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredMovements.length > 50 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 50 of {filteredMovements.length} movements. Export for complete data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReports; 