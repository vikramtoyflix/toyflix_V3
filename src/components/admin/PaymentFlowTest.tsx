import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserOrders } from '@/hooks/useUserOrders';
import { useCurrentRentals } from '@/hooks/useCurrentRentals';
import { OrderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ShoppingCart, Package, AlertCircle } from 'lucide-react';

const PaymentFlowTest = () => {
  const { user } = useCustomAuth();
  const { data: orders, isLoading: ordersLoading } = useUserOrders();
  const { data: rentals, isLoading: rentalsLoading } = useCurrentRentals();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const createTestFreeOrder = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingOrder(true);
    try {
      const testOrderData = {
        userId: user.id,
        planId: 'test_plan',
        selectedToys: [
          { id: 'test-toy-1', name: 'Test LEGO Set', rental_price: 299 },
          { id: 'test-toy-2', name: 'Test Puzzle Game', rental_price: 199 }
        ],
        ageGroup: '3-5',
        totalAmount: 0, // Free order
        baseAmount: 498,
        gstAmount: 89,
        couponDiscount: 587,
        appliedCoupon: 'TESTFREE',
        deliveryInstructions: 'Test delivery instructions',
        shippingAddress: {
          address_line1: 'Test Street 123',
          city: 'Test City',
          state: 'Test State',
          zip_code: '123456',
          country: 'India'
        },
        orderType: 'subscription' as const
      };

      console.log('🧪 Creating test free order:', testOrderData);
      const createdOrder = await OrderService.createFreeOrder(testOrderData);
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['current-rentals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      
      toast({
        title: "Test Order Created! 🎉",
        description: `Order ${createdOrder.orderId.slice(0, 8)} created successfully`,
      });
      
    } catch (error: any) {
      console.error('❌ Test order creation failed:', error);
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'default';
      case 'pending': return 'secondary';
      case 'shipped': return 'outline';
      case 'cancelled':
      case 'returned': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Payment Flow Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-3">
              This test creates a free order and verifies that:
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Free order is created successfully</li>
              <li>✓ Order appears in user dashboard immediately</li>
              <li>✓ Order appears in admin panel</li>
              <li>✓ Real-time updates work</li>
            </ul>
          </div>
          
          <Button 
            onClick={createTestFreeOrder}
            disabled={!user || isCreatingOrder}
            className="w-full"
          >
            {isCreatingOrder ? 'Creating Test Order...' : 'Create Test Free Order'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Your Orders ({orders?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              No orders found. Create a test order above.
            </div>
          ) : (
            <div className="space-y-3">
              {orders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Order {order.id.slice(0, 8)}...</div>
                    <div className="text-sm text-muted-foreground">
                      {order.order_items?.length || 0} items • ₹{order.total_amount || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={getOrderStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Rentals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Current Rentals ({rentals?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rentalsLoading ? (
            <div className="text-center py-4">Loading rentals...</div>
          ) : rentals?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              No active rentals. Orders become rentals when shipped/delivered.
            </div>
          ) : (
            <div className="space-y-3">
              {rentals?.slice(0, 5).map((rental) => (
                <div key={rental.id + (rental.toy?.id || '')} className="flex items-center gap-3 p-3 border rounded-lg">
                  <img
                    src={rental.toy?.image_url || '/placeholder.svg'}
                    alt={rental.toy?.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{rental.toy?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {rental.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFlowTest; 