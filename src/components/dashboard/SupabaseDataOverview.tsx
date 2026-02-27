import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar, Package, ShoppingCart, User } from 'lucide-react';

interface SupabaseDataOverviewProps {
  subscriptions?: any[];
  orders?: any[];
}

const SupabaseDataOverview = ({ subscriptions, orders }: SupabaseDataOverviewProps) => {
  const hasSubscriptions = subscriptions && subscriptions.length > 0;
  const hasOrders = orders && orders.length > 0;
  const activeSubscription = subscriptions?.find(sub => sub.status === 'active') || subscriptions?.[0];

  if (!hasSubscriptions && !hasOrders) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Toyflix! 🎉</CardTitle>
          <CardDescription>Start your toy subscription journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Ready to explore amazing toys?</p>
            <p className="text-sm text-muted-foreground">
              Choose a subscription plan to get started with our curated toy collection.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscription Card */}
      {hasSubscriptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Active Subscription
              <Badge variant="default" className="text-xs">Current</Badge>
            </CardTitle>
            <CardDescription>Your current subscription plan and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-lg font-bold text-primary">
                    {activeSubscription?.plan_id || 'Subscription Plan'}
                  </p>
                </div>
                <Badge variant={activeSubscription?.status === 'active' ? 'default' : 'secondary'}>
                  {activeSubscription?.status || 'Unknown'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">
                      {activeSubscription?.start_date 
                        ? format(new Date(activeSubscription.start_date), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Billing</p>
                    <p className="text-sm font-medium">
                      {activeSubscription?.current_period_end
                        ? format(new Date(activeSubscription.current_period_end), 'MMM dd, yyyy')
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Entitlements */}
              {activeSubscription?.user_entitlements?.[0] && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Current Month Quotas:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-blue-700">Standard Toys: </span>
                      <span className="font-medium">{activeSubscription.user_entitlements[0].standard_toys_remaining || 0}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Big Toys: </span>
                      <span className="font-medium">{activeSubscription.user_entitlements[0].big_toys_remaining || 0}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Books: </span>
                      <span className="font-medium">{activeSubscription.user_entitlements[0].books_remaining || 0}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Value Cap: </span>
                      <span className="font-medium">₹{activeSubscription.user_entitlements[0].value_cap_remaining || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders History Card */}
      {hasOrders && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Order History
              <Badge variant="outline" className="text-xs">{orders.length} orders</Badge>
            </CardTitle>
            <CardDescription>Your recent toy orders and rentals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order, index) => (
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
              
              {orders.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  And {orders.length - 5} more orders...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Toys/Rentals */}
      {hasOrders && (
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
              const currentOrder = orders.find(order => 
                order.status === 'delivered' && !order.returned_date
              );
              
              if (!currentOrder || !currentOrder.order_items?.length) {
                return (
                  <div className="text-center py-6">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No toys currently with you</p>
                    <p className="text-xs text-muted-foreground">Order toys to see them here</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {currentOrder.order_items.map((item: any, index: number) => (
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
      )}
    </div>
  );
};

export default SupabaseDataOverview; 