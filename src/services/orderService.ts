import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/adminClient';
import { validateToySelectionForOrder } from '@/utils/stockValidation';

export interface CreateOrderData {
  userId: string;
  planId: string;
  selectedToys: any[];
  rideOnToyId?: string;
  ageGroup?: string;
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  couponDiscount: number;
  appliedCoupon?: string;
  deliveryInstructions?: string;
  shippingAddress: any;
  orderType: 'subscription' | 'ride_on';
  paymentId?: string;
  razorpayOrderId?: string;
}

export interface CreateQueueOrderData {
  userId: string;
  originalSubscriptionId: string;
  selectedToys: any[];
  ageGroup?: string;
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  couponDiscount: number;
  appliedCoupon?: string;
  deliveryInstructions?: string;
  shippingAddress: any;
  queueOrderType: 'modification' | 'next_cycle' | 'emergency_change';
  currentPlanId: string;
  paymentId?: string;
  razorpayOrderId?: string;
  cycleNumber?: number;
}

export interface CreatedOrder {
  success?: boolean;
  orderId: string | null;
  orderNumber?: string | null;
  orderItems?: string[];
  message: string;
  error?: string;
  data?: any;
}

export class OrderService {
  /**
   * Create a complete order with order items after successful payment
   */
  static async createOrder(orderData: CreateOrderData): Promise<CreatedOrder> {
    const {
      userId,
      planId,
      selectedToys,
      rideOnToyId,
      ageGroup,
      totalAmount,
      baseAmount,
      gstAmount,
      couponDiscount,
      appliedCoupon,
      deliveryInstructions,
      shippingAddress,
      orderType,
      paymentId,
      razorpayOrderId
    } = orderData;

    try {
      // Step 1: Ensure user exists in custom_users table
      console.log('🔍 Checking if user exists in custom_users:', userId);
      
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('custom_users')
        .select('id, phone, email')
        .eq('id', userId)
        .single();

      if (userCheckError && userCheckError.code === 'PGRST116') {
        // User doesn't exist in custom_users, try to create from current auth context
        console.log('⚠️ User not found in custom_users, creating user record:', userId);
        
        const { error: userCreateError } = await supabaseAdmin
          .from('custom_users')
          .insert({
            id: userId,
            phone: `temp_${userId.slice(0, 8)}`, // Temporary phone if not available
            email: null, // Will be updated when user provides it
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (userCreateError) {
          console.error('❌ Failed to create user in custom_users:', userCreateError);
          throw new Error(`User validation failed: ${userCreateError.message}`);
        }
        
        console.log('✅ User created in custom_users');
      } else if (userCheckError) {
        console.error('❌ Error checking user in custom_users:', userCheckError);
        throw new Error(`User validation failed: ${userCheckError.message}`);
      } else {
        console.log('✅ User exists in custom_users:', existingUser.id);
      }

      // Step 2: Validate toy stock availability
      console.log('🔍 Validating toy stock for order creation...');
      
      if (selectedToys && selectedToys.length > 0) {
        const toyIds = selectedToys.map(toy => toy.id);
        const stockValidation = await validateToySelectionForOrder(toyIds);
        
        if (!stockValidation.isValid) {
          const outOfStockList = stockValidation.outOfStockToys.join(', ');
          console.error('❌ Order validation failed - Out of stock toys:', outOfStockList);
          throw new Error(`Cannot create order: The following toys are out of stock: ${outOfStockList}`);
        }
        
        console.log('✅ All selected toys are in stock');
      }

      // Step 3: Prepare toys data for JSONB storage
      const toysData = orderType === 'ride_on' && rideOnToyId ? 
        [{ 
          toy_id: rideOnToyId, 
          name: 'Ride-on Toy', 
          category: 'ride_on',
          quantity: 1, 
          unit_price: totalAmount,
          total_price: totalAmount,
          returned: false 
        }] :
        selectedToys.map(toy => ({
          toy_id: toy.id,
          name: toy.name,
          category: toy.category,
          image_url: toy.image_url,
          quantity: 1,
          unit_price: toy.rental_price || 0,
          total_price: toy.rental_price || 0,
          returned: false
        }));

      // Step 3: Standardize shipping address for JSONB
      const standardizedAddress = {
        first_name: shippingAddress.first_name || '',
        last_name: shippingAddress.last_name || '',
        phone: shippingAddress.phone || '',
        email: shippingAddress.email || '',
        address_line1: shippingAddress.address_line1 || '',
        address_line2: shippingAddress.apartment || shippingAddress.address_line2 || '',
        city: shippingAddress.city || '',
        state: shippingAddress.state || '',
        postcode: shippingAddress.zip_code || shippingAddress.postcode || '',
        country: shippingAddress.country || 'India',
        latitude: shippingAddress.latitude,
        longitude: shippingAddress.longitude,
        plus_code: shippingAddress.plus_code,
        delivery_instructions: deliveryInstructions || null
      };

      // Step 4: ✅ UNIFIED APPROACH - Single INSERT to rental_orders
      console.log('🔄 Creating unified rental order for user:', userId);
      
      const { data: rentalOrder, error: rentalError } = await supabaseAdmin
        .from('rental_orders' as any)
        .insert({
          // Note: order_number will be auto-generated by database (starts from 30000)
          user_id: userId,
          status: paymentId ? 'delivered' : 'pending',
          order_type: orderType,
          subscription_plan: planId,
          total_amount: totalAmount,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          discount_amount: couponDiscount,
          coupon_code: appliedCoupon,
          payment_status: paymentId ? 'paid' : 'pending',
          payment_method: 'razorpay',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          payment_amount: totalAmount,
          payment_currency: 'INR',
          cycle_number: 1,
          rental_start_date: new Date().toISOString().split('T')[0],
          rental_end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          // 🔒 FIX: Add selection window status defaults for new rental orders
          selection_window_status: 'auto',
          manual_selection_control: false,
          selection_window_opened_at: null,
          selection_window_closed_at: null,
          selection_window_notes: 'Order created via payment flow',
          toys_data: toysData,
          toys_delivered_count: toysData.length,
          toys_returned_count: 0,
          shipping_address: standardizedAddress,
          age_group: ageGroup,
          subscription_category: planId,
          delivery_instructions: deliveryInstructions,
          confirmed_at: paymentId ? new Date().toISOString() : null,
          shipped_at: paymentId ? new Date().toISOString() : null,
          delivered_at: paymentId ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (rentalError) {
        console.error('❌ Error creating rental order:', rentalError);
        throw new Error(`Failed to create rental order: ${rentalError.message}`);
      }

      console.log('✅ Unified rental order created:', rentalOrder.id);

      // Step 5: Create subscription_management entry for cycle tracking (for subscription orders)
      if (orderType === 'subscription') {
        await this.createSubscriptionManagementEntry(rentalOrder.id, userId, planId, ageGroup);
      }

      // Step 6: Store payment information in payment_orders for tracking (optional)
      if (paymentId && razorpayOrderId) {
        try {
          await supabaseAdmin
            .from('payment_orders')
            .insert({
              user_id: userId,
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: paymentId,
              amount: totalAmount,
              currency: 'INR',
              status: 'paid',
              order_type: orderType,
              order_items: {
                rental_order_id: rentalOrder.id,
                plan_id: planId,
                selected_toys: selectedToys,
                ride_on_toy_id: rideOnToyId,
                age_group: ageGroup,
                base_amount: baseAmount,
                gst_amount: gstAmount,
                total_amount: totalAmount,
                applied_coupon: appliedCoupon,
                coupon_discount: couponDiscount,
                delivery_instructions: deliveryInstructions
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          console.log('✅ Payment tracking record created');
        } catch (paymentError) {
          console.error('⚠️ Payment tracking failed (non-critical):', paymentError);
          // Don't throw, rental order creation is more important
        }
      }

      const message = orderType === 'ride_on' 
        ? `Ride-on toy order created successfully! Order #${(rentalOrder as any).order_number}`
        : `Subscription order created successfully! ${toysData.length} toys ordered. Order #${(rentalOrder as any).order_number}`;

      return {
        orderId: rentalOrder.id,
        orderItems: toysData.map(t => t.toy_id),
        message
      };

    } catch (error: any) {
      console.error('❌ Error in createOrder:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Create a free order (when total amount is 0 due to coupon)
   */
  static async createFreeOrder(orderData: CreateOrderData): Promise<CreatedOrder> {
    const { userId, planId, orderType } = orderData;

    try {
      // For free orders, we don't need payment IDs
      const freeOrderData = {
        ...orderData,
        paymentId: undefined,
        razorpayOrderId: undefined
      };

      // Create the order first
      const orderResult = await this.createOrder(freeOrderData);

      // ✅ CRITICAL FIX: For free subscription orders, create subscription and update user status
      if (orderType === 'subscription') {
        console.log('🔄 Creating subscription for free order');
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        const subscriptionMonths = planId === 'quarterly' ? 3 : 
                                  planId === '6_month' ? 6 : 1;
        endDate.setMonth(endDate.getMonth() + subscriptionMonths);

        try {
          // Create subscription record (using the main subscriptions table)
          const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_id: planId,
              status: 'active',
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              current_period_start: startDate.toISOString().split('T')[0],
              current_period_end: endDate.toISOString().split('T')[0],
              auto_renew: false, // Free subscriptions don't auto-renew
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (subError) {
            console.error('❌ Error creating free subscription:', subError);
          } else {
            console.log('✅ Free subscription created:', subscription.id);
          }
        } catch (subscriptionError) {
          console.error('⚠️ Free subscription creation failed (non-critical):', subscriptionError);
        }

                 // ✅ CRITICAL FIX: Update user's subscription_active flag
         try {
           // Map planId to subscription_plan enum
           const subscriptionPlanMap: { [key: string]: 'Discovery Delight' | 'Silver Pack' | 'Gold Pack PRO' } = {
             'discovery-delight': 'Discovery Delight',
             'basic': 'Discovery Delight',
             'monthly': 'Discovery Delight',
             'silver-pack': 'Silver Pack',
             'quarterly': 'Silver Pack',
             '6_month': 'Silver Pack',
             'premium': 'Silver Pack',
             'gold-pack': 'Gold Pack PRO',
             'family': 'Gold Pack PRO'
           };
           
           const mappedPlan = subscriptionPlanMap[planId] || 'Discovery Delight';
           
           const { error: userUpdateError } = await supabaseAdmin
             .from('custom_users')
             .update({
               subscription_active: true,
               subscription_plan: mappedPlan,
               subscription_end_date: endDate.toISOString(),
             })
             .eq('id', userId);

          if (userUpdateError) {
            console.error('❌ Error updating user subscription status for free order:', userUpdateError);
          } else {
            console.log('✅ User subscription status updated for free order - subscription_active=true');
          }
        } catch (userProfileError) {
          console.error('❌ Error updating user profile for free order:', userProfileError);
        }
      }

      return orderResult;

    } catch (error: any) {
      console.error('Error in createFreeOrder:', error);
      throw new Error(`Failed to create free order: ${error.message}`);
    }
  }

  /**
   * Update order status (e.g., after successful payment verification)
   */
  static async updateOrderStatus(orderId: string, status: 'pending' | 'shipped' | 'delivered' | 'returned' | 'cancelled'): Promise<void> {
    try {
      // Try to update in rental_orders table first (new orders)
      const { error: rentalError } = await supabaseAdmin
        .from('rental_orders' as any)
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (rentalError) {
        // If not found in rental_orders, try legacy orders table
        console.log('⚠️ Order not found in rental_orders, trying legacy orders table...');
        const { error: legacyError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (legacyError) {
          console.error('Error updating order status in both tables:', { rentalError, legacyError });
          throw new Error(`Failed to update order status: Order not found in either table`);
        }
        
        console.log(`✅ Legacy order ${orderId} status updated to ${status}`);
      } else {
        console.log(`✅ Rental order ${orderId} status updated to ${status}`);
      }
    } catch (error: any) {
      console.error('Error in updateOrderStatus:', error);
      throw error;
    }
  }

  /**
   * Get order details by ID (hybrid approach)
   */
  static async getOrderById(orderId: string) {
    try {
      // Try rental_orders table first
      const { data: rentalOrder, error: rentalError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!rentalError && rentalOrder) {
        // Transform rental order to legacy format for compatibility
        const orderItems = Array.isArray(rentalOrder.toys_data) 
          ? rentalOrder.toys_data.map((toy: any, index: number) => ({
              id: `${rentalOrder.id}-item-${index}`,
              order_id: rentalOrder.id,
              toy_id: toy.toy_id || toy.id,
              quantity: toy.quantity || 1,
              rental_price: toy.unit_price || 0,
              toy: {
                id: toy.toy_id || toy.id,
                name: toy.name || 'Unknown Toy',
                image_url: toy.image_url || null
              }
            }))
          : [];

        return {
          ...rentalOrder,
          order_items: orderItems,
          source: 'rental_orders'
        };
      }

      // If not found in rental_orders, try legacy orders table
      console.log('⚠️ Order not found in rental_orders, trying legacy orders table...');
      const { data: legacyOrder, error: legacyError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            toy:toys (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (legacyError) {
        console.error('Error fetching order from both tables:', { rentalError, legacyError });
        throw new Error(`Order not found in either table: ${legacyError.message}`);
      }

      return {
        ...legacyOrder,
        source: 'legacy'
      };
    } catch (error: any) {
      console.error('Error in getOrderById:', error);
      throw error;
    }
  }

  /**
   * Create a queue order that represents a modification to existing subscription
   */
  static async createQueueOrder(orderData: CreateQueueOrderData): Promise<CreatedOrder> {
    const {
      userId,
      originalSubscriptionId,
      selectedToys,
      ageGroup,
      totalAmount,
      baseAmount,
      gstAmount,
      couponDiscount,
      appliedCoupon,
      deliveryInstructions,
      shippingAddress,
      queueOrderType,
      currentPlanId,
      paymentId,
      razorpayOrderId,
      cycleNumber
    } = orderData;

    try {
      console.log('🔄 Creating queue order for user:', userId, 'with queue type:', queueOrderType);

      // Step 1: Validate user exists and get subscription details
      const { data: existingUser, error: userError } = await supabase
        .from('custom_users' as any)
        .select('id, email, phone, first_name, last_name')
        .eq('id', userId)
        .single();

      if (userError || !existingUser) {
        throw new Error(`User not found: ${userError?.message || 'Invalid user ID'}`);
      }

      // Step 2: Validate subscription exists (if provided)
      let subscriptionData = null;
      if (originalSubscriptionId) {
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('id, plan_id, status, age_group')
          .eq('id', originalSubscriptionId)
          .eq('user_id', userId)
          .single();

        if (subError) {
          console.warn('⚠️ Subscription not found, continuing without validation:', subError.message);
        } else {
          subscriptionData = subscription;
        }
      }

      // Step 3: Validate toy stock availability for queue order
      console.log('🔍 Validating toy stock for queue order creation...');
      
      if (selectedToys && selectedToys.length > 0) {
        const toyIds = selectedToys.map(toy => toy.id);
        const stockValidation = await validateToySelectionForOrder(toyIds);
        
        if (!stockValidation.isValid) {
          const outOfStockList = stockValidation.outOfStockToys.join(', ');
          console.error('❌ Queue order validation failed - Out of stock toys:', outOfStockList);
          throw new Error(`Cannot create queue order: The following toys are out of stock: ${outOfStockList}`);
        }
        
        console.log('✅ All selected toys are in stock for queue order');
      }

      // 🎯 FIXED: Use QueueOrderService instead of direct table operations
      console.log('🎯 Using QueueOrderService for queue order creation...');
      
      const queueOrderData = {
        userId,
        originalSubscriptionId: originalSubscriptionId || null,
        selectedToys: selectedToys || [],
        queueOrderType: queueOrderType || 'next_cycle',
        currentPlanId,
        ageGroup: ageGroup || subscriptionData?.age_group || null,
        totalAmount,
        baseAmount,
        gstAmount,
        couponDiscount,
        appliedCoupon,
        paymentId,
        razorpayOrderId,
        shippingAddress,
        deliveryInstructions,
        cycleNumber: cycleNumber || 1
      };

      // Use the dedicated QueueOrderService instead of fallback logic
      const { QueueOrderService } = await import('./queueOrderService');
      const result = await QueueOrderService.createQueueOrder(queueOrderData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create queue order');
      }

      console.log('✅ Queue order created successfully via QueueOrderService:', {
        id: result.orderId,
        order_number: result.orderNumber
      });

      // Step 3: Create notification/audit entry (optional)
      try {
        const notificationData = {
          user_id: userId,
          type: 'queue_order_created',
          title: 'Queue Updated Successfully',
          message: `Your next delivery has been updated with ${selectedToys?.length || 0} toys.`,
          data: {
            queue_order_id: result.orderId,
            order_number: result.orderNumber,
            queue_type: queueOrderType,
            toy_count: selectedToys?.length || 0
          },
          read: false
        };

        await supabase
          .from('notifications' as any)
          .insert(notificationData);

        console.log('📧 Queue order notification created');
      } catch (notificationError) {
        console.warn('⚠️ Failed to create notification (non-critical):', notificationError);
      }

      // Return successful response in consistent format
      return {
        success: true,
        orderId: result.orderId || null,
        orderNumber: result.orderNumber || null,
        message: result.message,
        data: result.data
      };

    } catch (error: any) {
      console.error('❌ Error creating queue order:', {
        error: error.message,
        userId,
        queueOrderType,
        totalAmount,
        stack: error.stack
      });

      // Return error response with detailed error information
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        message: `Failed to create queue order: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Helper method to get next cycle number for a user
   */
  private static async getNextCycleNumber(userId: string): Promise<number> {
    try {
      const { data: lastOrder, error } = await supabaseAdmin
        .from('rental_orders' as any)
        .select('cycle_number')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting last cycle number:', error);
        return 1; // Default to cycle 1
      }

      return ((lastOrder as any)?.cycle_number || 0) + 1;
    } catch (error) {
      console.error('Error calculating next cycle number:', error);
      return 1; // Default to cycle 1
    }
  }

  /**
   * Create subscription_management entry for cycle tracking
   */
  private static async createSubscriptionManagementEntry(orderId: string, userId: string, planId: string, ageGroup?: string): Promise<void> {
    try {
      // Get the rental order details for cycle dates
      const { data: rentalOrder, error: orderError } = await supabaseAdmin
        .from('rental_orders' as any)
        .select('rental_start_date, rental_end_date, subscription_plan, total_amount, subscription_category')
        .eq('id', orderId)
        .single();

      if (orderError || !rentalOrder) {
        console.error('❌ Failed to get rental order for subscription management:', orderError);
        return;
      }

      // Calculate cycle dates
      const cycleStartDate = new Date(rentalOrder.rental_start_date);
      const cycleEndDate = new Date(rentalOrder.rental_end_date);
      const selectionWindowStart = new Date(cycleStartDate);
      const selectionWindowEnd = new Date(cycleEndDate);
      
      // Selection window: Days 24-30 of cycle
      selectionWindowStart.setDate(selectionWindowStart.getDate() + 23);
      selectionWindowEnd.setDate(selectionWindowEnd.getDate() - 1);

      const subscriptionManagementData = {
        user_id: userId,
        order_id: orderId,
        subscription_id: orderId,
        cycle_number: 1,
        cycle_status: 'active',
        cycle_start_date: cycleStartDate.toISOString().split('T')[0],
        cycle_end_date: cycleEndDate.toISOString().split('T')[0],
        selection_window_start: selectionWindowStart.toISOString().split('T')[0],
        selection_window_end: selectionWindowEnd.toISOString().split('T')[0],
        selection_window_status: 'upcoming',
        selected_toys: [],
        toys_selected_at: null,
        toys_count: 0,
        total_toy_value: 0.00,
        delivery_status: 'pending',
        plan_id: rentalOrder.subscription_plan,
        plan_name: rentalOrder.subscription_plan,
        plan_details: {
          age_group: ageGroup,
          subscription_category: rentalOrder.subscription_category,
          total_amount: rentalOrder.total_amount
        },
        manual_override: false,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: managementError } = await supabaseAdmin
        .from('subscription_management' as any)
        .insert(subscriptionManagementData);

      if (managementError) {
        console.error('⚠️ Failed to create subscription_management entry:', managementError);
      } else {
        console.log('✅ Subscription management entry created for order:', orderId);
      }
    } catch (error) {
      console.error('❌ Error creating subscription management entry:', error);
    }
  }
} 