import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  SupplierInfo, 
  InventoryMovement, 
  PurchaseOrder, 
  StockAlert, 
  InventoryAnalytics, 
  ReorderRecommendation,
  InventorySummary,
  BulkOperation,
  AdvancedToyFilters
} from '@/types/inventory';
import { Toy } from '@/hooks/useToys';

// ========================================
// SUPPLIERS HOOKS
// ========================================

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<SupplierInfo[]> => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (supplier: Omit<SupplierInfo, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Success', description: 'Supplier created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to create supplier', variant: 'destructive' });
      console.error('Create supplier error:', error);
    },
  });
};

// ========================================
// INVENTORY MOVEMENTS HOOKS
// ========================================

export const useInventoryMovements = (toyId?: string) => {
  return useQuery({
    queryKey: ['inventory-movements', toyId],
    queryFn: async (): Promise<InventoryMovement[]> => {
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (toyId) {
        query = query.eq('toy_id', toyId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) {
        console.error('Error fetching inventory movements:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useRecordInventoryMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      toyId: string;
      movementType: string;
      quantity: number;
      reason?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('record_inventory_movement', {
        p_toy_id: params.toyId,
        p_movement_type: params.movementType,
        p_quantity: params.quantity,
        p_reason: params.reason,
        p_notes: params.notes,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast({ title: 'Success', description: 'Inventory updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update inventory', variant: 'destructive' });
      console.error('Inventory movement error:', error);
    },
  });
};

// ========================================
// PURCHASE ORDERS HOOKS
// ========================================

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          items:purchase_order_items(
            *,
            toy:toys(id, name, category)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching purchase orders:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGenerateAutoPurchaseOrders = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_auto_purchase_orders');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ 
        title: 'Success', 
        description: `Generated ${data?.length || 0} purchase orders automatically`
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to generate purchase orders', variant: 'destructive' });
      console.error('Auto purchase order error:', error);
    },
  });
};

// ========================================
// STOCK ALERTS HOOKS
// ========================================

export const useStockAlerts = () => {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async (): Promise<StockAlert[]> => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          toy:toys(id, name, category, available_quantity)
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching stock alerts:', error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
};

export const useResolveStockAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: { alertId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          notes: params.notes,
        })
        .eq('id', params.alertId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast({ title: 'Success', description: 'Alert resolved successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to resolve alert', variant: 'destructive' });
      console.error('Resolve alert error:', error);
    },
  });
};

// ========================================
// INVENTORY ANALYTICS HOOKS
// ========================================

export const useInventorySummary = () => {
  return useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async (): Promise<InventorySummary> => {
      // Get basic toy counts
      const { data: toys, error: toysError } = await supabase
        .from('toys')
        .select('available_quantity, total_quantity, rental_price, purchase_cost, reorder_level');
      
      if (toysError) throw toysError;
      
      // Get stock alerts count
      const { data: alerts, error: alertsError } = await supabase
        .from('stock_alerts')
        .select('id')
        .eq('is_resolved', false);
      
      if (alertsError) throw alertsError;
      
      // Get purchase orders count
      const { data: purchaseOrders, error: poError } = await supabase
        .from('purchase_orders')
        .select('id')
        .in('status', ['draft', 'pending', 'approved', 'ordered']);
      
      if (poError) throw poError;
      
      const totalToys = toys?.length || 0;
      const totalAvailable = toys?.reduce((sum, toy) => sum + (toy.available_quantity || 0), 0) || 0;
      const totalInventoryValue = toys?.reduce((sum, toy) => {
        const value = (toy.purchase_cost || toy.rental_price || 0) * (toy.total_quantity || 0);
        return sum + value;
      }, 0) || 0;
      
      const lowStockToys = toys?.filter(toy => 
        (toy.available_quantity || 0) <= (toy.reorder_level || 0)
      ).length || 0;
      
      const outOfStockToys = toys?.filter(toy => 
        (toy.available_quantity || 0) === 0
      ).length || 0;
      
      return {
        total_toys: totalToys,
        total_inventory_value: totalInventoryValue,
        total_available: totalAvailable,
        total_reserved: 0, // Will be calculated with order data
        total_rented: 0, // Will be calculated with order data
        low_stock_toys: lowStockToys,
        out_of_stock_toys: outOfStockToys,
        pending_purchase_orders: purchaseOrders?.length || 0,
        unresolved_alerts: alerts?.length || 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// ========================================
// BULK OPERATIONS HOOKS
// ========================================

export const useBulkUpdateToys = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      toyIds: string[];
      operation: BulkOperation;
    }) => {
      const updateData: Record<string, any> = {};
      
      switch (params.operation.type) {
        case 'price_update':
          updateData.rental_price = params.operation.value;
          break;
        case 'category_update':
          updateData.category = params.operation.value;
          break;
        case 'supplier_update':
          updateData.supplier_id = params.operation.value;
          break;
        case 'status_update':
          updateData.inventory_status = params.operation.value;
          break;
        case 'reorder_level_update':
          updateData.reorder_level = params.operation.value;
          break;
        default:
          throw new Error('Invalid bulk operation type');
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('toys')
        .update(updateData)
        .in('id', params.toyIds)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast({ 
        title: 'Success', 
        description: `Updated ${data?.length || 0} toys successfully`
      });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update toys', variant: 'destructive' });
      console.error('Bulk update error:', error);
    },
  });
};

// ========================================
// ADVANCED FILTERING HOOK
// ========================================

export const useAdvancedToyFilters = (filters: AdvancedToyFilters) => {
  return useQuery({
    queryKey: ['toys-advanced-filter', filters],
    queryFn: async (): Promise<Toy[]> => {
      let query = supabase
        .from('toys')
        .select(`
          *,
          supplier:suppliers(name)
        `);
      
      // Apply filters
      if (filters.inventoryStatus !== 'all') {
        switch (filters.inventoryStatus) {
          case 'low_stock':
            query = query.lte('available_quantity', supabase.rpc('get_reorder_level', {}));
            break;
          case 'out_of_stock':
            query = query.eq('available_quantity', 0);
            break;
          case 'active':
            query = query.eq('inventory_status', 'active');
            break;
          case 'discontinued':
            query = query.eq('inventory_status', 'discontinued');
            break;
        }
      }
      
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      
      if (filters.supplier && filters.supplier !== 'all') {
        query = query.eq('supplier_id', filters.supplier);
      }
      
      if (filters.condition > 0) {
        query = query.gte('condition_rating', filters.condition);
      }
      
      if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
        query = query
          .gte('rental_price', filters.priceRange[0])
          .lte('rental_price', filters.priceRange[1]);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) {
        console.error('Error fetching filtered toys:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: Object.keys(filters).length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// ========================================
// REORDER RECOMMENDATIONS HOOK
// ========================================

export const useReorderRecommendations = () => {
  return useQuery({
    queryKey: ['reorder-recommendations'],
    queryFn: async (): Promise<ReorderRecommendation[]> => {
      // Get toys that need reordering
      const { data: toys, error } = await supabase
        .from('toys')
        .select('*')
        .lte('available_quantity', supabase.rpc('reorder_level', {}))
        .eq('inventory_status', 'active');
      
      if (error) throw error;
      
      // Create recommendations
      const recommendations: ReorderRecommendation[] = (toys || []).map(toy => {
        const currentStock = toy.available_quantity || 0;
        const reorderLevel = toy.reorder_level || 5;
        const reorderQuantity = toy.reorder_quantity || 10;
        
        let urgency: 'high' | 'medium' | 'low' = 'medium';
        if (currentStock === 0) urgency = 'high';
        else if (currentStock <= reorderLevel / 2) urgency = 'high';
        else if (currentStock <= reorderLevel) urgency = 'medium';
        else urgency = 'low';
        
        const unitCost = toy.purchase_cost || toy.rental_price * 0.4 || 100;
        const totalCost = unitCost * reorderQuantity;
        const expectedRevenue = (toy.rental_price || 0) * reorderQuantity * 3; // Assume 3 rentals per toy
        
        return {
          toyId: toy.id,
          toyName: toy.name,
          currentStock,
          recommendedOrderQuantity: reorderQuantity,
          urgency,
          reasoning: `Stock is ${currentStock <= reorderLevel ? 'below' : 'at'} reorder level of ${reorderLevel}`,
          expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          costAnalysis: {
            unitCost,
            totalCost,
            expectedRevenue,
            projectedProfit: expectedRevenue - totalCost,
          },
        };
      });
      
      return recommendations.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 