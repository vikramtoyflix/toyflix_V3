import { supabase } from '@/integrations/supabase/client';

export interface QueueOrderData {
  userId: string;
  originalSubscriptionId?: string;
  selectedToys: any[];
  queueOrderType: 'next_cycle' | 'modification' | 'emergency_change';
  currentPlanId: string;
  ageGroup?: string;
  totalAmount: number;
  baseAmount: number;
  gstAmount: number;
  couponDiscount: number;
  appliedCoupon?: string;
  paymentId?: string;
  razorpayOrderId?: string;
  shippingAddress: any;
  deliveryInstructions?: string;
  cycleNumber?: number;
}

export interface QueueOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  message: string;
  error?: string;
  data?: any;
}

export interface DashboardQueueOrder {
  id: string;
  order_number: string;
  user_id: string;
  selected_toys: any[];
  queue_order_type: string;
  status: string;
  payment_status: string;
  total_amount: number;
  estimated_delivery_date: string | null;
  created_at: string;
  updated_at: string;
  queue_cycle_number: number;
  current_plan_id: string;
  delivery_address: any;
}

export interface NextDeliveryInfo {
  lastModified: string | null;
  scheduledToys: any[];
  orderStatus: string;
  estimatedDeliveryDate: string | null;
  queueOrderId: string | null;
  cycleNumber: number;
  hasActiveQueue: boolean;
}

export class QueueOrderService {
  /**
   * Generate a unique order number for queue orders
   * Format: QU-YYYYMMDD-XXXX
   */
  private static generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QU-${dateStr}-${randomNum}`;
  }

  /**
   * Check if an order number already exists
   */
  private static async isOrderNumberUnique(orderNumber: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('queue_orders' as any)
      .select('id')
      .eq('order_number', orderNumber)
      .limit(1);

    if (error) {
      console.warn('Error checking order number uniqueness:', error);
      return true; // Assume unique if check fails
    }

    return !data || data.length === 0;
  }

  /**
   * Generate a guaranteed unique order number
   */
  private static async generateUniqueOrderNumber(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const orderNumber = this.generateOrderNumber();
      const isUnique = await this.isOrderNumberUnique(orderNumber);
      
      if (isUnique) {
        return orderNumber;
      }
      
      attempts++;
      // Add a small delay to avoid rapid retries
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fallback: use timestamp if all attempts fail
    const timestamp = Date.now().toString();
    return `QU-${timestamp.slice(-8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /**
   * Create a queue order
   */
  static async createQueueOrder(orderData: QueueOrderData): Promise<QueueOrderResponse> {
    try {
      console.log('🔄 Creating queue order for user:', orderData.userId);

      // 🎯 DEBUG: Log the incoming address data
      console.log('📍 Queue Order Address Data:', {
        shippingAddress: orderData.shippingAddress,
        addressKeys: orderData.shippingAddress ? Object.keys(orderData.shippingAddress) : 'null',
        isAddressEmpty: !orderData.shippingAddress || Object.keys(orderData.shippingAddress).length === 0
      });

      // ✅ VALIDATION: Ensure address is not empty
      if (!orderData.shippingAddress || Object.keys(orderData.shippingAddress).length === 0) {
        console.error('❌ Queue Order Address Validation Failed: No shipping address provided');
        throw new Error('Shipping address is required for queue orders');
      }

      // 🔍 CRITICAL: Validate toy stock availability for queue order
      console.log('🔍 Validating toy stock for queue order creation...');
      
      if (orderData.selectedToys && orderData.selectedToys.length > 0) {
        // Import stock validation utility
        const { validateToySelectionForOrder } = await import('@/utils/stockValidation');
        
        const toyIds = orderData.selectedToys.map(toy => 
          typeof toy === 'object' ? (toy.toy_id || toy.id) : toy
        ).filter(Boolean);
        
        if (toyIds.length > 0) {
          const stockValidation = await validateToySelectionForOrder(toyIds);
          
          if (!stockValidation.isValid) {
            const outOfStockList = stockValidation.outOfStockToys.join(', ');
            console.error('❌ Queue order validation failed - Out of stock toys:', outOfStockList);
            
            return {
              success: false,
              message: `Cannot create queue order: The following toys are out of stock: ${outOfStockList}`,
              error: `Out of stock toys: ${outOfStockList}`
            };
          }
          
          console.log('✅ All selected toys are in stock for queue order');
        }
      }

      // Generate unique order number
      const orderNumber = await this.generateUniqueOrderNumber();
      
      // Calculate estimated delivery date (7 days from now for queue orders)
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);
      
      // Get user profile for address fallback
      const { data: userProfile, error: userProfileError } = await supabase
        .from('custom_users' as any)
        .select('first_name, last_name, phone, email, address_line1, address_line2, city, state, zip_code')
        .eq('id', orderData.userId)
        .single();

      if (userProfileError) {
        console.warn('⚠️ Could not fetch user profile for address fallback:', userProfileError.message);
      }

      // Prepare delivery address with fallback to user profile
      const shippingAddress = orderData.shippingAddress || {};
      
      // Check if shipping address is empty or incomplete
      const hasShippingAddress = shippingAddress.address_line1 || shippingAddress.address1 || shippingAddress.line1;
      
      // Use profile address as fallback if shipping address is missing
      let addressToUse = shippingAddress;
      if (!hasShippingAddress && userProfile) {
        console.log('🏠 Using profile address as fallback for queue order delivery address');
        addressToUse = {
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          phone: userProfile.phone || '',
          email: userProfile.email || '',
          address_line1: userProfile.address_line1 || '',
          address_line2: userProfile.address_line2 || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          postcode: userProfile.zip_code || '',
          country: 'India'
        };
      }
      
      const standardizedDeliveryAddress = {
        first_name: addressToUse.first_name || addressToUse.firstName || userProfile?.first_name || '',
        last_name: addressToUse.last_name || addressToUse.lastName || userProfile?.last_name || '',
        phone: addressToUse.phone || userProfile?.phone || '',
        email: addressToUse.email || userProfile?.email || '',
        address_line1: addressToUse.address_line1 || addressToUse.address1 || addressToUse.line1 || '',
        address_line2: addressToUse.address_line2 || addressToUse.address2 || addressToUse.apartment || addressToUse.line2 || '',
        city: addressToUse.city || '',
        state: addressToUse.state || '',
        postcode: addressToUse.postcode || addressToUse.zip_code || addressToUse.pincode || '',
        country: addressToUse.country || 'India',
        latitude: addressToUse.latitude,
        longitude: addressToUse.longitude,
        plus_code: addressToUse.plus_code,
        delivery_instructions: orderData.deliveryInstructions || null
      };

      // Prepare the order data
      const queueOrderInsert = {
        user_id: orderData.userId,
        original_subscription_id: orderData.originalSubscriptionId || null,
        order_number: orderNumber,
        selected_toys: orderData.selectedToys || [],
        queue_cycle_number: orderData.cycleNumber || 1,
        queue_order_type: orderData.queueOrderType || 'next_cycle',
        total_amount: orderData.totalAmount,
        base_amount: orderData.baseAmount,
        gst_amount: orderData.gstAmount,
        coupon_discount: orderData.couponDiscount,
        applied_coupon: orderData.appliedCoupon || null,
        payment_status: orderData.totalAmount === 0 ? 'paid' : 'pending',
        payment_id: orderData.paymentId || null,
        razorpay_order_id: orderData.razorpayOrderId || null,
        status: 'processing',
        delivery_address: standardizedDeliveryAddress,
        delivery_instructions: orderData.deliveryInstructions || null,
        current_plan_id: orderData.currentPlanId,
        age_group: orderData.ageGroup || null,
        estimated_delivery_date: estimatedDeliveryDate.toISOString(),
        created_by: orderData.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🎯 Inserting queue order:', {
        order_number: orderNumber,
        user_id: orderData.userId,
        total_amount: orderData.totalAmount,
        toys_count: orderData.selectedToys?.length || 0,
        delivery_address: standardizedDeliveryAddress,
        address_source: hasShippingAddress ? 'provided' : (userProfile ? 'profile_fallback' : 'none'),
        address_fields: standardizedDeliveryAddress ? Object.keys(standardizedDeliveryAddress).filter(k => standardizedDeliveryAddress[k]) : 'none'
      });

      // Insert into queue_orders table
      const { data: queueOrder, error: insertError } = await supabase
        .from('queue_orders' as any)
        .insert(queueOrderInsert)
        .select('*')
        .single();

      if (insertError) {
        console.error('❌ Failed to insert queue order:', insertError);
        throw new Error(`Failed to create queue order: ${insertError.message}`);
      }

      if (!queueOrder) {
        throw new Error('Queue order was not created successfully');
      }

      const orderResult = queueOrder as any;
      console.log('✅ Queue order created successfully:', {
        id: orderResult.id,
        order_number: orderResult.order_number,
        payment_status: orderResult.payment_status,
        stored_address: orderResult.delivery_address, // ✅ ADDED: Log stored address
        address_status: orderResult.delivery_address && Object.keys(orderResult.delivery_address || {}).length > 0 ? 'PRESENT' : 'MISSING'
      });

      // 🎯 NEW: Update subscription_management table to reflect next cycle queue
      try {
        console.log('🔄 Updating subscription_management for next cycle queue...');
        
        // Find the current active cycle for this user
        const { data: currentCycle, error: cycleError } = await supabase
          .from('subscription_management' as any)
          .select('*')
          .eq('user_id', orderData.userId)
          .eq('cycle_status', 'active')
          .order('cycle_number', { ascending: false })
          .limit(1)
          .single();

        if (!cycleError && currentCycle) {
          // Update the current cycle to indicate next cycle has been queued
          const { error: updateError } = await supabase
            .from('subscription_management' as any)
            .update({
              next_cycle_toys_selected: true,
              next_cycle_queue_order_id: queueOrder.id,
              next_cycle_toys_count: orderData.selectedToys?.length || 0,
              next_cycle_selected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', currentCycle.id);

          if (updateError) {
            console.warn('⚠️ Failed to update subscription_management:', updateError);
          } else {
            console.log('✅ Subscription management updated with next cycle queue info');
          }
          
          // Optionally create the next cycle entry if it doesn't exist
          const nextCycleNumber = currentCycle.cycle_number + 1;
          const { data: existingNextCycle } = await supabase
            .from('subscription_management' as any)
            .select('id')
            .eq('user_id', orderData.userId)
            .eq('cycle_number', nextCycleNumber)
            .single();

          if (!existingNextCycle) {
            // Create next cycle entry
            const nextCycleStartDate = new Date(currentCycle.cycle_end_date);
            nextCycleStartDate.setDate(nextCycleStartDate.getDate() + 1);
            
            const nextCycleEndDate = new Date(nextCycleStartDate);
            nextCycleEndDate.setDate(nextCycleEndDate.getDate() + 30);

            const nextCycleData = {
              user_id: orderData.userId,
              order_id: null, // Will be set when cycle becomes active
              subscription_id: currentCycle.subscription_id,
              cycle_number: nextCycleNumber,
              cycle_status: 'upcoming',
              cycle_start_date: nextCycleStartDate.toISOString().split('T')[0],
              cycle_end_date: nextCycleEndDate.toISOString().split('T')[0],
              selection_window_start: nextCycleStartDate.toISOString().split('T')[0],
              selection_window_end: nextCycleEndDate.toISOString().split('T')[0],
              selection_window_status: 'upcoming',
              selected_toys: orderData.selectedToys || [],
              toys_selected_at: new Date().toISOString(),
              toys_count: orderData.selectedToys?.length || 0,
              total_toy_value: 0.00,
              delivery_status: 'pending',
              plan_id: currentCycle.plan_id,
              plan_name: currentCycle.plan_name,
              plan_details: currentCycle.plan_details,
              queue_order_id: queueOrder.id,
              manual_override: false,
              created_by: orderData.userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const { error: nextCycleError } = await supabase
              .from('subscription_management' as any)
              .insert(nextCycleData);

            if (nextCycleError) {
              console.warn('⚠️ Failed to create next cycle entry:', nextCycleError);
            } else {
              console.log('✅ Next cycle entry created in subscription_management');
            }
          }
        } else {
          console.warn('⚠️ Could not find current active cycle for subscription_management update');
        }
      } catch (managementError) {
        console.warn('⚠️ Error updating subscription_management (non-critical):', managementError);
        // Don't fail the queue order creation if subscription_management update fails
      }

      // 🔒 ENHANCED: Auto-close selection window after queue order creation
      try {
        console.log('🔒 Auto-closing selection window after queue order creation...');
        const { SubscriptionService } = await import('./subscriptionService');
        const windowClosed = await SubscriptionService.closeSelectionWindowAfterOrder(
          orderData.userId,
          'queue_order',
          `Queue order created: ${queueOrder.order_number}`
        );
        
        if (windowClosed) {
          console.log('✅ Selection window automatically closed after queue order creation');
        } else {
          console.warn('⚠️ Failed to close selection window after queue order (non-critical)');
        }
      } catch (windowError) {
        console.error('⚠️ Error closing selection window after queue order (non-critical):', windowError);
        // Don't fail the queue order creation if window closure fails
        // The database trigger should handle this as backup
      }

      // Success response
      const successMessage = orderData.totalAmount === 0 
        ? `🎯 Toys changed successfully! Your ${orderData.currentPlanId?.includes('silver') ? 'Silver Pack' : orderData.currentPlanId?.includes('gold') ? 'Gold Pack PRO' : 'subscription'} includes free toy changes.`
        : `Queue order created successfully for ₹${orderData.totalAmount}.`;

      return {
        success: true,
        orderId: queueOrder.id,
        orderNumber: queueOrder.order_number,
        message: successMessage,
        data: {
          queueOrder: queueOrder,
          paymentRequired: orderData.totalAmount > 0,
          toysSelected: orderData.selectedToys?.length || 0,
          queueType: orderData.queueOrderType,
          cycleNumber: orderData.cycleNumber
        }
      };

    } catch (error: any) {
      console.error('❌ Error creating queue order:', {
        error: error.message,
        userId: orderData.userId,
        queueOrderType: orderData.queueOrderType
      });

      return {
        success: false,
        message: `Failed to create queue order: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get recent queue orders for dashboard display
   */
  static async getUserQueueOrders(userId: string, limit: number = 5): Promise<DashboardQueueOrder[]> {
    try {
      const { data, error } = await supabase
        .from('queue_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching queue orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserQueueOrders:', error);
      return [];
    }
  }

  /**
   * Get next delivery information for dashboard
   */
  static async getNextDeliveryInfo(userId: string): Promise<NextDeliveryInfo> {
    try {
      // Get the most recent queue order
      const { data: latestQueueOrder, error } = await supabase
        .from('queue_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .in('status', ['processing', 'confirmed', 'preparing'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching next delivery info:', error);
      }

      const queueOrder = latestQueueOrder?.[0];

      if (queueOrder) {
        return {
          lastModified: queueOrder.updated_at,
          scheduledToys: queueOrder.selected_toys || [],
          orderStatus: queueOrder.status,
          estimatedDeliveryDate: queueOrder.estimated_delivery_date,
          queueOrderId: queueOrder.id,
          cycleNumber: queueOrder.queue_cycle_number,
          hasActiveQueue: true
        };
      }

      // No active queue order found
      return {
        lastModified: null,
        scheduledToys: [],
        orderStatus: 'none',
        estimatedDeliveryDate: null,
        queueOrderId: null,
        cycleNumber: 0,
        hasActiveQueue: false
      };

    } catch (error) {
      console.error('Error in getNextDeliveryInfo:', error);
      return {
        lastModified: null,
        scheduledToys: [],
        orderStatus: 'error',
        estimatedDeliveryDate: null,
        queueOrderId: null,
        cycleNumber: 0,
        hasActiveQueue: false
      };
    }
  }

  /**
   * Update queue order status
   */
  static async updateQueueOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('queue_orders' as any)
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          processed_at: status === 'confirmed' ? new Date().toISOString() : null
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating queue order status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateQueueOrderStatus:', error);
      return false;
    }
  }

  /**
   * Get queue order by ID
   */
  static async getQueueOrderById(orderId: string): Promise<DashboardQueueOrder | null> {
    try {
      const { data, error } = await supabase
        .from('queue_orders' as any)
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching queue order:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getQueueOrderById:', error);
      return null;
    }
  }

  /**
   * Get combined order history (regular orders + queue orders)
   */
  static async getCombinedOrderHistory(userId: string, userPhone?: string): Promise<any[]> {
    try {
      const combinedOrders: any[] = [];

      // Get queue orders
      const queueOrders = await this.getUserQueueOrders(userId, 10);
      
      // Transform queue orders to match regular order format
      const transformedQueueOrders = queueOrders.map(queueOrder => ({
        ...queueOrder,
        order_type: 'queue_update',
        rental_start_date: queueOrder.estimated_delivery_date,
        rental_end_date: null,
        subscription_plan: queueOrder.current_plan_id,
        toys_data: queueOrder.selected_toys,
        cycle_number: queueOrder.queue_cycle_number,
        isQueueOrder: true
      }));

      combinedOrders.push(...transformedQueueOrders);

      // Get regular rental orders if phone is available
      if (userPhone) {
        const { data: rentalOrders } = await supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_phone', userPhone)
          .order('created_at', { ascending: false })
          .limit(10);

        if (rentalOrders) {
          const transformedRentalOrders = rentalOrders.map(order => ({
            ...order,
            order_type: 'rental',
            isQueueOrder: false
          }));
          combinedOrders.push(...transformedRentalOrders);
        }
      }

      // Sort combined orders by creation date
      combinedOrders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return combinedOrders.slice(0, 15); // Return most recent 15 orders

    } catch (error) {
      console.error('Error in getCombinedOrderHistory:', error);
      return [];
    }
  }
} 