import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Crown,
  RefreshCw,
  Star,
  TrendingUp,
  RotateCcw,
  Gift,
  Truck,
  Heart,
  Phone,
  Settings,
  Home,
  History,
  User,
  CheckCircle,
  Calendar,
  ChevronDown,
  Zap,
  Sparkles
} from 'lucide-react';
import { 
  MobileStatusBadge, 
  MobileOrderItem,
  MobileEmptyState 
} from './MobileDashboardUtils';
import EnhancedMobileToyItem from './EnhancedMobileToyItem';
import MobileSubscriptionTimeline from './MobileSubscriptionTimeline';

interface PremiumMobileDashboardProps {
  dashboardData: any & {
    currentSubscriptionCycle?: any;
    unifiedCycleLogic?: any;
  };
  refetch: () => void;
}

const PremiumMobileDashboard: React.FC<PremiumMobileDashboardProps> = ({ 
  dashboardData, 
  refetch 
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showCurrentToys, setShowCurrentToys] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  
  const isAdmin = !isRoleLoading && userRole === 'admin';

  const { 
    userProfile, 
    orders, 
    totalOrders, 
    isActive, 
    plan, 
    currentOrder,
    cycleProgress,
    daysUntilNextPickup,
    nextPickupDate,
    isSelectionWindow,
    monthsActive,
    toysExperienced,
    shippingInfo,
    displayName,
    currentSubscriptionCycle,
    unifiedCycleLogic
  } = dashboardData;

  // Selection window logic (preserved from original)
  const selectionWindowInfo = (() => {
    const cycleDay = currentSubscriptionCycle?.current_day_in_cycle || unifiedCycleLogic?.cycleDay || 1;
    const isManualControl = currentSubscriptionCycle?.manual_selection_control || unifiedCycleLogic?.manualControl || false;
    const windowStatus = currentSubscriptionCycle?.selection_window_status;
    
    if (isManualControl && (windowStatus === 'manual_open' || windowStatus === 'open')) {
      return {
        shouldShow: true,
        type: 'manual_admin',
        reason: 'Selection manually opened by admin',
        cycleDay,
        isAutoDay24: false
      };
    }
    
    const isAutoDay24to34 = cycleDay >= 24 && cycleDay <= 34;
    if (!isManualControl && isAutoDay24to34) {
      return {
        shouldShow: true,
        type: 'auto_day24',
        reason: `Selection window open (Day ${cycleDay})`,
        cycleDay,
        isAutoDay24: true
      };
    }
    
    if (unifiedCycleLogic?.canSelectToys) {
      return {
        shouldShow: true,
        type: 'unified_logic',
        reason: unifiedCycleLogic.reason || 'Selection window open',
        cycleDay,
        isAutoDay24: cycleDay >= 24 && cycleDay <= 34
      };
    }
    
    if (isSelectionWindow) {
      return {
        shouldShow: true,
        type: 'fallback',
        reason: 'Selection window open (fallback)',
        cycleDay,
        isAutoDay24: cycleDay >= 24 && cycleDay <= 34
      };
    }
    
    return {
      shouldShow: false,
      type: 'closed',
      reason: 'Selection window closed',
      cycleDay,
      isAutoDay24: false
    };
  })();
  
  const shouldShowSelectToys = selectionWindowInfo.shouldShow;

  // Navigation handlers (preserved)
  const handleBrowseToys = () => navigate('/toys');
  const handleSelectToys = () => navigate('/select-toys');
  const handleTrackOrder = () => navigate('/orders');
  const handleWishlist = () => navigate('/wishlist');
  const handleSupport = () => {
    import('@/services/whatsappService').then(({ WhatsAppService }) => {
      WhatsAppService.openGeneralSupport({
        inquiry: 'I need help with my ToyJoyBox subscription'
      });
    });
  };

  const getPrimaryAction = () => {
    if (shouldShowSelectToys) {
      return {
        label: 'Select Toys',
        icon: Gift,
        action: handleSelectToys,
        variant: 'default' as const,
        urgent: true
      };
    }
    return {
      label: 'Browse Toys',
      icon: Package,
      action: handleBrowseToys,
      variant: 'outline' as const,
      urgent: false
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/20 via-violet-100/10 to-fuchsia-100/20" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      <motion.div
        className="absolute top-20 -right-20 w-40 h-40 bg-gradient-to-br from-violet-400/10 to-fuchsia-400/5 rounded-full blur-3xl"
        animate={{ 
          x: [-20, 20, -20],
          y: [0, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-40 -left-20 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-violet-400/5 rounded-full blur-3xl"
        animate={{ 
          x: [20, -20, 20],
          y: [0, 10, 0],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      
      <div className="relative space-y-4 pb-24 px-4 pt-2">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-white/95 to-indigo-50/80 backdrop-blur-xl border border-white/30 shadow-2xl shadow-indigo-500/20 rounded-3xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* Premium Avatar with Animated Glow */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/40">
                      <Crown className="w-7 h-7 text-white drop-shadow-lg" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 rounded-2xl opacity-30 blur-md" />
                    <motion.div
                      className="absolute -inset-0.5 bg-gradient-to-br from-indigo-400 to-violet-400 rounded-2xl opacity-20"
                      animate={{ 
                        opacity: [0.2, 0.4, 0.2],
                        scale: [1, 1.02, 1]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
                      {displayName}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-700 border-emerald-200/50 rounded-full px-3 py-1 shadow-sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm font-medium text-indigo-600">{plan}</span>
                    </div>
                  </div>
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button 
                    onClick={() => refetch()} 
                    variant="ghost" 
                    size="sm" 
                    className="w-10 h-10 p-0 bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl hover:bg-white/60 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                  </Button>
                </motion.div>
              </div>

              {/* Premium Selection Window Alerts */}
              <AnimatePresence mode="wait">
                {selectionWindowInfo.type === 'auto_day24' && (
                  <motion.div
                    key="auto_day24"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="relative bg-gradient-to-br from-amber-400/20 via-yellow-400/15 to-orange-400/20 backdrop-blur-sm border border-amber-200/50 rounded-2xl p-4 mb-4 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-orange-500/10" />
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
                    
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Zap className="w-5 h-5 text-white drop-shadow-sm" />
                          </div>
                        </motion.div>
                        <div>
                          <h3 className="font-bold text-amber-800">Selection Window Open!</h3>
                          <p className="text-sm text-amber-700">Day {selectionWindowInfo.cycleDay} of your cycle</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSelectToys}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 rounded-xl py-3 font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 relative overflow-hidden group"
                      >
                        <div className="relative flex items-center justify-center gap-2 z-10">
                          <Gift className="w-5 h-5 drop-shadow-sm" />
                          <span>Select Toys Now</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                
                {selectionWindowInfo.type === 'manual_admin' && (
                  <motion.div
                    key="manual_admin"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="relative bg-gradient-to-br from-emerald-400/20 via-green-400/15 to-teal-400/20 backdrop-blur-sm border border-emerald-200/50 rounded-2xl p-4 mb-4 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-teal-500/10" />
                    
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <Settings className="w-5 h-5 text-white drop-shadow-sm" />
                        </div>
                        <div>
                          <h3 className="font-bold text-emerald-800">Selection Manually Opened</h3>
                          <p className="text-sm text-emerald-700">Admin opened your selection window</p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleSelectToys}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 rounded-xl py-3 font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Gift className="w-5 h-5 drop-shadow-sm" />
                          <span>Choose Your Toys</span>
                        </div>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Premium Cycle Progress */}
              {currentOrder && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="relative bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl p-4 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/30">
                        <Package className="w-4 h-4 text-white drop-shadow-sm" />
                      </div>
                      <div>
                        <span className="text-sm font-bold bg-gradient-to-r from-violet-700 to-fuchsia-700 bg-clip-text text-transparent">
                          Cycle #{currentOrder.cycle_number}
                        </span>
                        <p className="text-xs text-violet-600 font-medium">
                          {currentOrder.toys_data?.length || 0} toys at home
                        </p>
                      </div>
                    </div>
                    
                    {/* Mini Progress Ring */}
                    <div className="relative w-8 h-8">
                      <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" fill="none" className="text-white/30" />
                        <motion.circle
                          cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" fill="none"
                          className="text-violet-500"
                          strokeDasharray={`${2 * Math.PI * 12}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 12 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 12 * (1 - cycleProgress / 100) }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-violet-600">{Math.round(cycleProgress)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gradient Progress Bar */}
                  <div className="relative h-2 bg-white/50 rounded-full overflow-hidden border border-white/30 mb-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${cycleProgress}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 rounded-full" />
                  </div>
                  
                  <p className="text-xs text-violet-600 font-medium text-center">
                    {daysUntilNextPickup > 0 
                      ? `${daysUntilNextPickup} days until pickup`
                      : "Pickup window is here!"
                    }
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Quick Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-4 gap-3"
        >
          {[
            { icon: Package, value: currentOrder?.toys_data?.length || 0, label: 'At Home', gradient: 'from-indigo-500 to-violet-500', shadow: 'shadow-indigo-500/30' },
            { icon: RotateCcw, value: totalOrders, label: 'Cycles', gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/30' },
            { icon: Star, value: toysExperienced, label: 'Toys', gradient: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-fuchsia-500/30' },
            { icon: TrendingUp, value: `${monthsActive}M`, label: 'Member', gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/30' }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg border border-white/40 shadow-lg hover:shadow-xl rounded-2xl overflow-hidden transition-all duration-300">
                <CardContent className="p-3 text-center">
                  <div className={`w-8 h-8 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-md ${stat.shadow} mx-auto mb-2`}>
                    <stat.icon className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                  <p className="text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Subscription Timeline */}
        <MobileSubscriptionTimeline
          currentCycle={currentSubscriptionCycle}
          upcomingCycles={dashboardData?.upcomingCycles}
          cycleHistory={dashboardData?.cycleHistory}
          userId={userProfile?.id}
          onSelectToys={handleSelectToys}
        />

        {/* Premium Floating Action Button */}
        <motion.div
          className="fixed bottom-20 right-4 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
          >
            <Button
              onClick={primaryAction.action}
              className={`
                w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300
                ${primaryAction.urgent 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/40' 
                  : 'bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-indigo-500/40'
                } hover:shadow-3xl hover:-translate-y-1
              `}
            >
              <primaryAction.icon className="w-7 h-7 text-white drop-shadow-lg" />
            </Button>
            
            {/* Animated Glow Ring */}
            {primaryAction.urgent && (
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl opacity-30 blur-md"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
        </motion.div>

        {/* Premium Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-auto bg-gradient-to-r from-white/90 to-indigo-50/80 backdrop-blur-lg border border-white/30 rounded-2xl shadow-lg p-1">
              {[
                { value: 'overview', icon: Home, label: 'Overview' },
                { value: 'history', icon: History, label: 'History' },
                { value: 'profile', icon: User, label: 'Profile' }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value} 
                  className="flex flex-col items-center gap-1 py-3 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500 data-[state=active]:to-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/30 transition-all duration-300"
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Contents with Premium Styling */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="bg-gradient-to-br from-white/90 to-indigo-50/70 backdrop-blur-lg border border-white/30 shadow-xl shadow-indigo-500/15 rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mb-4">
                    Subscription Overview
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Plan', value: plan, icon: Crown },
                      { label: 'Status', value: isActive ? 'Active' : 'Inactive', icon: CheckCircle },
                      { label: 'Current Cycle', value: `#${currentOrder?.cycle_number || 1}`, icon: Package },
                      { label: 'Member Since', value: `${monthsActive} months`, icon: Calendar }
                    ].map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                            <item.icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-600 font-medium">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">{item.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card className="bg-gradient-to-br from-white/90 to-violet-50/70 backdrop-blur-lg border border-white/30 shadow-xl shadow-violet-500/15 rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-4">
                    Recent Orders
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{totalOrders} total cycles</p>
                  
                  {orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order: any, index: number) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <MobileOrderItem 
                            order={order} 
                            onClick={() => console.log('Order clicked:', order.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <MobileEmptyState
                      icon={History}
                      title="No order history found"
                      description="Your completed orders will appear here"
                      action={{
                        label: "Browse Toys",
                        onClick: handleBrowseToys
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <Card className="bg-gradient-to-br from-white/90 to-fuchsia-50/70 backdrop-blur-lg border border-white/30 shadow-xl shadow-fuchsia-500/15 rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent mb-4">
                    Profile Information
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    {[
                      { 
                        icon: User, 
                        label: 'Name', 
                        value: `${shippingInfo?.name || userProfile?.first_name} ${shippingInfo?.last_name || userProfile?.last_name}`,
                        gradient: 'from-indigo-500 to-violet-500'
                      },
                      { 
                        icon: Phone, 
                        label: 'Phone', 
                        value: shippingInfo?.phone || userProfile?.phone,
                        gradient: 'from-emerald-500 to-teal-500'
                      },
                      { 
                        icon: Crown, 
                        label: 'Plan', 
                        value: plan,
                        gradient: 'from-fuchsia-500 to-pink-500'
                      }
                    ].map((item, index) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl"
                      >
                        <div className={`w-8 h-8 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center shadow-md`}>
                          <item.icon className="w-4 h-4 text-white drop-shadow-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 font-medium">{item.label}</p>
                          <p className="text-sm font-semibold text-gray-800">{item.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/60 backdrop-blur-sm border-white/40 hover:bg-white/80 rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </motion.div>
                    
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        variant="outline" 
                        className="w-full bg-white/60 backdrop-blur-sm border-white/40 hover:bg-white/80 rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => navigate('/')}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Back to Site
                      </Button>
                    </motion.div>
                    
                    {isAdmin && (
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 rounded-xl py-3 font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40"
                          onClick={() => navigate('/admin')}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Access Admin Panel
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Premium Quick Actions - Floating Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { icon: Gift, label: 'Browse Toys', action: handleBrowseToys, gradient: 'from-indigo-500 to-violet-500' },
            { icon: Truck, label: 'Track Order', action: handleTrackOrder, gradient: 'from-emerald-500 to-teal-500' },
            { icon: Heart, label: 'Wishlist', action: handleWishlist, gradient: 'from-fuchsia-500 to-pink-500' },
            { icon: Phone, label: 'Support', action: handleSupport, gradient: 'from-orange-500 to-amber-500' }
          ].map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={action.action}
                variant="outline"
                className="w-full h-20 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-lg border border-white/40 hover:bg-white/90 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col gap-2 group"
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon className="w-4 h-4 text-white drop-shadow-sm" />
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default PremiumMobileDashboard;
