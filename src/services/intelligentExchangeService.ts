/**
 * Intelligent Exchange Service
 * Handles toy exchanges, pickups, and dispatches with automatic order classification
 * Supports all subscription plans: Discovery Delight, Silver Pack, Gold Pack PRO, Ride-On
 */

import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { supabase } from '@/integrations/supabase/client';

// Types for exchange system
export interface ToyExchange {
  id: string;
  rental_order_id: string;
  exchange_type: 'EXCHANGE' | 'PICKUP_ONLY' | 'DISPATCH_ONLY' | 'FIRST_DELIVERY';
  order_classification: 'SUB' | 'QU' | 'REGULAR';
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: any;
  pincode: string;
  assigned_day: string;
  subscription_plan: string;
  cycle_number: number;
  is_pause_order: boolean;
  is_resume_order: boolean;
  scheduled_date: string;
  scheduled_time_slot: string;
  toys_to_pickup: any[];
  toys_to_dispatch: any[];
  pickup_toy_count: number;
  dispatch_toy_count: number;
  exchange_status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'rescheduled';
  pickup_completed: boolean;
  dispatch_completed: boolean;
  route_sequence?: number;
  estimated_duration_minutes: number;
  actual_exchange_date?: string;
  actual_exchange_time?: string;
  toys_actually_collected?: any[];
  toys_actually_delivered?: any[];
  exchange_notes?: string;
  customer_satisfaction?: number;
  toys_condition_on_pickup?: any[];
  toys_condition_on_dispatch?: any[];
  created_at: string;
  updated_at: string;
}

export interface OrderAnalysis {
  orderId: string;
  orderType: 'SUB' | 'QU' | 'REGULAR';
  subscriptionPlan: string;
  cycleNumber: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: any;
  pincode: string;
  assignedDay: string;
  currentToys: any[];
  newToys: any[];
  isPauseOrder: boolean;
  isResumeOrder: boolean;
  operationType: 'EXCHANGE' | 'PICKUP_ONLY' | 'DISPATCH_ONLY' | 'FIRST_DELIVERY';
}

export interface ProcessingResult {
  success: boolean;
  exchangeId?: string;
  orderType: string;
  operationType: string;
  scheduledDate: string;
  timeSlot: string;
  error?: string;
}

export interface ExchangeCompletionData {
  actualDate: string;
  actualTime: string;
  toysCollected?: any[];
  toysDelivered?: any[];
  pickupCompleted: boolean;
  dispatchCompleted: boolean;
  notes?: string;
  satisfaction?: number;
  toysConditionOnPickup?: any[];
  toysConditionOnDispatch?: any[];
}

export interface CreateExchangeData {
  orderId: string;
  customerId: string;
  exchangeType: 'EXCHANGE' | 'PICKUP_ONLY' | 'DISPATCH_ONLY' | 'FIRST_DELIVERY';
  scheduledDate: string;
  timeSlot: string;
  toysToPickup?: any[];
  toysToDispatch?: any[];
  notes?: string;
}

export interface ExchangeFilters {
  day?: string;
  date?: string;
  status?: string;
  exchangeType?: string;
  pincode?: string;
  subscriptionPlan?: string;
}

export class IntelligentExchangeService {
  
  /**
   * Main function to process any new order intelligently
   */
  static async processOrder(orderId: string): Promise<ProcessingResult> {
    try {
      console.log('🔄 Processing order for exchange scheduling:', orderId);
      
      // Step 1: Analyze order context
      const orderAnalysis = await this.analyzeOrder(orderId);
      
      // Step 2: Schedule appropriate operation using database function
      const { data, error } = await supabaseAdmin
        .rpc('auto_schedule_exchange', { p_rental_order_id: orderId });
      
      if (error) {
        console.error('❌ Error auto-scheduling exchange:', error);
        return {
          success: false,
          orderType: orderAnalysis.orderType,
          operationType: orderAnalysis.operationType,
          scheduledDate: '',
          timeSlot: '',
          error: error.message
        };
      }
      
      // Get the created exchange details
      const { data: exchange, error: exchangeError } = await (supabaseAdmin as any)
        .from('toy_exchanges')
        .select('*')
        .eq('id', data)
        .single();
        
      if (exchangeError) {
        console.error('❌ Error fetching created exchange:', exchangeError);
        return {
          success: false,
          orderType: orderAnalysis.orderType,
          operationType: orderAnalysis.operationType,
          scheduledDate: '',
          timeSlot: '',
          error: exchangeError.message
        };
      }
      
      console.log('✅ Exchange scheduled successfully:', {
        exchangeId: exchange.id,
        type: exchange.exchange_type,
        date: exchange.scheduled_date,
        timeSlot: exchange.scheduled_time_slot
      });
      
      return {
        success: true,
        exchangeId: exchange.id,
        orderType: orderAnalysis.orderType,
        operationType: exchange.exchange_type,
        scheduledDate: exchange.scheduled_date,
        timeSlot: exchange.scheduled_time_slot
      };
      
    } catch (error: any) {
      console.error('💥 Failed to process order:', error);
      return {
        success: false,
        orderType: 'UNKNOWN',
        operationType: 'UNKNOWN',
        scheduledDate: '',
        timeSlot: '',
        error: error.message
      };
    }
  }
  
  /**
   * Analyze order to understand context and requirements
   */
  static async analyzeOrder(orderId: string): Promise<OrderAnalysis> {
    try {
      // Get order details with customer information
      const { data: order, error } = await supabaseAdmin
        .from('rental_orders')
        .select(`
          *,
          custom_users!inner(phone, full_name, zip_code)
        `)
        .eq('id', orderId)
        .single();
        
      if (error || !order) {
        throw new Error(`Order not found: ${error?.message || 'Unknown error'}`);
      }
      
      // Determine order classification
      const orderType = this.classifyOrderType(order);
      
      // Get customer's current toys
      const currentToys = await this.getCurrentToys(order.user_id);
      
      // Get pincode assignment
      const pincode = order.shipping_address?.pincode || order.custom_users.zip_code;
      const pincodeInfo = await this.getPincodeAssignment(pincode);
      
      // Determine operation type
      const operationType = this.determineOperationType(order, currentToys);
      
      return {
        orderId,
        orderType,
        subscriptionPlan: order.subscription_plan || 'discovery-delight',
        cycleNumber: order.cycle_number || 1,
        customerId: order.user_id,
        customerName: order.custom_users.full_name || 'Unknown Customer',
        customerPhone: order.custom_users.phone || '',
        customerAddress: order.shipping_address,
        pincode,
        assignedDay: pincodeInfo?.pickup_day || 'monday',
        currentToys,
        newToys: order.toys_data || [],
        isPauseOrder: order.is_pause_order || false,
        isResumeOrder: order.is_resume_order || false,
        operationType
      };
    } catch (error: any) {
      console.error('❌ Error analyzing order:', error);
      throw error;
    }
  }
  
  /**
   * Classify order type based on order context
   */
  private static classifyOrderType(order: any): 'SUB' | 'QU' | 'REGULAR' {
    // SUB = Subscription renewal orders
    if (order.order_type === 'subscription' && order.cycle_number > 1) {
      return 'SUB';
    }
    
    // QU = Queue orders (monthly cycle within subscription)
    if (order.order_type === 'queue' || order.queue_order_type) {
      return 'QU';
    }
    
    // REGULAR = First-time orders or one-time orders
    return 'REGULAR';
  }
  
  /**
   * Determine what type of operation is needed
   */
  private static determineOperationType(order: any, currentToys: any[]): 'EXCHANGE' | 'PICKUP_ONLY' | 'DISPATCH_ONLY' | 'FIRST_DELIVERY' {
    // Pause order = Pickup only
    if (order.is_pause_order) {
      return 'PICKUP_ONLY';
    }
    
    // Resume order = Dispatch only
    if (order.is_resume_order) {
      return 'DISPATCH_ONLY';
    }
    
    // First order = Dispatch only
    if (order.cycle_number === 1) {
      return 'FIRST_DELIVERY';
    }
    
    // Regular cycle with current toys = Exchange
    if (currentToys.length > 0) {
      return 'EXCHANGE';
    }
    
    // No current toys = Dispatch only
    return 'DISPATCH_ONLY';
  }
  
  /**
   * Get customer's current toys from active orders
   */
  private static async getCurrentToys(userId: string): Promise<any[]> {
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
   * Get pincode assignment information
   */
  private static async getPincodeAssignment(pincode: string): Promise<{ pickup_day: string } | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('pincode_pickup_schedule')
        .select('pickup_day')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .single();
        
      if (error) {
        console.warn('⚠️ Pincode assignment not found, using default:', pincode);
        return { pickup_day: 'monday' };
      }
      
      return data;
    } catch (error) {
      console.error('❌ Error getting pincode assignment:', error);
      return { pickup_day: 'monday' };
    }
  }
  
  /**
   * CREATE: Schedule new exchange operation manually
   */
  static async createExchange(exchangeData: CreateExchangeData): Promise<string> {
    try {
      console.log('🔄 Creating manual exchange:', exchangeData);
      
      // Get order analysis for context
      const analysis = await this.analyzeOrder(exchangeData.orderId);
      
      // Create exchange record
      const { data: exchange, error } = await supabaseAdmin
        .from('toy_exchanges')
        .insert({
          rental_order_id: exchangeData.orderId,
          exchange_type: exchangeData.exchangeType,
          order_classification: analysis.orderType,
          customer_id: exchangeData.customerId,
          customer_name: analysis.customerName,
          customer_phone: analysis.customerPhone,
          customer_address: analysis.customerAddress,
          pincode: analysis.pincode,
          assigned_day: analysis.assignedDay,
          subscription_plan: analysis.subscriptionPlan,
          cycle_number: analysis.cycleNumber,
          is_pause_order: analysis.isPauseOrder,
          is_resume_order: analysis.isResumeOrder,
          scheduled_date: exchangeData.scheduledDate,
          scheduled_time_slot: exchangeData.timeSlot,
          toys_to_pickup: exchangeData.toysToPickup || analysis.currentToys,
          toys_to_dispatch: exchangeData.toysToDispatch || analysis.newToys,
          pickup_toy_count: (exchangeData.toysToPickup || analysis.currentToys).length,
          dispatch_toy_count: (exchangeData.toysToDispatch || analysis.newToys).length,
          exchange_status: 'scheduled',
          exchange_notes: exchangeData.notes
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error creating exchange:', error);
        throw error;
      }
      
      // Update rental order with exchange information
      await supabaseAdmin
        .from('rental_orders')
        .update({
          exchange_scheduled_date: exchangeData.scheduledDate,
          exchange_type: exchangeData.exchangeType,
          exchange_status: 'scheduled',
          exchange_id: exchange.id,
          requires_pickup: ['EXCHANGE', 'PICKUP_ONLY'].includes(exchangeData.exchangeType),
          requires_dispatch: ['EXCHANGE', 'DISPATCH_ONLY', 'FIRST_DELIVERY'].includes(exchangeData.exchangeType)
        })
        .eq('id', exchangeData.orderId);
      
      // Book the time slot
      await this.bookTimeSlot(analysis.pincode, exchangeData.scheduledDate, exchangeData.timeSlot);
      
      console.log('✅ Exchange created successfully:', exchange.id);
      return exchange.id;
      
    } catch (error: any) {
      console.error('💥 Failed to create exchange:', error);
      throw error;
    }
  }
  
  /**
   * READ: Get exchanges by filters (client-side safe)
   */
  static async getExchanges(filters: ExchangeFilters = {}): Promise<ToyExchange[]> {
    try {
      console.log('🔍 Getting exchanges with filters:', filters);

      // Use regular client for read operations (safe for client-side)
      // Cast to any to bypass type checking since toy_exchanges table might not be in types yet
      let query = (supabase as any)
        .from('toy_exchanges')
        .select('*')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time_slot', { ascending: true });

      // Apply filters
      if (filters.day) {
        query = query.eq('assigned_day', filters.day);
      }
      if (filters.date) {
        query = query.eq('scheduled_date', filters.date);
      }
      if (filters.status) {
        query = query.eq('exchange_status', filters.status);
      }
      if (filters.exchangeType) {
        query = query.eq('exchange_type', filters.exchangeType);
      }
      if (filters.pincode) {
        query = query.eq('pincode', filters.pincode);
      }
      if (filters.subscriptionPlan) {
        query = query.eq('subscription_plan', filters.subscriptionPlan);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching exchanges:', error);
        throw error;
      }

      console.log(`✅ Found ${data?.length || 0} exchanges`);
      return (data || []) as ToyExchange[];

    } catch (error: any) {
      console.error('💥 Failed to get exchanges:', error);
      return [];
    }
  }
  
  /**
   * READ: Get exchange details by ID
   */
  static async getExchangeDetails(exchangeId: string): Promise<ToyExchange | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('toy_exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      if (error) {
        console.error('❌ Error fetching exchange details:', error);
        return null;
      }

      return data as ToyExchange;
    } catch (error) {
      console.error('💥 Failed to get exchange details:', error);
      return null;
    }
  }
  
  /**
   * UPDATE: Update exchange status and details
   */
  static async updateExchangeStatus(
    exchangeId: string,
    status: ToyExchange['exchange_status'],
    completionData?: ExchangeCompletionData
  ): Promise<boolean> {
    try {
      console.log('🔄 Updating exchange status:', { exchangeId, status });

      const updateData: any = {
        exchange_status: status,
        updated_at: new Date().toISOString()
      };

      // Handle completion data
      if (status === 'completed' && completionData) {
        updateData.actual_exchange_date = completionData.actualDate;
        updateData.actual_exchange_time = completionData.actualTime;
        updateData.toys_actually_collected = completionData.toysCollected;
        updateData.toys_actually_delivered = completionData.toysDelivered;
        updateData.pickup_completed = completionData.pickupCompleted;
        updateData.dispatch_completed = completionData.dispatchCompleted;
        updateData.exchange_notes = completionData.notes;
        updateData.customer_satisfaction = completionData.satisfaction;
        updateData.toys_condition_on_pickup = completionData.toysConditionOnPickup;
        updateData.toys_condition_on_dispatch = completionData.toysConditionOnDispatch;
      }

      const { error } = await supabaseAdmin
        .from('toy_exchanges')
        .update(updateData)
        .eq('id', exchangeId);

      if (error) {
        console.error('❌ Error updating exchange status:', error);
        return false;
      }

      // Update related rental order status for all status changes
      await this.updateRelatedOrderStatus(exchangeId, status);

      // 🔄 CRITICAL: Sync with subscription_management table
      await this.syncExchangeStatusToSubscriptionManagement(exchangeId, status, completionData);

      console.log('✅ Exchange status updated successfully');
      return true;

    } catch (error: any) {
      console.error('💥 Failed to update exchange status:', error);
      return false;
    }
  }
  
  /**
   * UPDATE: Reschedule exchange to new date/time
   */
  static async rescheduleExchange(
    exchangeId: string, 
    newDate: string, 
    newTimeSlot: string,
    reason?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 Rescheduling exchange:', { exchangeId, newDate, newTimeSlot });
      
      // Get current exchange details
      const currentExchange = await this.getExchangeDetails(exchangeId);
      if (!currentExchange) {
        throw new Error('Exchange not found');
      }
      
      // Release old time slot
      await this.releaseTimeSlot(
        currentExchange.pincode, 
        currentExchange.scheduled_date, 
        currentExchange.scheduled_time_slot
      );
      
      // Book new time slot
      const slotBooked = await this.bookTimeSlot(currentExchange.pincode, newDate, newTimeSlot);
      if (!slotBooked) {
        throw new Error('New time slot not available');
      }
      
      // Update exchange record
      const { error } = await supabaseAdmin
        .from('toy_exchanges')
        .update({
          scheduled_date: newDate,
          scheduled_time_slot: newTimeSlot,
          exchange_status: 'rescheduled',
          exchange_notes: reason ? `Rescheduled: ${reason}` : 'Rescheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', exchangeId);
        
      if (error) {
        console.error('❌ Error rescheduling exchange:', error);
        return false;
      }
      
      console.log('✅ Exchange rescheduled successfully');
      return true;
      
    } catch (error: any) {
      console.error('💥 Failed to reschedule exchange:', error);
      return false;
    }
  }
  
  /**
   * DELETE: Cancel exchange operation
   */
  static async cancelExchange(exchangeId: string, reason: string): Promise<boolean> {
    try {
      console.log('🔄 Cancelling exchange:', { exchangeId, reason });
      
      // Get exchange details to release time slot
      const exchange = await this.getExchangeDetails(exchangeId);
      if (!exchange) {
        throw new Error('Exchange not found');
      }
      
      // Release time slot
      await this.releaseTimeSlot(exchange.pincode, exchange.scheduled_date, exchange.scheduled_time_slot);
      
      // Update exchange status
      const { error } = await supabaseAdmin
        .from('toy_exchanges')
        .update({
          exchange_status: 'cancelled',
          exchange_notes: `Cancelled: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', exchangeId);
        
      if (error) {
        console.error('❌ Error cancelling exchange:', error);
        return false;
      }
      
      // Update related rental order
      await supabaseAdmin
        .from('rental_orders')
        .update({
          exchange_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('exchange_id', exchangeId);
      
      console.log('✅ Exchange cancelled successfully');
      return true;
      
    } catch (error: any) {
      console.error('💥 Failed to cancel exchange:', error);
      return false;
    }
  }
  
  /**
   * Get exchanges by day and date
   */
  static async getExchangesByDay(day: string, date: string): Promise<ToyExchange[]> {
    return this.getExchanges({ day, date });
  }
  
  /**
   * Get exchanges by pincode
   */
  static async getExchangesByPincode(pincode: string, date?: string): Promise<ToyExchange[]> {
    const filters: ExchangeFilters = { pincode };
    if (date) filters.date = date;
    return this.getExchanges(filters);
  }
  
  /**
   * Get pause requests (pickup only operations)
   */
  static async getPauseRequests(): Promise<ToyExchange[]> {
    return this.getExchanges({ 
      exchangeType: 'PICKUP_ONLY',
      status: 'scheduled'
    });
  }
  
  /**
   * Get resume requests (dispatch only operations)
   */
  static async getResumeRequests(): Promise<ToyExchange[]> {
    return this.getExchanges({ 
      exchangeType: 'DISPATCH_ONLY',
      status: 'scheduled'
    });
  }
  
  /**
   * Get available time slots for a pincode and date
   */
  static async getAvailableTimeSlots(pincode: string, date: string): Promise<string[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exchange_capacity')
        .select('available_time_slots, booked_time_slots')
        .eq('pincode', pincode)
        .eq('service_date', date)
        .single();
        
      if (error || !data) {
        // Return default time slots if no capacity record exists
        return ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
      }
      
      const availableSlots = data.available_time_slots || [];
      const bookedSlots = data.booked_time_slots || [];
      
      // Filter out booked slots
      return availableSlots.filter((slot: string) => !bookedSlots.includes(slot));
      
    } catch (error) {
      console.error('❌ Error getting available time slots:', error);
      return ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00'];
    }
  }
  
  /**
   * Book a time slot for exchange
   */
  private static async bookTimeSlot(pincode: string, date: string, timeSlot: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .rpc('book_time_slot', { 
          p_pincode: pincode, 
          p_date: date, 
          p_time_slot: timeSlot 
        });
        
      return !error && data;
    } catch (error) {
      console.error('❌ Error booking time slot:', error);
      return false;
    }
  }
  
  /**
   * Release a time slot
   */
  private static async releaseTimeSlot(pincode: string, date: string, timeSlot: string): Promise<boolean> {
    try {
      // Get current booked slots
      const { data: capacity, error: getError } = await supabaseAdmin
        .from('exchange_capacity')
        .select('booked_time_slots')
        .eq('pincode', pincode)
        .eq('service_date', date)
        .single();
        
      if (getError || !capacity) {
        return false;
      }
      
      // Remove the time slot from booked slots
      const bookedSlots = capacity.booked_time_slots || [];
      const updatedSlots = bookedSlots.filter((slot: string) => slot !== timeSlot);
      
      // Update capacity record
      const { error } = await supabaseAdmin
        .from('exchange_capacity')
        .update({
          booked_time_slots: updatedSlots,
          current_exchanges_count: Math.max(0, (capacity.current_exchanges_count || 1) - 1),
          updated_at: new Date().toISOString()
        })
        .eq('pincode', pincode)
        .eq('service_date', date);
        
      return !error;
    } catch (error) {
      console.error('❌ Error releasing time slot:', error);
      return false;
    }
  }
  
  /**
   * Update related rental order status when exchange status changes
   */
  private static async updateRelatedOrderStatus(exchangeId: string, exchangeStatus?: ToyExchange['exchange_status']): Promise<void> {
    try {
      // Get exchange details
      const exchange = await this.getExchangeDetails(exchangeId);
      if (!exchange) return;

      const updateData: any = {
        exchange_status: exchangeStatus || exchange.exchange_status,
        updated_at: new Date().toISOString()
      };

      // Only update order status for completed exchanges
      if (exchangeStatus === 'completed') {
        // Determine new order status based on exchange type
        let newOrderStatus = 'active';

        if (exchange.exchange_type === 'PICKUP_ONLY') {
          newOrderStatus = 'returned'; // Pause completed
        } else if (exchange.exchange_type === 'DISPATCH_ONLY' || exchange.exchange_type === 'FIRST_DELIVERY') {
          newOrderStatus = 'delivered'; // Dispatch completed
        } else if (exchange.exchange_type === 'EXCHANGE') {
          newOrderStatus = 'active'; // Exchange completed, new cycle active
        }

        updateData.status = newOrderStatus;
        updateData.toys_delivered_count = exchange.dispatch_toy_count;
        updateData.toys_returned_count = exchange.pickup_toy_count;
      }

      // Update rental order
      await (supabaseAdmin as any)
        .from('rental_orders')
        .update(updateData)
        .eq('id', exchange.rental_order_id);

      console.log('✅ Updated rental order status:', {
        orderId: exchange.rental_order_id,
        exchangeStatus: exchangeStatus,
        orderStatus: updateData.status
      });

    } catch (error) {
      console.error('❌ Error updating related order status:', error);
    }
  }

  /**
   * 🔄 CRITICAL: Sync exchange status to subscription_management table
   */
  private static async syncExchangeStatusToSubscriptionManagement(
    exchangeId: string,
    status: ToyExchange['exchange_status'],
    completionData?: ExchangeCompletionData
  ): Promise<void> {
    try {
      console.log('🔄 Syncing exchange status to subscription_management:', { exchangeId, status });

      // Get exchange details
      const exchange = await this.getExchangeDetails(exchangeId);
      if (!exchange) {
        console.warn('⚠️ Exchange not found for sync:', exchangeId);
        return;
      }

      // Find the related subscription_management entry
      const { data: subscriptionMgmt, error: findError } = await (supabaseAdmin as any)
        .from('subscription_management')
        .select('*')
        .eq('order_id', exchange.rental_order_id)
        .eq('cycle_number', exchange.cycle_number)
        .single();

      if (findError || !subscriptionMgmt) {
        console.warn('⚠️ No subscription_management entry found for sync:', {
          orderId: exchange.rental_order_id,
          cycleNumber: exchange.cycle_number,
          error: findError?.message
        });
        return;
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Handle different exchange statuses
      if (status === 'scheduled') {
        // Exchange scheduled
        updateData.delivery_status = 'scheduled';
        updateData.delivery_scheduled_date = exchange.scheduled_date;

      } else if (status === 'completed') {
        // Exchange completed - update delivery and toy possession
        if (exchange.exchange_type === 'EXCHANGE' || exchange.exchange_type === 'DISPATCH_ONLY' || exchange.exchange_type === 'FIRST_DELIVERY') {
          updateData.delivery_status = 'delivered';
          updateData.delivery_actual_date = completionData?.actualDate || exchange.actual_exchange_date || new Date().toISOString().split('T')[0];

          // Update toys for dispatch operations
          if (exchange.exchange_type === 'EXCHANGE') {
            updateData.selected_toys = exchange.toys_to_dispatch || [];
            updateData.toys_count = (exchange.toys_to_dispatch || []).length;
            updateData.toys_selected_at = new Date().toISOString();
          } else if (exchange.exchange_type === 'FIRST_DELIVERY') {
            updateData.selected_toys = exchange.toys_to_dispatch || [];
            updateData.toys_count = (exchange.toys_to_dispatch || []).length;
            updateData.toys_selected_at = new Date().toISOString();
            updateData.cycle_status = 'active'; // First delivery activates the cycle
          }
        }

        // Handle pickup operations (return toys)
        if (exchange.exchange_type === 'EXCHANGE' || exchange.exchange_type === 'PICKUP_ONLY') {
          if (exchange.exchange_type === 'PICKUP_ONLY') {
            updateData.selected_toys = [];
            updateData.toys_count = 0;
            // For pause orders, mark cycle as completed
            if (exchange.is_pause_order) {
              updateData.cycle_status = 'completed';
            }
          }
        }

        // Close selection window after exchange
        if (exchange.exchange_type === 'EXCHANGE') {
          updateData.selection_window_status = 'closed';
        }

      } else if (status === 'cancelled') {
        // Exchange cancelled
        updateData.delivery_status = 'cancelled';

      } else if (status === 'failed') {
        // Exchange failed
        updateData.delivery_status = 'failed';
      }

      // Apply the updates
      const { error: updateError } = await (supabaseAdmin as any)
        .from('subscription_management')
        .update(updateData)
        .eq('id', subscriptionMgmt.id);

      if (updateError) {
        console.error('❌ Error syncing to subscription_management:', updateError);
      } else {
        console.log('✅ Successfully synced exchange status to subscription_management:', {
          subscriptionMgmtId: subscriptionMgmt.id,
          updates: updateData
        });
      }

    } catch (error: any) {
      console.error('💥 Failed to sync exchange status to subscription_management:', error);
      // Don't throw - this is a secondary operation that shouldn't break the main flow
    }
  }

  /**
   * 🔄 Sync exchange scheduling to subscription_management table
   */
  private static async syncExchangeSchedulingToSubscriptionManagement(
    exchangeId: string,
    schedulingData: {
      orderId: string;
      scheduledDate: string;
      timeSlot: string;
      exchangeType: string;
    }
  ): Promise<void> {
    try {
      console.log('🔄 Syncing exchange scheduling to subscription_management:', { exchangeId, schedulingData });

      // Find the related subscription_management entry
      const { data: subscriptionMgmt, error: findError } = await (supabaseAdmin as any)
        .from('subscription_management')
        .select('*')
        .eq('order_id', schedulingData.orderId)
        .single();

      if (findError || !subscriptionMgmt) {
        console.warn('⚠️ No subscription_management entry found for scheduling sync:', {
          orderId: schedulingData.orderId,
          error: findError?.message
        });
        return;
      }

      const updateData: any = {
        delivery_status: 'scheduled',
        delivery_scheduled_date: schedulingData.scheduledDate,
        updated_at: new Date().toISOString()
      };

      // Add tracking number if available in scheduling data
      if (schedulingData.timeSlot) {
        updateData.tracking_number = `${schedulingData.timeSlot}`;
      }

      // Apply the updates
      const { error: updateError } = await (supabaseAdmin as any)
        .from('subscription_management')
        .update(updateData)
        .eq('id', subscriptionMgmt.id);

      if (updateError) {
        console.error('❌ Error syncing scheduling to subscription_management:', updateError);
      } else {
        console.log('✅ Successfully synced exchange scheduling to subscription_management:', {
          subscriptionMgmtId: subscriptionMgmt.id,
          updates: updateData
        });
      }

    } catch (error: any) {
      console.error('💥 Failed to sync exchange scheduling to subscription_management:', error);
      // Don't throw - this is a secondary operation that shouldn't break the main flow
    }
  }
  
  /**
   * Get exchange statistics for dashboard
   */
  static async getExchangeStatistics(date?: string): Promise<{
    totalExchanges: number;
    completedExchanges: number;
    pendingExchanges: number;
    failedExchanges: number;
    exchangesByType: Record<string, number>;
    exchangesByPlan: Record<string, number>;
  }> {
    try {
      const filters: ExchangeFilters = {};
      if (date && date !== 'all') filters.date = date;

      const exchanges = await this.getExchanges(filters);

      const stats = {
        totalExchanges: exchanges.length,
        completedExchanges: exchanges.filter(e => e.exchange_status === 'completed').length,
        pendingExchanges: exchanges.filter(e => ['scheduled', 'confirmed'].includes(e.exchange_status)).length,
        failedExchanges: exchanges.filter(e => e.exchange_status === 'failed').length,
        exchangesByType: {} as Record<string, number>,
        exchangesByPlan: {} as Record<string, number>
      };

      // Count by exchange type
      exchanges.forEach(exchange => {
        stats.exchangesByType[exchange.exchange_type] = (stats.exchangesByType[exchange.exchange_type] || 0) + 1;
        stats.exchangesByPlan[exchange.subscription_plan] = (stats.exchangesByPlan[exchange.subscription_plan] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Error getting exchange statistics:', error);
      return {
        totalExchanges: 0,
        completedExchanges: 0,
        pendingExchanges: 0,
        failedExchanges: 0,
        exchangesByType: {},
        exchangesByPlan: {}
      };
    }
  }
  
  /**
   * Bulk update multiple exchanges
   */
  static async bulkUpdateExchanges(
    exchangeIds: string[], 
    updates: Partial<ToyExchange>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };
    
    for (const exchangeId of exchangeIds) {
      try {
        const { error } = await supabaseAdmin
          .from('toy_exchanges')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', exchangeId);
          
        if (error) {
          result.failed++;
          result.errors.push(`Exchange ${exchangeId}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Exchange ${exchangeId}: ${error.message}`);
      }
    }
    
    console.log(`✅ Bulk update completed: ${result.success} success, ${result.failed} failed`);
    return result;
  }
  
  /**
   * Create exchange operation from customer data (for manual creation from dashboard)
   */
  static async createExchangeFromCustomer(customerId: string, orderId?: string): Promise<{
    success: boolean;
    exchangeId?: string;
    exchange_type: string;
    message: string;
  }> {
    try {
      console.log('🔄 Creating exchange from customer data:', { customerId, orderId });

      // Get customer's complete order history
      const { data: customerOrders, error: historyError } = await (supabaseAdmin as any)
        .from('rental_orders')
        .select('id, created_at, cycle_number, order_type, is_pause_order, is_resume_order, subscription_plan, toys_data, shipping_address, status')
        .eq('user_id', customerId)
        .order('created_at', { ascending: true });

      if (historyError) {
        throw new Error(`Failed to get customer history: ${historyError.message}`);
      }

      if (!customerOrders || customerOrders.length === 0) {
        throw new Error('No orders found for customer');
      }

      // Get customer details
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('custom_users')
        .select('phone, first_name, last_name, zip_code')
        .eq('id', customerId)
        .single();

      if (customerError) {
        throw new Error(`Failed to get customer details: ${customerError.message}`);
      }

      // Determine which order to use for exchange creation
      let targetOrder = orderId ?
        customerOrders.find(o => o.id === orderId) :
        customerOrders[customerOrders.length - 1]; // Use most recent order

      if (!targetOrder) {
        throw new Error('Target order not found');
      }

      // Calculate actual cycle number based on subscription history
      const subscriptionOrders = customerOrders
        .filter(o => o.order_type === 'subscription' && !o.is_pause_order && !o.is_resume_order);

      const actualCycleNumber = subscriptionOrders.length;

      // Determine exchange type based on customer history and order
      let exchangeType: 'EXCHANGE' | 'PICKUP_ONLY' | 'DISPATCH_ONLY' | 'FIRST_DELIVERY' = 'FIRST_DELIVERY';

      if (targetOrder.is_pause_order) {
        exchangeType = 'PICKUP_ONLY';
      } else if (targetOrder.is_resume_order) {
        exchangeType = 'DISPATCH_ONLY';
      } else if (actualCycleNumber === 1) {
        exchangeType = 'FIRST_DELIVERY';
      } else {
        // Check if customer has previous toys (from earlier cycles)
        const hasPreviousToys = actualCycleNumber > 1;
        exchangeType = hasPreviousToys ? 'EXCHANGE' : 'DISPATCH_ONLY';
      }

      // Get pincode assignment
      const pincode = targetOrder.shipping_address?.pincode || customer.zip_code || '560001';
      const pincodeInfo = await this.getPincodeAssignment(pincode);

      // Calculate next available date for the assigned day
      const scheduledDate = await this.getNextAvailableDate(pincode, pincodeInfo?.pickup_day || 'monday');

      // Get available time slots and pick the first one
      const availableSlots = await this.getAvailableTimeSlots(pincode, scheduledDate);
      const timeSlot = availableSlots.length > 0 ? availableSlots[0] : '10:00-12:00';

      // Prepare toy data
      const toysToPickup = exchangeType === 'EXCHANGE' || exchangeType === 'PICKUP_ONLY' ?
        this.generatePreviousToys(actualCycleNumber) : [];

      const toysToDispatch = exchangeType === 'EXCHANGE' || exchangeType === 'DISPATCH_ONLY' || exchangeType === 'FIRST_DELIVERY' ?
        (targetOrder.toys_data || []) : [];

      // Create exchange record
      const { data: exchange, error: createError } = await (supabaseAdmin as any)
        .from('toy_exchanges')
        .insert({
          rental_order_id: targetOrder.id,
          exchange_type: exchangeType,
          order_classification: targetOrder.order_type === 'subscription' && actualCycleNumber > 1 ? 'SUB' :
                               targetOrder.order_type === 'queue' ? 'QU' : 'REGULAR',
          customer_id: customerId,
          customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer',
          customer_phone: customer.phone || '',
          customer_address: targetOrder.shipping_address || {},
          pincode: pincode,
          assigned_day: pincodeInfo?.pickup_day || 'monday',
          subscription_plan: targetOrder.subscription_plan || 'discovery-delight',
          cycle_number: actualCycleNumber,
          is_pause_order: targetOrder.is_pause_order || false,
          is_resume_order: targetOrder.is_resume_order || false,
          scheduled_date: scheduledDate,
          scheduled_time_slot: timeSlot,
          toys_to_pickup: toysToPickup,
          toys_to_dispatch: toysToDispatch,
          pickup_toy_count: toysToPickup.length,
          dispatch_toy_count: toysToDispatch.length,
          exchange_status: 'scheduled',
          estimated_duration_minutes: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create exchange: ${createError.message}`);
      }

      // Update the rental order with exchange reference
      await (supabaseAdmin as any)
        .from('rental_orders')
        .update({
          exchange_id: exchange.id,
          exchange_type: exchangeType,
          exchange_status: 'scheduled',
          exchange_scheduled_date: scheduledDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetOrder.id);

      // Book the time slot
      await this.bookTimeSlot(pincode, scheduledDate, timeSlot);

      // 🔄 CRITICAL: Sync scheduling info to subscription_management table
      await this.syncExchangeSchedulingToSubscriptionManagement(exchange.id, {
        orderId: targetOrder.id,
        scheduledDate,
        timeSlot,
        exchangeType
      });

      console.log('✅ Exchange created from customer data:', {
        exchangeId: exchange.id,
        type: exchangeType,
        customer: customerId,
        date: scheduledDate,
        timeSlot: timeSlot
      });

      return {
        success: true,
        exchangeId: exchange.id,
        exchange_type: exchangeType,
        message: `Exchange operation created successfully: ${exchangeType} for ${scheduledDate} at ${timeSlot}`
      };

    } catch (error: any) {
      console.error('💥 Failed to create exchange from customer:', error);
      return {
        success: false,
        exchange_type: 'UNKNOWN',
        message: error.message || 'Failed to create exchange operation'
      };
    }
  }

  /**
   * Generate previous toys for exchange operations (simplified version)
   */
  private static generatePreviousToys(cycleNumber: number): any[] {
    if (cycleNumber <= 1) return [];

    // Generate 2-4 previous toys based on cycle
    const toyCount = Math.min(cycleNumber, 4);
    const previousToys = [];

    const toyNames = [
      'Building Blocks Set', 'Wooden Puzzle', 'Educational Flash Cards',
      'Ride-on Toy Car', 'Stacking Rings', 'Shape Sorter', 'Musical Instruments'
    ];

    for (let i = 0; i < toyCount; i++) {
      previousToys.push({
        toy_id: `prev-toy-${cycleNumber}-${i + 1}`,
        name: toyNames[i % toyNames.length],
        category: 'educational',
        quantity: 1,
        condition: 'good'
      });
    }

    return previousToys;
  }

  /**
   * Get next available date for a pincode/day combination
   */
  static async getNextAvailableDate(pincode: string, assignedDay: string): Promise<string> {
    try {
      // Calculate next occurrence of the assigned day
      const today = new Date();
      const dayMap: Record<string, number> = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };

      const targetDayOfWeek = dayMap[assignedDay.toLowerCase()];
      const currentDayOfWeek = today.getDay();

      let daysToAdd = targetDayOfWeek - currentDayOfWeek;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week
      }

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysToAdd);

      return nextDate.toISOString().split('T')[0];
    } catch (error) {
      console.error('❌ Error calculating next available date:', error);
      // Fallback to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
  }
}