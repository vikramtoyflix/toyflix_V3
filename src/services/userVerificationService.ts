import { supabase } from '@/integrations/supabase/client';

interface UserVerificationResult {
  success: boolean;
  error?: string;
  userUpdated?: boolean;
  verificationStatus?: {
    phoneVerified: boolean;
    profileComplete: boolean;
    hasActiveSessions: boolean;
  };
}

interface SignupCompletionData {
  userId: string;
  phone: string;
  firstName: string;
  lastName: string;
  email?: string;
  pincode?: string;
  source?: string;
}

/**
 * Enhanced User Verification Service
 * Ensures proper phone verification and profile completion tracking
 */
export class UserVerificationService {
  
  /**
   * Ensure user is properly marked as phone verified after OTP verification
   */
  static async ensurePhoneVerified(phone: string, userId?: string): Promise<UserVerificationResult> {
    try {
      console.log('🔍 UserVerificationService: Ensuring phone verified for:', phone);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // First, check if OTP was verified for this phone
      const { data: otpRecord, error: otpError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone_number', formattedPhone)
        .eq('is_verified', true)
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError) {
        console.error('🔍 Error checking OTP verification:', otpError);
        return { success: false, error: 'Failed to check OTP verification status' };
      }

      if (!otpRecord) {
        console.log('🔍 No verified OTP found for phone:', formattedPhone);
        return { success: false, error: 'No verified OTP found for this phone number' };
      }

      // Update user phone verification status
      const updateQuery = userId 
        ? supabase.from('custom_users').update({ 
            phone_verified: true, 
            updated_at: new Date().toISOString() 
          }).eq('id', userId)
        : supabase.from('custom_users').update({ 
            phone_verified: true, 
            updated_at: new Date().toISOString() 
          }).eq('phone', formattedPhone);

      const { data: updatedUser, error: updateError } = await updateQuery.select().single();

      if (updateError) {
        console.error('🔍 Error updating phone verification:', updateError);
        return { success: false, error: 'Failed to update phone verification status' };
      }

      console.log('✅ Phone verification updated for user:', updatedUser.id);

      // Check verification status
      const verificationStatus = {
        phoneVerified: true,
        profileComplete: !!(updatedUser.first_name && updatedUser.last_name),
        hasActiveSessions: false // Will be checked separately
      };

      return {
        success: true,
        userUpdated: true,
        verificationStatus
      };

    } catch (error: any) {
      console.error('🔍 UserVerificationService error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Complete user signup with proper verification tracking
   */
  static async completeSignup(data: SignupCompletionData): Promise<UserVerificationResult> {
    try {
      console.log('🔍 UserVerificationService: Completing signup for:', data.phone);

      const formattedPhone = data.phone.startsWith('+') ? data.phone : `+91${data.phone}`;

      // Update user with complete profile and verification
      const { data: updatedUser, error: updateError } = await supabase
        .from('custom_users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email || null,
          zip_code: data.pincode || null,
          phone_verified: true, // CRITICAL: Always mark as verified on signup completion
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', data.userId)
        .select()
        .single();

      if (updateError) {
        console.error('🔍 Error completing signup:', updateError);
        return { success: false, error: 'Failed to complete signup' };
      }

      // Log signup completion for tracking
      await this.logSignupCompletion(data);

      console.log('✅ Signup completed successfully for user:', updatedUser.id);

      const verificationStatus = {
        phoneVerified: true,
        profileComplete: true,
        hasActiveSessions: false
      };

      return {
        success: true,
        userUpdated: true,
        verificationStatus
      };

    } catch (error: any) {
      console.error('🔍 UserVerificationService completeSignup error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Validate user data integrity
   */
  static async validateUserData(userId: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const { data: user, error } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          isValid: false,
          issues: ['User not found'],
          recommendations: ['Check if user ID is correct']
        };
      }

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check phone verification
      if (!user.phone_verified) {
        issues.push('Phone not verified');
        recommendations.push('Run phone verification fix');
      }

      // Check profile completeness
      if (!user.first_name || user.first_name.trim() === '') {
        issues.push('Missing first name');
        recommendations.push('Prompt user to complete profile');
      }

      if (!user.last_name || user.last_name.trim() === '') {
        issues.push('Missing last name');
        recommendations.push('Prompt user to complete profile');
      }

      // Check phone format
      if (!user.phone.startsWith('+91')) {
        issues.push('Invalid phone format');
        recommendations.push('Update phone format to +91XXXXXXXXXX');
      }

      // Check if user is active
      if (!user.is_active) {
        issues.push('User marked as inactive');
        recommendations.push('Reactivate user account');
      }

      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error: any) {
      return {
        isValid: false,
        issues: ['Validation error: ' + error.message],
        recommendations: ['Check database connection and user permissions']
      };
    }
  }

  /**
   * Log signup completion for tracking
   */
  private static async logSignupCompletion(data: SignupCompletionData): Promise<void> {
    try {
      // Create a signup completion log entry
      const logEntry = {
        user_id: data.userId,
        phone: data.phone,
        completion_timestamp: new Date().toISOString(),
        source: data.source || 'unknown',
        profile_data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          pincode: data.pincode
        }
      };

      console.log('📊 Logging signup completion:', logEntry);
      
      // You can store this in a separate table for tracking
      // For now, we'll just log it
      
    } catch (error) {
      console.error('Failed to log signup completion:', error);
      // Don't fail the signup process for logging errors
    }
  }

  /**
   * Bulk fix verification issues
   */
  static async bulkFixVerificationIssues(): Promise<{
    success: boolean;
    fixedCount: number;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];
      let fixedCount = 0;

      // Fix 1: Update phone_verified for users with verified OTPs
      const { data: otpFixResult, error: otpFixError } = await supabase.rpc('fix_phone_verification_from_otps');
      
      if (otpFixError) {
        errors.push('Failed to fix OTP verification: ' + otpFixError.message);
      } else {
        fixedCount += otpFixResult || 0;
      }

      // Fix 2: Update phone formats
      const { data: phoneFormatResult, error: phoneFormatError } = await supabase.rpc('fix_phone_formats');
      
      if (phoneFormatError) {
        errors.push('Failed to fix phone formats: ' + phoneFormatError.message);
      } else {
        fixedCount += phoneFormatResult || 0;
      }

      return {
        success: errors.length === 0,
        fixedCount,
        errors
      };

    } catch (error: any) {
      return {
        success: false,
        fixedCount: 0,
        errors: [error.message || 'Unknown error during bulk fix']
      };
    }
  }

  /**
   * Monitor signup funnel health
   */
  static async getSignupFunnelHealth(): Promise<{
    totalSignups: number;
    phoneVerifiedRate: number;
    profileCompleteRate: number;
    adminVisibleRate: number;
    issues: string[];
  }> {
    try {
      const { data: stats, error } = await supabase.rpc('get_signup_funnel_stats');
      
      if (error) {
        throw new Error(error.message);
      }

      const issues: string[] = [];

      // Check for concerning rates
      if (stats.phone_verified_rate < 90) {
        issues.push(`Low phone verification rate: ${stats.phone_verified_rate}%`);
      }

      if (stats.profile_complete_rate < 80) {
        issues.push(`Low profile completion rate: ${stats.profile_complete_rate}%`);
      }

      if (stats.admin_visible_rate < 70) {
        issues.push(`Low admin visibility rate: ${stats.admin_visible_rate}%`);
      }

      return {
        totalSignups: stats.total_signups,
        phoneVerifiedRate: stats.phone_verified_rate,
        profileCompleteRate: stats.profile_complete_rate,
        adminVisibleRate: stats.admin_visible_rate,
        issues
      };

    } catch (error: any) {
      return {
        totalSignups: 0,
        phoneVerifiedRate: 0,
        profileCompleteRate: 0,
        adminVisibleRate: 0,
        issues: ['Failed to get funnel stats: ' + error.message]
      };
    }
  }
}

export default UserVerificationService;
