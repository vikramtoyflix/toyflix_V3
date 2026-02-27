import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye, Package, Phone, MapPin, Calendar, Truck, CheckCircle, Clock, 
  X, Edit, User, ShoppingCart, CreditCard, Tag, AlertTriangle
} from "lucide-react";
import { formatOrderDate, formatOrderTime } from "@/utils/dateUtils";

interface OrderCardProps {
  order: any;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
  onEditOrder: () => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
}

const OrderCard = ({ 
  order, 
  isSelected, 
  onSelect, 
  onViewDetails, 
  onEditOrder, 
  getStatusColor, 
  getStatusIcon 
}: OrderCardProps) => {
  // Enhanced customer name logic with fallback
  const customerName = (() => {
    if (order.custom_user?.first_name || order.custom_user?.last_name) {
      return `${order.custom_user.first_name || ''} ${order.custom_user.last_name || ''}`.trim();
    }
    if (order.fallback_customer_name && order.fallback_customer_name !== 'Unknown User') {
      return order.fallback_customer_name;
    }
    return 'Unknown User';
  })();

  // Enhanced phone number logic with fallback
  const customerPhone = (() => {
    if (order.custom_user?.phone) {
      return order.custom_user.phone;
    }
    if (order.fallback_customer_phone && order.fallback_customer_phone !== 'No phone') {
      return order.fallback_customer_phone;
    }
    if (order.user_phone) {
      return order.user_phone;
    }
    return 'No phone';
  })();

  // Enhanced email logic with fallback
  const customerEmail = (() => {
    if (order.custom_user?.email) {
      return order.custom_user.email;
    }
    if (order.fallback_customer_email && order.fallback_customer_email !== 'No email') {
      return order.fallback_customer_email;
    }
    return null;
  })();

  const toysCount = Array.isArray(order.toys_data) ? order.toys_data.length : 0;
  const toysPreview = Array.isArray(order.toys_data) && order.toys_data.length > 0 
    ? order.toys_data.slice(0, 2).map(toy => toy.name).join(', ')
    : 'No toys';

  return (
    <Card className={`group transition-all duration-200 hover:shadow-lg border-2 ${
      isSelected 
        ? 'border-primary bg-primary/5 shadow-md' 
        : 'border-border hover:border-primary/50'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              aria-label={`Select order ${order.order_number}`}
              className="mt-1"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-foreground">
                  #{order.order_number || order.id.slice(0, 8)}
                </h3>
                <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  <span className="capitalize">{order.status}</span>
                </Badge>
                {/* Add indicator for missing user data */}
                {!order.user_data_available && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Limited Data
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <span className="capitalize">{order.order_type}</span>
                {order.subscription_plan && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{order.subscription_plan}</span>
                  </>
                )}
              </div>
              {/* Display creation date/time */}
              {order.created_at && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Created: {formatOrderDate(order.created_at)} at {formatOrderTime(order.created_at)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              ₹{order.total_amount?.toLocaleString() || 0}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CreditCard className="w-3 h-3" />
              <span className="capitalize">{order.payment_status}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="w-4 h-4" />
              <span>Customer</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="font-medium text-foreground">{customerName}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{customerPhone}</span>
              </div>
              {customerEmail && (
                <p className="text-sm text-muted-foreground">{customerEmail}</p>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span>Items ({toysCount})</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="text-sm text-muted-foreground">
                {toysPreview}
                {toysCount > 2 && (
                  <span className="text-primary font-medium"> +{toysCount - 2} more</span>
                )}
              </p>
              {order.toys_data && order.toys_data.length > 0 && (
                <div className="flex -space-x-2">
                  {order.toys_data.slice(0, 3).map((toy: any, index: number) => (
                    toy.image_url && (
                      <img 
                        key={index}
                        src={toy.image_url} 
                        alt={toy.name}
                        className="w-6 h-6 rounded-full border-2 border-background object-cover"
                      />
                    )
                  ))}
                  {toysCount > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                      +{toysCount - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="w-4 h-4" />
              <span>Delivery Address</span>
            </div>
            <div className="pl-6 space-y-1">
              {order.shipping_address ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {order.shipping_address.address_line1 || 'No address'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[order.shipping_address.city, order.shipping_address.state, order.shipping_address.postcode]
                      .filter(Boolean)
                      .join(', ') || 'Location not specified'}
                  </p>
                  {order.shipping_address.plus_code && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">
                        📍 {order.shipping_address.plus_code}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No address available</p>
              )}
            </div>
          </div>
        </div>

        {/* Tags and Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {order.coupon_code && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {order.coupon_code}
            </Badge>
          )}
          {order.discount_amount && order.discount_amount > 0 && (
            <Badge variant="secondary" className="text-green-600">
              ₹{order.discount_amount} off
            </Badge>
          )}
          {order.payment_status === 'pending' && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Payment Due
            </Badge>
          )}
          {order.rental_end_date && new Date(order.rental_end_date) < new Date() && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              <Clock className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditOrder()}
            className="hover:bg-blue-500 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Order
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails()}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard; 