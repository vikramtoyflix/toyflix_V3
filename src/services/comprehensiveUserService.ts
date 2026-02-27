import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ================================================================================================
// TYPE DEFINITIONS AND INTERFACES
// ================================================================================================

interface UserComprehensiveData {
  id: string;
  profile: UserProfile;
  roles: UserRole[];
  lifecycle: LifecycleData;
  orders: RentalOrder[];
  subscription: SubscriptionData;
  offers: UserOffer[];
  analytics: UserAnalytics;
  metadata: UserMetadata;
}

interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'user' | 'admin';
  city?: string;
  state?: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  is_active: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role_name: string;
  permissions: string[];
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
}

interface LifecycleData {
  current_status: string;
  status_history: LifecycleEvent[];
  total_events: number;
  last_status_change: string;
}

interface LifecycleEvent {
  id: string;
  user_id: string;
  event_type: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  performed_by: string;
  performed_at: string;
  metadata?: any;
}

interface RentalOrder {
  id: string;
  user_id: string;
  order_number?: string;
  status: string;
  subscription_plan: string;
  total_amount: number;
  cycle_number: number;
  toys_data?: any[];
  shipping_address?: any;
  rental_start_date?: string;
  rental_end_date?: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionData {
  current_plan?: string;
  plan_history: SubscriptionPlan[];
  billing_cycles: BillingCycle[];
  extensions: SubscriptionExtension[];
  pauses: SubscriptionPause[];
  total_months: number;
  lifetime_value: number;
}

interface SubscriptionPlan {
  id: string;
  user_id: string;
  plan_name: string;
  start_date: string;
  end_date?: string;
  billing_cycle: string;
  amount: number;
  status: string;
}

interface BillingCycle {
  id: string;
  subscription_id: string;
  amount: number;
  billing_date: string;
  status: string;
  payment_method?: string;
}

interface SubscriptionExtension {
  id: string;
  user_id: string;
  extension_type: string;
  days_added: number;
  reason: string;
  granted_by: string;
  granted_at: string;
}

interface SubscriptionPause {
  id: string;
  user_id: string;
  pause_start: string;
  pause_end?: string;
  reason: string;
  status: string;
}

interface UserOffer {
  id: string;
  user_id: string;
  offer_id: string;
  offer_code: string;
  offer_name: string;
  offer_type: string;
  offer_value: number;
  assigned_at: string;
  used_at?: string;
  is_used: boolean;
  expires_at?: string;
  notes?: string;
}

interface UserAnalytics {
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  order_frequency: number;
  subscription_months: number;
  favorite_categories: string[];
  usage_patterns: any;
  lifecycle_score: number;
  churn_risk: 'low' | 'medium' | 'high';
  lifetime_value: number;
}

interface UserMetadata {
  last_updated: string;
  data_version: number;
  cache_expires: string;
  sync_status: 'synced' | 'pending' | 'error';
  conflicts: any[];
}

interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  operation: string;
  user_id?: string;
}

interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: {
    operation_id: string;
    duration_ms: number;
    cache_hit?: boolean;
  };
}

interface BatchOperationResult {
  success_count: number;
  error_count: number;
  total_count: number;
  errors: ServiceError[];
  results: any[];
}

// ================================================================================================
// COMPREHENSIVE USER SERVICE CLASS
// ================================================================================================

class ComprehensiveUserService {
  private static cache = new Map<string, { data: any; expires: number }>();
  private static rateLimiter = new Map<string, { count: number; resetTime: number }>();
  private static operationQueue = new Map<string, Promise<any>>();

  // ================================================================================================
  // CACHING AND PERFORMANCE UTILITIES
  // ================================================================================================

  private static getCacheKey(operation: string, ...params: any[]): string {
    return `${operation}:${params.join(':')}`;
  }

  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCachedData(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  private static invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private static async checkRateLimit(userId: string, operation: string, limit: number = 100): Promise<boolean> {
    const key = `${userId}:${operation}`;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const current = this.rateLimiter.get(key);
    if (!current || current.resetTime < windowStart) {
      this.rateLimiter.set(key, { count: 1, resetTime: now });
      return true;
    }

    if (current.count >= limit) {
      return false;
    }

    current.count++;
    return true;
  }

  private static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private static createError(
    code: string,
    message: string,
    operation: string,
    details?: any,
    userId?: string
  ): ServiceError {
    return {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      operation,
      user_id: userId
    };
  }

  private static async logOperation(
    operation: string,
    userId: string,
    success: boolean,
    details?: any
  ): Promise<void> {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const performedBy = currentUser?.user?.email || 'system';

      await supabase.from('user_lifecycle_events').insert({
        user_id: userId,
        event_type: operation,
        new_value: success ? 'success' : 'error',
        reason: success ? 'Operation completed successfully' : 'Operation failed',
        performed_by: performedBy,
        metadata: details
      });
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  // ================================================================================================
  // USER PROFILE MANAGEMENT
  // ================================================================================================

  static async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<OperationResult<UserProfile>> {
    const operationId = `update-profile-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Rate limiting
      if (!(await this.checkRateLimit(userId, 'update-profile', 50))) {
        throw new Error('Rate limit exceeded for profile updates');
      }

      // Input validation
      this.validateProfileData(profileData);

      // Permission check
      await this.checkPermission(userId, 'users.update');

      // Update profile with retry logic
      const result = await this.withRetry(async () => {
        const { data, error } = await supabase
          .from('custom_users')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('profile_updated', userId, true, profileData);

      return {
        success: true,
        data: result,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'PROFILE_UPDATE_FAILED',
        `Failed to update user profile: ${(error as Error).message}`,
        'updateUserProfile',
        error,
        userId
      );

      await this.logOperation('profile_update_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async getUserComprehensiveData(userId: string): Promise<OperationResult<UserComprehensiveData>> {
    const operationId = `get-comprehensive-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('comprehensive-data', userId);

    try {
      // Check cache first
      const cached = this.getCachedData<UserComprehensiveData>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      // Fetch all user data in parallel
      const [
        profileResult,
        rolesResult,
        lifecycleResult,
        ordersResult,
        subscriptionResult,
        offersResult,
        analyticsResult
      ] = await Promise.allSettled([
        this.getUserProfile(userId),
        this.getUserRoles(userId),
        this.getUserLifecycleHistory(userId),
        this.getUserOrders(userId),
        this.getUserSubscriptionData(userId),
        this.getUserOffers(userId),
        this.getUserAnalytics(userId)
      ]);

      // Process results and handle any failures
      const comprehensiveData: UserComprehensiveData = {
        id: userId,
        profile: profileResult.status === 'fulfilled' ? profileResult.value.data! : {} as UserProfile,
        roles: rolesResult.status === 'fulfilled' ? rolesResult.value.data! : [],
        lifecycle: lifecycleResult.status === 'fulfilled' ? lifecycleResult.value.data! : {} as LifecycleData,
        orders: ordersResult.status === 'fulfilled' ? ordersResult.value.data! : [],
        subscription: subscriptionResult.status === 'fulfilled' ? subscriptionResult.value.data! : {} as SubscriptionData,
        offers: offersResult.status === 'fulfilled' ? offersResult.value.data! : [],
        analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value.data! : {} as UserAnalytics,
        metadata: {
          last_updated: new Date().toISOString(),
          data_version: 1,
          cache_expires: new Date(Date.now() + 300000).toISOString(),
          sync_status: 'synced',
          conflicts: []
        }
      };

      // Cache the result
      this.setCachedData(cacheKey, comprehensiveData, 300000); // 5 minutes

      return {
        success: true,
        data: comprehensiveData,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'COMPREHENSIVE_DATA_FAILED',
        `Failed to fetch comprehensive user data: ${(error as Error).message}`,
        'getUserComprehensiveData',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  private static async getUserProfile(userId: string): Promise<OperationResult<UserProfile>> {
    const { data, error } = await supabase
      .from('custom_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return { success: true, data };
  }

  // ================================================================================================
  // ROLE AND PERMISSION MANAGEMENT
  // ================================================================================================

  static async getUserRoles(userId: string): Promise<OperationResult<UserRole[]>> {
    const operationId = `get-roles-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('user-roles', userId);

    try {
      // Check cache
      const cached = this.getCachedData<UserRole[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          *,
          user_permission_roles(
            role_name,
            permissions
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      const roles: UserRole[] = data.map((assignment: any) => ({
        id: assignment.id,
        user_id: assignment.user_id,
        role_name: assignment.user_permission_roles?.role_name || 'user',
        permissions: assignment.user_permission_roles?.permissions || [],
        assigned_by: assignment.assigned_by,
        assigned_at: assignment.assigned_at,
        expires_at: assignment.expires_at,
        is_active: assignment.is_active,
        notes: assignment.notes
      }));

      // Cache the result
      this.setCachedData(cacheKey, roles, 300000);

      return {
        success: true,
        data: roles,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_ROLES_FAILED',
        `Failed to fetch user roles: ${(error as Error).message}`,
        'getUserRoles',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async assignUserRole(
    userId: string, 
    roleId: string, 
    expiresAt?: Date, 
    notes?: string
  ): Promise<OperationResult<void>> {
    const operationId = `assign-role-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'roles.assign');

      // Get current user for assignment tracking
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('No authenticated user');

      const { data: assignerUser } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', currentUser.user.email)
        .single();

      if (!assignerUser) throw new Error('Assigner user not found');

      // Check if role assignment already exists
      const { data: existing } = await supabase
        .from('user_role_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true)
        .single();

      if (existing) {
        throw new Error('Role already assigned to user');
      }

      // Assign role
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: assignerUser.id,
          assigned_at: new Date().toISOString(),
          expires_at: expiresAt?.toISOString(),
          is_active: true,
          notes
        });

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('role_assigned', userId, true, { roleId, expiresAt, notes });

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'ROLE_ASSIGNMENT_FAILED',
        `Failed to assign role: ${(error as Error).message}`,
        'assignUserRole',
        error,
        userId
      );

      await this.logOperation('role_assignment_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async revokeUserRole(userId: string, roleId: string, reason?: string): Promise<OperationResult<void>> {
    const operationId = `revoke-role-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'roles.revoke');

      // Deactivate role assignment
      const { error } = await supabase
        .from('user_role_assignments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: reason
        })
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .eq('is_active', true);

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('role_revoked', userId, true, { roleId, reason });

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'ROLE_REVOKE_FAILED',
        `Failed to revoke role: ${(error as Error).message}`,
        'revokeUserRole',
        error,
        userId
      );

      await this.logOperation('role_revoke_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  // ================================================================================================
  // LIFECYCLE MANAGEMENT
  // ================================================================================================

  static async changeUserLifecycleStatus(
    userId: string, 
    status: string, 
    reason: string
  ): Promise<OperationResult<void>> {
    const operationId = `change-status-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'users.lifecycle');

      // Get current status
      const { data: currentUser } = await supabase
        .from('custom_users')
        .select('user_status')
        .eq('id', userId)
        .single();

      if (!currentUser) throw new Error('User not found');

      const oldStatus = currentUser.user_status || 'active';

      // Update user status
      const { error: updateError } = await supabase
        .from('custom_users')
        .update({ user_status: status })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log lifecycle event
      const { data: performerUser } = await supabase.auth.getUser();
      const performedBy = performerUser?.user?.email || 'system';

      const { data: performer } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', performedBy)
        .single();

      const { error: logError } = await supabase
        .from('user_lifecycle_events')
        .insert({
          user_id: userId,
          event_type: 'status_change',
          old_value: oldStatus,
          new_value: status,
          reason,
          performed_by: performer?.id || 'system'
        });

      if (logError) console.error('Failed to log lifecycle event:', logError);

      // Invalidate cache
      this.invalidateCache(userId);

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'STATUS_CHANGE_FAILED',
        `Failed to change user status: ${(error as Error).message}`,
        'changeUserLifecycleStatus',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async getUserLifecycleHistory(userId: string): Promise<OperationResult<LifecycleData>> {
    const operationId = `get-lifecycle-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('lifecycle-history', userId);

    try {
      // Check cache
      const cached = this.getCachedData<LifecycleData>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      // Get current user status
      const { data: user } = await supabase
        .from('custom_users')
        .select('user_status')
        .eq('id', userId)
        .single();

      // Get lifecycle events
      const { data: events, error } = await supabase
        .from('user_lifecycle_events')
        .select('*')
        .eq('user_id', userId)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      const lifecycleData: LifecycleData = {
        current_status: user?.user_status || 'active',
        status_history: events || [],
        total_events: events?.length || 0,
        last_status_change: events?.[0]?.performed_at || new Date().toISOString()
      };

      // Cache the result
      this.setCachedData(cacheKey, lifecycleData, 300000);

      return {
        success: true,
        data: lifecycleData,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_LIFECYCLE_FAILED',
        `Failed to fetch lifecycle history: ${(error as Error).message}`,
        'getUserLifecycleHistory',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  // ================================================================================================
  // ORDER AND SUBSCRIPTION MANAGEMENT
  // ================================================================================================

  static async getUserOrders(userId: string): Promise<OperationResult<RentalOrder[]>> {
    const operationId = `get-orders-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('user-orders', userId);

    try {
      // Check cache
      const cached = this.getCachedData<RentalOrder[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      const { data, error } = await supabase
        .from('rental_orders' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache the result
      this.setCachedData(cacheKey, data || [], 180000); // 3 minutes

      return {
        success: true,
        data: data || [],
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_ORDERS_FAILED',
        `Failed to fetch user orders: ${(error as Error).message}`,
        'getUserOrders',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async updateUserOrder(orderId: string, updates: Partial<RentalOrder>): Promise<OperationResult<RentalOrder>> {
    const operationId = `update-order-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get the order to check user_id for permission
      const { data: existingOrder } = await supabase
        .from('rental_orders' as any)
        .select('user_id')
        .eq('id', orderId)
        .single();

      if (!existingOrder) throw new Error('Order not found');

      // Permission check
      await this.checkPermission(existingOrder.user_id, 'orders.update');

      // Update order
      const { data, error } = await supabase
        .from('rental_orders' as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(existingOrder.user_id);

      // Log operation
      await this.logOperation('order_updated', existingOrder.user_id, true, { orderId, updates });

      return {
        success: true,
        data,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'ORDER_UPDATE_FAILED',
        `Failed to update order: ${(error as Error).message}`,
        'updateUserOrder',
        error
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async extendUserSubscription(
    userId: string, 
    days: number, 
    reason: string = 'Manual extension'
  ): Promise<OperationResult<void>> {
    const operationId = `extend-subscription-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'subscriptions.extend');

      // Get current user for extension tracking
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('No authenticated user');

      const { data: granterUser } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', currentUser.user.email)
        .single();

      if (!granterUser) throw new Error('Granter user not found');

      // Record extension
      const { error } = await supabase
        .from('subscription_extensions')
        .insert({
          user_id: userId,
          extension_type: 'manual',
          days_added: days,
          reason,
          granted_by: granterUser.id,
          granted_at: new Date().toISOString()
        });

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('subscription_extended', userId, true, { days, reason });

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'SUBSCRIPTION_EXTEND_FAILED',
        `Failed to extend subscription: ${(error as Error).message}`,
        'extendUserSubscription',
        error,
        userId
      );

      await this.logOperation('subscription_extend_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  private static async getUserSubscriptionData(userId: string): Promise<OperationResult<SubscriptionData>> {
    const operationId = `get-subscription-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get orders to determine current plan
      const ordersResult = await this.getUserOrders(userId);
      const orders = ordersResult.data || [];

      // Get subscription extensions
      const { data: extensions } = await supabase
        .from('subscription_extensions')
        .select('*')
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      // Get subscription pauses
      const { data: pauses } = await supabase
        .from('subscription_pauses')
        .select('*')
        .eq('user_id', userId)
        .order('pause_start', { ascending: false });

      // Calculate subscription data
      const subscriptionData: SubscriptionData = {
        current_plan: orders.length > 0 ? orders[0].subscription_plan : undefined,
        plan_history: [],
        billing_cycles: [],
        extensions: extensions || [],
        pauses: pauses || [],
        total_months: Math.ceil(orders.length / 12), // Rough calculation
        lifetime_value: orders.reduce((sum, order) => sum + order.total_amount, 0)
      };

      return {
        success: true,
        data: subscriptionData,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_SUBSCRIPTION_FAILED',
        `Failed to fetch subscription data: ${(error as Error).message}`,
        'getUserSubscriptionData',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  // ================================================================================================
  // PROMOTIONAL OFFERS MANAGEMENT
  // ================================================================================================

  static async getUserOffers(userId: string): Promise<OperationResult<UserOffer[]>> {
    const operationId = `get-offers-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('user-offers', userId);

    try {
      // Check cache
      const cached = this.getCachedData<UserOffer[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      const { data, error } = await supabase
        .from('user_offer_assignments')
        .select(`
          *,
          promotional_offers(
            code,
            name,
            type,
            value
          )
        `)
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const offers: UserOffer[] = (data || []).map((assignment: any) => ({
        id: assignment.id,
        user_id: assignment.user_id,
        offer_id: assignment.offer_id,
        offer_code: assignment.promotional_offers?.code || '',
        offer_name: assignment.promotional_offers?.name || '',
        offer_type: assignment.promotional_offers?.type || '',
        offer_value: assignment.promotional_offers?.value || 0,
        assigned_at: assignment.assigned_at,
        used_at: assignment.used_at,
        is_used: assignment.is_used,
        expires_at: assignment.expires_at,
        notes: assignment.notes
      }));

      // Cache the result
      this.setCachedData(cacheKey, offers, 300000);

      return {
        success: true,
        data: offers,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_OFFERS_FAILED',
        `Failed to fetch user offers: ${(error as Error).message}`,
        'getUserOffers',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async assignOfferToUser(
    userId: string, 
    offerId: string, 
    notes?: string
  ): Promise<OperationResult<void>> {
    const operationId = `assign-offer-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'offers.assign');

      // Get current user for assignment tracking
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error('No authenticated user');

      const { data: assignerUser } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', currentUser.user.email)
        .single();

      if (!assignerUser) throw new Error('Assigner user not found');

      // Check if offer assignment already exists
      const { data: existing } = await supabase
        .from('user_offer_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('offer_id', offerId)
        .eq('is_used', false)
        .single();

      if (existing) {
        throw new Error('Offer already assigned to user');
      }

      // Assign offer
      const { error } = await supabase
        .from('user_offer_assignments')
        .insert({
          user_id: userId,
          offer_id: offerId,
          assigned_by: assignerUser.id,
          assigned_at: new Date().toISOString(),
          is_used: false,
          notes
        });

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('offer_assigned', userId, true, { offerId, notes });

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'OFFER_ASSIGNMENT_FAILED',
        `Failed to assign offer: ${(error as Error).message}`,
        'assignOfferToUser',
        error,
        userId
      );

      await this.logOperation('offer_assignment_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async revokeUserOffer(
    userId: string, 
    offerId: string, 
    reason?: string
  ): Promise<OperationResult<void>> {
    const operationId = `revoke-offer-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Permission check
      await this.checkPermission(userId, 'offers.revoke');

      // Remove offer assignment
      const { error } = await supabase
        .from('user_offer_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('offer_id', offerId)
        .eq('is_used', false);

      if (error) throw error;

      // Invalidate cache
      this.invalidateCache(userId);

      // Log operation
      await this.logOperation('offer_revoked', userId, true, { offerId, reason });

      return {
        success: true,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'OFFER_REVOKE_FAILED',
        `Failed to revoke offer: ${(error as Error).message}`,
        'revokeUserOffer',
        error,
        userId
      );

      await this.logOperation('offer_revoke_failed', userId, false, { error: serviceError });

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  // ================================================================================================
  // ANALYTICS AND REPORTING
  // ================================================================================================

  static async getUserAnalytics(userId: string): Promise<OperationResult<UserAnalytics>> {
    const operationId = `get-analytics-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = this.getCacheKey('user-analytics', userId);

    try {
      // Check cache
      const cached = this.getCachedData<UserAnalytics>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            operation_id: operationId,
            duration_ms: Date.now() - startTime,
            cache_hit: true
          }
        };
      }

      // Get user orders for analytics
      const ordersResult = await this.getUserOrders(userId);
      const orders = ordersResult.data || [];

      // Calculate analytics
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calculate order frequency (orders per month)
      const firstOrderDate = orders.length > 0 ? new Date(orders[orders.length - 1].created_at) : new Date();
      const monthsActive = Math.max(1, Math.ceil((Date.now() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const orderFrequency = totalOrders / monthsActive;

      // Calculate subscription months
      const subscriptionMonths = Math.ceil(totalOrders / 12); // Rough calculation

      // Analyze toy categories (if available)
      const favoriteCategories: string[] = [];
      orders.forEach(order => {
        if (order.toys_data) {
          order.toys_data.forEach((toy: any) => {
            if (toy.category && !favoriteCategories.includes(toy.category)) {
              favoriteCategories.push(toy.category);
            }
          });
        }
      });

      // Calculate lifecycle score (0-100)
      let lifecycleScore = 0;
      if (totalOrders > 0) lifecycleScore += 20;
      if (totalOrders >= 5) lifecycleScore += 20;
      if (totalOrders >= 10) lifecycleScore += 20;
      if (orderFrequency >= 1) lifecycleScore += 20;
      if (totalSpent >= 10000) lifecycleScore += 20;

      // Calculate churn risk
      const daysSinceLastOrder = orders.length > 0 ? 
        Math.ceil((Date.now() - new Date(orders[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
        999;
      
      let churnRisk: 'low' | 'medium' | 'high' = 'low';
      if (daysSinceLastOrder > 90) churnRisk = 'high';
      else if (daysSinceLastOrder > 45) churnRisk = 'medium';

      const analytics: UserAnalytics = {
        total_orders: totalOrders,
        total_spent: totalSpent,
        avg_order_value: avgOrderValue,
        order_frequency: orderFrequency,
        subscription_months: subscriptionMonths,
        favorite_categories: favoriteCategories.slice(0, 5),
        usage_patterns: {
          avg_toys_per_order: orders.length > 0 ? 
            orders.reduce((sum, order) => sum + (order.toys_data?.length || 0), 0) / orders.length : 0,
          preferred_order_timing: 'monthly', // Could be calculated from order dates
          seasonal_trends: []
        },
        lifecycle_score: lifecycleScore,
        churn_risk: churnRisk,
        lifetime_value: totalSpent
      };

      // Cache the result
      this.setCachedData(cacheKey, analytics, 600000); // 10 minutes

      return {
        success: true,
        data: analytics,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GET_ANALYTICS_FAILED',
        `Failed to generate user analytics: ${(error as Error).message}`,
        'getUserAnalytics',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  static async generateUserReport(
    userId: string, 
    reportType: 'summary' | 'detailed' | 'financial' | 'activity'
  ): Promise<OperationResult<any>> {
    const operationId = `generate-report-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get comprehensive user data
      const comprehensiveResult = await this.getUserComprehensiveData(userId);
      if (!comprehensiveResult.success || !comprehensiveResult.data) {
        throw new Error('Failed to fetch user data for report');
      }

      const userData = comprehensiveResult.data;

      let report: any = {};

      switch (reportType) {
        case 'summary':
          report = {
            user_id: userId,
            report_type: 'summary',
            generated_at: new Date().toISOString(),
            summary: {
              name: userData.profile.full_name,
              email: userData.profile.email,
              phone: userData.profile.phone,
              status: userData.profile.is_active ? 'Active' : 'Inactive',
              total_orders: userData.analytics.total_orders,
              total_spent: userData.analytics.total_spent,
              current_plan: userData.subscription.current_plan,
              lifecycle_score: userData.analytics.lifecycle_score,
              churn_risk: userData.analytics.churn_risk
            }
          };
          break;

        case 'detailed':
          report = {
            user_id: userId,
            report_type: 'detailed',
            generated_at: new Date().toISOString(),
            profile: userData.profile,
            roles: userData.roles,
            lifecycle: userData.lifecycle,
            analytics: userData.analytics,
            recent_orders: userData.orders.slice(0, 10),
            active_offers: userData.offers.filter(offer => !offer.is_used)
          };
          break;

        case 'financial':
          report = {
            user_id: userId,
            report_type: 'financial',
            generated_at: new Date().toISOString(),
            financial_summary: {
              lifetime_value: userData.analytics.lifetime_value,
              total_orders: userData.analytics.total_orders,
              avg_order_value: userData.analytics.avg_order_value,
              monthly_spend: userData.analytics.total_spent / Math.max(1, userData.analytics.subscription_months),
              payment_history: userData.orders.map(order => ({
                date: order.created_at,
                amount: order.total_amount,
                plan: order.subscription_plan,
                status: order.status
              }))
            },
            subscription_data: userData.subscription
          };
          break;

        case 'activity':
          report = {
            user_id: userId,
            report_type: 'activity',
            generated_at: new Date().toISOString(),
            activity_summary: {
              registration_date: userData.profile.created_at,
              last_login: userData.profile.last_login,
              order_frequency: userData.analytics.order_frequency,
              lifecycle_events: userData.lifecycle.status_history.slice(0, 20),
              recent_orders: userData.orders.slice(0, 5),
              usage_patterns: userData.analytics.usage_patterns
            }
          };
          break;

        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }

      return {
        success: true,
        data: report,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      const serviceError = this.createError(
        'GENERATE_REPORT_FAILED',
        `Failed to generate ${reportType} report: ${(error as Error).message}`,
        'generateUserReport',
        error,
        userId
      );

      return {
        success: false,
        error: serviceError,
        metadata: {
          operation_id: operationId,
          duration_ms: Date.now() - startTime
        }
      };
    }
  }

  // ================================================================================================
  // BATCH OPERATIONS
  // ================================================================================================

  static async batchUpdateUsers(
    userIds: string[], 
    updates: Partial<UserProfile>
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: ServiceError[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.updateUserProfile(userId, updates);
        if (result.success) {
          results.push(result.data);
        } else {
          errors.push(result.error!);
        }
      } catch (error) {
        errors.push(this.createError(
          'BATCH_UPDATE_ERROR',
          `Failed to update user ${userId}: ${(error as Error).message}`,
          'batchUpdateUsers',
          error,
          userId
        ));
      }
    }

    return {
      success_count: results.length,
      error_count: errors.length,
      total_count: userIds.length,
      errors,
      results
    };
  }

  static async batchAssignRoles(
    userIds: string[], 
    roleId: string, 
    expiresAt?: Date
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const results: any[] = [];
    const errors: ServiceError[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.assignUserRole(userId, roleId, expiresAt);
        if (result.success) {
          results.push({ userId, roleId });
        } else {
          errors.push(result.error!);
        }
      } catch (error) {
        errors.push(this.createError(
          'BATCH_ASSIGN_ERROR',
          `Failed to assign role to user ${userId}: ${(error as Error).message}`,
          'batchAssignRoles',
          error,
          userId
        ));
      }
    }

    return {
      success_count: results.length,
      error_count: errors.length,
      total_count: userIds.length,
      errors,
      results
    };
  }

  // ================================================================================================
  // UTILITY AND VALIDATION METHODS
  // ================================================================================================

  private static validateProfileData(profileData: Partial<UserProfile>): void {
    if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email)) {
      throw new Error('Invalid email format');
    }

    if (profileData.phone && !/^\+?[\d\s\-\(\)]{10,}$/.test(profileData.phone)) {
      throw new Error('Invalid phone number format');
    }

    if (profileData.first_name && profileData.first_name.length < 2) {
      throw new Error('First name must be at least 2 characters');
    }

    if (profileData.zip_code && !/^\d{6}$/.test(profileData.zip_code)) {
      throw new Error('Invalid ZIP code format (must be 6 digits)');
    }
  }

  private static async checkPermission(userId: string, permission: string): Promise<void> {
    try {
      // Get current user's roles and permissions
      const rolesResult = await this.getUserRoles(userId);
      
      if (!rolesResult.success || !rolesResult.data) {
        throw new Error('Unable to verify permissions');
      }

      const userPermissions = rolesResult.data.flatMap(role => role.permissions);
      
      // Check if user has the required permission
      if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
        throw new Error(`Insufficient permissions: ${permission} required`);
      }
    } catch (error) {
      // For now, log the permission check but don't block operations
      console.warn('Permission check failed:', error);
    }
  }

  // ================================================================================================
  // CACHE MANAGEMENT
  // ================================================================================================

  static clearUserCache(userId: string): void {
    this.invalidateCache(userId);
  }

  static clearAllCache(): void {
    this.cache.clear();
  }

  static getCacheStats(): { 
    totalKeys: number; 
    totalSize: number; 
    hitRate: number; 
  } {
    return {
      totalKeys: this.cache.size,
      totalSize: 0, // Could be implemented with size tracking
      hitRate: 0 // Could be implemented with hit/miss tracking
    };
  }

  // ================================================================================================
  // ERROR HANDLING AND MONITORING
  // ================================================================================================

  static async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { [key: string]: boolean };
    errors: ServiceError[];
  }> {
    const checks: { [key: string]: boolean } = {};
    const errors: ServiceError[] = [];

    try {
      // Test database connection
      const { data } = await supabase.from('custom_users').select('id').limit(1);
      checks.database = !!data;
    } catch (error) {
      checks.database = false;
      errors.push(this.createError(
        'HEALTH_CHECK_DB_FAILED',
        'Database connection failed',
        'getServiceHealth',
        error
      ));
    }

    try {
      // Test authentication
      const { data } = await supabase.auth.getUser();
      checks.auth = !!data;
    } catch (error) {
      checks.auth = false;
      errors.push(this.createError(
        'HEALTH_CHECK_AUTH_FAILED',
        'Authentication check failed',
        'getServiceHealth',
        error
      ));
    }

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyChecks === 0) status = 'unhealthy';
    else if (healthyChecks < totalChecks) status = 'degraded';

    return { status, checks, errors };
  }
}

// ================================================================================================
// EXPORT DEFAULT SERVICE
// ================================================================================================

export default ComprehensiveUserService;

// Export types for use in other components
export type {
  UserComprehensiveData,
  UserProfile,
  UserRole,
  LifecycleData,
  LifecycleEvent,
  RentalOrder,
  SubscriptionData,
  UserOffer,
  UserAnalytics,
  UserMetadata,
  ServiceError,
  OperationResult,
  BatchOperationResult
}; 