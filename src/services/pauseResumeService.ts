
/**
 * Pause Resume Service
 * Handles subscription pause and resume operations for Silver Pack and Gold Pack PRO
 * Pause = Pickup only (collect toys), Resume = Dispatch only (deliver new toys)
 */

import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { IntelligentExchangeService } from './intelligentExchangeService';

export interface PauseRequest {
  id: string;
  subscription_id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: any;
  pincode: string;
  assigned_day: string;
  subscription_plan: string;
  current_toys: any[];
  pause_requested_at: string;
  operation_status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  pickup_scheduled_date?: string;
  exchange_id?: string;
}

export interface ResumeRequest {
  id: string;
  subscription_id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: any;
  pincode: string;
  assigned_day: string;
  subscription_plan: string;
  selected_toys: any[];
  resume_requested_at: string;
  operation_status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  dispatch_scheduled_date?: string;
  exchange_id?: string;
}

export interface PauseResult {
  success: boolean;
  pauseRequestId?: string;
  requiresPickup: boolean;
  scheduledPickupId?: string;
  pickupDate?: string;
  error?: string;
}

export interface ResumeResult {
  success: boolean;
  resumeRequestId?: string;
  scheduledDispatchId?: string;
  dispatchDate?: string;
  toys: any[];
  error?: string;
}

export class PauseResumeService {
  
  /**
   * Create pause request for Silver/Gold Pack subscriptions
   */
  static async createPauseRequest(subscriptionId: string, userId: string): Promise<PauseResult> {
    try {
      console.log('🔄 Creating pause request for subscription:', subscriptionId);
      
      // Get subscription and customer details
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select(`
          *,
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .single();
        
      if (subError || !subscription) {
        return {
          success: false,
          requiresPickup: false,
          error: 'Subscription not found'
        };
      }
      
      // Check if subscription plan supports pause (Silver/Gold only)
      const pausablePlans = ['silver-pack', 'gold-pack-pro'];
      if (!pausablePlans.includes(subscription.plan_id)) {
        return {
          success: false,
          requiresPickup: false,
          error: 'This subscription plan does not support pause functionality'
        };
      }
      
      // Get current toys with customer
      const currentToys = await this.getCurrentToysForUser(userId);
      
      if (currentToys.length === 0) {
        // No toys to pickup, pause subscription immediately
        await this.pauseSubscriptionImmediately(subscriptionId);
        return {
          success: true,
          requiresPickup: false
        };
      }
      
      // Get customer pincode and assigned day
      const pincode = subscription.custom_users.shipping_address?.pincode || 
                     subscription.custom_users.zip_code;
      const assignedDay = await this.getAssignedDay(pincode);
      
      // Create pause request record
      const { data: pauseRequest, error: pauseError } = await supabaseAdmin
        .from('subscription_pause_resume')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          subscription_plan: subscription.plan_id,
          operation_type: 'PAUSE',
          operation_status: 'requested',
          pause_requested_at: new Date().toISOString(),
          toys_to_collect: currentToys,
          customer_pincode: pincode,
          customer_assigned_day: assignedDay
        })
        .select()
        .single();
        
      if (pauseError) {
        console.error('❌ Error creating pause request:', pauseError);
        return {
          success: false,
          requiresPickup: false,
          error: pauseError.message
        };
      }
      
      // Schedule pickup-only operation
      const pickupResult = await this.schedulePickupOnly(pauseRequest.id, currentToys);
      
      if (!pickupResult.success) {
        return {
          success: false,
          requiresPickup: true,
          error: pickupResult.error
        };
      }
      
      console.log('✅ Pause request created successfully');
      return {
        success: true,
        pauseRequestId: pauseRequest.id,
        requiresPickup: true,
        scheduledPickupId: pickupResult.exchangeId,
        pickupDate: pickupResult.scheduledDate
      };
      
    } catch (error: any) {
      console.error('💥 Failed to create pause request:', error);
      return {
        success: false,
        requiresPickup: false,
        error: error.message
      };
    }
  }
  
  /**
   * Create resume request for paused subscriptions
   */
  static async createResumeRequest(
    subscriptionId: string, 
    userId: string, 
    selectedToys: any[]
  ): Promise<ResumeResult> {
    try {
      console.log('🔄 Creating resume request for subscription:', subscriptionId);
      
      // Get subscription details
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select(`
          *,
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .single();
        
      if (subError || !subscription) {
        return {
          success: false,
          toys: [],
          error: 'Subscription not found'
        };
      }
      
      // Validate subscription is paused
      if (subscription.status !== 'paused') {
        return {
          success: false,
          toys: [],
          error: 'Subscription is not currently paused'
        };
      }
      
      // Validate toy selection
      const validationResult = await this.validateToySelection(selectedToys, subscription.plan_id);
      if (!validationResult.isValid) {
        return {
          success: false,
          toys: [],
          error: `Invalid toy selection: ${validationResult.errors.join(', ')}`
        };
      }
      
      // Get customer pincode and assigned day
      const pincode = subscription.custom_users.shipping_address?.pincode || 
                     subscription.custom_users.zip_code;
      const assignedDay = await this.getAssignedDay(pincode);
      
      // Create resume request record
      const { data: resumeRequest, error: resumeError } = await supabaseAdmin
        .from('subscription_pause_resume')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          subscription_plan: subscription.plan_id,
          operation_type: 'RESUME',
          operation_status: 'requested',
          resume_requested_at: new Date().toISOString(),
          toys_to_deliver: selectedToys,
          customer_pincode: pincode,
          customer_assigned_day: assignedDay
        })
        .select()
        .single();
        
      if (resumeError) {
        console.error('❌ Error creating resume request:', resumeError);
        return {
          success: false,
          toys: [],
          error: resumeError.message
        };
      }
      
      // Schedule dispatch-only operation
      const dispatchResult = await this.scheduleDispatchOnly(resumeRequest.id, selectedToys);
      
      if (!dispatchResult.success) {
        return {
          success: false,
          toys: selectedToys,
          error: dispatchResult.error
        };
      }
      
      console.log('✅ Resume request created successfully');
      return {
        success: true,
        resumeRequestId: resumeRequest.id,
        scheduledDispatchId: dispatchResult.exchangeId,
        dispatchDate: dispatchResult.scheduledDate,
        toys: selectedToys
      };
      
    } catch (error: any) {
      console.error('💥 Failed to create resume request:', error);
      return {
        success: false,
        toys: [],
        error: error.message
      };
    }
  }
  
  /**
   * Get all pending pause requests
   */
  static async getPauseRequests(): Promise<PauseRequest[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select(`
          *,
          subscriptions!inner(plan_id),
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('operation_type', 'PAUSE')
        .in('operation_status', ['requested', 'scheduled'])
        .order('pause_requested_at', { ascending: true });
        
      if (error) {
        console.error('❌ Error fetching pause requests:', error);
        return [];
      }
      
      return (data || []).map(item => ({
        id: item.id,
        subscription_id: item.subscription_id,
        user_id: item.user_id,
        customer_name: item.custom_users.full_name || 'Unknown Customer',
        customer_phone: item.custom_users.phone || '',
        customer_address: item.custom_users.shipping_address,
        pincode: item.customer_pincode,
        assigned_day: item.customer_assigned_day,
        subscription_plan: item.subscription_plan,
        current_toys: item.toys_to_collect || [],
        pause_requested_at: item.pause_requested_at,
        operation_status: item.operation_status,
        pickup_scheduled_date: item.pickup_scheduled_date,
        exchange_id: item.exchange_id
      }));
    } catch (error) {
      console.error('💥 Failed to get pause requests:', error);
      return [];
    }
  }
  
  /**
   * Get all pending resume requests
   */
  static async getResumeRequests(): Promise<ResumeRequest[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select(`
          *,
          subscriptions!inner(plan_id),
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('operation_type', 'RESUME')
        .in('operation_status', ['requested', 'scheduled'])
        .order('resume_requested_at', { ascending: true });
        
      if (error) {
        console.error('❌ Error fetching resume requests:', error);
        return [];
      }
      
      return (data || []).map(item => ({
        id: item.id,
        subscription_id: item.subscription_id,
        user_id: item.user_id,
        customer_name: item.custom_users.full_name || 'Unknown Customer',
        customer_phone: item.custom_users.phone || '',
        customer_address: item.custom_users.shipping_address,
        pincode: item.customer_pincode,
        assigned_day: item.customer_assigned_day,
        subscription_plan: item.subscription_plan,
        selected_toys: item.toys_to_deliver || [],
        resume_requested_at: item.resume_requested_at,
        operation_status: item.operation_status,
        dispatch_scheduled_date: item.dispatch_scheduled_date,
        exchange_id: item.exchange_id
      }));
    } catch (error) {
      console.error('💥 Failed to get resume requests:', error);
      return [];
    }
  }
  
  /**
   * Schedule pickup-only operation for pause request
   */
  private static async schedulePickupOnly(pauseRequestId: string, toysToCollect: any[]): Promise<{
    success: boolean;
    exchangeId?: string;
    scheduledDate?: string;
    error?: string;
  }> {
    try {
      // Get pause request details
      const { data: pauseRequest, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select(`
          *,
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('id', pauseRequestId)
        .single();
        
      if (error || !pauseRequest) {
        return {
          success: false,
          error: 'Pause request not found'
        };
      }
      
      // Get next available date for pickup
      const nextDate = await IntelligentExchangeService.getNextAvailableDate(
        pauseRequest.customer_pincode,
        pauseRequest.customer_assigned_day
      );
      
      // Get available time slot
      const availableSlots = await IntelligentExchangeService.getAvailableTimeSlots(
        pauseRequest.customer_pincode,
        nextDate
      );
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          error: 'No available time slots for pickup'
        };
      }
      
      // Create pickup-only exchange
      const { data: exchange, error: exchangeError } = await supabaseAdmin
        .from('toy_exchanges')
        .insert({
          rental_order_id: null, // No specific rental order for pause
          exchange_type: 'PICKUP_ONLY',
          order_classification: 'PAUSE',
          customer_id: pauseRequest.user_id,
          customer_name: pauseRequest.custom_users.full_name,
          customer_phone: pauseRequest.custom_users.phone,
          customer_address: pauseRequest.custom_users.shipping_address,
          pincode: pauseRequest.customer_pincode,
          assigned_day: pauseRequest.customer_assigned_day,
          subscription_plan: pauseRequest.subscription_plan,
          cycle_number: 0, // Pause operation
          is_pause_order: true,
          scheduled_date: nextDate,
          scheduled_time_slot: availableSlots[0],
          toys_to_pickup: toysToCollect,
          toys_to_dispatch: [],
          pickup_toy_count: toysToCollect.length,
          dispatch_toy_count: 0,
          exchange_status: 'scheduled'
        })
        .select()
        .single();
        
      if (exchangeError) {
        console.error('❌ Error creating pickup exchange:', exchangeError);
        return {
          success: false,
          error: exchangeError.message
        };
      }
      
      // Update pause request with exchange details
      await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: 'scheduled',
          pickup_scheduled_date: nextDate,
          exchange_id: exchange.id
        })
        .eq('id', pauseRequestId);
      
      return {
        success: true,
        exchangeId: exchange.id,
        scheduledDate: nextDate
      };
      
    } catch (error: any) {
      console.error('💥 Failed to schedule pickup only:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Schedule dispatch-only operation for resume request
   */
  private static async scheduleDispatchOnly(resumeRequestId: string, selectedToys: any[]): Promise<{
    success: boolean;
    exchangeId?: string;
    scheduledDate?: string;
    error?: string;
  }> {
    try {
      // Get resume request details
      const { data: resumeRequest, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select(`
          *,
          custom_users!inner(phone, full_name, zip_code, shipping_address)
        `)
        .eq('id', resumeRequestId)
        .single();
        
      if (error || !resumeRequest) {
        return {
          success: false,
          error: 'Resume request not found'
        };
      }
      
      // Get next available date for dispatch
      const nextDate = await IntelligentExchangeService.getNextAvailableDate(
        resumeRequest.customer_pincode,
        resumeRequest.customer_assigned_day
      );
      
      // Get available time slot
      const availableSlots = await IntelligentExchangeService.getAvailableTimeSlots(
        resumeRequest.customer_pincode,
        nextDate
      );
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          error: 'No available time slots for dispatch'
        };
      }
      
      // Create dispatch-only exchange
      const { data: exchange, error: exchangeError } = await supabaseAdmin
        .from('toy_exchanges')
        .insert({
          rental_order_id: null, // No specific rental order for resume
          exchange_type: 'DISPATCH_ONLY',
          order_classification: 'RESUME',
          customer_id: resumeRequest.user_id,
          customer_name: resumeRequest.custom_users.full_name,
          customer_phone: resumeRequest.custom_users.phone,
          customer_address: resumeRequest.custom_users.shipping_address,
          pincode: resumeRequest.customer_pincode,
          assigned_day: resumeRequest.customer_assigned_day,
          subscription_plan: resumeRequest.subscription_plan,
          cycle_number: 0, // Resume operation
          is_resume_order: true,
          scheduled_date: nextDate,
          scheduled_time_slot: availableSlots[0],
          toys_to_pickup: [],
          toys_to_dispatch: selectedToys,
          pickup_toy_count: 0,
          dispatch_toy_count: selectedToys.length,
          exchange_status: 'scheduled'
        })
        .select()
        .single();
        
      if (exchangeError) {
        console.error('❌ Error creating dispatch exchange:', exchangeError);
        return {
          success: false,
          error: exchangeError.message
        };
      }
      
      // Update resume request with exchange details
      await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: 'scheduled',
          dispatch_scheduled_date: nextDate,
          exchange_id: exchange.id
        })
        .eq('id', resumeRequestId);
      
      return {
        success: true,
        exchangeId: exchange.id,
        scheduledDate: nextDate
      };
      
    } catch (error: any) {
      console.error('💥 Failed to schedule dispatch only:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Complete pause operation (after pickup is done)
   */
  static async completePauseOperation(pauseRequestId: string): Promise<boolean> {
    try {
      console.log('🔄 Completing pause operation:', pauseRequestId);
      
      // Get pause request details
      const { data: pauseRequest, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select('*')
        .eq('id', pauseRequestId)
        .single();
        
      if (error || !pauseRequest) {
        console.error('❌ Pause request not found');
        return false;
      }
      
      // Update subscription status to paused
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pauseRequest.subscription_id);
      
      // Update pause request status
      await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: 'completed',
          pickup_completed_at: new Date().toISOString()
        })
        .eq('id', pauseRequestId);
      
      console.log('✅ Pause operation completed');
      return true;
      
    } catch (error: any) {
      console.error('💥 Failed to complete pause operation:', error);
      return false;
    }
  }
  
  /**
   * Complete resume operation (after dispatch is done)
   */
  static async completeResumeOperation(resumeRequestId: string): Promise<boolean> {
    try {
      console.log('🔄 Completing resume operation:', resumeRequestId);
      
      // Get resume request details
      const { data: resumeRequest, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select('*')
        .eq('id', resumeRequestId)
        .single();
        
      if (error || !resumeRequest) {
        console.error('❌ Resume request not found');
        return false;
      }
      
      // Update subscription status to active
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          resumed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', resumeRequest.subscription_id);
      
      // Update resume request status
      await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: 'completed',
          dispatch_completed_at: new Date().toISOString()
        })
        .eq('id', resumeRequestId);
      
      console.log('✅ Resume operation completed');
      return true;
      
    } catch (error: any) {
      console.error('💥 Failed to complete resume operation:', error);
      return false;
    }
  }
  
  /**
   * Get current toys for a user from active orders
   */
  private static async getCurrentToysForUser(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('get_current_toys_for_user', { p_user_id: userId });
        
      if (error) {
        console.error('❌ Error getting current toys:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Failed to get current toys:', error);
      return [];
    }
  }
  
  /**
   * Pause subscription immediately (when no toys to pickup)
   */
  private static async pauseSubscriptionImmediately(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
        
      return !error;
    } catch (error) {
      console.error('❌ Error pausing subscription immediately:', error);
      return false;
    }
  }
  
  /**
   * Get assigned day for a pincode
   */
  private static async getAssignedDay(pincode: string): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('pincode_pickup_schedule')
        .select('pickup_day')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        console.warn('⚠️ Pincode assignment not found, using default:', pincode);
        return 'monday';
      }
      
      return data.pickup_day;
    } catch (error) {
      console.error('❌ Error getting assigned day:', error);
      return 'monday';
    }
  }
  
  /**
   * Validate toy selection for subscription plan
   */
  private static async validateToySelection(selectedToys: any[], planId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Get plan limits
      const planLimits = {
        'discovery-delight': { maxToys: 4, allowsBigToys: false },
        'silver-pack': { maxToys: 3, allowsBigToys: true },
        'gold-pack-pro': { maxToys: 3, allowsBigToys: true, premiumAccess: true },
        'ride-on': { maxToys: 1, rideOnOnly: true, allowsBigToys: false }
      };
      
      const limits = planLimits[planId as keyof typeof planLimits];
      if (!limits) {
        errors.push('Invalid subscription plan');
        return { isValid: false, errors };
      }
      
      // Check toy count
      if (selectedToys.length > limits.maxToys) {
        errors.push(`Too many toys selected. Maximum allowed: ${limits.maxToys}`);
      }
      
      // Check toy availability
      for (const toy of selectedToys) {
        const { data: toyData, error } = await supabaseAdmin
          .from('toys')
          .select('available_quantity, category')
          .eq('id', toy.toy_id || toy.id)
          .single();
          
        if (error || !toyData) {
          errors.push(`Toy not found: ${toy.name}`);
          continue;
        }
        
        if (toyData.available_quantity < 1) {
          errors.push(`Toy out of stock: ${toy.name}`);
        }
        
        // Check big toys restriction
        if ('allowsBigToys' in limits && !limits.allowsBigToys && toyData.category === 'big_toys') {
          errors.push(`Big toys not allowed for ${planId}: ${toy.name}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
      
    } catch (error: any) {
      console.error('❌ Error validating toy selection:', error);
      return {
        isValid: false,
        errors: ['Validation error: ' + error.message]
      };
    }
  }
  
  /**
   * Update pause/resume request status
   */
  static async updateRequestStatus(
    requestId: string,
    status: 'requested' | 'scheduled' | 'in_progress' | 'completed' | 'failed'
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      return !error;
    } catch (error) {
      console.error('❌ Error updating request status:', error);
      return false;
    }
  }
  
  /**
   * Cancel pause/resume request
   */
  static async cancelRequest(requestId: string, reason: string): Promise<boolean> {
    try {
      console.log('🔄 Cancelling pause/resume request:', requestId);
      
      // Get request details to cancel associated exchange
      const { data: request, error } = await supabaseAdmin
        .from('subscription_pause_resume')
        .select('exchange_id')
        .eq('id', requestId)
        .single();
        
      if (error) {
        console.error('❌ Error getting request details:', error);
        return false;
      }
      
      // Cancel associated exchange if exists
      if (request.exchange_id) {
        await IntelligentExchangeService.cancelExchange(request.exchange_id, reason);
      }
      
      // Update request status
      await supabaseAdmin
        .from('subscription_pause_resume')
        .update({
          operation_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      console.log('✅ Request cancelled successfully');
      return true;
      
    } catch (error: any) {
      console.error('💥 Failed to cancel request:', error);
      return false;
    }
  }
}