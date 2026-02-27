/**
 * Pickup Dashboard Component
 * Integrates with existing dispatch system to show pickup schedules and routes
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Calendar,
  Clock,
  MapPin,
  Phone,
  Truck,
  User,
  Package,
  Route,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Download,
  Filter,
  Search,
  Plus
} from 'lucide-react';

import { PickupDay } from '@/utils/pincodeValidation';
import { PickupManagementService, ScheduledPickup, PickupRoute, PickupPerformanceMetrics, SystemConfig } from '@/services/pickupManagementService';
import { PickupCRUD } from './PickupCRUD';
import { CreatePickup } from './CreatePickup';
import { formatAddressShort } from '@/utils/addressFormatter';

interface PickupDashboardProps {
  className?: string;
}

// Create service instance
const pickupService = new PickupManagementService();

const PickupDashboard: React.FC<PickupDashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('scheduled');
  const [fromDate, setFromDate] = useState(''); // Week start date
  const [toDate, setToDate] = useState(''); // Week end date
  const [selectedDay, setSelectedDay] = useState<PickupDay>('monday');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  
  const [scheduledPickups, setScheduledPickups] = useState<ScheduledPickup[]>([]);
  const [pickupRoutes, setPickupRoutes] = useState<PickupRoute[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PickupPerformanceMetrics | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // Load data on component mount and when date changes
  useEffect(() => {
    loadPickupData();
    loadPerformanceMetrics();
    loadSystemConfig();
  }, [fromDate, toDate, statusFilter]); // Add statusFilter dependency

  // Helper functions for date range
  const getCurrentWeekRange = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Get Monday
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Get Sunday
    
    return {
      from: monday.toISOString().split('T')[0],
      to: sunday.toISOString().split('T')[0]
    };
  };

  const isWithinDateRange = (date: string) => {
    if (!fromDate && !toDate) return true; // No filter = show all
    if (!fromDate || !toDate) return true; // Incomplete range = show all
    
    return date >= fromDate && date <= toDate;
  };

  const getDateRangeText = () => {
    if (!fromDate && !toDate) return 'all dates';
    if (!fromDate || !toDate) return 'date range';
    return `${fromDate} to ${toDate}`;
  };

  const loadPickupData = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Loading pickup data with filters:', { 
        dateRange: getDateRangeText(), 
        statusFilter 
      });
      
      // Load all scheduled pickups (we'll filter by date range on client side)
      const pickups = await pickupService.getScheduledPickups({ 
        pickup_status: statusFilter !== 'all' ? statusFilter : undefined
      });
      console.log(`✅ Loaded ${pickups.length} pickups for ${getDateRangeText()}`);
      console.log('📊 Sample pickup data:', pickups[0]);
      setScheduledPickups(pickups);
      
      // Load all pickup routes (we'll filter by date range on client side)
      const routes = await pickupService.getPickupRoutes({});
      console.log(`✅ Loaded ${routes.length} routes for ${getDateRangeText()}`);
      setPickupRoutes(routes);

      // If no data found, run diagnostics
      if (pickups.length === 0 && routes.length === 0) {
        console.log('🩺 No pickup data found, running diagnostics...');
        const diagnosis = await pickupService.diagnosePickupData();
        console.log('🩺 Pickup System Diagnosis:', diagnosis);
        
        if (diagnosis.errors.length > 0) {
          console.error('❌ Pickup system errors found:', diagnosis.errors);
          toast.error(`Pickup system issues detected: ${diagnosis.errors.join(', ')}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to load pickup data:', error);
      toast.error(`Failed to load pickup data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = await pickupService.getPickupPerformanceMetrics();
      setPerformanceMetrics(metrics);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      toast.error('Failed to load performance metrics');
    }
  };

  const loadSystemConfig = async () => {
    try {
      const config = await pickupService.getSystemConfig();
      setSystemConfig(config);
    } catch (error) {
      console.error('Failed to load system config:', error);
    }
  };

  const createNewRoute = async () => {
    try {
      const routeDate = fromDate || new Date().toISOString().split('T')[0];
      const date = new Date(routeDate);
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as PickupDay;
      
      const result = await pickupService.createPickupRoute({
        pickup_day: dayOfWeek,
        route_date: routeDate,
        planned_pickups: 0,
        completed_pickups: 0,
        route_status: 'planned',
        covered_pincodes: [],
        estimated_duration: '4-6 hours'
      });
      
      toast.success('Pickup route created successfully');
      loadPickupData();
      
    } catch (error) {
      console.error('Error creating pickup route:', error);
      toast.error('Failed to create pickup route');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'confirmed': return 'secondary';
      case 'in_progress': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot || '10:00-12:00';
  };

  // Filter pickups based on search, status, selected weekday, and date range
  const filteredPickups = scheduledPickups.filter(pickup => {
    const matchesSearch = searchTerm === '' || 
      pickup.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pickup.customer_phone.includes(searchTerm) ||
      pickup.pincode.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || pickup.pickup_status === statusFilter;
    const matchesDay = pickup.pickup_day === selectedDay;
    const matchesDateRange = isWithinDateRange(pickup.scheduled_date);
    
    return matchesSearch && matchesStatus && matchesDay && matchesDateRange;
  });

  // Filter routes based on date range
  const filteredRoutes = pickupRoutes.filter(route => {
    return isWithinDateRange(route.route_date);
  });

  // Get pickup counts by day for tab labels (with date range filter)
  const getPickupCountByDay = (day: PickupDay) => {
    return scheduledPickups.filter(pickup => {
      const matchesStatus = statusFilter === 'all' || pickup.pickup_status === statusFilter;
      const matchesDateRange = isWithinDateRange(pickup.scheduled_date);
      return pickup.pickup_day === day && matchesStatus && matchesDateRange;
    }).length;
  };

  const pickupDays: PickupDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pickup Dashboard</h1>
          <p className="text-muted-foreground">
            {fromDate && toDate 
              ? `Toy pickup schedules and routes from ${fromDate} to ${toDate}`
              : 'Manage toy pickup schedules and routes across Bangalore'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="from-date" className="text-sm">From:</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex items-center space-x-1">
            <Label htmlFor="to-date" className="text-sm">To:</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Button 
            onClick={() => {
              const weekRange = getCurrentWeekRange();
              setFromDate(weekRange.from);
              setToDate(weekRange.to);
            }} 
            size="sm" 
            variant="outline"
          >
            This Week
          </Button>
          <Button 
            onClick={() => {
              setFromDate('');
              setToDate('');
            }} 
            size="sm" 
            variant="outline"
          >
            Clear Dates
          </Button>
          <CreatePickup onPickupCreated={loadPickupData} />
          <Button onClick={createNewRoute} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Route
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pickups</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledPickups.length}</div>
            <p className="text-xs text-muted-foreground">
              {fromDate && toDate ? `for ${getDateRangeText()}` : 'total scheduled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {scheduledPickups.filter(p => p.pickup_status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {scheduledPickups.length > 0 
                ? Math.round((scheduledPickups.filter(p => p.pickup_status === 'completed').length / scheduledPickups.length) * 100)
                : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRoutes.length}</div>
            <p className="text-xs text-muted-foreground">
                              {filteredRoutes.filter(r => r.route_status === 'in_progress').length} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage Rate</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics ? Math.round(performanceMetrics.completion_rate) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">Scheduled Pickups</TabsTrigger>
          <TabsTrigger value="routes">Pickup Routes</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Scheduled Pickups Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, phone, or pincode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <CreatePickup onPickupCreated={loadPickupData} />
          </div>

          {/* Weekday Tabs */}
          <Tabs value={selectedDay} onValueChange={(value) => setSelectedDay(value as PickupDay)}>
            <TabsList className="grid w-full grid-cols-6">
              {pickupDays.map((day) => (
                <TabsTrigger key={day} value={day} className="text-sm">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {getPickupCountByDay(day)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {pickupDays.map((day) => (
              <TabsContent key={day} value={day} className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredPickups.length === 0 ? (
                      <Card>
                        <CardContent className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">
                              No pickups scheduled for {day.charAt(0).toUpperCase() + day.slice(1)}
                              {statusFilter !== 'all' && ` with status: ${statusFilter}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredPickups.map((pickup) => (
                        <Card key={pickup.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{pickup.customer_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{pickup.customer_phone}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{pickup.pincode}</span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTimeSlot(pickup.scheduled_time_slot)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Package className="h-3 w-3" />
                                    <span>{pickup.toys_to_pickup.length} toys</span>
                                  </div>
                                  <span>Day {pickup.cycle_day} of cycle</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{formatAddressShort(pickup.customer_address)}</p>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{pickup.pickup_day}</Badge>
                                  {pickup.reschedule_count > 0 && (
                                    <Badge variant="outline" className="text-orange-600">
                                      Rescheduled {pickup.reschedule_count}x
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PickupCRUD pickup={pickup} onUpdate={loadPickupData} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Pickup Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          <div className="grid gap-4">
            {filteredRoutes.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">No pickup routes scheduled for this date</p>
                </CardContent>
              </Card>
            ) : (
              filteredRoutes.map((route) => (
                <Card key={route.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">{route.pickup_day} Route</CardTitle>
                      <Badge variant={route.route_status === 'completed' ? 'default' : 'secondary'}>
                        {route.route_status}
                      </Badge>
                    </div>
                    <CardDescription>{route.route_date}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Driver</Label>
                        <p className="font-medium">{route.driver_name || 'Not assigned'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Planned Pickups</Label>
                        <p className="font-medium">{route.planned_pickups}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Completed</Label>
                        <p className="font-medium">{route.completed_pickups}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Estimated Duration</Label>
                        <p className="font-medium">{route.estimated_duration}</p>
                      </div>
                    </div>
                    
                    {route.planned_pickups > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Progress</Label>
                        <Progress 
                          value={(route.completed_pickups / route.planned_pickups) * 100} 
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    {route.covered_pincodes.length > 0 && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Coverage Areas</Label>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {route.covered_pincodes.slice(0, 10).map((pincode) => (
                            <Badge key={pincode} variant="outline" className="text-xs">
                              {pincode}
                            </Badge>
                          ))}
                          {route.covered_pincodes.length > 10 && (
                            <Badge variant="outline" className="text-xs">
                              +{route.covered_pincodes.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics ? (
                  <>
                    <div className="flex justify-between">
                      <span>Total Scheduled:</span>
                      <span className="font-medium">{performanceMetrics.total_scheduled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium text-green-600">{performanceMetrics.total_completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <span className="font-medium text-red-600">{performanceMetrics.total_failed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="font-medium">{Math.round(performanceMetrics.completion_rate)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Daily Pickups:</span>
                      <span className="font-medium">{Math.round(performanceMetrics.average_pickups_per_day)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Peak Day:</span>
                      <span className="font-medium capitalize">{performanceMetrics.peak_pickup_day}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading metrics...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Current settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemConfig ? (
                  <>
                    <div className="flex justify-between">
                      <span>Advance Notice:</span>
                      <span className="font-medium">{systemConfig.advance_notice_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Daily Capacity:</span>
                      <span className="font-medium">{systemConfig.max_daily_capacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cycle Duration:</span>
                      <span className="font-medium">{systemConfig.pickup_cycle_days} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto Schedule:</span>
                      <Badge variant={systemConfig.auto_schedule_enabled ? 'default' : 'secondary'}>
                        {systemConfig.auto_schedule_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Pickups/Day:</span>
                      <span className="font-medium">{systemConfig.min_pickups_per_day}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Pickups/Day:</span>
                      <span className="font-medium">{systemConfig.max_pickups_per_day}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Loading configuration...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PickupDashboard; 