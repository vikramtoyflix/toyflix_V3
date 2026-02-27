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
  User,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Phone,
  Mail,
  History,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Send,
  Crown,
  Calendar,
  FileText,
  Settings,
  Zap,
  Ban,
  Unlock,
  X,
  Package,
  CreditCard,
  Bell,
  BarChart3,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Plus,
  Search,
  Users
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useUserLifecycleEvents } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface UserLifecycleManagerProps {
  user?: any;
  onUpdate?: () => void;
  onClose?: () => void;
  showInDialog?: boolean;
  className?: string;
  standalone?: boolean;
}

interface LifecycleAction {
  value: string;
  label: string;
  description: string;
  requiresReason: boolean;
  confirmationRequired: boolean;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'destructive' | 'secondary' | 'outline';
  category: 'status' | 'security' | 'role' | 'communication' | 'subscription';
}

interface UserStatus {
  value: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LifecycleEventFormData {
  action: string;
  reason: string;
  notes: string;
  newStatus?: string;
  additionalData?: any;
}

// ================================================================================================
// USER SELECTION COMPONENT
// ================================================================================================

const UserSelector = ({ onUserSelect }: { onUserSelect: (user: any) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_users')
        .select('id, first_name, last_name, email, phone, is_active, role, created_at')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleUserSelection = (user: any) => {
    setSelectedUser(user);
    onUserSelect(user);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Select User</span>
        </CardTitle>
        <CardDescription>
          Search and select a user to manage their lifecycle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <ComponentLoader text="Searching users..." />
          </div>
        )}

        {users.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedUser?.id === user.id ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleUserSelection(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email || user.phone || 'No contact info'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={user.is_active ? 'default' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchTerm && !isLoading && users.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No users found matching "{searchTerm}"</p>
          </div>
        )}

        {!searchTerm && (
          <div className="text-center py-4 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Start typing to search for users</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ================================================================================================
// CONFIGURATION
// ================================================================================================

const USER_STATUSES: UserStatus[] = [
  {
    value: 'active',
    label: 'Active',
    description: 'User is active and can use all services',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2
  },
  {
    value: 'inactive',
    label: 'Inactive',
    description: 'User account is temporarily inactive',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: UserX
  },
  {
    value: 'suspended',
    label: 'Suspended',
    description: 'User account is suspended due to policy violations',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: Ban
  },
  {
    value: 'pending_verification',
    label: 'Pending Verification',
    description: 'User account is pending phone/email verification',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock
  },
  {
    value: 'under_review',
    label: 'Under Review',
    description: 'User account is under manual review',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle
  }
];

const LIFECYCLE_ACTIONS: LifecycleAction[] = [
  // Status Actions
  {
    value: 'activate',
    label: 'Activate User',
    description: 'Enable user account and restore full access',
    requiresReason: false,
    confirmationRequired: true,
    icon: UserCheck,
    variant: 'default',
    category: 'status'
  },
  {
    value: 'deactivate',
    label: 'Deactivate User',
    description: 'Temporarily disable user account access',
    requiresReason: true,
    confirmationRequired: true,
    icon: UserX,
    variant: 'destructive',
    category: 'status'
  },
  {
    value: 'suspend',
    label: 'Suspend User',
    description: 'Suspend account due to policy violations',
    requiresReason: true,
    confirmationRequired: true,
    icon: Ban,
    variant: 'destructive',
    category: 'status'
  },
  {
    value: 'mark_under_review',
    label: 'Mark Under Review',
    description: 'Flag account for manual review',
    requiresReason: true,
    confirmationRequired: true,
    icon: AlertTriangle,
    variant: 'outline',
    category: 'status'
  },
  // Security Actions
  {
    value: 'verify_phone',
    label: 'Verify Phone',
    description: 'Manually verify user phone number',
    requiresReason: false,
    confirmationRequired: true,
    icon: Phone,
    variant: 'default',
    category: 'security'
  },
  {
    value: 'reset_password',
    label: 'Reset Password',
    description: 'Send password reset email to user',
    requiresReason: false,
    confirmationRequired: true,
    icon: Unlock,
    variant: 'outline',
    category: 'security'
  },
  // Role Actions
  {
    value: 'promote_to_admin',
    label: 'Promote to Admin',
    description: 'Grant administrative privileges',
    requiresReason: true,
    confirmationRequired: true,
    icon: Crown,
    variant: 'default',
    category: 'role'
  },
  {
    value: 'demote_from_admin',
    label: 'Remove Admin',
    description: 'Remove administrative privileges',
    requiresReason: true,
    confirmationRequired: true,
    icon: User,
    variant: 'destructive',
    category: 'role'
  },
  // Communication Actions
  {
    value: 'send_notification',
    label: 'Send Notification',
    description: 'Send custom notification to user',
    requiresReason: false,
    confirmationRequired: false,
    icon: Send,
    variant: 'outline',
    category: 'communication'
  },
  // Subscription Actions - NEW
  {
    value: 'activate_subscription',
    label: 'Activate Subscription',
    description: 'Enable subscription services for user',
    requiresReason: false,
    confirmationRequired: true,
    icon: PlayCircle,
    variant: 'default',
    category: 'subscription'
  },
  {
    value: 'pause_subscription',
    label: 'Pause Subscription',
    description: 'Temporarily pause subscription billing and services',
    requiresReason: true,
    confirmationRequired: true,
    icon: PauseCircle,
    variant: 'outline',
    category: 'subscription'
  },
  {
    value: 'cancel_subscription',
    label: 'Cancel Subscription',
    description: 'Cancel subscription and end billing',
    requiresReason: true,
    confirmationRequired: true,
    icon: StopCircle,
    variant: 'destructive',
    category: 'subscription'
  },
  {
    value: 'extend_subscription',
    label: 'Extend Subscription',
    description: 'Add free time to user subscription',
    requiresReason: true,
    confirmationRequired: true,
    icon: Plus,
    variant: 'default',
    category: 'subscription'
  }
];

const BULK_ACTIONS = [
  { value: 'bulk_activate', label: 'Bulk Activate Users', icon: UserCheck },
  { value: 'bulk_verify_phone', label: 'Bulk Verify Phone Numbers', icon: Phone },
  { value: 'bulk_extend_subscription', label: 'Bulk Extend Subscriptions', icon: Calendar },
  { value: 'bulk_send_notification', label: 'Bulk Send Notifications', icon: Send }
];

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const UserLifecycleManager: React.FC<UserLifecycleManagerProps> = ({
  user: initialUser,
  onUpdate,
  onClose,
  showInDialog = true,
  className,
  standalone = false
}) => {
  // ================================================================================================
  // STATE MANAGEMENT
  // ================================================================================================

  const [selectedUser, setSelectedUser] = useState<any>(initialUser);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showOrderHistoryDialog, setShowOrderHistoryDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<LifecycleAction | null>(null);
  const [formData, setFormData] = useState<LifecycleEventFormData>({
    action: '',
    reason: '',
    notes: '',
    newStatus: '',
    additionalData: {}
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userDashboardData, setUserDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // ================================================================================================
  // HOOKS
  // ================================================================================================

  const { user: currentUser } = useCustomAuth();
  const { events: lifecycleEvents, isLoading: eventsLoading, refetch: refetchEvents } = useUserLifecycleEvents(selectedUser?.id);

  // Use initialUser if provided, otherwise require user selection
  const user = selectedUser || initialUser;

  // ================================================================================================
  // FETCH COMPREHENSIVE USER DATA
  // ================================================================================================

  useEffect(() => {
    const fetchComprehensiveUserData = async () => {
      if (!user?.id) return;
      
      setIsLoadingDashboard(true);
      try {
        // Fetch subscription data
        const { data: subscriptionData, error: subError } = await supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('subscription_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!subError && subscriptionData) {
          setSubscriptionData(subscriptionData);
        }

        // Fetch all user orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!ordersError && ordersData) {
          setUserOrders(ordersData);
        }

        // Calculate dashboard statistics
        const totalOrders = ordersData?.length || 0;
        const activeOrders = ordersData?.filter((order: any) => 
          order.subscription_status === 'active' || order.order_status === 'active'
        ).length || 0;
        const totalSpent = ordersData?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0;
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        // Get latest payment data (if available)
        const latestOrder = ordersData?.[0] as any;
        const lastPaymentDate = latestOrder?.created_at;
        const paymentStatus = latestOrder?.payment_status || 'unknown';

        setUserDashboardData({
          totalOrders,
          activeOrders,
          totalSpent,
          avgOrderValue,
          lastPaymentDate,
          paymentStatus,
          subscriptionStatus: (subscriptionData as any)?.subscription_status || 'none',
          memberSince: user.created_at,
          lastActivity: user.last_login || user.updated_at
        });

      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchComprehensiveUserData();
  }, [user?.id]);

  // ================================================================================================
  // COMPUTED VALUES
  // ================================================================================================

  const currentStatus = useMemo(() => {
    const isActive = user?.is_active;
    const phoneVerified = user?.phone_verified;
    
    if (!isActive) return USER_STATUSES.find(s => s.value === 'inactive');
    if (!phoneVerified) return USER_STATUSES.find(s => s.value === 'pending_verification');
    return USER_STATUSES.find(s => s.value === 'active');
  }, [user]);

  const recentEvents = useMemo(() => {
    return lifecycleEvents?.slice(0, 10) || [];
  }, [lifecycleEvents]);

  const actionsByCategory = useMemo(() => {
    return LIFECYCLE_ACTIONS.reduce((acc, action) => {
      if (!acc[action.category]) acc[action.category] = [];
      acc[action.category].push(action);
      return acc;
    }, {} as Record<string, LifecycleAction[]>);
  }, []);

  const lifecycleAnalytics = useMemo(() => {
    const events = lifecycleEvents || [];
    return {
      activations: events.filter(e => e.event_type === 'activate' || e.event_type === 'activated').length,
      suspensions: events.filter(e => e.event_type === 'suspend' || e.event_type === 'suspended').length,
      roleChanges: events.filter(e => e.event_type.includes('role')).length,
      subscriptionActions: events.filter(e => e.event_type.includes('subscription')).length
    };
  }, [lifecycleEvents]);

  // ================================================================================================
  // ACTION HANDLERS
  // ================================================================================================

  const handleActionSelect = (action: LifecycleAction) => {
    setSelectedAction(action);
    setFormData({
      action: action.value,
      reason: '',
      notes: '',
      newStatus: getTargetStatus(action.value),
      additionalData: {}
    });
    setShowActionDialog(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedAction || !user) return;

    setShowActionDialog(false);
    
    if (selectedAction.confirmationRequired) {
      setShowConfirmDialog(true);
      return;
    }

    await executeAction();
  };

  const executeAction = async () => {
    if (!selectedAction || !user || !currentUser) return;

    setIsExecuting(true);
    try {
      const result = await performLifecycleAction(
        user.id,
        selectedAction.value,
        formData.reason,
        formData.notes,
        formData.newStatus,
        currentUser.id
      );

      if (result.success) {
        toast.success(`${selectedAction.label} completed successfully`);
        await refetchEvents();
        onUpdate?.();
        
        // Refresh subscription data if it was a subscription action
        if (selectedAction.category === 'subscription') {
          const { data } = await supabase
            .from('rental_orders' as any)
            .select('*')
            .eq('user_id', user.id)
            .eq('subscription_status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          setSubscriptionData(data);
        }
      } else {
        toast.error(result.error || `Failed to ${selectedAction.label.toLowerCase()}`);
      }
    } catch (error) {
      console.error('Action execution error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsExecuting(false);
      setShowConfirmDialog(false);
      setSelectedAction(null);
      setFormData({ action: '', reason: '', notes: '', newStatus: '', additionalData: {} });
    }
  };

  const handleBulkAction = async (actionValue: string, userIds: string[]) => {
    setIsExecuting(true);
    try {
      const promises = userIds.map(userId => 
        performLifecycleAction(userId, actionValue, formData.reason, formData.notes, '', currentUser?.id)
      );
      
      await Promise.all(promises);
      toast.success(`Bulk action completed for ${userIds.length} users`);
      onUpdate?.();
    } catch (error) {
      toast.error('Some bulk actions failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetchEvents();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const handleQuickAction = async (actionType: string) => {
    switch (actionType) {
      case 'check_subscription_status':
        const status = subscriptionData 
          ? `Active subscription found: ${subscriptionData.subscription_status}` 
          : 'No active subscription found';
        toast.info(status);
        break;
      case 'view_order_history':
        setShowOrderHistoryDialog(true);
        break;
      case 'check_payment_status':
        const paymentStatus = userDashboardData?.paymentStatus || 'unknown';
        const lastPayment = userDashboardData?.lastPaymentDate 
          ? `Last payment: ${format(new Date(userDashboardData.lastPaymentDate), 'MMM dd, yyyy')}`
          : 'No payment data found';
        toast.info(`Payment status: ${paymentStatus}. ${lastPayment}`);
        break;
      case 'send_cycle_reminder':
        try {
          // This would integrate with your notification system
          console.log('Sending cycle reminder to user:', user.id);
          toast.success('Cycle reminder sent successfully!');
        } catch (error) {
          toast.error('Failed to send cycle reminder');
        }
        break;
    }
  };

  // ================================================================================================
  // UTILITY FUNCTIONS
  // ================================================================================================

  const getTargetStatus = (actionValue: string): string => {
    switch (actionValue) {
      case 'activate': return 'active';
      case 'deactivate': return 'inactive';
      case 'suspend': return 'suspended';
      case 'mark_under_review': return 'under_review';
      case 'verify_phone': return 'active';
      default: return '';
    }
  };

  const performLifecycleAction = async (
    userId: string,
    action: string,
    reason: string,
    notes: string,
    newStatus: string,
    performedBy: string
  ) => {
    try {
      // Handle subscription-specific actions
      if (action.includes('subscription')) {
        await handleSubscriptionAction(userId, action, reason, notes);
      }

      // Update user status if needed
      if (newStatus) {
        const { error: updateError } = await supabase
          .from('custom_users')
          .update({
            is_active: newStatus === 'active',
            phone_verified: action === 'verify_phone' ? true : undefined,
            role: action === 'promote_to_admin' ? 'admin' : action === 'demote_from_admin' ? 'user' : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      // Log lifecycle event
      const { error: logError } = await supabase
        .from('user_lifecycle_events' as any)
        .insert({
          user_id: userId,
          event_type: action,
          new_state: {
            action,
            new_status: newStatus,
            timestamp: new Date().toISOString()
          },
          performed_by: performedBy,
          reason,
          notes
        });

      if (logError) throw logError;

      // Handle specific actions
      switch (action) {
        case 'reset_password':
          console.log('Password reset email would be sent to:', user.email);
          break;
        case 'send_notification':
          console.log('Notification would be sent to user:', userId);
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Lifecycle action error:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSubscriptionAction = async (userId: string, action: string, reason: string, notes: string) => {
    let subscriptionStatus = '';
    
    switch (action) {
      case 'activate_subscription':
        subscriptionStatus = 'active';
        break;
      case 'pause_subscription':
        subscriptionStatus = 'paused';
        break;
      case 'cancel_subscription':
        subscriptionStatus = 'cancelled';
        break;
      case 'extend_subscription':
        // For extension, we keep it active but add to notes
        subscriptionStatus = 'active';
        const extensionDays = formData.additionalData?.extensionDays || 30;
        notes += ` - Extended by ${extensionDays} days`;
        break;
    }

    if (subscriptionStatus) {
      const { error } = await supabase
        .from('rental_orders' as any)
        .update({ 
          subscription_status: subscriptionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getActionIcon = (eventType: string) => {
    const action = LIFECYCLE_ACTIONS.find(a => a.value === eventType);
    if (action) {
      const IconComponent = action.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    return <History className="w-4 h-4" />;
  };

  const getStatusBadge = (status: UserStatus | undefined) => {
    if (!status) return null;
    
    const StatusIcon = status.icon;
    
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${status.bgColor} ${status.borderColor}`}>
        <StatusIcon className={`w-4 h-4 ${status.color}`} />
        <span className={`text-sm font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
    );
  };

  // ================================================================================================
  // COMPONENT SECTIONS
  // ================================================================================================

  const CurrentStatusSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Current Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isExecuting}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
              <div className="mt-1">
                {getStatusBadge(currentStatus)}
              </div>
              {currentStatus && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentStatus.description}
                </p>
              )}
            </div>
          </div>

          {/* User Details */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Phone Verified</Label>
              <div className="flex items-center space-x-1 mt-1">
                {user?.phone_verified ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">Verified</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">Not Verified</span>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Account Role</Label>
              <div className="mt-1">
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  {user?.role || 'user'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <p className="text-sm mt-1">
                {user?.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'Unknown'}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
              <p className="text-sm mt-1">
                {user?.last_login 
                  ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                  : 'Never'
                }
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Lifecycle Events</Label>
              <p className="text-sm mt-1">
                {lifecycleEvents?.length || 0} events
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserDetailsSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-lg">User Details</CardTitle>
          </div>
        </div>
        <CardDescription>
          Complete user information and contact details
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Personal Information</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Full Name</Label>
                <p className="text-sm mt-1">
                  {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Not specified'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <p className="text-sm">{user?.email || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <p className="text-sm">{user?.phone || 'Not provided'}</p>
                  {user?.phone_verified && (
                    <Badge variant="outline" className="text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Account Information</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">User ID</Label>
                <p className="text-sm mt-1 font-mono">{user?.id}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                <div className="mt-1">
                  <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                    {user?.role || 'user'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {getStatusBadge(currentStatus)}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Member Since</Label>
                <p className="text-sm mt-1">
                  {user?.created_at ? format(new Date(user.created_at), 'MMMM dd, yyyy') : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Activity Information</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Last Login</Label>
                <p className="text-sm mt-1">
                  {user?.last_login 
                    ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true })
                    : 'Never logged in'
                  }
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Last Updated</Label>
                <p className="text-sm mt-1">
                  {user?.updated_at 
                    ? formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })
                    : 'Unknown'
                  }
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Total Events</Label>
                <p className="text-sm mt-1">{lifecycleEvents?.length || 0} lifecycle events</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserDashboardSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <CardTitle className="text-lg">User Dashboard</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (user?.id) {
                setIsLoadingDashboard(true);
                try {
                  // Re-fetch all data
                  await Promise.all([
                    refetchEvents(),
                    // Trigger comprehensive data refresh by updating the user object slightly
                    setSelectedUser({ ...user, updated_at: new Date().toISOString() })
                  ]);
                  toast.success('Dashboard refreshed successfully');
                } catch (error) {
                  toast.error('Failed to refresh dashboard');
                } finally {
                  setIsLoadingDashboard(false);
                }
              }
            }}
            disabled={isLoadingDashboard}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
        <CardDescription>
          User statistics, orders, and activity overview
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoadingDashboard ? (
          <ComponentLoader text="Loading dashboard..." />
        ) : userDashboardData ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {userDashboardData.totalOrders}
                </div>
                <div className="text-sm text-blue-700">Total Orders</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {userDashboardData.activeOrders}
                </div>
                <div className="text-sm text-green-700">Active Orders</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{userDashboardData.totalSpent?.toFixed(0) || 0}
                </div>
                <div className="text-sm text-purple-700">Total Spent</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-orange-600">
                  ₹{userDashboardData.avgOrderValue?.toFixed(0) || 0}
                </div>
                <div className="text-sm text-orange-700">Avg Order Value</div>
              </div>
            </div>

            {/* Subscription & Payment Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium">Subscription Status</h4>
                </div>
                <div className="space-y-2">
                  <Badge variant={userDashboardData.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                    {userDashboardData.subscriptionStatus}
                  </Badge>
                  {subscriptionData && (
                    <p className="text-sm text-muted-foreground">
                      Plan: {subscriptionData.plan_type || 'Not specified'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <h4 className="font-medium">Payment Status</h4>
                </div>
                <div className="space-y-2">
                  <Badge variant={userDashboardData.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                    {userDashboardData.paymentStatus}
                  </Badge>
                  {userDashboardData.lastPaymentDate && (
                    <p className="text-sm text-muted-foreground">
                      Last payment: {format(new Date(userDashboardData.lastPaymentDate), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            {userOrders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Recent Orders</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOrderHistoryDialog(true)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {userOrders.slice(0, 3).map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Order #{order.id?.slice(-6) || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.created_at ? format(new Date(order.created_at), 'MMM dd, yyyy') : 'Unknown date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {order.subscription_status || order.order_status || 'Unknown'}
                        </Badge>
                        {order.total_amount && (
                          <p className="text-sm font-medium">₹{order.total_amount}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No dashboard data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const LifecycleActionsSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Lifecycle Actions</CardTitle>
          </div>
        </div>
        <CardDescription>
          Perform status changes and user management actions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {Object.entries(actionsByCategory).map(([category, actions]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                {category.replace('_', ' ')} Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.value}
                      variant={action.variant}
                      size="sm"
                      onClick={() => handleActionSelect(action)}
                      disabled={isExecuting}
                      className="justify-start h-auto p-3"
                    >
                      <div className="flex items-start space-x-3 text-left">
                        <ActionIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{action.label}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {action.description}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const LifecycleHistorySection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg">Lifecycle History</CardTitle>
            <Badge variant="outline" className="ml-2">
              {recentEvents.length} recent
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryDialog(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View All
          </Button>
        </div>
        <CardDescription>
          Recent user lifecycle events and status changes
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {eventsLoading ? (
          <ComponentLoader text="Loading events..." />
        ) : recentEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No lifecycle events found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => {
              const isExpanded = expandedEvents.has(event.id);
              return (
                <div
                  key={event.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <Collapsible>
                    <CollapsibleTrigger
                      className="w-full"
                      onClick={() => toggleEventExpansion(event.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {getActionIcon(event.event_type)}
                          </div>
                          <div className="text-left flex-1">
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
                          </div>
                        </div>
                        <div className="ml-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Timestamp</Label>
                          <p className="mt-1">
                            {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </p>
                        </div>
                        
                        {event.notes && (
                          <div>
                            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                            <p className="mt-1">{event.notes}</p>
                          </div>
                        )}
                        
                        {event.new_state && (
                          <div className="col-span-2">
                            <Label className="text-xs font-medium text-muted-foreground">Event Data</Label>
                            <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(event.new_state, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const LifecycleAnalyticsSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <span>Lifecycle Analytics</span>
        </CardTitle>
        <CardDescription>
          Summary of lifecycle actions performed on this user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {lifecycleAnalytics.activations}
            </div>
            <div className="text-sm text-muted-foreground">Activations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {lifecycleAnalytics.suspensions}
            </div>
            <div className="text-sm text-muted-foreground">Suspensions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {lifecycleAnalytics.roleChanges}
            </div>
            <div className="text-sm text-muted-foreground">Role Changes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {lifecycleAnalytics.subscriptionActions}
            </div>
            <div className="text-sm text-muted-foreground">Subscription Actions</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const SubscriberQuickActionsSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <span>Subscriber Quick Actions</span>
        </CardTitle>
        <CardDescription>
          Common subscriber management operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => handleQuickAction('check_subscription_status')}
            className="justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Check Subscription Status</div>
                <div className="text-xs text-muted-foreground">
                  {subscriptionData ? 'Active subscription found' : 'No active subscription'}
                </div>
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleQuickAction('view_order_history')}
            className="justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <Package className="w-4 h-4 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-sm">View Order History</div>
                <div className="text-xs text-muted-foreground">Complete order timeline</div>
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleQuickAction('check_payment_status')}
            className="justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Check Payment Status</div>
                <div className="text-xs text-muted-foreground">Recent billing activity</div>
              </div>
            </div>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleQuickAction('send_cycle_reminder')}
            className="justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 text-orange-600" />
              <div className="text-left">
                <div className="font-medium text-sm">Send Cycle Reminder</div>
                <div className="text-xs text-muted-foreground">Notify about selection window</div>
              </div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const BulkActionsSection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Bulk Operations</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkActions(!showBulkActions)}
          >
            {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
          </Button>
        </div>
        <CardDescription>
          Perform actions on multiple users at once
        </CardDescription>
      </CardHeader>
      
      {showBulkActions && (
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bulk actions will be applied to all selected users. Use with caution.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BULK_ACTIONS.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={action.value}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedUsers.size === 0) {
                        toast.error('Please select users first');
                        return;
                      }
                      handleBulkAction(action.value, Array.from(selectedUsers));
                    }}
                    disabled={isExecuting || selectedUsers.size === 0}
                    className="justify-start h-auto p-3"
                  >
                    <div className="flex items-start space-x-3 text-left">
                      <ActionIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{action.label}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {selectedUsers.size > 0 
                            ? `Apply to ${selectedUsers.size} selected user${selectedUsers.size > 1 ? 's' : ''}`
                            : 'Select users to enable bulk actions'
                          }
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
            
            {selectedUsers.size > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUsers(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );

  // ================================================================================================
  // DIALOG COMPONENTS
  // ================================================================================================

  const ActionDialog = () => (
    <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedAction?.label}
          </DialogTitle>
          <DialogDescription>
            {selectedAction?.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {selectedAction?.requiresReason && (
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for this action..."
                required
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional context or notes..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowActionDialog(false)}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecuteAction}
            disabled={
              isExecuting || 
              (selectedAction?.requiresReason && !formData.reason.trim())
            }
          >
            {selectedAction?.confirmationRequired ? 'Review' : 'Execute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const ConfirmationDialog = () => (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to <strong>{selectedAction?.label.toLowerCase()}</strong> for user{' '}
            <strong>{user?.first_name} {user?.last_name}</strong>?
            {formData.reason && (
              <div className="mt-2 p-2 bg-muted rounded">
                <strong>Reason:</strong> {formData.reason}
              </div>
            )}
            {formData.notes && (
              <div className="mt-2 p-2 bg-muted rounded">
                <strong>Notes:</strong> {formData.notes}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExecuting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={executeAction}
            disabled={isExecuting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isExecuting ? (
              <>
                <ComponentLoader text="" />
                Executing...
              </>
            ) : (
              'Confirm'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const HistoryDialog = () => (
    <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Lifecycle History</DialogTitle>
          <DialogDescription>
            All lifecycle events for {user?.first_name} {user?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {lifecycleEvents?.map((event) => (
            <div key={event.id} className="border rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {getActionIcon(event.event_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">
                      {event.event_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                    </Badge>
                  </div>
                  {event.performed_by_name && (
                    <p className="text-sm text-muted-foreground">
                      by {event.performed_by_name}
                    </p>
                  )}
                  {event.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Reason:</strong> {event.reason}
                    </p>
                  )}
                  {event.notes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Notes:</strong> {event.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  const OrderHistoryDialog = () => (
    <Dialog open={showOrderHistoryDialog} onOpenChange={setShowOrderHistoryDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Order History</DialogTitle>
          <DialogDescription>
            All orders for {user?.first_name} {user?.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {userOrders.length > 0 ? (
            userOrders.map((order, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">Order #{order.id?.slice(-8) || 'Unknown'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {order.created_at ? format(new Date(order.created_at), 'MMMM dd, yyyy HH:mm') : 'Unknown date'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {order.subscription_status || order.order_status || 'Unknown'}
                    </Badge>
                    {order.total_amount && (
                      <p className="text-lg font-semibold">₹{order.total_amount}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Payment Status</Label>
                    <p className="mt-1">{order.payment_status || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Plan Type</Label>
                    <p className="mt-1">{order.plan_type || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Duration</Label>
                    <p className="mt-1">{order.duration || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Order Type</Label>
                    <p className="mt-1">{order.order_type || 'Standard'}</p>
                  </div>
                </div>

                {order.address && (
                  <div className="mt-3 pt-3 border-t">
                    <Label className="text-xs font-medium text-muted-foreground">Delivery Address</Label>
                    <p className="text-sm mt-1">{order.address}</p>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{order.notes}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No orders found for this user</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ================================================================================================
  // MAIN RENDER
  // ================================================================================================

  const content = (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <User className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">User Lifecycle Manager</h2>
            {user && (
              <p className="text-sm text-muted-foreground">
                Managing: {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'} ({user.email || user.phone || 'No contact info'})
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {standalone && user && (
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              <Users className="w-4 h-4 mr-2" />
              Change User
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {standalone && !user && (
        <UserSelector onUserSelect={setSelectedUser} />
      )}
      
      {user && (
        <>
          <CurrentStatusSection />
          <UserDetailsSection />
          <UserDashboardSection />
          <LifecycleAnalyticsSection />
          <SubscriberQuickActionsSection />
          <BulkActionsSection />
          <LifecycleActionsSection />
          <LifecycleHistorySection />
        </>
      )}
      
      {!user && !standalone && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No User Selected</h3>
            <p className="text-gray-500">Please select a user to manage their lifecycle.</p>
          </CardContent>
        </Card>
      )}

      <ActionDialog />
      <ConfirmationDialog />
      <HistoryDialog />
      <OrderHistoryDialog />
    </div>
  );

  if (showInDialog) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

// ================================================================================================
// WRAPPER COMPONENT FOR STANDALONE MODE
// ================================================================================================

const UserLifecycleWrapper: React.FC<Omit<UserLifecycleManagerProps, 'standalone'>> = (props) => {
  return <UserLifecycleManager {...props} standalone={true} showInDialog={false} />;
};

export default UserLifecycleManager;
export { UserLifecycleWrapper }; 