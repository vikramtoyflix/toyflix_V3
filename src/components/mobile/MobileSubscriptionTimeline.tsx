import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  Gift,
  Package,
  Star,
  CheckCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Zap,
  Download,
  Sparkles
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface MobileTimelineProps {
  currentCycle?: any;
  upcomingCycles?: any[];
  cycleHistory?: any[];
  userId?: string;
  onSelectToys?: () => void;
}


const MobileSubscriptionTimeline: React.FC<MobileTimelineProps> = ({
  currentCycle,
  upcomingCycles = [],
  cycleHistory = [],
  userId,
  onSelectToys
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllCycles, setShowAllCycles] = useState(false);

  // Generate timeline data from props or use mock data
  const timelineData = (() => {
    if (currentCycle) {
      // Use real data when available
      return {
        currentCycle: {
          number: currentCycle.current_cycle_number || 3,
          day: currentCycle.current_day_in_cycle || 6,
          progress: currentCycle.cycle_progress_percentage || 20,
          status: 'current',
          startDate: currentCycle.current_cycle_start ? format(new Date(currentCycle.current_cycle_start), 'MMM dd') : 'Sep 02',
          endDate: currentCycle.current_cycle_end ? format(new Date(currentCycle.current_cycle_end), 'MMM dd') : 'Oct 01',
          selectionStatus: currentCycle.selection_window_status === 'open' ? 'Selection window is open' : 
                           currentCycle.days_to_selection_window > 0 ? 
                           `Selection opens in ${currentCycle.days_to_selection_window} days` : 'Selection closed'
        },
        cycles: [
          // Current cycle
          {
            number: currentCycle.current_cycle_number || 3,
            status: 'current',
            startDate: currentCycle.current_cycle_start ? format(new Date(currentCycle.current_cycle_start), 'MMM dd') : 'Sep 02',
            endDate: currentCycle.current_cycle_end ? format(new Date(currentCycle.current_cycle_end), 'MMM dd') : 'Oct 01',
            progress: currentCycle.cycle_progress_percentage || 20,
            selectionOpen: currentCycle.selection_window_status === 'open',
            selectionDate: currentCycle.current_cycle_start ? format(addDays(new Date(currentCycle.current_cycle_start), 23), 'MMM dd') : 'Sep 25',
            deliveryDate: currentCycle.current_cycle_end ? format(addDays(new Date(currentCycle.current_cycle_end), 1), 'MMM dd') : 'Oct 02'
          },
          // Add upcoming cycles if available
          ...(upcomingCycles || []).slice(0, 3).map((cycle: any, index: number) => ({
            number: cycle.current_cycle_number || ((currentCycle.current_cycle_number || 3) + index + 1),
            status: 'upcoming',
            startDate: cycle.current_cycle_start ? format(new Date(cycle.current_cycle_start), 'MMM dd') : 'TBD',
            endDate: cycle.current_cycle_end ? format(new Date(cycle.current_cycle_end), 'MMM dd') : 'TBD',
            selectionDate: cycle.current_cycle_start ? format(addDays(new Date(cycle.current_cycle_start), 23), 'MMM dd') : 'TBD',
            deliveryDate: cycle.current_cycle_end ? format(addDays(new Date(cycle.current_cycle_end), 1), 'MMM dd') : 'TBD'
          }))
        ]
      };
    }
    
    // Fallback to mock data structure
    return {
      currentCycle: {
        number: 3,
        day: 6,
        progress: 20,
        status: 'current',
        startDate: 'Sep 02',
        endDate: 'Oct 01',
        selectionStatus: 'Selection opens in 18 days'
      },
      cycles: [
        {
          number: 3,
          status: 'current',
          startDate: 'Sep 02',
          endDate: 'Oct 01',
          progress: 20,
          selectionDate: 'Sep 25',
          deliveryDate: 'Oct 02'
        }
      ]
    };
  })();

  // Premium styling functions
  const getCycleStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25';
      case 'current':
        return 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-indigo-500/30';
      case 'upcoming':
        return 'bg-gradient-to-r from-zinc-400 to-zinc-500 text-white shadow-zinc-400/20';
      default:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700';
    }
  };

  const getCycleCardStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 border-emerald-200/50 backdrop-blur-sm shadow-xl shadow-emerald-500/10';
      case 'current':
        return 'bg-gradient-to-br from-indigo-50/80 via-violet-50/70 to-fuchsia-50/60 border-indigo-200/50 backdrop-blur-sm shadow-xl shadow-indigo-500/20';
      case 'upcoming':
        return 'bg-gradient-to-br from-zinc-50/80 to-zinc-100/60 border-zinc-200/50 backdrop-blur-sm shadow-lg shadow-zinc-500/10';
      default:
        return 'bg-gradient-to-br from-gray-50/80 to-gray-100/60 border-gray-200/50 backdrop-blur-sm shadow-lg';
    }
  };

  const getProgressRingColor = (progress: number) => {
    if (progress >= 80) return 'stroke-emerald-500';
    if (progress >= 50) return 'stroke-violet-500';
    return 'stroke-indigo-500';
  };

  const visibleCycles = showAllCycles ? timelineData.cycles : timelineData.cycles.slice(0, 3);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="cursor-pointer"
        >
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-sm border border-white/20 shadow-xl shadow-indigo-500/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Calendar className="w-5 h-5 text-white drop-shadow-sm" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full opacity-20 blur-sm" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      Subscription Timeline
                    </h3>
                    <p className="text-xs text-gray-600">
                      Currently in Cycle {timelineData.currentCycle.number} • Day {timelineData.currentCycle.day}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-indigo-500" />
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </CollapsibleTrigger>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mt-3 bg-gradient-to-br from-white/95 to-indigo-50/80 backdrop-blur-md border border-white/30 shadow-2xl shadow-indigo-500/15 rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                {/* Hero - Current Cycle Summary */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="mb-6 p-5 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-fuchsia-500/10 rounded-2xl border border-white/20 backdrop-blur-sm relative overflow-hidden"
                >
                  {/* Background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-fuchsia-500/5 opacity-50" />
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  
                  <div className="relative flex items-center gap-4">
                    {/* Left - Cycle Badge + Progress Ring */}
                    <div className="relative">
                      <div className="relative w-16 h-16">
                        {/* Progress Ring */}
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            className="text-white/20"
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            className={getProgressRingColor(timelineData.currentCycle.progress)}
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                            animate={{ 
                              strokeDashoffset: 2 * Math.PI * 28 * (1 - timelineData.currentCycle.progress / 100)
                            }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                            strokeLinecap="round"
                          />
                        </svg>
                        
                        {/* Center Badge */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40">
                            <span className="text-xs font-bold text-white">{timelineData.currentCycle.number}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center - Cycle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
                          Cycle {timelineData.currentCycle.number}
                        </h4>
                        <Badge className="bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-700 border-indigo-200/50 text-xs">
                          Day {timelineData.currentCycle.day}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-indigo-600 font-medium mb-2">
                        {timelineData.currentCycle.selectionStatus}
                      </p>
                      
                      {/* Stats Chips */}
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded-full border border-white/30">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          <span className="text-xs text-indigo-600 font-medium">
                            {currentCycle?.total_days_subscribed_actual || 65}d service
                          </span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/50 rounded-full border border-white/30">
                          <Package className="w-3 h-3 text-violet-500" />
                          <span className="text-xs text-violet-600 font-medium">
                            {currentCycle?.rental_orders_count || 1} deliveries
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right - Action CTA */}
                    {currentCycle?.selection_window_status === 'open' && onSelectToys && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                      >
                        <Button
                          onClick={onSelectToys}
                          className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 rounded-xl px-4 py-2 font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                        >
                          <div className="relative flex items-center gap-2">
                            <Gift className="w-4 h-4 drop-shadow-sm" />
                            <span>Select Toys</span>
                          </div>
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] animate-pulse" />
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Timeline Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                      Timeline
                    </h3>
                    <p className="text-sm text-gray-600">Your journey with ToyFlix since Jul 2025</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="h-8 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-md"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Timeline
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Milestones
                    </Button>
                  </div>
                </div>

                {/* Vertical Timeline with Animated Connectors */}
                <div className="relative">
                  {/* Central Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-violet-200 to-fuchsia-200" />
                  
                  <div className="space-y-6">
                    {visibleCycles.map((cycle, index) => (
                      <motion.div 
                        key={cycle.number}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="relative pl-16"
                      >
                        {/* Timeline Node */}
                        <div className="absolute left-4 top-4 w-4 h-4 rounded-full border-2 border-white shadow-lg z-10">
                          <div className={`w-full h-full rounded-full ${
                            cycle.status === 'completed' ? 'bg-emerald-500' :
                            cycle.status === 'current' ? 'bg-gradient-to-r from-indigo-500 to-violet-500' :
                            'bg-zinc-300'
                          }`} />
                          {cycle.status === 'current' && (
                            <motion.div
                              className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 opacity-30"
                              animate={{ 
                                scale: [1, 1.05, 1], 
                                opacity: [0.7, 1, 0.7]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>

                        {/* Cycle Card */}
                        <motion.div
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className="cursor-pointer"
                        >
                          <Card className={`${getCycleCardStyle(cycle.status)} border-2 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl`}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <Badge className={`${getCycleStatusColor(cycle.status)} rounded-full shadow-lg px-3 py-1`}>
                                  {cycle.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1 drop-shadow-sm" />}
                                  {cycle.status === 'current' && <Play className="w-3 h-3 mr-1 drop-shadow-sm" />}
                                  <span className="font-semibold">Cycle {cycle.number}</span>
                                </Badge>
                                
                                {cycle.status === 'current' && (
                                  <motion.div 
                                    animate={{ 
                                      scale: [1, 1.05, 1], 
                                      opacity: [0.7, 1, 0.7]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    <Zap className="w-5 h-5 text-indigo-500 drop-shadow-md" />
                                  </motion.div>
                                )}
                              </div>

                              <div className="space-y-3">
                                {/* Date Range */}
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-indigo-500 drop-shadow-sm" />
                                  <span className="text-sm font-semibold text-gray-800">
                                    {cycle.startDate} - {cycle.endDate}
                                  </span>
                                </div>
                                
                                {/* Current Cycle Progress */}
                                {cycle.status === 'current' && (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span className="text-indigo-600">Day {timelineData.currentCycle.day}</span>
                                      <span className="text-violet-600">{timelineData.currentCycle.progress}%</span>
                                    </div>
                                    {/* Custom Gradient Progress Bar */}
                                    <div className="relative h-2 bg-white/50 rounded-full overflow-hidden border border-white/30">
                                      <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 rounded-full shadow-inner"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${timelineData.currentCycle.progress}%` }}
                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 rounded-full" />
                                    </div>
                                  </div>
                                )}

                                {/* Selection & Delivery Info */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2 px-3 py-2 bg-white/40 rounded-xl border border-white/30">
                                    <Gift className="w-3 h-3 text-fuchsia-500 drop-shadow-sm" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {cycle.selectionDate || 'TBD'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-2 bg-white/40 rounded-xl border border-white/30">
                                    <Package className="w-3 h-3 text-orange-500 drop-shadow-sm" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {cycle.deliveryDate || 'TBD'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Animated Connector Dots */}
                        {index < visibleCycles.length - 1 && (
                          <div className="absolute left-5 -bottom-3 w-2 h-6 flex flex-col justify-center items-center">
                            {[...Array(3)].map((_, dotIndex) => (
                              <motion.div
                                key={dotIndex}
                                className="w-1 h-1 bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                                animate={{
                                  opacity: [0.3, 1, 0.3],
                                  scale: [1, 1.2, 1]
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: dotIndex * 0.2,
                                  ease: "easeInOut"
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Show More/Less Button */}
                {timelineData.cycles.length > 3 && (
                  <motion.div 
                    className="mt-6 text-center"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllCycles(!showAllCycles)}
                      className="bg-white/60 backdrop-blur-sm border-indigo-200/50 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl px-4 py-2 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {showAllCycles ? 'Show Less' : `Show All ${timelineData.cycles.length} Cycles`}
                    </Button>
                  </motion.div>
                )}

                {/* Export Button */}
                <motion.div 
                  className="mt-6 pt-4 border-t border-white/20"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full bg-white/30 backdrop-blur-sm border border-white/30 hover:bg-white/50 rounded-xl py-3 font-medium text-gray-700 hover:text-indigo-600 transition-all duration-300 group"
                  >
                    <Download className="w-4 h-4 mr-2 group-hover:text-indigo-500 transition-colors" />
                    Export Timeline
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </Collapsible>
  );
};

export default MobileSubscriptionTimeline;
