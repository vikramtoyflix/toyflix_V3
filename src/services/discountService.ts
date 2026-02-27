import { supabase } from '@/integrations/supabase/client';

export interface DiscountValidationResult {
  isValid: boolean;
  discountAmount: number;
  finalAmount: number;
  errorMessage?: string;
  offerDetails?: {
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    value: number;
    maxDiscountAmount?: number;
  };
}

export interface ApplyDiscountResult {
  success: boolean;
  discountAmount: number;
  finalAmount: number;
  offerCode: string;
  offerName: string;
  errorMessage?: string;
}

export class DiscountService {
  /**
   * Validate a discount code for a specific user and order amount
   */
  static async validateDiscount(
    code: string, 
    userId: string, 
    orderAmount: number
  ): Promise<DiscountValidationResult> {
    try {
      console.log('🔍 Validating discount code:', { code, userId, orderAmount });

      // Get offer details
      const { data: offer, error: offerError } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (offerError || !offer) {
        console.log('❌ Offer not found or inactive:', offerError);
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          errorMessage: 'Invalid or expired discount code'
        };
      }

      // Check date range
      const now = new Date();
      const startDate = new Date(offer.start_date);
      const endDate = new Date(offer.end_date);

      if (now < startDate || now > endDate) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          errorMessage: 'This discount code has expired'
        };
      }

      // Check usage limit
      if (offer.usage_limit && offer.usage_count >= offer.usage_limit) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          errorMessage: 'This discount code has reached its usage limit'
        };
      }

      // Check minimum order value
      if (orderAmount < offer.min_order_value) {
        return {
          isValid: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          errorMessage: `Minimum order value of ₹${offer.min_order_value} required`
        };
      }

      // Check first-time user restriction
      if (offer.first_time_users_only) {
        const { data: existingOrders } = await supabase
          .from('rental_orders')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (existingOrders && existingOrders.length > 0) {
          return {
            isValid: false,
            discountAmount: 0,
            finalAmount: orderAmount,
            errorMessage: 'This discount is only available for first-time users'
          };
        }
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (offer.type === 'discount_percentage') {
        discountAmount = orderAmount * (offer.value / 100);
      } else if (offer.type === 'discount_amount') {
        discountAmount = offer.value;
      }

      // Apply maximum discount limit
      if (offer.max_discount_amount && discountAmount > offer.max_discount_amount) {
        discountAmount = offer.max_discount_amount;
      }

      // Ensure discount doesn't exceed order amount
      discountAmount = Math.min(discountAmount, orderAmount);

      const finalAmount = Math.max(0, orderAmount - discountAmount);

      console.log('✅ Discount validation successful:', {
        code,
        discountAmount,
        finalAmount,
        offerType: offer.type,
        offerValue: offer.value
      });

      return {
        isValid: true,
        discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
        finalAmount: Math.round(finalAmount * 100) / 100,
        offerDetails: {
          id: offer.id,
          code: offer.code,
          name: offer.name,
          description: offer.description,
          type: offer.type,
          value: offer.value,
          maxDiscountAmount: offer.max_discount_amount
        }
      };

    } catch (error) {
      console.error('❌ Error validating discount:', error);
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        errorMessage: 'Error validating discount code. Please try again.'
      };
    }
  }

  /**
   * Apply a discount code to an order (records usage)
   */
  static async applyDiscount(
    code: string,
    userId: string,
    orderId: string,
    orderAmount: number
  ): Promise<ApplyDiscountResult> {
    try {
      console.log('🎯 Applying discount code:', { code, userId, orderId, orderAmount });

      // First validate the discount
      const validation = await this.validateDiscount(code, userId, orderAmount);
      
      if (!validation.isValid || !validation.offerDetails) {
        return {
          success: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          offerCode: code,
          offerName: '',
          errorMessage: validation.errorMessage
        };
      }

      const offer = validation.offerDetails;

      // Record usage in offer_usage_history
      const { error: usageError } = await supabase
        .from('offer_usage_history')
        .insert({
          offer_id: offer.id,
          user_id: userId,
          order_id: orderId,
          discount_amount: validation.discountAmount,
          original_amount: orderAmount,
          final_amount: validation.finalAmount,
          used_at: new Date().toISOString()
        });

      if (usageError) {
        console.error('❌ Error recording offer usage:', usageError);
        return {
          success: false,
          discountAmount: 0,
          finalAmount: orderAmount,
          offerCode: code,
          offerName: offer.name,
          errorMessage: 'Error applying discount. Please try again.'
        };
      }

      // Update usage count (increment by 1)
      const { error: updateError } = await supabase
        .from('promotional_offers')
        .update({ 
          usage_count: offer.usage_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', offer.id);

      if (updateError) {
        console.warn('⚠️ Warning: Could not update usage count:', updateError);
        // Don't fail the discount application for this
      }

      console.log('✅ Discount applied successfully:', {
        code,
        discountAmount: validation.discountAmount,
        finalAmount: validation.finalAmount
      });

      return {
        success: true,
        discountAmount: validation.discountAmount,
        finalAmount: validation.finalAmount,
        offerCode: code,
        offerName: offer.name
      };

    } catch (error) {
      console.error('❌ Error applying discount:', error);
      return {
        success: false,
        discountAmount: 0,
        finalAmount: orderAmount,
        offerCode: code,
        offerName: '',
        errorMessage: 'Error applying discount. Please try again.'
      };
    }
  }

  /**
   * Get available offers for a user
   */
  static async getAvailableOffers(userId: string) {
    try {
      const { data: offers, error } = await supabase
        .from('promotional_offers')
        .select('id, code, name, description, type, value, min_order_value, max_discount_amount, end_date')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching available offers:', error);
        return [];
      }

      return offers || [];
    } catch (error) {
      console.error('Error in getAvailableOffers:', error);
      return [];
    }
  }

  /**
   * Check if exit-intent discount is stored in localStorage and still valid
   */
  static getStoredExitDiscount(): string | null {
    try {
      const discountCode = localStorage.getItem('toyflix_exit_discount');
      const expiresAt = localStorage.getItem('toyflix_exit_discount_expires');
      
      if (!discountCode || !expiresAt) {
        return null;
      }

      const expiryTime = parseInt(expiresAt);
      if (Date.now() > expiryTime) {
        // Expired, clean up
        localStorage.removeItem('toyflix_exit_discount');
        localStorage.removeItem('toyflix_exit_discount_expires');
        return null;
      }

      return discountCode;
    } catch (error) {
      console.error('Error checking stored exit discount:', error);
      return null;
    }
  }

  /**
   * Clear stored exit discount
   */
  static clearStoredExitDiscount(): void {
    try {
      localStorage.removeItem('toyflix_exit_discount');
      localStorage.removeItem('toyflix_exit_discount_expires');
    } catch (error) {
      console.error('Error clearing stored exit discount:', error);
    }
  }

  /**
   * Auto-apply exit discount if available
   */
  static async autoApplyExitDiscount(
    userId: string,
    orderAmount: number,
    onDiscountApplied?: (result: DiscountValidationResult) => void
  ): Promise<DiscountValidationResult | null> {
    const storedDiscount = this.getStoredExitDiscount();
    
    if (!storedDiscount) {
      return null;
    }

    console.log('🎯 Auto-applying stored exit discount:', storedDiscount);

    const result = await this.validateDiscount(storedDiscount, userId, orderAmount);
    
    if (result.isValid && onDiscountApplied) {
      onDiscountApplied(result);
      // Clear the stored discount after successful application
      this.clearStoredExitDiscount();
    }

    return result;
  }
}
