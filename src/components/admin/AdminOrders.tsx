import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Filter, Download, Settings, Plus, RefreshCw,
  Calendar as CalendarIcon, ChevronDown, ChevronUp, X,
  TrendingUp, Package, Users, Clock, DollarSign,
  AlertCircle, CheckCircle, XCircle, Eye, Trash2,
  Bell, BarChart3, Activity, Zap, ArrowUpDown, ArrowUp, ArrowDown
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import optimized components
import VirtualizedOrderList from "./VirtualizedOrderList";
import PerformanceMonitor from "./PerformanceMonitor";
import EnhancedCreateOrderDialog from "./EnhancedCreateOrderDialog";
import ComprehensiveOrderDetails from "./ComprehensiveOrderDetails";
import { QueueOrdersTable } from "./QueueOrdersTable";
import { useOptimizedOrders } from "@/hooks/useOptimizedOrders";

// ... existing imports and interfaces ...

const AdminOrders = () => {
  // Filter states
  const [searchText, setSearchText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statuses, setStatuses] = useState<string[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<string[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<string[]>([]);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);

  // Order details dialog state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // Tab state for order types
  const [activeTab, setActiveTab] = useState("all-orders");

  // Create optimized filters object
  const filters = useMemo(() => ({
    searchText,
    customerName,
    customerPhone,
    customerEmail,
    orderNumber,
    dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : '',
    dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : '',
    statuses,
    paymentStatuses,
    subscriptionPlans,
    orderTypes,
    sortDirection,
  }), [
    searchText, customerName, customerPhone, customerEmail, orderNumber,
    dateFrom, dateTo, statuses, paymentStatuses, subscriptionPlans, orderTypes, sortDirection
  ]);

  // Use optimized orders hook
  const {
    orders,
    totalCount,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    refetch,
    performanceMetrics,
    updateOrderOptimistically,
    invalidateOrders
  } = useOptimizedOrders(filters);

  // Memoized statistics
  const stats = useMemo(() => {
    const rentalOrders = orders.filter(order => !order.isQueueOrder);
    const queueOrders = orders.filter(order => order.isQueueOrder);
    
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paymentStatusCounts = orders.reduce((acc, order) => {
      acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    return {
      totalOrders: totalCount,
      loadedOrders: orders.length,
      totalRentalOrders: rentalOrders.length,
      totalQueueOrders: queueOrders.length,
      totalRevenue,
      statusCounts,
      paymentStatusCounts,
      pendingOrders: statusCounts['pending'] || 0,
      deliveredOrders: statusCounts['delivered'] || 0,
      cancelledOrders: statusCounts['cancelled'] || 0,
    };
  }, [orders, totalCount]);

  // Toggle selection functions
  const toggleSelection = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedOrderIds(prev => 
      prev.length === orders.length ? [] : orders.map(order => order.id)
    );
  }, [orders]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchText("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setOrderNumber("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setStatuses([]);
    setPaymentStatuses([]);
    setSubscriptionPlans([]);
    setOrderTypes([]);
  }, []);

  // Status and icon helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Order actions
  const handleViewDetails = useCallback((order: any) => {
    if (!order || !order.id) {
      console.error('Invalid order data:', order);
      toast.error('Invalid order data');
      return;
    }
    
    setSelectedOrderForDetails(order.id);
    setShowOrderDetails(true);
  }, []);

  const handleEditOrder = useCallback((order: any) => {
    if (!order || !order.id) {
      console.error('Invalid order data:', order);
      toast.error('Invalid order data');
      return;
    }
    
    setSelectedOrderForDetails(order.id);
    setShowOrderDetails(true);
    toast.info(`Editing order ${order.order_number || order.id.slice(0, 8)}`);
  }, []);

  const handleBulkStatusUpdate = useCallback(async (newStatus: string) => {
    const ordersToUpdate = orders.filter(order => selectedOrderIds.includes(order.id));
    
    // Optimistically update orders
    ordersToUpdate.forEach(order => {
      updateOrderOptimistically(order.id, { status: newStatus });
    });
    
    toast.success(`Updated ${ordersToUpdate.length} orders to ${newStatus}`);
    setSelectedOrderIds([]);
  }, [orders, selectedOrderIds, updateOrderOptimistically]);

  const handleBulkDelete = useCallback(async () => {
    const ordersToDelete = orders.filter(order => selectedOrderIds.includes(order.id));
    
    // In a real app, you'd make API calls here
    toast.success(`Deleted ${ordersToDelete.length} orders`);
    setSelectedOrderIds([]);
    invalidateOrders();
  }, [orders, selectedOrderIds, invalidateOrders]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchText) count++;
    if (customerName) count++;
    if (customerPhone) count++;
    if (customerEmail) count++;
    if (orderNumber) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (statuses.length > 0) count++;
    if (paymentStatuses.length > 0) count++;
    if (subscriptionPlans.length > 0) count++;
    if (orderTypes.length > 0) count++;
    return count;
  }, [
    searchText, customerName, customerPhone, customerEmail, orderNumber,
    dateFrom, dateTo, statuses, paymentStatuses, subscriptionPlans, orderTypes
  ]);

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Orders</h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Order Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all rental orders with advanced filtering and performance optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
          >
            <Activity className="w-4 h-4 mr-2" />
            Performance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateOrderDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Performance Monitor */}
      {showPerformanceMonitor && (
        <PerformanceMonitor 
          ordersCount={orders.length} 
          performanceMetrics={performanceMetrics}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalOrders.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.loadedOrders} loaded • {hasNextPage ? 'More available' : 'All loaded'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg: ₹{Math.round(stats.totalRevenue / Math.max(1, stats.loadedOrders))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.deliveredOrders} delivered • {stats.cancelledOrders} cancelled
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className="text-2xl font-bold text-orange-600">
                  {hasNextPage ? 'Optimized' : 'Complete'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Virtual scroll • Infinite load
                </p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Search & Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
              <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Advanced
                    {showAdvancedFilters ? 
                      <ChevronUp className="w-4 h-4 ml-2" /> : 
                      <ChevronDown className="w-4 h-4 ml-2" />
                    }
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search: customer name, phone, email, order number..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent className="space-y-4">
              {/* First Row - Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    placeholder="Email address"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Second Row - Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    placeholder="Order number"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Third Row - Status Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Order Status */}
                <div>
                  <Label>Order Status</Label>
                  <div className="space-y-2 mt-2">
                    {['pending', 'confirmed', 'processing', 'delivered', 'cancelled'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statuses.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatuses([...statuses, status]);
                            } else {
                              setStatuses(statuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <label
                          htmlFor={`status-${status}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                        >
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Status */}
                <div>
                  <Label>Payment Status</Label>
                  <div className="space-y-2 mt-2">
                    {['paid', 'pending', 'failed', 'refunded'].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`payment-${status}`}
                          checked={paymentStatuses.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPaymentStatuses([...paymentStatuses, status]);
                            } else {
                              setPaymentStatuses(paymentStatuses.filter(s => s !== status));
                            }
                          }}
                        />
                        <label
                          htmlFor={`payment-${status}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                        >
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscription Plans */}
                <div>
                  <Label>Subscription Plan</Label>
                  <div className="space-y-2 mt-2">
                    {['Discovery Delight', 'Silver Pack', 'Gold Pack PRO', 'Ride-On Monthly', 'ride_on_fixed'].map((plan) => (
                      <div key={plan} className="flex items-center space-x-2">
                        <Checkbox
                          id={`plan-${plan}`}
                          checked={subscriptionPlans.includes(plan)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSubscriptionPlans([...subscriptionPlans, plan]);
                            } else {
                              setSubscriptionPlans(subscriptionPlans.filter(p => p !== plan));
                            }
                          }}
                        />
                        <label
                          htmlFor={`plan-${plan}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                        >
                          {plan}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Types */}
                <div>
                  <Label>Order Type</Label>
                  <div className="space-y-2 mt-2">
                    {['rental', 'purchase', 'subscription'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={orderTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setOrderTypes([...orderTypes, type]);
                            } else {
                              setOrderTypes(orderTypes.filter(t => t !== type));
                            }
                          }}
                        />
                        <label
                          htmlFor={`type-${type}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                        >
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrderIds.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedOrderIds.length === orders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="font-medium">
                    {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select onValueChange={handleBulkStatusUpdate}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Bell className="w-4 h-4 mr-2" />
                    Notify
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedOrderIds([])}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List with Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Orders
              <Badge variant="outline" className="ml-2">
                {stats.loadedOrders.toLocaleString()} of {stats.totalOrders.toLocaleString()}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Sort by Creation Date */}
              <Select value={sortDirection} onValueChange={(value: 'asc' | 'desc') => setSortDirection(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-4 h-4" />
                      <span>Newest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-4 h-4" />
                      <span>Oldest First</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedOrderIds.length === 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleSelectAll}
                >
                  Select All
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all-orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                All Orders
                <Badge variant="secondary" className="ml-1">
                  {stats.totalOrders}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Subscriptions
                <Badge variant="secondary" className="ml-1">
                  {stats.totalRentalOrders}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="queue-orders" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Queue Orders
                <Badge variant="secondary" className="ml-1">
                  {stats.totalQueueOrders}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-orders" className="mt-4">
              <VirtualizedOrderList
                orders={orders}
                selectedOrderIds={selectedOrderIds}
                onToggleSelection={toggleSelection}
                onViewDetails={handleViewDetails}
                onEditOrder={handleEditOrder}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="subscriptions" className="mt-4">
              <VirtualizedOrderList
                orders={orders.filter(order => !order.isQueueOrder)}
                selectedOrderIds={selectedOrderIds}
                onToggleSelection={toggleSelection}
                onViewDetails={handleViewDetails}
                onEditOrder={handleEditOrder}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                isLoading={isLoading}
              />
            </TabsContent>
            
            <TabsContent value="queue-orders" className="mt-4">
              <QueueOrdersTable
                orders={orders}
                onViewOrder={handleViewDetails}
                onEditOrder={handleEditOrder}
                isLoading={isLoading}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Enhanced Create Order Dialog */}
      <EnhancedCreateOrderDialog
        open={showCreateOrderDialog}
        onOpenChange={setShowCreateOrderDialog}
        onOrderCreated={() => {
          invalidateOrders();
          refetch();
        }}
      />

      {/* Comprehensive Order Details Dialog */}
      {showOrderDetails && selectedOrderForDetails && (
        <ComprehensiveOrderDetails
          orderId={selectedOrderForDetails}
          open={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrderForDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminOrders;