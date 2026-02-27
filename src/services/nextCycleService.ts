import { supabase } from '@/integrations/supabase/client';

export interface ToyData {
  toy_id: string;
  name: string;
  category: string;
  image_url?: string;
  unit_price: number;
  total_price: number;
  quantity: number;
  returned: boolean;
}

export interface NextCycleData {
  toys: ToyData[];
  shippingAddress?: any;
  specialInstructions?: string;
  queuedAt?: string;
}

export interface QueueStatus {
  hasQueue: boolean;
  toys: ToyData[];
  toyCount: number;
  queuedAt?: string;
  canModify: boolean;
}

export class NextCycleService {
  /**
   * Queue toys for next cycle
   */
  static async queueToysForNextCycle(
    userId: string, 
    toys: ToyData[], 
    shippingAddress?: any,
    specialInstructions?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🎯 Queueing toys for next cycle:', { userId, toyCount: toys.length });

      // Step 1: Get current cycle
      const { data: currentCycle, error: cycleError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['delivered', 'active', 'confirmed'])
        .gte('rental_end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError || !currentCycle) {
        return {
          success: false,
          message: 'No active cycle found'
        };
      }

      // Step 2: Prepare next cycle data
      const nextCycleToysData = toys.map(toy => ({
        ...toy,
        returned: false,
        queued_for_next_cycle: true
      }));

      // Step 3: Update current order with queue data
      const { error: updateError } = await (supabase as any)
        .from('rental_orders')
        .update({
          next_cycle_toys_selected: true,
          next_cycle_prepared: false,
          next_cycle_address: shippingAddress || currentCycle.shipping_address,
          delivery_instructions: specialInstructions || currentCycle.delivery_instructions,
          // Store queued toys in a temporary field or we can create separate table
          toys_data: [...(currentCycle.toys_data || []), ...nextCycleToysData],
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCycle.id);

      if (updateError) {
        console.error('❌ Error updating cycle with queue data:', updateError);
        return {
          success: false,
          message: 'Failed to queue toys'
        };
      }

      // Step 4: If you created the next_cycle_queue table, also insert there
      try {
        const { error: queueError } = await (supabase as any)
          .from('next_cycle_queue')
          .insert({
            user_id: userId,
            current_order_id: currentCycle.id,
            queued_toys: nextCycleToysData,
            shipping_address: shippingAddress || currentCycle.shipping_address,
            special_instructions: specialInstructions,
            status: 'pending'
          });

        if (queueError) {
          console.warn('⚠️ Could not insert into next_cycle_queue table:', queueError);
          // Don't fail the whole operation if this table doesn't exist yet
        }
      } catch (queueInsertError) {
        console.warn('⚠️ next_cycle_queue table not available yet:', queueInsertError);
      }

      console.log('✅ Toys queued successfully for next cycle');
      return {
        success: true,
        message: `Successfully queued ${toys.length} toys for your next cycle!`
      };

    } catch (error) {
      console.error('❌ Error queueing toys for next cycle:', error);
      return {
        success: false,
        message: 'Failed to queue toys for next cycle'
      };
    }
  }

  /**
   * Get queued toys for next cycle
   */
  static async getQueuedToys(userId: string): Promise<QueueStatus> {
    try {
      console.log('🔍 Getting queued toys for user:', userId);

      // Try to get from next_cycle_queue table first
      try {
        const { data: queueData, error: queueError } = await (supabase as any)
          .from('next_cycle_queue')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('queue_created_at', { ascending: false })
          .limit(1)
          .single();

        if (!queueError && queueData) {
          return {
            hasQueue: true,
            toys: queueData.queued_toys || [],
            toyCount: (queueData.queued_toys || []).length,
            queuedAt: queueData.queue_created_at,
            canModify: true
          };
        }
      } catch (queueTableError) {
        console.log('ℹ️ next_cycle_queue table not available, checking rental_orders');
      }

      // Fallback to checking rental_orders table
      const { data: currentCycle, error: cycleError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('next_cycle_toys_selected', true)
        .in('status', ['delivered', 'active', 'confirmed'])
        .gte('rental_end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError || !currentCycle) {
        return {
          hasQueue: false,
          toys: [],
          toyCount: 0,
          canModify: false
        };
      }

      // Extract queued toys from toys_data
      const queuedToys = (currentCycle.toys_data || []).filter((toy: any) => 
        toy.queued_for_next_cycle === true
      );

      return {
        hasQueue: currentCycle.next_cycle_toys_selected || false,
        toys: queuedToys,
        toyCount: queuedToys.length,
        queuedAt: currentCycle.updated_at,
        canModify: !currentCycle.next_cycle_prepared
      };

    } catch (error) {
      console.error('❌ Error getting queued toys:', error);
      return {
        hasQueue: false,
        toys: [],
        toyCount: 0,
        canModify: false
      };
    }
  }

  /**
   * Update queued toys
   */
  static async updateQueuedToys(
    userId: string, 
    toys: ToyData[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('✏️ Updating queued toys for user:', userId);

      // Get current cycle
      const { data: currentCycle, error: cycleError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('next_cycle_toys_selected', true)
        .in('status', ['delivered', 'active', 'confirmed'])
        .gte('rental_end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError || !currentCycle) {
        return {
          success: false,
          message: 'No queued toys found to update'
        };
      }

      if (currentCycle.next_cycle_prepared) {
        return {
          success: false,
          message: 'Cannot modify toys - next cycle is already being prepared'
        };
      }

      // Remove old queued toys and add new ones
      const currentToys = (currentCycle.toys_data || []).filter((toy: any) => 
        !toy.queued_for_next_cycle
      );

      const newQueuedToys = toys.map(toy => ({
        ...toy,
        returned: false,
        queued_for_next_cycle: true
      }));

      // Update rental_orders
      const { error: updateError } = await (supabase as any)
        .from('rental_orders')
        .update({
          toys_data: [...currentToys, ...newQueuedToys],
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCycle.id);

      if (updateError) {
        console.error('❌ Error updating queued toys:', updateError);
        return {
          success: false,
          message: 'Failed to update queued toys'
        };
      }

      // Also update next_cycle_queue table if it exists
      try {
        const { error: queueUpdateError } = await (supabase as any)
          .from('next_cycle_queue')
          .update({
            queued_toys: newQueuedToys
          })
          .eq('user_id', userId)
          .eq('status', 'pending');

        if (queueUpdateError) {
          console.warn('⚠️ Could not update next_cycle_queue table:', queueUpdateError);
        }
      } catch (queueTableError) {
        console.log('ℹ️ next_cycle_queue table not available');
      }

      return {
        success: true,
        message: 'Queued toys updated successfully!'
      };

    } catch (error) {
      console.error('❌ Error updating queued toys:', error);
      return {
        success: false,
        message: 'Failed to update queued toys'
      };
    }
  }

  /**
   * Remove queued toys (cancel queue)
   */
  static async removeQueuedToys(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Removing queued toys for user:', userId);

      // Get current cycle
      const { data: currentCycle, error: cycleError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .eq('next_cycle_toys_selected', true)
        .in('status', ['delivered', 'active', 'confirmed'])
        .gte('rental_end_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError || !currentCycle) {
        return {
          success: false,
          message: 'No queued toys found'
        };
      }

      // Remove queued toys from toys_data
      const currentToys = (currentCycle.toys_data || []).filter((toy: any) => 
        !toy.queued_for_next_cycle
      );

      // Update rental_orders
      const { error: updateError } = await (supabase as any)
        .from('rental_orders')
        .update({
          next_cycle_toys_selected: false,
          next_cycle_prepared: false,
          toys_data: currentToys,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCycle.id);

      if (updateError) {
        console.error('❌ Error removing queued toys:', updateError);
        return {
          success: false,
          message: 'Failed to remove queued toys'
        };
      }

      // Also remove from next_cycle_queue table if it exists
      try {
        const { error: queueRemoveError } = await (supabase as any)
          .from('next_cycle_queue')
          .update({ status: 'cancelled' })
          .eq('user_id', userId)
          .eq('status', 'pending');

        if (queueRemoveError) {
          console.warn('⚠️ Could not update next_cycle_queue table:', queueRemoveError);
        }
      } catch (queueTableError) {
        console.log('ℹ️ next_cycle_queue table not available');
      }

      return {
        success: true,
        message: 'Queued toys removed successfully!'
      };

    } catch (error) {
      console.error('❌ Error removing queued toys:', error);
      return {
        success: false,
        message: 'Failed to remove queued toys'
      };
    }
  }

  /**
   * Process next cycle (called when current cycle ends)
   * This would typically be called by a cron job or admin action
   */
  static async processNextCycle(currentOrderId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Processing next cycle for order:', currentOrderId);

      // This would be implemented when we have the full cycle transition logic
      // For now, just mark as processed
      const { error } = await (supabase as any)
        .from('rental_orders')
        .update({
          next_cycle_prepared: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrderId);

      if (error) {
        return {
          success: false,
          message: 'Failed to process next cycle'
        };
      }

      return {
        success: true,
        message: 'Next cycle processed successfully'
      };

    } catch (error) {
      console.error('❌ Error processing next cycle:', error);
      return {
        success: false,
        message: 'Failed to process next cycle'
      };
    }
  }
} 