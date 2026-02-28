import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar, 
  Package, 
  RefreshCw,
  AlertCircle,
  Crown,
  TrendingUp,
  Gift,
  Star,
  CheckCircle,
  Truck,
  RotateCcw,
  Phone,
  MapPin,
  Mail,
  User,
  History,
  Award,
  Heart,
  Home,
  Settings,
  LogOut,
  Clock,
  ShoppingBag,
  HelpCircle,
  ChevronRight,
  Info,
  CreditCard,
  Bell,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  EyeOff,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, addDays } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast as sonnerToast } from 'sonner';
import { useNextCycleManager } from '@/hooks/useNextCycle';
// import QueueManagement from '@/components/subscription/QueueManagement'; // Removed - now on dedicated page
import { QueuedToysDisplay } from '@/components/subscription/QueuedToysDisplay';
import { NextDeliveryUpdates } from '@/components/dashboard/NextDeliveryUpdates';
import { CombinedOrderHistory } from '@/components/dashboard/CombinedOrderHistory';
import { SubscriptionTimeline } from '@/components/dashboard/SubscriptionTimeline';
import { useSubscriptionSelection } from '@/hooks/useSubscriptionSelection';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubscriptionService } from '@/services/subscriptionService';
import { CycleIntegrationService } from '@/services/cycleIntegrationService';
import { useUnifiedSubscriptionStatus } from '@/hooks/useUnifiedSubscriptionStatus';
import PremiumMobileDashboard from '@/components/mobile/PremiumMobileDashboard';
import { normalizeSelectionWindowData } from '@/utils/cycleCalculations';

interface RentalOrder {
  id: string;
  order_number: string;
  legacy_order_id: string;
  user_id: string;
  user_phone: string;
  cycle_number: number;
  status: string;
  return_status: string;
  rental_start_date: string;
  rental_end_date: string;
  toys_delivered_count: number;
  toys_returned_count: number;
  total_amount: number;
  base_amount: number;
  toys_data: any[];
  created_at: string;
  legacy_created_at: string;
  subscription_plan: string;
  payment_status: string;
  shipping_address: string;
}

const RentalOrdersOnlyDashboard = () => {
  const { user, signOut } = useCustomAuth();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  // const [showToySelection, setShowToySelection] = useState(false); // Removed - now using dedicated page
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ NEW: Add cycle management state
  const [currentCycle, setCurrentCycle] = useState(null);
  const [canUpdateCycle, setCanUpdateCycle] = useState(false);

  // Check if user is admin
  const isAdmin = !isRoleLoading && userRole === 'admin';

  // Add Next Cycle Manager hook
  const nextCycleManager = useNextCycleManager(user?.id);

  // 🔧 NEW: Use unified subscription status for consistent data
  const { 
    data: unifiedStatus, 
    isLoading: isUnifiedStatusLoading,
    refetch: refetchUnifiedStatus 
  } = useUnifiedSubscriptionStatus();

  // Use the new subscription selection service
  const {
    cycleData,
    selectionWindow,
    selectionRules,
    notifications,
    canSelectToys: hookCanSelectToys,
    isSelectionUrgent,
    isSelectionCritical,
    timeUntilAction,
    selectionStatus: hookSelectionStatus,
    selectionMessage,
    isLoading: isSelectionLoading,
    refreshData: refreshSelectionData,
    handleEdgeCase,
    markNotificationRead,
    getActionButtons
  } = useSubscriptionSelection({
    enableNotifications: true,
    enableRealTimeUpdates: true,
    onSelectionWindowChange: (window) => {
      // Handle selection window changes
      if (window.isClosingSoon) {
        toast({
          title: "Selection Window Closing Soon",
          description: `Your selection window closes in ${window.closesInHours} hours`,
          variant: "destructive"
        });
      }
    },
    onNotification: (notification) => {
      // Handle new notifications
      if (notification.priority === 'critical') {
        toast({
          title: notification.title,
          description: notification.message,
          variant: "destructive"
        });
      }
    }
  });

  // ✅ NEW: Load cycle info using the new service
  useEffect(() => {
    loadCycleInfo();
  }, [user?.id]);

  const loadCycleInfo = async () => {
    if (!user?.id) return;

    try {
      const cycleStatus = await CycleIntegrationService.canUserUpdateCycle(user.id);
      setCurrentCycle(cycleStatus.currentCycle);
      setCanUpdateCycle(cycleStatus.canUpdate);
    } catch (error) {
      console.error('Error loading cycle info:', error);
    }
  };

  // ✅ NEW: Enhanced toy selection handler that updates existing cycle
  const handleToySelection = async (selectedToys: any[]) => {
    if (!currentCycle?.cycle_id) {
      sonnerToast.error('No active cycle found');
      return;
    }

    try {
      // ✅ NEW: Update existing cycle instead of creating new order
      const result = await CycleIntegrationService.updateCycleToys(
        currentCycle.cycle_id,
        selectedToys,
        user.id
      );

      sonnerToast.success(result.message);
      
      // 🔒 NEW: Automatically close selection window after cycle toy update
      try {
        const { SubscriptionService } = await import('@/services/subscriptionService');
        const windowClosed = await SubscriptionService.closeSelectionWindowAfterOrder(
          user.id, 
          'cycle_update',
          `Cycle toys updated: ${selectedToys.length} toys selected`
        );
        
        if (windowClosed) {
          console.log('✅ Selection window automatically closed after cycle toy update');
        } else {
          console.warn('⚠️ Failed to close selection window after cycle update (non-critical)');
        }
      } catch (windowError) {
        console.error('⚠️ Error closing selection window after cycle update (non-critical):', windowError);
      }
      
      // Refresh cycle info
      await loadCycleInfo();
      
      // Refresh other dashboard data
      queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard', user.id] });
      queryClient.invalidateQueries({ queryKey: ['current-rentals', user.id] });
      queryClient.invalidateQueries({ queryKey: ['selection-status', user.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-cycle', user.id] });
      queryClient.invalidateQueries({ queryKey: ['rental-subscription-data', user.id] });
      queryClient.invalidateQueries({ queryKey: ['cycleStatus', user.id] }); // 🔒 CRITICAL: Invalidate cycle status for dashboard
      
      // Toy selection is now on a dedicated page - no modal to close

    } catch (error: any) {
      sonnerToast.error(`Failed to update toys: ${error.message}`);
    }
  };

  // ✅ FIX 5: Add separate query for selection-critical data with faster updates
  const { data: selectionData, refetch: refreshSelectionStatus } = useQuery({
    queryKey: ['selection-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return SubscriptionService.getCurrentSubscriptionCycle(user.id);
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000, // 15 seconds for selection data
    refetchInterval: 30 * 1000, // 30 seconds for selection data
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // UPDATED: Enhanced dashboard data query using rental-based database views
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['rental-orders-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      try {
        console.log('🔍 Fetching dashboard data using rental-based database views...');

        // NEW: Get enhanced subscription status using database views
        const enhancedSubscriptionStatus = await SubscriptionService.getEnhancedSubscriptionStatus(user.id);
        
        // NEW: Get current subscription cycle using database view
        const currentSubscriptionCycle = await SubscriptionService.getCurrentSubscriptionCycle(user.id);
        
        
        // NEW: Get upcoming cycles using database view
        const upcomingCycles = await SubscriptionService.getUpcomingCycles(user.id);
        
        // NEW: Get cycle history using database view
        const cycleHistory = await SubscriptionService.getCycleHistory(user.id);

        // Get user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('custom_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST301' || profileError.message?.includes('JWT') || profileError.message?.includes('invalid') || profileError.message?.includes('apikey')) {
            localStorage.removeItem('toyflix_custom_session');
            localStorage.removeItem('toyflix_custom_user');
            window.location.href = '/auth';
            return null;
          }
          throw profileError;
        }

        // Get rental orders - still needed for detailed order information
        let rentalOrdersData = [];
        
        // Normalize phone number if available
        if (user?.phone) {
          const originalPhone = user.phone;
          const phoneVariations = [
            originalPhone,
            originalPhone.replace(/^\+91/, ''),
            originalPhone.replace(/^\+/, ''),
            originalPhone.startsWith('+91') ? originalPhone.substring(3) : originalPhone,
            originalPhone.startsWith('91') && originalPhone.length === 12 ? originalPhone.substring(2) : originalPhone
          ];
          
          const uniquePhoneVariations = [...new Set(phoneVariations)];

          for (const phoneVariation of uniquePhoneVariations) {
            try {
              const { data, error } = await supabase
                .from('rental_orders' as any)
                .select('*')
                .eq('user_phone', phoneVariation)
                .order('cycle_number', { ascending: false });

              if (!error && data && data.length > 0) {
                rentalOrdersData = data;
                break;
              }
            } catch (err) {
              console.log('Error querying rental_orders by phone:', err);
            }
          }
        }

        if (!rentalOrdersData || rentalOrdersData.length === 0) {
          // Fallback to user_id query
          try {
            const { data: fallbackData } = await supabase
              .from('rental_orders' as any)
              .select('*')
              .eq('user_id', user.id)
              .order('cycle_number', { ascending: false });
              
            rentalOrdersData = fallbackData || [];
          } catch (err) {
            console.log('Error querying rental_orders by user_id:', err);
            rentalOrdersData = [];
          }
        }

        const orders: RentalOrder[] = rentalOrdersData || [];
        
        // Extract shipping address and name information from the most recent order
        let shippingInfo = null;
        let displayName = userProfile?.first_name || 'User';
        
        if (orders.length > 0) {
          const latestOrder = orders[0];
          if (latestOrder.shipping_address) {
            try {
              const shippingAddress = typeof latestOrder.shipping_address === 'string' 
                ? JSON.parse(latestOrder.shipping_address) 
                : latestOrder.shipping_address;
              
              shippingInfo = {
                name: shippingAddress.name || shippingAddress.full_name || '',
                first_name: shippingAddress.first_name || '',
                last_name: shippingAddress.last_name || '',
                address_1: shippingAddress.address_1 || shippingAddress.address_line_1 || '',
                address_2: shippingAddress.address_2 || shippingAddress.address_line_2 || '',
                city: shippingAddress.city || '',
                state: shippingAddress.state || '',
                postcode: shippingAddress.postcode || shippingAddress.zip || '',
                country: shippingAddress.country || 'India'
              };
              
              // Use shipping address name if available and user profile name is missing
              if (shippingInfo.name && (!userProfile?.first_name || userProfile.first_name === 'Customer')) {
                displayName = shippingInfo.name;
              } else if (shippingInfo.first_name && (!userProfile?.first_name || userProfile.first_name === 'Customer')) {
                displayName = shippingInfo.first_name + (shippingInfo.last_name ? ` ${shippingInfo.last_name}` : '');
              }
            } catch (error) {
              console.error('Error parsing shipping address:', error);
            }
          }
        }
        
        // UPDATED: Use rental-based calculations from database views
        const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;
        const currentOrder = orders.length > 0 ? orders[0] : null;
        
        // UPDATED: Calculate months active using rental-based dates from database views
        let monthsActive = 0;
        if (enhancedSubscriptionStatus.actualStartDate) {
          monthsActive = Math.ceil(differenceInDays(new Date(), enhancedSubscriptionStatus.actualStartDate) / 30);
        } else if (currentSubscriptionCycle?.actual_subscription_start_date) {
          monthsActive = Math.ceil(differenceInDays(new Date(), currentSubscriptionCycle.actual_subscription_start_date) / 30);
        } else if (orders.length > 0) {
          monthsActive = Math.ceil(differenceInDays(new Date(), new Date(orders[orders.length - 1].created_at)) / 30);
        }
        
        const toysExperienced = orders.reduce((sum, order) => 
          sum + (order.toys_data?.length || 0), 0);

        // UPDATED: Determine subscription status using database views
        const isActive = currentSubscriptionCycle?.subscription_status === 'active' || 
                        userProfile.subscription_active || 
                        orders.length > 0;
        
        const plan = currentSubscriptionCycle?.plan_id || 
                    userProfile.subscription_plan || 
                    currentOrder?.subscription_plan || 
                    'Discovery Delight';

        console.log('✅ Dashboard data loaded with rental-based calculations:', {
          hasCurrentCycle: !!currentSubscriptionCycle,
          hasEnhancedStatus: !!enhancedSubscriptionStatus.subscription,
          upcomingCyclesCount: upcomingCycles.length,
          cycleHistoryCount: cycleHistory.length,
          actualStartDate: enhancedSubscriptionStatus.actualStartDate,
          totalDaysSubscribed: enhancedSubscriptionStatus.totalDaysSubscribed,
          totalRentalOrders: enhancedSubscriptionStatus.totalRentalOrders
        });

        return {
          userProfile,
          orders,
          totalOrders: orders.length,
          isActive,
          plan,
          currentOrder,
          monthsActive,
          toysExperienced,
          shippingInfo,
          displayName,
          totalSpent,
          avgOrderValue,
          
          // NEW: Rental-based subscription data from database views
          currentSubscriptionCycle,
          enhancedSubscriptionStatus,
          upcomingCycles,
          cycleHistory
        };
      } catch (error) {
        console.error('Dashboard query error:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // ✅ FIX 5: 30 seconds instead of 2 minutes for faster updates
    refetchInterval: 60 * 1000, // ✅ FIX 5: 1 minute refresh for dashboard
    refetchOnWindowFocus: true, // ✅ FIX 5: Refetch when user returns to tab
    refetchOnReconnect: true, // ✅ FIX 5: Refetch on network reconnection
    retry: 1,
  });

  // Combined loading state
  const isLoadingData = isLoading || isSelectionLoading;

  if (isLoadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dashboard Error</h3>
            <p className="text-gray-600 mb-4">
              Unable to load your dashboard. Please try again.
            </p>
            <div className="space-y-2">
              <Button onClick={() => { refetch(); refetchUnifiedStatus(); }} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Dashboard
              </Button>
              <Button onClick={() => { refreshSelectionData(); refreshSelectionStatus(); refetchUnifiedStatus(); }} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Selection Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { 
    userProfile, 
    orders, 
    totalOrders, 
    isActive: legacyIsActive, 
    plan: legacyPlan, 
    currentOrder: legacyCurrentOrder,
    monthsActive: legacyMonthsActive,
    toysExperienced,
    shippingInfo,
    displayName,
    currentSubscriptionCycle,
    enhancedSubscriptionStatus,
    upcomingCycles,
    cycleHistory
  } = dashboardData;

  // 🔧 NEW: Use unified subscription status for consistent display
  const isActive = unifiedStatus?.hasActiveSubscription ?? legacyIsActive;
  const plan = unifiedStatus?.currentPlan ?? legacyPlan;
  const currentOrder = unifiedStatus?.currentOrder ?? legacyCurrentOrder;
  const monthsActive = unifiedStatus?.monthsActive ?? legacyMonthsActive;

  // Calculate financial metrics for stats display (ensure they're always available)
  const totalSpent = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
  const avgOrderValue = orders?.length > 0 ? totalSpent / orders.length : 0;

  // UPDATED: Use rental-based cycle data from database views instead of client-side calculations
  const cycleProgress = currentSubscriptionCycle?.cycle_progress_percentage || cycleData?.progressPercentage || 0;
  const currentCycleNumber = currentSubscriptionCycle?.current_cycle_number || cycleData?.cycleNumber || currentOrder?.cycle_number || 1;
  
  // UPDATED: Calculate days until next pickup using rental-based dates from database views
  const daysUntilNextPickup = currentSubscriptionCycle ? 
    currentSubscriptionCycle.days_remaining_in_cycle : 
    (cycleData ? (cycleData.daysInCycle - cycleData.currentDayInCycle) : 0);
    
  // UPDATED: Use rental-based next pickup date calculation
  const nextPickupDate = currentSubscriptionCycle && currentSubscriptionCycle.current_cycle_end ? 
    addDays(new Date(currentSubscriptionCycle.current_cycle_end), 1) :
    (cycleData ? addDays(cycleData.cycleStartDate, cycleData.daysInCycle) : null);
  
  // ✅ FIXED: UNIFIED CYCLE LOGIC with standardized calculations
  const unifiedCycleLogic = (() => {
    // Priority 1: Use current subscription cycle data with manual controls
    if (currentSubscriptionCycle) {
      const normalizedData = normalizeSelectionWindowData({
        rental_start_date: currentSubscriptionCycle.rental_start_date,
        current_cycle_day: currentSubscriptionCycle.current_day_in_cycle,
        selection_window_status: currentSubscriptionCycle.selection_window_status,
        manual_selection_control: currentSubscriptionCycle.manual_selection_control,
        subscription_status: currentSubscriptionCycle.subscription_status
      });


      return {
        canSelectToys: normalizedData.isOpen,
        selectionStatus: normalizedData.status,
        isOpen: normalizedData.isOpen,
        cycleNumber: currentSubscriptionCycle.cycle_number,
        cycleDay: normalizedData.cycleDay,
        planName: currentSubscriptionCycle.plan_id,
        toysCount: currentSubscriptionCycle.toys_count || 0,
        reason: normalizedData.reason,
        daysUntilOpens: normalizedData.daysUntilOpens,
        daysUntilCloses: normalizedData.daysUntilCloses,
        manualControl: currentSubscriptionCycle.manual_selection_control,
        source: 'current_subscription_cycle'
      };
    }
    
    // Priority 2: Use new cycle system data
    if (currentCycle) {
      return {
        canSelectToys: canUpdateCycle,
        selectionStatus: canUpdateCycle ? 'open' : 'closed',
        isOpen: canUpdateCycle,
        cycleNumber: currentCycle.cycle_number,
        cycleDay: null,
        planName: currentCycle.plan_name,
        toysCount: currentCycle.toys_count,
        reason: canUpdateCycle ? 'Selection window open' : 'Selection window closed',
        daysUntilOpens: 0,
        daysUntilCloses: 0,
        manualControl: false,
        source: 'new_system'
      };
    }
    
    // Priority 3: Fallback to old selection window system
    if (selectionWindow) {
      return {
        canSelectToys: hookCanSelectToys || false,
        selectionStatus: hookSelectionStatus || 'closed',
        isOpen: selectionWindow.isOpen,
        cycleNumber: currentCycleNumber,
        cycleDay: null,
        planName: plan,
        toysCount: 0,
        reason: selectionMessage || 'Selection window status unknown',
        daysUntilOpens: 0,
        daysUntilCloses: 0,
        manualControl: false,
        source: 'old_system'
      };
    }
    
    // Priority 4: No data available
    return {
      canSelectToys: false,
      selectionStatus: 'unknown',
      isOpen: false,
      cycleNumber: 1,
      cycleDay: null,
      planName: plan,
      toysCount: 0,
      reason: 'No subscription data available',
      daysUntilOpens: 0,
      daysUntilCloses: 0,
      manualControl: false,
      source: 'no_data'
    };
  })();


  // Use unified variables throughout component
  const canSelectToys = unifiedCycleLogic.canSelectToys;
  const selectionStatus = unifiedCycleLogic.selectionStatus;
  const finalSelectionWindow = selectionWindow; // Keep for backward compatibility

  // Use queue data from NextCycleManager  
  const hasQueuedToys = nextCycleManager.hasQueue;
  const toyLimit = nextCycleManager.toyLimit || selectionRules?.maxToysPerCycle || 5;
  
  // 🔒 ENHANCED: Check if selection should be disabled due to recent queue order
  const shouldDisableSelection = hasQueuedToys || (selectionWindow?.status === 'closed' && 
    (selectionWindow?.reason?.includes('queue order') || selectionWindow?.reason?.includes('order placement')));
  
  // Get action buttons from the subscription service
  const actionButtons = getActionButtons();

  const handleBrowseToys = () => navigate('/toys');
  const handleTrackOrder = () => navigate('/orders');
  const handleWishlist = () => navigate('/wishlist');
  const handleSupport = () => {
    // Import WhatsApp service dynamically
    import('@/services/whatsappService').then(({ WhatsAppService }) => {
      WhatsAppService.openSelectionWindowSupport({
        userPhone: user?.phone,
        userName: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : undefined,
        selectionStatus: selectionMessage
      });
    });
  };
  // ✅ FIX 4: Improved Select Toys Navigation 
  const handleSelectToys = () => {
    if (!currentCycle?.cycle_id) {
      sonnerToast.error('No active cycle found. Please contact support.');
      return;
    }

    // Navigate to dedicated toy selection page for better mobile UX
    navigate('/select-toys');
  };

  // Handle edge case scenarios
  const handleEmergencySelection = () => handleEdgeCase('emergency_change');
  const handleLateSelection = () => handleEdgeCase('late_selection');
  const handleCustomerServiceOverride = () => handleEdgeCase('customer_service_override');

  // ✅ MOBILE OPTIMIZATION: Use premium mobile dashboard on mobile devices
  if (isMobile) {
    return (
      <PremiumMobileDashboard 
        dashboardData={{
          userProfile,
          orders,
          totalOrders,
          isActive,
          plan,
          currentOrder,
          cycleProgress: Math.round(((30 - daysUntilNextPickup) / 30) * 100),
          daysUntilNextPickup,
          nextPickupDate: currentOrder?.rental_end_date,
          isSelectionWindow: canSelectToys,
          monthsActive,
          toysExperienced,
          shippingInfo,
          displayName,
          // ✅ CRITICAL FIX: Pass the same data that desktop uses
          currentSubscriptionCycle: dashboardData?.currentSubscriptionCycle,
          unifiedCycleLogic: unifiedCycleLogic
        }}
        refetch={refetch}
      />
    );
  }

  return (
    <div className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'} max-w-7xl mx-auto`}>
      {/* ✅ IMPROVED: Clean, Focused Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Site
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Smart Status Indicator - Single, Primary Status */}
            <Badge 
              variant={
                isSelectionCritical ? "destructive" : 
                isSelectionUrgent ? "secondary" : 
                canSelectToys ? "default" : 
                isActive ? "outline" : "secondary"
              } 
              className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}
            >
              {isSelectionCritical ? (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Action Required
                </>
              ) : isSelectionUrgent ? (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Selection Closing Soon
                </>
              ) : canSelectToys ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ready to Select
                </>
              ) : isActive ? (
                <>
                  <Package className="w-3 h-3 mr-1" />
                  Active Subscription
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Inactive
                </>
              )}
            </Badge>
            
            {/* Notifications - Only show if critical */}
            {notifications && notifications.filter(n => n.priority === 'critical').length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative text-red-600 hover:text-red-700"
              >
                <Bell className="w-4 h-4" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </Button>
            )}
            
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}

            {/* Secondary Actions - Collapsible */}
            <Collapsible open={showAdvancedActions} onOpenChange={setShowAdvancedActions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute right-0 top-12 z-10 bg-white border rounded-lg shadow-lg p-2 space-y-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { 
                    refetch(); 
                    refreshSelectionData(); 
                    refetchUnifiedStatus(); 
                  }}
                  className="w-full justify-start"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                {notifications && notifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowNotifications(true)}
                    className="w-full justify-start"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    All Notifications ({notifications.length})
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        
        {/* Welcome Message - Clean and Focused */}
        <div className="text-center space-y-2">
          <h1 className={`${isMobile ? 'text-3xl' : 'text-4xl'} font-bold text-gray-900`}>
            Welcome back, {displayName}!
          </h1>
          <p className="text-gray-600 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-yellow-500" />
            {plan} Member
            {monthsActive > 0 && (
              <span className="text-gray-500">• {monthsActive} months with ToyFlix</span>
            )}
          </p>
          

        </div>
      </div>

      {/* UPDATED: Enhanced Subscription Cycle Status with rental-based data */}
      {(currentSubscriptionCycle || cycleData || currentOrder) && (
        <Card className={`border-2 ${
          isSelectionCritical ? 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50' :
          isSelectionUrgent ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50' :
          canSelectToys ? 'border-green-200 bg-gradient-to-r from-green-50 to-blue-50' :
          'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`${isMobile ? 'space-y-4' : 'flex flex-col lg:flex-row lg:items-center justify-between gap-6'}`}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} ${
                    isSelectionCritical ? 'bg-red-500' :
                    isSelectionUrgent ? 'bg-orange-500' :
                    canSelectToys ? 'bg-green-500' :
                    'bg-blue-500'
                  } rounded-full flex items-center justify-center`}>
                    <Package className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
                  </div>
                  <div>
                    <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${
                      isSelectionCritical ? 'text-red-900' :
                      isSelectionUrgent ? 'text-orange-900' :
                      canSelectToys ? 'text-green-900' :
                      'text-blue-900'
                    }`}>
                      Current Subscription Status
                    </h3>
                    <p className={`${isMobile ? 'text-sm' : ''} ${
                      isSelectionCritical ? 'text-red-700' :
                      isSelectionUrgent ? 'text-orange-700' :
                      canSelectToys ? 'text-green-700' :
                      'text-blue-700'
                    }`}>
                      {currentOrder?.toys_data?.length || 0} toys at home
                      {currentSubscriptionCycle && (
                        <span className="ml-2">• {currentSubscriptionCycle.plan_id}</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`${
                      isSelectionCritical ? 'text-red-700' :
                      isSelectionUrgent ? 'text-orange-700' :
                      canSelectToys ? 'text-green-700' :
                      'text-blue-700'
                    }`}>
                      Subscription Progress
                      {currentSubscriptionCycle && (
                        <span className="text-xs text-gray-500 ml-1">(DB)</span>
                      )}
                    </span>
                    <span className={`font-medium ${
                      isSelectionCritical ? 'text-red-900' :
                      isSelectionUrgent ? 'text-orange-900' :
                      canSelectToys ? 'text-green-900' :
                      'text-blue-900'
                    }`}>
                      {Math.round(cycleProgress)}%
                    </span>
                  </div>
                  <Progress value={cycleProgress} className="h-2" />
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                    isSelectionCritical ? 'text-red-600' :
                    isSelectionUrgent ? 'text-orange-600' :
                    canSelectToys ? 'text-green-600' :
                    'text-blue-600'
                  }`}>
                    {currentSubscriptionCycle ? 
                      `Day ${currentSubscriptionCycle.current_day_in_cycle} of 30` :
                      (cycleData ? 
                        `Day ${cycleData.currentDayInCycle} of ${cycleData.daysInCycle}` :
                        "Current subscription period"
                      )
                    }
                  </p>
                </div>
              </div>

              <div className={`${isMobile ? 'space-y-3' : 'text-center lg:text-right space-y-3'}`}>
                {/* Enhanced Selection Window with Real-time Status */}
                {selectionWindow ? (
                  <div className={`${
                    isSelectionCritical ? 'bg-red-100 border-red-300' :
                    isSelectionUrgent ? 'bg-orange-100 border-orange-300' :
                    canSelectToys ? 'bg-green-100 border-green-300' :
                    'bg-gray-100 border-gray-300'
                  } rounded-lg p-3`}>
                    <div className={`flex items-center gap-2 ${
                      isSelectionCritical ? 'text-red-800' :
                      isSelectionUrgent ? 'text-orange-800' :
                      canSelectToys ? 'text-green-800' :
                      'text-gray-700'
                    } font-medium`}>
                      {isSelectionCritical ? <AlertTriangle className="w-4 h-4" /> :
                       isSelectionUrgent ? <Zap className="w-4 h-4" /> :
                       canSelectToys ? <Gift className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                      {selectionMessage}
                    </div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                      isSelectionCritical ? 'text-red-700' :
                      isSelectionUrgent ? 'text-orange-700' :
                      canSelectToys ? 'text-green-700' :
                      'text-gray-600'
                    } mt-1`}>
                      {selectionWindow.isOpen ? 
                        `Selection window closes in ${timeUntilAction}` : 
                        `Selection window opens in ${timeUntilAction}`
                      }
                    </p>
                    
                    {/* Dynamic Action Buttons */}
                    <div className={`${isMobile ? 'space-y-2' : 'flex gap-2'} mt-2`}>
                      {actionButtons.map((button, index) => (
                        <Button
                          key={button.action}
                          size={isMobile ? "sm" : "sm"}
                          variant={button.variant}
                          className={`${isMobile ? 'w-full' : ''} ${
                            button.priority === 'critical' ? 'animate-pulse' : ''
                          }`}
                          disabled={button.action === 'select_toys' && shouldDisableSelection}
                          onClick={() => {
                            switch (button.action) {
                              case 'select_toys':
                              case 'modify_selection':
                                if (shouldDisableSelection) {
                                  sonnerToast.info('Toy selection is currently disabled', {
                                    description: hasQueuedToys 
                                      ? 'You have already selected toys for your next delivery'
                                      : 'Selection window was closed after placing an order'
                                  });
                                  return;
                                }
                                handleSelectToys();
                                break;
                              case 'contact_support':
                                handleSupport();
                                break;
                              default:
                                break;
                            }
                          }}
                        >
                          {button.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                      <Clock className="w-4 h-4" />
                      Selection Status Unknown
                    </div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 mt-1`}>
                      Unable to determine selection window status
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Timeline */}
      {user?.id && (
        <SubscriptionTimeline 
          userId={user.id} 
          onSelectToys={() => navigate('/select-toys')} 
        />
      )}

      {/* Selection Window Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Selection Notifications
            </DialogTitle>
            <DialogDescription>
              Important updates about your toy selection window
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    notification.priority === 'critical' ? 'border-red-200 bg-red-50' :
                    notification.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                    notification.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      {notification.actionText && (
                        <Button 
                          size="sm" 
                          className="mt-2" 
                          onClick={() => {
                            if (notification.actionUrl) {
                              navigate(notification.actionUrl);
                            }
                            markNotificationRead(notification.id);
                          }}
                        >
                          {notification.actionText}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Grid */}
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'}`}>
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Toys at Home</p>
                <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-600`}>
                  {currentOrder?.toys_data?.length || 0}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>Current cycle</p>
              </div>
              {!isMobile && (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Toys Experienced</p>
                <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-600`}>
                  {toysExperienced}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>Total toys</p>
              </div>
              {!isMobile && (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Average Order Value</p>
                <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-600`}>
                  {avgOrderValue.toFixed(2)}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>Total spent: {totalSpent.toFixed(2)}</p>
              </div>
              {!isMobile && (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`${isMobile ? 'space-y-2' : 'flex items-center justify-between'}`}>
              <div>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-600`}>Months Active</p>
                <p className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold text-blue-600`}>
                  {monthsActive}
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500 mt-1`}>Total months</p>
              </div>
              {!isMobile && (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NEW: Progressive Disclosure - Advanced Actions */}
      <Collapsible open={showDetailedStats} onOpenChange={setShowDetailedStats}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {showDetailedStats ? 'Hide' : 'Show'} Detailed Analytics
              {showDetailedStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          
          {/* Quick Actions - Always Visible */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBrowseToys}
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Browse Toys
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSupport}
              className="flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Support
            </Button>
          </div>
        </div>
        
        <CollapsibleContent className="space-y-6 mt-6">
          {/* Order History Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CombinedOrderHistory userId={user.id} />
            </CardContent>
          </Card>
          
          {/* Next Delivery Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Upcoming Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NextDeliveryUpdates userId={user.id} />
            </CardContent>
          </Card>
          
          {/* Enhanced Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Subscription Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{toysExperienced}</p>
                  <p className="text-sm text-gray-600">Toys Experienced</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">₹{totalSpent.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{upcomingCycles?.length || 0}</p>
                  <p className="text-sm text-gray-600">Future Cycles</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{cycleHistory?.length || 0}</p>
                  <p className="text-sm text-gray-600">Past Cycles</p>
                </div>
              </div>
              
              {/* Enhanced Subscription Status with Database Views */}
              {enhancedSubscriptionStatus && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Enhanced Subscription Analytics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">Current Plan:</p>
                      <p className="text-blue-600">{currentSubscriptionCycle?.plan_id || 'Not available'}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">Active Since:</p>
                      <p className="text-blue-600">{monthsActive} months</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Toy Selection Modal removed - now uses dedicated page at /select-toys */}
    </div>
  );
};

export default RentalOrdersOnlyDashboard;