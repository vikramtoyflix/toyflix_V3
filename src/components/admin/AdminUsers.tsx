import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RefreshCw, Search, AlertCircle, CheckCircle2, User, Phone, MapPin, Calendar,
  Plus, Eye, Edit3, ChevronLeft, ChevronRight, Users, UserCheck, UserX,
  Shield, Filter, Download, MoreVertical, Trash2, Crown, Package, Clock,
  TrendingUp, Zap, Target, Bell
} from "lucide-react";
import { useAdminUsers, useUserStats, UserFilters, useUsersSubscriptionStatus, useUserPriorityMetrics, UserSubscriptionStatus } from "@/hooks/useAdminUsers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatIndianDateTime } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import CreateUserDialog from "./CreateUserDialog";
import ViewUserDialog from "./ViewUserDialog";
import EditUserDialog from "./EditUserDialog";

const AdminUsers = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    city: '',
    state: '',
    subscription_status: 'all',
    date_range: 'all',
    created_from: '',
    created_to: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState<UserFilters>(filters);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const isMobile = useIsMobile();

  // Debounce filters to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setCurrentPage(1); // Reset to first page when filters change
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  const { data: usersData, isLoading, error, forceRefresh } = useAdminUsers(
    currentPage, 
    pageSize, 
    debouncedFilters
  );

  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: subscriptionStatusMap } = useUsersSubscriptionStatus();
  const priorityMetrics = useUserPriorityMetrics();

  // Filter users based on subscription status
  const allUsers = usersData?.users || [];
  const filteredUsers = useMemo(() => {
    if (!filters.subscription_status || filters.subscription_status === 'all') {
      return allUsers;
    }
    
    return allUsers.filter(user => {
      const userStatus = subscriptionStatusMap?.[user.id];
      return userStatus?.status === filters.subscription_status;
    });
  }, [allUsers, subscriptionStatusMap, filters.subscription_status]);

  // Handle client-side pagination when subscription status filtering is applied
  const isFiltered = filters.subscription_status && filters.subscription_status !== 'all';
  
  let users, totalCount, totalPages;
  
  if (isFiltered) {
    // Client-side pagination for filtered results
    totalCount = filteredUsers.length;
    totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    users = filteredUsers.slice(startIndex, endIndex);
  } else {
    // Server-side pagination for unfiltered results
    users = filteredUsers;
    totalCount = usersData?.totalCount || 0;
    totalPages = usersData?.totalPages || 0;
  }

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceRefresh();
      console.log('Admin users data refreshed successfully');
      toast.success('User data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh admin users data:', error);
      toast.error('Failed to refresh user data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUserCreated = () => {
    handleForceRefresh();
    setCurrentPage(1); // Go to first page to see new user
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowViewDialog(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleUserUpdated = () => {
    handleForceRefresh();
  };


  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    console.log('🚀 handleBulkAction called with action:', action);
    console.log('📋 Selected users count:', selectedUsers.size);
    
    if (selectedUsers.size === 0) {
      console.log('⚠️ No users selected, showing error toast');
      toast.error('Please select users first');
      return;
    }

    const userIds = Array.from(selectedUsers);
    console.log(`✅ Performing bulk ${action} on users:`, userIds);
    
    if (action === 'delete') {
      console.log('🗑️ Delete action chosen, showing confirmation dialog...');
      
      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete ${userIds.length} user(s)? This action cannot be undone.`
      );
      
      console.log('💭 User confirmation result:', confirmed);
      
      if (!confirmed) {
        console.log('❌ User cancelled deletion');
        return;
      }

      console.log('✅ User confirmed deletion, proceeding...');
      
      // Show loading toast
      const loadingToast = toast.loading(`Deleting ${userIds.length} user(s)...`);
      console.log('📢 Loading toast shown:', loadingToast);
      
      try {
        console.log('✅ Preparing to call delete function...');
        console.log('📦 Payload:', { userIds });

        // Call the delete user edge function
        console.log('🚀 CALLING supabase.functions.invoke("admin-delete-user")...');
        
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
          body: { userIds }
        });

        console.log('📥 Function invoke completed');
        console.log('📊 Response data:', data);
        console.log('⚠️ Response error:', error);

        if (error) {
          console.error('❌ Function invocation error:', error);
          throw new Error(error.message || 'Failed to delete users');
        }

        console.log('✅ Users deleted successfully:', data);
        toast.success(data.message || `Successfully deleted ${data.deletedCount} user(s)`, {
          id: loadingToast,
        });

        // Clear selections and refresh
        console.log('🧹 Clearing selections and refreshing...');
        setSelectedUsers(new Set());
        await handleForceRefresh();
        console.log('✅ Refresh completed');

      } catch (error) {
        console.error('❌ Error in try-catch block:', error);
        console.error('❌ Error type:', typeof error);
        console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
        toast.error(
          error instanceof Error ? error.message : 'Failed to delete users',
          { id: loadingToast }
        );
      }
    } else {
      console.log(`ℹ️ Non-delete action (${action}), showing placeholder toast`);
      // Placeholder for other bulk actions
      toast.info(`Bulk ${action} operation would be performed on ${userIds.length} users`);
      setSelectedUsers(new Set());
    }
    
    console.log('🏁 handleBulkAction completed');
  };

  const exportUsers = () => {
    // This would typically export all users or filtered users to CSV
    toast.info('Export functionality would download user data as CSV');
  };

  // Function to determine user subscription status and priority using real data
  const getUserPriority = (user: any) => {
    const userStatus = subscriptionStatusMap?.[user.id];
    
    if (!userStatus) {
      return {
        status: 'inactive',
        priority: 'low',
        label: 'No Subscription',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-800',
        subTextColor: 'text-gray-600',
        icon: User,
        days: null
      };
    }

    const statusConfig = {
      near_pickup: {
        label: 'Near Pickup',
        iconColor: 'text-orange-600',
        textColor: 'text-orange-800',
        subTextColor: 'text-orange-600',
        icon: Bell
      },
      active_subscriber: {
        label: 'Active',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-800',
        subTextColor: 'text-blue-600',
        icon: Crown
      },
      new_cycle: {
        label: 'New Cycle',
        iconColor: 'text-green-600',
        textColor: 'text-green-800',
        subTextColor: 'text-green-600',
        icon: TrendingUp
      },
      overdue: {
        label: 'Overdue',
        iconColor: 'text-red-600',
        textColor: 'text-red-800',
        subTextColor: 'text-red-600',
        icon: Clock
      },
      inactive: {
        label: 'No Subscription',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-800',
        subTextColor: 'text-gray-600',
        icon: User
      }
    };

    const config = statusConfig[userStatus.status] || statusConfig.inactive;
    
    return {
      status: userStatus.status,
      priority: userStatus.priority,
      label: config.label,
      iconColor: config.iconColor,
      textColor: config.textColor,
      subTextColor: config.subTextColor,
      icon: config.icon,
      days: userStatus.days_until_pickup,
      cycle: userStatus.cycle_number,
      subscription_plan: userStatus.subscription_plan
    };
  };

  // Pagination event handlers
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // User Statistics Cards
  const UserStatsCards = () => (
    <div className="space-y-4 mb-6">
      {/* Priority Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{priorityMetrics.nearPickup}</p>
                <p className="text-xs text-orange-800">Near Pickup</p>
                <p className="text-xs text-orange-600">Next 3 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{priorityMetrics.activeSubscribers}</p>
                <p className="text-xs text-blue-800">Active Subscribers</p>
                <p className="text-xs text-blue-600">Current cycle</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{priorityMetrics.newCycles}</p>
                <p className="text-xs text-green-800">New Cycles</p>
                <p className="text-xs text-green-600">Starting soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{priorityMetrics.overdue}</p>
                <p className="text-xs text-red-800">Overdue Returns</p>
                <p className="text-xs text-red-600">Needs attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Metrics Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.activeUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.inactiveUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.adminUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.regularUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Regular</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '...' : userStats?.recentUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Mobile card layout for users
  const MobileUsersList = () => (
    <div className="space-y-3">
      {users?.map((user) => {
        const priority = getUserPriority(user);
        const PriorityIcon = priority.icon;
        
        return (
          <Card 
            key={user.id} 
            className={`p-4 ${
              priority.priority === 'high' 
                ? 'border-l-4 border-l-red-500 bg-red-50' 
                : priority.priority === 'medium'
                ? 'border-l-4 border-l-blue-500 bg-blue-50'
                : ''
            }`}
          >
            <div className="space-y-3">
              {/* User Name and Priority Status */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                          : 'No name'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ID: {user.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                    {user.role}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {user.is_active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-700">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-700">Inactive</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white border">
                <PriorityIcon className={`w-4 h-4 ${priority.iconColor}`} />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${priority.textColor}`}>
                    {priority.label}
                  </span>
                  {priority.days !== null && priority.days !== undefined && (
                    <span className={`text-xs ${priority.subTextColor} ml-2`}>
                      {priority.status === 'near_pickup' && `${Math.abs(priority.days)}d until pickup`}
                      {priority.status === 'new_cycle' && `Starting in ${Math.abs(priority.days)}d`}
                      {priority.status === 'overdue' && `${Math.abs(priority.days)}d overdue`}
                    </span>
                  )}
                  {priority.cycle && (
                    <span className={`text-xs ${priority.subTextColor} ml-2`}>
                      Cycle {priority.cycle}
                    </span>
                  )}
                  {priority.subscription_plan && (
                    <span className={`text-xs ${priority.subTextColor} block`}>
                      {priority.subscription_plan}
                    </span>
                  )}
                </div>
                {priority.priority === 'high' && (
                  <Target className="w-4 h-4 text-red-500" />
                )}
              </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{user.phone}</span>
              </div>
              {user.email && (
                <div className="text-xs text-muted-foreground ml-6">
                  {user.email}
                </div>
              )}
            </div>

            {/* Location */}
            {(user.city || user.state) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {user.city && user.state ? (
                    `${user.city}, ${user.state}`
                  ) : (
                    user.city || user.state
                  )}
                </span>
              </div>
            )}

            {/* Customer Creation Date */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Customer Created: {formatIndianDateTime(user.created_at)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewUser(user)}
                className="flex-1"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditUser(user)}
                className="flex-1"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </Card>
        );
      })}
    </div>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading users:</strong> {error.message}
              <div className="mt-2">
                <Button onClick={handleForceRefresh} size="sm" disabled={isRefreshing}>
                  {isRefreshing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <UserStatsCards />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={isMobile ? 'text-lg' : ''}>User Management</CardTitle>
              <CardDescription className={isMobile ? 'text-sm' : ''}>
                Manage and view all system users
                <span className="ml-2 text-sm font-medium">
                  ({totalCount.toLocaleString()} total users)
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleForceRefresh} 
                variant="outline" 
                size={isMobile ? "sm" : "sm"}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isMobile ? '' : 'Refresh'}
              </Button>
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                size={isMobile ? "sm" : "sm"}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isMobile ? 'Add' : 'Create User'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Priority Filters */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
            <Button
              variant={filters.subscription_status === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, subscription_status: 'all' }))}
            >
              All Users
            </Button>
                         <Button
               variant={filters.subscription_status === 'near_pickup' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setFilters(prev => ({ ...prev, subscription_status: 'near_pickup' }))}
               className="border-orange-300 text-orange-700 hover:bg-orange-100"
             >
               🔥 Near Pickup ({priorityMetrics.nearPickup})
             </Button>
             <Button
               variant={filters.subscription_status === 'overdue' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setFilters(prev => ({ ...prev, subscription_status: 'overdue' }))}
               className="border-red-300 text-red-700 hover:bg-red-100"
             >
               ⚠️ Overdue ({priorityMetrics.overdue})
             </Button>
             <Button
               variant={filters.subscription_status === 'active_subscriber' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setFilters(prev => ({ ...prev, subscription_status: 'active_subscriber' }))}
               className="border-blue-300 text-blue-700 hover:bg-blue-100"
             >
               🔄 Active ({priorityMetrics.activeSubscribers})
             </Button>
             <Button
               variant={filters.subscription_status === 'new_cycle' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setFilters(prev => ({ ...prev, subscription_status: 'new_cycle' }))}
               className="border-green-300 text-green-700 hover:bg-green-100"
             >
               🚀 New Cycle ({priorityMetrics.newCycles})
             </Button>
             <Button
               variant={filters.date_range === 'last_7_days' ? 'default' : 'outline'}
               size="sm"
               onClick={() => setFilters(prev => ({ 
                 ...prev, 
                 date_range: 'last_7_days',
                 created_from: '',
                 created_to: ''
               }))}
               className="border-purple-300 text-purple-700 hover:bg-purple-100"
             >
               📅 Recent Signups (7d)
             </Button>
          </div>

          {/* Active Date Filter Indicator */}
          {filters.date_range && filters.date_range !== 'all' && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Filtered by: {
                  filters.date_range === 'custom' 
                    ? `${filters.created_from || 'Start'} to ${filters.created_to || 'End'}`
                    : filters.date_range.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                }
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  date_range: 'all', 
                  created_from: '', 
                  created_to: '' 
                }))}
                className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-4 mb-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, phone, or location..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-8"
                />
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={filters.subscription_status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, subscription_status: value as any }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscribers</SelectItem>
                    <SelectItem value="active_subscriber">🔴 Active Subscribers</SelectItem>
                    <SelectItem value="near_pickup">🟠 Near Pickup</SelectItem>
                    <SelectItem value="new_cycle">🟢 New Cycle</SelectItem>
                    <SelectItem value="overdue">🟡 Overdue</SelectItem>
                    <SelectItem value="inactive">⚫ Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.role}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, role: value as any }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showAdvancedFilters ? 'Hide' : 'More'} Filters
                </Button>
              </div>
            </div>
            
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                {/* Location Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Filter by city..."
                    value={filters.city}
                    onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Filter by state..."
                    value={filters.state}
                    onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
                    className="flex-1"
                  />
                </div>

                {/* Creation Date Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Customer Creation Date</span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <Select
                      value={filters.date_range}
                      onValueChange={(value) => setFilters(prev => ({ 
                        ...prev, 
                        date_range: value as any,
                        // Clear custom dates when selecting predefined range
                        ...(value !== 'custom' && { created_from: '', created_to: '' })
                      }))}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                        <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                        <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                        <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Custom Date Range Inputs */}
                    {filters.date_range === 'custom' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                          <Input
                            type="date"
                            value={filters.created_from}
                            onChange={(e) => setFilters(prev => ({ ...prev, created_from: e.target.value }))}
                            className="w-40"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                          <Input
                            type="date"
                            value={filters.created_to}
                            onChange={(e) => setFilters(prev => ({ ...prev, created_to: e.target.value }))}
                            className="w-40"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Clear All Button */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      search: '',
                      role: 'all',
                      status: 'all',
                      city: '',
                      state: '',
                      subscription_status: 'all',
                      date_range: 'all',
                      created_from: '',
                      created_to: ''
                    })}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center justify-between p-3 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <UserX className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleBulkAction('delete')}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportUsers}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Users Table/List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-3" />
              <span className={isMobile ? 'text-sm' : ''}>Loading users...</span>
            </div>
          ) : users?.length === 0 ? (
            <div className="text-center py-8">
              <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
                {Object.values(debouncedFilters).some(f => f && f !== 'all') 
                  ? "No users found matching your filters." 
                  : "No users found."}
              </p>
              {!Object.values(debouncedFilters).some(f => f && f !== 'all') && (
                <div className="mt-4">
                  <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First User
                  </Button>
                </div>
              )}
            </div>
          ) : isMobile ? (
            <MobileUsersList />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={users.length > 0 && selectedUsers.size === users.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Customer Creation Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => {
                    const priority = getUserPriority(user);
                    const PriorityIcon = priority.icon;
                    
                    return (
                      <TableRow 
                        key={user.id}
                        className={
                          priority.priority === 'high' 
                            ? 'border-l-4 border-l-red-500 bg-red-50' 
                            : priority.priority === 'medium'
                            ? 'border-l-4 border-l-blue-500 bg-blue-50'
                            : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">
                                {user.first_name || user.last_name 
                                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                  : 'No name'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {user.id.slice(0, 8)}...
                              </div>
                            </div>
                            {priority.priority === 'high' && (
                              <Target className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PriorityIcon className={`w-4 h-4 ${priority.iconColor}`} />
                            <div>
                              <div className={`text-sm font-medium ${priority.textColor}`}>
                                {priority.label}
                              </div>
                                                             {priority.days !== null && priority.days !== undefined && (
                                 <div className={`text-xs ${priority.subTextColor}`}>
                                   {priority.status === 'near_pickup' && `${Math.abs(priority.days)}d until pickup`}
                                   {priority.status === 'new_cycle' && `Starts in ${Math.abs(priority.days)}d`}
                                   {priority.status === 'overdue' && `${Math.abs(priority.days)}d overdue`}
                                 </div>
                               )}
                               {priority.cycle && (
                                 <div className={`text-xs ${priority.subTextColor}`}>
                                   Cycle {priority.cycle}
                                 </div>
                               )}
                               {priority.subscription_plan && (
                                 <div className={`text-xs ${priority.subTextColor}`}>
                                   {priority.subscription_plan}
                                 </div>
                               )}
                            </div>
                          </div>
                        </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.phone}</div>
                          {user.email && (
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {user.city && user.state ? (
                            <>
                              <div>{user.city}</div>
                              <div className="text-muted-foreground">{user.state}</div>
                            </>
                          ) : user.city || user.state ? (
                            <div>{user.city || user.state}</div>
                          ) : (
                            <span className="text-muted-foreground">Not provided</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.is_active ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-green-700">Active</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-700">Inactive</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                                            <TableCell>
                        <div className="text-sm">
                          {user.created_at 
                            ? formatIndianDateTime(user.created_at)
                            : 'Unknown'
                          }
                        </div>
                      </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewUser(user)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}


          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page:</p>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newSize = Number(e.target.value);
                      handlePageSizeChange(newSize);
                    }}
                    className="h-8 w-16 border border-input bg-background px-2 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePreviousPage();
                    }}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {!isMobile && "Previous"}
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextPage();
                    }}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
                  >
                    {!isMobile && "Next"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
      />

      {/* View User Dialog */}
      <ViewUserDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        user={selectedUser}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
};

export default AdminUsers;
