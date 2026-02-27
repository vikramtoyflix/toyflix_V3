import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useToast } from '@/hooks/use-toast';
import { useState, useCallback } from 'react';

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

export interface UserRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: Record<string, any>;
  is_system_role: boolean;
  is_active: boolean;
  assigned_at?: string;
  expires_at?: string;
  assigned_by?: string;
  notes?: string;
}

export interface AvailableRole {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: Record<string, any>;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermissions {
  [key: string]: any;
}

export interface LifecycleEvent {
  id: string;
  event_type: string;
  previous_state?: any;
  new_state?: any;
  performed_by?: string;
  performed_by_name?: string;
  reason?: string;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  expiresAt?: string;
  notes?: string;
}

export interface UserRoleStats {
  totalRoles: number;
  activeRoles: number;
  expiredRoles: number;
  systemRoles: number;
  customRoles: number;
}

// ================================================================================================
// QUERY KEYS
// ================================================================================================

const QUERY_KEYS = {
  USER_ROLES: (userId: string) => ['user-roles', userId],
  AVAILABLE_ROLES: () => ['available-roles'],
  USER_PERMISSIONS: (userId: string) => ['user-permissions', userId],
  LIFECYCLE_EVENTS: (userId: string) => ['lifecycle-events', userId],
  USER_ROLE_STATS: (userId: string) => ['user-role-stats', userId],
  ROLE_ASSIGNMENTS: () => ['role-assignments'],
} as const;

// ================================================================================================
// MAIN HOOK
// ================================================================================================

export const useUserRoles = (userId?: string) => {
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // ================================================================================================
  // QUERY: Get User's Assigned Roles
  // ================================================================================================

  const {
    data: userRoles = [],
    isLoading: userRolesLoading,
    error: userRolesError,
    refetch: refetchUserRoles
  } = useQuery({
    queryKey: QUERY_KEYS.USER_ROLES(userId || ''),
    queryFn: async (): Promise<UserRole[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          id,
          assigned_at,
          expires_at,
          notes,
          assigned_by,
          user_permission_roles (
            id,
            name,
            display_name,
            description,
            permissions,
            is_system_role,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }

      return data.map(assignment => ({
        id: assignment.user_permission_roles.id,
        name: assignment.user_permission_roles.name,
        display_name: assignment.user_permission_roles.display_name,
        description: assignment.user_permission_roles.description,
        permissions: assignment.user_permission_roles.permissions,
        is_system_role: assignment.user_permission_roles.is_system_role,
        is_active: assignment.user_permission_roles.is_active,
        assigned_at: assignment.assigned_at,
        expires_at: assignment.expires_at,
        assigned_by: assignment.assigned_by,
        notes: assignment.notes
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ================================================================================================
  // QUERY: Get All Available Roles
  // ================================================================================================

  const {
    data: availableRoles = [],
    isLoading: availableRolesLoading,
    error: availableRolesError,
    refetch: refetchAvailableRoles
  } = useQuery({
    queryKey: QUERY_KEYS.AVAILABLE_ROLES(),
    queryFn: async (): Promise<AvailableRole[]> => {
      const { data, error } = await supabase
        .from('user_permission_roles')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Error fetching available roles:', error);
        throw error;
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // ================================================================================================
  // QUERY: Get User's Effective Permissions
  // ================================================================================================

  const {
    data: userPermissions = {},
    isLoading: userPermissionsLoading,
    error: userPermissionsError,
    refetch: refetchUserPermissions
  } = useQuery({
    queryKey: QUERY_KEYS.USER_PERMISSIONS(userId || ''),
    queryFn: async (): Promise<UserPermissions> => {
      if (!userId) return {};

      const { data, error } = await supabase
        .rpc('get_user_effective_permissions', { user_id_param: userId });

      if (error) {
        console.error('Error fetching user permissions:', error);
        throw error;
      }

      return data || {};
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ================================================================================================
  // QUERY: Get User's Lifecycle Events
  // ================================================================================================

  const {
    data: lifecycleEvents = [],
    isLoading: lifecycleEventsLoading,
    error: lifecycleEventsError,
    refetch: refetchLifecycleEvents
  } = useQuery({
    queryKey: QUERY_KEYS.LIFECYCLE_EVENTS(userId || ''),
    queryFn: async (): Promise<LifecycleEvent[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_lifecycle_events')
        .select(`
          id,
          event_type,
          previous_state,
          new_state,
          performed_by,
          reason,
          notes,
          ip_address,
          user_agent,
          created_at,
          performed_by_user:custom_users!user_lifecycle_events_performed_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching lifecycle events:', error);
        throw error;
      }

      return data.map(event => ({
        id: event.id,
        event_type: event.event_type,
        previous_state: event.previous_state,
        new_state: event.new_state,
        performed_by: event.performed_by,
        performed_by_name: event.performed_by_user 
          ? `${event.performed_by_user.first_name} ${event.performed_by_user.last_name}`.trim()
          : 'System',
        reason: event.reason,
        notes: event.notes,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        created_at: event.created_at
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ================================================================================================
  // QUERY: Get User Role Statistics
  // ================================================================================================

  const {
    data: userRoleStats,
    isLoading: userRoleStatsLoading,
    error: userRoleStatsError
  } = useQuery({
    queryKey: QUERY_KEYS.USER_ROLE_STATS(userId || ''),
    queryFn: async (): Promise<UserRoleStats> => {
      if (!userId) return {
        totalRoles: 0,
        activeRoles: 0,
        expiredRoles: 0,
        systemRoles: 0,
        customRoles: 0
      };

      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          id,
          expires_at,
          is_active,
          user_permission_roles (
            is_system_role
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user role stats:', error);
        throw error;
      }

      const now = new Date();
      const stats = data.reduce((acc, assignment) => {
        acc.totalRoles++;
        
        if (assignment.is_active) {
          acc.activeRoles++;
        }
        
        if (assignment.expires_at && new Date(assignment.expires_at) < now) {
          acc.expiredRoles++;
        }
        
        if (assignment.user_permission_roles.is_system_role) {
          acc.systemRoles++;
        } else {
          acc.customRoles++;
        }
        
        return acc;
      }, {
        totalRoles: 0,
        activeRoles: 0,
        expiredRoles: 0,
        systemRoles: 0,
        customRoles: 0
      });

      return stats;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ================================================================================================
  // MUTATION: Assign Role to User
  // ================================================================================================

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, expiresAt, notes }: RoleAssignment) => {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          expires_at: expiresAt,
          notes: notes,
          assigned_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error assigning role:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLES(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PERMISSIONS(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIFECYCLE_EVENTS(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLE_STATS(variables.userId) });
      
      toast({
        title: "Role Assigned Successfully",
        description: "The role has been assigned to the user.",
      });
    },
    onError: (error) => {
      console.error('Error assigning role:', error);
      toast({
        title: "Error Assigning Role",
        description: "Failed to assign the role. Please try again.",
        variant: "destructive",
      });
    }
  });

  // ================================================================================================
  // MUTATION: Remove Role from User
  // ================================================================================================

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .select()
        .single();

      if (error) {
        console.error('Error removing role:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLES(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PERMISSIONS(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIFECYCLE_EVENTS(variables.userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLE_STATS(variables.userId) });
      
      toast({
        title: "Role Removed Successfully",
        description: "The role has been removed from the user.",
      });
    },
    onError: (error) => {
      console.error('Error removing role:', error);
      toast({
        title: "Error Removing Role",
        description: "Failed to remove the role. Please try again.",
        variant: "destructive",
      });
    }
  });

  // ================================================================================================
  // UTILITY FUNCTIONS
  // ================================================================================================

  const checkPermission = useCallback((permission: string): boolean => {
    if (!userPermissions || typeof userPermissions !== 'object') return false;
    
    // Split permission path (e.g., 'users.write' -> ['users', 'write'])
    const pathParts = permission.split('.');
    let current = userPermissions;
    
    for (const part of pathParts) {
      if (typeof current === 'object' && current !== null && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return current === true;
  }, [userPermissions]);

  const assignRole = useCallback(async (
    targetUserId: string,
    roleId: string,
    expiresAt?: string,
    notes?: string
  ) => {
    setIsLoading(true);
    try {
      await assignRoleMutation.mutateAsync({
        userId: targetUserId,
        roleId,
        expiresAt,
        notes
      });
    } finally {
      setIsLoading(false);
    }
  }, [assignRoleMutation]);

  const removeRole = useCallback(async (
    targetUserId: string,
    roleId: string
  ) => {
    setIsLoading(true);
    try {
      await removeRoleMutation.mutateAsync({
        userId: targetUserId,
        roleId
      });
    } finally {
      setIsLoading(false);
    }
  }, [removeRoleMutation]);

  const hasRole = useCallback((roleName: string): boolean => {
    return userRoles.some(role => role.name === roleName && role.is_active);
  }, [userRoles]);

  const isRoleExpired = useCallback((role: UserRole): boolean => {
    if (!role.expires_at) return false;
    return new Date(role.expires_at) < new Date();
  }, []);

  const getActiveRoles = useCallback((): UserRole[] => {
    return userRoles.filter(role => !isRoleExpired(role));
  }, [userRoles, isRoleExpired]);

  const getExpiredRoles = useCallback((): UserRole[] => {
    return userRoles.filter(role => isRoleExpired(role));
  }, [userRoles, isRoleExpired]);

  // ================================================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ================================================================================================

  // Subscribe to role assignment changes
  const subscribeToRoleChanges = useCallback((targetUserId: string) => {
    const channel = supabase
      .channel(`user-roles-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_role_assignments',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload) => {
          console.log('Role assignment changed:', payload);
          // Invalidate and refetch related queries
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLES(targetUserId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PERMISSIONS(targetUserId) });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLE_STATS(targetUserId) });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_lifecycle_events',
          filter: `user_id=eq.${targetUserId}`
        },
        (payload) => {
          console.log('Lifecycle event changed:', payload);
          // Invalidate and refetch lifecycle events
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIFECYCLE_EVENTS(targetUserId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ================================================================================================
  // RETURN HOOK VALUES
  // ================================================================================================

  return {
    // Data
    userRoles,
    availableRoles,
    userPermissions,
    lifecycleEvents,
    userRoleStats,
    
    // Loading states
    isLoading: isLoading || userRolesLoading || availableRolesLoading || userPermissionsLoading,
    userRolesLoading,
    availableRolesLoading,
    userPermissionsLoading,
    lifecycleEventsLoading,
    userRoleStatsLoading,
    
    // Error states
    userRolesError,
    availableRolesError,
    userPermissionsError,
    lifecycleEventsError,
    userRoleStatsError,
    
    // Mutation states
    isAssigningRole: assignRoleMutation.isPending,
    isRemovingRole: removeRoleMutation.isPending,
    
    // Actions
    assignRole,
    removeRole,
    checkPermission,
    
    // Utility functions
    hasRole,
    isRoleExpired,
    getActiveRoles,
    getExpiredRoles,
    
    // Refetch functions
    refetchUserRoles,
    refetchAvailableRoles,
    refetchUserPermissions,
    refetchLifecycleEvents,
    
    // Real-time subscriptions
    subscribeToRoleChanges,
    
    // Raw mutation functions (for advanced use)
    assignRoleMutation,
    removeRoleMutation
  };
};

// ================================================================================================
// ADDITIONAL HOOKS FOR SPECIFIC USE CASES
// ================================================================================================

// Hook to get only available roles
export const useAvailableRoles = () => {
  const { availableRoles, availableRolesLoading, availableRolesError, refetchAvailableRoles } = useUserRoles();
  
  return {
    availableRoles,
    isLoading: availableRolesLoading,
    error: availableRolesError,
    refetch: refetchAvailableRoles
  };
};

// Hook to get only user permissions
export const useUserPermissions = (userId: string) => {
  const { userPermissions, userPermissionsLoading, userPermissionsError, refetchUserPermissions, checkPermission } = useUserRoles(userId);
  
  return {
    permissions: userPermissions,
    isLoading: userPermissionsLoading,
    error: userPermissionsError,
    refetch: refetchUserPermissions,
    checkPermission
  };
};

// Hook to get only lifecycle events
export const useUserLifecycleEvents = (userId: string) => {
  const { lifecycleEvents, lifecycleEventsLoading, lifecycleEventsError, refetchLifecycleEvents } = useUserRoles(userId);
  
  return {
    events: lifecycleEvents,
    isLoading: lifecycleEventsLoading,
    error: lifecycleEventsError,
    refetch: refetchLifecycleEvents
  };
};

// Hook for permission checking only
export const usePermissionCheck = (userId: string) => {
  const { checkPermission, userPermissions, userPermissionsLoading } = useUserRoles(userId);
  
  return {
    checkPermission,
    permissions: userPermissions,
    isLoading: userPermissionsLoading
  };
}; 