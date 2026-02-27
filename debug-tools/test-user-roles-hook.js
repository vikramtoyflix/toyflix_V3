/**
 * Test file for useUserRoles hook
 * This file demonstrates how to use the comprehensive user roles management hook
 * and provides examples of all available functions
 */

import { useUserRoles, useAvailableRoles, useUserPermissions, useUserLifecycleEvents, usePermissionCheck } from '../src/hooks/useUserRoles';

// ================================================================================================
// EXAMPLE USAGE SCENARIOS
// ================================================================================================

/**
 * Example 1: Basic User Role Management
 * This example shows how to use the main hook to manage user roles
 */
function UserRoleManagement({ userId }) {
  const {
    // Data
    userRoles,
    availableRoles,
    userPermissions,
    lifecycleEvents,
    userRoleStats,
    
    // Loading states
    isLoading,
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
    isAssigningRole,
    isRemovingRole,
    
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
    subscribeToRoleChanges
  } = useUserRoles(userId);

  // Example: Check if user has admin permissions
  const isAdmin = hasRole('admin');
  const canEditUsers = checkPermission('users.write');
  const canDeleteOrders = checkPermission('orders.delete');

  // Example: Assign a role to user
  const handleAssignRole = async (roleId) => {
    try {
      await assignRole(userId, roleId, null, 'Assigned via admin panel');
      console.log('Role assigned successfully');
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  // Example: Remove a role from user
  const handleRemoveRole = async (roleId) => {
    try {
      await removeRole(userId, roleId);
      console.log('Role removed successfully');
    } catch (error) {
      console.error('Failed to remove role:', error);
    }
  };

  // Example: Subscribe to real-time role changes
  React.useEffect(() => {
    if (userId) {
      const unsubscribe = subscribeToRoleChanges(userId);
      return unsubscribe;
    }
  }, [userId, subscribeToRoleChanges]);

  if (isLoading) {
    return <div>Loading user roles...</div>;
  }

  if (userRolesError) {
    return <div>Error loading user roles: {userRolesError.message}</div>;
  }

  return (
    <div className="user-role-management">
      <h2>User Role Management</h2>
      
      {/* User Role Statistics */}
      <div className="role-stats">
        <h3>Role Statistics</h3>
        {userRoleStats && (
          <div>
            <p>Total Roles: {userRoleStats.totalRoles}</p>
            <p>Active Roles: {userRoleStats.activeRoles}</p>
            <p>Expired Roles: {userRoleStats.expiredRoles}</p>
            <p>System Roles: {userRoleStats.systemRoles}</p>
            <p>Custom Roles: {userRoleStats.customRoles}</p>
          </div>
        )}
      </div>

      {/* Current User Roles */}
      <div className="current-roles">
        <h3>Current Roles</h3>
        {userRoles.map(role => (
          <div key={role.id} className={`role-item ${isRoleExpired(role) ? 'expired' : ''}`}>
            <span>{role.display_name}</span>
            <span>{role.is_system_role ? '(System)' : '(Custom)'}</span>
            {role.expires_at && (
              <span>Expires: {new Date(role.expires_at).toLocaleDateString()}</span>
            )}
            <button 
              onClick={() => handleRemoveRole(role.id)}
              disabled={isRemovingRole}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Available Roles */}
      <div className="available-roles">
        <h3>Available Roles</h3>
        {availableRoles.map(role => (
          <div key={role.id} className="role-item">
            <span>{role.display_name}</span>
            <span>{role.description}</span>
            <button 
              onClick={() => handleAssignRole(role.id)}
              disabled={isAssigningRole || hasRole(role.name)}
            >
              {hasRole(role.name) ? 'Already Assigned' : 'Assign'}
            </button>
          </div>
        ))}
      </div>

      {/* Permission Check Examples */}
      <div className="permission-checks">
        <h3>Permission Examples</h3>
        <p>Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
        <p>Can Edit Users: {canEditUsers ? 'Yes' : 'No'}</p>
        <p>Can Delete Orders: {canDeleteOrders ? 'Yes' : 'No'}</p>
      </div>

      {/* User Permissions */}
      <div className="user-permissions">
        <h3>User Permissions</h3>
        <pre>{JSON.stringify(userPermissions, null, 2)}</pre>
      </div>

      {/* Lifecycle Events */}
      <div className="lifecycle-events">
        <h3>Recent Lifecycle Events</h3>
        {lifecycleEvents.slice(0, 5).map(event => (
          <div key={event.id} className="event-item">
            <span>{event.event_type}</span>
            <span>{event.performed_by_name}</span>
            <span>{new Date(event.created_at).toLocaleString()}</span>
            {event.reason && <span>Reason: {event.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 2: Simplified Role Management using specialized hooks
 */
function SimpleRoleManagement({ userId }) {
  // Use specialized hooks for specific functionality
  const { availableRoles, isLoading: rolesLoading } = useAvailableRoles();
  const { permissions, checkPermission } = useUserPermissions(userId);
  const { events, isLoading: eventsLoading } = useUserLifecycleEvents(userId);

  if (rolesLoading || eventsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="simple-role-management">
      <h2>Simple Role Management</h2>
      
      <div className="available-roles">
        <h3>Available Roles ({availableRoles.length})</h3>
        {availableRoles.map(role => (
          <div key={role.id}>
            <strong>{role.display_name}</strong>
            <p>{role.description}</p>
          </div>
        ))}
      </div>

      <div className="permissions">
        <h3>Permission Checks</h3>
        <p>Can read users: {checkPermission('users.read') ? 'Yes' : 'No'}</p>
        <p>Can write orders: {checkPermission('orders.write') ? 'Yes' : 'No'}</p>
        <p>Can manage inventory: {checkPermission('toys.manage_inventory') ? 'Yes' : 'No'}</p>
      </div>

      <div className="recent-events">
        <h3>Recent Events ({events.length})</h3>
        {events.slice(0, 3).map(event => (
          <div key={event.id}>
            <strong>{event.event_type}</strong> by {event.performed_by_name}
            <small>{new Date(event.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 3: Permission-based component rendering
 */
function PermissionBasedComponent({ userId }) {
  const { checkPermission } = usePermissionCheck(userId);

  return (
    <div className="permission-based-component">
      <h2>Permission-Based Features</h2>
      
      {/* Only show user management if user has permission */}
      {checkPermission('users.write') && (
        <div className="user-management-section">
          <h3>User Management</h3>
          <p>This section is only visible to users with users.write permission</p>
        </div>
      )}

      {/* Only show order management if user has permission */}
      {checkPermission('orders.write') && (
        <div className="order-management-section">
          <h3>Order Management</h3>
          <p>This section is only visible to users with orders.write permission</p>
        </div>
      )}

      {/* Only show analytics if user has permission */}
      {checkPermission('analytics.read') && (
        <div className="analytics-section">
          <h3>Analytics</h3>
          <p>This section is only visible to users with analytics.read permission</p>
        </div>
      )}

      {/* Admin-only section */}
      {checkPermission('system.configure') && (
        <div className="admin-only-section">
          <h3>System Configuration</h3>
          <p>This section is only visible to system administrators</p>
        </div>
      )}
    </div>
  );
}

// ================================================================================================
// TESTING SCENARIOS
// ================================================================================================

/**
 * Test scenarios to verify hook functionality
 */
export const testScenarios = {
  
  // Test 1: Basic role assignment
  testRoleAssignment: async (userId, roleId) => {
    const { assignRole } = useUserRoles(userId);
    
    try {
      await assignRole(userId, roleId, null, 'Test assignment');
      console.log('✅ Role assignment test passed');
      return true;
    } catch (error) {
      console.error('❌ Role assignment test failed:', error);
      return false;
    }
  },

  // Test 2: Permission checking
  testPermissionChecking: (userId) => {
    const { checkPermission } = useUserRoles(userId);
    
    const testPermissions = [
      'users.read',
      'users.write',
      'orders.read',
      'orders.write',
      'system.configure'
    ];

    console.log('Permission test results:');
    testPermissions.forEach(permission => {
      const hasPermission = checkPermission(permission);
      console.log(`${permission}: ${hasPermission ? '✅' : '❌'}`);
    });
  },

  // Test 3: Role expiration checking
  testRoleExpiration: (userId) => {
    const { userRoles, isRoleExpired } = useUserRoles(userId);
    
    console.log('Role expiration test:');
    userRoles.forEach(role => {
      const expired = isRoleExpired(role);
      console.log(`${role.display_name}: ${expired ? '❌ Expired' : '✅ Active'}`);
    });
  },

  // Test 4: Real-time subscriptions
  testRealTimeSubscriptions: (userId) => {
    const { subscribeToRoleChanges } = useUserRoles(userId);
    
    console.log('Testing real-time subscriptions...');
    const unsubscribe = subscribeToRoleChanges(userId);
    
    // Unsubscribe after 30 seconds
    setTimeout(() => {
      unsubscribe();
      console.log('✅ Real-time subscription test completed');
    }, 30000);
  },

  // Test 5: Error handling
  testErrorHandling: async (invalidUserId) => {
    const { assignRole } = useUserRoles(invalidUserId);
    
    try {
      await assignRole(invalidUserId, 'invalid-role-id');
      console.log('❌ Error handling test failed - should have thrown an error');
      return false;
    } catch (error) {
      console.log('✅ Error handling test passed - correctly caught error:', error.message);
      return true;
    }
  }
};

// ================================================================================================
// USAGE EXAMPLES FOR DIFFERENT SCENARIOS
// ================================================================================================

/**
 * Example usage patterns for different user management scenarios
 */
export const usageExamples = {
  
  // Example 1: Admin panel user management
  adminPanelUsage: `
    import { useUserRoles } from '@/hooks/useUserRoles';
    
    function AdminUserManagement({ userId }) {
      const {
        userRoles,
        availableRoles,
        assignRole,
        removeRole,
        checkPermission,
        isLoading
      } = useUserRoles(userId);
      
      const handleAssignRole = async (roleId) => {
        await assignRole(userId, roleId, null, 'Assigned by admin');
      };
      
      // Rest of component...
    }
  `,

  // Example 2: Permission-based navigation
  navigationUsage: `
    import { usePermissionCheck } from '@/hooks/useUserRoles';
    
    function Navigation({ userId }) {
      const { checkPermission } = usePermissionCheck(userId);
      
      return (
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          {checkPermission('users.read') && (
            <Link to="/users">Users</Link>
          )}
          {checkPermission('orders.read') && (
            <Link to="/orders">Orders</Link>
          )}
          {checkPermission('analytics.read') && (
            <Link to="/analytics">Analytics</Link>
          )}
        </nav>
      );
    }
  `,

  // Example 3: Role-based component rendering
  componentRenderingUsage: `
    import { useUserRoles } from '@/hooks/useUserRoles';
    
    function UserProfile({ userId }) {
      const { hasRole, checkPermission } = useUserRoles(userId);
      
      const isAdmin = hasRole('admin');
      const canEditProfile = checkPermission('profile.write');
      
      return (
        <div>
          <h1>User Profile</h1>
          {canEditProfile && (
            <button>Edit Profile</button>
          )}
          {isAdmin && (
            <AdminControls />
          )}
        </div>
      );
    }
  `,

  // Example 4: Lifecycle event monitoring
  lifecycleMonitoringUsage: `
    import { useUserLifecycleEvents } from '@/hooks/useUserRoles';
    
    function UserActivityLog({ userId }) {
      const { events, isLoading } = useUserLifecycleEvents(userId);
      
      if (isLoading) return <div>Loading...</div>;
      
      return (
        <div>
          <h2>User Activity</h2>
          {events.map(event => (
            <div key={event.id}>
              <span>{event.event_type}</span>
              <span>{event.performed_by_name}</span>
              <span>{event.created_at}</span>
            </div>
          ))}
        </div>
      );
    }
  `
};

// ================================================================================================
// EXPORT TEST UTILITIES
// ================================================================================================

export {
  UserRoleManagement,
  SimpleRoleManagement,
  PermissionBasedComponent,
  testScenarios,
  usageExamples
};

console.log('✅ useUserRoles test file loaded successfully');
console.log('Available test scenarios:', Object.keys(testScenarios));
console.log('Available usage examples:', Object.keys(usageExamples)); 