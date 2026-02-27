import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Edit, 
  User, 
  Phone, 
  Crown, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Package,
  CreditCard,
  Hash,
  Plus,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Gift,
  Timer,
  Target,
  Star,
  Activity,
  TrendingDown,
  Award,
  Users,
  Mail,
  UserCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { SubscriptionService } from '@/services/subscriptionService';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import AdminOrderCreationModal from './AdminOrderCreationModal';
import SelectionWindowControls from './SelectionWindowControls';
import { 
  InlineEditableText, 
  InlineEditableSelect, 
  InlineEditableTextarea,
  InlineEditableDate
} from '@/components/admin/inline-editing';
import { 
  SUBSCRIPTION_STATUS_OPTIONS, 
  SUBSCRIPTION_PLAN_OPTIONS, 
  AGE_GROUP_OPTIONS, 
  RETURN_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  validatePhone,
  validateEmail,
  validateNumeric,
  validateDate,
  validateTrackingNumber
} from '@/components/admin/inline-editing/fieldConfigurations';
import { RealTimeSubscriptionService } from '@/services/admin/realTimeSubscriptionService';
// 🔄 ADD: Import useQueryClient for cache invalidation
import { useQueryClient } from '@tanstack/react-query';
import UserImpersonationService from '@/services/userImpersonationService';
import { useNavigate } from 'react-router-dom';

// ⚡ PERFORMANCE: Create reusable formatters outside component to avoid recreation
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const dateFormatter = (dateString: string | null | undefined) => {
  if (!dateString) return 'No date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
};

const timeAgoFormatter = (dateString: string | null | undefined) => {
  if (!dateString) return 'No date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
};

type BaseUser = Tables<'custom_users'>;

interface User extends BaseUser {
  full_name: string;
}

interface RentalOrder {
  id: string;
  order_number: string;
  subscription_plan: string;
  subscription_status: string;
  cycle_number: number;
  rental_start_date: string | null;
  rental_end_date: string | null;
  status: string;
  total_amount: number;
  created_at: string | null;
  age_group: string;
  subscription_category: string;
}

interface UserSubscriptionData {
  user: User;
  activeSubscription: RentalOrder | null;
  allSubscriptions: RentalOrder[];
  totalSubscriptions: number;
  lastActivity: string | null;
  totalSpent: number;
  subscriptionStatus: 'active' | 'inactive' | 'mixed';
}

interface UserSubscriptionCardProps {
  userSubscriptionData: UserSubscriptionData;
  onView: () => void;
  onEdit: () => void;
  onAdd: () => void;
  onDelete: (subscriptionId: string) => void;
  onBulkSelect: (selected: boolean) => void;
  isSelected: boolean;
  // 🔄 ADD: Optional onRefresh prop to allow parent component to handle refresh
  onRefresh?: () => void;
}

const UserSubscriptionCard: React.FC<UserSubscriptionCardProps> = ({
  userSubscriptionData,
  onView,
  onEdit,
  onAdd,
  onDelete,
  onBulkSelect,
  isSelected,
  onRefresh
}) => {
  const { user, activeSubscription, subscriptionStatus, totalSubscriptions, totalSpent, lastActivity, allSubscriptions } = userSubscriptionData;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orderCreationModalOpen, setOrderCreationModalOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { user: currentUser, session: currentSession, setAuth } = useCustomAuth();
  const navigate = useNavigate();
  
  // 🔄 ADD: Use React Query client for cache invalidation
  const queryClient = useQueryClient();

  // 🔄 UPDATED: Replace window.location.reload() with proper cache invalidation
  const refreshSubscriptionData = useCallback(async () => {
    console.log('🔄 Refreshing subscription data via cache invalidation...');
    
    try {
      // Invalidate all related queries
      await queryClient.invalidateQueries({ 
        queryKey: ['subscription-management'] 
      });
      
      // Also invalidate the optimized dashboard if it exists
      await queryClient.invalidateQueries({ 
        queryKey: ['subscription-management-optimized'] 
      });
      
      // If parent component has a refresh handler, call it
      if (onRefresh) {
        onRefresh();
      }
      
      console.log('✅ Subscription data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh subscription data:', error);
      
      // Fallback to page reload if cache invalidation fails
      console.log('🔄 Falling back to page reload...');
      window.location.reload();
    }
  }, [queryClient, onRefresh]);

  // 🔄 UPDATED: Real-time editing handlers with proper cache invalidation
  const handleUserProfileUpdate = async (fieldName: string, value: string) => {
    try {
      console.log('👤 Updating user profile:', { fieldName, value, userId: user.id });
      
      if (fieldName === 'full_name') {
        await RealTimeSubscriptionService.updateUserFullName(user.id, value, currentUser?.id);
      } else {
        await RealTimeSubscriptionService.updateUserProfile(user.id, fieldName, value, currentUser?.id);
      }
      
      // ✅ FIXED: Use cache invalidation instead of page reload
      await refreshSubscriptionData();
      
      // Show success toast
      toast.success('✅ User profile updated successfully', {
        description: `${fieldName} has been updated to "${value}"`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('❌ Failed to update user profile:', error);
      toast.error('❌ Failed to update user profile', {
        description: 'Please try again or contact support if the problem persists',
        duration: 5000
      });
      throw error;
    }
  };

  const handleSubscriptionUpdate = async (fieldName: string, value: string) => {
    if (!activeSubscription) return;
    
    try {
      console.log('📋 Updating subscription:', { fieldName, value, subscriptionId: activeSubscription.id });
      
      await RealTimeSubscriptionService.updateSubscriptionField(
        activeSubscription.id, 
        fieldName, 
        value, 
        currentUser?.id
      );
      
      // ✅ FIXED: Use cache invalidation instead of page reload
      await refreshSubscriptionData();
      
      // Show success toast
      toast.success('✅ Subscription updated successfully', {
        description: `${fieldName} has been updated to "${value}"`,
        duration: 3000
      });
      
    } catch (error) {
      console.error('❌ Failed to update subscription:', error);
      toast.error('❌ Failed to update subscription', {
        description: 'Please try again or contact support if the problem persists',
        duration: 5000
      });
      throw error;
    }
  };

  // Enhanced status configuration with more descriptive text
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle className="w-4 h-4" />,
          label: 'Active',
          description: 'Subscription is live and running smoothly',
          pulse: true
        };
      case 'inactive':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <X className="w-4 h-4" />,
          label: 'Inactive',
          description: 'No active subscription plans',
          pulse: false
        };
      case 'mixed':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Clock className="w-4 h-4" />,
          label: 'Mixed Status',
          description: 'Multiple subscriptions with different states',
          pulse: false
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Unknown',
          description: 'Status requires admin review',
          pulse: false
        };
    }
  };

  // Enhanced plan configuration with tier information
  const getPlanConfig = (plan: string) => {
    if (plan?.toLowerCase().includes('gold') || plan?.toLowerCase().includes('pro')) {
      return {
        icon: <Crown className="w-4 h-4 text-yellow-500" />,
        color: 'text-yellow-600',
        tier: 'Premium',
        tierColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        description: 'Premium plan with exclusive benefits'
      };
    }
    if (plan?.toLowerCase().includes('silver')) {
      return {
        icon: <Gift className="w-4 h-4 text-gray-500" />,
        color: 'text-gray-600',
        tier: 'Standard',
        tierColor: 'bg-gray-100 text-gray-800 border-gray-200',
        description: 'Standard plan with great value'
      };
    }
    return {
      icon: <Package className="w-4 h-4 text-blue-500" />,
      color: 'text-blue-600',
      tier: 'Basic',
      tierColor: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Entry-level plan to get started'
    };
  };



  // ⚡ PERFORMANCE: Memoized expensive calculations
  const statusConfig = useMemo(() => getStatusConfig(subscriptionStatus), [subscriptionStatus]);
  
  const planConfig = useMemo(() => 
    getPlanConfig(activeSubscription?.subscription_plan || ''), 
    [activeSubscription?.subscription_plan]
  );
  
  const customerTier = useMemo(() => {
    if (totalSubscriptions === 0) return { 
      level: 'new', 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'New Customer',
      icon: <Users className="w-3 h-3" />,
      description: 'Welcome to our platform!'
    };
    if (totalSubscriptions >= 10) return { 
      level: 'vip', 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50 border-purple-200',
      label: 'VIP Customer',
      icon: <Crown className="w-3 h-3" />,
      description: 'Our most valued customer'
    };
    if (totalSubscriptions >= 5) return { 
      level: 'loyal', 
      color: 'text-green-600', 
      bgColor: 'bg-green-50 border-green-200',
      label: 'Loyal Customer',
      icon: <Award className="w-3 h-3" />,
      description: 'Consistent subscriber'
    };
    return { 
      level: 'regular', 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50 border-gray-200',
      label: 'Regular Customer',
      icon: <User className="w-3 h-3" />,
      description: 'Active subscriber'
    };
  }, [totalSubscriptions]);

  const cycleProgress = useMemo(() => {
    if (!activeSubscription || !activeSubscription.rental_start_date || !activeSubscription.rental_end_date) return null;
    
    try {
      const startDate = new Date(activeSubscription.rental_start_date);
      const endDate = new Date(activeSubscription.rental_end_date);
      
      // Check for invalid dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid date values in cycle progress calculation');
        return null;
      }
      
      const today = new Date();
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - elapsedDays);
      const progressPercentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      
      const isNearEnd = remainingDays <= 7;
      const isOverdue = elapsedDays > totalDays;
      
      return {
        totalDays,
        elapsedDays,
        remainingDays,
        progressPercentage,
        isNearEnd,
        isOverdue,
        status: isOverdue ? 'overdue' : isNearEnd ? 'ending-soon' : 'active',
        statusText: isOverdue ? 'Overdue' : isNearEnd ? 'Ending Soon' : 'On Track',
        statusColor: isOverdue ? 'text-red-600' : isNearEnd ? 'text-amber-600' : 'text-emerald-600'
      };
    } catch (error) {
      console.warn('Error calculating cycle progress:', error);
      return null;
    }
  }, [activeSubscription?.rental_start_date, activeSubscription?.rental_end_date]);

  // ⚡ PERFORMANCE: Memoized formatters
  const formatCurrency = useCallback((amount: number) => currencyFormatter.format(amount), []);
  const formatDate = useCallback((dateString: string | null | undefined) => dateFormatter(dateString), []);
  const getTimeAgo = useCallback((dateString: string | null | undefined) => timeAgoFormatter(dateString), []);

  // ⚡ PERFORMANCE: Memoized event handlers
  const handleDeleteClick = useCallback((subscriptionId: string) => {
    setSubscriptionToDelete(subscriptionId);
    setDeleteDialogOpen(true);
  }, []);

  const handleCreateOrder = useCallback(() => {
    setOrderCreationModalOpen(true);
  }, []);

  const handleOrderCreated = useCallback(async () => {
    toast.success('🎉 Order Created Successfully!', {
      description: 'New order has been added to the customer\'s subscription cycle',
      duration: 5000
    });
    
    // ✅ FIXED: Use cache invalidation instead of page reload
    await refreshSubscriptionData();
  }, [refreshSubscriptionData]);

  const handleDeleteConfirm = async () => {
    if (!subscriptionToDelete) return;

    try {
      setIsDeleting(true);
      
      const result = await SubscriptionService.deleteSubscription(
        subscriptionToDelete,
        currentUser?.id,
        'Deleted via subscription management dashboard'
      );

      if (result.success) {
        const warnings = result.data?.warnings || [];
        const successMessage = `✅ Subscription deleted successfully${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ''}`;
        
        toast.success(successMessage, {
          description: warnings.length > 0 ? warnings.join(', ') : 'All related data has been properly cleaned up',
          duration: 5000
        });
        
        onDelete(subscriptionToDelete);
      } else {
        toast.error('❌ Failed to delete subscription', {
          description: result.error,
          duration: 8000
        });
      }
    } catch (error) {
      console.error('❌ Delete confirmation failed:', error);
      toast.error('🚫 An unexpected error occurred while deleting the subscription');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSubscriptionToDelete(null);
    }
  };

  const deleteSubInfo = useMemo(() => {
    if (!subscriptionToDelete) return null;
    return allSubscriptions.find(sub => sub.id === subscriptionToDelete);
  }, [subscriptionToDelete, allSubscriptions]);

  // Handle user impersonation
  const handleSwitchUser = useCallback(async () => {
    if (!currentUser || !currentSession) {
      toast.error('❌ Authentication required', {
        description: 'Please log in to switch users'
      });
      return;
    }

    try {
      setIsImpersonating(true);

      // Check if admin has permission
      const canImpersonate = await UserImpersonationService.canImpersonate(currentUser.id);
      if (!canImpersonate) {
        toast.error('❌ Insufficient Permissions', {
          description: 'You do not have permission to impersonate users',
          duration: 5000
        });
        return;
      }

      // Start impersonation
      const result = await UserImpersonationService.startImpersonation(
        currentUser,
        currentSession,
        user.id
      );

      if (result.success && result.impersonatedUser && result.impersonatedSession) {
        // Clear all React Query cache to ensure fresh data for impersonated user
        await queryClient.clear();
        
        // Update auth context with impersonated user
        setAuth(result.impersonatedUser, result.impersonatedSession);
        
        toast.success('🎭 User Impersonation Started', {
          description: `Now viewing as ${user.full_name}. Redirecting to their dashboard...`,
          duration: 3000
        });

        // Navigate to dashboard (React way, no page refresh)
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        toast.error('❌ Impersonation Failed', {
          description: result.error,
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Error switching user:', error);
      toast.error('❌ Unexpected Error', {
        description: 'Failed to switch user. Please try again.',
        duration: 5000
      });
    } finally {
      setIsImpersonating(false);
    }
  }, [currentUser, currentSession, user.id, user.full_name, navigate]);

  return (
    <>
      <Card className={`relative transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
        isSelected 
          ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg' 
          : 'hover:shadow-lg'
      } ${
        subscriptionStatus === 'active' 
          ? 'border-l-4 border-l-emerald-500' 
          : subscriptionStatus === 'inactive' 
          ? 'border-l-4 border-l-red-400' 
          : 'border-l-4 border-l-amber-400'
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onBulkSelect}
                className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  {subscriptionStatus === 'active' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-gray-900 text-lg">
                      <InlineEditableText
                        value={user.full_name}
                        fieldName="full_name"
                        onUpdate={handleUserProfileUpdate}
                        className="text-lg font-bold"
                        placeholder="Enter full name"
                      />
                    </div>
                    <Badge variant="outline" className={`text-xs ${customerTier.color} border-current`}>
                      {customerTier.icon}
                      <span className="ml-1">{customerTier.label}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <div className="font-medium">
                        <InlineEditableText
                          value={user.phone}
                          fieldName="phone"
                          onUpdate={handleUserProfileUpdate}
                          validation={validatePhone}
                          inputType="tel"
                          className="text-sm font-medium"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>
                    {user.email && (
                      <>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="text-gray-500 truncate max-w-40">{user.email}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {customerTier.description}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSubscription ? (
                <InlineEditableSelect
                  value={activeSubscription.subscription_status}
                  options={SUBSCRIPTION_STATUS_OPTIONS}
                  fieldName="subscription_status"
                  onUpdate={handleSubscriptionUpdate}
                  showBadge={true}
                  className="subscription-status-badge"
                />
              ) : (
                <Badge 
                  variant="outline" 
                  className={`${statusConfig.color} flex items-center gap-1.5 px-3 py-1 font-medium relative ${
                    statusConfig.pulse ? 'animate-pulse' : ''
                  }`}
                >
                  {statusConfig.icon}
                  <span>{statusConfig.label}</span>
                </Badge>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={onAdd} className="flex items-center gap-3">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-medium">Add Subscription</div>
                      <div className="text-xs text-gray-500">Create new subscription plan</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleSwitchUser} 
                    disabled={isImpersonating}
                    className="flex items-center gap-3 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    {isImpersonating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    <div>
                      <div className="font-medium">
                        {isImpersonating ? 'Switching...' : 'Switch to User'}
                      </div>
                      <div className="text-xs text-purple-400">
                        {isImpersonating ? 'Please wait...' : 'View as this customer'}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {activeSubscription && (
                    <>
                      <DropdownMenuItem onClick={handleCreateOrder} className="flex items-center gap-3">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-medium">Create New Order</div>
                          <div className="text-xs text-gray-500">Manual order for next cycle</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(activeSubscription.id)}
                        className="flex items-center gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <div>
                          <div className="font-medium">Delete Subscription</div>
                          <div className="text-xs text-red-400">Permanently remove active plan</div>
                        </div>
                      </DropdownMenuItem>
                    </>
                  )}
                  {allSubscriptions.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      {allSubscriptions.filter(sub => sub.id !== activeSubscription?.id).map((sub) => (
                        <DropdownMenuItem 
                          key={sub.id}
                          onClick={() => handleDeleteClick(sub.id)}
                          className="flex items-center gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Delete {sub.subscription_plan}</div>
                            <div className="text-xs text-red-400">Cycle {sub.cycle_number}</div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-5">
          {/* Enhanced Active Subscription Info */}
          {activeSubscription ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 space-y-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {planConfig.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-base text-gray-900">
                        <InlineEditableSelect
                          value={activeSubscription.subscription_plan}
                          options={SUBSCRIPTION_PLAN_OPTIONS}
                          fieldName="subscription_plan"
                          onUpdate={handleSubscriptionUpdate}
                          className="text-base font-bold"
                        />
                      </div>
                      <Badge variant="outline" className={`text-xs ${planConfig.tierColor}`}>
                        {planConfig.tier}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {planConfig.description} • {formatCurrency(activeSubscription.total_amount)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium">
                    <Target className="w-3 h-3 mr-1" />
                    Cycle {activeSubscription.cycle_number}
                  </Badge>
                </div>
              </div>

              {/* Enhanced Cycle Progress - Using Timeline Style */}
              {cycleProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Cycle Progress</span>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-gray-500" />
                      <span className={`font-bold text-sm ${cycleProgress.statusColor}`}>
                        {cycleProgress.remainingDays > 0 
                          ? `${cycleProgress.remainingDays} days left`
                          : cycleProgress.isOverdue 
                          ? 'Overdue'
                          : 'Ending today'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Timeline-style Progress Display */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Day {cycleProgress.elapsedDays}</span>
                      <span>{Math.round(cycleProgress.progressPercentage)}%</span>
                    </div>
                    <Progress value={cycleProgress.progressPercentage} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className={`font-medium ${cycleProgress.statusColor}`}>
                      {cycleProgress.statusText}
                    </span>
                    <span>Total {cycleProgress.totalDays} days</span>
                  </div>
                </div>
              )}

              {/* Enhanced Subscription Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <div className="text-xs text-gray-500">Start Date</div>
                  </div>
                  <div className="font-semibold text-sm text-gray-900">
                    {formatDate(activeSubscription.rental_start_date)}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    <div className="text-xs text-gray-500">End Date</div>
                  </div>
                  <div className="font-semibold text-sm text-gray-900">
                    {formatDate(activeSubscription.rental_end_date)}
                  </div>
                </div>
                {activeSubscription.age_group && (
                  <div className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div className="text-xs text-gray-500">Age Group</div>
                    </div>
                    <div className="font-semibold text-sm text-gray-900">
                      <InlineEditableSelect
                        value={activeSubscription.age_group}
                        options={AGE_GROUP_OPTIONS}
                        fieldName="age_group"
                        onUpdate={handleSubscriptionUpdate}
                        className="text-sm font-semibold"
                      />
                    </div>
                  </div>
                )}
                {activeSubscription.subscription_category && (
                  <div className="bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <div className="text-xs text-gray-500">Category</div>
                    </div>
                    <div className="font-semibold text-sm text-gray-900">
                      {activeSubscription.subscription_category}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Admin Notes Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Edit className="w-4 h-4 text-orange-600" />
                  <div className="text-sm font-medium text-gray-700">Admin Notes</div>
                </div>
                <InlineEditableTextarea
                  value={(activeSubscription as any).admin_notes || ''}
                  fieldName="admin_notes"
                  onUpdate={handleSubscriptionUpdate}
                  placeholder="Click to add admin notes..."
                  rows={2}
                  maxLength={300}
                  className="w-full"
                />
              </div>

              {/* Financial Information Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <div className="text-sm font-medium text-gray-700">Financial Information</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                    <InlineEditableText
                      value={activeSubscription.total_amount?.toString() || '0'}
                      fieldName="total_amount"
                      onUpdate={handleSubscriptionUpdate}
                      validation={validateNumeric}
                      inputType="number"
                      placeholder="Enter amount"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                    <InlineEditableSelect
                      value={(activeSubscription as any).payment_status || 'pending'}
                      options={PAYMENT_STATUS_OPTIONS}
                      fieldName="payment_status"
                      onUpdate={handleSubscriptionUpdate}
                      showBadge={true}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Payment Method</div>
                    <InlineEditableSelect
                      value={(activeSubscription as any).payment_method || 'razorpay'}
                      options={PAYMENT_METHOD_OPTIONS}
                      fieldName="payment_method"
                      onUpdate={handleSubscriptionUpdate}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Base Amount</div>
                    <InlineEditableText
                      value={(activeSubscription as any).base_amount?.toString() || '0'}
                      fieldName="base_amount"
                      onUpdate={handleSubscriptionUpdate}
                      validation={validateNumeric}
                      inputType="number"
                      placeholder="Enter base amount"
                      className="font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Rental Cycle Information Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div className="text-sm font-medium text-gray-700">Rental Cycle Information</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Cycle Number</div>
                    <InlineEditableText
                      value={activeSubscription.cycle_number?.toString() || '1'}
                      fieldName="cycle_number"
                      onUpdate={handleSubscriptionUpdate}
                      validation={validateNumeric}
                      inputType="number"
                      placeholder="Enter cycle number"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Start Date</div>
                    <InlineEditableDate
                      value={activeSubscription.rental_start_date || ''}
                      fieldName="rental_start_date"
                      onUpdate={handleSubscriptionUpdate}
                      placeholder="Select start date"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">End Date</div>
                    <InlineEditableDate
                      value={activeSubscription.rental_end_date || ''}
                      fieldName="rental_end_date"
                      onUpdate={handleSubscriptionUpdate}
                      placeholder="Select end date"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Order Status</div>
                    <InlineEditableSelect
                      value={(activeSubscription as any).status || 'pending'}
                      options={ORDER_STATUS_OPTIONS}
                      fieldName="status"
                      onUpdate={handleSubscriptionUpdate}
                      showBadge={true}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery & Tracking Information Section */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-purple-600" />
                  <div className="text-sm font-medium text-gray-700">Delivery & Tracking</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Delivery Date</div>
                    <InlineEditableDate
                      value={(activeSubscription as any).delivery_date || ''}
                      fieldName="delivery_date"
                      onUpdate={handleSubscriptionUpdate}
                      placeholder="Select delivery date"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Returned Date</div>
                    <InlineEditableDate
                      value={(activeSubscription as any).returned_date || ''}
                      fieldName="returned_date"
                      onUpdate={handleSubscriptionUpdate}
                      placeholder="Select return date"
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Return Status</div>
                    <InlineEditableSelect
                      value={(activeSubscription as any).return_status || 'not_returned'}
                      options={RETURN_STATUS_OPTIONS}
                      fieldName="return_status"
                      onUpdate={handleSubscriptionUpdate}
                      showBadge={true}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Dispatch Tracking</div>
                    <InlineEditableText
                      value={(activeSubscription as any).dispatch_tracking_number || ''}
                      fieldName="dispatch_tracking_number"
                      onUpdate={handleSubscriptionUpdate}
                      validation={validateTrackingNumber}
                      placeholder="Enter tracking number"
                      className="font-medium"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Delivery Instructions</div>
                  <InlineEditableTextarea
                    value={(activeSubscription as any).delivery_instructions || ''}
                    fieldName="delivery_instructions"
                    onUpdate={handleSubscriptionUpdate}
                    placeholder="Click to add delivery instructions..."
                    rows={2}
                    maxLength={500}
                    className="w-full"
                  />
                </div>
              </div>
              
              {/* Selection Window Controls */}
              <SelectionWindowControls
                rentalOrderId={activeSubscription.id}
                currentStatus={(activeSubscription as any).selection_window_status || 'auto'}
                cycleDay={(() => {
                  try {
                    if (!activeSubscription.rental_start_date) return 1;
                    const startDate = new Date(activeSubscription.rental_start_date);
                    if (isNaN(startDate.getTime())) return 1;
                    const today = new Date();
                    const diffTime = today.getTime() - startDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return Math.max(1, diffDays);
                  } catch (error) {
                    console.warn('Error calculating cycle day:', error);
                    return 1;
                  }
                })()}
                isManualControl={(activeSubscription as any).manual_selection_control || false}
                daysUntilOpens={(() => {
                  try {
                    if (!activeSubscription.rental_start_date) return 0;
                    const startDate = new Date(activeSubscription.rental_start_date);
                    if (isNaN(startDate.getTime())) return 0;
                    const today = new Date();
                    const diffTime = today.getTime() - startDate.getTime();
                    const cycleDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return Math.max(0, 24 - cycleDay);
                  } catch (error) {
                    console.warn('Error calculating days until opens:', error);
                    return 0;
                  }
                })()}
                daysUntilCloses={(() => {
                  try {
                    if (!activeSubscription.rental_start_date) return 0;
                    const startDate = new Date(activeSubscription.rental_start_date);
                    if (isNaN(startDate.getTime())) return 0;
                    const today = new Date();
                    const diffTime = today.getTime() - startDate.getTime();
                    const cycleDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return Math.max(0, 34 - cycleDay);
                  } catch (error) {
                    console.warn('Error calculating days until closes:', error);
                    return 0;
                  }
                })()}
                notes={(activeSubscription as any).selection_window_notes || ''}
                onStatusChange={() => {
                  console.log('Selection window status changed, refreshing data...');
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-semibold text-gray-700 mb-2">No Active Subscription</h4>
              <p className="text-sm text-gray-500 mb-4">
                This customer doesn't have an active subscription plan yet
              </p>
              <Button onClick={onAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Subscription
              </Button>
            </div>
          )}

          {/* Enhanced Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Hash className="w-5 h-5 text-blue-600" />
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalSubscriptions}</p>
              <p className="text-xs text-blue-600 font-medium">Total Orders</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-emerald-900">
                {formatCurrency(totalSpent).replace('.00', '')}
              </p>
              <p className="text-xs text-emerald-600 font-medium">Lifetime Value</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <Clock className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-xs font-bold text-purple-900 leading-tight">
                {getTimeAgo(lastActivity)}
              </p>
              <p className="text-xs text-purple-600 font-medium">Last Activity</p>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onView}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">View Details</span>
            </Button>
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
            >
              <Edit className="w-4 h-4" />
              <span className="font-medium">Edit Profile</span>
            </Button>
          </div>

          {/* Enhanced Quick Actions */}
          {totalSubscriptions > 0 && (
            <Button
              onClick={onAdd}
              variant="outline"
              size="sm"
              className="w-full flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add New Subscription Plan</span>
            </Button>
          )}

          {/* Enhanced Footer Info */}
          <div className="text-xs text-gray-500 pt-3 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="font-medium">Customer ID:</span>
                <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                  {user.id.slice(0, 8)}...
                </code>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Joined {formatDate(user.created_at)}</span>
              </span>
            </div>
            {statusConfig.description && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {statusConfig.description}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-bold">Delete Subscription</div>
                <div className="text-sm font-normal text-gray-600">This action cannot be undone</div>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to permanently delete this subscription? This will remove all associated data.
              </p>
              
              {deleteSubInfo && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Subscription Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500 text-xs mb-1">Plan</div>
                      <div className="font-medium">{deleteSubInfo.subscription_plan}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500 text-xs mb-1">Cycle</div>
                      <div className="font-medium">{deleteSubInfo.cycle_number}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500 text-xs mb-1">Status</div>
                      <div className="font-medium capitalize">{deleteSubInfo.subscription_status}</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500 text-xs mb-1">Amount</div>
                      <div className="font-medium">{formatCurrency(deleteSubInfo.total_amount)}</div>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <div className="text-gray-500 text-xs mb-1">Period</div>
                    <div className="font-medium text-sm">
                      {formatDate(deleteSubInfo.rental_start_date)} → {formatDate(deleteSubInfo.rental_end_date)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800">
                    <p className="font-semibold text-sm mb-2">⚠️ Warning: Permanent Deletion</p>
                    <ul className="text-sm space-y-1">
                      <li>• Subscription will be permanently removed from the database</li>
                      <li>• All related toy selections will be deleted</li>
                      <li>• Pending deliveries will be automatically cancelled</li>
                      <li>• Complete audit trail will be maintained for compliance</li>
                      <li>• Customer notifications will be sent automatically</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel disabled={isDeleting} className="flex-1">
              Cancel Operation
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 flex-1"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirm Deletion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Order Creation Modal */}
      {activeSubscription && (
        <AdminOrderCreationModal
          open={orderCreationModalOpen}
          onOpenChange={setOrderCreationModalOpen}
          userId={user.id}
          userInfo={{
            full_name: user.full_name,
            phone: user.phone,
            email: user.email
          }}
          activeSubscription={activeSubscription}
          onOrderCreated={handleOrderCreated}
        />
      )}
    </>
  );
};

// ⚡ PERFORMANCE: Memoize component to prevent unnecessary re-renders
export default React.memo(UserSubscriptionCard); 
