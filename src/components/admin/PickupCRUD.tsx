/**
 * Pickup CRUD Component
 * Complete Create, Read, Update, Delete operations for pickup management
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Edit2, 
  Trash2, 
  Eye, 
  Plus, 
  Save, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Package,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';

import { PickupManagementService, ScheduledPickup } from '@/services/pickupManagementService';
import { PickupDay } from '@/utils/pincodeValidation';
import { formatAddress } from '@/utils/addressFormatter';

interface PickupCRUDProps {
  pickup: ScheduledPickup;
  onUpdate: () => void;
}

const pickupService = new PickupManagementService();

const PICKUP_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', icon: Calendar, color: 'blue' },
  { value: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'green' },
  { value: 'in_transit', label: 'In Transit', icon: RotateCcw, color: 'yellow' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'gray' },
  { value: 'failed', label: 'Failed', icon: AlertTriangle, color: 'red' },
  { value: 'rescheduled', label: 'Rescheduled', icon: Calendar, color: 'orange' },
  { value: 'cancelled', label: 'Cancelled', icon: X, color: 'red' }
];

const PICKUP_DAYS: PickupDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const PickupCRUD: React.FC<PickupCRUDProps> = ({ pickup, onUpdate }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editData, setEditData] = useState<Partial<ScheduledPickup>>({});

  useEffect(() => {
    setEditData({
      customer_name: pickup.customer_name,
      customer_phone: pickup.customer_phone,
      customer_address: typeof pickup.customer_address === 'object' 
        ? formatAddress(pickup.customer_address) 
        : pickup.customer_address || '',
      pincode: pickup.pincode,
      pickup_day: pickup.pickup_day,
      scheduled_date: pickup.scheduled_date,
      scheduled_time_slot: pickup.scheduled_time_slot,
      pickup_status: pickup.pickup_status,
      special_instructions: pickup.special_instructions,
      cycle_day: pickup.cycle_day
    });
  }, [pickup]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const success = await pickupService.updateScheduledPickupStatus(pickup.id, newStatus as any);
      if (success) {
        toast.success(`Pickup status updated to ${newStatus}`);
        onUpdate();
      } else {
        toast.error('Failed to update pickup status');
      }
    } catch (error) {
      console.error('Error updating pickup status:', error);
      toast.error('Error updating pickup status');
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      // Call update method from pickup service
      const success = await pickupService.updatePickupDetails(pickup.id, editData);
      if (success) {
        toast.success('Pickup updated successfully');
        setIsEditOpen(false);
        onUpdate();
      } else {
        toast.error('Failed to update pickup');
      }
    } catch (error) {
      console.error('Error updating pickup:', error);
      toast.error('Failed to update pickup');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Mark as cancelled
      await handleStatusChange('cancelled');
      toast.success('Pickup cancelled successfully');
      setIsDeleting(false);
      onUpdate();
    } catch (error) {
      console.error('Error cancelling pickup:', error);
      toast.error('Failed to cancel pickup');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'confirmed': return 'secondary';
      case 'in_transit': return 'outline';
      case 'failed': return 'destructive';
      case 'cancelled': return 'destructive';
      case 'scheduled': return 'secondary';
      case 'rescheduled': return 'outline';
      default: return 'secondary';
    }
  };

  const StatusIcon = PICKUP_STATUSES.find(s => s.value === pickup.pickup_status)?.icon || Calendar;

  return (
    <div className="flex items-center space-x-2">
      {/* Quick Status Change */}
      <Select value={pickup.pickup_status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-32">
          <SelectValue>
            <Badge variant={getStatusBadgeVariant(pickup.pickup_status)}>
              {pickup.pickup_status}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PICKUP_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              <div className="flex items-center space-x-2">
                <status.icon className="h-4 w-4" />
                <span>{status.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* View Details */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pickup Details - {pickup.customer_name}</DialogTitle>
            <DialogDescription>
              Scheduled for {pickup.scheduled_date} • {pickup.scheduled_time_slot}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="toys">Toys ({pickup.toys_to_pickup.length})</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer Information</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.customer_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.customer_phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.pincode}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Pickup Schedule</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.scheduled_date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{pickup.scheduled_time_slot}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={getStatusBadgeVariant(pickup.pickup_status)}>
                        {pickup.pickup_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
                             <div>
                 <Label className="text-sm font-medium">Address</Label>
                 <p className="mt-1 text-sm text-muted-foreground">{formatAddress(pickup.customer_address)}</p>
               </div>
              
              {pickup.special_instructions && (
                <div>
                  <Label className="text-sm font-medium">Special Instructions</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{pickup.special_instructions}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold">{pickup.cycle_day}</div>
                  <div className="text-sm text-muted-foreground">Cycle Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{pickup.toys_to_pickup.length}</div>
                  <div className="text-sm text-muted-foreground">Toys to Pickup</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold capitalize">{pickup.pickup_day}</div>
                  <div className="text-sm text-muted-foreground">Pickup Day</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="toys" className="space-y-2">
              {pickup.toys_to_pickup.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No toys scheduled for pickup</p>
              ) : (
                pickup.toys_to_pickup.map((toy: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{toy.name || toy.title}</h4>
                          <p className="text-sm text-muted-foreground">{toy.category} • {toy.condition}</p>
                        </div>
                        <Badge variant="outline">Qty: {toy.quantity || 1}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="history">
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Created:</strong> {new Date(pickup.created_at).toLocaleString()}
                </div>
                <div className="text-sm">
                  <strong>Last Updated:</strong> {new Date(pickup.updated_at).toLocaleString()}
                </div>
                {pickup.reschedule_count && pickup.reschedule_count > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This pickup has been rescheduled {pickup.reschedule_count} time(s).
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Pickup */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pickup - {pickup.customer_name}</DialogTitle>
            <DialogDescription>
              Update pickup details and scheduling information
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={editData.customer_name || ''}
                onChange={(e) => setEditData({...editData, customer_name: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="customer_phone">Phone Number</Label>
              <Input
                id="customer_phone"
                value={editData.customer_phone || ''}
                onChange={(e) => setEditData({...editData, customer_phone: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={editData.pincode || ''}
                onChange={(e) => setEditData({...editData, pincode: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="pickup_day">Pickup Day</Label>
              <Select 
                value={editData.pickup_day || ''} 
                onValueChange={(value) => setEditData({...editData, pickup_day: value as PickupDay})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pickup day" />
                </SelectTrigger>
                <SelectContent>
                  {PICKUP_DAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={editData.scheduled_date || ''}
                onChange={(e) => setEditData({...editData, scheduled_date: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="scheduled_time_slot">Time Slot</Label>
              <Input
                id="scheduled_time_slot"
                placeholder="e.g., 10:00-12:00"
                value={editData.scheduled_time_slot || ''}
                onChange={(e) => setEditData({...editData, scheduled_time_slot: e.target.value})}
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="customer_address">Address</Label>
              <Textarea
                id="customer_address"
                value={editData.customer_address || ''}
                onChange={(e) => setEditData({...editData, customer_address: e.target.value})}
                rows={2}
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="special_instructions">Special Instructions</Label>
              <Textarea
                id="special_instructions"
                value={editData.special_instructions || ''}
                onChange={(e) => setEditData({...editData, special_instructions: e.target.value})}
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete/Cancel Pickup */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700"
      >
        {isDeleting ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}; 