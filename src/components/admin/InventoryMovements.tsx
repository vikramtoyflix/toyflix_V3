import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Activity, 
  ArrowDown, 
  ArrowUp, 
  Calendar as CalendarIcon,
  Download, 
  Eye,
  Filter,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  User,
  Wrench
} from 'lucide-react';
import { 
  useInventoryDashboard,
  useToyInventoryMovements,
  useRecordInventoryMovement,
  InventoryMovement 
} from '@/hooks/useInventoryManagement';
import { formatDistance, format } from 'date-fns';
import { toast } from 'sonner';

interface MovementFilter {
  toyId?: string;
  movementType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

const InventoryMovements: React.FC = () => {
  const [filters, setFilters] = useState<MovementFilter>({});
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);
  const [newMovementDialogOpen, setNewMovementDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Hooks
  const { data: dashboardData, isLoading } = useInventoryDashboard();
  const recordMovement = useRecordInventoryMovement();
  
  // Extract recentMovements from dashboard data
  const recentMovements = dashboardData?.recentMovements || [];

  // Get unique movement types and toys for filters
  const movementTypes = useMemo(() => {
    if (!recentMovements) return [];
    return Array.from(new Set(recentMovements.map(m => m.movement_type)));
  }, [recentMovements]);

  const uniqueToys = useMemo(() => {
    if (!recentMovements) return [];
    const toyMap = new Map();
    recentMovements.forEach(m => {
      if (m.toy_id && m.toys?.name) {
        toyMap.set(m.toy_id, m.toys.name);
      }
    });
    return Array.from(toyMap.entries()).map(([id, name]) => ({ id, name }));
  }, [recentMovements]);

  // Filter movements based on current filters
  const filteredMovements = useMemo(() => {
    if (!recentMovements) return [];
    
    return recentMovements.filter(movement => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          movement.toys?.name.toLowerCase().includes(searchLower) ||
          movement.movement_type.toLowerCase().includes(searchLower) ||
          movement.movement_reason?.toLowerCase().includes(searchLower) ||
          movement.notes?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Toy filter
      if (filters.toyId && movement.toy_id !== filters.toyId) {
        return false;
      }

      // Movement type filter
      if (filters.movementType && movement.movement_type !== filters.movementType) {
        return false;
      }

      // Date range filter
      const movementDate = new Date(movement.created_at);
      if (filters.dateFrom && movementDate < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && movementDate > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [recentMovements, filters]);

  // Group movements by date for better organization
  const groupedMovements = useMemo(() => {
    const groups: Record<string, InventoryMovement[]> = {};
    
    filteredMovements.forEach(movement => {
      const date = format(new Date(movement.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(movement);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, movements]) => ({
        date,
        movements: movements.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }));
  }, [filteredMovements]);

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'RENTAL_OUT': return 'destructive';
      case 'RENTAL_RETURN': return 'default';
      case 'PURCHASE': return 'default';
      case 'DAMAGE': return 'destructive';
      case 'LOSS': return 'destructive';
      case 'MAINTENANCE': return 'secondary';
      case 'REPAIR_COMPLETE': return 'default';
      case 'ADJUSTMENT': return 'secondary';
      case 'TRANSFER': return 'outline';
      default: return 'outline';
    }
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'RENTAL_OUT': return <ArrowDown className="h-4 w-4" />;
      case 'RENTAL_RETURN': return <ArrowUp className="h-4 w-4" />;
      case 'PURCHASE': return <Package className="h-4 w-4" />;
      case 'DAMAGE': return <Wrench className="h-4 w-4" />;
      case 'LOSS': return <TrendingDown className="h-4 w-4" />;
      case 'MAINTENANCE': return <Wrench className="h-4 w-4" />;
      case 'REPAIR_COMPLETE': return <TrendingUp className="h-4 w-4" />;
      case 'ADJUSTMENT': return <RefreshCw className="h-4 w-4" />;
      case 'TRANSFER': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const clearFilters = () => {
    setFilters({});
    setDateFrom(undefined);
    setDateTo(undefined);
    toast.success('Filters cleared');
  };

  const exportMovements = () => {
    if (!filteredMovements.length) {
      toast.error('No movements to export');
      return;
    }

    const csvContent = [
      ['Date', 'Time', 'Toy', 'Movement Type', 'Quantity Change', 'Previous', 'New', 'Reason', 'Notes'].join(','),
      ...filteredMovements.map(movement => [
        format(new Date(movement.created_at), 'yyyy-MM-dd'),
        format(new Date(movement.created_at), 'HH:mm:ss'),
        movement.toys?.name || 'Unknown',
        movement.movement_type.replace('_', ' '),
        movement.quantity_change,
        movement.previous_available,
        movement.new_available,
        movement.movement_reason || '',
        movement.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Movements exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inventory movements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Movements</h2>
          <p className="text-muted-foreground">
            Detailed audit trail of all inventory changes and movements
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={exportMovements}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={newMovementDialogOpen} onOpenChange={setNewMovementDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Activity className="h-4 w-4 mr-2" />
                Record Movement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Movement</DialogTitle>
                <DialogDescription>
                  Manually record an inventory movement
                </DialogDescription>
              </DialogHeader>
              <NewMovementForm onClose={() => setNewMovementDialogOpen(false)} />
            </DialogContent>
          </Dialog>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search movements..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Toy Filter */}
            <div className="space-y-2">
              <Label>Toy</Label>
              <Select 
                value={filters.toyId || 'all'} 
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  toyId: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All toys" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All toys</SelectItem>
                  {uniqueToys.map(toy => (
                    <SelectItem key={toy.id} value={toy.id}>
                      {toy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Movement Type Filter */}
            <div className="space-y-2">
              <Label>Movement Type</Label>
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
                  {movementTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      setFilters(prev => ({ ...prev, dateFrom: date }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      setFilters(prev => ({ ...prev, dateTo: date }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {(filters.searchTerm || filters.toyId || filters.movementType || filters.dateFrom || filters.dateTo) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Movements</p>
                <p className="text-lg font-semibold">{filteredMovements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Items Out</p>
                <p className="text-lg font-semibold">
                  {filteredMovements
                    .filter(m => m.quantity_change < 0)
                    .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0)
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Items In</p>
                <p className="text-lg font-semibold">
                  {filteredMovements
                    .filter(m => m.quantity_change > 0)
                    .reduce((sum, m) => sum + m.quantity_change, 0)
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Unique Toys</p>
                <p className="text-lg font-semibold">
                  {new Set(filteredMovements.map(m => m.toy_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements List */}
      <div className="space-y-4">
        {groupedMovements.length > 0 ? (
          groupedMovements.map(({ date, movements }) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(new Date(date), 'EEEE, MMMM do, yyyy')}
                </CardTitle>
                <CardDescription>
                  {movements.length} movement{movements.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Toy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {format(new Date(movement.created_at), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {movement.toys?.name || 'Unknown Toy'}
                            </div>
                            {movement.toys?.category && (
                              <div className="text-xs text-muted-foreground">
                                {movement.toys.category.replace('_', ' ')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getMovementTypeColor(movement.movement_type)}>
                            {getMovementTypeIcon(movement.movement_type)}
                            <span className="ml-1">
                              {movement.movement_type.replace('_', ' ')}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {movement.previous_available} → {movement.new_available}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-sm">
                            {movement.movement_reason || movement.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedMovement(movement)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Movement Details</DialogTitle>
                              </DialogHeader>
                              <MovementDetailsDialog movement={movement} />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Movements Found</h3>
              <p className="text-muted-foreground">
                {Object.keys(filters).some(key => filters[key as keyof MovementFilter])
                  ? "No movements match your current filters."
                  : "No inventory movements have been recorded yet."
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Movement Details Dialog Component
const MovementDetailsDialog: React.FC<{ movement: InventoryMovement }> = ({ movement }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Movement ID</Label>
          <p className="text-sm text-muted-foreground">{movement.id}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Date & Time</Label>
          <p className="text-sm text-muted-foreground">
            {format(new Date(movement.created_at), 'PPP p')}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Toy</Label>
          <p className="text-sm text-muted-foreground">
            {movement.toys?.name || 'Unknown Toy'}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Category</Label>
          <p className="text-sm text-muted-foreground">
            {movement.toys?.category?.replace('_', ' ') || 'Unknown'}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Movement Type</Label>
          <Badge variant="outline">
            {movement.movement_type.replace('_', ' ')}
          </Badge>
        </div>
        <div>
          <Label className="text-sm font-medium">Quantity Change</Label>
          <p className={`text-sm font-semibold ${
            movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Previous Stock</Label>
          <p className="text-sm text-muted-foreground">{movement.previous_available}</p>
        </div>
        <div>
          <Label className="text-sm font-medium">New Stock</Label>
          <p className="text-sm text-muted-foreground">{movement.new_available}</p>
        </div>
      </div>
      
      {movement.movement_reason && (
        <div>
          <Label className="text-sm font-medium">Reason</Label>
          <p className="text-sm text-muted-foreground">{movement.movement_reason}</p>
        </div>
      )}
      
      {movement.notes && (
        <div>
          <Label className="text-sm font-medium">Notes</Label>
          <p className="text-sm text-muted-foreground">{movement.notes}</p>
        </div>
      )}
      
      {movement.rental_order_id && (
        <div>
          <Label className="text-sm font-medium">Related Order</Label>
          <p className="text-sm text-muted-foreground">{movement.rental_order_id}</p>
        </div>
      )}
    </div>
  );
};

// New Movement Form Component
const NewMovementForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    toyId: '',
    movementType: '',
    quantityChange: 0,
    reason: '',
    notes: ''
  });

  const recordMovement = useRecordInventoryMovement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.toyId || !formData.movementType || formData.quantityChange === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await recordMovement.mutateAsync({
        toyId: formData.toyId,
        movementType: formData.movementType,
        quantityChange: formData.quantityChange,
        movementReason: formData.reason,
        notes: formData.notes
      });
      
      toast.success('Movement recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error recording movement:', error);
      toast.error('Failed to record movement');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Toy ID *</Label>
        <Input
          placeholder="Enter toy UUID"
          value={formData.toyId}
          onChange={(e) => setFormData(prev => ({ ...prev, toyId: e.target.value }))}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Movement Type *</Label>
        <Select
          value={formData.movementType}
          onValueChange={(value) => setFormData(prev => ({ ...prev, movementType: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select movement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="RENTAL_OUT">Rental Out</SelectItem>
            <SelectItem value="RENTAL_RETURN">Rental Return</SelectItem>
            <SelectItem value="PURCHASE">Purchase</SelectItem>
            <SelectItem value="DAMAGE">Damage</SelectItem>
            <SelectItem value="LOSS">Loss</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="REPAIR_COMPLETE">Repair Complete</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            <SelectItem value="TRANSFER">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Quantity Change *</Label>
        <Input
          type="number"
          placeholder="Enter quantity change (negative for decrease)"
          value={formData.quantityChange}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            quantityChange: parseInt(e.target.value) || 0 
          }))}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Reason</Label>
        <Input
          placeholder="Enter reason for movement"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={recordMovement.isPending}>
          {recordMovement.isPending ? 'Recording...' : 'Record Movement'}
        </Button>
      </div>
    </form>
  );
};

export default InventoryMovements; 