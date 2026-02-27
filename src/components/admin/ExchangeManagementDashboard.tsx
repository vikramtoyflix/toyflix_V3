/**
 * Exchange Management Dashboard
 * Main interface for managing toy exchanges, pickups, and dispatches
 * Supports all subscription plans and order types
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Package,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  X,
  CheckCircle,
  AlertTriangle,
  Pause,
  Play,
  RotateCcw,
  MapPin,
  Phone,
  User
} from 'lucide-react';

import {
  IntelligentExchangeService,
  ToyExchange,
  ExchangeFilters
} from '@/services/intelligentExchangeService';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeManagementDashboardProps {
  className?: string;
}

const ExchangeManagementDashboard: React.FC<ExchangeManagementDashboardProps> = ({ className }) => {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exchangeTypeFilter, setExchangeTypeFilter] = useState('all');
  const [selectedExchange, setSelectedExchange] = useState<ToyExchange | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Customer Orders state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerDetailDialogOpen, setIsCustomerDetailDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Get exchanges data
  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['exchanges', selectedDay, statusFilter, exchangeTypeFilter],
    queryFn: async () => {
      const filters: ExchangeFilters = {
        day: selectedDay // Filter by selected day from tabs (across all dates)
      };

      if (statusFilter !== 'all') filters.status = statusFilter;
      if (exchangeTypeFilter !== 'all') filters.exchangeType = exchangeTypeFilter;

      return await IntelligentExchangeService.getExchanges(filters);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get exchange statistics
  const { data: stats } = useQuery({
    queryKey: ['exchange-stats', selectedDay],
    queryFn: () => IntelligentExchangeService.getExchangeStatistics(undefined), // Get all stats, we'll filter in component
    refetchInterval: 60000 // Refresh every minute
  });

  // Get customers with orders from last 30 days
  const { data: customersWithOrders = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-with-orders'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get all rental orders from last 30 days with customer info
      const { data: orders, error } = await supabase
        .from('rental_orders')
        .select(`
          *,
          custom_users!rental_orders_user_id_fkey(phone, first_name, last_name, zip_code, subscription_active, subscription_plan, created_at)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group orders by customer and calculate customer metrics
      const customerMap = new Map();

      for (const order of orders) {
        const customerId = order.user_id;
        const customer = order.custom_users;

        if (!customerMap.has(customerId)) {
          // Get customer's complete order history
          const { data: allOrders } = await supabase
            .from('rental_orders')
            .select('id, created_at, cycle_number, order_type, subscription_plan, toys_data')
            .eq('user_id', customerId)
            .order('created_at', { ascending: true });

          // Calculate subscription cycle
          const subscriptionOrders = allOrders?.filter(o =>
            o.order_type === 'subscription' && !o.is_pause_order && !o.is_resume_order
          ) || [];

          const currentCycle = subscriptionOrders.length;
          const hasToyData = order.toys_data && order.toys_data.length > 0;

          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Unknown Customer',
            customer_phone: customer?.phone || '',
            customer_email: customer?.email || '',
            pincode: customer?.zip_code || order.shipping_address?.pincode || '',
            subscription_active: customer?.subscription_active || false,
            subscription_plan: customer?.subscription_plan || order.subscription_plan || '',
            total_orders: allOrders?.length || 0,
            current_cycle: currentCycle,
            last_order_date: order.created_at,
            recent_orders: [order], // Will be expanded below
            has_toy_data: hasToyData,
            customer_since: customer?.created_at || order.created_at
          });
        } else {
          // Add to existing customer's recent orders
          const customerData = customerMap.get(customerId);
          customerData.recent_orders.push(order);
          customerData.has_toy_data = customerData.has_toy_data || (order.toys_data && order.toys_data.length > 0);
        }
      }

      return Array.from(customerMap.values()).sort((a, b) =>
        new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
      );
    },
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Update exchange status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ exchangeId, status }: { exchangeId: string; status: string }) => {
      return await IntelligentExchangeService.updateExchangeStatus(exchangeId, status as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-stats'] });
      toast.success('Exchange status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update exchange status');
      console.error('Update error:', error);
    }
  });

  // Cancel exchange mutation
  const cancelExchangeMutation = useMutation({
    mutationFn: async ({ exchangeId, reason }: { exchangeId: string; reason: string }) => {
      return await IntelligentExchangeService.cancelExchange(exchangeId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-stats'] });
      toast.success('Exchange cancelled successfully');
    },
    onError: (error) => {
      toast.error('Failed to cancel exchange');
      console.error('Cancel error:', error);
    }
  });

  // Create exchange operation mutation
  const createExchangeMutation = useMutation({
    mutationFn: async ({ customerId, orderId }: { customerId: string; orderId?: string }) => {
      return await IntelligentExchangeService.createExchangeFromCustomer(customerId, orderId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['exchange-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-orders'] });
      toast.success(`Exchange operation created successfully: ${result.exchange_type}`);
    },
    onError: (error) => {
      toast.error('Failed to create exchange operation');
      console.error('Create exchange error:', error);
    }
  });

  // Filter exchanges based on search term
  const filteredExchanges = exchanges.filter(exchange => {
    const matchesSearch = searchTerm === '' || 
      exchange.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exchange.customer_phone.includes(searchTerm) ||
      exchange.pincode.includes(searchTerm);
    
    return matchesSearch;
  });

  // Get exchange type badge
  const getExchangeTypeBadge = (type: string) => {
    const config = {
      'EXCHANGE': { variant: 'default' as const, color: 'bg-blue-100 text-blue-800', icon: ArrowUpDown, label: 'Exchange' },
      'PICKUP_ONLY': { variant: 'secondary' as const, color: 'bg-red-100 text-red-800', icon: ArrowUp, label: 'Pickup Only' },
      'DISPATCH_ONLY': { variant: 'secondary' as const, color: 'bg-green-100 text-green-800', icon: ArrowDown, label: 'Dispatch Only' },
      'FIRST_DELIVERY': { variant: 'outline' as const, color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'First Delivery' }
    };

    const typeConfig = config[type as keyof typeof config] || config.EXCHANGE;
    const Icon = typeConfig.icon;

    return (
      <Badge variant={typeConfig.variant} className={`${typeConfig.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {typeConfig.label}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = {
      'scheduled': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'confirmed': { variant: 'default' as const, color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'in_progress': { variant: 'default' as const, color: 'bg-orange-100 text-orange-800', icon: RotateCcw },
      'completed': { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'failed': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      'cancelled': { variant: 'destructive' as const, color: 'bg-gray-100 text-gray-800', icon: X },
      'rescheduled': { variant: 'outline' as const, color: 'bg-purple-100 text-purple-800', icon: Calendar }
    };

    const statusConfig = config[status as keyof typeof config] || config.scheduled;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className={`${statusConfig.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Handle status change
  const handleStatusChange = (exchangeId: string, newStatus: string) => {
    updateStatusMutation.mutate({ exchangeId, status: newStatus });
  };

  // Handle cancel exchange
  const handleCancelExchange = (exchangeId: string) => {
    const reason = prompt('Please enter cancellation reason:');
    if (reason) {
      cancelExchangeMutation.mutate({ exchangeId, reason });
    }
  };

  // Handle view details
  const handleViewDetails = (exchange: ToyExchange) => {
    setSelectedExchange(exchange);
    setIsDetailDialogOpen(true);
  };

  // Get current week range
  const getCurrentWeekRange = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      from: monday.toISOString().split('T')[0],
      to: sunday.toISOString().split('T')[0]
    };
  };

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
        <span className="text-lg">Loading exchange operations...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Management</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="operations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations">Exchange Operations</TabsTrigger>
          <TabsTrigger value="customers">Customer Orders (30 Days)</TabsTrigger>
        </TabsList>

        {/* Exchange Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalExchanges || 0}</div>
            <p className="text-xs text-muted-foreground">
              total operations across all dates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toy Exchanges</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.exchangesByType?.EXCHANGE || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pickup old + Dispatch new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pickup Only</CardTitle>
            <ArrowUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.exchangesByType?.PICKUP_ONLY || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pause subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatch Only</CardTitle>
            <ArrowDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats?.exchangesByType?.DISPATCH_ONLY || 0) + (stats?.exchangesByType?.FIRST_DELIVERY || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Resume + First orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Day Tabs and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Service Day Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Day Tabs */}
            <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                {weekDays.map((day) => (
                  <TabsTrigger key={day} value={day} className="text-xs">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Search */}
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Customer, phone, pincode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Exchange Type Filter */}
              <div>
                <Label>Operation Type</Label>
                <Select value={exchangeTypeFilter} onValueChange={setExchangeTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="EXCHANGE">Toy Exchange</SelectItem>
                    <SelectItem value="PICKUP_ONLY">Pickup Only</SelectItem>
                    <SelectItem value="DISPATCH_ONLY">Dispatch Only</SelectItem>
                    <SelectItem value="FIRST_DELIVERY">First Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Exchange Operations Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Operations
              </CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Manual Schedule
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredExchanges.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No operations scheduled</h3>
              <p className="text-muted-foreground">
                No toy exchange operations scheduled for {selectedDay} across all dates
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan & Cycle</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Toys</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExchanges.map((exchange) => (
                    <TableRow key={exchange.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{exchange.customer_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center space-x-2">
                            <Phone className="w-3 h-3" />
                            <span>{exchange.customer_phone}</span>
                            <MapPin className="w-3 h-3" />
                            <span>{exchange.pincode}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{exchange.subscription_plan}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {exchange.order_classification} Order • Cycle {exchange.cycle_number}
                          </div>
                          {exchange.is_pause_order && (
                            <Badge variant="secondary" className="text-xs">PAUSE</Badge>
                          )}
                          {exchange.is_resume_order && (
                            <Badge variant="secondary" className="text-xs">RESUME</Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getExchangeTypeBadge(exchange.exchange_type)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {exchange.exchange_type === 'EXCHANGE' && (
                            <>
                              <div className="flex items-center space-x-1">
                                <ArrowUp className="w-3 h-3 text-red-500" />
                                <span>Out: {exchange.pickup_toy_count}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <ArrowDown className="w-3 h-3 text-green-500" />
                                <span>In: {exchange.dispatch_toy_count}</span>
                              </div>
                            </>
                          )}
                          {exchange.exchange_type === 'PICKUP_ONLY' && (
                            <div className="flex items-center space-x-1">
                              <ArrowUp className="w-3 h-3 text-red-500" />
                              <span>Pickup: {exchange.pickup_toy_count}</span>
                            </div>
                          )}
                          {(exchange.exchange_type === 'DISPATCH_ONLY' || exchange.exchange_type === 'FIRST_DELIVERY') && (
                            <div className="flex items-center space-x-1">
                              <ArrowDown className="w-3 h-3 text-green-500" />
                              <span>Dispatch: {exchange.dispatch_toy_count}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{exchange.scheduled_time_slot}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(exchange.exchange_status)}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(exchange)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Quick Status Update */}
                          <Select 
                            value={exchange.exchange_status} 
                            onValueChange={(status) => handleStatusChange(exchange.id, status)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelExchange(exchange.id)}
                            disabled={exchange.exchange_status === 'completed' || exchange.exchange_status === 'cancelled'}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exchange Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exchange Details - {selectedExchange?.customer_name}</DialogTitle>
            <DialogDescription>
              {selectedExchange?.exchange_type} operation scheduled for {selectedExchange?.scheduled_date}
            </DialogDescription>
          </DialogHeader>
          
          {selectedExchange && (
            <div className="space-y-6">
              {/* Exchange Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedExchange.subscription_plan} - Cycle {selectedExchange.cycle_number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedExchange.order_classification} Order • {selectedExchange.assigned_day}
                  </p>
                </div>
                <div className="space-y-2">
                  {getExchangeTypeBadge(selectedExchange.exchange_type)}
                  {getStatusBadge(selectedExchange.exchange_status)}
                </div>
              </div>

              {/* Customer & Schedule Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Customer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p>{selectedExchange.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p>{selectedExchange.customer_phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Pincode</Label>
                      <p>{selectedExchange.pincode}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Assigned Day</Label>
                      <Badge variant="outline">{selectedExchange.assigned_day}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      Schedule Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Scheduled Date</Label>
                      <p>{selectedExchange.scheduled_date}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Time Slot</Label>
                      <p>{selectedExchange.scheduled_time_slot}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Estimated Duration</Label>
                      <p>{selectedExchange.estimated_duration_minutes} minutes</p>
                    </div>
                    {selectedExchange.exchange_notes && (
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm">{selectedExchange.exchange_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Toys Information */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Toys to Pickup */}
                {selectedExchange.pickup_toy_count > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <ArrowUp className="w-5 h-5 mr-2 text-red-500" />
                        Toys to Pickup ({selectedExchange.pickup_toy_count})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedExchange.toys_to_pickup.map((toy: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{toy.name || toy.title}</p>
                              <p className="text-sm text-muted-foreground">{toy.category}</p>
                            </div>
                            <Badge variant="outline">Qty: {toy.quantity || 1}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Toys to Dispatch */}
                {selectedExchange.dispatch_toy_count > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <ArrowDown className="w-5 h-5 mr-2 text-green-500" />
                        Toys to Dispatch ({selectedExchange.dispatch_toy_count})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedExchange.toys_to_dispatch.map((toy: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{toy.name || toy.title}</p>
                              <p className="text-sm text-muted-foreground">{toy.category}</p>
                            </div>
                            <Badge variant="outline">Qty: {toy.quantity || 1}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Completion Status */}
              {selectedExchange.exchange_status === 'completed' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      Completion Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Actual Date</Label>
                        <p>{selectedExchange.actual_exchange_date || 'Not recorded'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Actual Time</Label>
                        <p>{selectedExchange.actual_exchange_time || 'Not recorded'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Pickup Completed</Label>
                        <Badge variant={selectedExchange.pickup_completed ? 'default' : 'secondary'}>
                          {selectedExchange.pickup_completed ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Dispatch Completed</Label>
                        <Badge variant={selectedExchange.dispatch_completed ? 'default' : 'secondary'}>
                          {selectedExchange.dispatch_completed ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                    {selectedExchange.customer_satisfaction && (
                      <div>
                        <Label className="text-sm font-medium">Customer Satisfaction</Label>
                        <p>{selectedExchange.customer_satisfaction}/5 ⭐</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={isCustomerDetailDialogOpen} onOpenChange={setIsCustomerDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details - {selectedCustomer?.customer_name}</DialogTitle>
            <DialogDescription>
              Complete order history and subscription information
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.customer_name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {selectedCustomer.customer_phone}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {selectedCustomer.pincode}
                    </span>
                    <span>Customer since: {new Date(selectedCustomer.customer_since).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Badge variant={selectedCustomer.subscription_active ? "default" : "secondary"}>
                    {selectedCustomer.subscription_plan || 'No Active Plan'}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    Cycle {selectedCustomer.current_cycle} • {selectedCustomer.total_orders} total orders
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Recent Orders (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCustomer.recent_orders.map((order: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">Order #{order.id.slice(-8)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{order.order_type}</Badge>
                            {order.cycle_number && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Cycle {order.cycle_number}
                              </div>
                            )}
                          </div>
                        </div>

                        {order.toys_data && order.toys_data.length > 0 ? (
                          <div>
                            <Label className="text-sm font-medium">Toys in Order:</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {order.toys_data.map((toy: any, toyIndex: number) => (
                                <Badge key={toyIndex} variant="secondary" className="text-xs">
                                  {toy.name || toy.title || 'Unknown Toy'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No toy data available for this order
                          </div>
                        )}

                        <div className="flex justify-end mt-3">
                          {order.toys_data && order.toys_data.length > 0 && (
                            <Button
                              size="sm"
                              onClick={() => {
                                createExchangeMutation.mutate({
                                  customerId: selectedCustomer.customer_id,
                                  orderId: order.id
                                });
                              }}
                              disabled={createExchangeMutation.isPending}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {createExchangeMutation.isPending ? 'Creating...' : 'Create Exchange Operation'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Customer History Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Subscription Status</Label>
                      <p className="flex items-center">
                        {selectedCustomer.subscription_active ? (
                          <><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Active</>
                        ) : (
                          <><X className="w-4 h-4 text-red-500 mr-2" /> Inactive</>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Current Subscription Cycle</Label>
                      <p className="font-medium">{selectedCustomer.current_cycle}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Total Orders Ever</Label>
                      <p className="font-medium">{selectedCustomer.total_orders}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Orders with Toy Data</Label>
                      <p className="font-medium">
                        {selectedCustomer.recent_orders.filter((o: any) => o.toys_data && o.toys_data.length > 0).length} / {selectedCustomer.recent_orders.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary by Plan Type */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Operations by Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.exchangesByPlan).map(([plan, count]) => (
                <div key={plan} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{plan}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Customer Orders Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customers with Orders (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
                  <span className="text-lg">Loading customer data...</span>
                </div>
              ) : customersWithOrders.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No customers found</h3>
                  <p className="text-muted-foreground">
                    No customers have placed orders in the last 30 days
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customersWithOrders.map((customer) => (
                    <div key={customer.customer_id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold text-lg">{customer.customer_name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {customer.customer_phone}
                                </span>
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {customer.pincode}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Subscription</Label>
                              <div className="flex items-center space-x-2">
                                <Badge variant={customer.subscription_active ? "default" : "secondary"}>
                                  {customer.subscription_plan || 'None'}
                                </Badge>
                                {customer.subscription_active && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Current Cycle</Label>
                              <p className="font-medium">{customer.current_cycle}</p>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Total Orders</Label>
                              <p className="font-medium">{customer.total_orders}</p>
                            </div>

                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">Has Toy Data</Label>
                              <Badge variant={customer.has_toy_data ? "default" : "secondary"}>
                                {customer.has_toy_data ? "Yes" : "No"}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Label className="text-xs font-medium text-muted-foreground">Recent Orders</Label>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {customer.recent_orders.slice(0, 3).map((order: any, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {new Date(order.created_at).toLocaleDateString()} - {order.toys_data?.length || 0} toys
                                </Badge>
                              ))}
                              {customer.recent_orders.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{customer.recent_orders.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsCustomerDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>

                          {customer.has_toy_data && (
                            <Button
                              size="sm"
                              onClick={() => {
                                createExchangeMutation.mutate({ customerId: customer.customer_id });
                              }}
                              disabled={createExchangeMutation.isPending}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {createExchangeMutation.isPending ? 'Creating...' : 'Create Exchange'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExchangeManagementDashboard;