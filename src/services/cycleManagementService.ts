import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation } from '@/types/subscription';

export class CycleManagementService {
  /**
   * Initialize a new cycle for a subscription
   */
  static async initializeCycle(subscriptionId: string, userId: string): Promise<SubscriptionOperation> {
    try {
      const cycleStartDate = new Date();
      const cycleEndDate = new Date();
      cycleEndDate.setDate(cycleStartDate.getDate() + 30); // 30-day cycle

      const selectionWindowStart = new Date();
      selectionWindowStart.setDate(cycleStartDate.getDate() + 24); // Selection window at day 24

      // Update subscription with cycle information
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          current_cycle_start: cycleStartDate.toISOString().split('T')[0],
          current_cycle_end: cycleEndDate.toISOString().split('T')[0],
          cycle_status: 'selection',
          next_selection_window_start: selectionWindowStart.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (subscriptionError) throw subscriptionError;

      // Update user entitlements
      const { error: entitlementError } = await supabase
        .from('user_entitlements')
        .update({
          toys_in_possession: false,
          selection_window_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (entitlementError) throw entitlementError;

      return {
        success: true,
        message: 'Cycle initialized successfully',
        data: { cycleStartDate, cycleEndDate, selectionWindowStart }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to initialize cycle',
        error: error.message
      };
    }
  }

  /**
   * Mark toys as delivered and update cycle status
   */
  static async markToysDelivered(subscriptionId: string, toyIds: string[]): Promise<SubscriptionOperation> {
    try {
      const deliveryDate = new Date();
      const returnDueDate = new Date();
      returnDueDate.setDate(deliveryDate.getDate() + 20); // 20 days to play with toys

      // Update subscription
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          cycle_status: 'toys_in_possession',
          toys_delivered_date: deliveryDate.toISOString(),
          toys_return_due_date: returnDueDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (subscriptionError) throw subscriptionError;

      // Update user entitlements
      const { error: entitlementError } = await supabase
        .from('user_entitlements')
        .update({
          toys_in_possession: true,
          current_cycle_toys: JSON.stringify(toyIds),
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (entitlementError) throw entitlementError;

      return {
        success: true,
        message: 'Toys marked as delivered',
        data: { deliveryDate, returnDueDate, toyIds }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to mark toys as delivered',
        error: error.message
      };
    }
  }

  /**
   * Mark toys as returned and prepare for next cycle
   */
  static async markToysReturned(subscriptionId: string): Promise<SubscriptionOperation> {
    try {
      // Update subscription
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .update({
          cycle_status: 'cycle_complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (subscriptionError) throw subscriptionError;

      // Update user entitlements
      const { error: entitlementError } = await supabase
        .from('user_entitlements')
        .update({
          toys_in_possession: false,
          current_cycle_toys: JSON.stringify([]),
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (entitlementError) throw entitlementError;

      return {
        success: true,
        message: 'Toys marked as returned, ready for next cycle'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to mark toys as returned',
        error: error.message
      };
    }
  }

  /**
   * Check if user can access catalog based on cycle status
   */
  static canAccessCatalog(cycleStatus: any): { canAccess: boolean; reason?: string; redirectTo?: string } {
    if (!cycleStatus?.has_active_subscription) {
      return {
        canAccess: false,
        reason: 'No active subscription',
        redirectTo: '/subscription-flow'
      };
    }

    // Allow catalog access for users without toys in possession
    // or during selection window regardless of toys possession status
    if (!cycleStatus.toys_in_possession || cycleStatus.selection_window_active) {
      return { canAccess: true };
    }

    // If toys are in possession and not in selection window, restrict access
    if (cycleStatus.toys_in_possession && !cycleStatus.selection_window_active) {
      return {
        canAccess: false,
        reason: 'You currently have toys from your subscription. Please return them before making new selections.',
        redirectTo: '/dashboard'
      };
    }

    return { canAccess: true };
  }

  /**
   * Check if "Manage Queue" should be active
   */
  static shouldShowManageQueue(cycleStatus: any): boolean {
    return cycleStatus?.has_active_subscription && 
           cycleStatus?.selection_window_active && 
           !cycleStatus?.toys_in_possession;
  }
}
