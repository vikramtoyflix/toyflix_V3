
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionOperation } from '@/types/subscription';
import { EntitlementService } from '../entitlementService';

export class SubscriptionPerks {
  /**
   * Assign one-time perks for Gold Pack
   */
  static async assignOneTimePerks(userId: string, subscriptionId: string): Promise<SubscriptionOperation> {
    try {
      console.log(`Assigning one-time perks for user ${userId}`);
      
      const goldPackPerks = [
        { type: 'roller_coaster', status: 'pending' },
        { type: 'coupe_ride', status: 'pending' },
        { type: 'early_access', status: 'delivered' },
        { type: 'reservation', status: 'delivered' }
      ];

      const perkAssignments = goldPackPerks.map(perk => ({
        user_id: userId,
        subscription_id: subscriptionId,
        perk_type: perk.type,
        status: perk.status,
        assigned_date: new Date().toISOString(),
        delivered_date: perk.status === 'delivered' ? new Date().toISOString() : undefined
      }));

      const { error } = await supabase
        .from('perk_assignments')
        .insert(perkAssignments);

      if (error) throw error;

      // Update user entitlements for early access and reservation
      await EntitlementService.enableGoldPackPerks(userId, subscriptionId);

      return { success: true, message: 'One-time perks assigned successfully' };

    } catch (error: any) {
      console.error('Error in assignOneTimePerks:', error);
      return { 
        success: false, 
        message: 'Failed to assign perks', 
        error: error.message 
      };
    }
  }
}
