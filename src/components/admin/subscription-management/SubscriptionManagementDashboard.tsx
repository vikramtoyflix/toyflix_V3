import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Users, 
  Crown,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Download,
  Settings,
  BarChart3,
  User,
  Package,
  Calendar,
  TrendingUp,
  Zap,
  Eye,
  Edit,
  MoreVertical,
  Plus,
  Trash2,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { Tables } from '@/integrations/supabase/types';
import UserSubscriptionCard from './UserSubscriptionCard';
import UserSubscriptionView from './UserSubscriptionView';
import UserSubscriptionEdit from './UserSubscriptionEdit';
import UserSubscriptionAdd from './UserSubscriptionAdd';
import SubscriptionFilters from './SubscriptionFilters';
import BulkCloseSelectionWindows from './BulkCloseSelectionWindows';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CycleIntegrationService } from '@/services/cycleIntegrationService';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UserImpersonationService from '@/services/userImpersonationService';
import { useNavigate } from 'react-router-dom';

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

const SubscriptionManagementDashboard: React.FC = () => {
  // View Mode State - Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table'); // Default to fast table view

  // Restore missing state variables to fix the error
  const [searchTerm, setSearchTerm] = useState('');
  // NEW: Add debounced search term to prevent excessive API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add' | null>(null);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // NEW: State for card view modal
  const [selectedCardUser, setSelectedCardUser] = useState<UserSubscriptionData | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  
  const isMobile = useIsMobile();
  // ⚡ PERFORMANCE: Larger page size for table view, smaller for cards
  const itemsPerPage = viewMode === 'table' ? 50 : (isMobile ? 6 : 12);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Add state for impersonation loading
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  // NEW: Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if term is empty or has at least 2 characters
      if (searchTerm.length === 0 || searchTerm.length >= 2) {
        setDebouncedSearchTerm(searchTerm);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ⚡ PERFORMANCE: Conditional query based on view mode
  // Add user context for impersonation
  const { user: currentUser, session: currentSession } = useCustomAuth();

  const { data: subscriptionData, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-management', viewMode, currentPage, debouncedSearchTerm, statusFilter, planFilter, sortBy],
    queryFn: async (): Promise<{ data: UserSubscriptionData[], totalCount?: number }> => {
      
      if (viewMode === 'table') {
        // 🚀 FAST TABLE QUERY: Server-side pagination through ALL users
        console.log('🚀 Fast table query - Server-side pagination through ALL users');
        
        try {
          // Step 1: Get total count of ALL users for proper pagination
          const { count: totalUserCount } = await supabase
            .from('custom_users')
            .select('*', { count: 'exact', head: true });

          console.log(`📊 Total users in database: ${totalUserCount}`);

          // Step 2: Get paginated users with simple query
          let userQuery = supabase
            .from('custom_users')
            .select('id, first_name, last_name, phone, email, created_at');

          // Apply search filter on server
          if (debouncedSearchTerm.trim()) {
            const searchPattern = `%${debouncedSearchTerm.trim()}%`;
            userQuery = userQuery.or(`first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern}`);
          }

          // Apply sorting
          switch (sortBy) {
            case 'name':
              userQuery = userQuery.order('first_name');
              break;
            case 'recent':
            default:
              userQuery = userQuery.order('created_at', { ascending: false });
          }

          // Apply pagination - ONLY load current page of ALL users
          const from = (currentPage - 1) * itemsPerPage;
          const to = from + itemsPerPage - 1;
          userQuery = userQuery.range(from, to);

          const { data: users, error: userError } = await userQuery;
          if (userError) throw userError;

          if (!users || users.length === 0) {
            console.log('⚡ No users found for current page');
            return { data: [], totalCount: totalUserCount || 0 };
          }

                    // Step 3: Get rental orders for these specific users (fetch ALL fields for card view compatibility)
          const userIds = users.map(user => user.id);
          const { data: rentalOrders, error: ordersError } = await (supabase as any)
            .from('rental_orders')
            .select('*')
            .in('user_id', userIds)
            .order('created_at', { ascending: false });

          if (ordersError) throw ordersError;

          // Step 4: Process and combine data efficiently
          const result: UserSubscriptionData[] = [];
          
          users.forEach((user: any) => {
            const userOrders = rentalOrders?.filter(order => order.user_id === user.id) || [];
            const activeOrders = userOrders.filter(order => order.subscription_status === 'active');
            const inactiveOrders = userOrders.filter(order => order.subscription_status !== 'active');
            
            let subscriptionStatus: 'active' | 'inactive' | 'mixed' = 'inactive';
            if (activeOrders.length > 0 && inactiveOrders.length === 0) {
              subscriptionStatus = 'active';
            } else if (activeOrders.length > 0 && inactiveOrders.length > 0) {
              subscriptionStatus = 'mixed';
            }

            const activeSubscription = activeOrders.length > 0 ? activeOrders[0] : null;
            const totalSpent = userOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
            const lastActivity = userOrders.length > 0 ? (userOrders[0].created_at || user.created_at) : (user.created_at || new Date().toISOString());

            const userWithFullName = {
              ...user,
              full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
            };

            // Apply client-side filters for complex conditions
            if (statusFilter !== 'all' && subscriptionStatus !== statusFilter) return;
            if (planFilter !== 'all' && activeSubscription?.subscription_plan !== planFilter) return;

            result.push({
              user: userWithFullName,
              activeSubscription,
              allSubscriptions: userOrders,
              totalSubscriptions: userOrders.length,
              lastActivity,
              totalSpent,
              subscriptionStatus
            });
          });

          console.log(`⚡ Fast table query completed: ${result.length} rows from page ${currentPage}, total users: ${totalUserCount}`);
          return { data: result, totalCount: totalUserCount || 0 };
          
        } catch (error) {
          console.error('❌ Fast table query failed, falling back to card query logic:', error);
          // Log detailed error information for debugging
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          // FALLBACK: Use the card query logic but with pagination
          console.log('🔄 Using fallback query approach...');
          
          // Simple fallback - get users first
          const { data: fallbackUsers, error: fallbackError } = await supabase
            .from('custom_users')
            .select('*')
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
            
          if (fallbackError) throw fallbackError;
          
          if (!fallbackUsers || fallbackUsers.length === 0) {
            return { data: [] };
          }
          
          // Get rental orders for fallback users
          const fallbackUserIds = fallbackUsers.map(user => user.id);
          const { data: fallbackOrders, error: fallbackOrdersError } = await (supabase as any)
            .from('rental_orders')
            .select('*')
            .in('user_id', fallbackUserIds)
            .order('created_at', { ascending: false });
            
          if (fallbackOrdersError) {
            console.error('❌ Fallback orders query failed:', fallbackOrdersError);
            // If even the fallback fails, return empty array
            return { data: [] };
          }
          
          // Process fallback data
          const fallbackResult: UserSubscriptionData[] = [];
          
          fallbackUsers.forEach(user => {
            const userRentalOrders = (fallbackOrders as any[])?.filter((order: any) => order.user_id === user.id) || [];
            const activeOrders = userRentalOrders.filter((order: any) => order.subscription_status === 'active');
            const inactiveOrders = userRentalOrders.filter((order: any) => order.subscription_status !== 'active');
            
            let subscriptionStatus: 'active' | 'inactive' | 'mixed' = 'inactive';
            if (activeOrders.length > 0 && inactiveOrders.length === 0) {
              subscriptionStatus = 'active';
            } else if (activeOrders.length > 0 && inactiveOrders.length > 0) {
              subscriptionStatus = 'mixed';
            }
            
            const activeSubscription = activeOrders.length > 0 ? activeOrders[0] : null;
            const totalSpent = userRentalOrders.reduce((sum, order: any) => sum + (order.total_amount || 0), 0);
            const lastActivity = userRentalOrders.length > 0 ? (userRentalOrders[0].created_at || user.created_at) : (user.created_at || new Date().toISOString());
            
            const userWithFullName = {
              ...user,
              full_name: user.first_name && user.last_name ? 
                `${user.first_name} ${user.last_name}` : 
                user.first_name || user.last_name || 'Unknown User'
            };
            
            fallbackResult.push({
              user: userWithFullName,
              activeSubscription: activeSubscription,
              allSubscriptions: userRentalOrders,
              totalSubscriptions: userRentalOrders.length,
              lastActivity,
              totalSpent,
              subscriptionStatus
            });
          });
          
          console.log(`🔄 Fallback query completed: ${fallbackResult.length} rows`);
          return { data: fallbackResult };
        }
        
      } else {
        // 🐌 EXISTING CARD QUERY: Load ALL users in 1000-user batches
        console.log('🔍 Card view: Fetching ALL subscription data in 1000-user batches...');
        console.log('📊 Expected: 7200 users, 2329 rental orders');
        
        // Batch fetch all users (1000 per batch due to Supabase server limit)
        const fetchAllUsers = async () => {
          let allUsers = [];
          let from = 0;
          const batchSize = 1000; // Supabase server limit
          
          while (allUsers.length < 10000) { // Fetch up to 10k users to be safe
            console.log(`📦 Fetching users batch ${Math.floor(from/batchSize) + 1}: ${from + 1} to ${from + batchSize}`);
            
            const { data: batch, error } = await supabase
              .from('custom_users')
              .select('*')
              .order('created_at', { ascending: false })
              .range(from, from + batchSize - 1);
            
            if (error) {
              console.error('❌ Error fetching batch:', error);
              throw error;
            }
            
            if (!batch || batch.length === 0) {
              console.log('✅ No more users to fetch');
              break;
            }
            
            allUsers = allUsers.concat(batch);
            console.log(`✅ Batch fetched: ${batch.length}, Total so far: ${allUsers.length}`);
            
            // If we got less than batch size, we've reached the end
            if (batch.length < batchSize) {
              console.log('✅ Reached end of users (last batch was partial)');
              break;
            }
            
            from += batchSize;
          }
          
          return allUsers;
        };

        // Fetch all users in batches
        const users = await fetchAllUsers();
        console.log(`✅ Total users fetched: ${users.length}`);

        // Fetch rental orders (should be fine with 2329 records)
        const { data: rentalOrders, error: rentalOrdersError } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (rentalOrdersError) throw rentalOrdersError;
        console.log(`✅ Total rental orders fetched: ${rentalOrders?.length}`);

        // Process the data (your existing logic)
        const result: UserSubscriptionData[] = [];
        
        users?.forEach(user => {
          const userRentalOrders = (rentalOrders as any[])?.filter((order: any) => order.user_id === user.id) || [];
          
          // 🎯 UPDATED: Get active subscriptions based on subscription_status = 'active'
          const activeOrders = userRentalOrders.filter((order: any) => order.subscription_status === 'active');
          const inactiveOrders = userRentalOrders.filter((order: any) => order.subscription_status !== 'active');
          
          // Determine subscription status
          let subscriptionStatus: 'active' | 'inactive' | 'mixed' = 'inactive';
          if (activeOrders.length > 0 && inactiveOrders.length === 0) {
            subscriptionStatus = 'active';
          } else if (activeOrders.length > 0 && inactiveOrders.length > 0) {
            subscriptionStatus = 'mixed';
          }
          
          // Get the most recent active subscription
          const activeSubscription = activeOrders.length > 0 ? (activeOrders[0] as RentalOrder) : null;
          
          // Calculate total spent
          const totalSpent = userRentalOrders.reduce((sum, order: any) => sum + (order.total_amount || 0), 0);
          
          // Get last activity
          const lastActivity = userRentalOrders.length > 0 ? (userRentalOrders[0].created_at || user.created_at) : (user.created_at || new Date().toISOString());
          
          // Create user with full_name
          const userWithFullName: User = {
            ...user,
            full_name: user.first_name && user.last_name ? 
              `${user.first_name} ${user.last_name}` : 
              user.first_name || user.last_name || 'Unknown User'
          };
          
          result.push({
            user: userWithFullName,
            activeSubscription: activeSubscription,
            allSubscriptions: userRentalOrders as RentalOrder[],
            totalSubscriptions: userRentalOrders.length,
            lastActivity,
            totalSpent,
            subscriptionStatus
          });
        });

        console.log(`✅ Card view: Final result: ${result.length} user subscription records processed`);
        return { data: result };
      }
    },
    staleTime: 0, // No cache during testing
    gcTime: 0,    // No garbage collection time
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Helper function to fetch fresh user subscription data
  const fetchUserSubscriptionData = useCallback(async (userId: string): Promise<UserSubscriptionData | null> => {
    try {
      // Fetch fresh user data
      const { data: user, error: userError } = await supabase
        .from('custom_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('Error fetching user:', userError);
        return null;
      }

      // Fetch fresh rental orders for this user
      const { data: rentalOrders, error: ordersError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching rental orders:', ordersError);
        return null;
      }

      // Process the data the same way as in the main query
      const userOrders = rentalOrders || [];
      const activeOrders = userOrders.filter(order => order.subscription_status === 'active');
      const inactiveOrders = userOrders.filter(order => order.subscription_status !== 'active');
      
      let subscriptionStatus: 'active' | 'inactive' | 'mixed' = 'inactive';
      if (activeOrders.length > 0 && inactiveOrders.length === 0) {
        subscriptionStatus = 'active';
      } else if (activeOrders.length > 0 && inactiveOrders.length > 0) {
        subscriptionStatus = 'mixed';
      }

      const activeSubscription = activeOrders.length > 0 ? activeOrders[0] : null;
      const totalSpent = userOrders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
      const lastActivity = userOrders.length > 0 ? (userOrders[0].created_at || user.created_at) : (user.created_at || new Date().toISOString());

      const userWithFullName = {
        ...user,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User'
      };

      return {
        user: userWithFullName,
        activeSubscription,
        allSubscriptions: userOrders,
        totalSubscriptions: userOrders.length,
        lastActivity,
        totalSpent,
        subscriptionStatus
      };
    } catch (error) {
      console.error('Error in fetchUserSubscriptionData:', error);
      return null;
    }
  }, []);

  // Function to refresh the selected card user data
  const refreshSelectedCardUser = useCallback(async () => {
    if (!selectedCardUser) return;
    
    try {
      // Refetch the main table data
      await refetch();
      
      // Fetch fresh data for the modal
      const freshData = await fetchUserSubscriptionData(selectedCardUser.user.id);
      if (freshData) {
        setSelectedCardUser(freshData);
        console.log('✅ Modal data refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh selected card user:', error);
    }
  }, [selectedCardUser, refetch, fetchUserSubscriptionData]);

  // 🔄 UPDATED: Delete subscription mutation (use rental_orders table)
  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      console.log('🗑️ Deleting subscription:', subscriptionId);
      
      const { error } = await supabase
        .from('rental_orders' as any)
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;
      
      return subscriptionId;
    },
    onSuccess: (subscriptionId) => {
      toast.success('Subscription deleted successfully');
      refetch();
    },
    onError: (error) => {
      console.error('❌ Error deleting subscription:', error);
      toast.error('Failed to delete subscription');
    }
  });

  // Extract data and totalCount from the query result
  const actualData = subscriptionData?.data || [];
  const totalCount = subscriptionData?.totalCount;

  // ✅ ADDED: Complete filtering and sorting logic (for CARD VIEW only)
  const filteredAndSortedData = useMemo(() => {
    if (viewMode === 'table') {
      // For table view, data is already filtered and sorted on server
      return actualData;
    }
    
    if (!actualData) return [];
    
    let filtered = [...actualData];
    
    // 🔍 SEARCH FILTER: Search by name, phone, or email
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(data => {
        const user = data.user;
        const fullName = user.full_name?.toLowerCase() || '';
        const phone = user.phone?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               phone.includes(searchLower) || 
               email.includes(searchLower);
      });
    }
    
    // 📊 STATUS FILTER: Filter by subscription status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(data => data.subscriptionStatus === statusFilter);
    }
    
    // 📦 PLAN FILTER: Filter by subscription plan
    if (planFilter !== 'all') {
      filtered = filtered.filter(data => 
        data.activeSubscription?.subscription_plan === planFilter
      );
    }
    
    // 🔄 SORTING: Apply sorting logic
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => (a.user.full_name || '').localeCompare(b.user.full_name || ''));
        break;
      case 'spend':
        filtered.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      default:
        // Default to recent
        filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }
    
    return filtered;
  }, [actualData, debouncedSearchTerm, statusFilter, planFilter, sortBy, viewMode]);

  // 📄 PAGINATION: Apply pagination to filtered data (CARD VIEW only)
  const paginatedData = useMemo(() => {
    if (viewMode === 'table') {
      // For table view, pagination is handled on server, so return data as-is
      return actualData;
    }
    
    if (!filteredAndSortedData) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage, viewMode, actualData]);

  // 📈 STATISTICS: Update stats and pagination to use appropriate data source
  const totalPages = useMemo(() => {
    if (viewMode === 'table') {
      // For table view, use total count from database
      return Math.ceil((totalCount || 0) / itemsPerPage);
    } else {
      // For card view, use filtered data length
      return Math.ceil((filteredAndSortedData?.length || 0) / itemsPerPage);
    }
  }, [viewMode, totalCount, filteredAndSortedData, itemsPerPage]);

  const stats = useMemo(() => {
    const dataToUse = viewMode === 'table' ? actualData : filteredAndSortedData;
    if (!dataToUse) return null;
    
    const activeCount = dataToUse.filter(d => d.subscriptionStatus === 'active').length;
    const inactiveCount = dataToUse.filter(d => d.subscriptionStatus === 'inactive').length;
    const mixedCount = dataToUse.filter(d => d.subscriptionStatus === 'mixed').length;
    const totalRevenue = dataToUse.reduce((sum, d) => sum + d.totalSpent, 0);
    
    return {
      total: viewMode === 'table' ? (totalCount || dataToUse.length) : dataToUse.length,
      active: activeCount,
      inactive: inactiveCount,
      mixed: mixedCount,
      totalRevenue,
      // Add filtered vs total counts for better admin insight
      totalUnfiltered: viewMode === 'table' ? (totalCount || 0) : (actualData?.length || 0),
      isFiltered: (debouncedSearchTerm.trim() !== '' || statusFilter !== 'all' || planFilter !== 'all')
    };
  }, [actualData, filteredAndSortedData, debouncedSearchTerm, statusFilter, planFilter, viewMode, totalCount]);

  // 🔄 RESET PAGINATION: Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, planFilter, sortBy, viewMode]);

  // Handlers
  const handleUserSelect = (userId: string, userName: string, mode: 'view' | 'edit' | 'add') => {
    setSelectedUser(userId);
    setSelectedUserName(userName);
    setModalMode(mode);
  };

  const handleAddSubscription = (userId: string, userName: string) => {
    handleUserSelect(userId, userName, 'add');
  };

  // Handle user impersonation for table view
  const handleSwitchUser = useCallback(async (userId: string, userName: string) => {
    if (!currentUser || !currentSession) {
      toast.error('❌ Authentication required', {
        description: 'Please log in to switch users'
      });
      return;
    }

    try {
      setImpersonatingUserId(userId);

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
        userId
      );

      if (result.success && result.impersonatedUser && result.impersonatedSession) {
        // Clear all React Query cache to ensure fresh data for impersonated user
        await queryClient.clear();
        
        // Update auth context with impersonated user
        const authContext = useCustomAuth();
        authContext.setAuth(result.impersonatedUser, result.impersonatedSession);
        
        toast.success('🎭 User Impersonation Started', {
          description: `Now viewing as ${userName}. Redirecting to their dashboard...`,
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
      setImpersonatingUserId(null);
    }
  }, [currentUser, currentSession, navigate]);

  const handleDeleteSubscription = async (subscriptionId: string) => {
    deleteSubscriptionMutation.mutate(subscriptionId);
  };

  // 🔄 UPDATED: Bulk actions (use rental_orders table)
  const handleBulkAction = async (action: string) => {
    if (bulkSelection.size === 0) {
      toast.error('Please select subscriptions to perform bulk actions');
      return;
    }

    try {
      const userIds = Array.from(bulkSelection);
      
      switch (action) {
        case 'activate':
          await Promise.all(userIds.map(async (userId) => {
            const { error } = await supabase
              .from('rental_orders' as any)
              .update({ subscription_status: 'active' })
              .eq('user_id', userId);
            if (error) throw error;
          }));
          toast.success(`Activated ${userIds.length} subscriptions`);
          break;
          
        case 'deactivate':
          await Promise.all(userIds.map(async (userId) => {
            const { error } = await supabase
              .from('rental_orders' as any)
              .update({ subscription_status: 'inactive' })
              .eq('user_id', userId);
            if (error) throw error;
          }));
          toast.success(`Deactivated ${userIds.length} subscriptions`);
          break;
          
        case 'pause':
          await Promise.all(userIds.map(async (userId) => {
            const { error } = await supabase
              .from('rental_orders' as any)
              .update({ subscription_status: 'paused' })
              .eq('user_id', userId);
            if (error) throw error;
          }));
          toast.success(`Paused ${userIds.length} subscriptions`);
          break;
      }
      
      setBulkSelection(new Set());
      setShowBulkActions(false);
      refetch();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleExport = () => {
    if (!actualData) return;
    
    const csvData = actualData.map(data => ({
      'User Name': data.user.full_name,
      'Phone': data.user.phone,
      'Email': data.user.email || '',
      'Status': data.subscriptionStatus,
      'Plan': data.activeSubscription?.subscription_plan || 'None',
      'Cycle': data.activeSubscription?.cycle_number || 0,
      'Total Orders': data.totalSubscriptions,
      'Total Spent': data.totalSpent,
      'Last Activity': data.lastActivity
    }));
    
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-management-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleModalClose = () => {
    setSelectedUser(null);
    setSelectedUserName('');
    setModalMode(null);
  };

  const handleModalSave = () => {
    setSelectedUser(null);
    setSelectedUserName('');
    setModalMode(null);
    refetch();
  };

  // NEW: Card modal handlers
  const handleViewCard = (userData: UserSubscriptionData) => {
    setSelectedCardUser(userData);
    setShowCardModal(true);
  };

  const handleCloseCardModal = () => {
    setSelectedCardUser(null);
    setShowCardModal(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load subscription data. Please try again.
          <Button onClick={() => refetch()} variant="outline" size="sm" className="ml-2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Subscription Management
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">
              Manage customer subscriptions with full administrative control
            </p>
            {viewMode === 'table' && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ⚡ 10x Faster
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* ⚡ PERFORMANCE: View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4 mr-2" />
              Table View
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <Grid className="w-4 h-4 mr-2" />
              Card View
            </Button>
          </div>
          
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {stats.isFiltered ? 'Filtered Results' : 'Total Users'}
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  {stats.isFiltered && (
                    <p className="text-xs text-gray-400">of {stats.totalUnfiltered} total</p>
                  )}
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <X className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mixed</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.mixed}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-20"
            />
            {/* Show loading indicator when search is debouncing */}
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-10 top-3">
                <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
            {/* Clear button */}
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Discovery Delight">Discovery Delight</SelectItem>
              <SelectItem value="Silver Pack">Silver Pack</SelectItem>
              <SelectItem value="Gold Pack PRO">Gold Pack PRO</SelectItem>
              <SelectItem value="Ride-On Monthly">Ride-On Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="spend">Total Spend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Close Selection Windows */}
      <div className="max-w-md">
        <BulkCloseSelectionWindows onRefresh={refetch} />
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Bulk Actions</p>
                <p className="text-sm text-gray-600">
                  {bulkSelection.size} subscription(s) selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleBulkAction('activate')}
                  size="sm"
                  variant="outline"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </Button>
                <Button
                  onClick={() => handleBulkAction('deactivate')}
                  size="sm"
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
                <Button
                  onClick={() => handleBulkAction('pause')}
                  size="sm"
                  variant="outline"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={() => {
                    setBulkSelection(new Set());
                    setShowBulkActions(false);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ⚡ PERFORMANCE: Conditional View Rendering */}
      {viewMode === 'table' ? (
        /* 🚀 FAST TABLE VIEW */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              Subscription Table ({stats?.total || 0} users)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={bulkSelection.size === paginatedData.length && paginatedData.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const allIds = new Set(paginatedData.map(data => data.user.id));
                          setBulkSelection(allIds);
                          setShowBulkActions(allIds.size > 0);
                        } else {
                          setBulkSelection(new Set());
                          setShowBulkActions(false);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Activity</TableHead>
                                        <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((subscriptionData) => {
                  const formatCurrency = (amount: number) => {
                    return new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(amount);
                  };

                  const formatDate = (dateString: string | null | undefined) => {
                    if (!dateString) return 'No date';
                    try {
                      const date = new Date(dateString);
                      if (isNaN(date.getTime())) return 'Invalid date';
                      return format(date, 'MMM dd, yyyy');
                    } catch {
                      return 'Invalid date';
                    }
                  };

                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'active':
                        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
                      case 'inactive':
                        return <Badge variant="secondary">Inactive</Badge>;
                      case 'mixed':
                        return <Badge className="bg-orange-100 text-orange-800">Mixed</Badge>;
                      default:
                        return <Badge variant="outline">Unknown</Badge>;
                    }
                  };

                  return (
                    <TableRow key={subscriptionData.user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={bulkSelection.has(subscriptionData.user.id)}
                          onCheckedChange={(checked) => {
                            const newSelection = new Set(bulkSelection);
                            if (checked) {
                              newSelection.add(subscriptionData.user.id);
                            } else {
                              newSelection.delete(subscriptionData.user.id);
                            }
                            setBulkSelection(newSelection);
                            setShowBulkActions(newSelection.size > 0);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{subscriptionData.user.full_name}</div>
                        <div className="text-sm text-gray-500">ID: {subscriptionData.user.id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{subscriptionData.user.phone}</div>
                        <div className="text-xs text-gray-500">{subscriptionData.user.email}</div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(subscriptionData.subscriptionStatus)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{subscriptionData.activeSubscription?.subscription_plan || 'None'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{subscriptionData.activeSubscription?.cycle_number || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{subscriptionData.totalSubscriptions}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{formatCurrency(subscriptionData.totalSpent)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(subscriptionData.lastActivity)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleViewCard(subscriptionData)}
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Card
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUserSelect(subscriptionData.user.id, subscriptionData.user.full_name, 'view')}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUserSelect(subscriptionData.user.id, subscriptionData.user.full_name, 'edit')}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAddSubscription(subscriptionData.user.id, subscriptionData.user.full_name)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleSwitchUser(subscriptionData.user.id, subscriptionData.user.full_name)}
                                disabled={impersonatingUserId === subscriptionData.user.id}
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                {impersonatingUserId === subscriptionData.user.id ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <UserCheck className="w-4 h-4 mr-2" />
                                )}
                                {impersonatingUserId === subscriptionData.user.id ? 'Switching...' : 'Switch to User'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Empty State for Table */}
            {paginatedData.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500">
                  {debouncedSearchTerm || statusFilter !== 'all' || planFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No subscription data available'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* 🐌 EXISTING CARD VIEW */
        <div className="space-y-4">
          {paginatedData.map((subscriptionData) => (
            <UserSubscriptionCard
              key={subscriptionData.user.id}
              userSubscriptionData={subscriptionData}
              onView={() => handleUserSelect(subscriptionData.user.id, subscriptionData.user.full_name, 'view')}
              onEdit={() => handleUserSelect(subscriptionData.user.id, subscriptionData.user.full_name, 'edit')}
              onAdd={() => handleAddSubscription(subscriptionData.user.id, subscriptionData.user.full_name)}
              onDelete={handleDeleteSubscription}
              onBulkSelect={(selected) => {
                const newSelection = new Set(bulkSelection);
                if (selected) {
                  newSelection.add(subscriptionData.user.id);
                } else {
                  newSelection.delete(subscriptionData.user.id);
                }
                setBulkSelection(newSelection);
                setShowBulkActions(newSelection.size > 0);
              }}
              isSelected={bulkSelection.has(subscriptionData.user.id)}
              // 🔄 ADD: Pass the refetch function for manual refresh
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {paginatedData.length === 0 && !isLoading && viewMode === 'cards' && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-600 mb-6">
              {debouncedSearchTerm || statusFilter !== 'all' || planFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No subscription data available'
              }
            </p>
            {(debouncedSearchTerm || statusFilter !== 'all' || planFilter !== 'all') && (
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPlanFilter('all');
                }} 
                variant="outline"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            {viewMode === 'table' ? (
              <span>
                ⚡ Fast Table View: Showing page {currentPage} of {totalPages} 
                ({itemsPerPage} users per page)
              </span>
            ) : (
              <span>
                Card View: Page {currentPage} of {totalPages} 
                ({itemsPerPage} cards per page)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-3">
              {currentPage} / {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isLoading}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedUser && modalMode === 'view' && (
        <UserSubscriptionView
          userId={selectedUser}
          isOpen={true}
          onClose={handleModalClose}
        />
      )}

      {selectedUser && modalMode === 'edit' && (
        <UserSubscriptionEdit
          userId={selectedUser}
          isOpen={true}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {selectedUser && modalMode === 'add' && (
        <UserSubscriptionAdd
          userId={selectedUser}
          userName={selectedUserName}
          isOpen={true}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {/* Card View Modal */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedCardUser?.user.full_name} - Subscription Card
            </DialogTitle>
          </DialogHeader>
          {selectedCardUser && (
            <div className="mt-4">
              <UserSubscriptionCard
                key={selectedCardUser.user.id}
                userSubscriptionData={selectedCardUser}
                onView={() => handleUserSelect(selectedCardUser.user.id, selectedCardUser.user.full_name, 'view')}
                onEdit={() => {
                  handleCloseCardModal();
                  handleUserSelect(selectedCardUser.user.id, selectedCardUser.user.full_name, 'edit');
                }}
                onAdd={() => {
                  handleCloseCardModal();
                  handleAddSubscription(selectedCardUser.user.id, selectedCardUser.user.full_name);
                }}
                onDelete={handleDeleteSubscription}
                onBulkSelect={() => {}} // Not applicable in modal
                isSelected={false} // Not applicable in modal
                onRefresh={refreshSelectedCardUser}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagementDashboard; 