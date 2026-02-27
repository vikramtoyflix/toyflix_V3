
import { supabase } from '@/integrations/supabase/client';
import { Subscription } from '@/types/subscription';

export class SubscriptionCore {
  /**
   * Get active subscription for a user (only active and paused)
   */
  static async getActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'paused'])
        .single();

      if (error) {
        console.error('Error fetching active subscription:', error);
        return null;
      }

      if (!data) {
        return null;
      }
      
      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status as 'active' | 'paused' | 'cancelled' | 'expired',
        start_date: data.start_date,
        end_date: data.end_date,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        pause_balance: data.pause_balance,
        auto_renew: data.auto_renew,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in getActiveSubscription:', error);
      return null;
    }
  }

  /**
   * Get subscription for upgrade eligibility (includes expired and cancelled)
   * Used to determine if user should get upgrade flow vs new user flow
   */
  static async getSubscriptionForUpgrade(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'paused', 'expired', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching subscription for upgrade:', error);
        return null;
      }

      if (!data) {
        return null;
      }
      
      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status as 'active' | 'paused' | 'cancelled' | 'expired',
        start_date: data.start_date,
        end_date: data.end_date,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        pause_balance: data.pause_balance,
        auto_renew: data.auto_renew,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in getSubscriptionForUpgrade:', error);
      return null;
    }
  }

  /**
   * Get current cycle information from rental orders (prioritized source)
   */
  static async getCurrentCycleFromRentalOrders(userId: string): Promise<{
    cycleNumber: number;
    dayInCycle: number;
    cycleStartDate: Date;
    cycleEndDate: Date;
  } | null> {
    try {
      const { data: latestOrder, error } = await supabase
        .from('rental_orders')
        .select('cycle_number, rental_start_date, rental_end_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !latestOrder) {
        console.error('Error fetching latest rental order:', error);
        return null;
      }

      const cycleStartDate = new Date(latestOrder.rental_start_date);
      const cycleEndDate = new Date(latestOrder.rental_end_date);
      const today = new Date();
      
      // Calculate current day in cycle
      const dayInCycle = Math.floor((today.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        cycleNumber: latestOrder.cycle_number,
        dayInCycle: Math.max(1, dayInCycle),
        cycleStartDate,
        cycleEndDate
      };
    } catch (error) {
      console.error('Error in getCurrentCycleFromRentalOrders:', error);
      return null;
    }
  }

  /**
   * Get paused subscription for a user
   */
  static async getPausedSubscription(userId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'paused')
        .single();

      if (error) {
        console.error('Error fetching paused subscription:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status as 'active' | 'paused' | 'cancelled' | 'expired',
        start_date: data.start_date,
        end_date: data.end_date,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        pause_balance: data.pause_balance,
        auto_renew: data.auto_renew,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error in getPausedSubscription:', error);
      return null;
    }
  }
}
