import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Package, ShoppingCart, User, Clock } from 'lucide-react';

interface SupabaseOrdersDisplayProps {
  orders?: any[];
  userPhone?: string;
}

const SupabaseOrdersDisplay = ({ orders, userPhone }: SupabaseOrdersDisplayProps) => {
  const hasOrders = orders && orders.length > 0;

  if (!hasOrders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Toyflix! 🎉</CardTitle>
          <CardDescription>Ready to start your toy journey?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No orders found yet</p>
            <p className="text-sm text-muted-foreground">
              Browse our toy collection and place your first order!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent order
  const recentOrder = orders[0];
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const deliveredOrders = orders.filter(order => order.status === 'delivered');

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account Overview
            <Badge variant="default" className="text-xs">Supabase User</Badge>
          </CardTitle>
          <CardDescription>Your account and order summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="text-sm font-medium">{userPhone || 'Not available'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-sm font-medium">{orders.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Pending Orders</p>
              <p className="text-2xl font-bold text-blue-600">{pendingOrders.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">Delivered Orders</p>
              <p className="text-2xl font-bold text-green-600">{deliveredOrders.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Order Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recent Order
            <Badge variant={recentOrder.status === 'delivered' ? 'default' : 'secondary'}>
              {recentOrder.status}
            </Badge>
          </CardTitle>
          <CardDescription>Your most recent toy order</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Order #{recentOrder.id?.slice(-8) || 'Unknown'}</p>
                <p className="text-lg font-bold text-primary">
                  {recentOrder.order_items?.length || 0} Toys
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {recentOrder.created_at ? format(new Date(recentOrder.created_at), 'MMM dd, yyyy') : 'Date unknown'}
                </p>
                <p className="text-lg font-bold">₹{recentOrder.total_amount || 0}</p>
              </div>
            </div>

            {/* Order Items */}
            {recentOrder.order_items && recentOrder.order_items.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Items in this order:</h4>
                {recentOrder.order_items.map((item: any, index: number) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">
                        {item.toys?.name || 'Unknown Toy'}
                      </h5>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {item.quantity} • ₹{item.rental_price || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Order History
            <Badge variant="outline" className="text-xs">{orders.length} orders</Badge>
          </CardTitle>
          <CardDescription>All your toy orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map((order, index) => (
              <div key={order.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h5 className="font-medium text-sm">Order #{order.id?.slice(-8) || 'Unknown'}</h5>
                  <p className="text-xs text-muted-foreground">
                    {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : 'Date unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_items?.length || 0} items
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                    {order.status || 'pending'}
                  </Badge>
                  <p className="text-sm font-medium">₹{order.total_amount || 0}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Toys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Current Toys
          </CardTitle>
          <CardDescription>Toys you currently have</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            // Find delivered orders that haven't been returned
            const currentToys = deliveredOrders.flatMap(order => 
              order.order_items?.filter((item: any) => !item.returned_date) || []
            );

            if (currentToys.length === 0) {
              return (
                <div className="text-center py-6">
                  <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No toys currently with you</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingOrders.length > 0 
                      ? `${pendingOrders.length} order(s) pending delivery` 
                      : 'Place an order to see toys here'
                    }
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {currentToys.map((item: any, index: number) => (
                  <div key={item.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {item.toys?.name || 'Toy'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Quantity: {item.quantity} • ₹{item.rental_price || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseOrdersDisplay; 