import { useState, useCallback, useMemo, forwardRef } from "react";
import { FixedSizeList as List } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import AutoSizer from "react-virtualized-auto-sizer";
import OrderCard from "./OrderCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Package } from "lucide-react";

interface VirtualizedOrderListProps {
  orders: any[];
  selectedOrderIds: string[];
  onToggleSelection: (orderId: string) => void;
  onViewDetails: (order: any) => void;
  onEditOrder: (order: any) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isLoading: boolean;
}

// Order item component optimized for virtual scrolling
const OrderListItem = forwardRef<
  HTMLDivElement,
  {
    index: number;
    style: React.CSSProperties;
    data: {
      orders: any[];
      selectedOrderIds: string[];
      onToggleSelection: (orderId: string) => void;
      onViewDetails: (order: any) => void;
      onEditOrder: (order: any) => void;
      getStatusColor: (status: string) => string;
      getStatusIcon: (status: string) => JSX.Element;
      hasNextPage: boolean;
      fetchNextPage: () => void;
    };
  }
>(({ index, style, data }, ref) => {
  const {
    orders,
    selectedOrderIds,
    onToggleSelection,
    onViewDetails,
    onEditOrder,
    getStatusColor,
    getStatusIcon,
    hasNextPage,
    fetchNextPage
  } = data;

  // Check if this is a loading placeholder
  const isLoading = index >= orders.length;
  
  // Trigger loading more when approaching the end
  if (index >= orders.length - 5 && hasNextPage) {
    fetchNextPage();
  }

  if (isLoading) {
    return (
      <div ref={ref} style={style} className="px-4 py-2">
        <div className="mb-6">
          <Card className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const order = orders[index];
  if (!order) return null;

  return (
    <div ref={ref} style={style} className="px-4 py-2">
      <div className="mb-6">
        <OrderCard
          order={order}
          isSelected={selectedOrderIds.includes(order.id)}
          onSelect={() => onToggleSelection(order.id)}
          onViewDetails={() => onViewDetails(order)}
          onEditOrder={() => onEditOrder(order)}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      </div>
    </div>
  );
});

OrderListItem.displayName = "OrderListItem";

const VirtualizedOrderList = ({
  orders,
  selectedOrderIds,
  onToggleSelection,
  onViewDetails,
  onEditOrder,
  getStatusColor,
  getStatusIcon,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading
}: VirtualizedOrderListProps) => {
  // Calculate total item count including loading placeholders
  const itemCount = hasNextPage ? orders.length + 5 : orders.length;
  
  // Check if item is loaded
  const isItemLoaded = useCallback(
    (index: number) => !!orders[index],
    [orders]
  );

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo(
    () => ({
      orders,
      selectedOrderIds,
      onToggleSelection,
      onViewDetails,
      onEditOrder,
      getStatusColor,
      getStatusIcon,
      hasNextPage,
      fetchNextPage
    }),
    [
      orders,
      selectedOrderIds,
      onToggleSelection,
      onViewDetails,
      onEditOrder,
      getStatusColor,
      getStatusIcon,
      hasNextPage,
      fetchNextPage
    ]
  );

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin mr-3 text-primary" />
        <span className="text-lg text-muted-foreground">Loading orders...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
        <h3 className="text-xl font-semibold mb-2">No orders found</h3>
        <p className="text-muted-foreground">
          No orders match your current filters
        </p>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full">
      <AutoSizer>
        {({ height, width }) => (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={itemCount}
            loadMoreItems={hasNextPage ? fetchNextPage : () => {}}
          >
            {({ onItemsRendered, ref }) => (
              <List
                ref={ref}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={380} // Increased for address section with Plus Code display
                itemData={itemData}
                onItemsRendered={onItemsRendered}
                overscanCount={3} // Render 3 extra items for smooth scrolling
              >
                {OrderListItem}
              </List>
            )}
          </InfiniteLoader>
        )}
      </AutoSizer>
      
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-primary" />
          <span className="text-sm text-muted-foreground">Loading more orders...</span>
        </div>
      )}
    </div>
  );
};

export default VirtualizedOrderList; 