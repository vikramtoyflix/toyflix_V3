import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Plus, Edit, Trash2, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddressService, type CustomerAddress, type AddressFormData } from "@/services/addressService";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default?: boolean;
}

interface AddressSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  onAddressSelected: (address: Address) => void;
  selectedAddress?: Address | null;
}

const AddressSelectionDialog = ({
  open,
  onOpenChange,
  customerId,
  onAddressSelected,
  selectedAddress
}: AddressSelectionDialogProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    first_name: '',
    last_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    delivery_instructions: ''
  });

  // Load customer addresses
  useEffect(() => {
    if (open && customerId) {
      loadCustomerAddresses();
    }
  }, [open, customerId]);

  const loadCustomerAddresses = async () => {
    if (!customerId) return;
    
    setIsLoading(true);
    try {
      console.log('📍 Loading addresses for customer:', customerId);
      const customerAddresses = await AddressService.getCustomerAddresses(customerId);
      
      // Convert CustomerAddress to Address format for compatibility
      const convertedAddresses: Address[] = customerAddresses.map(addr => ({
        id: addr.id,
        label: addr.label,
        line1: addr.address_line1,
        line2: addr.address_line2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        is_default: addr.is_default
      }));
      
      setAddresses(convertedAddresses);
      console.log('✅ Loaded addresses:', convertedAddresses.length);
      
      if (convertedAddresses.length === 0) {
        setShowNewAddressForm(true);
      }
    } catch (error) {
      console.error('❌ Error loading addresses:', error);
      toast.error('Failed to load saved addresses');
      setShowNewAddressForm(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    onAddressSelected(address);
    onOpenChange(false);
  };

  const handleAddNewAddress = async () => {
    if (!customerId) {
      toast.error('Customer ID is required to save address');
      return;
    }

    if (!newAddress.first_name || !newAddress.last_name || !newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const result = await AddressService.saveCustomerAddress(customerId, newAddress);
      
      if (result.success) {
        toast.success('Address saved successfully!');
        
        // Create the address object for immediate use
        const savedAddress: Address = {
          id: result.addressId || Date.now().toString(),
          label: newAddress.label,
          line1: newAddress.address_line1,
          line2: newAddress.address_line2,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          is_default: false
        };

        setAddresses(prev => [...prev, savedAddress]);
        setNewAddress({
          label: 'Home',
          first_name: '',
          last_name: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
          delivery_instructions: ''
        });
        setShowNewAddressForm(false);
        handleSelectAddress(savedAddress);
      } else {
        toast.error(result.message || 'Failed to save address');
      }
    } catch (error) {
      console.error('❌ Error saving address:', error);
      toast.error('Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddresses(prev => prev.filter(addr => addr.id !== addressId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Select Delivery Address
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading saved addresses...</span>
              </div>
            )}

            {/* Existing Addresses */}
            {!isLoading && addresses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Saved Addresses</h4>
                {addresses.map(address => (
                  <Card 
                    key={address.id}
                    className={`cursor-pointer transition-all ${
                      selectedAddress?.id === address.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectAddress(address)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{address.label}</span>
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>{address.line1}</div>
                            {address.line2 && <div>{address.line2}</div>}
                            <div>{address.city}, {address.state} {address.pincode}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {selectedAddress?.id === address.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add New Address */}
            {!showNewAddressForm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewAddressForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Address
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add New Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_label">Address Label</Label>
                    <Input
                      id="address_label"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="e.g., Home, Office, etc."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={newAddress.first_name}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={newAddress.last_name}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Street Address *</Label>
                    <Input
                      id="address_line1"
                      value={newAddress.address_line1}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address_line1: e.target.value }))}
                      placeholder="House/Flat number, Street name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Apartment/Suite (Optional)</Label>
                    <Input
                      id="address_line2"
                      value={newAddress.address_line2}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address_line2: e.target.value }))}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pincode">PIN Code *</Label>
                    <Input
                      id="pincode"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder="PIN Code"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="delivery_instructions">Delivery Instructions (Optional)</Label>
                    <Textarea
                      id="delivery_instructions"
                      value={newAddress.delivery_instructions}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                      placeholder="Any special delivery instructions..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAddNewAddress}
                      disabled={isSaving || !newAddress.first_name || !newAddress.last_name || !newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.pincode}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Address
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewAddressForm(false);
                        setNewAddress({
                          label: 'Home',
                          first_name: '',
                          last_name: '',
                          address_line1: '',
                          address_line2: '',
                          city: '',
                          state: '',
                          pincode: '',
                          country: 'India',
                          delivery_instructions: ''
                        });
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddressSelectionDialog; 