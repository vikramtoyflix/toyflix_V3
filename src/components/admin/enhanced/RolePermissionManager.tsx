import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ComponentLoader } from "@/components/ui/component-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  User, 
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Settings,
  Package,
  BarChart,
  Gift,
  CreditCard,
  FileText,
  Crown,
  UserCheck,
  UserX,
  History,
  RefreshCw,
  X
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUserRoles, UserRole, AvailableRole, LifecycleEvent } from "@/hooks/useUserRoles";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface RolePermissionManagerProps {
  userId: string;
  onClose?: () => void;
  showInDialog?: boolean;
  className?: string;
}

interface PermissionCategory {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  color: string;
}

interface AssignRoleFormData {
  roleId: string;
  expiresAt: string;
  notes: string;
}

// ================================================================================================
// PERMISSION CATEGORIES CONFIGURATION
// ================================================================================================

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'users',
    label: 'Users Management',
    icon: Users,
    permissions: ['read', 'write', 'delete', 'edit_any', 'edit_limited'],
    color: 'text-blue-600'
  },
  {
    key: 'orders',
    label: 'Orders Management',
    icon: Package,
    permissions: ['read', 'write', 'cancel', 'refund', 'edit_any', 'edit_limited', 'dispatch'],
    color: 'text-green-600'
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    icon: Crown,
    permissions: ['read', 'modify', 'extend', 'cancel', 'pause', 'edit_any', 'edit_limited'],
    color: 'text-purple-600'
  },
  {
    key: 'toys',
    label: 'Toys Management',
    icon: Settings,
    permissions: ['read', 'write', 'delete', 'manage_inventory'],
    color: 'text-orange-600'
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: BarChart,
    permissions: ['read', 'export', 'advanced', 'marketing'],
    color: 'text-indigo-600'
  },
  {
    key: 'offers',
    label: 'Promotional Offers',
    icon: Gift,
    permissions: ['read', 'create', 'assign', 'delete', 'edit_any', 'edit_limited'],
    color: 'text-pink-600'
  },
  {
    key: 'billing',
    label: 'Billing & Payments',
    icon: CreditCard,
    permissions: ['read', 'write', 'process_refunds'],
    color: 'text-yellow-600'
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileText,
    permissions: ['read', 'create', 'export', 'schedule'],
    color: 'text-teal-600'
  },
  {
    key: 'system',
    label: 'System Admin',
    icon: Shield,
    permissions: ['read', 'write', 'delete', 'configure'],
    color: 'text-red-600'
  }
];

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const RolePermissionManager: React.FC<RolePermissionManagerProps> = ({
  userId,
  onClose,
  showInDialog = true,
  className
}) => {
  // ================================================================================================
  // STATE MANAGEMENT
  // ================================================================================================

  const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false);
  const [showRemoveRoleDialog, setShowRemoveRoleDialog] = useState(false);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [selectedRoleToRemove, setSelectedRoleToRemove] = useState<UserRole | null>(null);
  const [assignRoleForm, setAssignRoleForm] = useState<AssignRoleFormData>({
    roleId: '',
    expiresAt: '',
    notes: ''
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ================================================================================================
  // HOOK INTEGRATION
  // ================================================================================================

  const {
    userRoles,
    availableRoles,
    userPermissions,
    lifecycleEvents,
    userRoleStats,
    isLoading,
    userRolesError,
    isAssigningRole,
    isRemovingRole,
    assignRole,
    removeRole,
    checkPermission,
    hasRole,
    isRoleExpired,
    getActiveRoles,
    getExpiredRoles,
    refetchUserRoles,
    refetchLifecycleEvents,
    subscribeToRoleChanges
  } = useUserRoles(userId);

  // ================================================================================================
  // EFFECTS
  // ================================================================================================

  // Real-time subscriptions
  useEffect(() => {
    if (userId) {
      const unsubscribe = subscribeToRoleChanges(userId);
      return unsubscribe;
    }
  }, [userId, subscribeToRoleChanges]);

  // ================================================================================================
  // COMPUTED VALUES
  // ================================================================================================

  const activeRoles = useMemo(() => getActiveRoles(), [getActiveRoles]);
  const expiredRoles = useMemo(() => getExpiredRoles(), [getExpiredRoles]);
  
  const availableRolesToAssign = useMemo(() => {
    const assignedRoleIds = new Set(userRoles.map(role => role.id));
    return availableRoles.filter(role => !assignedRoleIds.has(role.id));
  }, [userRoles, availableRoles]);

  const recentLifecycleEvents = useMemo(() => {
    return lifecycleEvents
      .filter(event => event.event_type.includes('role'))
      .slice(0, 10);
  }, [lifecycleEvents]);

  // ================================================================================================
  // EVENT HANDLERS
  // ================================================================================================

  const handleAssignRole = async () => {
    if (!assignRoleForm.roleId) {
      toast.error('Please select a role');
      return;
    }

    try {
      await assignRole(
        userId,
        assignRoleForm.roleId,
        assignRoleForm.expiresAt || undefined,
        assignRoleForm.notes || undefined
      );
      
      setShowAssignRoleDialog(false);
      setAssignRoleForm({ roleId: '', expiresAt: '', notes: '' });
      
      toast.success('Role assigned successfully');
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async () => {
    if (!selectedRoleToRemove) return;

    try {
      await removeRole(userId, selectedRoleToRemove.id);
      setShowRemoveRoleDialog(false);
      setSelectedRoleToRemove(null);
      toast.success('Role removed successfully');
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    }
  };

  const handleBulkRemove = async () => {
    if (selectedRoles.size === 0) {
      toast.error('Please select roles to remove');
      return;
    }

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedRoles).map(roleId => 
        removeRole(userId, roleId)
      );
      
      await Promise.all(promises);
      setSelectedRoles(new Set());
      toast.success(`Removed ${selectedRoles.size} roles successfully`);
    } catch (error) {
      console.error('Error in bulk remove:', error);
      toast.error('Failed to remove some roles');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchUserRoles();
      await refetchLifecycleEvents();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const toggleCategoryExpansion = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleRoleSelection = (roleId: string) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(roleId)) {
      newSelected.delete(roleId);
    } else {
      newSelected.add(roleId);
    }
    setSelectedRoles(newSelected);
  };

  const selectAllRoles = () => {
    if (selectedRoles.size === userRoles.length) {
      setSelectedRoles(new Set());
    } else {
      setSelectedRoles(new Set(userRoles.map(role => role.id)));
    }
  };

  // ================================================================================================
  // UTILITY FUNCTIONS
  // ================================================================================================

  const getRoleBadgeVariant = (role: UserRole) => {
    if (isRoleExpired(role)) return 'destructive';
    if (role.is_system_role) return 'default';
    return 'secondary';
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-gray-400" />
    );
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'role_assigned':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'role_removed':
        return <UserX className="w-4 h-4 text-red-600" />;
      default:
        return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  // ================================================================================================
  // COMPONENT SECTIONS
  // ================================================================================================

  const CurrentRolesSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Current Roles</CardTitle>
            {userRoleStats && (
              <Badge variant="outline" className="ml-2">
                {userRoleStats.activeRoles} active
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssignRoleDialog(true)}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4 mr-1" />
              Assign Role
            </Button>
            {selectedRoles.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRemove}
                disabled={bulkActionLoading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove ({selectedRoles.size})
              </Button>
            )}
          </div>
        </div>
        
        {userRoles.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Checkbox
              checked={selectedRoles.size === userRoles.length}
              onCheckedChange={selectAllRoles}
              className="mr-1"
            />
            <span>Select all roles</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <ComponentLoader text="Loading roles..." />
        ) : userRolesError ? (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Error loading roles: {userRolesError.message}
            </AlertDescription>
          </Alert>
        ) : userRoles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No roles assigned</p>
            <p className="text-sm">Click "Assign Role" to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Roles */}
            {activeRoles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Active Roles ({activeRoles.length})
                </h4>
                <div className="grid gap-3">
                  {activeRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedRoles.has(role.id)}
                          onCheckedChange={() => toggleRoleSelection(role.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant={getRoleBadgeVariant(role)}>
                              {role.display_name}
                            </Badge>
                            {role.is_system_role && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            {role.assigned_at && (
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                Assigned {formatDistanceToNow(new Date(role.assigned_at), { addSuffix: true })}
                              </span>
                            )}
                            {role.expires_at && (
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Expires {format(new Date(role.expires_at), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                          {role.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Note: {role.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRoleToRemove(role);
                          setShowRemoveRoleDialog(true);
                        }}
                        disabled={isRemovingRole}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Roles */}
            {expiredRoles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Expired Roles ({expiredRoles.length})
                </h4>
                <div className="grid gap-3">
                  {expiredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200 opacity-75"
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedRoles.has(role.id)}
                          onCheckedChange={() => toggleRoleSelection(role.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">
                              {role.display_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Expired
                            </Badge>
                          </div>
                          {role.expires_at && (
                            <p className="text-sm text-red-600 mt-1">
                              Expired on {format(new Date(role.expires_at), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRoleToRemove(role);
                          setShowRemoveRoleDialog(true);
                        }}
                        disabled={isRemovingRole}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PermissionMatrixSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Permission Matrix</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
          >
            {showPermissionMatrix ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          View all permissions granted through assigned roles
        </CardDescription>
      </CardHeader>
      
      {showPermissionMatrix && (
        <CardContent>
          {isLoading ? (
            <ComponentLoader text="Loading permissions..." />
          ) : (
            <div className="space-y-4">
              {PERMISSION_CATEGORIES.map((category) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories.has(category.key);
                const hasAnyPermission = category.permissions.some(permission => 
                  checkPermission(`${category.key}.${permission}`)
                );

                return (
                  <div key={category.key} className="border rounded-lg">
                    <Collapsible>
                      <CollapsibleTrigger
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategoryExpansion(category.key)}
                      >
                        <div className="flex items-center space-x-3">
                          <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                          <span className="font-medium">{category.label}</span>
                          {hasAnyPermission && (
                            <Badge variant="outline" className="ml-2">
                              {category.permissions.filter(permission => 
                                checkPermission(`${category.key}.${permission}`)
                              ).length} granted
                            </Badge>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="px-4 pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                          {category.permissions.map((permission) => {
                            const hasPermission = checkPermission(`${category.key}.${permission}`);
                            return (
                              <div
                                key={permission}
                                className={`flex items-center space-x-2 p-2 rounded-md border ${
                                  hasPermission 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                {getPermissionIcon(hasPermission)}
                                <span className={`text-sm ${
                                  hasPermission ? 'text-green-800' : 'text-gray-600'
                                }`}>
                                  {permission}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  const AuditTrailSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg">Audit Trail</CardTitle>
            <Badge variant="outline" className="ml-2">
              {recentLifecycleEvents.length} recent
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditTrail(!showAuditTrail)}
            >
              {showAuditTrail ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Track all role-related changes and activities
        </CardDescription>
      </CardHeader>
      
      {showAuditTrail && (
        <CardContent>
          {isLoading ? (
            <ComponentLoader text="Loading audit trail..." />
          ) : recentLifecycleEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No role-related events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLifecycleEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getEventTypeIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">
                        {event.event_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </Badge>
                    </div>
                    {event.performed_by_name && (
                      <p className="text-sm text-muted-foreground">
                        by {event.performed_by_name}
                      </p>
                    )}
                    {event.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.reason}
                      </p>
                    )}
                    {event.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {event.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );

  // ================================================================================================
  // DIALOG COMPONENTS
  // ================================================================================================

  const AssignRoleDialog = () => (
    <Dialog open={showAssignRoleDialog} onOpenChange={setShowAssignRoleDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Assign a new role to this user with optional expiration and notes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="role-select">Select Role</Label>
            <Select
              value={assignRoleForm.roleId}
              onValueChange={(value) => 
                setAssignRoleForm(prev => ({ ...prev, roleId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {availableRolesToAssign.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center space-x-2">
                      <span>{role.display_name}</span>
                      {role.is_system_role && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
            <Input
              id="expires-at"
              type="datetime-local"
              value={assignRoleForm.expiresAt}
              onChange={(e) => 
                setAssignRoleForm(prev => ({ ...prev, expiresAt: e.target.value }))
              }
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this role assignment..."
              value={assignRoleForm.notes}
              onChange={(e) => 
                setAssignRoleForm(prev => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowAssignRoleDialog(false)}
            disabled={isAssigningRole}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssignRole}
            disabled={!assignRoleForm.roleId || isAssigningRole}
          >
            {isAssigningRole ? (
              <>
                <ComponentLoader text="" />
                Assigning...
              </>
            ) : (
              'Assign Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const RemoveRoleDialog = () => (
    <AlertDialog open={showRemoveRoleDialog} onOpenChange={setShowRemoveRoleDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the role "{selectedRoleToRemove?.display_name}" 
            from this user? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemovingRole}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemoveRole}
            disabled={isRemovingRole}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemovingRole ? (
              <>
                <ComponentLoader text="" />
                Removing...
              </>
            ) : (
              'Remove Role'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ================================================================================================
  // MAIN RENDER
  // ================================================================================================

  const content = (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Role & Permission Manager</h2>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {userRoleStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{userRoleStats.totalRoles}</p>
                  <p className="text-xs text-muted-foreground">Total Roles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{userRoleStats.activeRoles}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{userRoleStats.systemRoles}</p>
                  <p className="text-xs text-muted-foreground">System</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold">{userRoleStats.customRoles}</p>
                  <p className="text-xs text-muted-foreground">Custom</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CurrentRolesSection />
      <PermissionMatrixSection />
      <AuditTrailSection />

      <AssignRoleDialog />
      <RemoveRoleDialog />
    </div>
  );

  if (showInDialog) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

// ================================================================================================
// EXPORT
// ================================================================================================

export default RolePermissionManager; 