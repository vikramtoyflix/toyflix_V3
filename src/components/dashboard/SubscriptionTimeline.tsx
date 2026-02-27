import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscriptionSelection } from '@/hooks/useSubscriptionSelection';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedSubscriptionStatus } from '@/hooks/useUnifiedSubscriptionStatus';
import { 
  Calendar,
  Clock,
  Gift,
  Package,
  ChevronLeft,
  ChevronRight,
  Download,
  Star,
  TrendingUp,
  Award,
  Zap,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  MapPin,
  Eye,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  Database
} from 'lucide-react';
import { format, addDays, differenceInDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { SubscriptionService } from '@/services/subscriptionService';

// Updated interfaces to include rental-based data
interface TimelineEvent {
  id: string;
  type: 'subscription_start' | 'cycle_start' | 'selection_window' | 'delivery' | 'plan_upgrade' | 'anniversary' | 'milestone';
  date: Date;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    cycleNumber?: number;
    planId?: string;
    deliveryInfo?: any;
    selectionWindow?: any;
    orderNumber?: string;
  };
}

interface CycleData {
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  selectionWindowStart: Date;
  selectionWindowEnd: Date;
  deliveryDate?: Date;
  status: 'completed' | 'current' | 'upcoming';
  planId: string;
  toys?: any[];
  orderNumber?: string;
}

// New interface for rental-based subscription data
interface RentalSubscriptionData {
  subscription_id: string;
  user_id: string;
  plan_id: string;
  current_cycle_number: number;
  actual_subscription_start_date: Date;
  user_actual_start_date: Date;
  total_days_subscribed_actual: number;
  rental_orders_count: number;
  cycle_progress_percentage: number;
  current_day_in_cycle: number;
  days_remaining_in_cycle: number;
  selection_window_status: 'open' | 'upcoming' | 'closed';
  days_to_selection_window: number;
  original_subscription_date: Date;
}

// New interface for upcoming cycles with plan duration limits
interface UpcomingCycle {
  subscription_id: string;
  plan_id: string;
  plan_duration_months: number;
  future_cycle_number: number;
  future_cycle_start: Date;
  future_cycle_end: Date;
  future_selection_start: Date;
  future_selection_end: Date;
  estimated_delivery_date: Date;
  actual_subscription_start_date: Date;
}

interface SubscriptionTimelineProps {
  userId: string;
  showCompact?: boolean;
  maxVisibleCycles?: number;
  onCycleClick?: (cycle: CycleData) => void;
  onExportHistory?: () => void;
  onSelectToys?: () => void; // ✅ ADD THIS
}

export const SubscriptionTimeline: React.FC<SubscriptionTimelineProps> = ({
  userId,
  showCompact = false,
  maxVisibleCycles = 6,
  onCycleClick,
  onExportHistory,
  onSelectToys  // ✅ ADD THIS
}) => {
  const isMobile = useIsMobile();
  const { user } = useCustomAuth();
  const { data: unifiedStatus } = useUnifiedSubscriptionStatus();
  const [selectedCycle, setSelectedCycle] = useState<CycleData | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'milestones'>('timeline');
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Fetch rental-based subscription data from SubscriptionService instead of missing RPC
  const { data: rentalSubscriptionData, isLoading: isRentalDataLoading } = useQuery({
    queryKey: ['rental-subscription-data', userId],
    queryFn: async () => {
      try {
        // Use existing SubscriptionService methods instead of missing RPC
        const currentCycle = await SubscriptionService.getCurrentSubscriptionCycle(userId);
        
        if (!currentCycle) {
          console.log('No current cycle found, trying fallback...');
          // Fallback to direct subscription query
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('subscriptions')
            .select(`
              id,
              user_id,
              plan_id,
              status,
              start_date,
              created_at
            `)
            .eq('user_id', userId)
            .in('status', ['active', 'paused'])
            .single();

          if (fallbackError || !fallbackData) {
            console.log('No subscription data found');
            return null;
          }

          // Calculate basic cycle data as fallback
          const subscriptionStart = new Date(fallbackData.start_date || fallbackData.created_at);
          const today = new Date();
          const totalDaysSubscribed = Math.max(0, Math.floor((today.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24)));
          const currentCycleNumber = Math.floor(totalDaysSubscribed / 30) + 1;
          const currentDayInCycle = (totalDaysSubscribed % 30) + 1;
          const progressPercentage = Math.min(100, (currentDayInCycle / 30) * 100);

          return {
            subscription_id: fallbackData.id,
            user_id: fallbackData.user_id,
            plan_id: fallbackData.plan_id,
            current_cycle_number: currentCycleNumber,
            actual_subscription_start_date: subscriptionStart,
            user_actual_start_date: subscriptionStart,
            total_days_subscribed_actual: totalDaysSubscribed,
            rental_orders_count: 0,
            cycle_progress_percentage: progressPercentage,
            current_day_in_cycle: currentDayInCycle,
            days_remaining_in_cycle: Math.max(0, 30 - currentDayInCycle),
            selection_window_status: 'closed' as const,
            days_to_selection_window: 0,
            original_subscription_date: subscriptionStart
          } as RentalSubscriptionData;
        }

        // Convert SubscriptionService data to expected format
        return {
          subscription_id: currentCycle.subscription_id,
          user_id: currentCycle.user_id,
          plan_id: currentCycle.plan_id,
          current_cycle_number: currentCycle.current_cycle_number,
          actual_subscription_start_date: new Date(currentCycle.actual_subscription_start_date),
          user_actual_start_date: new Date(currentCycle.user_actual_start_date),
          total_days_subscribed_actual: currentCycle.total_days_subscribed_actual,
          rental_orders_count: currentCycle.rental_orders_count,
          cycle_progress_percentage: currentCycle.cycle_progress_percentage,
          current_day_in_cycle: currentCycle.current_day_in_cycle || 1, // Fallback to 1 if not available
          days_remaining_in_cycle: currentCycle.days_remaining_in_cycle,
          selection_window_status: currentCycle.selection_window_status === 'open' ? 'open' : 'closed',
          days_to_selection_window: currentCycle.days_to_selection_window || 0, // Fallback to 0 if not available
          original_subscription_date: new Date(currentCycle.original_subscription_date)
        } as RentalSubscriptionData;
      } catch (error) {
        console.error('Error fetching rental subscription data:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch upcoming cycles using SubscriptionService instead of missing RPC
  const { data: upcomingCycles, isLoading: isUpcomingCyclesLoading } = useQuery({
    queryKey: ['upcoming-cycles', userId],
    queryFn: async () => {
      try {
        // Use existing SubscriptionService method instead of missing RPC
        const upcomingCyclesData = await SubscriptionService.getUpcomingCycles(userId);
        
        if (!upcomingCyclesData || upcomingCyclesData.length === 0) {
          console.log('No upcoming cycles found');
          return [];
        }

        return upcomingCyclesData.map((cycle: any) => ({
          subscription_id: cycle.subscription_id,
          plan_id: cycle.plan_id,
          plan_duration_months: 6, // Default duration
          future_cycle_number: cycle.current_cycle_number,
          future_cycle_start: new Date(cycle.current_cycle_start),
          future_cycle_end: new Date(cycle.current_cycle_end),
          future_selection_start: new Date(cycle.current_cycle_start),
          future_selection_end: new Date(cycle.current_cycle_end),
          estimated_delivery_date: new Date(cycle.current_cycle_end),
          actual_subscription_start_date: new Date(cycle.actual_subscription_start_date)
        })) as UpcomingCycle[];
      } catch (error) {
        console.error('Error fetching upcoming cycles:', error);
        return [];
      }
    },
    enabled: !!userId && !!rentalSubscriptionData,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Keep the original hook for compatibility with selection window logic
  const {
    selectionWindow,
    selectionRules,
    isLoading: isSelectionLoading
  } = useSubscriptionSelection({
    enableRealTimeUpdates: true
  });

  // Generate timeline events and cycles using rental-based data
  const { timelineEvents, cycles, milestones } = useMemo(() => {
    if (!rentalSubscriptionData) {
      return { timelineEvents: [], cycles: [], milestones: [] };
    }

    const events: TimelineEvent[] = [];
    const cyclesList: CycleData[] = [];
    const milestonesList: TimelineEvent[] = [];

    // Use actual cycles from database instead of generating infinite cycles
    const currentCycleNumber = rentalSubscriptionData.current_cycle_number;
    const maxCycles = upcomingCycles && upcomingCycles.length > 0 
      ? upcomingCycles[0].plan_duration_months 
      : 6; // Default to 6 if duration not available

    // Generate past and current cycles
    for (let i = 1; i <= currentCycleNumber; i++) {
      const cycleStartDate = addDays(rentalSubscriptionData.actual_subscription_start_date, (i - 1) * 30);
      const cycleEndDate = addDays(cycleStartDate, 29);
      const selectionStart = addDays(cycleStartDate, 23); // Day 24
      const selectionEnd = addDays(cycleStartDate, 29); // Day 30
      const deliveryDate = addDays(cycleEndDate, 1);

      const isCurrent = i === currentCycleNumber;
      const isCompleted = i < currentCycleNumber;

      const cycle: CycleData = {
        cycleNumber: i,
        startDate: cycleStartDate,
        endDate: cycleEndDate,
        selectionWindowStart: selectionStart,
        selectionWindowEnd: selectionEnd,
        deliveryDate: deliveryDate,
        status: isCompleted ? 'completed' : 'current',
        planId: rentalSubscriptionData.plan_id,
        orderNumber: isCurrent ? `ORDER-${currentCycleNumber}` : undefined
      };

      cyclesList.push(cycle);

      // Add cycle start event
      events.push({
        id: `cycle-start-${i}`,
        type: 'cycle_start',
        date: cycleStartDate,
        title: `Cycle ${i} Started`,
        description: `30-day cycle begins`,
        status: isCompleted ? 'completed' : 'current',
        priority: isCurrent ? 'high' : 'medium',
        metadata: { cycleNumber: i, planId: rentalSubscriptionData.plan_id }
      });

      // Add selection window event
      events.push({
        id: `selection-${i}`,
        type: 'selection_window',
        date: selectionStart,
        title: `Selection Window Opens`,
        description: `Choose toys for cycle ${i + 1}`,
        status: isCompleted ? 'completed' : 'current',
        priority: isCurrent ? 'critical' : 'medium',
        metadata: { 
          cycleNumber: i,
          selectionWindow: {
            start: selectionStart,
            end: selectionEnd
          }
        }
      });

      // Add delivery event
      events.push({
        id: `delivery-${i}`,
        type: 'delivery',
        date: deliveryDate,
        title: `Cycle ${i} Delivery`,
        description: `Toys delivered for cycle ${i}`,
        status: isCompleted ? 'completed' : 'current',
        priority: 'medium',
        metadata: { cycleNumber: i, orderNumber: cycle.orderNumber }
      });
    }

    // Add future cycles from database (limited by plan duration)
    upcomingCycles?.forEach(upcomingCycle => {
      if (upcomingCycle.future_cycle_number <= maxCycles) {
        const cycle: CycleData = {
          cycleNumber: upcomingCycle.future_cycle_number,
          startDate: upcomingCycle.future_cycle_start,
          endDate: upcomingCycle.future_cycle_end,
          selectionWindowStart: upcomingCycle.future_selection_start,
          selectionWindowEnd: upcomingCycle.future_selection_end,
          deliveryDate: upcomingCycle.estimated_delivery_date,
          status: 'upcoming',
          planId: upcomingCycle.plan_id
        };

        cyclesList.push(cycle);

        // Add future events
        events.push({
          id: `cycle-start-${upcomingCycle.future_cycle_number}`,
          type: 'cycle_start',
          date: upcomingCycle.future_cycle_start,
          title: `Cycle ${upcomingCycle.future_cycle_number} Planned`,
          description: `Future cycle begins`,
          status: 'upcoming',
          priority: 'medium',
          metadata: { cycleNumber: upcomingCycle.future_cycle_number, planId: upcomingCycle.plan_id }
        });
      }
    });

    // Add subscription milestone using actual rental start date
    milestonesList.push({
      id: 'subscription-start',
      type: 'subscription_start',
      date: rentalSubscriptionData.actual_subscription_start_date,
      title: 'First Toy Delivery',
      description: `Service started with ${rentalSubscriptionData.plan_id} plan`,
      status: 'completed',
      priority: 'high',
      metadata: { planId: rentalSubscriptionData.plan_id }
    });

    // Add rental-based anniversaries
    for (let month = 1; month <= 12; month++) {
      const anniversaryDate = addDays(rentalSubscriptionData.actual_subscription_start_date, month * 30);
      if (anniversaryDate <= new Date()) {
        milestonesList.push({
          id: `anniversary-${month}`,
          type: 'anniversary',
          date: anniversaryDate,
          title: `${month} Month Service Anniversary`,
          description: `Celebrating ${month} months of toy deliveries!`,
          status: 'completed',
          priority: month % 6 === 0 ? 'high' : 'medium',
          metadata: { }
        });
      }
    }

    return {
      timelineEvents: events.sort((a, b) => a.date.getTime() - b.date.getTime()),
      cycles: cyclesList,
      milestones: milestonesList.sort((a, b) => a.date.getTime() - b.date.getTime())
    };
  }, [rentalSubscriptionData, upcomingCycles]);

  // Handle swipe navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      setTouchEnd(null);
      // Safety check: ensure targetTouches array exists and has elements
      if (e.targetTouches && e.targetTouches.length > 0) {
        setTouchStart(e.targetTouches[0].clientX);
      }
    } catch (error) {
      console.warn('Touch start error:', error);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    try {
      // Safety check: ensure targetTouches array exists and has elements
      if (e.targetTouches && e.targetTouches.length > 0) {
        setTouchEnd(e.targetTouches[0].clientX);
      }
    } catch (error) {
      console.warn('Touch move error:', error);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentViewIndex < Math.max(0, cycles.length - maxVisibleCycles)) {
      setCurrentViewIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentViewIndex > 0) {
      setCurrentViewIndex(prev => prev - 1);
    }
  };

  // Get visible cycles for current view
  const visibleCycles = cycles.slice(currentViewIndex, currentViewIndex + maxVisibleCycles);

  // Export subscription history with rental data
  const handleExportHistory = () => {
    const exportData = {
      subscription: {
        actual_start_date: rentalSubscriptionData?.actual_subscription_start_date,
        original_registration_date: rentalSubscriptionData?.original_subscription_date,
        planId: rentalSubscriptionData?.plan_id,
        currentCycle: rentalSubscriptionData?.current_cycle_number,
        total_days_subscribed_actual: rentalSubscriptionData?.total_days_subscribed_actual,
        rental_orders_count: rentalSubscriptionData?.rental_orders_count,
        plan_duration_months: upcomingCycles?.[0]?.plan_duration_months
      },
      cycles: cycles.map(cycle => ({
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
        planId: cycle.planId
      })),
      milestones: milestones.map(milestone => ({
        type: milestone.type,
        date: milestone.date,
        title: milestone.title,
        description: milestone.description
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toyflix-rental-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onExportHistory) {
      onExportHistory();
    }
  };

  const isLoading = isRentalDataLoading || isUpcomingCyclesLoading || isSelectionLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rentalSubscriptionData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Subscription Data</h3>
          <p className="text-gray-600">Unable to load subscription timeline</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status Summary using rental data */}
      {rentalSubscriptionData && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">
                Currently in Cycle {rentalSubscriptionData.current_cycle_number}
              </h4>
              <p className="text-sm text-blue-700">
                Day {rentalSubscriptionData.current_day_in_cycle} • 
                {rentalSubscriptionData.selection_window_status === 'open' ? 
                  ' Selection window is open' : 
                  ` Selection ${rentalSubscriptionData.days_to_selection_window > 0 ? `opens in ${rentalSubscriptionData.days_to_selection_window} days` : 'closed'}`
                }
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {rentalSubscriptionData.total_days_subscribed_actual} days of actual service • {rentalSubscriptionData.rental_orders_count} deliveries completed
                {unifiedStatus && (
                  <span className="ml-2 text-xs text-gray-500">
                    (Status: {unifiedStatus.source}, {unifiedStatus.confidence} confidence)
                  </span>
                )}
              </p>
            </div>
            {rentalSubscriptionData.selection_window_status === 'open' && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {
                  if (onSelectToys) {
                    onSelectToys();
                  }
                }}
              >
                <Gift className="w-3 h-3 mr-1" />
                Select Toys
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>
            Subscription Timeline
          </h3>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>
            Your journey with ToyFlix since {format(rentalSubscriptionData.actual_subscription_start_date, 'MMM yyyy')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              onClick={() => setViewMode('timeline')}
              className="h-8"
            >
              <Clock className="w-4 h-4 mr-1" />
              {!isMobile && 'Timeline'}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'milestones' ? 'default' : 'ghost'}
              onClick={() => setViewMode('milestones')}
              className="h-8"
            >
              <Star className="w-4 h-4 mr-1" />
              {!isMobile && 'Milestones'}
            </Button>
          </div>

          {/* Export Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportHistory}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {!isMobile && 'Export'}
          </Button>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Card>
          <CardContent className="p-6">
            {/* Navigation Controls for Desktop */}
            {!isMobile && cycles.length > maxVisibleCycles && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentViewIndex(Math.max(0, currentViewIndex - 1))}
                  disabled={currentViewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Cycles {currentViewIndex + 1}-{Math.min(currentViewIndex + maxVisibleCycles, cycles.length)}
                </span>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentViewIndex(Math.min(cycles.length - maxVisibleCycles, currentViewIndex + 1))}
                  disabled={currentViewIndex >= cycles.length - maxVisibleCycles}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Timeline Container */}
            <div 
              className={`relative ${isMobile ? 'overflow-x-auto' : ''}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`flex ${isMobile ? 'gap-4' : 'gap-6'} ${isMobile ? 'pb-4' : ''}`}>
                {visibleCycles.map((cycle, index) => (
                  <TooltipProvider key={cycle.cycleNumber}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`${isMobile ? 'min-w-[200px]' : 'flex-1'} cursor-pointer group`}
                          onClick={() => {
                            setSelectedCycle(cycle);
                            setShowDetailsModal(true);
                            if (onCycleClick) onCycleClick(cycle);
                          }}
                        >
                          {/* Cycle Card */}
                          <div className={`relative border-2 rounded-lg p-4 transition-all ${
                            cycle.status === 'current' ? 
                              'border-blue-500 bg-blue-50 shadow-md' :
                            cycle.status === 'completed' ?
                              'border-green-200 bg-green-50 hover:border-green-400' :
                              'border-gray-200 bg-gray-50 hover:border-gray-400'
                          }`}>
                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-3">
                              <Badge 
                                variant={cycle.status === 'current' ? 'default' : 'secondary'}
                                className={`${
                                  cycle.status === 'current' ? 'bg-blue-500' :
                                  cycle.status === 'completed' ? 'bg-green-500' :
                                  'bg-gray-400'
                                }`}
                              >
                                {cycle.status === 'current' && <Play className="w-3 h-3 mr-1" />}
                                {cycle.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                                Cycle {cycle.cycleNumber}
                              </Badge>
                              
                              {cycle.status === 'current' && (
                                <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
                              )}
                            </div>

                            {/* Cycle Info */}
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {format(cycle.startDate, 'MMM dd')} - {format(cycle.endDate, 'MMM dd')}
                              </div>
                              
                              {/* Progress Bar for Current Cycle using rental data */}
                              {cycle.status === 'current' && rentalSubscriptionData && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Day {rentalSubscriptionData.current_day_in_cycle}</span>
                                    <span>{Math.round(rentalSubscriptionData.cycle_progress_percentage)}%</span>
                                  </div>
                                  <Progress value={rentalSubscriptionData.cycle_progress_percentage} className="h-2" />
                                </div>
                              )}

                              {/* Selection Window Indicator */}
                              <div className="flex items-center gap-2 text-xs">
                                <Gift className="w-3 h-3 text-purple-500" />
                                <span>
                                  Selection: {format(cycle.selectionWindowStart, 'MMM dd')}
                                </span>
                                {cycle.status === 'current' && rentalSubscriptionData.selection_window_status === 'open' && (
                                  <Badge className="text-xs bg-green-500">Open</Badge>
                                )}
                              </div>

                              {/* Delivery Info */}
                              {cycle.deliveryDate && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Package className="w-3 h-3 text-orange-500" />
                                  <span>
                                    Delivery: {format(cycle.deliveryDate, 'MMM dd')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Connection Line */}
                            {index < visibleCycles.length - 1 && !isMobile && (
                              <div className="absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-300 transform -translate-y-1/2 z-10">
                                <ArrowRight className="w-4 h-4 text-gray-400 absolute right-0 top-1/2 transform -translate-y-1/2" />
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">Cycle {cycle.cycleNumber}</p>
                          <p className="text-sm">
                            {format(cycle.startDate, 'MMM dd, yyyy')} - {format(cycle.endDate, 'MMM dd, yyyy')}
                          </p>
                          <p className="text-sm">
                            Selection: {format(cycle.selectionWindowStart, 'MMM dd')} - {format(cycle.selectionWindowEnd, 'MMM dd')}
                          </p>
                          {cycle.status === 'current' && (
                            <p className="text-sm text-blue-600">Active cycle</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones View */}
      {viewMode === 'milestones' && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div 
                  key={milestone.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.type === 'subscription_start' ? 'bg-blue-500' :
                    milestone.type === 'anniversary' ? 'bg-purple-500' :
                    milestone.type === 'plan_upgrade' ? 'bg-green-500' :
                    'bg-gray-400'
                  }`}>
                    {milestone.type === 'subscription_start' && <Star className="w-5 h-5 text-white" />}
                    {milestone.type === 'anniversary' && <Award className="w-5 h-5 text-white" />}
                    {milestone.type === 'plan_upgrade' && <TrendingUp className="w-5 h-5 text-white" />}
                    {milestone.type === 'milestone' && <CheckCircle className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{milestone.title}</h4>
                      <span className="text-sm text-gray-500">
                        {format(milestone.date, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    {milestone.metadata?.planId && (
                      <Badge variant="outline" className="mt-2">
                        {milestone.metadata.planId}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Cycle {selectedCycle?.cycleNumber} Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about this subscription cycle
            </DialogDescription>
          </DialogHeader>
          
          {selectedCycle && (
            <div className="space-y-6">
              {/* Cycle Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Cycle Period</h4>
                  <p className="text-sm text-gray-600">
                    {format(selectedCycle.startDate, 'MMM dd, yyyy')} - {format(selectedCycle.endDate, 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <Badge variant={selectedCycle.status === 'current' ? 'default' : 'secondary'}>
                    {selectedCycle.status}
                  </Badge>
                </div>
              </div>

              {/* Selection Window */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Selection Window</h4>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">
                      {format(selectedCycle.selectionWindowStart, 'MMM dd')} - {format(selectedCycle.selectionWindowEnd, 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-purple-700">
                    Choose toys for the next cycle during this period
                  </p>
                </div>
              </div>

              {/* Delivery Information */}
              {selectedCycle.deliveryDate && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Delivery</h4>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">
                        {format(selectedCycle.deliveryDate, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    {selectedCycle.orderNumber && (
                      <p className="text-xs text-orange-700">
                        Order: {selectedCycle.orderNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Current Progress (for current cycle) using rental data */}
              {selectedCycle.status === 'current' && rentalSubscriptionData && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Current Progress</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Day {rentalSubscriptionData.current_day_in_cycle} of 30</span>
                      <span>{Math.round(rentalSubscriptionData.cycle_progress_percentage)}% complete</span>
                    </div>
                    <Progress value={rentalSubscriptionData.cycle_progress_percentage} className="h-3" />
                    <div className="text-xs text-gray-500">
                      Based on actual rental start date: {format(rentalSubscriptionData.actual_subscription_start_date, 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionTimeline; 