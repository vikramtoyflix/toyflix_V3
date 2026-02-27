import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  User, 
  MapPin, 
  CreditCard, 
  Package, 
  Calendar, 
  Phone, 
  Mail, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Truck,
  Receipt,
  UserCheck,
  Building,
  Copy,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComprehensiveOrderData {
  // Order Basic Info
  order_id: string;
  order_status: string;
  order_type: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  discount_amount: number;
  coupon_code: string;
  order_placed_date: string;
  order_last_updated: string;
  confirmed_at: string;
  shipped_at: string;
  delivered_at: string;
  rental_start_date: string;
  rental_end_date: string;
  delivery_instructions: string;
  
  // Customer Information
  customer_id: string;
  customer_phone: string;
  customer_email: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_full_name: string;
  phone_verified: boolean;
  customer_has_active_subscription: boolean;
  customer_current_plan: string | null;
  customer_registration_date: string;
  
  // Shipping Address
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_phone: string;
  shipping_email: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postcode: string;
  shipping_country: string;
  shipping_latitude?: number;
  shipping_longitude?: number;
  shipping_plus_code: string;
  
  // Payment Information
  payment_order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_status: string;
  payment_order_type: string;
  payment_created_date: string;
  payment_updated_date: string;
  
  // Order Summary
  total_items_count: number;
  total_quantity: number;
  items_total_price: number;
  
  // Subscription Information
  subscription_id: string | null;
  subscription_plan_type: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  subscription_billing_cycle: string | null;
  subscription_amount: number | null;
  
  // Queue Order Specific Fields
  queue_order_type?: string;
  queue_cycle_number?: number;
  estimated_delivery_date?: string;
  current_plan_id?: string;
}

interface OrderItem {
  order_item_id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  subscription_category: string;
  age_group: string;
  toy_id: string;
  toy_name: string;
  toy_description: string;
  toy_image: string;
  toy_category: string;
  toy_age_group: string;
  toy_price: number;
  item_added_date: string;
}

interface CustomerJourneyStep {
  step_name: string;
  step_description: string;
  step_timestamp: string;
  step_data: any;
}

interface ComprehensiveOrderDetailsProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

const ComprehensiveOrderDetails: React.FC<ComprehensiveOrderDetailsProps> = ({ 
  orderId, 
  open, 
  onClose 
}) => {
  const [orderData, setOrderData] = useState<ComprehensiveOrderData | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerJourney, setCustomerJourney] = useState<CustomerJourneyStep[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && orderId) {
      fetchComprehensiveOrderData();
    }
  }, [open, orderId]);

  const fetchComprehensiveOrderData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching order data for:', orderId);
      
      // Step 1: Try to fetch from rental_orders first
      let orderData: any = null;
      let isQueueOrder = false;
      
      const { data: rentalOrder, error: rentalError } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('id', orderId)
        .single();

      if (rentalError) {
        console.log('❌ Order not found in rental_orders, trying queue_orders...');
        
        // Step 2: If not found in rental_orders, try queue_orders
        const { data: queueOrder, error: queueError } = await supabase
          .from('queue_orders' as any)
          .select('*')
          .eq('id', orderId)
          .single();

        if (queueError) {
          console.error('❌ Order not found in either table:', queueError);
          throw new Error('Order not found in rental_orders or queue_orders tables');
        }

        console.log('✅ Queue order found:', queueOrder);
        orderData = queueOrder;
        isQueueOrder = true;
      } else {
        console.log('✅ Rental order found:', rentalOrder);
        orderData = rentalOrder;
        isQueueOrder = false;
      }
      
      // ✅ ENHANCED DEBUGGING: Log specific fields we're checking
      console.log('🔍 ADDRESS DEBUG FOR ORDER TYPE:', isQueueOrder ? 'QUEUE' : 'RENTAL', {
        isQueueOrder,
        hasShippingAddress: !!orderData.shipping_address,
        hasDeliveryAddress: !!orderData.delivery_address,
        shippingAddressType: typeof orderData.shipping_address,
        deliveryAddressType: typeof orderData.delivery_address,
        shippingAddressData: orderData.shipping_address,
        deliveryAddressData: orderData.delivery_address,
        shippingAddressFields: orderData.shipping_address ? Object.keys(orderData.shipping_address) : 'none',
        deliveryAddressFields: orderData.delivery_address ? Object.keys(orderData.delivery_address) : 'none'
      });
      
      console.log('🔍 PAYMENT DETAILS DEBUG:', {
        razorpayOrderId: orderData.razorpay_order_id || 'MISSING',
        razorpayPaymentId: orderData.razorpay_payment_id || 'MISSING',
        paymentStatus: orderData.payment_status || 'MISSING',
        paymentAmount: orderData.payment_amount || 'MISSING',
        paymentMethod: orderData.payment_method || 'MISSING'
      });

      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', orderData.user_id)
        .single();

      if (customerError) {
        console.warn('Customer data not found:', customerError);
      }

      let transformedOrderData: any;
      let transformedItems: any[] = [];

      if (isQueueOrder) {
        // 🎯 Transform QUEUE ORDER data to match the interface
        console.log('🔄 Transforming queue order data...');
        
        transformedOrderData = {
          // Order Basic Info - Queue order specific
          order_id: orderData.id,
          order_status: orderData.status || 'processing',
          order_type: 'queue_order',
          total_amount: orderData.total_amount || 0,
          base_amount: orderData.base_amount || 0,
          gst_amount: orderData.gst_amount || 0,
          discount_amount: orderData.coupon_discount || 0,
          coupon_code: orderData.applied_coupon || '',
          order_placed_date: orderData.created_at || '',
          order_last_updated: orderData.updated_at || '',
          confirmed_at: orderData.confirmed_at || '',
          shipped_at: '',
          delivered_at: '',
          rental_start_date: orderData.estimated_delivery_date || '',
          rental_end_date: '',
          delivery_instructions: orderData.delivery_instructions || '',
          
          // Customer Information
          customer_id: customerData?.id || '',
          customer_phone: customerData?.phone || orderData.user_phone || '',
          customer_email: customerData?.email || '',
          customer_first_name: customerData?.first_name || '',
          customer_last_name: customerData?.last_name || '',
          customer_full_name: `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim(),
          phone_verified: customerData?.phone_verified || false,
          customer_has_active_subscription: customerData?.subscription_active || false,
          customer_current_plan: orderData.current_plan_id || null,
          customer_registration_date: customerData?.created_at || '',
          
          // Shipping Address - Queue order specific (uses delivery_address field)
          shipping_first_name: orderData.delivery_address?.first_name || '',
          shipping_last_name: orderData.delivery_address?.last_name || '',
          shipping_phone: orderData.delivery_address?.phone || '',
          shipping_email: orderData.delivery_address?.email || '',
          shipping_address_line1: orderData.delivery_address?.address_line_1 || orderData.delivery_address?.address_line1 || '',
          shipping_address_line2: orderData.delivery_address?.address_line_2 || orderData.delivery_address?.address_line2 || '',
          shipping_city: orderData.delivery_address?.city || '',
          shipping_state: orderData.delivery_address?.state || '',
          shipping_postcode: orderData.delivery_address?.postal_code || orderData.delivery_address?.postcode || '',
          shipping_country: orderData.delivery_address?.country || 'India',
          shipping_latitude: orderData.delivery_address?.latitude,
          shipping_longitude: orderData.delivery_address?.longitude,
          shipping_plus_code: orderData.delivery_address?.plus_code || '',
          
          // Payment Information - Queue order specific
          payment_order_id: orderData.id,
          razorpay_order_id: orderData.razorpay_order_id || '',
          razorpay_payment_id: orderData.payment_id || '',
          payment_amount: orderData.total_amount || 0,
          payment_currency: 'INR',
          payment_status: orderData.payment_status || 'pending',
          payment_order_type: 'queue_order',
          payment_created_date: orderData.created_at || '',
          payment_updated_date: orderData.updated_at || '',
          
          // Order Summary - Queue order specific
          total_items_count: orderData.selected_toys?.length || 0,
          total_quantity: orderData.selected_toys?.reduce((sum: number, toy: any) => sum + (toy.quantity || 0), 0) || 0,
          items_total_price: orderData.total_amount || 0,
          
          // Subscription Information - Queue order specific
          subscription_id: orderData.original_subscription_id || null,
          subscription_plan_type: orderData.current_plan_id || null,
          subscription_status: orderData.status || null,
          subscription_start_date: null,
          subscription_end_date: null,
          subscription_billing_cycle: 'monthly',
          subscription_amount: orderData.total_amount || null,
          
          // Queue-specific fields
          queue_order_type: orderData.queue_order_type || 'next_cycle',
          queue_cycle_number: orderData.queue_cycle_number || 1,
          estimated_delivery_date: orderData.estimated_delivery_date || '',
        };

        // Transform selected_toys to order items format
        transformedItems = (orderData.selected_toys || []).map((toy: any, index: number) => ({
          order_item_id: `${orderData.id}_${index}`,
          order_id: orderData.id,
          quantity: toy.quantity || 1,
          unit_price: toy.unit_price || 0,
          total_price: toy.total_price || 0,
          subscription_category: 'queue',
          age_group: orderData.age_group || '',
          toy_id: toy.toy_id || '',
          toy_name: toy.name || 'Unknown Toy',
          toy_description: toy.description || '',
          toy_image: toy.image_url || '/placeholder.svg',
          toy_category: toy.category || '',
          toy_age_group: orderData.age_group || '',
          toy_price: toy.unit_price || 0,
          item_added_date: orderData.created_at || '',
        }));

      } else {
        // 🎯 Transform RENTAL ORDER data (existing logic)
        console.log('🔄 Transforming rental order data...');
        
        transformedOrderData = {
        // Order Basic Info - All from rental_orders table
        order_id: orderData.id,
        order_status: orderData.status || 'pending',
        order_type: orderData.order_type || 'subscription',
        total_amount: orderData.total_amount || 0,
        base_amount: orderData.base_amount || 0,
        gst_amount: orderData.gst_amount || 0,
        discount_amount: orderData.discount_amount || 0,
        coupon_code: orderData.coupon_code || '',
        order_placed_date: orderData.created_at || '',
        order_last_updated: orderData.updated_at || '',
        confirmed_at: orderData.confirmed_at || '',
        shipped_at: orderData.shipped_at || '',
        delivered_at: orderData.delivered_at || '',
        rental_start_date: orderData.rental_start_date || '',
        rental_end_date: orderData.rental_end_date || '',
        delivery_instructions: orderData.delivery_instructions || '',
        
        // Customer Information
        customer_id: customerData?.id || '',
        customer_phone: customerData?.phone || orderData.user_phone || '',
        customer_email: customerData?.email || '',
        customer_first_name: customerData?.first_name || '',
        customer_last_name: customerData?.last_name || '',
        customer_full_name: `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim(),
        phone_verified: customerData?.phone_verified || false,
        customer_has_active_subscription: customerData?.subscription_active || false,
        customer_current_plan: customerData?.subscription_plan || null,
        customer_registration_date: customerData?.created_at || '',
        
        // Shipping Address - Rental orders (uses shipping_address field)
        shipping_first_name: orderData.shipping_address?.first_name || '',
        shipping_last_name: orderData.shipping_address?.last_name || '',
        shipping_phone: orderData.shipping_address?.phone || '',
        shipping_email: orderData.shipping_address?.email || '',
        shipping_address_line1: orderData.shipping_address?.address_line_1 || orderData.shipping_address?.address_line1 || '',
        shipping_address_line2: orderData.shipping_address?.address_line_2 || orderData.shipping_address?.address_line2 || '',
        shipping_city: orderData.shipping_address?.city || '',
        shipping_state: orderData.shipping_address?.state || '',
        shipping_postcode: orderData.shipping_address?.postal_code || orderData.shipping_address?.postcode || '',
        shipping_country: orderData.shipping_address?.country || 'India',
        shipping_latitude: orderData.shipping_address?.latitude,
        shipping_longitude: orderData.shipping_address?.longitude,
        shipping_plus_code: orderData.shipping_address?.plus_code || '',
        
        // Payment Information - All from rental_orders table
        payment_order_id: orderData.id,
        razorpay_order_id: orderData.razorpay_order_id || '',
        razorpay_payment_id: orderData.razorpay_payment_id || '',
        payment_amount: orderData.payment_amount || orderData.total_amount || 0,
        payment_currency: orderData.payment_currency || 'INR',
        payment_status: orderData.payment_status || 'pending',
        payment_order_type: orderData.order_type || '',
        payment_created_date: orderData.created_at || '',
        payment_updated_date: orderData.updated_at || '',
        
        // Order Summary - From toys_data JSONB field
        total_items_count: orderData.toys_data?.length || 0,
        total_quantity: orderData.toys_data?.reduce((sum: number, toy: any) => sum + (toy.quantity || 0), 0) || 0,
        items_total_price: orderData.toys_data?.reduce((sum: number, toy: any) => sum + (toy.total_price || 0), 0) || 0,
        
        // Subscription Information - All from rental_orders table
        subscription_id: orderData.subscription_id || null,
        subscription_plan_type: orderData.subscription_plan || null,
        subscription_status: orderData.status || null,
        subscription_start_date: orderData.rental_start_date || null,
        subscription_end_date: orderData.rental_end_date || null,
        subscription_billing_cycle: orderData.subscription_category || null,
        subscription_amount: orderData.total_amount || null,
        };

        // Transform toys_data JSONB to order items format
        transformedItems = (orderData.toys_data || []).map((toy: any, index: number) => ({
          order_item_id: `${orderData.id}_${index}`,
          order_id: orderData.id,
          quantity: toy.quantity || 1,
          unit_price: toy.unit_price || 0,
          total_price: toy.total_price || 0,
          subscription_category: orderData.subscription_category || '',
          age_group: orderData.age_group || '',
          toy_id: toy.toy_id || '',
          toy_name: toy.name || 'Unknown Toy',
          toy_description: toy.description || '',
          toy_image: toy.image_url || '/placeholder.svg',
          toy_category: toy.category || '',
          toy_age_group: orderData.age_group || '',
          toy_price: toy.unit_price || 0,
          item_added_date: orderData.created_at || '',
        }));
      }

      console.log(`✅ ${isQueueOrder ? 'Queue' : 'Rental'} order data transformed:`, transformedOrderData);
      console.log(`✅ ${isQueueOrder ? 'Queue' : 'Rental'} order items transformed:`, transformedItems);

      setOrderData(transformedOrderData);
      setOrderItems(transformedItems);
      setCustomerJourney([]);

    } catch (error: any) {
      console.error('❌ Error fetching order data:', error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'default';
      case 'shipped': return 'outline';
      case 'confirmed': return 'secondary';
      case 'pending': return 'destructive';
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading comprehensive order details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!orderData) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
            <p className="text-muted-foreground">Unable to load order details.</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            {orderData.order_type === 'queue_order' ? (
              <Clock className="w-6 h-6 text-purple-600" />
            ) : (
              <ShoppingCart className="w-6 h-6" />
            )}
            {orderData.order_type === 'queue_order' ? 'Queue Order Details' : 'Complete Order Details'}
            <Badge variant="outline" className="font-mono">
              #{orderData.order_id.slice(0, 8)}...
            </Badge>
            {orderData.order_type === 'queue_order' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Queue Order
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {orderData.order_type === 'queue_order' 
              ? 'Queue order for next cycle delivery - comprehensive details and tracking information'
              : 'Comprehensive customer journey and order information captured from the system'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="space-y-6 p-1">
            
            {/* Order Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm">Total Amount</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(orderData.total_amount)}
                  </div>
                  {orderData.discount_amount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Discount: {formatCurrency(orderData.discount_amount)}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">Items</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {orderData.total_items_count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty: {orderData.total_quantity}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Order Status</span>
                  </div>
                  <Badge variant={getStatusColor(orderData.order_status)} className="text-lg px-3 py-1">
                    {orderData.order_status}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    Type: {orderData.order_type}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-sm">Payment</span>
                  </div>
                  <Badge variant={getStatusColor(orderData.payment_status)} className="text-lg px-3 py-1">
                    {orderData.payment_status || 'Pending'}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(orderData.payment_amount || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Order Specific Information */}
            {orderData.order_type === 'queue_order' && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Clock className="w-5 h-5" />
                    Queue Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-700">Queue Type</p>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        {orderData.queue_order_type?.replace('_', ' ') || 'Next Cycle'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-700">Target Cycle</p>
                      <p className="text-lg font-bold text-purple-800">
                        #{orderData.queue_cycle_number || 1}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-purple-700">Estimated Delivery</p>
                      <p className="text-sm text-purple-700">
                        {orderData.estimated_delivery_date 
                          ? formatDateTime(orderData.estimated_delivery_date)
                          : 'TBD'
                        }
                      </p>
                    </div>
                  </div>
                  {orderData.current_plan_id && (
                    <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                      <p className="text-sm font-medium text-purple-800 mb-1">Current Plan</p>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        {orderData.current_plan_id}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Customer Name</span>
                    </div>
                    <p className="text-lg font-semibold">{orderData.customer_full_name || 'Not provided'}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={orderData.phone_verified ? 'default' : 'destructive'} className="text-xs">
                        {orderData.phone_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      {orderData.customer_has_active_subscription && (
                        <Badge variant="outline" className="text-xs">
                          Active Subscriber
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Phone Number</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(orderData.customer_phone, 'Phone number')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="font-mono text-lg">{orderData.customer_phone}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered: {formatDateTime(orderData.customer_registration_date)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Email Address</span>
                      {orderData.customer_email && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(orderData.customer_email, 'Email address')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-lg">{orderData.customer_email || 'Not provided'}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {orderData.customer_id}
                    </p>
                  </div>
                </div>

                {orderData.customer_current_plan && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Current Subscription</h4>
                    <Badge variant="default">{orderData.customer_current_plan}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </CardTitle>
                {(!orderData.shipping_first_name && !orderData.shipping_address_line1) && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>This order may be from WooCommerce migration - shipping address may be incomplete</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {(orderData.shipping_first_name || orderData.shipping_address_line1) ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Recipient Name</span>
                        </div>
                        <p className="text-lg">
                          {`${orderData.shipping_first_name || ''} ${orderData.shipping_last_name || ''}`.trim() || 'Not available'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Contact</span>
                        </div>
                        <p className="font-mono">{orderData.shipping_phone || 'Not available'}</p>
                        {orderData.shipping_email && (
                          <p className="text-sm text-muted-foreground">{orderData.shipping_email}</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Address</span>
                        </div>
                        <div className="space-y-1">
                          <p>{orderData.shipping_address_line1 || 'Not available'}</p>
                          {orderData.shipping_address_line2 && (
                            <p className="text-muted-foreground">{orderData.shipping_address_line2}</p>
                          )}
                          <p>
                            {[orderData.shipping_city, orderData.shipping_state, orderData.shipping_postcode]
                              .filter(Boolean)
                              .join(', ') || 'Not available'}
                          </p>
                          <p className="text-sm text-muted-foreground">{orderData.shipping_country || 'India'}</p>
                        </div>
                      </div>

                      {(orderData.shipping_plus_code || (orderData.shipping_latitude && orderData.shipping_longitude)) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Location Details</span>
                          </div>
                          <div className="space-y-1">
                            {orderData.shipping_plus_code && (
                              <div>
                                <p className="text-xs text-muted-foreground">Plus Code</p>
                                <p className="font-mono text-sm bg-muted/30 p-2 rounded">{orderData.shipping_plus_code}</p>
                              </div>
                            )}
                            {orderData.shipping_latitude && orderData.shipping_longitude && (
                              <div>
                                <p className="text-xs text-muted-foreground">GPS Coordinates</p>
                                <p className="font-mono text-sm bg-muted/30 p-2 rounded">
                                  {orderData.shipping_latitude}, {orderData.shipping_longitude}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {orderData.delivery_instructions && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Delivery Instructions</p>
                        <p className="text-sm text-blue-700">{orderData.delivery_instructions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No shipping address available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </CardTitle>
                {(!orderData.razorpay_order_id && !orderData.razorpay_payment_id) && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>This order may be from WooCommerce migration - payment details may be incomplete</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Payment Status</span>
                    </div>
                    <Badge variant={getStatusColor(orderData.payment_status)} className="text-lg px-3 py-1">
                      {orderData.payment_status || 'Pending'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Amount: {formatCurrency(orderData.payment_amount || 0)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Razorpay Order ID</span>
                      {orderData.razorpay_order_id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(orderData.razorpay_order_id, 'Razorpay Order ID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="font-mono text-sm bg-muted/30 p-2 rounded">
                      {orderData.razorpay_order_id || 'Not generated'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Razorpay Payment ID</span>
                      {orderData.razorpay_payment_id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(orderData.razorpay_payment_id, 'Razorpay Payment ID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="font-mono text-sm bg-muted/30 p-2 rounded">
                      {orderData.razorpay_payment_id || 'Not completed'}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Base Amount</p>
                    <p className="font-medium">{formatCurrency(orderData.base_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GST Amount</p>
                    <p className="font-medium">{formatCurrency(orderData.gst_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-medium text-green-600">-{formatCurrency(orderData.discount_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final Total</p>
                    <p className="font-bold text-lg">{formatCurrency(orderData.total_amount)}</p>
                  </div>
                </div>

                {orderData.coupon_code && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Coupon Applied: {orderData.coupon_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={item.order_item_id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {item.toy_image && (
                        <img
                          src={item.toy_image}
                          alt={item.toy_name}
                          className="w-20 h-20 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className="font-semibold text-lg">{item.toy_name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.toy_category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.toy_age_group || item.age_group}
                            </Badge>
                          </div>
                        </div>
                        
                        {item.toy_description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.toy_description}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unit Price</p>
                            <p className="font-medium">{formatCurrency(item.unit_price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Price</p>
                            <p className="font-bold text-green-600">{formatCurrency(item.total_price)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Added</p>
                            <p className="font-medium text-xs">{formatDateTime(item.item_added_date)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => copyToClipboard(JSON.stringify(orderData, null, 2), 'Order data')}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Order Data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComprehensiveOrderDetails; 