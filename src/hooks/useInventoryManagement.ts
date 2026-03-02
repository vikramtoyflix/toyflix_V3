import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useCustomAuth } from '@/hooks/useCustomAuth';

// Add ToyImage interface
export interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================
// SIMPLIFIED INVENTORY CRUD OPERATIONS
// ========================================

export interface ToyFormData {
  name: string;
  description?: string;
  category: string;
  subscription_category?: string; // Add subscription_category field
  age_range: string;
  brand?: string;
  retail_price?: number;
  rental_price?: number;
  total_quantity: number;
  available_quantity: number;
  image_url?: string;
  is_featured?: boolean;
}

export interface ToyUpdateData extends Partial<ToyFormData> {
  id: string;
}

/**
 * Hook to create a new toy
 */
export const useCreateToy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyData: ToyFormData) => {
      console.log('🔍 RAW CREATE DATA RECEIVED:', toyData);
      
      // Create a completely clean object with only allowed fields including subscription_category
      const allowedFields = ['name', 'description', 'category', 'subscription_category', 'age_range', 'brand', 'retail_price', 'rental_price', 'total_quantity', 'available_quantity', 'image_url', 'is_featured'];
      const cleanData: any = {};
      
      // Only include allowed fields and ensure proper types
      allowedFields.forEach(field => {
        if (toyData.hasOwnProperty(field)) {
          cleanData[field] = toyData[field as keyof typeof toyData];
        }
      });
      
      // Ensure subscription_category has a fallback value
      if (!cleanData.subscription_category) {
        cleanData.subscription_category = cleanData.category || 'educational_toys';
      }
      
      console.log('✅ CLEAN CREATE DATA BEING SENT:', cleanData);
      
      const { data, error } = await supabase
        .from('toys')
        .insert([cleanData])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Create toy error:', error);
        console.error('🔥 Clean data that failed:', cleanData);
        throw error;
      }
      
      console.log('✅ Create successful:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_FSkXrLtW_fYLLGipAoq1Hw_ltq5Ij-J';

/**
 * Hook to update an existing toy - Admin version (via Edge Function, no service role in client).
 */
export const useUpdateToy = () => {
  const queryClient = useQueryClient();
  const { user } = useCustomAuth();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: ToyUpdateData) => {
      if (!user?.id) throw new Error('Admin login required');

      const allowedFields = ['name', 'description', 'category', 'subscription_category', 'age_range', 'brand', 'retail_price', 'rental_price', 'total_quantity', 'available_quantity', 'image_url', 'is_featured'];
      const cleanData: Record<string, unknown> = {};
      allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(updateData, field)) {
          cleanData[field] = updateData[field as keyof typeof updateData];
        }
      });
      if (cleanData.category && !cleanData.subscription_category) {
        cleanData.subscription_category = cleanData.category;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-update-toy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'X-Admin-User-Id': user.id,
        },
        body: JSON.stringify({ id, ...cleanData }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || json?.message || res.statusText;
        const err = new Error(typeof msg === 'string' ? msg : 'Failed to update toy');
        (err as Error & { code?: string; details?: unknown }).code = json?.code;
        (err as Error & { code?: string; details?: unknown }).details = json?.details;
        throw err;
      }
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
      queryClient.invalidateQueries({ queryKey: ['toy-images', data?.id] });
    },
  });
};

/**
 * Hook to delete a toy (proper soft delete - sets quantities to 0 and hides from inventory)
 */
export const useDeleteToy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyId: string) => {
      console.log('🗑️ SOFT DELETE operation for toy:', toyId);
      
      // Mark as deleted by setting all quantities to 0 and inventory_status to 'discontinued'
      const { data, error } = await supabase
        .from('toys')
        .update({ 
          available_quantity: 0,
          total_quantity: 0,
          inventory_status: 'discontinued',
          updated_at: new Date().toISOString()
        })
        .eq('id', toyId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Delete toy error:', error);
        throw error;
      }
      
      console.log('✅ Toy marked as discontinued:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Hook to permanently delete a toy (hard delete)
 */
export const usePermanentDeleteToy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyId: string) => {
      const { error } = await supabase
        .from('toys')
        .delete()
        .eq('id', toyId);
      
      if (error) throw error;
      return toyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Hook to bulk update toy quantities
 */
export const useBulkUpdateQuantities = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Array<{ id: string; total_quantity?: number; available_quantity?: number }>) => {
      const results = [];
      
      for (const update of updates) {
        const { data, error } = await supabase
          .from('toys')
          .update({
            total_quantity: update.total_quantity,
            available_quantity: update.available_quantity
          })
          .eq('id', update.id)
          .select()
          .single();
        
        if (error) throw error;
        results.push(data);
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Hook to bulk delete toys
 */
export const useBulkDeleteToys = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyIds: string[]) => {
      // Set available_quantity to 0 for all selected toys
      const { data, error } = await supabase
        .from('toys')
        .update({ available_quantity: 0 })
        .in('id', toyIds)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Hook to search and filter toys
 */
export const useSearchToys = (filters: {
  search?: string;
  category?: string;
  age_range?: string;
  is_featured?: boolean;
  low_stock?: boolean;
  out_of_stock?: boolean;
  include_deleted?: boolean; // Add option to include deleted toys
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['search-toys', filters],
    queryFn: async () => {
      let query = supabase
        .from('toys')
        .select('*', { count: 'exact' });
      
      // IMPORTANT: Filter out discontinued/deleted toys by default
      if (!filters.include_deleted) {
        query = query.neq('inventory_status', 'discontinued');
      }
      
      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
      }
      
      if (filters.category) {
        query = query.eq('category', filters.category as any);
      }
      
      if (filters.age_range) {
        query = query.eq('age_range', filters.age_range);
      }
      
      if (filters.is_featured !== undefined) {
        query = query.eq('is_featured', filters.is_featured);
      }
      
      if (filters.low_stock) {
        query = query.lte('available_quantity', 2).gt('available_quantity', 0);
      }
      
      if (filters.out_of_stock) {
        query = query.eq('available_quantity', 0);
      }
      
      // Pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }
      
      query = query.order('name', { ascending: true });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        toys: data || [],
        totalCount: count || 0
      };
    },
    enabled: true,
  });
};

/**
 * Hook to get toy categories for dropdown
 */
export const useToyCategories = () => {
  return useQuery({
    queryKey: ['toy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toys')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const categories = [...new Set(data.map(item => item.category).filter(cat => cat && cat.trim()))].sort();
      return categories;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook to get age ranges for dropdown
 */
export const useToyAgeRanges = () => {
  return useQuery({
    queryKey: ['toy-age-ranges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toys')
        .select('age_range')
        .not('age_range', 'is', null);
      
      if (error) throw error;
      
      const ageRanges = [...new Set(data.map(item => item.age_range).filter(range => range && range.trim()))].sort();
      return ageRanges;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// ========================================
// REAL INVENTORY DASHBOARD IMPLEMENTATION
// ========================================

/**
 * IMPROVED Main inventory dashboard hook with better error handling
 */
export const useInventoryDashboard = () => {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: async () => {
      console.log('🔄 Fetching inventory dashboard data...');
      
      try {
        // Fetch toys with better error handling
        const { data: toys, error: toysError } = await supabase
          .from('toys')
          .select('*')
          .order('name', { ascending: true });

        if (toysError) {
          console.error('❌ Error fetching toys:', toysError);
          throw new Error(`Database error: ${toysError.message}`);
        }

        if (!toys || toys.length === 0) {
          console.warn('⚠️ No toys found in database');
          return {
            inventoryStatus: [],
            inventoryAlerts: [],
            recentMovements: [],
            inventorySummary: {
              total_toys: 0,
              total_inventory: 0,
              total_available: 0,
              total_reserved: 0,
              total_rented: 0,
              low_stock_toys: 0,
              out_of_stock_toys: 0,
              medium_stock_toys: 0,
              good_stock_toys: 0,
            },
          };
        }

        // Try to fetch real inventory alerts (fallback to calculated ones)
        let inventoryAlerts: InventoryAlert[] = [];
        try {
          const { data: alertsData, error: alertsError } = await supabase
            .from('inventory_alerts')
            .select(`
              *,
              toys:toy_id (
                name,
                category,
                available_quantity
              )
            `)
            .is('resolved_at', null)
            .order('created_at', { ascending: false });

          if (!alertsError && alertsData) {
            inventoryAlerts = alertsData.map(alert => ({
              id: alert.id,
              toy_id: alert.toy_id,
              alert_type: alert.alert_type,
              alert_severity: alert.alert_severity,
              message: alert.message,
              threshold_value: alert.threshold_value,
              current_value: alert.current_value,
              created_at: alert.created_at,
              resolved_at: alert.resolved_at,
              toy: alert.toys ? {
                name: alert.toys.name,
                category: alert.toys.category,
                available_quantity: alert.toys.available_quantity
              } : undefined
            }));
          }
        } catch (alertError) {
          console.warn('⚠️ Inventory alerts table not available, using calculated alerts');
        }

        // Try to fetch real inventory movements (fallback to empty array)
        let recentMovements: InventoryMovement[] = [];
        try {
          const { data: movementsData, error: movementsError } = await supabase
            .from('inventory_movements')
            .select(`
              *,
              toys:toy_id (
                name,
                category
              )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!movementsError && movementsData) {
            recentMovements = movementsData.map(movement => ({
              id: movement.id,
              toy_id: movement.toy_id,
              movement_type: movement.movement_type,
              quantity_change: movement.quantity_change,
              reference_type: movement.reference_type,
              reference_id: movement.reference_id,
              notes: movement.notes,
              created_by: movement.created_by,
              created_at: movement.created_at,
              toys: movement.toys ? {
                name: movement.toys.name,
                category: movement.toys.category
              } : undefined
            }));
            
            console.log(`✅ Loaded ${recentMovements.length} inventory movements`);
          } else if (movementsError) {
            console.error('❌ Error fetching inventory movements:', movementsError);
          }
        } catch (movementError) {
          console.warn('⚠️ Error accessing inventory movements:', movementError);
        }

        // Calculate inventory summary
        const totalToys = toys.length;
        const totalInventory = toys.reduce((sum, toy) => sum + (toy.total_quantity || 0), 0);
        const totalAvailable = toys.reduce((sum, toy) => sum + (toy.available_quantity || 0), 0);
        
        // Calculate stock status categories
        const lowStockThreshold = 3;
        const lowStockToys = toys.filter(toy => 
          (toy.available_quantity || 0) > 0 && (toy.available_quantity || 0) <= lowStockThreshold
        ).length;
        
        const outOfStockToys = toys.filter(toy => 
          (toy.available_quantity || 0) === 0
        ).length;
        
        const mediumStockToys = toys.filter(toy => 
          (toy.available_quantity || 0) > lowStockThreshold && (toy.available_quantity || 0) <= 10
        ).length;
        
        const goodStockToys = toys.filter(toy => 
          (toy.available_quantity || 0) > 10
        ).length;

        // Create inventory status array
        const inventoryStatus: ComprehensiveInventoryStatus[] = toys.map(toy => ({
          toy_id: toy.id,
          toy_name: toy.name,
          category: toy.category || 'Uncategorized',
          age_range: toy.age_range || 'All Ages',
          total_quantity: toy.total_quantity || 0,
          available_quantity: toy.available_quantity || 0,
          reserved_quantity: 0,
          rented_quantity: Math.max(0, (toy.total_quantity || 0) - (toy.available_quantity || 0)),
          damaged_quantity: 0,
          maintenance_quantity: 0,
          inventory_status: (toy.available_quantity || 0) === 0 ? 'OUT_OF_STOCK' as const :
                          (toy.available_quantity || 0) <= lowStockThreshold ? 'LOW_STOCK' as const :
                          (toy.available_quantity || 0) <= 10 ? 'MEDIUM_STOCK' as const : 'GOOD_STOCK' as const,
          reorder_threshold: lowStockThreshold,
          needs_restocking: (toy.available_quantity || 0) <= lowStockThreshold,
        }));

        // If no real alerts, create calculated ones
        if (inventoryAlerts.length === 0) {
          inventoryAlerts = toys
            .filter(toy => (toy.available_quantity || 0) <= lowStockThreshold)
            .map(toy => ({
              id: `calc-${toy.id}`,
              toy_id: toy.id,
              alert_type: (toy.available_quantity || 0) === 0 ? 'out_of_stock' : 'low_stock',
              alert_severity: (toy.available_quantity || 0) === 0 ? 'critical' as const : 'high' as const,
              message: (toy.available_quantity || 0) === 0 
                ? `${toy.name} is out of stock` 
                : `${toy.name} is low on stock (${toy.available_quantity} remaining)`,
              threshold_value: lowStockThreshold,
              current_value: toy.available_quantity || 0,
              created_at: new Date().toISOString(),
              toy: {
                name: toy.name,
                category: toy.category || 'Uncategorized',
                available_quantity: toy.available_quantity || 0,
              }
            }));
        }

        const inventorySummary: InventorySummary = {
          total_toys: totalToys,
          total_inventory: totalInventory,
          total_available: totalAvailable,
          total_reserved: 0,
          total_rented: totalInventory - totalAvailable,
          low_stock_toys: lowStockToys,
          out_of_stock_toys: outOfStockToys,
          medium_stock_toys: mediumStockToys,
          good_stock_toys: goodStockToys,
        };

        console.log('✅ Inventory dashboard data loaded successfully:', {
          totalToys,
          totalInventory,
          totalAvailable,
          lowStockToys,
          outOfStockToys,
          alertsCount: inventoryAlerts.length,
          movementsCount: recentMovements.length
        });

        return {
          inventoryStatus,
          inventoryAlerts,
          recentMovements,
          inventorySummary,
        };

      } catch (error) {
        console.error('❌ Error fetching inventory dashboard:', error);
        throw new Error(`Failed to load inventory data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2, // Reduce retry attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Cap at 10 seconds
  });
};

/**
 * Real low stock toys query
 */
export const useLowStockToys = (threshold: number = 3) => {
  return useQuery({
    queryKey: ['low-stock-toys', threshold],
    queryFn: async () => {
      console.log(`🔄 Fetching toys with stock <= ${threshold}...`);
      
      const { data: toys, error } = await supabase
        .from('toys')
        .select('*')
        .lte('available_quantity', threshold)
        .gt('available_quantity', 0) // Exclude completely out of stock
        .order('available_quantity', { ascending: true });

      if (error) throw error;
      
      console.log(`✅ Found ${toys?.length || 0} low stock toys`);
      return toys || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * IMPROVED Record inventory movement with better error handling
 */
export const useRecordInventoryMovement = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      toyId: string;
      movementType: string;
      quantityChange: number;
      movementReason: string;
      notes: string;
    }) => {
      console.log('🔄 Recording inventory movement:', params);
      
      try {
        // Get current toy data
        const { data: toy, error: toyError } = await supabase
          .from('toys')
          .select('id, name, available_quantity, total_quantity')
          .eq('id', params.toyId)
          .single();

        if (toyError) {
          console.error('❌ Error fetching toy:', toyError);
          throw new Error(`Toy not found: ${toyError.message}`);
        }

        if (!toy) {
          throw new Error('Toy not found');
        }

        // Calculate new quantities
        const currentAvailable = toy.available_quantity || 0;
        const newAvailable = Math.max(0, currentAvailable + params.quantityChange);
        const newTotal = params.movementType === 'RESTOCK' 
          ? Math.max(newAvailable, (toy.total_quantity || 0) + Math.max(0, params.quantityChange))
          : Math.max(newAvailable, toy.total_quantity || 0);

        // Update the toy quantities
        const { error: updateError } = await supabase
          .from('toys')
          .update({
            available_quantity: newAvailable,
            total_quantity: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.toyId);

        if (updateError) {
          console.error('❌ Error updating toy quantities:', updateError);
          throw new Error(`Failed to update inventory: ${updateError.message}`);
        }

        // Try to log the movement (optional - don't fail if table doesn't exist)
        try {
          const { error: logError } = await supabase
            .from('inventory_movements')
            .insert({
              toy_id: params.toyId,
              movement_type: params.movementType,
              quantity_change: Math.abs(params.quantityChange),
              reference_type: 'manual_adjustment',
              reference_id: params.toyId,
              notes: params.notes,
              created_by: 'admin'
            });

          if (logError) {
            console.warn('⚠️ Could not log inventory movement:', logError);
          } else {
            console.log('✅ Inventory movement logged successfully');
          }
        } catch (logError) {
          console.warn('⚠️ Error logging inventory movement:', logError);
        }

        console.log('✅ Inventory movement recorded successfully');
        return {
          success: true,
          toyName: toy.name,
          previousAvailable: currentAvailable,
          newAvailable,
          change: params.quantityChange
        };

      } catch (error) {
        console.error('❌ Error recording inventory movement:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-toys'] });
    },
  });
};

/**
 * Manually triggers the synchronization of all toy inventory to age-specific tables.
 * This is useful if the automatic trigger fails or for periodic reconciliation.
 */
export const useSyncAllInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('🔄 Triggering full inventory sync...');
      
      const { data, error } = await supabase.rpc('sync_all_toy_inventory_to_age_tables');

      if (error) {
        console.error('❌ Error syncing all inventory:', error);
        throw new Error(`Failed to sync all inventory: ${error.message}`);
      }

      console.log('✅ Full inventory sync completed successfully.');
      console.log('Sync results:', data);

      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      // You may also want to invalidate queries for toy lists if they are displayed elsewhere
      // queryClient.invalidateQueries({ queryKey: ['allToys'] });

      return data;
    },
    onSuccess: () => {
      // You can add a success notification here, e.g., using a toast library.
      // For example: toast.success('Inventory sync completed successfully!');
    },
    onError: (error) => {
      console.error('❌ Full inventory sync mutation error:', error.message);
      // You can add user-facing error notifications here
      // For example: toast.error(`Sync failed: ${error.message}`);
    }
  });
};

/**
 * Real bulk inventory adjustment
 */
export const useBulkInventoryAdjustment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (adjustments: Array<{
      toyId: string;
      quantityChange: number;
      reason: string;
      notes?: string;
    }>) => {
      console.log('🔄 Processing bulk inventory adjustments:', adjustments.length);
      
      const results = [];
      
      for (const adjustment of adjustments) {
        try {
          // Get current toy data
          const { data: toy, error: toyError } = await supabase
            .from('toys')
            .select('available_quantity, total_quantity, name')
            .eq('id', adjustment.toyId)
            .single();

          if (toyError) throw toyError;
          if (!toy) continue;

          // Calculate new quantities
          const currentAvailable = toy.available_quantity || 0;
          const newAvailable = Math.max(0, currentAvailable + adjustment.quantityChange);
          const newTotal = adjustment.reason === 'RESTOCK' 
            ? (toy.total_quantity || 0) + Math.max(0, adjustment.quantityChange)
            : toy.total_quantity || 0;

          // Update the toy
          const { data: updatedToy, error: updateError } = await supabase
            .from('toys')
            .update({
              available_quantity: newAvailable,
              total_quantity: newTotal,
            })
            .eq('id', adjustment.toyId)
            .select()
            .single();

          if (updateError) throw updateError;

          results.push({
            toyId: adjustment.toyId,
            toyName: toy.name,
            previousAvailable: currentAvailable,
            newAvailable,
            change: adjustment.quantityChange,
            success: true,
          });

        } catch (error) {
          console.error(`❌ Error adjusting ${adjustment.toyId}:`, error);
          results.push({
            toyId: adjustment.toyId,
            error: error.message,
            success: false,
          });
        }
      }
      
      console.log('✅ Bulk adjustment completed:', results);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-toys'] });
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Real toy inventory movements query (placeholder for when you have a movements table)
 */
export const useToyInventoryMovements = (toyId?: string) => {
  return useQuery({
    queryKey: ['toy-inventory-movements', toyId],
    queryFn: async () => {
      // For now, return empty array since we don't have a movements table yet
      // In the future, this would query a dedicated inventory_movements table
      return [];
    },
    enabled: !!toyId,
  });
};

/**
 * Real toy inventory status query
 */
export const useToyInventoryStatus = (toyId: string) => {
  return useQuery({
    queryKey: ['toy-inventory-status', toyId],
    queryFn: async () => {
      console.log('🔄 Fetching toy inventory status for:', toyId);
      
      const { data: toy, error } = await supabase
        .from('toys')
        .select('*')
        .eq('id', toyId)
        .single();

      if (error) throw error;
      if (!toy) return null;

      const available = toy.available_quantity || 0;
      const total = toy.total_quantity || 0;
      const rented = Math.max(0, total - available);
      
      const lowStockThreshold = 3;
      const status = available === 0 ? 'OUT_OF_STOCK' :
                   available <= lowStockThreshold ? 'LOW_STOCK' :
                   available <= 10 ? 'MEDIUM_STOCK' : 'GOOD_STOCK';

      return {
        toy_id: toy.id,
        toy_name: toy.name,
        category: toy.category || 'Uncategorized',
        age_range: toy.age_range || 'All Ages',
        total_quantity: total,
        available_quantity: available,
        reserved_quantity: 0,
        rented_quantity: rented,
        damaged_quantity: 0,
        maintenance_quantity: 0,
        inventory_status: status,
        reorder_threshold: lowStockThreshold,
        needs_restocking: available <= lowStockThreshold,
      };
    },
    enabled: !!toyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Real currently rented toys query - fetches from rental_orders table
 */
export const useCurrentlyRentedToys = () => {
  const queryClient = useQueryClient();

  // Set up real-time subscription for rental_orders changes
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for rental orders...');
    
    const channel = supabase
      .channel('rental-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_orders'
        },
        (payload) => {
          console.log('🏠 Rental order changed:', payload);
          // Invalidate currently rented toys query to refetch fresh data
          queryClient.invalidateQueries({ queryKey: ['currently-rented-toys'] });
          queryClient.invalidateQueries({ queryKey: ['rental-summary'] });
          queryClient.invalidateQueries({ queryKey: ['overdue-rentals'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up rental orders subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['currently-rented-toys'],
    queryFn: async () => {
      console.log('🔄 Fetching currently rented toys from rental_orders...');
      
      try {
        // Get active rental orders that have toys with customers
        const { data: rentalOrders, error: ordersError } = await supabase
          .from('rental_orders')
          .select(`
            id,
            order_number,
            user_id,
            status,
            rental_start_date,
            rental_end_date,
            toys_data,
            created_at,
            cycle_number
          `)
          .in('status', ['shipped', 'delivered', 'confirmed']) // Orders with toys at customer
          .order('rental_start_date', { ascending: false })
          .limit(1000); // Explicit high limit to ensure we get all data

        if (ordersError) throw ordersError;

        // Get user information for all rental orders
        const userIds = [...new Set(rentalOrders?.map(order => order.user_id))];
        const { data: users, error: usersError } = await supabase
          .from('custom_users')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);

        if (usersError) throw usersError;

        // Create user lookup map
        const userMap = new Map();
        users?.forEach(user => {
          userMap.set(user.id, {
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
            phone: user.phone || 'N/A'
          });
        });

        // Get all toy IDs from the rental orders
        const allToyIds = new Set<string>();
        rentalOrders?.forEach(order => {
          if (Array.isArray(order.toys_data)) {
            order.toys_data.forEach((toy: any) => {
              if (toy.toy_id && !toy.returned) {
                allToyIds.add(toy.toy_id);
              }
            });
          }
        });

        // Fetch toy details
        const { data: toys, error: toysError } = await supabase
          .from('toys')
          .select('id, name, category, image_url')
          .in('id', Array.from(allToyIds));

        if (toysError) throw toysError;

        // Create toy lookup map
        const toyMap = new Map();
        toys?.forEach(toy => {
          toyMap.set(toy.id, toy);
        });

        // Process rental orders to create currently rented toys list
        const currentlyRented: CurrentlyRentedToy[] = [];

        rentalOrders?.forEach(order => {
          const user = userMap.get(order.user_id);
          
          if (Array.isArray(order.toys_data)) {
            order.toys_data.forEach((toyData: any) => {
              // Only include toys that haven't been returned
              if (!toyData.returned && toyData.toy_id) {
                const toy = toyMap.get(toyData.toy_id);
                if (toy) {
                  const rentalStartDate = order.rental_start_date || order.created_at;
                  const rentalEndDate = order.rental_end_date || 
                    new Date(new Date(rentalStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
                  
                  const daysRented = Math.floor(
                    (new Date().getTime() - new Date(rentalStartDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  const daysOverdue = Math.max(0, Math.floor(
                    (new Date().getTime() - new Date(rentalEndDate).getTime()) / (1000 * 60 * 60 * 24)
                  ));

                  currentlyRented.push({
                    rental_order_id: order.id,
                    order_number: order.order_number || `ORDER-${order.id.slice(0, 8)}`,
                    toy_id: toy.id,
                    toy_name: toy.name,
                    toy_category: toy.category || 'Uncategorized',
                    user_id: order.user_id,
                    user_name: user?.name || 'Unknown Customer',
                    user_phone: user?.phone || 'N/A',
                    rental_start_date: rentalStartDate,
                    rental_end_date: rentalEndDate,
                    expected_return_date: rentalEndDate,
                    days_rented: Math.max(1, daysRented),
                    days_overdue: daysOverdue,
                    status: daysOverdue > 0 ? 'overdue' : 'active',
                    return_status: 'not_returned',
                    quantity_rented: toyData.quantity || 1,
                  });
                }
              }
            });
          }
        });

        console.log(`✅ Found ${currentlyRented.length} currently rented toys from ${rentalOrders?.length || 0} orders`);
        return currentlyRented;

      } catch (error) {
        console.error('❌ Error fetching currently rented toys:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

/**
 * Real rental summary query - calculates from rental_orders data
 */
export const useRentalSummary = () => {
  return useQuery({
    queryKey: ['rental-summary'],
    queryFn: async () => {
      console.log('🔄 Calculating rental summary from rental orders...');
      
      try {
        // Get all rental orders with their status and dates
        const { data: rentalOrders, error } = await supabase
          .from('rental_orders')
          .select('id, status, toys_data, rental_start_date, rental_end_date, created_at')
          .in('status', ['shipped', 'delivered', 'confirmed']); // Only orders with toys at customer

        if (error) throw error;

        let totalRentedToys = 0;
        let totalActiveRentals = 0;
        let overdueRentals = 0;
        let toysDueToday = 0;
        let toysDueThisWeek = 0;
        let totalRentalDays = 0;
        let rentalCount = 0;
        let longestRentalDays = 0;

        const today = new Date();
        const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        rentalOrders?.forEach(order => {
          if (Array.isArray(order.toys_data)) {
            let hasActiveRentals = false;
            
            order.toys_data.forEach((toyData: any) => {
              if (!toyData.returned && toyData.toy_id) {
                totalRentedToys += toyData.quantity || 1;
                hasActiveRentals = true;

                const rentalEndDate = order.rental_end_date ? new Date(order.rental_end_date) : null;
                const rentalStartDate = order.rental_start_date ? new Date(order.rental_start_date) : new Date(order.created_at);

                if (rentalEndDate) {
                  // Check if overdue
                  if (rentalEndDate < today) {
                    overdueRentals++;
                  }

                  // Check if due today
                  if (rentalEndDate.toDateString() === today.toDateString()) {
                    toysDueToday++;
                  }

                  // Check if due this week
                  if (rentalEndDate <= oneWeekFromNow && rentalEndDate >= today) {
                    toysDueThisWeek++;
                  }
                }

                // Calculate rental duration
                const rentalDays = Math.floor(
                  (today.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                totalRentalDays += Math.max(1, rentalDays);
                longestRentalDays = Math.max(longestRentalDays, rentalDays);
                rentalCount++;
              }
            });

            if (hasActiveRentals) {
              totalActiveRentals++;
            }
          }
        });

        const averageRentalDays = rentalCount > 0 ? Math.round(totalRentalDays / rentalCount) : 0;

        const summary = {
          total_rented_toys: totalRentedToys,
          total_active_rentals: totalActiveRentals,
          overdue_rentals: overdueRentals,
          toys_due_today: toysDueToday,
          toys_due_this_week: toysDueThisWeek,
          average_rental_days: averageRentalDays,
          longest_rental_days: longestRentalDays,
        };

        console.log('✅ Rental summary calculated:', summary);
        return summary;

      } catch (error) {
        console.error('❌ Error calculating rental summary:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  });
};

/**
 * Overdue rentals query - fetches rentals past their due date
 */
export const useOverdueRentals = () => {
  return useQuery({
    queryKey: ['overdue-rentals'],
    queryFn: async () => {
      console.log('🔄 Fetching overdue rentals...');
      
      try {
        const today = new Date().toISOString();
        
        // Get rental orders that are past their due date
        const { data: rentalOrders, error: ordersError } = await supabase
          .from('rental_orders')
          .select(`
            id,
            order_number,
            user_id,
            status,
            rental_start_date,
            rental_end_date,
            toys_data,
            created_at
          `)
          .in('status', ['shipped', 'delivered', 'confirmed'])
          .lt('rental_end_date', today) // Past due date
          .order('rental_end_date', { ascending: true }); // Oldest overdue first

        if (ordersError) throw ordersError;

        // Get user information
        const userIds = [...new Set(rentalOrders?.map(order => order.user_id))];
        const { data: users, error: usersError } = await supabase
          .from('custom_users')
          .select('id, first_name, last_name, phone')
          .in('id', userIds);

        if (usersError) throw usersError;

        // Create user lookup map
        const userMap = new Map();
        users?.forEach(user => {
          userMap.set(user.id, {
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
            phone: user.phone || 'N/A'
          });
        });

        // Get all toy IDs from overdue orders
        const allToyIds = new Set<string>();
        rentalOrders?.forEach(order => {
          if (Array.isArray(order.toys_data)) {
            order.toys_data.forEach((toy: any) => {
              if (toy.toy_id && !toy.returned) {
                allToyIds.add(toy.toy_id);
              }
            });
          }
        });

        // Fetch toy details
        const { data: toys, error: toysError } = await supabase
          .from('toys')
          .select('id, name, category, image_url')
          .in('id', Array.from(allToyIds));

        if (toysError) throw toysError;

        // Create toy lookup map
        const toyMap = new Map();
        toys?.forEach(toy => {
          toyMap.set(toy.id, toy);
        });

        // Process overdue rentals
        const overdueRentals: CurrentlyRentedToy[] = [];

        rentalOrders?.forEach(order => {
          const user = userMap.get(order.user_id);
          
          if (Array.isArray(order.toys_data)) {
            order.toys_data.forEach((toyData: any) => {
              if (!toyData.returned && toyData.toy_id) {
                const toy = toyMap.get(toyData.toy_id);
                if (toy) {
                  const rentalStartDate = order.rental_start_date || order.created_at;
                  const rentalEndDate = order.rental_end_date || 
                    new Date(new Date(rentalStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
                  
                  const daysRented = Math.floor(
                    (new Date().getTime() - new Date(rentalStartDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  const daysOverdue = Math.max(0, Math.floor(
                    (new Date().getTime() - new Date(rentalEndDate).getTime()) / (1000 * 60 * 60 * 24)
                  ));

                  // Only include if actually overdue
                  if (daysOverdue > 0) {
                    overdueRentals.push({
                      rental_order_id: order.id,
                      order_number: order.order_number || `ORDER-${order.id.slice(0, 8)}`,
                      toy_id: toy.id,
                      toy_name: toy.name,
                      toy_category: toy.category || 'Uncategorized',
                      user_id: order.user_id,
                      user_name: user?.name || 'Unknown Customer',
                      user_phone: user?.phone || 'N/A',
                      rental_start_date: rentalStartDate,
                      rental_end_date: rentalEndDate,
                      expected_return_date: rentalEndDate,
                      days_rented: Math.max(1, daysRented),
                      days_overdue: daysOverdue,
                      status: 'overdue',
                      return_status: 'not_returned',
                      quantity_rented: toyData.quantity || 1,
                    });
                  }
                }
              }
            });
          }
        });

        // Sort by days overdue (most overdue first)
        overdueRentals.sort((a, b) => b.days_overdue - a.days_overdue);

        console.log(`✅ Found ${overdueRentals.length} overdue rentals`);
        return overdueRentals;

      } catch (error) {
        console.error('❌ Error fetching overdue rentals:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
  });
};

/**
 * Sync age table inventory (simplified)
 */
export const useSyncAgeTableInventory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyId: string) => {
      console.log('🔄 Syncing age table inventory for toy:', toyId);
      // This would sync inventory data between main toys table and age-specific tables
      // For now, just return success
      return { toy_id: toyId, status: 'synced' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    },
  });
};

/**
 * Hook to restore a deleted toy
 */
export const useRestoreToy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (toyId: string) => {
      console.log('🔄 RESTORE operation for toy:', toyId);
      
      // Restore by setting inventory_status back to 'active' and giving it some stock
      const { data, error } = await supabase
        .from('toys')
        .update({ 
          inventory_status: 'active',
          total_quantity: 1,
          available_quantity: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', toyId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Restore toy error:', error);
        throw error;
      }
      
      console.log('✅ Toy restored:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

// ========================================
// COMPATIBILITY INTERFACES (keep for other components that might reference them)
// ========================================

export interface ComprehensiveInventoryStatus {
  toy_id: string;
  toy_name: string;
  category: string;
  age_range: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  rented_quantity: number;
  damaged_quantity: number;
  maintenance_quantity: number;
  inventory_status: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'MEDIUM_STOCK' | 'GOOD_STOCK';
  reorder_threshold: number;
  needs_restocking: boolean;
}

export interface InventoryMovement {
  id: string;
  toy_id: string; // This could be from a separate movements table, keeping as is
  movement_type: string;
  quantity_change: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  toys?: {
    name: string;
    category: string;
  };
  previous_available?: number;
  new_available?: number;
}

export interface InventoryAlert {
  id: string;
  toy_id?: string;
  alert_type: string;
  alert_severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  threshold_value?: number;
  current_value?: number;
  created_at: string;
  resolved_at?: string;
  toy?: {
    name: string;
    category: string;
    available_quantity: number;
  };
}

export interface InventorySummary {
  total_toys: number;
  total_inventory: number;
  total_available: number;
  total_reserved: number;
  total_rented: number;
  low_stock_toys: number;
  out_of_stock_toys: number;
  medium_stock_toys: number;
  good_stock_toys: number;
}

export interface CurrentlyRentedToy {
  rental_order_id: string;
  order_number: string;
  toy_id: string;
  toy_name: string;
  toy_category: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  rental_start_date: string;
  rental_end_date: string;
  expected_return_date: string;
  days_rented: number;
  days_overdue: number;
  status: 'active' | 'overdue' | 'damaged' | 'lost';
  return_status: 'not_returned' | 'partial' | 'complete' | 'lost' | 'damaged';
  delivery_date?: string;
  quantity_rented: number;
}

export interface RentalSummary {
  total_rented_toys: number;
  total_active_rentals: number;
  overdue_rentals: number;
  toys_due_today: number;
  toys_due_this_week: number;
  average_rental_days: number;
  longest_rental_days: number;
} 

// ========================================
// TOY IMAGES HOOKS
// ========================================

/**
 * Hook to fetch images for a specific toy
 */
export const useToyImages = (toyId: string) => {
  return useQuery({
    queryKey: ['toy-images', toyId],
    queryFn: async (): Promise<ToyImage[]> => {
      if (!toyId) return [];
      
      const { data, error } = await supabase
        .from('toy_images')
        .select('*')
        .eq('toy_id', toyId)
        .order('display_order');

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching toy images:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!toyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get primary image for a toy
 */
export const useToyPrimaryImage = (toyId: string) => {
  return useQuery({
    queryKey: ['toy-primary-image', toyId],
    queryFn: async (): Promise<string | null> => {
      if (!toyId) return null;
      
      const { data, error } = await supabase
        .from('toy_images')
        .select('image_url')
        .eq('toy_id', toyId)
        .eq('is_primary', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        // If no primary image found, get the first image
        const { data: firstImage } = await supabase
          .from('toy_images')
          .select('image_url')
          .eq('toy_id', toyId)
          .order('display_order')
          .limit(1)
          .single();
        
        return firstImage?.image_url || null;
      }

      return data?.image_url || null;
    },
    enabled: !!toyId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to save toy images (replaces all existing images) - Admin via Edge Function.
 */
export const useSaveToyImages = () => {
  const queryClient = useQueryClient();
  const { user } = useCustomAuth();

  return useMutation({
    mutationFn: async ({ toyId, images, primaryImageIndex = 0 }: {
      toyId: string;
      images: string[];
      primaryImageIndex?: number;
    }) => {
      if (!user?.id) throw new Error('Admin login required');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-save-toy-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'X-Admin-User-Id': user.id,
        },
        body: JSON.stringify({ toyId, images, primaryImageIndex }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.error || res.statusText;
        throw new Error(typeof msg === 'string' ? msg : 'Failed to save toy images');
      }
      return json;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['toy-images', variables.toyId] });
      queryClient.invalidateQueries({ queryKey: ['toy-primary-image', variables.toyId] });
      queryClient.invalidateQueries({ queryKey: ['toys'] });
      queryClient.invalidateQueries({ queryKey: ['search-toys'] });
    },
  });
};

/**
 * Hook to delete a single toy image
 */
export const useDeleteToyImage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await supabase
        .from('toy_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toy-images'] });
      queryClient.invalidateQueries({ queryKey: ['toy-primary-image'] });
    },
  });
}; 

/**
 * DIAGNOSTIC: Hook to compare toy counts between different systems
 */
export const useToyCountDiagnostic = () => {
  return useQuery({
    queryKey: ['toy-count-diagnostic'],
    queryFn: async () => {
      console.log('🔍 DIAGNOSTIC: Comparing toy counts across different queries...');
      
      // 1. Total toys in database (what inventory management sees)
      const { data: allToysRaw, error: allError } = await supabase
        .from('toys')
        .select('id, name, category, retail_price')
        .order('name');

      if (allError) {
        console.error('❌ Error in diagnostic query:', allError);
        throw allError;
      }

      // 2. What toys page query sees (excludes ride-on toys)
      const { data: toysPageQuery, error: pageError } = await supabase
        .from('toys')
        .select('id, name, category, retail_price')
        .neq('category', 'ride_on_toys')
        .order('name');

      if (pageError) {
        console.error('❌ Error in toys page query:', pageError);
        throw pageError;
      }

      // 3. Ride-on toys count
      const { data: rideOnToys, error: rideOnError } = await supabase
        .from('toys')
        .select('id, name, category, retail_price')
        .eq('category', 'ride_on_toys')
        .order('name');

      if (rideOnError) {
        console.error('❌ Error in ride-on query:', rideOnError);
        throw rideOnError;
      }

      // 4. Check for migrated toys (₹100 pricing, plan names)
      const migratedToys = (allToysRaw || []).filter(toy => {
        const hasPlansInName = toy.name?.toLowerCase().includes('plan') || 
                              toy.name?.toLowerCase().includes('month');
        const hasDummyPricing = toy.retail_price === 100;
        return hasPlansInName || hasDummyPricing;
      });

      // 5. Check for toys with null/empty categories
      const toysWithoutCategory = (allToysRaw || []).filter(toy => !toy.category || toy.category.trim() === '');

      const results = {
        totalInDatabase: allToysRaw?.length || 0,
        toysPageQuery: toysPageQuery?.length || 0,
        rideOnToys: rideOnToys?.length || 0,
        migratedToys: migratedToys.length,
        toysWithoutCategory: toysWithoutCategory.length,
        expectedTotal: (toysPageQuery?.length || 0) + (rideOnToys?.length || 0),
        discrepancy: (allToysRaw?.length || 0) - ((toysPageQuery?.length || 0) + (rideOnToys?.length || 0))
      };

      console.log('🔍 DIAGNOSTIC RESULTS:', results);
      
      // Log some examples of migrated toys if found
      if (migratedToys.length > 0) {
        console.log('📦 Sample migrated toys:', migratedToys.slice(0, 5).map(t => ({ name: t.name, price: t.retail_price })));
      }
      
      // Log toys without categories if found
      if (toysWithoutCategory.length > 0) {
        console.log('❓ Toys without categories:', toysWithoutCategory.slice(0, 5).map(t => ({ name: t.name, category: t.category })));
      }

      return results;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}; 