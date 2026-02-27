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

// Hook to get pending dispatches
export const usePendingDispatches = () => {
  return useQuery({
    queryKey: ['pending-dispatches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_dispatches')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PendingDispatch[];
    },
  });
};

// Hook to get overdue returns
export const useOverdueReturns = () => {
  return useQuery({
    queryKey: ['overdue-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overdue_returns')
        .select('*')
        .order('expected_return_date', { ascending: true });

      if (error) throw error;
      return data as OverdueReturn[];
    },
  });
};

// Hook to get dispatch summary
export const useDispatchSummary = () => {
  return useQuery({
    queryKey: ['dispatch-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_summary')
        .select('*');

      if (error) throw error;
      return data;
    },
  });
};

// Hook to get dispatch orders with items
export const useDispatchOrders = (status?: string) => {
  return useQuery({
    queryKey: ['dispatch-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('dispatch_orders')
        .select(`
          *,
          dispatch_items (*)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('dispatch_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (DispatchOrder & { dispatch_items: DispatchItem[] })[];
    },
  });
};

// Hook to create dispatch order
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
      // Create dispatch order
      const { data: dispatchId, error: orderError } = await supabase
        .rpc('create_dispatch_order', {
          p_order_id: params.order_id,
          p_customer_id: params.customer_id,
          p_customer_name: params.customer_name,
          p_customer_phone: params.customer_phone,
          p_customer_address: params.customer_address,
          p_subscription_plan: params.subscription_plan,
          p_expected_return_days: params.expected_return_days || 30,
        });

      if (orderError) throw orderError;

      // Add toys to dispatch
      const { error: toysError } = await supabase
        .rpc('add_toys_to_dispatch', {
          p_dispatch_order_id: dispatchId,
          p_toys: params.toys,
        });

      if (toysError) throw toysError;

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
        .rpc('mark_order_dispatched', {
          p_dispatch_order_id: params.dispatch_order_id,
          p_tracking_number: params.tracking_number,
          p_dispatch_notes: params.dispatch_notes,
        });

      if (error) throw error;
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
      const { error } = await supabase
        .rpc('process_return', {
          p_dispatch_order_id: params.dispatch_order_id,
          p_returned_items: params.returned_items,
          p_return_method: params.return_method || 'pickup',
        });

      if (error) throw error;
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
        .from('dispatch_orders')
        .update({
          dispatch_status: params.status,
          dispatch_notes: params.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.dispatch_order_id);

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