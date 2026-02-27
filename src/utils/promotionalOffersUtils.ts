import { PromotionalOffersService } from '@/services/promotionalOffersService';
import { DiscountService } from '@/services/discountService';

/**
 * Utility functions for promotional offers
 */

export interface OfferValidationResult {
  isValid: boolean;
  offer?: any;
  discountAmount?: number;
  finalAmount?: number;
  errorMessage?: string;
}

export interface OfferApplicationResult {
  success: boolean;
  discountAmount: number;
  finalAmount: number;
  offerCode: string;
  offerName: string;
  errorMessage?: string;
}

/**
 * Validate a promotional offer code for checkout
 */
export async function validateOfferForCheckout(
  code: string,
  userId: string,
  orderAmount: number
): Promise<OfferValidationResult> {
  try {
    // Use the DiscountService for validation
    const result = await DiscountService.validateDiscount(code, userId, orderAmount);
    
    return {
      isValid: result.isValid,
      offer: result.offerDetails,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
      errorMessage: result.errorMessage
    };
  } catch (error) {
    console.error('Error validating offer for checkout:', error);
    return {
      isValid: false,
      errorMessage: 'Error validating offer. Please try again.'
    };
  }
}

/**
 * Apply a promotional offer to an order
 */
export async function applyOfferToOrder(
  code: string,
  userId: string,
  orderId: string,
  orderAmount: number
): Promise<OfferApplicationResult> {
  try {
    // Use the DiscountService for application
    const result = await DiscountService.applyDiscount(code, userId, orderId, orderAmount);
    
    return result;
  } catch (error) {
    console.error('Error applying offer to order:', error);
    return {
      success: false,
      discountAmount: 0,
      finalAmount: orderAmount,
      offerCode: code,
      offerName: '',
      errorMessage: 'Error applying offer. Please try again.'
    };
  }
}

/**
 * Get available auto-apply offers for a user
 */
export async function getAutoApplyOffers(userId: string): Promise<any[]> {
  try {
    const availableOffers = await PromotionalOffersService.getAvailableOffersForUser(userId);
    
    // Filter for auto-apply offers
    return availableOffers.filter(offer => offer.auto_apply === true);
  } catch (error) {
    console.error('Error getting auto-apply offers:', error);
    return [];
  }
}

/**
 * Calculate the best available discount for a user and order
 */
export async function getBestAvailableDiscount(
  userId: string,
  orderAmount: number
): Promise<OfferValidationResult | null> {
  try {
    const autoApplyOffers = await getAutoApplyOffers(userId);
    
    let bestOffer: OfferValidationResult | null = null;
    let maxDiscount = 0;

    for (const offer of autoApplyOffers) {
      const validation = await validateOfferForCheckout(offer.code, userId, orderAmount);
      
      if (validation.isValid && validation.discountAmount && validation.discountAmount > maxDiscount) {
        maxDiscount = validation.discountAmount;
        bestOffer = validation;
      }
    }

    return bestOffer;
  } catch (error) {
    console.error('Error getting best available discount:', error);
    return null;
  }
}

/**
 * Format offer type for display
 */
export function formatOfferType(type: string): string {
  const typeMap: Record<string, string> = {
    'discount_percentage': 'Percentage Discount',
    'discount_amount': 'Amount Discount',
    'free_month': 'Free Month',
    'free_toys': 'Free Toys',
    'upgrade': 'Plan Upgrade',
    'shipping_free': 'Free Shipping',
    'early_access': 'Early Access'
  };

  return typeMap[type] || type;
}

/**
 * Format offer value for display
 */
export function formatOfferValue(type: string, value: number): string {
  switch (type) {
    case 'discount_percentage':
      return `${value}% off`;
    case 'discount_amount':
      return `₹${value} off`;
    case 'free_month':
      return `${value} free month${value > 1 ? 's' : ''}`;
    case 'free_toys':
      return `${value} free toy${value > 1 ? 's' : ''}`;
    case 'upgrade':
      return 'Plan upgrade';
    case 'shipping_free':
      return 'Free shipping';
    case 'early_access':
      return 'Early access';
    default:
      return `${value}`;
  }
}

/**
 * Check if an offer is currently active
 */
export function isOfferActive(offer: any): boolean {
  if (!offer.is_active) {
    return false;
  }

  const now = new Date();
  const startDate = new Date(offer.start_date);
  const endDate = new Date(offer.end_date);

  return now >= startDate && now <= endDate;
}

/**
 * Check if an offer has reached its usage limit
 */
export function isOfferUsageLimitReached(offer: any): boolean {
  if (!offer.usage_limit) {
    return false; // No limit
  }

  return offer.usage_count >= offer.usage_limit;
}

/**
 * Get offer status
 */
export function getOfferStatus(offer: any): 'active' | 'inactive' | 'expired' | 'draft' | 'limit_reached' {
  if (!offer.is_active) {
    return 'inactive';
  }

  if (isOfferUsageLimitReached(offer)) {
    return 'limit_reached';
  }

  const now = new Date();
  const startDate = new Date(offer.start_date);
  const endDate = new Date(offer.end_date);

  if (now < startDate) {
    return 'draft';
  }

  if (now > endDate) {
    return 'expired';
  }

  return 'active';
}

/**
 * Get offer status badge color
 */
export function getOfferStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-800',
    'expired': 'bg-red-100 text-red-800',
    'draft': 'bg-blue-100 text-blue-800',
    'limit_reached': 'bg-orange-100 text-orange-800'
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800';
}

export default {
  validateOfferForCheckout,
  applyOfferToOrder,
  getAutoApplyOffers,
  getBestAvailableDiscount,
  formatOfferType,
  formatOfferValue,
  isOfferActive,
  isOfferUsageLimitReached,
  getOfferStatus,
  getOfferStatusColor
};


