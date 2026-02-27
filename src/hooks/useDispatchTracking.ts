import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for dispatch system
export interface DispatchOrder {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  subscription_plan: string;
  dispatch_status: 'pending' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'return_requested' | 'returned' | 'completed';
  dispatch_date?: string;
  expected_return_date?: string;
  actual_return_date?: string;
  tracking_number?: string;
  dispatch_notes?: string;
  return_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DispatchItem {
  id: string;
  dispatch_order_id: string;
  toy_id: string;
  toy_name: string;
  toy_category?: string;
  toy_age_range?: string;
  quantity_dispatched: number;
  item_condition_out: 'excellent' | 'good' | 'fair' | 'damaged';
  item_condition_in?: 'excellent' | 'good' | 'fair' | 'damaged' | 'missing';
  item_status: 'dispatched' | 'with_customer' | 'returned' | 'damaged' | 'lost';
  dispatch_date: string;
  return_date?: string;
  damage_notes?: string;
  replacement_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReturnTracking {
  id: string;
  dispatch_order_id: string;
  return_initiated_date: string;
  return_method?: 'pickup' | 'courier' | 'drop_off';
  return_tracking_number?: string;
  items_expected: number;
  items_received: number;
  items_damaged: number;
  items_missing: number;
  return_status: 'pending' | 'partial' | 'complete' | 'damaged' | 'missing_items';
  quality_check_done: boolean;
  quality_check_notes?: string;
  processing_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface PendingDispatch {
  id: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  subscription_plan: string;
  created_at: string;
  total_items: number;
  toys_list: string;
}

export interface OverdueReturn {
  id: string;
  customer_name: string;
  customer_phone: string;
  dispatch_date: string;
  expected_return_date: string;
  overdue_by: string;
  total_items: number;
  toys_list: string;
}

// Hook to get pending dispatches using direct SQL
export const usePendingDispatches = () => {
  return useQuery({
    queryKey: ['pending-dispatches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              do.id,
              do.order_id,
              do.customer_name,
              do.customer_phone,
              do.subscription_plan,
              do.created_at,
              COUNT(di.id) as total_items,
              STRING_AGG(di.toy_name, ', ') as toys_list
            FROM dispatch_orders do
            LEFT JOIN dispatch_items di ON do.id = di.dispatch_order_id
            WHERE do.dispatch_status = 'pending'
            GROUP BY do.id, do.order_id, do.customer_name, do.customer_phone, do.subscription_plan, do.created_at
            ORDER BY do.created_at
          `
        });

      if (error) throw error;
      return data as PendingDispatch[];
    },
  });
};

// Hook to get overdue returns using direct SQL
export const useOverdueReturns = () => {
  return useQuery({
    queryKey: ['overdue-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              do.id,
              do.customer_name,
              do.customer_phone,
              do.dispatch_date,
              do.expected_return_date,
              (now() - do.expected_return_date) as overdue_by,
              COUNT(di.id) as total_items,
              STRING_AGG(di.toy_name, ', ') as toys_list
            FROM dispatch_orders do
            LEFT JOIN dispatch_items di ON do.id = di.dispatch_order_id
            WHERE do.dispatch_status IN ('dispatched', 'delivered') 
            AND do.expected_return_date < now()
            GROUP BY do.id, do.customer_name, do.customer_phone, do.dispatch_date, do.expected_return_date
            ORDER BY do.expected_return_date
          `
        });

      if (error) throw error;
      return data as OverdueReturn[];
    },
  });
};

// Hook to get dispatch summary using direct SQL
export const useDispatchSummary = () => {
  return useQuery({
    queryKey: ['dispatch-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              dispatch_status,
              COUNT(*) as order_count,
              SUM(CASE WHEN expected_return_date < now() AND dispatch_status IN ('dispatched', 'delivered') THEN 1 ELSE 0 END) as overdue_count
            FROM dispatch_orders
            GROUP BY dispatch_status
          `
        });

      if (error) throw error;
      return data;
    },
  });
};

// Hook to get dispatch orders with items using direct SQL
export const useDispatchOrders = (status?: string) => {
  return useQuery({
    queryKey: ['dispatch-orders', status],
    queryFn: async () => {
      const statusFilter = status ? `WHERE do.dispatch_status = '${status}'` : '';
      
      const { data, error } = await supabase
        .rpc('exec_sql', {
          sql: `
            SELECT 
              do.*,
              json_agg(
                json_build_object(
                  'id', di.id,
                  'toy_id', di.toy_id,
                  'toy_name', di.toy_name,
                  'toy_category', di.toy_category,
                  'toy_age_range', di.toy_age_range,
                  'quantity_dispatched', di.quantity_dispatched,
                  'item_condition_out', di.item_condition_out,
                  'item_condition_in', di.item_condition_in,
                  'item_status', di.item_status,
                  'dispatch_date', di.dispatch_date,
                  'return_date', di.return_date,
                  'damage_notes', di.damage_notes,
                  'replacement_required', di.replacement_required
                )
              ) as dispatch_items
            FROM dispatch_orders do
            LEFT JOIN dispatch_items di ON do.id = di.dispatch_order_id
            ${statusFilter}
            GROUP BY do.id
            ORDER BY do.created_at DESC
          `
        });

      if (error) throw error;
      return data as (DispatchOrder & { dispatch_items: DispatchItem[] })[];
    },
  });
};

// Hook to create dispatch order - simplified without RPC calls
export const useCreateDispatchOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      order_id: string;
      customer_id: string;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      subscription_plan: string;
      expected_return_days?: number;
      toys: Array<{
        toy_id: string;
        toy_name: string;
        toy_category?: string;
        toy_age_range?: string;
        quantity?: number;
      }>;
    }) => {
      // Calculate expected return date
      const expectedReturnDate = new Date();
      expectedReturnDate.setDate(expectedReturnDate.getDate() + (params.expected_return_days || 30));

      // Create dispatch order using direct insert
      const { data: dispatchOrder, error: orderError } = await supabase
        .rpc('exec_sql', {
          sql: `
            INSERT INTO dispatch_orders (
              order_id, customer_id, customer_name, customer_phone, 
              customer_address, subscription_plan, expected_return_date, dispatch_status
            ) VALUES (
              '${params.order_id}', '${params.customer_id}', '${params.customer_name}', 
              '${params.customer_phone}', '${params.customer_address}', '${params.subscription_plan}', 
              '${expectedReturnDate.toISOString()}', 'pending'
            ) RETURNING id
          `
        });

      if (orderError) throw orderError;

      const dispatchId = dispatchOrder[0]?.id;
      if (!dispatchId) throw new Error('Failed to create dispatch order');

      // Add toys to dispatch using direct inserts
      for (const toy of params.toys) {
        const { error: toyError } = await supabase
          .rpc('exec_sql', {
            sql: `
              INSERT INTO dispatch_items (
                dispatch_order_id, toy_id, toy_name, toy_category, 
                toy_age_range, quantity_dispatched
              ) VALUES (
                '${dispatchId}', '${toy.toy_id}', '${toy.toy_name}', 
                '${toy.toy_category || ''}', '${toy.toy_age_range || ''}', ${toy.quantity || 1}
              )
            `
          });

        if (toyError) throw toyError;

        // Update inventory
        const { error: inventoryError } = await supabase
          .rpc('exec_sql', {
            sql: `
              UPDATE toys 
              SET available_quantity = available_quantity - ${toy.quantity || 1},
                  updated_at = now()
              WHERE id = '${toy.toy_id}'
            `
          });

        if (inventoryError) throw inventoryError;
      }

      return dispatchId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-summary'] });
      toast.success('Dispatch order created successfully');
    },
    onError: (error) => {
      console.error('Error creating dispatch order:', error);
      toast.error('Failed to create dispatch order');
    },
  });
};

// Hook to mark order as dispatched
export const useMarkOrderDispatched = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dispatch_order_id: string;
      tracking_number?: string;
      dispatch_notes?: string;
    }) => {
      const { error } = await supabase
        .rpc('exec_sql', {
          sql: `
            UPDATE dispatch_orders 
            SET dispatch_status = 'dispatched',
                dispatch_date = now(),
                tracking_number = '${params.tracking_number || ''}',
                dispatch_notes = '${params.dispatch_notes || ''}',
                updated_at = now()
            WHERE id = '${params.dispatch_order_id}'
          `
        });

      if (error) throw error;

      // Update all items in this order
      const { error: itemsError } = await supabase
        .rpc('exec_sql', {
          sql: `
            UPDATE dispatch_items 
            SET item_status = 'with_customer',
                dispatch_date = now(),
                updated_at = now()
            WHERE dispatch_order_id = '${params.dispatch_order_id}'
          `
        });

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-summary'] });
      toast.success('Order marked as dispatched');
    },
    onError: (error) => {
      console.error('Error marking order as dispatched:', error);
      toast.error('Failed to mark order as dispatched');
    },
  });
};

// Hook to process returns
export const useProcessReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dispatch_order_id: string;
      returned_items: Array<{
        item_id: string;
        condition: 'excellent' | 'good' | 'fair' | 'damaged' | 'missing';
        damage_notes?: string;
      }>;
      return_method?: 'pickup' | 'courier' | 'drop_off';
    }) => {
      // Process each returned item
      for (const item of params.returned_items) {
        const { error: itemError } = await supabase
          .rpc('exec_sql', {
            sql: `
              UPDATE dispatch_items 
              SET item_status = 'returned',
                  item_condition_in = '${item.condition}',
                  damage_notes = '${item.damage_notes || ''}',
                  return_date = now(),
                  updated_at = now()
              WHERE id = '${item.item_id}'
            `
          });

        if (itemError) throw itemError;

        // Return inventory if item is in good condition
        if (['excellent', 'good'].includes(item.condition)) {
          const { error: inventoryError } = await supabase
            .rpc('exec_sql', {
              sql: `
                UPDATE toys 
                SET available_quantity = available_quantity + 1,
                    updated_at = now()
                WHERE id = (
                  SELECT toy_id FROM dispatch_items 
                  WHERE id = '${item.item_id}'
                )
              `
            });

          if (inventoryError) throw inventoryError;
        }
      }

      // Update dispatch order status
      const { error: orderError } = await supabase
        .rpc('exec_sql', {
          sql: `
            UPDATE dispatch_orders 
            SET dispatch_status = 'returned',
                actual_return_date = now(),
                updated_at = now()
            WHERE id = '${params.dispatch_order_id}'
          `
        });

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-returns'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-summary'] });
      toast.success('Return processed successfully');
    },
    onError: (error) => {
      console.error('Error processing return:', error);
      toast.error('Failed to process return');
    },
  });
};

// Hook to update dispatch order status
export const useUpdateDispatchStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      dispatch_order_id: string;
      status: DispatchOrder['dispatch_status'];
      notes?: string;
    }) => {
      const { error } = await supabase
        .rpc('exec_sql', {
          sql: `
            UPDATE dispatch_orders 
            SET dispatch_status = '${params.status}',
                dispatch_notes = '${params.notes || ''}',
                updated_at = now()
            WHERE id = '${params.dispatch_order_id}'
          `
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch-summary'] });
      toast.success('Dispatch status updated');
    },
    onError: (error) => {
      console.error('Error updating dispatch status:', error);
      toast.error('Failed to update dispatch status');
    },
  });
}; 