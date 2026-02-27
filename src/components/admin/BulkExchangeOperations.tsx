/**
 * Bulk Exchange Operations Component
 * Handles bulk processing of toy exchanges, pickups, and dispatches
 */

import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Package,
  CheckSquare,
  Square,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  Clock,
  Truck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertTriangle,
  X,
  Play,
  Pause
} from 'lucide-react';

import { 
  IntelligentExchangeService, 
  ToyExchange 
} from '@/services/intelligentExchangeService';

interface BulkExchangeOperationsProps {
  className?: string;
}

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  action: (selectedIds: string[]) => Promise<any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

const BulkExchangeOperations: React.FC<BulkExchangeOperationsProps> = ({ className }) => {
  const [selectedExchangeIds, setSelectedExchangeIds] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [operationStatus, setOperationStatus] = useState<string>('');

  const queryClient = useQueryClient();

  // Get exchanges for bulk operations
  const { data: exchanges = [], isLoading, refetch } = useQuery({
    queryKey: ['bulk-exchanges', selectedDay, selectedDate],
    queryFn: async () => {
      return await IntelligentExchangeService.getExchanges({
        day: selectedDay,
        date: selectedDate
      });
    },
    refetchInterval: 30000
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ exchangeIds, updates }: { exchangeIds: string[]; updates: any }) => {
      return await IntelligentExchangeService.bulkUpdateExchanges(exchangeIds, updates);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      toast.success(`Bulk operation completed: ${result.success} updated, ${result.failed} failed`);
      setSelectedExchangeIds([]);
      setBulkOperationInProgress(false);
    },
    onError: (error) => {
      toast.error('Bulk operation failed');
      console.error('Bulk operation error:', error);
      setBulkOperationInProgress(false);
    }
  });

  // Define bulk operations
  const bulkOperations: BulkOperation[] = [
    {
      id: 'confirm-all',
      name: 'Confirm Selected',
      description: 'Mark selected exchanges as confirmed',
      icon: CheckCircle,
      action: async (ids: string[]) => {
        return bulkUpdateMutation.mutateAsync({
          exchangeIds: ids,
          updates: { exchange_status: 'confirmed' }
        });
      },
      requiresConfirmation: false
    },
    {
      id: 'start-progress',
      name: 'Start In Progress',
      description: 'Mark selected exchanges as in progress',
      icon: Play,
      action: async (ids: string[]) => {
        return bulkUpdateMutation.mutateAsync({
          exchangeIds: ids,
          updates: { exchange_status: 'in_progress' }
        });
      },
      requiresConfirmation: false
    },
    {
      id: 'complete-all',
      name: 'Mark Completed',
      description: 'Mark selected exchanges as completed',
      icon: CheckSquare,
      action: async (ids: string[]) => {
        return bulkUpdateMutation.mutateAsync({
          exchangeIds: ids,
          updates: { 
            exchange_status: 'completed',
            actual_exchange_date: new Date().toISOString().split('T')[0],
            pickup_completed: true,
            dispatch_completed: true
          }
        });
      },
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to mark all selected exchanges as completed?'
    },
    {
      id: 'reschedule-tomorrow',
      name: 'Reschedule to Tomorrow',
      description: 'Reschedule selected exchanges to tomorrow',
      icon: Calendar,
      action: async (ids: string[]) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        return bulkUpdateMutation.mutateAsync({
          exchangeIds: ids,
          updates: { 
            scheduled_date: tomorrowDate,
            exchange_status: 'rescheduled'
          }
        });
      },
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to reschedule all selected exchanges to tomorrow?'
    },
    {
      id: 'cancel-selected',
      name: 'Cancel Selected',
      description: 'Cancel selected exchanges',
      icon: X,
      action: async (ids: string[]) => {
        // Cancel each exchange individually to handle time slot release
        const results = await Promise.allSettled(
          ids.map(id => IntelligentExchangeService.cancelExchange(id, 'Bulk cancellation'))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        return { success: successful, failed };
      },
      requiresConfirmation: true,
      confirmationMessage: 'Are you sure you want to cancel all selected exchanges? This action cannot be undone.'
    }
  ];

  // Handle select all/none
  const handleSelectAll = () => {
    if (selectedExchangeIds.length === exchanges.length) {
      setSelectedExchangeIds([]);
    } else {
      setSelectedExchangeIds(exchanges.map(e => e.id));
    }
  };

  // Handle individual selection
  const handleSelectExchange = (exchangeId: string) => {
    setSelectedExchangeIds(prev => 
      prev.includes(exchangeId)
        ? prev.filter(id => id !== exchangeId)
        : [...prev, exchangeId]
    );
  };

  // Execute bulk operation
  const executeBulkOperation = async (operation: BulkOperation) => {
    if (selectedExchangeIds.length === 0) {
      toast.error('Please select at least one exchange');
      return;
    }

    if (operation.requiresConfirmation) {
      const confirmed = confirm(operation.confirmationMessage || 'Are you sure?');
      if (!confirmed) return;
    }

    setBulkOperationInProgress(true);
    setOperationStatus(`Executing ${operation.name}...`);
    setOperationProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await operation.action(selectedExchangeIds);
      
      clearInterval(progressInterval);
      setOperationProgress(100);
      setOperationStatus('Operation completed successfully');
      
      setTimeout(() => {
        setBulkOperationInProgress(false);
        setOperationProgress(0);
        setOperationStatus('');
      }, 2000);
      
    } catch (error) {
      setBulkOperationInProgress(false);
      setOperationProgress(0);
      setOperationStatus('');
      console.error('Bulk operation error:', error);
    }
  };

  // Get exchange type badge
  const getExchangeTypeBadge = (type: string) => {
    const config = {
      'EXCHANGE': { color: 'bg-blue-100 text-blue-800', icon: ArrowUpDown, label: 'Exchange' },
      'PICKUP_ONLY': { color: 'bg-red-100 text-red-800', icon: ArrowUp, label: 'Pickup' },
      'DISPATCH_ONLY': { color: 'bg-green-100 text-green-800', icon: ArrowDown, label: 'Dispatch' },
      'FIRST_DELIVERY': { color: 'bg-purple-100 text-purple-800', icon: Truck, label: 'First' }
    };

    const typeConfig = config[type as keyof typeof config] || config.EXCHANGE;
    const Icon = typeConfig.icon;

    return (
      <div className={`${typeConfig.color} px-2 py-1 rounded text-xs flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {typeConfig.label}
      </div>
    );
  };

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Exchange Operations</h1>
          <p className="text-muted-foreground">
            Efficiently manage multiple toy exchanges, pickups, and dispatches
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Day and Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Operations</CardTitle>
          <CardDescription>
            Choose the day and date to view and manage exchange operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Service Day</Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Service Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations Progress */}
      {bulkOperationInProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{operationStatus}</span>
                <span className="text-sm text-muted-foreground">{operationProgress}%</span>
              </div>
              <Progress value={operationProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bulk Actions</CardTitle>
              <CardDescription>
                {selectedExchangeIds.length} of {exchanges.length} exchanges selected
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={exchanges.length === 0}
              >
                {selectedExchangeIds.length === exchanges.length ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bulkOperations.map((operation) => {
              const Icon = operation.icon;
              return (
                <Button
                  key={operation.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => executeBulkOperation(operation)}
                  disabled={selectedExchangeIds.length === 0 || bulkOperationInProgress}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{operation.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    {operation.description}
                  </p>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Exchange Selection Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Exchanges - {selectedDate}
          </CardTitle>
          <CardDescription>
            Select exchanges for bulk operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
              <span className="text-lg">Loading exchanges...</span>
            </div>
          ) : exchanges.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No exchanges found</h3>
              <p className="text-muted-foreground">
                No toy exchange operations found for {selectedDay} on {selectedDate}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedExchangeIds.length === exchanges.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Toys</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchanges.map((exchange) => (
                    <TableRow key={exchange.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedExchangeIds.includes(exchange.id)}
                          onCheckedChange={() => handleSelectExchange(exchange.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{exchange.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {exchange.customer_phone} • {exchange.pincode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{exchange.subscription_plan}</div>
                          <div className="text-xs text-muted-foreground">
                            {exchange.order_classification} • Cycle {exchange.cycle_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getExchangeTypeBadge(exchange.exchange_type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{exchange.scheduled_time_slot}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`px-2 py-1 rounded text-xs ${
                          exchange.exchange_status === 'completed' ? 'bg-green-100 text-green-800' :
                          exchange.exchange_status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                          exchange.exchange_status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          exchange.exchange_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exchange.exchange_status}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {exchange.pickup_toy_count > 0 && (
                            <div className="flex items-center space-x-1">
                              <ArrowUp className="w-3 h-3 text-red-500" />
                              <span>{exchange.pickup_toy_count}</span>
                            </div>
                          )}
                          {exchange.dispatch_toy_count > 0 && (
                            <div className="flex items-center space-x-1">
                              <ArrowDown className="w-3 h-3 text-green-500" />
                              <span>{exchange.dispatch_toy_count}</span>
                            </div>
                          )}
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

      {/* Operation Summary */}
      {selectedExchangeIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedExchangeIds.length}</div>
                <div className="text-sm text-muted-foreground">Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {exchanges.filter(e => selectedExchangeIds.includes(e.id) && e.exchange_type === 'EXCHANGE').length}
                </div>
                <div className="text-sm text-muted-foreground">Exchanges</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {exchanges.filter(e => selectedExchangeIds.includes(e.id) && e.exchange_type === 'PICKUP_ONLY').length}
                </div>
                <div className="text-sm text-muted-foreground">Pickups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {exchanges.filter(e => selectedExchangeIds.includes(e.id) && ['DISPATCH_ONLY', 'FIRST_DELIVERY'].includes(e.exchange_type)).length}
                </div>
                <div className="text-sm text-muted-foreground">Dispatches</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Bulk Operations Guide:</strong> Select multiple exchanges using the checkboxes, then use the bulk action buttons above. 
          Operations will be applied to all selected exchanges simultaneously. Use caution with destructive operations like cancellation.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default BulkExchangeOperations;