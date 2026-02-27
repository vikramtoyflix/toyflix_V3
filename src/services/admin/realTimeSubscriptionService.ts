import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class RealTimeSubscriptionService {
  /**
   * Update a field in the rental_orders table (subscription data)
   */
  static async updateSubscriptionField(
    subscriptionId: string,
    fieldName: string,
    value: any,
    adminUserId?: string
  ): Promise<void> {
    try {
      console.log(`🔄 Updating subscription field: ${fieldName} = ${value} for ID: ${subscriptionId}`);
      
      const updateData: any = {
        [fieldName]: value,
        updated_at: new Date().toISOString()
      };

      // Add admin user ID if provided
      if (adminUserId) {
        updateData.updated_by = adminUserId;
      }

      const { error } = await (supabase as any)
        .from('rental_orders')
        .update(updateData)
        .eq('id', subscriptionId);
      
      if (error) {
        console.error('❌ Supabase error updating subscription field:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`✅ Successfully updated ${fieldName} for subscription ${subscriptionId}`);
      
      // Log admin action for audit trail
      await this.logAdminAction(subscriptionId, fieldName, value, adminUserId);
      
    } catch (error) {
      console.error('❌ Failed to update subscription field:', error);
      throw error;
    }
  }

  /**
   * Update a field in the custom_users table (user profile data)
   */
  static async updateUserProfile(
    userId: string,
    fieldName: string,
    value: any,
    adminUserId?: string
  ): Promise<void> {
    try {
      console.log(`🔄 Updating user profile field: ${fieldName} = ${value} for user ID: ${userId}`);
      
      const updateData: any = {
        [fieldName]: value,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('custom_users')
        .update(updateData)
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Supabase error updating user profile:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`✅ Successfully updated ${fieldName} for user ${userId}`);
      
      // Log user profile action for audit trail
      await this.logUserProfileAction(userId, fieldName, value, adminUserId);
      
    } catch (error) {
      console.error('❌ Failed to update user profile field:', error);
      throw error;
    }
  }

  /**
   * Handle split user name updates (first_name and last_name from full_name)
   */
  static async updateUserFullName(
    userId: string,
    fullName: string,
    adminUserId?: string
  ): Promise<void> {
    try {
      console.log(`🔄 Updating user full name: ${fullName} for user ID: ${userId}`);
      
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updateData = {
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('custom_users')
        .update(updateData)
        .eq('id', userId);
      
      if (error) {
        console.error('❌ Supabase error updating user name:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log(`✅ Successfully updated full name for user ${userId}`);
      
      // Log user profile action for audit trail
      await this.logUserProfileAction(userId, 'full_name', fullName, adminUserId);
      
    } catch (error) {
      console.error('❌ Failed to update user full name:', error);
      throw error;
    }
  }

  /**
   * Validate field values before updating
   */
  static validateFieldValue(fieldName: string, value: any): boolean {
    switch (fieldName) {
      case 'phone':
        // Basic phone validation
        return /^\+?[\d\s\-\(\)]+$/.test(value);
      
      case 'email':
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case 'total_amount':
      case 'payment_amount':
      case 'base_amount':
      case 'gst_amount':
      case 'discount_amount':
        // Numeric validation
        return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
      
      case 'cycle_number':
        // Positive integer validation
        return Number.isInteger(Number(value)) && Number(value) > 0;
      
      case 'rental_start_date':
      case 'rental_end_date':
      case 'delivery_date':
      case 'returned_date':
        // Date validation
        return !isNaN(Date.parse(value));
      
      case 'subscription_status':
        // Valid subscription statuses
        return ['active', 'deactivated', 'paused', 'cancelled', 'expired', 'pending'].includes(value);
      
      case 'subscription_plan':
        // Valid subscription plans
        return ['Discovery Delight', 'Silver Pack', 'Gold Pack PRO', 'Ride-On Monthly', 'Books Monthly'].includes(value);
      
      case 'age_group':
        // Valid age groups
        return ['1-2', '2-3', '3-4', '4-6', '6-8', '8+'].includes(value);
      
      case 'return_status':
        // Valid return statuses
        return ['pending', 'partial', 'complete', 'lost', 'damaged'].includes(value);
      
      default:
        // Default validation - just check if it's not empty for required fields
        return value !== null && value !== undefined;
    }
  }

  /**
   * Get user permissions for field editing
   */
  static getUserPermissions(userRole: string): string[] {
    switch (userRole?.toLowerCase()) {
      case 'admin':
        return ['*']; // Admin can edit everything
      case 'manager':
        return [
          'subscription_status', 'subscription_plan', 'age_group', 'admin_notes',
          'delivery_date', 'returned_date', 'return_status', 'delivery_instructions'
        ];
      case 'support':
        return [
          'admin_notes', 'delivery_instructions', 'pickup_instructions',
          'delivery_date', 'return_status'
        ];
      case 'logistics':
        return [
          'delivery_date', 'returned_date', 'return_status', 'delivery_instructions',
          'pickup_instructions', 'dispatch_tracking_number', 'return_tracking_number'
        ];
      default:
        return []; // No permissions by default
    }
  }

  /**
   * Check if user can edit a specific field
   */
  static canEditField(fieldName: string, userRole: string): boolean {
    const permissions = this.getUserPermissions(userRole);
    return permissions.includes('*') || permissions.includes(fieldName);
  }

  /**
   * Log admin actions for audit trail
   */
  private static async logAdminAction(
    subscriptionId: string,
    fieldName: string,
    value: any,
    adminUserId?: string
  ): Promise<void> {
    try {
      // Only log if we have admin user ID
      if (!adminUserId) return;

      // Use the existing admin_audit_logs table structure
      const { error } = await (supabase as any)
        .from('admin_audit_logs')
        .insert({
          action: 'subscription_modification',
          resource_type: 'rental_orders',
          resource_id: subscriptionId,
          admin_user_id: adminUserId,
          action_details: {
            field_name: fieldName,
            new_value: value,
            action_type: 'field_update'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            context: 'inline_editing'
          }
        });

      if (error) {
        // Don't throw error for logging failures, just warn
        console.warn('⚠️ Failed to log admin action:', error);
      }
    } catch (error) {
      console.warn('⚠️ Failed to log admin action:', error);
    }
  }

  /**
   * Log user profile actions for audit trail
   */
  private static async logUserProfileAction(
    userId: string,
    fieldName: string,
    value: any,
    adminUserId?: string
  ): Promise<void> {
    try {
      // Only log if we have admin user ID
      if (!adminUserId) return;

      // Use the existing admin_audit_logs table structure
      const { error } = await (supabase as any)
        .from('admin_audit_logs')
        .insert({
          action: 'user_modification',
          resource_type: 'custom_users',
          resource_id: userId,
          user_id: userId,
          admin_user_id: adminUserId,
          action_details: {
            field_name: fieldName,
            new_value: value,
            action_type: 'field_update'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            context: 'inline_editing'
          }
        });

      if (error) {
        // Don't throw error for logging failures, just warn
        console.warn('⚠️ Failed to log user profile action:', error);
      }
    } catch (error) {
      console.warn('⚠️ Failed to log user profile action:', error);
    }
  }
} 