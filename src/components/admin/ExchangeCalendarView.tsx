/**
 * Exchange Calendar View
 * Monthly calendar showing exchange operations for each day
 * Alternative view to compare with the current day-based system
 */

import React, { useState, useMemo } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  User
} from 'lucide-react';

import {
  IntelligentExchangeService,
  ToyExchange,
  ExchangeFilters
} from '@/services/intelligentExchangeService';

interface ExchangeCalendarViewProps {
  className?: string;
}

interface CalendarDay {
  date: Date;
  dateString: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  operations: ToyExchange[];
  operationCount: number;
  hasExchanges: boolean;
  hasPickups: boolean;
  hasDispatches: boolean;
}

const ExchangeCalendarView: React.FC<ExchangeCalendarViewProps> = ({ className }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<ToyExchange | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [exchangeTypeFilter, setExchangeTypeFilter] = useState('all');

  const queryClient = useQueryClient();

  // Get all exchanges for the current month
  const { data: allExchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['exchanges-calendar', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      // Get exchanges for the entire month (no day filter)
      const filters: ExchangeFilters = {};

      if (statusFilter !== 'all') filters.status = statusFilter;
      if (exchangeTypeFilter !== 'all') filters.exchangeType = exchangeTypeFilter;

      return await IntelligentExchangeService.getExchanges(filters);
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });


  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of week for first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start

    // Calculate total days to show (6 weeks * 7 days = 42)
    const totalDays = 42;

    const calendarDays: CalendarDay[] = [];

    // Add days from previous month
    const prevMonth = new Date(year, month - 1);
    const lastDayPrevMonth = new Date(year, month, 0).getDate();

    for (let i = daysFromPrevMonth; i > 0; i--) {
      const day = lastDayPrevMonth - i + 1;
      const date = new Date(year, month - 1, day);
      const dateString = date.toISOString().split('T')[0];

      calendarDays.push({
        date,
        dateString,
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: false,
        operations: [],
        operationCount: 0,
        hasExchanges: false,
        hasPickups: false,
        hasDispatches: false
      });
    }

    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();

      // Filter operations for this date
      const dayOperations = allExchanges.filter(op => op.scheduled_date === dateString);

      const hasExchanges = dayOperations.some(op => op.exchange_type === 'EXCHANGE');
      const hasPickups = dayOperations.some(op => op.exchange_type === 'PICKUP_ONLY');
      const hasDispatches = dayOperations.some(op => op.exchange_type === 'DISPATCH_ONLY' || op.exchange_type === 'FIRST_DELIVERY');

      calendarDays.push({
        date,
        dateString,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday,
        operations: dayOperations,
        operationCount: dayOperations.length,
        hasExchanges,
        hasPickups,
        hasDispatches
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = totalDays - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = date.toISOString().split('T')[0];

      calendarDays.push({
        date,
        dateString,
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: false,
        operations: [],
        operationCount: 0,
        hasExchanges: false,
        hasPickups: false,
        hasDispatches: false
      });
    }

    return calendarDays;
  }, [currentDate, allExchanges, statusFilter, exchangeTypeFilter]);

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
      <Badge variant={typeConfig.variant} className={`${typeConfig.color} flex items-center gap-1 text-xs`}>
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
      <Badge variant={statusConfig.variant} className={`${statusConfig.color} flex items-center gap-1 text-xs`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Handle day click
  const handleDayClick = (day: CalendarDay) => {
    if (day.isCurrentMonth && day.operationCount > 0) {
      setSelectedDate(day.dateString);
    }
  };

  // Handle view details
  const handleViewDetails = (exchange: ToyExchange) => {
    setSelectedExchange(exchange);
    setIsDetailDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = async (exchange: ToyExchange, newStatus: ToyExchange['exchange_status']) => {
    try {
      const success = await IntelligentExchangeService.updateExchangeStatus(
        exchange.id,
        newStatus
      );

      if (success) {
        toast.success(`Exchange status updated to ${newStatus}`);
        refetch(); // Refresh the calendar data
      } else {
        toast.error('Failed to update exchange status');
      }
    } catch (error: any) {
      console.error('Error updating exchange status:', error);
      toast.error(`Error updating status: ${error.message}`);
    }
  };

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month and year
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
        <span className="text-lg">Loading calendar...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Calendar</h1>
          <p className="text-muted-foreground">
            Monthly calendar view of exchange operations - Click on any day to see operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter operations by status and type across the calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
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

            <div>
              <label className="text-sm font-medium">Operation Type</label>
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
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Click on any day with operations to view details. Days are color-coded by operation types.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Week day headers */}
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarData.map((day, index) => (
              <div
                key={index}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer transition-all
                  ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                  ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                  ${day.operationCount > 0 && day.isCurrentMonth ? 'hover:bg-blue-50 hover:border-blue-300' : ''}
                  ${!day.isCurrentMonth ? 'cursor-not-allowed' : ''}
                `}
                onClick={() => handleDayClick(day)}
              >
                <div className="text-sm font-medium mb-1">
                  {day.dayOfMonth}
                </div>

                {day.operationCount > 0 && day.isCurrentMonth && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-blue-600">
                      {day.operationCount} ops
                    </div>

                    {/* Operation type indicators */}
                    <div className="flex flex-wrap gap-1">
                      {day.hasExchanges && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" title="Exchange" />
                      )}
                      {day.hasPickups && (
                        <div className="w-2 h-2 bg-red-500 rounded-full" title="Pickup Only" />
                      )}
                      {day.hasDispatches && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Dispatch Only" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Exchange</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Pickup Only</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Dispatch Only</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>First Delivery</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Operations Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Operations for {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : ''}
            </DialogTitle>
            <DialogDescription>
              All exchange operations scheduled for this date
            </DialogDescription>
          </DialogHeader>

          {selectedDate && (
            <div className="space-y-4">
              {(() => {
                const dayOperations = calendarData.find(day => day.dateString === selectedDate)?.operations || [];

                if (dayOperations.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No operations scheduled</h3>
                      <p className="text-muted-foreground">
                        No exchange operations are scheduled for this date
                      </p>
                    </div>
                  );
                }

                return (
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
                        {dayOperations.map((exchange) => (
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
                              <div className="flex items-center justify-end space-x-2">
                                {/* Status Dropdown */}
                                <Select
                                  value={exchange.exchange_status}
                                  onValueChange={(newStatus) => handleStatusChange(exchange, newStatus as ToyExchange['exchange_status'])}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue>
                                      {getStatusBadge(exchange.exchange_status)}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[
                                      { value: 'scheduled', label: 'Scheduled', icon: Clock, color: 'blue' },
                                      { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'green' },
                                      { value: 'in_progress', label: 'In Progress', icon: RotateCcw, color: 'orange' },
                                      { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'gray' },
                                      { value: 'failed', label: 'Failed', icon: AlertTriangle, color: 'red' },
                                      { value: 'cancelled', label: 'Cancelled', icon: X, color: 'red' },
                                      { value: 'rescheduled', label: 'Rescheduled', icon: Calendar, color: 'purple' }
                                    ].map((status) => {
                                      const Icon = status.icon;
                                      return (
                                        <SelectItem key={status.value} value={status.value}>
                                          <div className="flex items-center space-x-2">
                                            <Icon className="h-4 w-4" />
                                            <span>{status.label}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>

                                {/* View Details Button */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(exchange)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                      <label className="text-sm font-medium">Name</label>
                      <p>{selectedExchange.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p>{selectedExchange.customer_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Pincode</label>
                      <p>{selectedExchange.pincode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assigned Day</label>
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
                      <label className="text-sm font-medium">Scheduled Date</label>
                      <p>{selectedExchange.scheduled_date}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Time Slot</label>
                      <p>{selectedExchange.scheduled_time_slot}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Estimated Duration</label>
                      <p>{selectedExchange.estimated_duration_minutes} minutes</p>
                    </div>
                    {selectedExchange.exchange_notes && (
                      <div>
                        <label className="text-sm font-medium">Notes</label>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ExchangeCalendarView;