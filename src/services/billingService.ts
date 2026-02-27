
import { supabase } from '@/integrations/supabase/client';
import { BillingRecord } from '@/types/subscription';
import { PlanService } from './planService';

export class BillingService {
  /**
   * Create a billing record for subscription payment
   */
  static async createBillingRecord(userId: string, subscriptionId: string, amount: number): Promise<void> {
    const gst = PlanService.calculateGST(amount);
    const totalAmount = amount + gst;

    const currentDate = new Date();
    const periodStart = new Date(currentDate);
    const periodEnd = new Date(currentDate);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const billingRecord = {
      user_id: userId,
      subscription_id: subscriptionId,
      amount,
      gst,
      total_amount: totalAmount,
      billing_date: currentDate.toISOString(),
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      status: 'pending'
    };

    const { error } = await supabase
      .from('billing_records')
      .insert(billingRecord);

    if (error) {
      console.error('Error creating billing record:', error);
      throw error;
    }

    console.log(`Billing record created for user ${userId}, amount: ₹${totalAmount}`);
  }

  /**
   * Create a refund record
   */
  static async createRefundRecord(userId: string, subscriptionId: string, amount: number): Promise<void> {
    const currentDate = new Date();

    const refundRecord = {
      user_id: userId,
      subscription_id: subscriptionId,
      amount: -amount, // Negative amount for refund
      gst: -PlanService.calculateGST(amount),
      total_amount: -PlanService.calculateTotalWithGST(amount),
      billing_date: currentDate.toISOString(),
      period_start: currentDate.toISOString(),
      period_end: currentDate.toISOString(),
      status: 'pending'
    };

    const { error } = await supabase
      .from('billing_records')
      .insert(refundRecord);

    if (error) {
      console.error('Error creating refund record:', error);
      throw error;
    }

    console.log(`Refund record created for user ${userId}, amount: ₹${amount}`);
  }

  /**
   * Update payment status after successful payment
   */
  static async updatePaymentStatus(billingRecordId: string, status: 'paid' | 'failed', paymentId?: string): Promise<void> {
    const updateData: any = { status };
    if (paymentId) {
      updateData.payment_id = paymentId;
    }

    const { error } = await supabase
      .from('billing_records')
      .update(updateData)
      .eq('id', billingRecordId);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }

    console.log(`Payment status updated to ${status} for billing record ${billingRecordId}`);
  }

  /**
   * Get billing history for a user
   */
  static async getBillingHistory(userId: string): Promise<BillingRecord[]> {
    const { data, error } = await supabase
      .from('billing_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching billing history:', error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      user_id: record.user_id,
      subscription_id: record.subscription_id,
      amount: record.amount,
      gst: record.gst,
      total_amount: record.total_amount,
      billing_date: record.billing_date,
      period_start: record.period_start,
      period_end: record.period_end,
      status: record.status as 'pending' | 'paid' | 'failed' | 'refunded',
      payment_id: record.payment_id,
      created_at: record.created_at
    }));
  }

  /**
   * Get pending billing records
   */
  static async getPendingBilling(userId: string): Promise<BillingRecord[]> {
    const { data, error } = await supabase
      .from('billing_records')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending billing:', error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      user_id: record.user_id,
      subscription_id: record.subscription_id,
      amount: record.amount,
      gst: record.gst,
      total_amount: record.total_amount,
      billing_date: record.billing_date,
      period_start: record.period_start,
      period_end: record.period_end,
      status: record.status as 'pending' | 'paid' | 'failed' | 'refunded',
      payment_id: record.payment_id,
      created_at: record.created_at
    }));
  }

  /**
   * Calculate total amount due for a user
   */
  static async getTotalAmountDue(userId: string): Promise<number> {
    const pendingBills = await this.getPendingBilling(userId);
    return pendingBills.reduce((total, bill) => total + bill.total_amount, 0);
  }
}
