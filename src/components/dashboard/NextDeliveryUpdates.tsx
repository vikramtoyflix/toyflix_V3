import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Package, 
  Clock,
  Settings,
  Truck,
  CheckCircle,
  AlertCircle,
  Gift,
  Edit,
  Eye
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { QueueOrderService, type NextDeliveryInfo, type DashboardQueueOrder } from '@/services/queueOrderService';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface NextDeliveryUpdatesProps {
  userId: string;
  onManageQueue?: () => void;
}

export const NextDeliveryUpdates: React.FC<NextDeliveryUpdatesProps> = ({
  userId,
  onManageQueue
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expandedToys, setExpandedToys] = useState(false);

  // Fetch next delivery information
  const { data: nextDeliveryInfo, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ['next-delivery-info', userId],
    queryFn: () => QueueOrderService.getNextDeliveryInfo(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent queue orders
  const { data: recentQueueOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['recent-queue-orders', userId],
    queryFn: () => QueueOrderService.getUserQueueOrders(userId, 3),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const handleManageQueue = () => {
    if (onManageQueue) {
      onManageQueue();
    } else {
      navigate('/subscription/queue-management');
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-3 h-3" />;
      case 'processing':
        return <Clock className="w-3 h-3" />;
      case 'preparing':
        return <Package className="w-3 h-3" />;
      case 'shipped':
        return <Truck className="w-3 h-3" />;
      case 'delivered':
        return <Gift className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM dd, yyyy') : 'Invalid date';
  };

  const formatRelativeDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM dd') : 'Unknown';
  };

  if (isLoadingDelivery || isLoadingOrders) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Next Delivery Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <Calendar className="w-5 h-5 text-blue-600" />
            Next Delivery Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextDeliveryInfo?.hasActiveQueue ? (
            <>
              {/* Active Queue Information */}
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={getStatusColor(nextDeliveryInfo.orderStatus)}
                    >
                      {getStatusIcon(nextDeliveryInfo.orderStatus)}
                      <span className="ml-1 capitalize">{nextDeliveryInfo.orderStatus}</span>
                    </Badge>
                    <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      Cycle #{nextDeliveryInfo.cycleNumber}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900`}>
                      {nextDeliveryInfo.scheduledToys.length} toys scheduled for next delivery
                    </p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                      Estimated delivery: {formatDate(nextDeliveryInfo.estimatedDeliveryDate)}
                    </p>
                    {nextDeliveryInfo.lastModified && (
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500`}>
                        Last modified: {formatRelativeDate(nextDeliveryInfo.lastModified)}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`${isMobile ? 'ml-2' : 'ml-4'} flex gap-2`}>
                  <Button 
                    variant="outline" 
                    size={isMobile ? "sm" : "sm"}
                    onClick={() => nextDeliveryInfo.queueOrderId && handleViewOrder(nextDeliveryInfo.queueOrderId)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    <span className={isMobile ? 'hidden' : 'inline'}>View</span>
                  </Button>
                  <Button 
                    variant="default" 
                    size={isMobile ? "sm" : "sm"}
                    onClick={handleManageQueue}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    <span className={isMobile ? 'hidden' : 'inline'}>Edit</span>
                  </Button>
                </div>
              </div>

              {/* Scheduled Toys Preview */}
              {nextDeliveryInfo.scheduledToys.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900`}>
                      Scheduled Toys
                    </h4>
                    {nextDeliveryInfo.scheduledToys.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setExpandedToys(!expandedToys)}
                      >
                        {expandedToys ? 'Show Less' : `+${nextDeliveryInfo.scheduledToys.length - 3} more`}
                      </Button>
                    )}
                  </div>
                  
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-2`}>
                    {(expandedToys ? nextDeliveryInfo.scheduledToys : nextDeliveryInfo.scheduledToys.slice(0, 3))
                      .map((toy, index) => (
                      <div 
                        key={toy.id || index} 
                        className="flex items-center gap-2 p-2 bg-white rounded border"
                      >
                        {toy.image_url && (
                          <img 
                            src={toy.image_url} 
                            alt={toy.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900 truncate`}>
                            {toy.name}
                          </p>
                          {toy.category && (
                            <p className="text-xs text-gray-500 truncate">
                              {toy.category}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* No Active Queue */
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900 mb-1`}>
                No upcoming toy changes
              </h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mb-4`}>
                Set up your next delivery queue to customize your toy selection
              </p>
              <Button onClick={handleManageQueue} size={isMobile ? "sm" : "default"}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Queue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Queue Orders */}
      {recentQueueOrders && recentQueueOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Recent Toy Changes
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/orders')}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQueueOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`${isMobile ? 'text-sm' : ''} font-medium text-gray-900`}>
                        {order.order_number}
                      </span>
                      <Badge 
                        variant="outline" 
                        size="sm"
                        className={getStatusColor(order.status)}
                      >
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                        {order.selected_toys?.length || 0} toys
                      </span>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
                        {formatRelativeDate(order.created_at)}
                      </span>
                      {order.total_amount === 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          FREE
                        </Badge>
                      ) : (
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>
                          ₹{order.total_amount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-2">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 