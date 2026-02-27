import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  Gift,
  Settings,
  Eye,
  ArrowRight
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { QueueOrderService } from '@/services/queueOrderService';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface CombinedOrderHistoryProps {
  userId: string;
  userPhone?: string;
  maxOrders?: number;
  showTitle?: boolean;
}

export const CombinedOrderHistory: React.FC<CombinedOrderHistoryProps> = ({
  userId,
  userPhone,
  maxOrders = 8,
  showTitle = true
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch combined order history
  const { data: combinedOrders, isLoading, error } = useQuery({
    queryKey: ['combined-order-history', userId, userPhone],
    queryFn: () => QueueOrderService.getCombinedOrderHistory(userId, userPhone),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const getOrderTypeInfo = (order: any) => {
    if (order.isQueueOrder) {
      return {
        type: 'Queue Update',
        icon: <Settings className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        description: `${order.selected_toys?.length || 0} toys queued`
      };
    } else {
      return {
        type: 'Rental Order',
        icon: <Package className="w-4 h-4" />,
        color: 'bg-green-100 text-green-800 border-green-200',
        description: `Cycle #${order.cycle_number || 'N/A'}`
      };
    }
  };

  const getStatusInfo = (order: any) => {
    const status = order.status || 'unknown';
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          color: 'bg-green-100 text-green-800 border-green-200',
          label: 'Confirmed'
        };
      case 'processing':
        return {
          icon: <Clock className="w-3 h-3" />,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Processing'
        };
      case 'preparing':
        return {
          icon: <Package className="w-3 h-3" />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Preparing'
        };
      case 'shipped':
        return {
          icon: <Truck className="w-3 h-3" />,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'Shipped'
        };
      case 'delivered':
        return {
          icon: <Gift className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          label: 'Delivered'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM dd, yyyy') : 'Invalid date';
  };

  const formatAmount = (amount: number) => {
    return amount === 0 ? 'FREE' : `₹${amount.toFixed(0)}`;
  };

  const handleViewOrder = (order: any) => {
    if (order.isQueueOrder) {
      navigate(`/orders/queue/${order.id}`);
    } else {
      navigate(`/orders/${order.id}`);
    }
  };

  const handleViewAllOrders = () => {
    navigate('/orders');
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          {showTitle && <div className="h-6 bg-gray-200 rounded w-1/3"></div>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !combinedOrders) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Unable to load order history</p>
        </CardContent>
      </Card>
    );
  }

  const displayOrders = combinedOrders.slice(0, maxOrders);

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Recent Orders
            </div>
            {combinedOrders.length > maxOrders && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleViewAllOrders}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        {displayOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900 mb-1`}>
              No orders yet
            </h3>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
              Your order history will appear here once you start using ToyFlix
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayOrders.map((order, index) => {
              const orderTypeInfo = getOrderTypeInfo(order);
              const statusInfo = getStatusInfo(order);
              
              return (
                <div 
                  key={`${order.id}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleViewOrder(order)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Order Type Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${orderTypeInfo.color}`}>
                      {orderTypeInfo.icon}
                    </div>

                    {/* Order Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900 truncate`}>
                          {order.order_number || `Order #${order.id?.slice(-6)}`}
                        </span>
                        <Badge 
                          variant="outline" 
                          size="sm"
                          className={orderTypeInfo.color}
                        >
                          {orderTypeInfo.type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                          {orderTypeInfo.description}
                        </span>
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                          {formatDate(order.created_at)}
                        </span>
                        {order.isQueueOrder && order.estimated_delivery_date && (
                          <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                            Est: {format(new Date(order.estimated_delivery_date), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status and Amount */}
                  <div className="flex items-center gap-3 ml-2">
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        size="sm"
                        className={statusInfo.color}
                      >
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900 mt-1`}>
                        {formatAmount(order.total_amount || 0)}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show More Button */}
        {combinedOrders.length > maxOrders && (
          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={handleViewAllOrders}
              className={`${isMobile ? 'w-full' : ''}`}
            >
              View All {combinedOrders.length} Orders
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 