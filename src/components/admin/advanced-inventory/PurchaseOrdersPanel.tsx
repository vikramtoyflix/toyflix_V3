import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrder } from '@/types/inventory';

interface PurchaseOrdersPanelProps {
  orders?: PurchaseOrder[];
  isLoading: boolean;
}

export const PurchaseOrdersPanel: React.FC<PurchaseOrdersPanelProps> = ({
  orders,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading purchase orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{order.order_number}</h4>
                  <p className="text-sm text-muted-foreground">
                    {order.supplier?.name} • ₹{order.total_amount.toLocaleString()}
                  </p>
                </div>
                <Badge variant="secondary">{order.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No purchase orders found.</p>
        )}
      </CardContent>
    </Card>
  );
}; 