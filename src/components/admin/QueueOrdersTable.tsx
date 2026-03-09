import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Edit2, Package, Clock, User, Trash2 } from 'lucide-react';
// Format currency function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface QueueOrder {
  id: string;
  order_number: string;
  user_id: string;
  selected_toys?: any[];
  queue_order_type: string;
  queue_cycle_number: number;
  status: string;
  payment_status: string;
  total_amount: number;
  estimated_delivery_date?: string;
  created_at: string;
  current_plan_id: string;
  delivery_address?: any;
  custom_user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  fallback_customer_name?: string;
  fallback_customer_phone?: string;
  fallback_customer_email?: string;
  isQueueOrder: boolean;
}

interface QueueOrdersTableProps {
  orders: QueueOrder[];
  onViewOrder?: (order: QueueOrder) => void;
  onEditOrder?: (order: QueueOrder) => void;
  isLoading?: boolean;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'processing':
      return 'default';
    case 'confirmed':
      return 'default';
    case 'preparing':
      return 'secondary';
    case 'shipped':
      return 'outline';
    case 'delivered':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const getPaymentStatusBadgeVariant = (paymentStatus: string) => {
  switch (paymentStatus.toLowerCase()) {
    case 'paid':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'destructive';
    case 'refunded':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getQueueTypeBadgeVariant = (queueType: string) => {
  switch (queueType.toLowerCase()) {
    case 'next_cycle':
      return 'default';
    case 'modification':
      return 'secondary';
    case 'emergency_change':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const QueueOrdersTable: React.FC<QueueOrdersTableProps> = ({
  orders,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
  isLoading = false
}) => {
  const queueOrders = orders.filter(order => order.isQueueOrder);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Queue Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading queue orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (queueOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Queue Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No queue orders found</p>
            <p className="text-sm">Queue orders will appear here when customers modify their next cycle selections</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Queue Orders
            <Badge variant="secondary" className="ml-2">
              {queueOrders.length}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            Next cycle modifications and additions
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Order Number</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Queue Type</TableHead>
                <TableHead className="font-semibold text-center">Cycle #</TableHead>
                <TableHead className="font-semibold text-center">Toys</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Payment</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold">Plan</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueOrders.map((order) => {
                const customerName = order.custom_user?.first_name && order.custom_user?.last_name
                  ? `${order.custom_user.first_name} ${order.custom_user.last_name}`
                  : order.fallback_customer_name || 'Unknown Customer';
                
                const customerPhone = order.custom_user?.phone || order.fallback_customer_phone || 'No phone';
                const customerEmail = order.custom_user?.email || order.fallback_customer_email || 'No email';

                return (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                          {order.order_number}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="font-medium text-sm">{customerName}</span>
                        </div>
                        <div className="text-xs text-gray-500">{customerPhone}</div>
                        {customerEmail !== 'No email' && (
                          <div className="text-xs text-gray-400">{customerEmail}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getQueueTypeBadgeVariant(order.queue_order_type)}>
                        {order.queue_order_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                        #{order.queue_cycle_number}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {order.selected_toys?.length || 0}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {order.total_amount > 0 ? (
                        formatCurrency(order.total_amount)
                      ) : (
                        <span className="text-green-600 font-medium">FREE</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {order.current_plan_id?.includes('silver') ? 'Silver' :
                         order.current_plan_id?.includes('gold') ? 'Gold PRO' :
                         order.current_plan_id?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {onViewOrder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewOrder(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEditOrder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditOrder(order)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteOrder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteOrder(order)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {queueOrders.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {queueOrders.length} queue order{queueOrders.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 