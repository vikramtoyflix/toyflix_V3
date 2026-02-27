import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatIndianDate, formatIndianTime, formatIndianDateTime } from '@/utils/dateUtils';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  Phone,
  Calendar,
  Search,
  Plus,
  Eye,
  User,
  MapPin,
  Printer,
  Hash,
  Copy,
  Clock,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ComprehensiveOrderDetails from './ComprehensiveOrderDetails';
import DispatchOrdersView from './DispatchOrdersView';

// Real data hooks for dispatch tracking using rental_orders
const usePendingDispatches = () => {
  return useQuery({
    queryKey: ['pending-dispatches'],
    queryFn: async () => {
      // Get pending orders from rental_orders table
      const { data: orders, error: ordersError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .in('status', ['pending', 'confirmed'])
        .or('dispatch_tracking_number.is.null,dispatch_tracking_number.eq.')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get customer info for each order
      const ordersWithCustomers = await Promise.all(
        (orders || []).map(async (order: any) => {
          const { data: customer } = await supabase
            .from('custom_users')
            .select('first_name, last_name, phone, subscription_plan')
            .eq('id', order.user_id)
            .single();

          // Extract toys from toys_data JSONB field
          const toysData = order.toys_data || [];
          const toysList = toysData.map((toy: any) => toy.name || toy.title).filter(Boolean);

          return {
            id: order.id,
            order_id: order.order_number || `ORD-${order.id.slice(0, 8)}`,
            customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown',
            customer_phone: customer?.phone || order.user_phone || 'N/A',
            subscription_plan: customer?.subscription_plan || order.subscription_plan || 'Standard',
            created_at: order.created_at,
            total_items: toysData.length,
            toys_list: toysList.join(', ') || 'No toys',
            toys: toysList,
            status: order.status,
            tracking_number: order.dispatch_tracking_number,
            shipping_address: order.shipping_address,
            rental_start_date: order.rental_start_date,
            rental_end_date: order.rental_end_date,
            total_amount: order.total_amount
          };
        })
      );

      return ordersWithCustomers;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

const useOverdueReturns = () => {
  return useQuery({
    queryKey: ['overdue-returns'],
    queryFn: async () => {
      // Get orders that are overdue for return from rental_orders
      const today = new Date().toISOString().split('T')[0];

      const { data: orders, error: ordersError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('status', 'delivered')
        .lt('rental_end_date', today)
        .is('returned_date', null)
        .order('rental_end_date', { ascending: true });

      if (ordersError) throw ordersError;

      // Get customer info for each overdue order
      const overdueOrders = await Promise.all(
        (orders || []).map(async (order: any) => {
          const { data: customer } = await supabase
            .from('custom_users')
            .select('first_name, last_name, phone')
            .eq('id', order.user_id)
            .single();

          // Extract toys from toys_data JSONB field
          const toysData = order.toys_data || [];
          const toysList = toysData.map((toy: any) => toy.name || toy.title).filter(Boolean);

          const endDate = new Date(order.rental_end_date);
          const currentDate = new Date();
          const overdueDays = Math.floor((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: order.id,
            customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown',
            customer_phone: customer?.phone || order.user_phone || 'N/A',
            dispatch_date: order.rental_start_date || order.created_at,
            expected_return_date: order.rental_end_date,
            overdue_by: `${overdueDays} days`,
            total_items: toysData.length,
            toys_list: toysList.join(', ') || 'No toys'
          };
        })
      );

      return overdueOrders;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Generate 10-digit alphanumeric UUID
const generateToyUUID = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate UUIDs for all toys in an order
const generateUUIDsForOrder = (toys: string[]): Array<{toyName: string, uuid: string}> => {
  return toys.map(toyName => ({
    toyName,
    uuid: generateToyUUID()
  }));
};

// Barcode component for displaying UUIDs as barcodes
const BarcodeDisplay = ({ uuid, toyName }: { uuid: string, toyName: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(uuid);
    toast.success('UUID copied to clipboard');
  };

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{toyName}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Barcode representation */}
      <div className="bg-white border-2 border-gray-300 p-2 rounded">
        <div className="flex justify-center mb-1">
          {/* Simple barcode-like representation */}
          <div className="flex space-x-px">
            {uuid.split('').map((char, index) => (
              <div
                key={index}
                className="bg-black"
                style={{
                  width: '2px',
                  height: char.match(/[0-9]/) ? '20px' : '15px'
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-center font-mono text-xs font-bold tracking-wider">
          {uuid}
        </div>
      </div>
    </div>
  );
};

// UUID Generation and Barcode Display Dialog
const UUIDGenerationDialog = ({ 
  open, 
  onOpenChange, 
  order, 
  onConfirmDispatch 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  order: any;
  onConfirmDispatch: (uuids: Array<{toyName: string, uuid: string}>) => void;
}) => {
  const [generatedUUIDs, setGeneratedUUIDs] = useState<Array<{toyName: string, uuid: string}>>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setGeneratedUUIDs([]);
      setTrackingNumber('');
      setDispatchNotes('');
      setIsGenerating(false);
      setIsConfirming(false);
    }
  }, [open]);

  // Don't render if no order is selected
  if (!order) {
    return null;
  }

  const handleGenerateUUIDs = () => {
    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      const uuids = generateUUIDsForOrder(order.toys || []);
      setGeneratedUUIDs(uuids);
      setIsGenerating(false);
      toast.success(`Generated ${uuids.length} UUIDs for toys`);
    }, 1000);
  };

  const handlePrintBarcodes = () => {
    // Create a printable window with all barcodes
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Toy Barcodes - Order ${order.orderId || 'Unknown'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .barcode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .barcode-item { border: 2px solid #000; padding: 10px; text-align: center; page-break-inside: avoid; }
            .barcode-visual { display: flex; justify-content: center; margin: 10px 0; }
            .barcode-line { background: #000; margin: 0 1px; }
            .uuid-text { font-family: monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px; }
            .toy-name { font-size: 12px; margin-bottom: 5px; font-weight: bold; }
            .order-info { text-align: center; margin-bottom: 20px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="order-info">
            <h2>Toy Barcodes</h2>
            <p><strong>Order:</strong> ${order.orderId || 'Unknown'} | <strong>Customer:</strong> ${order.customerName || 'Unknown'}</p>
            <p><strong>Date:</strong> ${formatIndianDate(new Date())}</p>
          </div>
          <div class="barcode-grid">
            ${generatedUUIDs.map(item => `
              <div class="barcode-item">
                <div class="toy-name">${item.toyName}</div>
                <div class="barcode-visual">
                  ${item.uuid.split('').map(char => 
                    `<div class="barcode-line" style="width: 3px; height: ${char.match(/[0-9]/) ? '30px' : '20px'};"></div>`
                  ).join('')}
                </div>
                <div class="uuid-text">${item.uuid}</div>
              </div>
            `).join('')}
          </div>
          <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()">Print Barcodes</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    toast.success('Barcode print dialog opened');
  };

  const handleConfirmDispatch = async () => {
    if (generatedUUIDs.length === 0) {
      toast.error('Please generate UUIDs first');
      return;
    }

    setIsConfirming(true);
    try {
      // Simulate API call to confirm dispatch
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onConfirmDispatch(generatedUUIDs);
      toast.success('Order dispatched successfully with UUID tracking');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to confirm dispatch');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Hash className="w-5 h-5" />
            <span>Generate UUIDs & Dispatch Order #{order.orderId || 'Unknown'}</span>
          </DialogTitle>
          <DialogDescription>
            Generate unique 10-digit alphanumeric codes for each toy and prepare barcodes for printing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Order Summary */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Order Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Customer:</span> {order.customerName || 'Unknown'}
              </div>
              <div>
                <span className="text-blue-700">Phone:</span> {order.phone || 'N/A'}
              </div>
              <div>
                <span className="text-blue-700">Items:</span> {order.toys?.length || 0} toys
              </div>
              <div>
                <span className="text-blue-700">Plan:</span> {order.subscriptionPlan || 'Standard'}
              </div>
            </div>
          </div>

          {/* UUID Generation Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">UUID Generation</h4>
              {generatedUUIDs.length === 0 ? (
                <Button 
                  onClick={handleGenerateUUIDs}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Hash className="w-4 h-4 mr-2" />
                      Generate UUIDs for {order.toys?.length || 0} Toys
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={handlePrintBarcodes}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Barcodes
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setGeneratedUUIDs([])}
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </div>

            {/* Generated UUIDs Display */}
            {generatedUUIDs.length > 0 && (
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Generated {generatedUUIDs.length} unique UUIDs
                  </p>
                  <p className="text-sm text-green-700">
                    Each toy now has a unique 10-digit alphanumeric code for tracking
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {generatedUUIDs.map((item, index) => (
                    <BarcodeDisplay 
                      key={index}
                      uuid={item.uuid}
                      toyName={item.toyName}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Details */}
          {generatedUUIDs.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Dispatch Details</h4>
              
              <div>
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter courier tracking number"
                />
              </div>

              <div>
                <Label htmlFor="notes">Dispatch Notes</Label>
                <Textarea
                  id="notes"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Any special instructions or notes"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {generatedUUIDs.length > 0 ? (
              <span className="text-green-600 font-medium">
                ✓ Ready to dispatch with {generatedUUIDs.length} UUIDs
              </span>
            ) : (
              'Generate UUIDs to proceed with dispatch'
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDispatch}
              disabled={generatedUUIDs.length === 0 || isConfirming}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConfirming ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Confirm Dispatch & Save UUIDs
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create Dispatch Order Dialog Component
const CreateDispatchOrderDialog = ({ 
  open, 
  onOpenChange, 
  onCreateDispatchOrders 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onCreateDispatchOrders: (selectedOrders: string[], orders: any[]) => Promise<{ success: boolean; count: number }>;
}) => {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch orders that can be dispatched
  const { data: availableOrders, isLoading } = useQuery({
    queryKey: ['available-orders-for-dispatch'],
    queryFn: async () => {
      // First get orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          rental_start_date,
          rental_end_date,
          shipping_address,
          user_id
        `)
        .in('status', ['pending'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) throw ordersError;

      // Then get customer data for each order
      const ordersWithCustomers = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: customer } = await supabase
            .from('custom_users')
            .select('first_name, last_name, phone, email, subscription_plan')
            .eq('id', order.user_id)
            .single();

          const { data: orderItems } = await supabase
            .from('order_items')
            .select(`
              id,
              quantity,
              subscription_category,
              age_group,
              toys!order_items_toy_id_fkey (
                id,
                name,
                brand,
                category
              )
            `)
            .eq('order_id', order.id);

          return {
            ...order,
            custom_users: customer,
            order_items: orderItems || []
          };
        })
      );

      return ordersWithCustomers;
    },
    enabled: open
  });

  const handleCreateDispatchOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to create dispatch orders');
      return;
    }

    setIsCreating(true);
    try {
      const result = await onCreateDispatchOrders(selectedOrders, availableOrders || []);
      
      if (result.success) {
        toast.success(`Successfully created ${result.count} dispatch order(s)`);
        setSelectedOrders([]);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to create dispatch orders');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address provided';
    
    // Handle string addresses (JSON parsing)
    let addr = address;
    if (typeof address === 'string') {
      try {
        addr = JSON.parse(address);
      } catch {
        return address || 'Invalid address format';
      }
    }
    
    // Try all possible field name variations
    const addressParts = [
      addr.address1 || addr.address_line1 || addr.address_line_1,
      addr.address2 || addr.address_line2 || addr.apartment || addr.address_line_2,
      addr.city,
      addr.state,
      addr.postcode || addr.postal_code || addr.zip_code
    ].filter(Boolean);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Incomplete address data';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Create Dispatch Orders</DialogTitle>
          <DialogDescription className="text-base">
            Select pending orders to create dispatch entries. These orders will be added to the dispatch queue for fulfillment.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content Area with Scroll */}
        <div className="flex-1 min-h-0 flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mr-3 text-blue-600" />
              <span className="text-lg">Loading available orders...</span>
            </div>
          ) : !availableOrders?.length ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-6" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders available for dispatch</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  All current orders may already be in the dispatch queue or there are no pending orders at the moment.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header with counts and select all */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900">
                    {availableOrders.length} orders available
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedOrders.length} selected
                  </div>
                  {selectedOrders.length > 0 && (
                    <Badge variant="default" className="bg-blue-600">
                      {selectedOrders.length} ready for dispatch
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedOrders(
                    selectedOrders.length === availableOrders.length 
                      ? [] 
                      : availableOrders.map(order => order.id)
                  )}
                  className="min-w-[100px]"
                >
                  {selectedOrders.length === availableOrders.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Scrollable Orders List */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {availableOrders.map((order, index) => (
                  <div
                    key={order.id}
                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedOrders.includes(order.id) 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => toggleOrderSelection(order.id)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 pt-1">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="w-5 h-5"
                        />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-lg font-semibold text-gray-900">
                              Order #{order.id.slice(0, 8)}...
                            </h4>
                            <Badge 
                              variant={order.status === 'pending' ? 'secondary' : 'default'}
                              className="text-sm px-3 py-1"
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            <div className="text-lg font-bold text-green-600">
                              ₹{order.total_amount || 0}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {formatIndianDate(order.created_at)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatIndianTime(order.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Customer Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {order.custom_users?.first_name} {order.custom_users?.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {order.custom_users?.subscription_plan && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                                      {order.custom_users.subscription_plan}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-mono text-sm">{order.custom_users?.phone}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start space-x-3">
                              <MapPin className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-gray-600 leading-relaxed">
                                {formatAddress(order.shipping_address)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="flex items-start space-x-3">
                          <Package className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {order.order_items?.length || 0} items in this order
                            </div>
                            <div className="text-sm text-gray-600">
                              {order.order_items?.slice(0, 3).map((item: any, idx: number) => (
                                <span key={idx}>
                                  {item.toys?.name}
                                  {item.toys?.brand && ` (${item.toys.brand})`}
                                  {idx < Math.min(2, (order.order_items?.length || 1) - 1) && ', '}
                                </span>
                              ))}
                              {order.order_items && order.order_items.length > 3 && (
                                <span className="text-blue-600 font-medium">
                                  {' '}+{order.order_items.length - 3} more toys
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rental Period */}
                        {order.rental_start_date && (
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Rental Period:</span>{' '}
                              {formatIndianDate(order.rental_start_date)} - {' '}
                              {order.rental_end_date 
                                ? formatIndianDate(order.rental_end_date)
                                : 'Open-ended'
                              }
                            </div>
                          </div>
                        )}

                        {/* Order Number for Reference */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-400 font-mono">
                            Order ID: {order.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-6 border-t bg-white">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium text-gray-900">
              {selectedOrders.length} order(s) selected for dispatch
            </div>
            {selectedOrders.length > 0 && (
              <div className="text-sm text-gray-600">
                Ready to create dispatch entries
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDispatchOrders}
              disabled={selectedOrders.length === 0 || isCreating}
              className="min-w-[160px]"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {selectedOrders.length} Dispatch Order{selectedOrders.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DispatchTrackingDashboard = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isUUIDDialogOpen, setIsUUIDDialogOpen] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<any>(null);

  // Use real data hooks
  const { data: pendingOrders = [], isLoading: pendingLoading } = usePendingDispatches();
  const { data: overdueOrders = [], isLoading: overdueLoading } = useOverdueReturns();
  const queryClient = useQueryClient();

  // Mutation to mark order as dispatched
  const markOrderDispatchedMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber, notes }: { orderId: string, trackingNumber: string, notes: string }) => {
      const { data, error } = await (supabase as any)
        .from('rental_orders')
        .update({ 
          status: 'shipped',
          dispatch_tracking_number: trackingNumber,
          admin_notes: notes,
          shipped_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['overdue-returns'] });
      toast.success('Order dispatched successfully');
    },
    onError: (error) => {
      toast.error('Failed to dispatch order');
      console.error('Dispatch error:', error);
    }
  });

  // Add refresh function for dispatch orders
  const refreshDispatchOrders = () => {
    // In a real app, this would refetch from the database
    console.log('Refreshing dispatch orders...');
  };

  const handleCreateDispatchOrders = async (selectedOrders: string[], orders: any[]) => {
    try {
      console.log('Creating dispatch orders for:', selectedOrders);
      
      // For now, just mark the selected orders as confirmed and ready for dispatch
      const updatePromises = selectedOrders.map(orderId => 
        (supabase as any)
          .from('rental_orders')
          .update({ 
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
      );

      await Promise.all(updatePromises);

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['pending-dispatches'] });

      // Switch to pending dispatch tab to show the orders
      setActiveTab("pending");
      
      return { success: true, count: selectedOrders.length };
    } catch (error) {
      console.error('Error creating dispatch orders:', error);
      throw error;
    }
  };

  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrderDetailsOpen(true);
  };

  const handleDispatchOrder = (order: any) => {
    setSelectedOrderForDispatch(order);
    setIsUUIDDialogOpen(true);
  };

  const handleConfirmDispatch = async (uuids: Array<{toyName: string, uuid: string}>) => {
    if (!selectedOrderForDispatch) return;

    try {
      // Mark the order as dispatched in the database
      const trackingNumber = `TRK-${Date.now()}`;
      const notes = `Dispatched with ${uuids.length} UUIDs generated for individual toy tracking.`;

      await markOrderDispatchedMutation.mutateAsync({
        orderId: selectedOrderForDispatch.id,
        trackingNumber,
        notes
      });

      // Close dialog and reset selected order
      setIsUUIDDialogOpen(false);
      setSelectedOrderForDispatch(null);
    } catch (error) {
      console.error('Error confirming dispatch:', error);
      toast.error('Failed to confirm dispatch');
    }
  };

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address) {
      const parts = [
        address.street,
        address.city,
        address.state,
        address.pincode
      ].filter(Boolean);
      return parts.join(', ');
    }
    return 'Address not available';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispatch & Order Tracking</h2>
          <p className="text-muted-foreground">Manage order fulfillment and returns with UUID tracking</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Dispatch Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dispatch</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">Ready to ship</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{pendingOrders.filter(o => o.status === 'shipped').length}</div>
            <p className="text-xs text-muted-foreground">With customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Returns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueOrders.length}</div>
            <p className="text-xs text-muted-foreground">Need follow-up</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{pendingOrders.filter(o => o.status === 'returned').length}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Dispatch ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Returns ({overdueOrders.length})</TabsTrigger>
          <TabsTrigger value="tracking">UUID Tracking</TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        {/* Pending Dispatch Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Ready for Dispatch</CardTitle>
              <CardDescription>
                Orders that have been packed and are ready to ship. Each toy will get a unique UUID for tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingLoading ? (
                  <div className="text-center py-4">Loading pending orders...</div>
                ) : pendingOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending dispatch orders</p>
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-medium">{order.customer_name}</h4>
                          <Badge variant="outline">{order.subscription_plan}</Badge>
                          <Badge variant="secondary">Order #{order.order_id}</Badge>
                          <Badge variant={order.status === 'pending' ? 'destructive' : 'default'}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {order.customer_phone}
                          </span>
                          <span className="flex items-center">
                            <Package className="w-3 h-3 mr-1" />
                            {order.total_items} items
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {order.rental_end_date ? formatIndianDate(order.rental_end_date) : 'No end date'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Toys:</strong> {order.toys_list}
                        </p>
                        {order.tracking_number && (
                          <p className="text-sm text-green-600">
                            <strong>Tracking:</strong> {order.tracking_number}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewOrderDetails(order.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Order
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleDispatchOrder(order)}
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={!!order.tracking_number}
                        >
                          <Truck className="w-4 h-4 mr-1" />
                          {order.tracking_number ? 'Dispatched' : 'Dispatch Order'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue Returns Tab */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Returns</CardTitle>
              <CardDescription>
                Orders that are past their expected return date and need follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueLoading ? (
                  <div className="text-center py-4">Loading overdue orders...</div>
                ) : overdueOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No overdue returns - Great job!</p>
                  </div>
                ) : (
                  overdueOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <h4 className="font-medium">{order.customer_name}</h4>
                          <Badge variant="destructive">Overdue {order.overdue_by}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {order.customer_phone}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            Expected: {formatIndianDate(order.expected_return_date)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Toys:</strong> {order.toys_list}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewOrderDetails(order.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Order
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="w-4 h-4 mr-1" />
                          Call Customer
                        </Button>
                        <Button size="sm">
                          Process Return
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UUID Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>UUID Order Tracking</CardTitle>
              <CardDescription>
                Search and track specific orders using UUIDs, customer info, or order details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Search by UUID, order ID, customer name, or phone" 
                    className="flex-1" 
                  />
                  <Button>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Track by UUID</h4>
                    <p className="text-sm text-blue-700">
                      Each toy gets a unique UUID when dispatched. Use this to track individual items.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h4 className="font-medium text-green-900 mb-2">Track by Order</h4>
                    <p className="text-sm text-green-700">
                      Search by order ID or customer details to see all toys in an order.
                    </p>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter search criteria to track orders and individual toys</p>
                  <p className="text-sm mt-2">UUID tracking provides complete visibility into each toy's journey</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Orders Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>
                Comprehensive view of all dispatch orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DispatchOrdersView orders={[...pendingOrders, ...overdueOrders]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dispatch Order Dialog */}
      <CreateDispatchOrderDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateDispatchOrders={handleCreateDispatchOrders}
      />

      {/* Order Details Dialog */}
      <ComprehensiveOrderDetails
        orderId={selectedOrderId || ''}
        open={isOrderDetailsOpen}
        onClose={() => setIsOrderDetailsOpen(false)}
      />

      {/* UUID Generation Dialog */}
      {selectedOrderForDispatch && (
        <UUIDGenerationDialog
          open={isUUIDDialogOpen}
          onOpenChange={setIsUUIDDialogOpen}
          order={selectedOrderForDispatch}
          onConfirmDispatch={handleConfirmDispatch}
        />
      )}
    </div>
  );
};

export default DispatchTrackingDashboard; 