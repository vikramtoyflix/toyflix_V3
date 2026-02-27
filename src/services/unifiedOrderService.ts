import { supabase } from '@/integrations/supabase/client';
import { CycleIntegrationService } from './cycleIntegrationService';
import { QueueOrderService, QueueOrderData } from './queueOrderService';
import { OrderService } from './orderService';
import { validateToySelectionForOrder } from '@/utils/stockValidation';

export type OrderContext = 'current_cycle' | 'next_cycle' | 'new_subscription';

export interface UnifiedOrderData {
  userId: string;
  subscription_plan?: string;
  subscription_status?: string;
  age_group: string;
  rental_start_date?: string;
  rental_end_date?: string;
  cycle_number?: number;
  total_amount: number;
  subscription_category?: string;
  selectedToys?: any[];
  planId?: string;
  deliveryInstructions?: string;
  shippingAddress?: any;
  baseAmount?: number;
  gstAmount?: number;
  couponDiscount?: number;
  appliedCoupon?: string;
  paymentId?: string;
  razorpayOrderId?: string;
}

export interface UnifiedOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  message: string;
  error?: string;
  data?: any;
  context: OrderContext;
}

export class UnifiedOrderService {
  
  /**
   * Determine the appropriate order context based on user's current subscription status
   */
  static async determineOrderContext(userId: string, requestType?: 'admin_create' | 'user_selection'): Promise<OrderContext> {
    try {
      console.log('🔍 Determining order context for user:', userId, 'requestType:', requestType);
      
      // 🎯 CRITICAL FIX: Check actual subscription status first, not just cycle simulation
      const hasActiveSubscription = await this.hasActiveSubscription(userId);
      console.log('📊 User has active subscription:', hasActiveSubscription);
      
      if (!hasActiveSubscription) {
        // No active subscription - always create new subscription
        console.log('🎯 No active subscription found - creating new subscription');
        return 'new_subscription';
      }
      
      // User has active subscription - now check cycle status
      const currentCycle = await CycleIntegrationService.getCurrentUserCycle(userId);
      console.log('🔄 Current cycle status:', {
        hasCycle: !!currentCycle,
        isSimulation: currentCycle?.is_simulation,
        canUpdateToys: currentCycle?.can_update_toys,
        cycleNumber: currentCycle?.cycle_number
      });
      
      if (!currentCycle || currentCycle.is_simulation) {
        // No real cycle data or simulation mode - but user has active subscription
        // This means we should create queue orders for existing subscribers
        console.log('🎯 Has active subscription but no real cycle data - creating queue order');
        return 'next_cycle';
      }
      
      // Has active subscription AND real cycle data - determine modification type
      if (requestType === 'admin_create') {
        // Admin creating order for user with active subscription - create queue order
        console.log('🎯 Admin creating order for user with active subscription - creating queue order');
        return 'next_cycle';
      }
      
      // User selection - check if they can update current cycle
      if (currentCycle.can_update_toys) {
        console.log('🎯 User can update current cycle');
        return 'current_cycle';
      } else {
        // Selection window closed - queue for next cycle
        console.log('🎯 Selection window closed - creating queue order');
        return 'next_cycle';
      }
      
    } catch (error) {
      console.error('❌ Error determining order context:', error);
      // Default to new subscription on error for safety
      return 'new_subscription';
    }
  }

  /**
   * Create or update order based on context
   */
  static async createOrUpdateOrder(
    orderData: UnifiedOrderData, 
    context?: OrderContext,
    requestType?: 'admin_create' | 'user_selection'
  ): Promise<UnifiedOrderResponse> {
    try {
      // Determine context if not provided
      const orderContext = context || await this.determineOrderContext(orderData.userId, requestType);
      
      console.log('🎯 UnifiedOrderService: Processing order with context:', orderContext, {
        userId: orderData.userId,
        requestType,
        hasSelectedToys: !!orderData.selectedToys?.length
      });

      // Validate toy stock availability before processing any order
      if (orderData.selectedToys && orderData.selectedToys.length > 0) {
        console.log('🔍 UnifiedOrderService: Validating toy stock...');
        
        const toyIds = orderData.selectedToys.map(toy => 
          typeof toy === 'string' ? toy : toy.id || toy.toy_id
        ).filter(Boolean);
        
        if (toyIds.length > 0) {
          const stockValidation = await validateToySelectionForOrder(toyIds);
          
          if (!stockValidation.isValid) {
            const outOfStockList = stockValidation.outOfStockToys.join(', ');
            console.error('❌ UnifiedOrderService: Stock validation failed:', outOfStockList);
            
            return {
              success: false,
              message: `Cannot process order: The following toys are out of stock: ${outOfStockList}`,
              error: `Out of stock toys: ${outOfStockList}`,
              context: orderContext
            };
          }
          
          console.log('✅ UnifiedOrderService: All toys are in stock');
        }
      }

      switch (orderContext) {
        case 'current_cycle':
          return await this.updateCurrentCycle(orderData);
          
        case 'next_cycle':
          return await this.createQueueOrder(orderData);
          
        case 'new_subscription':
          return await this.createNewSubscription(orderData);
          
        default:
          throw new Error('Invalid order context');
      }
      
    } catch (error: any) {
      console.error('❌ UnifiedOrderService error:', error);
      return {
        success: false,
        message: `Failed to process order: ${error.message}`,
        error: error.message,
        context: context || 'new_subscription'
      };
    }
  }

  /**
   * Update existing cycle toys
   */
  private static async updateCurrentCycle(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse> {
    try {
      const currentCycle = await CycleIntegrationService.getCurrentUserCycle(orderData.userId);
      
      if (!currentCycle) {
        throw new Error('No active cycle found for update');
      }

      // Update cycle toys
      const result = await CycleIntegrationService.updateCycleToys(
        currentCycle.cycle_id,
        orderData.selectedToys || [],
        orderData.userId
      );

      // Update cycle metadata if provided
      if (orderData.subscription_plan || orderData.age_group || orderData.total_amount) {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (orderData.subscription_plan) updateData.subscription_plan = orderData.subscription_plan;
        if (orderData.age_group) updateData.age_group = orderData.age_group;
        if (orderData.total_amount) updateData.total_amount = orderData.total_amount;

        await supabase
          .from('subscription_management' as any)
          .update(updateData)
          .eq('cycle_id', currentCycle.cycle_id);
      }

      return {
        success: true,
        orderId: currentCycle.cycle_id,
        message: `✅ Current cycle updated with ${orderData.selectedToys?.length || 0} toys`,
        context: 'current_cycle',
        data: result
      };

    } catch (error: any) {
      console.error('❌ Error updating current cycle:', error);
      throw error;
    }
  }

  /**
   * Create queue order for next cycle
   */
  private static async createQueueOrder(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse> {
    try {
      // Get current subscription info for queue order
      const currentCycle = await CycleIntegrationService.getCurrentUserCycle(orderData.userId);
      
      // Try to find the actual subscription ID from the user's active subscriptions
      let actualSubscriptionId = null;
      try {
        const { data: activeSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', orderData.userId)
          .eq('status', 'active')
          .limit(1)
          .single();
        
        if (activeSubscription) {
          actualSubscriptionId = activeSubscription.id;
        }
      } catch (error) {
        console.warn('No active subscription found in subscriptions table:', error);
        // This is OK - we'll proceed with null
      }
      
      const queueOrderData: QueueOrderData = {
        userId: orderData.userId,
        originalSubscriptionId: actualSubscriptionId, // Use actual subscription ID or null
        selectedToys: orderData.selectedToys || [],
        queueOrderType: 'next_cycle',
        currentPlanId: orderData.planId || orderData.subscription_plan || 'silver-pack',
        ageGroup: orderData.age_group,
        totalAmount: orderData.total_amount,
        baseAmount: orderData.baseAmount || Math.round(orderData.total_amount / 1.18),
        gstAmount: orderData.gstAmount || Math.round(orderData.total_amount * 0.18 / 1.18),
        couponDiscount: orderData.couponDiscount || 0,
        appliedCoupon: orderData.appliedCoupon,
        paymentId: orderData.paymentId,
        razorpayOrderId: orderData.razorpayOrderId,
        shippingAddress: orderData.shippingAddress || {
          name: 'Admin Created Order',
          phone: 'Contact customer',
          address: 'To be updated'
        },
        deliveryInstructions: orderData.deliveryInstructions,
        cycleNumber: (currentCycle?.cycle_number || 0) + 1
      };

      const result = await QueueOrderService.createQueueOrder(queueOrderData);

      // 🔄 AUTOMATIC EXCHANGE SCHEDULING: Process queue orders for exchange operations
      if (result.success && result.orderId) {
        try {
          console.log('🔄 Processing queue order for automatic exchange scheduling...');

          // Import the IntelligentExchangeService dynamically to avoid circular dependencies
          const { IntelligentExchangeService } = await import('./intelligentExchangeService');

          const exchangeResult = await IntelligentExchangeService.processOrder(result.orderId);

          if (exchangeResult.success) {
            console.log('✅ Automatic exchange scheduled for queue order:', {
              exchangeId: exchangeResult.exchangeId,
              type: exchangeResult.operationType,
              date: exchangeResult.scheduledDate,
              timeSlot: exchangeResult.timeSlot
            });

            // Update the success message to include exchange info
            const exchangeMessage = `Exchange scheduled: ${exchangeResult.operationType} on ${exchangeResult.scheduledDate} at ${exchangeResult.timeSlot}`;
            const finalMessage = `${result.message}\n${exchangeMessage}`;

            return {
              success: result.success,
              orderId: result.orderId,
              orderNumber: result.orderNumber,
              message: finalMessage,
              error: result.error,
              context: 'next_cycle',
              data: {
                ...result.data,
                exchange: {
                  exchangeId: exchangeResult.exchangeId,
                  operationType: exchangeResult.operationType,
                  scheduledDate: exchangeResult.scheduledDate,
                  timeSlot: exchangeResult.timeSlot
                }
              }
            };
          } else {
            console.warn('⚠️ Automatic exchange scheduling failed for queue order:', exchangeResult.error);
            // Don't fail the entire operation - just log the warning
            return {
              success: result.success,
              orderId: result.orderId,
              orderNumber: result.orderNumber,
              message: `${result.message}\n⚠️ Note: Automatic exchange scheduling failed (${exchangeResult.error})`,
              error: result.error,
              context: 'next_cycle',
              data: {
                ...result.data,
                exchangeError: exchangeResult.error
              }
            };
          }

        } catch (exchangeError: any) {
          console.warn('⚠️ Error during automatic exchange scheduling for queue order:', exchangeError.message);
          // Don't fail the entire operation - just log the warning and return success
          return {
            success: result.success,
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            message: `${result.message}\n⚠️ Note: Automatic exchange scheduling encountered an error (${exchangeError.message})`,
            error: result.error,
            context: 'next_cycle',
            data: {
              ...result.data,
              exchangeError: exchangeError.message
            }
          };
        }
      }

      return {
        success: result.success,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        message: result.message,
        error: result.error,
        context: 'next_cycle',
        data: result.data
      };

    } catch (error: any) {
      console.error('❌ Error creating queue order:', error);
      throw error;
    }
  }

  /**
   * Create new subscription (rental_orders entry)
   */
  private static async createNewSubscription(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse> {
    let subscriptionRecord = null;
    let rentalOrderRecord = null;

    try {
      // Generate unique order number
      const orderNumber = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('🎯 Creating new subscription for user:', orderData.userId);

      // 🔧 CRITICAL FIX: Get user's phone number for dashboard visibility
      let userPhone = null;
      try {
        const { data: userProfile, error: userError } = await supabase
          .from('custom_users')
          .select('phone')
          .eq('id', orderData.userId)
          .single();

        if (!userError && userProfile?.phone) {
          userPhone = userProfile.phone;
          console.log('✅ Found user phone for subscription:', userPhone);
        } else {
          console.warn('⚠️ No phone number found for user:', orderData.userId);
        }
      } catch (phoneError) {
        console.warn('⚠️ Error fetching user phone:', phoneError);
      }

      // 🎯 STEP 1: CREATE SUBSCRIPTION RECORD FIRST (FIXED ORDER)
      console.log('📝 Step 1: Creating subscription record...');
      const subscriptionData = {
        user_id: orderData.userId,
        plan_id: orderData.subscription_plan || 'silver-pack',
        status: 'active',
        start_date: orderData.rental_start_date || new Date().toISOString(),
        end_date: orderData.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_start: orderData.rental_start_date || new Date().toISOString(),
        current_period_end: orderData.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        pause_balance: 0,
        auto_renew: true,
        age_group: orderData.age_group
      };

      const { data: subscriptionResult, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (subscriptionError) {
        console.error('❌ Failed to create subscription record:', subscriptionError);
        throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
      }

      subscriptionRecord = subscriptionResult;
      console.log('✅ Subscription record created with ID:', subscriptionRecord.id);

      // 🎯 STEP 2: CREATE RENTAL ORDER WITH PROPER SUBSCRIPTION_ID
      console.log('📝 Step 2: Creating rental order...');
      const rentalOrderData = {
        user_id: orderData.userId,
        user_phone: userPhone,
        order_number: orderNumber,
        subscription_plan: orderData.subscription_plan,
        subscription_status: orderData.subscription_status || 'active',
        age_group: orderData.age_group,
        rental_start_date: orderData.rental_start_date,
        rental_end_date: orderData.rental_end_date,
        cycle_number: orderData.cycle_number || 1,
        total_amount: orderData.total_amount,
        subscription_category: orderData.subscription_category || 'standard',
        status: 'active',
        order_type: 'subscription',
        subscription_id: subscriptionRecord.id, // ✅ CORRECT: Use real subscription ID
        selection_window_status: 'auto',
        manual_selection_control: false,
        selection_window_opened_at: null,
        selection_window_closed_at: null,
        selection_window_notes: 'Admin created subscription',
        toys_data: orderData.selectedToys?.map(toy => ({
          toy_id: toy.id || toy,
          name: toy.name || 'Selected Toy',
          selected_at: new Date().toISOString()
        })) || [],
        toys_delivered_count: orderData.selectedToys?.length || 0,
        created_at: new Date().toISOString()
      };

      const { data: rentalOrderResult, error: rentalOrderError } = await supabase
        .from('rental_orders' as any)
        .insert(rentalOrderData)
        .select()
        .single();

      if (rentalOrderError) {
        console.error('❌ Failed to create rental order:', rentalOrderError);
        throw new Error(`Failed to create rental order: ${rentalOrderError.message}`);
      }

      rentalOrderRecord = rentalOrderResult;
      console.log('✅ Rental order created with ID:', rentalOrderRecord.id);

      // 🎯 STEP 3: CREATE SUBSCRIPTION_MANAGEMENT ENTRY (NOW WITH CORRECT IDs)
      console.log('📝 Step 3: Creating subscription_management entry...');
      const cycleStartDate = new Date(orderData.rental_start_date || new Date());
      const cycleEndDate = new Date(orderData.rental_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      const selectionWindowStart = new Date(cycleStartDate);
      const selectionWindowEnd = new Date(cycleEndDate);

      // Selection window: Days 24-30 of cycle
      selectionWindowStart.setDate(selectionWindowStart.getDate() + 23);
      selectionWindowEnd.setDate(selectionWindowEnd.getDate() - 1);

      const subscriptionManagementData = {
        user_id: orderData.userId,
        order_id: rentalOrderRecord.id, // ✅ CORRECT: Use rental order ID
        subscription_id: subscriptionRecord.id, // ✅ CORRECT: Use real subscription ID
        cycle_number: 1,
        cycle_status: 'active',
        cycle_start_date: cycleStartDate.toISOString().split('T')[0],
        cycle_end_date: cycleEndDate.toISOString().split('T')[0],
        selection_window_start: selectionWindowStart.toISOString().split('T')[0],
        selection_window_end: selectionWindowEnd.toISOString().split('T')[0],
        selection_window_status: 'upcoming',
        selected_toys: orderData.selectedToys || [],
        toys_selected_at: orderData.selectedToys?.length ? new Date().toISOString() : null,
        toys_count: orderData.selectedToys?.length || 0,
        total_toy_value: 0.00,
        delivery_status: 'pending',
        plan_id: orderData.subscription_plan,
        plan_name: this.mapPlanName(orderData.subscription_plan),
        plan_details: {
          age_group: orderData.age_group,
          subscription_category: orderData.subscription_category,
          total_amount: orderData.total_amount
        },
        manual_override: false,
        created_by: orderData.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: managementResult, error: managementError } = await supabase
        .from('subscription_management' as any)
        .insert(subscriptionManagementData)
        .select()
        .single();

      if (managementError) {
        console.error('❌ CRITICAL: Failed to create subscription_management entry:', managementError);
        console.error('❌ Error details:', JSON.stringify(managementError, null, 2));

        // 🚨 CRITICAL FAILURE: Clean up created records and fail the operation
        if (rentalOrderRecord) {
          await supabase.from('rental_orders' as any).delete().eq('id', rentalOrderRecord.id);
        }
        if (subscriptionRecord) {
          await supabase.from('subscriptions').delete().eq('id', subscriptionRecord.id);
        }

        throw new Error(`Failed to create subscription management: ${managementError.message}`);
      }

      console.log('✅ Subscription management entry created with ID:', (managementResult as any).id);

      // 🔄 AUTOMATIC EXCHANGE SCHEDULING: Process the new order for exchange operations
      try {
        console.log('🔄 Processing new subscription for automatic exchange scheduling...');

        // Import the IntelligentExchangeService dynamically to avoid circular dependencies
        const { IntelligentExchangeService } = await import('./intelligentExchangeService');

        const exchangeResult = await IntelligentExchangeService.processOrder(rentalOrderRecord.id);

        if (exchangeResult.success) {
          console.log('✅ Automatic exchange scheduled successfully:', {
            exchangeId: exchangeResult.exchangeId,
            type: exchangeResult.operationType,
            date: exchangeResult.scheduledDate,
            timeSlot: exchangeResult.timeSlot
          });

          // Update the success message to include exchange info
          const exchangeMessage = `Exchange scheduled: ${exchangeResult.operationType} on ${exchangeResult.scheduledDate} at ${exchangeResult.timeSlot}`;
          const finalMessage = `✅ New subscription created with complete cycle tracking and automatic exchange scheduling! Order #${rentalOrderRecord.order_number}\n${exchangeMessage}`;

          return {
            success: true,
            orderId: rentalOrderRecord.id,
            orderNumber: rentalOrderRecord.order_number,
            message: finalMessage,
            context: 'new_subscription',
            data: {
              rentalOrder: rentalOrderRecord,
              subscription: subscriptionRecord,
              subscriptionManagement: managementResult,
              exchange: {
                exchangeId: exchangeResult.exchangeId,
                operationType: exchangeResult.operationType,
                scheduledDate: exchangeResult.scheduledDate,
                timeSlot: exchangeResult.timeSlot
              }
            }
          };
        } else {
          console.warn('⚠️ Automatic exchange scheduling failed:', exchangeResult.error);
          // Don't fail the entire operation - just log the warning
          return {
            success: true,
            orderId: rentalOrderRecord.id,
            orderNumber: rentalOrderRecord.order_number,
            message: `✅ New subscription created with complete cycle tracking! Order #${rentalOrderRecord.order_number}\n⚠️ Note: Automatic exchange scheduling failed (${exchangeResult.error})`,
            context: 'new_subscription',
            data: {
              rentalOrder: rentalOrderRecord,
              subscription: subscriptionRecord,
              subscriptionManagement: managementResult,
              exchangeError: exchangeResult.error
            }
          };
        }

      } catch (exchangeError: any) {
        console.warn('⚠️ Error during automatic exchange scheduling:', exchangeError.message);
        // Don't fail the entire operation - just log the warning and return success
        return {
          success: true,
          orderId: rentalOrderRecord.id,
          orderNumber: rentalOrderRecord.order_number,
          message: `✅ New subscription created with complete cycle tracking! Order #${rentalOrderRecord.order_number}\n⚠️ Note: Automatic exchange scheduling encountered an error (${exchangeError.message})`,
          context: 'new_subscription',
          data: {
            rentalOrder: rentalOrderRecord,
            subscription: subscriptionRecord,
            subscriptionManagement: managementResult,
            exchangeError: exchangeError.message
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Error creating new subscription:', error);
      console.error('❌ Error details:', error.message);

      // Clean up any partially created records
      if (rentalOrderRecord) {
        try {
          await supabase.from('rental_orders' as any).delete().eq('id', rentalOrderRecord.id);
          console.log('🧹 Cleaned up rental order record');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up rental order:', cleanupError);
        }
      }

      if (subscriptionRecord) {
        try {
          await supabase.from('subscriptions').delete().eq('id', subscriptionRecord.id);
          console.log('🧹 Cleaned up subscription record');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up subscription:', cleanupError);
        }
      }

      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const { data: activeSubscriptions, error } = await supabase
        .from('rental_orders' as any)
        .select('id')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')
        .limit(1);

      if (error) {
        console.error('Error checking active subscription:', error);
        return false;
      }

      return activeSubscriptions && activeSubscriptions.length > 0;
    } catch (error) {
      console.error('Error in hasActiveSubscription:', error);
      return false;
    }
  }

  /**
   * Get user's current subscription info
   */
  static async getCurrentSubscriptionInfo(userId: string): Promise<any | null> {
    try {
      const { data: subscription, error } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !subscription) {
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Error getting current subscription info:', error);
      return null;
    }
  }

  /**
   * Helper method to map plan IDs to display names
   */
  private static mapPlanName(planId: string): string {
    const planMap: { [key: string]: string } = {
      'Discovery Delight': 'Discovery Delight',
      'Silver Pack': 'Silver Pack', 
      'Gold Pack PRO': 'Gold Pack PRO',
      'Ride-On Monthly': 'Ride-On Monthly',
      'Books Monthly': 'Books Monthly'
    };
    return planMap[planId] || planId;
  }
} 