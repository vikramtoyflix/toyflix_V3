/**
 * Pincode Management Component
 * CRUD interface for managing pincode-day assignments for dispatch and pickup operations
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
  MapPin,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

import { PickupManagementService } from '@/services/pickupManagementService';
import { PickupDay, PincodeScheduleEntry } from '@/utils/pincodeValidation';

interface PincodeManagementProps {
  className?: string;
}

interface PincodeAssignment {
  id: string;
  pincode: string;
  area_name: string;
  zone: string;
  pickup_day: PickupDay;
  delivery_day: PickupDay;
  max_pickups_per_day: number;
  min_pickups_per_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface NewPincodeData {
  pincode: string;
  area_name: string;
  zone: string;
  pickup_day: PickupDay;
  max_pickups_per_day: number;
}

const PincodeManagement: React.FC<PincodeManagementProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPincode, setEditingPincode] = useState<PincodeAssignment | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [newPincodeData, setNewPincodeData] = useState<NewPincodeData>({
    pincode: '',
    area_name: '',
    zone: '',
    pickup_day: 'monday',
    max_pickups_per_day: 25
  });

  const queryClient = useQueryClient();
  const pickupService = new PickupManagementService();

  // Get pincode assignments
  const { data: pincodeAssignments = [], isLoading, refetch } = useQuery({
    queryKey: ['pincode-assignments'],
    queryFn: async () => {
      return await pickupService.getPincodeSchedule();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Add pincode mutation
  const addPincodeMutation = useMutation({
    mutationFn: async (data: NewPincodeData) => {
      return await pickupService.updatePincodeSchedule(
        data.pincode,
        data.pickup_day,
        data.area_name,
        data.zone
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincode-assignments'] });
      toast.success('Pincode assignment added successfully');
      setIsAddDialogOpen(false);
      setNewPincodeData({
        pincode: '',
        area_name: '',
        zone: '',
        pickup_day: 'monday',
        max_pickups_per_day: 25
      });
    },
    onError: (error) => {
      toast.error('Failed to add pincode assignment');
      console.error('Add pincode error:', error);
    }
  });

  // Update pincode mutation
  const updatePincodeMutation = useMutation({
    mutationFn: async (data: { pincode: string; pickup_day: PickupDay; area_name: string; zone: string }) => {
      return await pickupService.updatePincodeSchedule(
        data.pincode,
        data.pickup_day,
        data.area_name,
        data.zone
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincode-assignments'] });
      toast.success('Pincode assignment updated successfully');
      setIsEditDialogOpen(false);
      setEditingPincode(null);
    },
    onError: (error) => {
      toast.error('Failed to update pincode assignment');
      console.error('Update pincode error:', error);
    }
  });

  // Delete pincode mutation
  const deletePincodeMutation = useMutation({
    mutationFn: async (pincode: string) => {
      return await pickupService.deletePincodeSchedule(pincode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pincode-assignments'] });
      toast.success('Pincode assignment deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete pincode assignment');
      console.error('Delete pincode error:', error);
    }
  });

  // Filter pincode assignments
  const filteredAssignments = pincodeAssignments.filter(assignment => {
    const matchesSearch = searchTerm === '' || 
      assignment.pincode.includes(searchTerm) ||
      assignment.area_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesZone = zoneFilter === 'all' || assignment.zone === zoneFilter;
    const matchesDay = dayFilter === 'all' || assignment.pickup_day === dayFilter;
    
    return matchesSearch && matchesZone && matchesDay;
  });

  // Handle add pincode
  const handleAddPincode = () => {
    if (!newPincodeData.pincode || !newPincodeData.area_name || !newPincodeData.zone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    addPincodeMutation.mutate(newPincodeData);
  };

  // Handle edit pincode
  const handleEditPincode = (assignment: PincodeAssignment) => {
    setEditingPincode(assignment);
    setIsEditDialogOpen(true);
  };

  // Handle update pincode
  const handleUpdatePincode = () => {
    if (!editingPincode) return;
    
    updatePincodeMutation.mutate({
      pincode: editingPincode.pincode,
      pickup_day: editingPincode.pickup_day,
      area_name: editingPincode.area_name,
      zone: editingPincode.zone
    });
  };

  // Handle delete pincode
  const handleDeletePincode = (pincode: string) => {
    if (confirm(`Are you sure you want to delete pincode assignment for ${pincode}?`)) {
      deletePincodeMutation.mutate(pincode);
    }
  };

  // Get unique zones and days for filters
  const uniqueZones = [...new Set(pincodeAssignments.map(a => a.zone))].filter(Boolean);
  const weekDays: PickupDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Get assignments by day for summary
  const getAssignmentsByDay = (day: PickupDay) => {
    return pincodeAssignments.filter(a => a.pickup_day === day && a.is_active);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
        <span className="text-lg">Loading pincode assignments...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pincode Management</h1>
          <p className="text-muted-foreground">
            Configure day-wise pincode assignments for dispatch and pickup operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Pincode
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Pincode Assignment</DialogTitle>
                <DialogDescription>
                  Assign a pincode to a specific day for service operations
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    placeholder="e.g., 560001"
                    value={newPincodeData.pincode}
                    onChange={(e) => setNewPincodeData({...newPincodeData, pincode: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="area_name">Area Name *</Label>
                  <Input
                    id="area_name"
                    placeholder="e.g., Koramangala"
                    value={newPincodeData.area_name}
                    onChange={(e) => setNewPincodeData({...newPincodeData, area_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="zone">Zone *</Label>
                  <Select 
                    value={newPincodeData.zone} 
                    onValueChange={(value) => setNewPincodeData({...newPincodeData, zone: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="North">North Bangalore</SelectItem>
                      <SelectItem value="South">South Bangalore</SelectItem>
                      <SelectItem value="East">East Bangalore</SelectItem>
                      <SelectItem value="West">West Bangalore</SelectItem>
                      <SelectItem value="Central">Central Bangalore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="pickup_day">Service Day *</Label>
                  <Select 
                    value={newPincodeData.pickup_day} 
                    onValueChange={(value) => setNewPincodeData({...newPincodeData, pickup_day: value as PickupDay})}
                  >
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
                  <Label htmlFor="max_pickups">Max Operations Per Day</Label>
                  <Input
                    id="max_pickups"
                    type="number"
                    min="1"
                    max="50"
                    value={newPincodeData.max_pickups_per_day}
                    onChange={(e) => setNewPincodeData({...newPincodeData, max_pickups_per_day: parseInt(e.target.value) || 25})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddPincode}
                  disabled={addPincodeMutation.isPending}
                >
                  {addPincodeMutation.isPending ? 'Adding...' : 'Add Pincode'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary by Day */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {weekDays.map((day) => {
          const dayAssignments = getAssignmentsByDay(day);
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm capitalize">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dayAssignments.length}</div>
                <p className="text-xs text-muted-foreground">pincodes assigned</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pincode or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Zone</Label>
              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {uniqueZones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone} Bangalore
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Service Day</Label>
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {weekDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pincode Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Pincode Assignments ({filteredAssignments.length})</CardTitle>
              <CardDescription>
                Manage day-wise pincode assignments for service operations
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No pincode assignments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || zoneFilter !== 'all' || dayFilter !== 'all' 
                  ? 'No assignments match your current filters'
                  : 'Start by adding pincode assignments for your service areas'
                }
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Pincode
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pincode</TableHead>
                    <TableHead>Area Name</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Service Day</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.pincode}</TableCell>
                      <TableCell>{assignment.area_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.zone}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {assignment.pickup_day}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Max: {assignment.max_pickups_per_day}/day</div>
                          <div className="text-muted-foreground">
                            Min: {assignment.min_pickups_per_day}/day
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPincode(assignment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePincode(assignment.pincode)}
                            disabled={deletePincodeMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Edit Pincode Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pincode Assignment</DialogTitle>
            <DialogDescription>
              Update pincode assignment details
            </DialogDescription>
          </DialogHeader>
          
          {editingPincode && (
            <div className="space-y-4">
              <div>
                <Label>Pincode</Label>
                <Input
                  value={editingPincode.pincode}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div>
                <Label htmlFor="edit_area_name">Area Name</Label>
                <Input
                  id="edit_area_name"
                  value={editingPincode.area_name}
                  onChange={(e) => setEditingPincode({...editingPincode, area_name: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_zone">Zone</Label>
                <Select 
                  value={editingPincode.zone} 
                  onValueChange={(value) => setEditingPincode({...editingPincode, zone: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North">North Bangalore</SelectItem>
                    <SelectItem value="South">South Bangalore</SelectItem>
                    <SelectItem value="East">East Bangalore</SelectItem>
                    <SelectItem value="West">West Bangalore</SelectItem>
                    <SelectItem value="Central">Central Bangalore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit_pickup_day">Service Day</Label>
                <Select 
                  value={editingPincode.pickup_day} 
                  onValueChange={(value) => setEditingPincode({...editingPincode, pickup_day: value as PickupDay})}
                >
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
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdatePincode}
              disabled={updatePincodeMutation.isPending}
            >
              {updatePincodeMutation.isPending ? 'Updating...' : 'Update Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Day-wise Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Day-wise Coverage Summary</CardTitle>
          <CardDescription>
            Overview of pincode assignments by service day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((day) => {
              const dayAssignments = getAssignmentsByDay(day);
              const totalCapacity = dayAssignments.reduce((sum, a) => sum + a.max_pickups_per_day, 0);
              
              return (
                <Card key={day}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg capitalize flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      {day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pincodes:</span>
                      <span className="font-medium">{dayAssignments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Capacity:</span>
                      <span className="font-medium">{totalCapacity}/day</span>
                    </div>
                    <div className="space-y-1">
                      {dayAssignments.slice(0, 3).map((assignment) => (
                        <div key={assignment.pincode} className="text-xs text-muted-foreground">
                          {assignment.pincode} - {assignment.area_name}
                        </div>
                      ))}
                      {dayAssignments.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayAssignments.length - 3} more areas
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Coverage Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Analysis</CardTitle>
          <CardDescription>
            Service coverage and capacity analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Zone Distribution</h4>
              {uniqueZones.map((zone) => {
                const zoneCount = pincodeAssignments.filter(a => a.zone === zone && a.is_active).length;
                return (
                  <div key={zone} className="flex justify-between text-sm">
                    <span>{zone}:</span>
                    <span className="font-medium">{zoneCount} pincodes</span>
                  </div>
                );
              })}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Daily Capacity</h4>
              {weekDays.slice(0, 4).map((day) => {
                const dayCapacity = getAssignmentsByDay(day).reduce((sum, a) => sum + a.max_pickups_per_day, 0);
                return (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="capitalize">{day}:</span>
                    <span className="font-medium">{dayCapacity} operations</span>
                  </div>
                );
              })}
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">System Status</h4>
              <div className="flex justify-between text-sm">
                <span>Total Pincodes:</span>
                <span className="font-medium">{pincodeAssignments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active:</span>
                <span className="font-medium text-green-600">
                  {pincodeAssignments.filter(a => a.is_active).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Inactive:</span>
                <span className="font-medium text-red-600">
                  {pincodeAssignments.filter(a => !a.is_active).length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This system matches your previous WordPress setup with day-wise pincode assignments. 
          Exchange schedules will automatically use these assignments for route optimization.
          All changes are saved to the database and will be reflected in real-time exchange scheduling.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PincodeManagement;