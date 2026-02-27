import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PromotionalOffer {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'discount_percentage' | 'discount_amount' | 'free_month' | 'free_toys' | 'upgrade';
  value: number;
  min_order_value: number;
  max_discount_amount?: number;
  target_plans: string[];
  usage_limit?: number;
  usage_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_apply: boolean;
  stackable: boolean;
  first_time_users_only: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Display settings
  display_on_homepage?: boolean;
  display_on_pricing?: boolean;
  display_in_header?: boolean;
  display_priority?: number;
}

export interface CreateOfferData {
  code: string;
  name: string;
  description?: string;
  type: 'discount_percentage' | 'discount_amount' | 'free_month' | 'free_toys' | 'upgrade';
  value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  target_plans?: string[];
  usage_limit?: number;
  start_date: Date;
  end_date: Date;
  auto_apply?: boolean;
  stackable?: boolean;
  first_time_users_only?: boolean;
  // Display settings
  display_on_homepage?: boolean;
  display_on_pricing?: boolean;
  display_in_header?: boolean;
  display_priority?: number;
}

export interface UpdateOfferData extends Partial<CreateOfferData> {
  id: string;
}

export interface OfferAnalytics {
  totalOffers: number;
  activeOffers: number;
  totalUsage: number;
  totalSavings: number;
  topOffers: Array<{
    code: string;
    name: string;
    usage_count: number;
    total_savings: number;
  }>;
}

export class PromotionalOffersService {
  /**
   * Get all promotional offers with filtering and search
   */
  static async getOffers(filters?: {
    search?: string;
    isActive?: boolean;
    type?: string;
    includeExpired?: boolean;
  }): Promise<PromotionalOffer[]> {
    try {
      let query = supabase
        .from('promotional_offers')
        .select(`
          *,
          creator:created_by(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (!filters?.includeExpired) {
        query = query.gte('end_date', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching promotional offers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getOffers:', error);
      throw error;
    }
  }

  /**
   * Create a new promotional offer
   */
  static async createOffer(offerData: CreateOfferData, createdBy: string): Promise<PromotionalOffer> {
    try {
      console.log('📝 Creating promotional offer:', offerData);

      const { data, error } = await supabase
        .from('promotional_offers')
        .insert({
          code: offerData.code.toUpperCase(),
          name: offerData.name,
          description: offerData.description || '',
          type: offerData.type,
          value: offerData.value,
          min_order_value: offerData.min_order_value || 0,
          max_discount_amount: offerData.max_discount_amount || null,
          target_plans: offerData.target_plans || [],
          usage_limit: offerData.usage_limit || null,
          usage_count: 0,
          start_date: offerData.start_date.toISOString(),
          end_date: offerData.end_date.toISOString(),
          is_active: true,
          auto_apply: offerData.auto_apply || false,
          stackable: offerData.stackable || false,
          first_time_users_only: offerData.first_time_users_only || false,
          created_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating promotional offer:', error);
        throw error;
      }

      console.log('✅ Promotional offer created:', data);
      return data;
    } catch (error) {
      console.error('Error in createOffer:', error);
      throw error;
    }
  }

  /**
   * Update an existing promotional offer
   */
  static async updateOffer(offerData: UpdateOfferData): Promise<PromotionalOffer> {
    try {
      console.log('📝 Updating promotional offer:', offerData.id);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only include fields that are provided
      if (offerData.code) updateData.code = offerData.code.toUpperCase();
      if (offerData.name) updateData.name = offerData.name;
      if (offerData.description !== undefined) updateData.description = offerData.description;
      if (offerData.type) updateData.type = offerData.type;
      if (offerData.value !== undefined) updateData.value = offerData.value;
      if (offerData.min_order_value !== undefined) updateData.min_order_value = offerData.min_order_value;
      if (offerData.max_discount_amount !== undefined) updateData.max_discount_amount = offerData.max_discount_amount;
      if (offerData.target_plans) updateData.target_plans = offerData.target_plans;
      if (offerData.usage_limit !== undefined) updateData.usage_limit = offerData.usage_limit;
      if (offerData.start_date) updateData.start_date = offerData.start_date.toISOString();
      if (offerData.end_date) updateData.end_date = offerData.end_date.toISOString();
      if (offerData.auto_apply !== undefined) updateData.auto_apply = offerData.auto_apply;
      if (offerData.stackable !== undefined) updateData.stackable = offerData.stackable;
      if (offerData.first_time_users_only !== undefined) updateData.first_time_users_only = offerData.first_time_users_only;

      // Display settings
      if (offerData.display_on_homepage !== undefined) updateData.display_on_homepage = offerData.display_on_homepage;
      if (offerData.display_on_pricing !== undefined) updateData.display_on_pricing = offerData.display_on_pricing;
      if (offerData.display_in_header !== undefined) updateData.display_in_header = offerData.display_in_header;
      if (offerData.display_priority !== undefined) updateData.display_priority = offerData.display_priority;

      const { data, error } = await supabase
        .from('promotional_offers')
        .update(updateData)
        .eq('id', offerData.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating promotional offer:', error);
        throw error;
      }

      console.log('✅ Promotional offer updated:', data);
      return data;
    } catch (error) {
      console.error('Error in updateOffer:', error);
      throw error;
    }
  }

  /**
   * Delete a promotional offer
   */
  static async deleteOffer(offerId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting promotional offer:', offerId);

      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', offerId);

      if (error) {
        console.error('Error deleting promotional offer:', error);
        throw error;
      }

      console.log('✅ Promotional offer deleted');
      return true;
    } catch (error) {
      console.error('Error in deleteOffer:', error);
      throw error;
    }
  }

  /**
   * Toggle offer active status
   */
  static async toggleOfferStatus(offerId: string, isActive: boolean): Promise<boolean> {
    try {
      console.log(`🔄 Toggling offer status: ${offerId} -> ${isActive}`);

      const { error } = await supabase
        .from('promotional_offers')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) {
        console.error('Error toggling offer status:', error);
        throw error;
      }

      console.log('✅ Offer status toggled');
      return true;
    } catch (error) {
      console.error('Error in toggleOfferStatus:', error);
      throw error;
    }
  }

  /**
   * Get promotional offers for display (public-facing)
   */
  static async getDisplayOffers(location?: 'homepage' | 'pricing' | 'header'): Promise<PromotionalOffer[]> {
    try {
      let query = supabase
        .from('promotional_offers')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('display_priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter by display location if specified
      if (location === 'homepage') {
        query = query.eq('display_on_homepage', true);
      } else if (location === 'pricing') {
        query = query.eq('display_on_pricing', true);
      } else if (location === 'header') {
        query = query.eq('display_in_header', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching display offers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getDisplayOffers:', error);
      return [];
    }
  }

  /**
   * Get offer analytics
   */
  static async getOfferAnalytics(): Promise<OfferAnalytics> {
    try {
      // Get basic offer stats
      const { data: offers, error: offersError } = await supabase
        .from('promotional_offers')
        .select('id, code, name, usage_count, is_active');

      if (offersError) throw offersError;

      // Get usage history for savings calculation
      const { data: usageHistory, error: usageError } = await supabase
        .from('offer_usage_history')
        .select('offer_id, discount_amount');

      if (usageError) throw usageError;

      // Calculate analytics
      const totalOffers = offers?.length || 0;
      const activeOffers = offers?.filter(o => o.is_active).length || 0;
      const totalUsage = offers?.reduce((sum, o) => sum + (o.usage_count || 0), 0) || 0;
      const totalSavings = usageHistory?.reduce((sum, u) => sum + (u.discount_amount || 0), 0) || 0;

      // Calculate top offers
      const topOffers = offers
        ?.map(offer => {
          const offerUsage = usageHistory?.filter(u => u.offer_id === offer.id) || [];
          const offerSavings = offerUsage.reduce((sum, u) => sum + (u.discount_amount || 0), 0);
          
          return {
            code: offer.code,
            name: offer.name,
            usage_count: offer.usage_count || 0,
            total_savings: offerSavings
          };
        })
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 5) || [];

      return {
        totalOffers,
        activeOffers,
        totalUsage,
        totalSavings,
        topOffers
      };
    } catch (error) {
      console.error('Error in getOfferAnalytics:', error);
      return {
        totalOffers: 0,
        activeOffers: 0,
        totalUsage: 0,
        totalSavings: 0,
        topOffers: []
      };
    }
  }

  /**
   * Assign offer to specific users
   */
  static async assignOfferToUsers(
    offerId: string, 
    userIds: string[], 
    assignedBy: string,
    notes?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      console.log('👥 Assigning offer to users:', { offerId, userIds: userIds.length });

      const assignments = userIds.map(userId => ({
        user_id: userId,
        offer_id: offerId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        notes: notes || '',
        expires_at: expiresAt?.toISOString() || null,
        is_used: false
      }));

      const { error } = await supabase
        .from('user_offer_assignments')
        .insert(assignments);

      if (error) {
        console.error('Error assigning offers to users:', error);
        throw error;
      }

      console.log('✅ Offers assigned to users');
      return true;
    } catch (error) {
      console.error('Error in assignOfferToUsers:', error);
      throw error;
    }
  }

  /**
   * Get offer usage history
   */
  static async getOfferUsageHistory(offerId?: string, userId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('offer_usage_history')
        .select(`
          *,
          promotional_offers(code, name),
          custom_users(first_name, last_name, phone)
        `)
        .order('used_at', { ascending: false });

      if (offerId) {
        query = query.eq('offer_id', offerId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching usage history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getOfferUsageHistory:', error);
      return [];
    }
  }

  /**
   * Update offer display settings
   */
  static async updateOfferDisplaySettings(
    offerId: string, 
    displaySettings: {
      display_on_homepage?: boolean;
      display_on_pricing?: boolean;
      display_in_header?: boolean;
      display_priority?: number;
    }
  ): Promise<boolean> {
    try {
      console.log('🎨 Updating offer display settings:', { offerId, displaySettings });

      const { error } = await supabase
        .from('promotional_offers')
        .update({
          ...displaySettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);

      if (error) {
        console.error('Error updating display settings:', error);
        throw error;
      }

      console.log('✅ Display settings updated');
      return true;
    } catch (error) {
      console.error('Error in updateOfferDisplaySettings:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing offer with modifications
   */
  static async duplicateOffer(
    sourceOfferId: string, 
    modifications: Partial<CreateOfferData>,
    createdBy: string
  ): Promise<PromotionalOffer> {
    try {
      console.log('📋 Duplicating offer:', sourceOfferId);

      // Get source offer
      const { data: sourceOffer, error: fetchError } = await supabase
        .from('promotional_offers')
        .select('*')
        .eq('id', sourceOfferId)
        .single();

      if (fetchError || !sourceOffer) {
        throw new Error('Source offer not found');
      }

      // Create new offer with modifications
      const newOfferData: CreateOfferData = {
        code: modifications.code || `${sourceOffer.code}_COPY`,
        name: modifications.name || `${sourceOffer.name} (Copy)`,
        description: modifications.description || sourceOffer.description,
        type: modifications.type || sourceOffer.type,
        value: modifications.value || sourceOffer.value,
        min_order_value: modifications.min_order_value || sourceOffer.min_order_value,
        max_discount_amount: modifications.max_discount_amount || sourceOffer.max_discount_amount,
        target_plans: modifications.target_plans || sourceOffer.target_plans,
        usage_limit: modifications.usage_limit || sourceOffer.usage_limit,
        start_date: modifications.start_date || new Date(),
        end_date: modifications.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        auto_apply: modifications.auto_apply !== undefined ? modifications.auto_apply : sourceOffer.auto_apply,
        stackable: modifications.stackable !== undefined ? modifications.stackable : sourceOffer.stackable,
        first_time_users_only: modifications.first_time_users_only !== undefined ? modifications.first_time_users_only : sourceOffer.first_time_users_only,
        display_on_homepage: modifications.display_on_homepage !== undefined ? modifications.display_on_homepage : false,
        display_on_pricing: modifications.display_on_pricing !== undefined ? modifications.display_on_pricing : false,
        display_in_header: modifications.display_in_header !== undefined ? modifications.display_in_header : false,
        display_priority: modifications.display_priority || 0
      };

      return await this.createOffer(newOfferData, createdBy);
    } catch (error) {
      console.error('Error in duplicateOffer:', error);
      throw error;
    }
  }

  /**
   * Bulk update offers
   */
  static async bulkUpdateOffers(
    offerIds: string[], 
    updates: Partial<PromotionalOffer>
  ): Promise<boolean> {
    try {
      console.log('📦 Bulk updating offers:', { count: offerIds.length, updates });

      const { error } = await supabase
        .from('promotional_offers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', offerIds);

      if (error) {
        console.error('Error bulk updating offers:', error);
        throw error;
      }

      console.log('✅ Bulk update completed');
      return true;
    } catch (error) {
      console.error('Error in bulkUpdateOffers:', error);
      throw error;
    }
  }

  /**
   * Get offers for specific display location
   */
  static async getOffersForLocation(location: 'homepage' | 'pricing' | 'header'): Promise<PromotionalOffer[]> {
    try {
      const offers = await this.getDisplayOffers(location);
      return offers.filter(offer => {
        const now = new Date();
        const startDate = new Date(offer.start_date);
        const endDate = new Date(offer.end_date);
        
        return offer.is_active && 
               now >= startDate && 
               now <= endDate &&
               (!offer.usage_limit || offer.usage_count < offer.usage_limit);
      });
    } catch (error) {
      console.error('Error in getOffersForLocation:', error);
      return [];
    }
  }

  /**
   * Preview offer discount calculation
   */
  static calculateDiscount(offer: PromotionalOffer, orderAmount: number): {
    discountAmount: number;
    finalAmount: number;
    isApplicable: boolean;
    reason?: string;
  } {
    // Check minimum order value
    if (orderAmount < offer.min_order_value) {
      return {
        discountAmount: 0,
        finalAmount: orderAmount,
        isApplicable: false,
        reason: `Minimum order value of ₹${offer.min_order_value} required`
      };
    }

    let discountAmount = 0;

    switch (offer.type) {
      case 'discount_percentage':
        discountAmount = (orderAmount * offer.value) / 100;
        break;
      case 'discount_amount':
        discountAmount = offer.value;
        break;
      default:
        discountAmount = 0;
    }

    // Apply maximum discount cap
    if (offer.max_discount_amount && discountAmount > offer.max_discount_amount) {
      discountAmount = offer.max_discount_amount;
    }

    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      discountAmount,
      finalAmount,
      isApplicable: true
    };
  }
}