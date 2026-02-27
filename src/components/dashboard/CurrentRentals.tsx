import { useHybridCurrentRentals } from '@/hooks/useHybridOrders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CurrentRentals = () => {
  const { data: rentals, isLoading } = useHybridCurrentRentals();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRentalItems = (rental: any) => {
    // Handle both WooCommerce and Supabase formats
    if (rental.items && Array.isArray(rental.items)) {
      return rental.items;
    }
    if (rental.order_items && Array.isArray(rental.order_items)) {
      return rental.order_items;
    }
    // For WooCommerce orders, create a mock item from order data
    if (rental.source === 'woocommerce') {
      return [{
        id: `wc_${rental.id}`,
        name: 'Toy Rental Package',
        toy: {
          name: 'Toy Rental Package',
          image_url: '/placeholder.svg'
        }
      }];
    }
    return [];
  };

  const getRentalStartDate = (rental: any) => {
    return rental.rental_start_date || rental.created_at;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Toys at Home
          {rentals && rentals.length > 0 && rentals[0].source === 'woocommerce' && (
            <Badge variant="outline" className="text-xs">
              Legacy Data
            </Badge>
          )}
        </CardTitle>
        <CardDescription>The toys you are currently enjoying.</CardDescription>
      </CardHeader>
      <CardContent>
        {rentals && rentals.length > 0 ? (
          <div className="space-y-4">
            {rentals.map((rental) => {
              const items = getRentalItems(rental);
              return items.map((item, index) => (
                <div key={`${rental.id}-${item.id || index}`} className="flex items-center gap-4 p-3 border rounded-lg">
                  <img
                    src={item.toy?.image_url || item.image_url || '/placeholder.svg'}
                    alt={item.toy?.name || item.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.toy?.name || item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {rental.source === 'woocommerce' 
                        ? `Order from ${formatDistanceToNow(new Date(rental.created_at), { addSuffix: true })}`
                        : `Rented ${formatDistanceToNow(new Date(getRentalStartDate(rental)), { addSuffix: true })}`
                      }
                    </p>
                    {rental.source === 'woocommerce' && (
                      <p className="text-xs text-blue-600">
                        Historical rental from WooCommerce
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="outline">{rental.status}</Badge>
                    {rental.source === 'woocommerce' && (
                      <Badge variant="secondary" className="text-xs">
                        WC
                      </Badge>
                    )}
                  </div>
                </div>
              ));
            })}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You have no toys at home right now.</p>
            <p className="text-sm text-muted-foreground">
              Once your next delivery is shipped, it will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrentRentals;
