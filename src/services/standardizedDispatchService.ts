/**
 * Standardized Dispatch Service
 * Implements UUID-based individual toy tracking for complete dispatch management
 * Replaces fragmented dispatch implementations with unified approach
 */

import { supabase } from '@/integrations/supabase/client';

// ========================================
// STANDARDIZED TYPES
// ========================================

export interface StandardizedDispatchOrder {
  id: string;
  originalOrderId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: any;
  subscriptionPlan?: string;
  dispatchDate?: string;
  expectedReturnDate?: string;
  trackingNumber?: string;
  dispatchNotes?: string;
  status: 'pending' | 'dispatched' | 'in_transit' | 'delivered' | 'returned' | 'overdue';
  createdAt: string;
  updatedAt: string;
  // Associated toy UUIDs
  toyUUIDs?: ToyDispatchUUID[];
}

export interface ToyDispatchUUID {
  id: string;
  dispatchOrderId: string;
  toyId: string;
  toyName: string;
  toyBrand?: string;
  uuidCode: string; // 10-digit alphanumeric
  barcodePrinted: boolean;
  barcodePrintedAt?: string;
  conditionOnDispatch: 'excellent' | 'good' | 'fair' | 'damaged';
  conditionOnReturn?: 'excellent' | 'good' | 'fair' | 'damaged';
  returnDate?: string;
  damageNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BarcodeBatch {
  id: string;
  dispatchOrderId: string;
  batchName: string;
  totalBarcodes: number;
  printedAt: string;
  printedBy?: string;
  batchStatus: 'pending' | 'printed' | 'applied';
  createdAt: string;
}

export interface DispatchOrderDetails {
  dispatchOrder: StandardizedDispatchOrder;
  toyUUIDs: ToyDispatchUUID[];
  totalToys: number;
  printedBarcodes: number;
  returnedToys: number;
}

// ========================================
// STANDARDIZED DISPATCH SERVICE
// ========================================

export class StandardizedDispatchService {
  /**
   * Create a new dispatch order with automatic UUID generation for toys
   */
  static async createDispatchOrder(params: {
    originalOrderId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    shippingAddress?: any;
    subscriptionPlan?: string;
    expectedReturnDate?: string;
    dispatchNotes?: string;
  }): Promise<{
    success: boolean;
    dispatchOrderId?: string;
    toyUUIDs?: Array<{
      toyUUID: string;
      toyName: string;
      toyBrand?: string;
    }>;
    error?: string;
  }> {
    try {
      console.log('🔄 Creating dispatch order with UUIDs:', params);

      // Use the database function to create dispatch order with UUIDs
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT * FROM create_dispatch_order_with_uuids(
              '${params.originalOrderId}'::UUID,
              '${params.customerName}',
              ${params.customerPhone ? `'${params.customerPhone}'` : 'NULL'},
              ${params.customerEmail ? `'${params.customerEmail}'` : 'NULL'},
              ${params.shippingAddress ? `'${JSON.stringify(params.shippingAddress)}'::JSONB` : 'NULL'},
              ${params.subscriptionPlan ? `'${params.subscriptionPlan}'` : 'NULL'},
              ${params.expectedReturnDate ? `'${params.expectedReturnDate}'::DATE` : 'NULL'},
              ${params.dispatchNotes ? `'${params.dispatchNotes}'` : 'NULL'}
            );
          `
        });

      if (error) {
        console.error('❌ Database error creating dispatch order:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'No toys found in order or failed to create dispatch order'
        };
      }

      const dispatchOrderId = data[0].dispatch_order_id;
      const toyUUIDs = data.map((item: any) => ({
        toyUUID: item.toy_uuid_code,
        toyName: item.toy_name,
        toyBrand: item.toy_brand
      }));

      console.log('✅ Created dispatch order successfully:', { dispatchOrderId, toyCount: toyUUIDs.length });
      return {
        success: true,
        dispatchOrderId,
        toyUUIDs
      };
    } catch (error: any) {
      console.error('💥 Failed to create dispatch order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all pending dispatch orders
   */
  static async getPendingDispatchOrders(): Promise<StandardizedDispatchOrder[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('dispatch_orders')
        .select(`
          id, original_order_id, customer_name, customer_phone, customer_email,
          shipping_address, subscription_plan, dispatch_date, expected_return_date,
          tracking_number, dispatch_notes, status, created_at, updated_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending dispatch orders:', error);
        return [];
      }

      return (data || []).map(this.mapDispatchOrderFromDB);
    } catch (error) {
      console.error('Failed to fetch pending dispatch orders:', error);
      return [];
    }
  }

  /**
   * Get dispatch order details with all toy UUIDs
   */
  static async getDispatchOrderDetails(dispatchOrderId: string): Promise<DispatchOrderDetails | null> {
    try {
      // Get dispatch order details using the database function
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `SELECT * FROM get_dispatch_order_details('${dispatchOrderId}'::UUID);`
        });

      if (error) {
        console.error('Error fetching dispatch order details:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Group the data by dispatch order
      const firstRow = data[0];
      const dispatchOrder: StandardizedDispatchOrder = {
        id: firstRow.dispatch_order_id,
        originalOrderId: firstRow.original_order_id,
        customerName: firstRow.customer_name,
        customerPhone: firstRow.customer_phone,
        status: firstRow.status,
        dispatchDate: firstRow.dispatch_date,
        trackingNumber: firstRow.tracking_number,
        createdAt: firstRow.created_at || new Date().toISOString(),
        updatedAt: firstRow.updated_at || new Date().toISOString()
      };

      const toyUUIDs: ToyDispatchUUID[] = data
        .filter((row: any) => row.toy_uuid_code) // Only rows with toy UUIDs
        .map((row: any) => ({
          id: row.toy_uuid_code, // Using UUID code as ID for simplicity
          dispatchOrderId: row.dispatch_order_id,
          toyId: '', // Would need to be fetched separately if needed
          toyName: row.toy_name,
          toyBrand: row.toy_brand,
          uuidCode: row.toy_uuid_code,
          barcodePrinted: row.barcode_printed,
          conditionOnDispatch: 'good' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

      return {
        dispatchOrder,
        toyUUIDs,
        totalToys: toyUUIDs.length,
        printedBarcodes: toyUUIDs.filter(t => t.barcodePrinted).length,
        returnedToys: toyUUIDs.filter(t => t.conditionOnReturn).length
      };
    } catch (error) {
      console.error('Failed to fetch dispatch order details:', error);
      return null;
    }
  }

  /**
   * Mark dispatch order as dispatched
   */
  static async confirmDispatchOrder(
    dispatchOrderId: string,
    trackingNumber?: string,
    dispatchNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚚 Confirming dispatch order:', { dispatchOrderId, trackingNumber });

      // Use the database function to confirm dispatch
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT confirm_dispatch_order(
              '${dispatchOrderId}'::UUID,
              ${trackingNumber ? `'${trackingNumber}'` : 'NULL'},
              ${dispatchNotes ? `'${dispatchNotes}'` : 'NULL'}
            ) as success;
          `
        });

      if (error) {
        console.error('❌ Database error confirming dispatch:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const success = data && data[0]?.success;
      if (!success) {
        return {
          success: false,
          error: 'Failed to confirm dispatch order'
        };
      }

      console.log('✅ Dispatch order confirmed successfully');
      return { success: true };
    } catch (error: any) {
      console.error('💥 Failed to confirm dispatch order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create and print barcode batch for dispatch order
   */
  static async createBarcodeBatch(
    dispatchOrderId: string,
    batchName?: string,
    printedBy?: string
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    try {
      console.log('🏷️ Creating barcode batch for dispatch order:', dispatchOrderId);

      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT create_barcode_batch(
              '${dispatchOrderId}'::UUID,
              ${batchName ? `'${batchName}'` : 'NULL'},
              ${printedBy ? `'${printedBy}'` : 'NULL'}
            ) as batch_id;
          `
        });

      if (error) {
        console.error('❌ Database error creating barcode batch:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const batchId = data && data[0]?.batch_id;
      if (!batchId) {
        return {
          success: false,
          error: 'Failed to create barcode batch'
        };
      }

      console.log('✅ Barcode batch created successfully:', batchId);
      return {
        success: true,
        batchId
      };
    } catch (error: any) {
      console.error('💥 Failed to create barcode batch:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search for toy by UUID code
   */
  static async searchByUUID(uuidCode: string): Promise<{
    success: boolean;
    toyInfo?: {
      dispatchOrderId: string;
      originalOrderId: string;
      customerName: string;
      customerPhone: string;
      toyName: string;
      toyBrand: string;
      dispatchDate: string;
      status: string;
      conditionOnDispatch: string;
      conditionOnReturn?: string;
    };
    error?: string;
  }> {
    try {
      console.log('🔍 Searching for toy by UUID:', uuidCode);

      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `SELECT * FROM search_by_uuid('${uuidCode}');`
        });

      if (error) {
        console.error('❌ Database error searching by UUID:', error);
        return {
          success: false,
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          error: 'Toy not found with this UUID code'
        };
      }

      const result = data[0];
      console.log('✅ Found toy by UUID:', result);
      return {
        success: true,
        toyInfo: {
          dispatchOrderId: result.dispatch_order_id,
          originalOrderId: result.original_order_id,
          customerName: result.customer_name,
          customerPhone: result.customer_phone,
          toyName: result.toy_name,
          toyBrand: result.toy_brand,
          dispatchDate: result.dispatch_date,
          status: result.status,
          conditionOnDispatch: result.condition_on_dispatch,
          conditionOnReturn: result.condition_on_return
        }
      };
    } catch (error: any) {
      console.error('💥 Failed to search by UUID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get overdue returns
   */
  static async getOverdueReturns(): Promise<Array<{
    dispatchOrderId: string;
    customerName: string;
    customerPhone: string;
    dispatchDate: string;
    expectedReturnDate: string;
    overdueBy: number; // days
    totalToys: number;
    status: string;
  }>> {
    try {
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT 
              do.id as dispatch_order_id,
              do.customer_name,
              do.customer_phone,
              do.dispatch_date,
              do.expected_return_date,
              CURRENT_DATE - do.expected_return_date as overdue_days,
              COUNT(tdu.id) as total_toys,
              do.status
            FROM dispatch_orders do
            LEFT JOIN toy_dispatch_uuids tdu ON do.id = tdu.dispatch_order_id
            WHERE do.expected_return_date < CURRENT_DATE
              AND do.status IN ('dispatched', 'in_transit', 'delivered')
            GROUP BY do.id, do.customer_name, do.customer_phone, 
                     do.dispatch_date, do.expected_return_date, do.status
            ORDER BY overdue_days DESC;
          `
        });

      if (error) {
        console.error('Error fetching overdue returns:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        dispatchOrderId: item.dispatch_order_id,
        customerName: item.customer_name,
        customerPhone: item.customer_phone || '',
        dispatchDate: item.dispatch_date,
        expectedReturnDate: item.expected_return_date,
        overdueBy: item.overdue_days || 0,
        totalToys: item.total_toys || 0,
        status: item.status
      }));
    } catch (error) {
      console.error('Failed to fetch overdue returns:', error);
      return [];
    }
  }

  /**
   * Update toy condition on return
   */
  static async updateToyReturnCondition(
    uuidCode: string,
    condition: 'excellent' | 'good' | 'fair' | 'damaged',
    damageNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await (supabase as any)
        .from('toy_dispatch_uuids')
        .update({
          condition_on_return: condition,
          return_date: new Date().toISOString(),
          damage_notes: damageNotes,
          updated_at: new Date().toISOString()
        })
        .eq('uuid_code', uuidCode);

      if (error) {
        console.error('Error updating toy return condition:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Failed to update toy return condition:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get dispatch statistics
   */
  static async getDispatchStatistics(): Promise<{
    totalDispatched: number;
    pendingDispatch: number;
    overdueReturns: number;
    returnedToys: number;
    averageReturnTime: number; // days
  }> {
    try {
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT 
              COUNT(CASE WHEN status = 'dispatched' THEN 1 END) as total_dispatched,
              COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_dispatch,
              COUNT(CASE WHEN status IN ('dispatched', 'in_transit', 'delivered') 
                          AND expected_return_date < CURRENT_DATE THEN 1 END) as overdue_returns,
              COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_toys,
              AVG(CASE WHEN status = 'returned' AND dispatch_date IS NOT NULL AND actual_return_date IS NOT NULL
                       THEN actual_return_date - dispatch_date ELSE NULL END) as avg_return_days
            FROM dispatch_orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
          `
        });

      if (error) {
        console.error('Error fetching dispatch statistics:', error);
        return {
          totalDispatched: 0,
          pendingDispatch: 0,
          overdueReturns: 0,
          returnedToys: 0,
          averageReturnTime: 0
        };
      }

      const stats = data && data[0];
      return {
        totalDispatched: stats?.total_dispatched || 0,
        pendingDispatch: stats?.pending_dispatch || 0,
        overdueReturns: stats?.overdue_returns || 0,
        returnedToys: stats?.returned_toys || 0,
        averageReturnTime: stats?.avg_return_days || 0
      };
    } catch (error) {
      console.error('Failed to fetch dispatch statistics:', error);
      return {
        totalDispatched: 0,
        pendingDispatch: 0,
        overdueReturns: 0,
        returnedToys: 0,
        averageReturnTime: 0
      };
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private static mapDispatchOrderFromDB(dbRow: any): StandardizedDispatchOrder {
    return {
      id: dbRow.id,
      originalOrderId: dbRow.original_order_id,
      customerName: dbRow.customer_name,
      customerPhone: dbRow.customer_phone,
      customerEmail: dbRow.customer_email,
      shippingAddress: dbRow.shipping_address,
      subscriptionPlan: dbRow.subscription_plan,
      dispatchDate: dbRow.dispatch_date,
      expectedReturnDate: dbRow.expected_return_date,
      trackingNumber: dbRow.tracking_number,
      dispatchNotes: dbRow.dispatch_notes,
      status: dbRow.status,
      createdAt: dbRow.created_at,
      updatedAt: dbRow.updated_at
    };
  }
} 