/**
 * Create New Pickup Component
 * Form for manually creating pickup schedules
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Save, User, Phone, MapPin, Calendar, Clock } from 'lucide-react';

import { PickupManagementService, ScheduledPickup } from '@/services/pickupManagementService';
import { PickupDay } from '@/utils/pincodeValidation';
import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { formatAddress } from '@/utils/addressFormatter';

interface CreatePickupProps {
  onPickupCreated: () => void;
}

const pickupService = new PickupManagementService();

const PICKUP_DAYS: PickupDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PICKUP_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const CreatePickup: React.FC<CreatePickupProps> = ({ onPickupCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    rental_order_id: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    pincode: '',
    pickup_day: '' as PickupDay | '',
    scheduled_date: '',
    scheduled_time_start: '10:00',
    scheduled_time_end: '12:00',
    pickup_status: 'scheduled',
    special_instructions: '',
    cycle_day: 28,
    toys_to_pickup: [] as any[]
  });

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        scheduled_date: tomorrow.toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await (supabaseAdmin as any)
        .from('custom_users')
        .select('id, first_name, last_name, phone, email, zip_code, shipping_address')
        .order('first_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        customer_phone: customer.phone || '',
        pincode: customer.zip_code || '',
        customer_address: customer.shipping_address ? formatAddress(customer.shipping_address) : ''
      }));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.customer_name || !formData.customer_phone || !formData.pincode || !formData.scheduled_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      // Create pickup data
      const pickupData = {
        rental_order_id: formData.rental_order_id || null,
        user_id: formData.customer_id || null,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address || {},
        pincode: formData.pincode,
        pickup_day: formData.pickup_day || getDayFromDate(formData.scheduled_date),
        scheduled_pickup_date: formData.scheduled_date,
        scheduled_pickup_time_start: formData.scheduled_time_start,
        scheduled_pickup_time_end: formData.scheduled_time_end,
        pickup_status: formData.pickup_status,
        pickup_notes: formData.special_instructions,
        days_into_cycle: formData.cycle_day,
        toys_to_pickup: formData.toys_to_pickup,
        toys_count: formData.toys_to_pickup.length,
        reschedule_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert into database
      const { error } = await (supabaseAdmin as any)
        .from('scheduled_pickups')
        .insert(pickupData);

      if (error) throw error;

      toast.success('Pickup created successfully!');
      setIsOpen(false);
      resetForm();
      onPickupCreated();
    } catch (error) {
      console.error('Error creating pickup:', error);
      toast.error('Failed to create pickup');
    } finally {
      setIsSaving(false);
    }
  };

  const getDayFromDate = (dateString: string): PickupDay => {
    const date = new Date(dateString);
    const days: PickupDay[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const resetForm = () => {
    setFormData({
      rental_order_id: '',
      customer_id: '',
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      pincode: '',
      pickup_day: '' as PickupDay | '',
      scheduled_date: '',
      scheduled_time_start: '10:00',
      scheduled_time_end: '12:00',
      pickup_status: 'scheduled',
      special_instructions: '',
      cycle_day: 28,
      toys_to_pickup: []
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Pickup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Pickup</DialogTitle>
          <DialogDescription>
            Schedule a new toy pickup for a customer
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_select">Select Customer (Optional)</Label>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Choose existing customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer_phone">Phone Number *</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                    placeholder="Pincode"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="customer_address">Address</Label>
                  <Textarea
                    id="customer_address"
                    value={formData.customer_address}
                    onChange={(e) => setFormData({...formData, customer_address: e.target.value})}
                    placeholder="Complete address"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Pickup Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="scheduled_date">Pickup Date *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduled_time_start">Start Time</Label>
                  <Input
                    id="scheduled_time_start"
                    type="time"
                    value={formData.scheduled_time_start}
                    onChange={(e) => setFormData({...formData, scheduled_time_start: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduled_time_end">End Time</Label>
                  <Input
                    id="scheduled_time_end"
                    type="time"
                    value={formData.scheduled_time_end}
                    onChange={(e) => setFormData({...formData, scheduled_time_end: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="pickup_day">Pickup Day</Label>
                  <Select 
                    value={formData.pickup_day} 
                    onValueChange={(value) => setFormData({...formData, pickup_day: value as PickupDay})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detected from date" />
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
                  <Label htmlFor="pickup_status">Status</Label>
                  <Select 
                    value={formData.pickup_status} 
                    onValueChange={(value) => setFormData({...formData, pickup_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PICKUP_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="cycle_day">Cycle Day</Label>
                  <Input
                    id="cycle_day"
                    type="number"
                    value={formData.cycle_day}
                    onChange={(e) => setFormData({...formData, cycle_day: parseInt(e.target.value) || 28})}
                    min="1"
                    max="30"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rental_order_id">Rental Order ID (Optional)</Label>
                <Input
                  id="rental_order_id"
                  value={formData.rental_order_id}
                  onChange={(e) => setFormData({...formData, rental_order_id: e.target.value})}
                  placeholder="Link to existing rental order"
                />
              </div>
              
              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({...formData, special_instructions: e.target.value})}
                  placeholder="Any special instructions for pickup"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create Pickup'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 