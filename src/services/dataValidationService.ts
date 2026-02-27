import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
}

interface FunnelHealth {
  totalSignups: number;
  phoneVerificationRate: number;
  profileCompletionRate: number;
  adminVisibilityRate: number;
  sessionCreationRate: number;
  issues: string[];
  recommendations: string[];
}

/**
 * Data Validation Service for User Signup Integrity
 */
export class DataValidationService {
  
  /**
   * Validate individual user data integrity
   */
  static async validateUserIntegrity(userId: string): Promise<ValidationResult> {
    try {
      const { data: user, error } = await supabase
        .from('custom_users')
        .select(`
          *,
          user_sessions(count)
        `)
        .eq('id', userId)
        .single();

      if (error || !user) {
        return {
          isValid: false,
          errors: ['User not found or database error'],
          warnings: [],
          fixes: ['Check user ID and database connection']
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const fixes: string[] = [];

      // Phone validation
      if (!user.phone) {
        errors.push('Missing phone number');
        fixes.push('Add phone number to user record');
      } else if (!user.phone.startsWith('+91')) {
        warnings.push('Phone number format may be incorrect');
        fixes.push(`UPDATE custom_users SET phone = '+91${user.phone}' WHERE id = '${userId}'`);
      }

      // Phone verification validation
      if (!user.phone_verified) {
        errors.push('Phone not verified');
        fixes.push(`UPDATE custom_users SET phone_verified = true WHERE id = '${userId}' AND phone IN (SELECT phone_number FROM otp_verifications WHERE is_verified = true)`);
      }

      // Profile completeness validation
      if (!user.first_name || user.first_name.trim() === '') {
        warnings.push('Missing first name');
        fixes.push('Prompt user to complete profile');
      }

      if (!user.last_name || user.last_name.trim() === '') {
        warnings.push('Missing last name');
        fixes.push('Prompt user to complete profile');
      }

      // Active status validation
      if (!user.is_active) {
        errors.push('User marked as inactive');
        fixes.push(`UPDATE custom_users SET is_active = true WHERE id = '${userId}'`);
      }

      // Session validation
      const sessionCount = user.user_sessions?.[0]?.count || 0;
      if (sessionCount === 0 && user.last_login) {
        warnings.push('User logged in but no active sessions');
        fixes.push('Check session creation logic');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fixes
      };

    } catch (error: any) {
      return {
        isValid: false,
        errors: ['Validation error: ' + error.message],
        warnings: [],
        fixes: ['Check database connection and permissions']
      };
    }
  }

  /**
   * Validate signup funnel health
   */
  static async validateSignupFunnelHealth(days: number = 30): Promise<FunnelHealth> {
    try {
      const { data: users, error } = await supabase
        .from('custom_users')
        .select(`
          id,
          phone,
          phone_verified,
          first_name,
          last_name,
          is_active,
          last_login,
          created_at,
          user_sessions(count)
        `)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error || !users) {
        throw new Error(error?.message || 'Failed to fetch user data');
      }

      const totalSignups = users.length;
      const phoneVerified = users.filter(u => u.phone_verified).length;
      const profileComplete = users.filter(u => u.first_name && u.last_name).length;
      const adminVisible = users.filter(u => 
        u.phone_verified && u.first_name && u.is_active
      ).length;
      const hasSessions = users.filter(u => 
        u.user_sessions && u.user_sessions.length > 0
      ).length;

      const phoneVerificationRate = Math.round((phoneVerified / totalSignups) * 100);
      const profileCompletionRate = Math.round((profileComplete / totalSignups) * 100);
      const adminVisibilityRate = Math.round((adminVisible / totalSignups) * 100);
      const sessionCreationRate = Math.round((hasSessions / totalSignups) * 100);

      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for concerning rates
      if (phoneVerificationRate < 85) {
        issues.push(`Low phone verification rate: ${phoneVerificationRate}%`);
        recommendations.push('Fix OTP verification logic');
      }

      if (profileCompletionRate < 75) {
        issues.push(`Low profile completion rate: ${profileCompletionRate}%`);
        recommendations.push('Improve signup flow UX');
      }

      if (adminVisibilityRate < 70) {
        issues.push(`Low admin visibility rate: ${adminVisibilityRate}%`);
        recommendations.push('Fix user filtering in admin panel');
      }

      if (sessionCreationRate < 80) {
        issues.push(`Low session creation rate: ${sessionCreationRate}%`);
        recommendations.push('Check session creation logic');
      }

      return {
        totalSignups,
        phoneVerificationRate,
        profileCompletionRate,
        adminVisibilityRate,
        sessionCreationRate,
        issues,
        recommendations
      };

    } catch (error: any) {
      return {
        totalSignups: 0,
        phoneVerificationRate: 0,
        profileCompletionRate: 0,
        adminVisibilityRate: 0,
        sessionCreationRate: 0,
        issues: ['Failed to get funnel health: ' + error.message],
        recommendations: ['Check database connection and permissions']
      };
    }
  }

  /**
   * Run comprehensive data validation checks
   */
  static async runComprehensiveValidation(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    funnelHealth: FunnelHealth;
    criticalIssues: string[];
    recommendedActions: string[];
  }> {
    try {
      const funnelHealth = await this.validateSignupFunnelHealth();
      const criticalIssues: string[] = [];
      const recommendedActions: string[] = [];

      // Check for critical issues
      if (funnelHealth.phoneVerificationRate < 50) {
        criticalIssues.push('Critical: Phone verification rate below 50%');
        recommendedActions.push('Immediately run phone verification fixes');
      }

      if (funnelHealth.adminVisibilityRate < 30) {
        criticalIssues.push('Critical: Admin visibility rate below 30%');
        recommendedActions.push('Fix user filtering and verification logic');
      }

      // Determine overall health
      let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (criticalIssues.length > 0) {
        overallHealth = 'critical';
      } else if (funnelHealth.issues.length > 0) {
        overallHealth = 'warning';
      }

      return {
        overallHealth,
        funnelHealth,
        criticalIssues,
        recommendedActions: [
          ...recommendedActions,
          ...funnelHealth.recommendations
        ]
      };

    } catch (error: any) {
      return {
        overallHealth: 'critical',
        funnelHealth: {
          totalSignups: 0,
          phoneVerificationRate: 0,
          profileCompletionRate: 0,
          adminVisibilityRate: 0,
          sessionCreationRate: 0,
          issues: ['Validation failed: ' + error.message],
          recommendations: []
        },
        criticalIssues: ['Failed to run validation'],
        recommendedActions: ['Check system health and database connectivity']
      };
    }
  }

  /**
   * Fix common verification issues
   */
  static async fixCommonIssues(): Promise<{
    success: boolean;
    fixesApplied: string[];
    errors: string[];
  }> {
    try {
      const fixesApplied: string[] = [];
      const errors: string[] = [];

      // Run bulk verification fixes
      const { data: bulkFixResult, error: bulkFixError } = await supabase.rpc('fix_common_verification_issues');

      if (bulkFixError) {
        errors.push('Bulk fix failed: ' + bulkFixError.message);
      } else if (bulkFixResult) {
        bulkFixResult.forEach((fix: any) => {
          fixesApplied.push(`${fix.fix_type}: ${fix.users_fixed} users fixed`);
        });
      }

      // Clean up orphaned sessions
      const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_orphaned_sessions');

      if (cleanupError) {
        errors.push('Session cleanup failed: ' + cleanupError.message);
      } else {
        fixesApplied.push(`Orphaned sessions cleaned: ${cleanupResult} sessions removed`);
      }

      return {
        success: errors.length === 0,
        fixesApplied,
        errors
      };

    } catch (error: any) {
      return {
        success: false,
        fixesApplied: [],
        errors: ['Fix operation failed: ' + error.message]
      };
    }
  }

  /**
   * Monitor signup funnel in real-time
   */
  static async getRealtimeFunnelStats(): Promise<{
    current: FunnelHealth;
    trends: {
      last24h: number;
      last7d: number;
      last30d: number;
    };
    alerts: string[];
  }> {
    try {
      const current = await this.validateSignupFunnelHealth(1); // Last 24 hours
      const last7d = await this.validateSignupFunnelHealth(7);
      const last30d = await this.validateSignupFunnelHealth(30);

      const alerts: string[] = [];

      // Check for trending issues
      if (current.phoneVerificationRate < last7d.phoneVerificationRate - 10) {
        alerts.push('Phone verification rate declining');
      }

      if (current.profileCompletionRate < last7d.profileCompletionRate - 15) {
        alerts.push('Profile completion rate declining');
      }

      if (current.totalSignups > 0 && current.adminVisibilityRate < 50) {
        alerts.push('Critical: Most new signups not visible in admin');
      }

      return {
        current,
        trends: {
          last24h: current.totalSignups,
          last7d: last7d.totalSignups,
          last30d: last30d.totalSignups
        },
        alerts
      };

    } catch (error: any) {
      return {
        current: {
          totalSignups: 0,
          phoneVerificationRate: 0,
          profileCompletionRate: 0,
          adminVisibilityRate: 0,
          sessionCreationRate: 0,
          issues: ['Failed to get stats: ' + error.message],
          recommendations: []
        },
        trends: { last24h: 0, last7d: 0, last30d: 0 },
        alerts: ['Failed to get realtime stats']
      };
    }
  }
}

export default DataValidationService;
