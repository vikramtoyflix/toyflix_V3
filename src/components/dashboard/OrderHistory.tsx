import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useHybridOrders } from "@/hooks/useHybridOrders";
import { Package, Truck, CheckCircle, Clock, X, MapPin, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { formatIndianDate } from "@/utils/dateUtils";

const OrderHistory = () => {
  const isMobile = useIsMobile();
  const { data: orders, isLoading, error } = useHybridOrders();

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'shipped':
      case 'processing':
        return <Truck className="w-4 h-4 text-blue-500" />;
      case 'delivered':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'returned':
        return <Package className="w-4 h-4 text-purple-500" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'shipped':
      case 'processing':
        return 'outline';
      case 'returned':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number | null) => {
    return amount ? `₹${amount.toFixed(2)}` : 'Free';
  };

  const formatDate = (dateString: string) => {
    return formatIndianDate(dateString);
  };

  const getOrderItems = (order: any) => {
    // Handle both WooCommerce and Supabase order items format
    if (order.items && Array.isArray(order.items)) {
      return order.items;
    }
    if (order.order_items && Array.isArray(order.order_items)) {
      return order.order_items;
    }
    return [];
  };

  const getItemName = (item: any) => {
    // Handle both WooCommerce and Supabase item formats
    return item.name || item.product_name || item.toy?.name || 'Unknown Item';
  };



  const getItemQuantity = (item: any) => {
    return item.quantity || 1;
  };

  if (isLoading) {
    return (
      <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
        <CardHeader>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <Package className="w-5 h-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
        <CardHeader>
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <Package className="w-5 h-5" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load orders. Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
      <CardHeader>
        <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
          <Package className="w-5 h-5" />
          Order History
          {orders && orders.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {orders[0].source === 'woocommerce' ? 'Legacy Data' : 'New System'}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track your rental orders and delivery status</p>
      </CardHeader>
      <CardContent>
        {!orders || orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No orders yet</p>
            <p className="text-sm text-gray-500">
              Your toy rental orders will appear here once you make your first purchase.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderItems = getOrderItems(order);
              return (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  {/* Order Header */}
                  <div className={`${isMobile ? 'space-y-2' : 'flex justify-between items-start'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          Order #{order.id.toString().slice(-8)}
                        </span>
                        <Badge variant={getStatusColor(order.status || 'pending')}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(order.status || 'pending')}
                            {order.status || 'Pending'}
                          </div>
                        </Badge>
                        {order.source === 'woocommerce' && (
                          <Badge variant="outline" className="text-xs">
                            WC
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(order.created_at)}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>
                    </div>
                    
                    {!isMobile && order.shipping_address && (
                      <div className="text-right text-xs text-gray-600">
                        <div className="flex items-center gap-1 justify-end">
                          <MapPin className="w-3 h-3" />
                          <span>Delivery Address</span>
                        </div>
                        <div className="max-w-48">
                          {order.shipping_address ? (
                            <span>
                              {(() => {
                                const addr = typeof order.shipping_address === 'string' 
                                  ? JSON.parse(order.shipping_address) 
                                  : order.shipping_address;
                                
                                // Try multiple field name variations
                                const line1 = addr.address_line1 || addr.address1 || addr.address_line_1;
                                const line2 = addr.address_line2 || addr.address2 || addr.apartment;
                                const city = addr.city;
                                const state = addr.state;
                                const postal = addr.postcode || addr.postal_code || addr.zip_code;
                                
                                const parts = [line1, line2, city, state, postal].filter(Boolean);
                                return parts.length > 0 ? parts.join(', ') : 'Incomplete address';
                              })()}
                            </span>
                          ) : (
                            <span>No address provided</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  {orderItems && orderItems.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Items ({orderItems.length})
                        </p>
                        <div className={`${isMobile ? 'space-y-2' : 'grid grid-cols-2 gap-3'}`}>
                          {orderItems.map((item, index) => (
                            <div key={item.id || index} className="flex items-center gap-3">
                              {(item.toy?.image_url || item.image_url) && (
                                <img
                                  src={item.toy?.image_url || item.image_url}
                                  alt={getItemName(item)}
                                  className="w-10 h-10 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder.svg';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {getItemName(item)}
                                </p>
                                <p className="text-xs text-gray-600">
                                  Qty: {getItemQuantity(item)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Note: Rental dates are managed by subscription plans, not individual orders */}

                  {/* Mobile Address */}
                  {isMobile && order.shipping_address && (
                    <>
                      <Separator />
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3" />
                          <span className="font-medium">Delivery Address</span>
                        </div>
                        {order.shipping_address ? (
                          <span>
                            {(() => {
                              const addr = typeof order.shipping_address === 'string' 
                                ? JSON.parse(order.shipping_address) 
                                : order.shipping_address;
                              
                              // Try multiple field name variations for mobile display
                              const line1 = addr.address_line1 || addr.address1 || addr.address_line_1;
                              const city = addr.city;
                              const postal = addr.postcode || addr.postal_code || addr.zip_code;
                              
                              const parts = [line1, city, postal].filter(Boolean);
                              return parts.length > 0 ? parts.join(', ') : 'Incomplete address';
                            })()}
                          </span>
                        ) : (
                          <span>No address provided</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderHistory; 