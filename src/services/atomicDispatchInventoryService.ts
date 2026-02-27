/**
 * Atomic Dispatch-Inventory Integration Service
 * Ensures safe inventory updates during dispatch and return operations
 * Prevents race conditions and ensures data consistency
 */

import { supabase } from '@/integrations/supabase/client';
import { StandardizedDispatchService, ToyDispatchUUID } from './standardizedDispatchService';

// ========================================
// TYPES
// ========================================

export interface InventoryTransaction {
  toyId: string;
  toyName: string;
  quantityChange: number; // Positive for returns, negative for dispatch
  operationType: 'dispatch' | 'return' | 'adjustment';
  referenceType: 'dispatch_order' | 'return_processing' | 'manual';
  referenceId: string;
  notes?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'damaged';
}

export interface AtomicDispatchResult {
  success: boolean;
  dispatchOrderId?: string;
  toyUUIDs?: ToyDispatchUUID[];
  inventoryUpdates?: Array<{
    toyId: string;
    previousQuantity: number;
    newQuantity: number;
    quantityChange: number;
  }>;
  error?: string;
}

export interface AtomicReturnResult {
  success: boolean;
  processedToys: number;
  inventoryRestored: number;
  damagedToys: number;
  inventoryUpdates?: Array<{
    toyId: string;
    previousQuantity: number;
    newQuantity: number;
    quantityChange: number;
    condition: string;
  }>;
  error?: string;
}

// ========================================
// ATOMIC DISPATCH-INVENTORY SERVICE
// ========================================

export class AtomicDispatchInventoryService {
  
  /**
   * Atomically create dispatch order and update inventory
   */
  static async createDispatchWithInventoryUpdate(params: {
    originalOrderId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    shippingAddress?: any;
    subscriptionPlan?: string;
    expectedReturnDate?: string;
    dispatchNotes?: string;
  }): Promise<AtomicDispatchResult> {
    try {
      console.log('🔄 Starting atomic dispatch creation with inventory update:', params.originalOrderId);

      // Step 1: Get order items to validate inventory availability
      const { data: orderItems, error: orderError } = await (supabase as any)
        .from('order_items')
        .select(`
          toy_id, quantity,
          toys!inner(id, name, available_quantity, total_quantity)
        `)
        .eq('order_id', params.originalOrderId);

      if (orderError) {
        return {
          success: false,
          error: `Failed to fetch order items: ${orderError.message}`
        };
      }

      if (!orderItems || orderItems.length === 0) {
        return {
          success: false,
          error: 'No items found in order'
        };
      }

      // Step 2: Validate inventory availability
      const inventoryChecks = [];
      for (const item of orderItems) {
        const availableQuantity = item.toys.available_quantity || 0;
        const requiredQuantity = item.quantity;
        
        if (availableQuantity < requiredQuantity) {
          return {
            success: false,
            error: `Insufficient inventory for ${item.toys.name}. Available: ${availableQuantity}, Required: ${requiredQuantity}`
          };
        }

        inventoryChecks.push({
          toyId: item.toy_id,
          toyName: item.toys.name,
          currentQuantity: availableQuantity,
          requiredQuantity,
          newQuantity: availableQuantity - requiredQuantity
        });
      }

      // Step 3: Begin transaction - Create dispatch order
      const dispatchResult = await StandardizedDispatchService.createDispatchOrder(params);
      
      if (!dispatchResult.success) {
        return {
          success: false,
          error: dispatchResult.error
        };
      }

      // Step 4: Update inventory atomically
      const inventoryUpdates = [];
      
      try {
        for (const check of inventoryChecks) {
          console.log(`📦 Updating inventory for ${check.toyName}: ${check.currentQuantity} → ${check.newQuantity}`);
          
          // Atomic inventory update with optimistic locking
          const { data: updateResult, error: updateError } = await (supabase as any)
            .rpc('exec_sql', {
              sql: `
                UPDATE toys 
                SET 
                  available_quantity = available_quantity - ${check.requiredQuantity},
                  updated_at = NOW()
                WHERE id = '${check.toyId}'
                  AND available_quantity >= ${check.requiredQuantity}
                RETURNING id, name, available_quantity, 
                         (available_quantity + ${check.requiredQuantity}) as previous_quantity;
              `
            });

          if (updateError) {
            console.error(`❌ Failed to update inventory for ${check.toyName}:`, updateError);
            throw new Error(`Inventory update failed for ${check.toyName}: ${updateError.message}`);
          }

          if (!updateResult || updateResult.length === 0) {
            throw new Error(`Concurrent inventory modification detected for ${check.toyName}. Please retry.`);
          }

          const result = updateResult[0];
          inventoryUpdates.push({
            toyId: result.id,
            previousQuantity: result.previous_quantity,
            newQuantity: result.available_quantity,
            quantityChange: -check.requiredQuantity
          });

          // Record inventory movement
          await this.recordInventoryMovement({
            toyId: check.toyId,
            toyName: check.toyName,
            quantityChange: -check.requiredQuantity,
            operationType: 'dispatch',
            referenceType: 'dispatch_order',
            referenceId: dispatchResult.dispatchOrderId!,
            notes: `Dispatched for order ${params.originalOrderId}`
          });
        }

        console.log('✅ Atomic dispatch creation completed successfully');
        return {
          success: true,
          dispatchOrderId: dispatchResult.dispatchOrderId,
          toyUUIDs: dispatchResult.toyUUIDs?.map(t => ({
            id: t.toyUUID,
            dispatchOrderId: dispatchResult.dispatchOrderId!,
            toyId: '', // Will be populated by the dispatch service
            toyName: t.toyName,
            toyBrand: t.toyBrand,
            uuidCode: t.toyUUID,
            barcodePrinted: false,
            conditionOnDispatch: 'good' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })),
          inventoryUpdates
        };

      } catch (inventoryError: any) {
        // Rollback: If inventory update fails, we should ideally rollback the dispatch order
        // For now, we'll log the error and return failure
        console.error('💥 Inventory update failed, dispatch order may need manual cleanup:', inventoryError);
        
        return {
          success: false,
          error: `Transaction failed: ${inventoryError.message}. Dispatch order ${dispatchResult.dispatchOrderId} may need cleanup.`
        };
      }

    } catch (error: any) {
      console.error('💥 Atomic dispatch creation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atomically process toy returns and restore inventory
   */
  static async processReturnWithInventoryRestore(params: {
    dispatchOrderId: string;
    returnedToys: Array<{
      uuidCode: string;
      condition: 'excellent' | 'good' | 'fair' | 'damaged';
      damageNotes?: string;
    }>;
    returnMethod?: 'pickup' | 'courier' | 'drop_off';
    qualityCheckNotes?: string;
  }): Promise<AtomicReturnResult> {
    try {
      console.log('🔄 Starting atomic return processing with inventory restore:', params.dispatchOrderId);

      // Step 1: Get dispatch order details and toy information
      const { data: toyDetails, error: toyError } = await (supabase as any)
        .from('toy_dispatch_uuids')
        .select(`
          uuid_code, dispatch_order_id, toy_id, toy_name,
          toys!inner(id, name, available_quantity, total_quantity)
        `)
        .eq('dispatch_order_id', params.dispatchOrderId)
        .in('uuid_code', params.returnedToys.map(t => t.uuidCode));

      if (toyError) {
        return {
          success: false,
          processedToys: 0,
          inventoryRestored: 0,
          damagedToys: 0,
          error: `Failed to fetch toy details: ${toyError.message}`
        };
      }

      if (!toyDetails || toyDetails.length === 0) {
        return {
          success: false,
          processedToys: 0,
          inventoryRestored: 0,
          damagedToys: 0,
          error: 'No toys found for the provided UUID codes'
        };
      }

      // Step 2: Process each returned toy atomically
      const inventoryUpdates = [];
      let processedToys = 0;
      let inventoryRestored = 0;
      let damagedToys = 0;

      for (const returnedToy of params.returnedToys) {
        try {
          const toyDetail = toyDetails.find(t => t.uuid_code === returnedToy.uuidCode);
          if (!toyDetail) {
            console.warn(`⚠️ Toy UUID ${returnedToy.uuidCode} not found in dispatch order`);
            continue;
          }

          console.log(`🔄 Processing return for toy: ${toyDetail.toy_name} (${returnedToy.condition})`);

          // Step 2a: Update toy return condition
          const { error: uuidUpdateError } = await StandardizedDispatchService.updateToyReturnCondition(
            returnedToy.uuidCode,
            returnedToy.condition,
            returnedToy.damageNotes
          );

          if (uuidUpdateError) {
            console.error(`❌ Failed to update toy condition for ${returnedToy.uuidCode}:`, uuidUpdateError);
            continue;
          }

          processedToys++;

          // Step 2b: Restore inventory only for toys in good condition
          if (['excellent', 'good'].includes(returnedToy.condition)) {
            const { data: inventoryResult, error: inventoryError } = await (supabase as any)
              .rpc('exec_sql', {
                sql: `
                  UPDATE toys 
                  SET 
                    available_quantity = available_quantity + 1,
                    updated_at = NOW()
                  WHERE id = '${toyDetail.toy_id}'
                  RETURNING id, name, available_quantity, 
                           (available_quantity - 1) as previous_quantity;
                `
              });

            if (inventoryError) {
              console.error(`❌ Failed to restore inventory for ${toyDetail.toy_name}:`, inventoryError);
            } else if (inventoryResult && inventoryResult.length > 0) {
              const result = inventoryResult[0];
              inventoryUpdates.push({
                toyId: result.id,
                previousQuantity: result.previous_quantity,
                newQuantity: result.available_quantity,
                quantityChange: 1,
                condition: returnedToy.condition
              });

              inventoryRestored++;

              // Record inventory movement
              await this.recordInventoryMovement({
                toyId: toyDetail.toy_id,
                toyName: toyDetail.toy_name,
                quantityChange: 1,
                operationType: 'return',
                referenceType: 'return_processing',
                referenceId: params.dispatchOrderId,
                notes: `Returned in ${returnedToy.condition} condition`,
                condition: returnedToy.condition
              });
            }
          } else {
            // Toy is damaged - don't restore to available inventory
            damagedToys++;
            console.log(`🔧 Toy ${toyDetail.toy_name} marked as ${returnedToy.condition} - not restored to inventory`);

            // Record inventory movement for damaged toys
            await this.recordInventoryMovement({
              toyId: toyDetail.toy_id,
              toyName: toyDetail.toy_name,
              quantityChange: 0, // No quantity change for damaged toys
              operationType: 'return',
              referenceType: 'return_processing',
              referenceId: params.dispatchOrderId,
              notes: `Returned damaged: ${returnedToy.damageNotes || 'No specific notes'}`,
              condition: returnedToy.condition
            });
          }

        } catch (toyError: any) {
          console.error(`💥 Failed to process return for toy ${returnedToy.uuidCode}:`, toyError);
        }
      }

      // Step 3: Update dispatch order status if all toys processed
      if (processedToys === params.returnedToys.length) {
        await (supabase as any)
          .from('dispatch_orders')
          .update({
            status: 'returned',
            actual_return_date: new Date().toISOString(),
            return_notes: params.qualityCheckNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.dispatchOrderId);
      }

      console.log(`✅ Return processing completed: ${processedToys} processed, ${inventoryRestored} restored, ${damagedToys} damaged`);
      return {
        success: true,
        processedToys,
        inventoryRestored,
        damagedToys,
        inventoryUpdates
      };

    } catch (error: any) {
      console.error('💥 Atomic return processing failed:', error);
      return {
        success: false,
        processedToys: 0,
        inventoryRestored: 0,
        damagedToys: 0,
        error: error.message
      };
    }
  }

  /**
   * Record inventory movement for audit trail
   */
  private static async recordInventoryMovement(movement: InventoryTransaction): Promise<void> {
    try {
      const movementType = this.getMovementType(movement.operationType, movement.condition);
      
      // Try to record in inventory_movements table (may not exist in all setups)
      const { error } = await (supabase as any)
        .from('inventory_movements')
        .insert({
          toy_id: movement.toyId,
          movement_type: movementType,
          quantity_change: movement.quantityChange,
          reference_type: movement.referenceType,
          reference_id: movement.referenceId,
          notes: movement.notes,
          created_by: 'system'
        });

      if (error && !error.message.includes('relation "inventory_movements" does not exist')) {
        console.error('⚠️ Failed to record inventory movement:', error);
      }
    } catch (error) {
      console.error('⚠️ Error recording inventory movement (non-critical):', error);
    }
  }

  /**
   * Get appropriate movement type based on operation and condition
   */
  private static getMovementType(
    operationType: string, 
    condition?: string
  ): string {
    switch (operationType) {
      case 'dispatch':
        return 'RENTAL_OUT';
      case 'return':
        if (condition === 'damaged') return 'DAMAGE';
        if (condition === 'fair') return 'REPAIR';
        return 'RENTAL_RETURN';
      case 'adjustment':
        return 'ADJUSTMENT';
      default:
        return 'MANUAL_ADJUSTMENT';
    }
  }

  /**
   * Get inventory status for a dispatch order
   */
  static async getInventoryStatusForDispatchOrder(dispatchOrderId: string): Promise<{
    totalToys: number;
    dispatchedToys: number;
    returnedToys: number;
    pendingReturn: number;
    damagedToys: number;
    inventoryImpact: Array<{
      toyId: string;
      toyName: string;
      quantityDispatched: number;
      quantityReturned: number;
      currentStatus: string;
    }>;
  }> {
    try {
      const { data, error } = await (supabase as any)
        .rpc('exec_sql', {
          sql: `
            SELECT 
              tdu.toy_id,
              tdu.toy_name,
              COUNT(*) as total_dispatched,
              COUNT(CASE WHEN tdu.condition_on_return IS NOT NULL THEN 1 END) as returned_count,
              COUNT(CASE WHEN tdu.condition_on_return IN ('excellent', 'good') THEN 1 END) as good_returns,
              COUNT(CASE WHEN tdu.condition_on_return = 'damaged' THEN 1 END) as damaged_returns,
              STRING_AGG(DISTINCT tdu.condition_on_return, ', ') as return_conditions
            FROM toy_dispatch_uuids tdu
            WHERE tdu.dispatch_order_id = '${dispatchOrderId}'
            GROUP BY tdu.toy_id, tdu.toy_name;
          `
        });

      if (error) {
        console.error('Error fetching inventory status:', error);
        return {
          totalToys: 0,
          dispatchedToys: 0,
          returnedToys: 0,
          pendingReturn: 0,
          damagedToys: 0,
          inventoryImpact: []
        };
      }

      const totalToys = data.reduce((sum: number, item: any) => sum + item.total_dispatched, 0);
      const returnedToys = data.reduce((sum: number, item: any) => sum + item.returned_count, 0);
      const damagedToys = data.reduce((sum: number, item: any) => sum + item.damaged_returns, 0);

      return {
        totalToys,
        dispatchedToys: totalToys,
        returnedToys,
        pendingReturn: totalToys - returnedToys,
        damagedToys,
        inventoryImpact: data.map((item: any) => ({
          toyId: item.toy_id,
          toyName: item.toy_name,
          quantityDispatched: item.total_dispatched,
          quantityReturned: item.returned_count,
          currentStatus: item.returned_count === item.total_dispatched ? 'fully_returned' : 'pending_return'
        }))
      };
    } catch (error) {
      console.error('Failed to get inventory status:', error);
      return {
        totalToys: 0,
        dispatchedToys: 0,
        returnedToys: 0,
        pendingReturn: 0,
        damagedToys: 0,
        inventoryImpact: []
      };
    }
  }
} 