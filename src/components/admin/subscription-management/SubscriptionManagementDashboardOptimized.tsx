import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { SubscriberSidebar } from './SubscriberSidebar';
import { SubscriptionDetailPanel } from './SubscriptionDetailPanel';
import { SubscriptionTopBar } from './SubscriptionTopBar';
import UserSubscriptionView from './UserSubscriptionView';
import UserSubscriptionEdit from './UserSubscriptionEdit';
import UserSubscriptionAdd from './UserSubscriptionAdd';

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
  rental_start_date: string;
  rental_end_date: string;
  status: string;
  total_amount: number;
  created_at: string;
  age_group: string;
  subscription_category: string;
}

interface UserSubscriptionData {
  user: User;
  activeSubscription: RentalOrder | null;
  allSubscriptions: RentalOrder[];
  totalSubscriptions: number;
  lastActivity: string;
  totalSpent: number;
  subscriptionStatus: 'active' | 'inactive' | 'mixed';
}

const SubscriptionManagementDashboardOptimized: React.FC = () => {
  // State for the new sidebar layout
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'add' | null>(null);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  
  const queryClient = useQueryClient();

  // Fetch subscription data
  const { data: subscriptionData, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-management-optimized'],
    queryFn: async (): Promise<UserSubscriptionData[]> => {
      console.log('🔍 Fetching subscription data for optimized dashboard...');
      
      // Batch fetch all users (1000 per batch due to Supabase server limit)
      const fetchAllUsers = async () => {
        let allUsers = [];
        let from = 0;
        const batchSize = 1000;
        
        while (true) {
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

      // Fetch rental orders
      const { data: rentalOrders, error: rentalOrdersError } = await (supabase as any)
        .from('rental_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (rentalOrdersError) throw rentalOrdersError;
      console.log(`✅ Total rental orders fetched: ${rentalOrders?.length}`);

      // Process the data
      const result: UserSubscriptionData[] = [];
      
      users?.forEach(user => {
        const userRentalOrders = (rentalOrders as any[])?.filter((order: any) => order.user_id === user.id) || [];
        
        // Get active subscriptions based on subscription_status = 'active'
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
        const lastActivity = userRentalOrders.length > 0 ? userRentalOrders[0].created_at || user.created_at : user.created_at;
        
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

      console.log(`✅ Final result: ${result.length} user subscription records processed`);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Delete subscription mutation
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

  // Get selected subscriber data
  const selectedSubscriber = selectedSubscriberId 
    ? subscriptionData?.find(s => s.user.id === selectedSubscriberId) || null
    : null;

  // Handlers
  const handleSelectSubscriber = (subscriberId: string) => {
    setSelectedSubscriberId(subscriberId);
  };

  const handleClearSelection = () => {
    setSelectedSubscriberId(null);
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    deleteSubscriptionMutation.mutate(subscriptionId);
  };

  const handleBulkAction = async (action: string) => {
    if (bulkSelection.size === 0 && !['export-all', 'sync'].includes(action)) {
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
              .update({ subscription_status: 'deactivated' })
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

        case 'export':
        case 'export-all':
          const dataToExport = action === 'export-all' ? subscriptionData : 
            subscriptionData?.filter(s => bulkSelection.has(s.user.id));
          
          if (!dataToExport || dataToExport.length === 0) {
            toast.error('No data to export');
            return;
          }

          const csvData = dataToExport.map(data => ({
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
          a.download = `subscription-${action}-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          
          toast.success(`Exported ${csvData.length} records`);
          break;

        case 'sync':
          await refetch();
          toast.success('Data synchronized successfully');
          break;

        default:
          toast.error(`Unknown action: ${action}`);
      }
      
      setBulkSelection(new Set());
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleUserSelect = (userId: string, userName: string, mode: 'view' | 'edit' | 'add') => {
    setSelectedUser(userId);
    setSelectedUserName(userName);
    setViewMode(mode);
  };

  const handleModalClose = () => {
    setSelectedUser(null);
    setSelectedUserName('');
    setViewMode(null);
  };

  const handleModalSave = () => {
    setSelectedUser(null);
    setSelectedUserName('');
    setViewMode(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Subscription Data</h3>
          <p className="text-gray-600">Please wait while we fetch subscriber information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load subscription data. Please try again.
            <Button onClick={() => refetch()} variant="outline" size="sm" className="ml-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <SubscriptionTopBar
          subscribers={subscriptionData || []}
          bulkSelection={bulkSelection}
          onBulkAction={handleBulkAction}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200">
          <SubscriberSidebar
            subscribers={subscriptionData || []}
            selectedSubscriberId={selectedSubscriberId}
            onSelectSubscriber={handleSelectSubscriber}
            bulkSelection={bulkSelection}
            onBulkSelectionChange={setBulkSelection}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <SubscriptionDetailPanel
            selectedSubscriber={selectedSubscriber}
            onClearSelection={handleClearSelection}
            onDeleteSubscription={handleDeleteSubscription}
            onViewSubscription={(userId, userName) => handleUserSelect(userId, userName, 'view')}
            onEditSubscription={(userId, userName) => handleUserSelect(userId, userName, 'edit')}
            onAddSubscription={(userId, userName) => handleUserSelect(userId, userName, 'add')}
            totalSubscribers={subscriptionData?.length || 0}
            // 🔄 ADD: Pass the refetch function for manual refresh
            onRefresh={refetch}
          />
        </div>
      </div>

      {/* Modals */}
      {viewMode === 'view' && selectedUser && (
        <UserSubscriptionView
          userId={selectedUser}
          isOpen={true}
          onClose={handleModalClose}
        />
      )}

      {viewMode === 'edit' && selectedUser && (
        <UserSubscriptionEdit
          userId={selectedUser}
          isOpen={true}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {viewMode === 'add' && selectedUser && (
        <UserSubscriptionAdd
          userId={selectedUser}
          userName={selectedUserName}
          isOpen={true}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default SubscriptionManagementDashboardOptimized; 