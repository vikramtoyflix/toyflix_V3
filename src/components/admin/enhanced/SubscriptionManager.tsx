import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard,
  Calendar,
  Clock,
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gift,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  Download,
  Plus,
  Minus,
  Edit3,
  User,
  Phone,
  MapPin,
  Mail,
  FileText,
  Receipt,
  Calculator,
  Target,
  Crown,
  Shield,
  Zap,
  Star,
  Award,
  Timer,
  Users,
  Package,
  Truck,
  BarChart3,
  PieChart,
  Repeat,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Info
} from "lucide-react";
import { format, parseISO, addDays, addMonths, isAfter, isBefore, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface SubscriptionManagerProps {
  userId: string;
  subscription?: UserSubscription;
  onUpdate?: (subscription: UserSubscription) => void;
  className?: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  billing_cycle: BillingCycle;
  auto_renewal: boolean;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  next_billing_date: string;
  grace_period_end?: string;
  pause_count: number;
  extension_days: number;
  free_months_added: number;
  cancellation_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionAction {
  id: string;
  subscription_id: string;
  action_type: ActionType;
  action_data: any;
  performed_by: string;
  performed_at: string;
  notes?: string;
  amount_change?: number;
  effective_date: string;
}

interface BillingHistory {
  id: string;
  subscription_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  invoice_url?: string;
  refund_amount?: number;
  refund_reason?: string;
  billing_period_start: string;
  billing_period_end: string;
}

interface PlanChange {
  from_plan: SubscriptionPlan;
  to_plan: SubscriptionPlan;
  prorated_amount: number;
  effective_date: string;
  reason?: string;
}

// ================================================================================================
// ENUMS AND TYPES
// ================================================================================================

type SubscriptionPlan = 'trial' | 'basic' | 'standard' | 'premium' | 'enterprise';
type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired' | 'pending' | 'suspended';
type BillingCycle = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
type PaymentMethod = 'card' | 'upi' | 'net_banking' | 'wallet' | 'cash';
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
type ActionType = 'plan_change' | 'pause' | 'resume' | 'cancel' | 'extend' | 'add_free_month' | 'billing_update';

// ================================================================================================
// CONSTANTS
// ================================================================================================

const SUBSCRIPTION_PLANS = [
  { 
    value: 'trial', 
    label: 'Trial Plan', 
    price: 499, 
    duration: 30, 
    features: ['3 toys', 'Basic support', 'No commitments'],
    color: 'bg-gray-100 text-gray-800',
    icon: Timer
  },
  { 
    value: 'basic', 
    label: 'Basic Plan', 
    price: 999, 
    duration: 30, 
    features: ['5 toys', 'Standard support', 'Free replacement'],
    color: 'bg-blue-100 text-blue-800',
    icon: Package
  },
  { 
    value: 'standard', 
    label: 'Standard Plan', 
    price: 1499, 
    duration: 30, 
    features: ['8 toys', 'Priority support', 'Free delivery'],
    color: 'bg-green-100 text-green-800',
    icon: Star
  },
  { 
    value: 'premium', 
    label: 'Premium Plan', 
    price: 1999, 
    duration: 30, 
    features: ['12 toys', 'Premium support', 'All features'],
    color: 'bg-purple-100 text-purple-800',
    icon: Crown
  },
  { 
    value: 'enterprise', 
    label: 'Enterprise Plan', 
    price: 2999, 
    duration: 30, 
    features: ['Unlimited toys', 'Dedicated support', 'Custom solutions'],
    color: 'bg-yellow-100 text-yellow-800',
    icon: Award
  }
];

const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'paused', label: 'Paused', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: Clock },
  { value: 'pending', label: 'Pending', color: 'bg-blue-100 text-blue-800', icon: Timer },
  { value: 'suspended', label: 'Suspended', color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', multiplier: 1, discount: 0 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 3, discount: 0.05 },
  { value: 'semi-annual', label: 'Semi-Annual', multiplier: 6, discount: 0.10 },
  { value: 'annual', label: 'Annual', multiplier: 12, discount: 0.15 }
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Phone },
  { value: 'net_banking', label: 'Net Banking', icon: Shield },
  { value: 'wallet', label: 'Digital Wallet', icon: Zap },
  { value: 'cash', label: 'Cash on Delivery', icon: DollarSign }
];

const EXTENSION_OPTIONS = [
  { days: 30, label: '1 Month', price: 0 },
  { days: 60, label: '2 Months', price: 0 },
  { days: 90, label: '3 Months', price: 0 },
  { days: 180, label: '6 Months', price: 0 },
  { days: 365, label: '1 Year', price: 0 }
];

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  userId,
  subscription,
  onUpdate,
  className
}) => {
  // ================================================================================================
  // STATE MANAGEMENT
  // ================================================================================================

  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(subscription || null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [actionHistory, setActionHistory] = useState<SubscriptionAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [showPlanChangeDialog, setShowPlanChangeDialog] = useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  
  // Action states
  const [selectedNewPlan, setSelectedNewPlan] = useState<SubscriptionPlan>('basic');
  const [extensionDays, setExtensionDays] = useState(30);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [actionNotes, setActionNotes] = useState('');

  // ================================================================================================
  // HOOKS
  // ================================================================================================

  const { user: currentUser } = useCustomAuth();

  // ================================================================================================
  // COMPUTED VALUES
  // ================================================================================================

  const currentPlan = useMemo(() => {
    return SUBSCRIPTION_PLANS.find(plan => plan.value === currentSubscription?.plan_type) || SUBSCRIPTION_PLANS[1];
  }, [currentSubscription]);

  const currentStatus = useMemo(() => {
    return SUBSCRIPTION_STATUSES.find(status => status.value === currentSubscription?.status) || SUBSCRIPTION_STATUSES[0];
  }, [currentSubscription]);

  const currentBillingCycle = useMemo(() => {
    return BILLING_CYCLES.find(cycle => cycle.value === currentSubscription?.billing_cycle) || BILLING_CYCLES[0];
  }, [currentSubscription]);

  const subscriptionMetrics = useMemo(() => {
    if (!currentSubscription) return null;

    const currentPeriodStart = parseISO(currentSubscription.current_period_start);
    const currentPeriodEnd = parseISO(currentSubscription.current_period_end);
    const now = new Date();
    
    const daysUsed = differenceInDays(now, currentPeriodStart);
    const totalDays = differenceInDays(currentPeriodEnd, currentPeriodStart);
    const daysRemaining = Math.max(0, differenceInDays(currentPeriodEnd, now));
    
    const usagePercentage = Math.min(100, (daysUsed / totalDays) * 100);
    
    return {
      daysUsed,
      totalDays,
      daysRemaining,
      usagePercentage,
      isExpiringSoon: daysRemaining <= 7,
      isExpired: isAfter(now, currentPeriodEnd)
    };
  }, [currentSubscription]);

  const proratedAmount = useMemo(() => {
    if (!currentSubscription || !selectedNewPlan) return 0;
    
    const currentPlanData = SUBSCRIPTION_PLANS.find(p => p.value === currentSubscription.plan_type);
    const newPlanData = SUBSCRIPTION_PLANS.find(p => p.value === selectedNewPlan);
    
    if (!currentPlanData || !newPlanData || !subscriptionMetrics) return 0;
    
    const remainingDays = subscriptionMetrics.daysRemaining;
    const totalDays = subscriptionMetrics.totalDays;
    
    const currentProratedAmount = (currentPlanData.price * remainingDays) / totalDays;
    const newProratedAmount = (newPlanData.price * remainingDays) / totalDays;
    
    return Math.max(0, newProratedAmount - currentProratedAmount);
  }, [currentSubscription, selectedNewPlan, subscriptionMetrics]);

  // ================================================================================================
  // EVENT HANDLERS
  // ================================================================================================

  const handlePlanChange = useCallback(async (newPlan: SubscriptionPlan, reason?: string) => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const planChangeData: PlanChange = {
        from_plan: currentSubscription.plan_type,
        to_plan: newPlan,
        prorated_amount: proratedAmount,
        effective_date: new Date().toISOString(),
        reason: reason || actionNotes
      };

      // Update subscription
      const updatedSubscription = {
        ...currentSubscription,
        plan_type: newPlan,
        base_amount: SUBSCRIPTION_PLANS.find(p => p.value === newPlan)?.price || 0,
        total_amount: (SUBSCRIPTION_PLANS.find(p => p.value === newPlan)?.price || 0) - currentSubscription.discount_amount,
        updated_at: new Date().toISOString()
      };

      // Record action
      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'plan_change',
        action_data: planChangeData,
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        amount_change: proratedAmount,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setShowPlanChangeDialog(false);
      setActionNotes('');
      
      toast.success(`Plan changed from ${currentPlan.label} to ${SUBSCRIPTION_PLANS.find(p => p.value === newPlan)?.label}`);
    } catch (error) {
      console.error('Plan change error:', error);
      toast.error('Failed to change plan');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, currentPlan, proratedAmount, actionNotes, currentUser, onUpdate]);

  const handleSubscriptionPause = useCallback(async () => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const updatedSubscription = {
        ...currentSubscription,
        status: 'paused' as SubscriptionStatus,
        pause_count: currentSubscription.pause_count + 1,
        updated_at: new Date().toISOString()
      };

      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'pause',
        action_data: { pause_date: new Date().toISOString() },
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setActionNotes('');
      toast.success('Subscription paused successfully');
    } catch (error) {
      console.error('Pause error:', error);
      toast.error('Failed to pause subscription');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, actionNotes, currentUser, onUpdate]);

  const handleSubscriptionResume = useCallback(async () => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const updatedSubscription = {
        ...currentSubscription,
        status: 'active' as SubscriptionStatus,
        updated_at: new Date().toISOString()
      };

      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'resume',
        action_data: { resume_date: new Date().toISOString() },
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setActionNotes('');
      toast.success('Subscription resumed successfully');
    } catch (error) {
      console.error('Resume error:', error);
      toast.error('Failed to resume subscription');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, actionNotes, currentUser, onUpdate]);

  const handleSubscriptionExtension = useCallback(async (days: number) => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const newEndDate = addDays(parseISO(currentSubscription.current_period_end), days);
      
      const updatedSubscription = {
        ...currentSubscription,
        current_period_end: newEndDate.toISOString(),
        extension_days: currentSubscription.extension_days + days,
        updated_at: new Date().toISOString()
      };

      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'extend',
        action_data: { extension_days: days, new_end_date: newEndDate.toISOString() },
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setShowExtensionDialog(false);
      setActionNotes('');
      
      toast.success(`Subscription extended by ${days} days`);
    } catch (error) {
      console.error('Extension error:', error);
      toast.error('Failed to extend subscription');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, actionNotes, currentUser, onUpdate]);

  const handleAddFreeMonth = useCallback(async () => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const newEndDate = addDays(parseISO(currentSubscription.current_period_end), 30);
      
      const updatedSubscription = {
        ...currentSubscription,
        current_period_end: newEndDate.toISOString(),
        extension_days: currentSubscription.extension_days + 30,
        free_months_added: currentSubscription.free_months_added + 1,
        updated_at: new Date().toISOString()
      };

      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'add_free_month',
        action_data: { free_month_added: true, new_end_date: newEndDate.toISOString() },
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setActionNotes('');
      toast.success('Free month added successfully');
    } catch (error) {
      console.error('Add free month error:', error);
      toast.error('Failed to add free month');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, actionNotes, currentUser, onUpdate]);

  const handleSubscriptionCancellation = useCallback(async (reason: string) => {
    if (!currentSubscription) return;
    
    setIsLoading(true);
    try {
      const updatedSubscription = {
        ...currentSubscription,
        status: 'cancelled' as SubscriptionStatus,
        auto_renewal: false,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const action: SubscriptionAction = {
        id: `action_${Date.now()}`,
        subscription_id: currentSubscription.id,
        action_type: 'cancel',
        action_data: { cancellation_reason: reason, cancelled_at: new Date().toISOString() },
        performed_by: currentUser?.id || 'system',
        performed_at: new Date().toISOString(),
        notes: actionNotes,
        effective_date: new Date().toISOString()
      };

      setCurrentSubscription(updatedSubscription);
      setActionHistory(prev => [action, ...prev]);
      onUpdate?.(updatedSubscription);
      
      setShowCancellationDialog(false);
      setCancellationReason('');
      setActionNotes('');
      
      toast.success('Subscription cancelled successfully');
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  }, [currentSubscription, actionNotes, currentUser, onUpdate]);

  // ================================================================================================
  // COMPONENT SECTIONS
  // ================================================================================================

  const HeaderSection = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <currentStatus.icon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Subscription Management</h3>
          <p className="text-sm text-muted-foreground">
            {currentPlan.label} • {currentStatus.label} • User #{userId}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge className={currentStatus.color}>
          <currentStatus.icon className="w-3 h-3 mr-1" />
          {currentStatus.label}
        </Badge>
        
        <Badge className={currentPlan.color}>
          <currentPlan.icon className="w-3 h-3 mr-1" />
          {currentPlan.label}
        </Badge>
      </div>
    </div>
  );

  if (!currentSubscription) {
    return (
      <div className={`space-y-6 ${className}`}>
        <HeaderSection />
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Active Subscription</h3>
            <p className="text-muted-foreground mb-4">
              This user doesn't have an active subscription yet.
            </p>
            <Button onClick={() => setShowPlanChangeDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Subscription
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <HeaderSection />
      
      {/* Current Subscription Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <currentPlan.icon className="w-5 h-5 text-blue-600" />
            <span>Current Subscription</span>
          </CardTitle>
          <CardDescription>
            Overview of the current subscription plan and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Plan Information */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <currentPlan.icon className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-medium text-muted-foreground">Plan Details</h4>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">₹{currentSubscription.total_amount}</div>
                <div className="text-sm text-muted-foreground">
                  {currentBillingCycle.label} billing
                </div>
                <div className="flex flex-wrap gap-1">
                  {currentPlan.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-medium text-muted-foreground">Billing Cycle</h4>
              </div>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Current Period:</span>
                  <div className="font-medium">
                    {format(parseISO(currentSubscription.current_period_start), 'MMM dd, yyyy')} - 
                    {format(parseISO(currentSubscription.current_period_end), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Next Billing:</span>
                  <div className="font-medium">
                    {format(parseISO(currentSubscription.next_billing_date), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Statistics */}
            {subscriptionMetrics && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-medium text-muted-foreground">Usage Stats</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Days Used</span>
                    <span className="font-medium">{subscriptionMetrics.daysUsed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Days Remaining</span>
                    <span className={`font-medium ${subscriptionMetrics.isExpiringSoon ? 'text-red-600' : 'text-green-600'}`}>
                      {subscriptionMetrics.daysRemaining}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${subscriptionMetrics.isExpiringSoon ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${subscriptionMetrics.usagePercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Actions */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Auto-renewal:</span>
                  <Badge variant={currentSubscription.auto_renewal ? "default" : "secondary"}>
                    {currentSubscription.auto_renewal ? "On" : "Off"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Extensions:</span>
                  <span className="font-medium">{currentSubscription.extension_days} days</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">Free months:</span>
                  <span className="font-medium">{currentSubscription.free_months_added}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-orange-600" />
            <span>Subscription Actions</span>
          </CardTitle>
          <CardDescription>
            Manage subscription changes, extensions, and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Plan Management */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Plan Management</span>
              </h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowPlanChangeDialog(true)}
                >
                  <ArrowUp className="w-3 h-3 mr-2" />
                  Change Plan
                </Button>
                <div className="text-xs text-muted-foreground">
                  Upgrade or downgrade subscription plan
                </div>
              </div>
            </div>

            {/* Subscription Control */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <Play className="w-4 h-4 text-green-600" />
                <span>Subscription Control</span>
              </h4>
              <div className="space-y-2">
                {currentSubscription.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleSubscriptionPause}
                    disabled={isLoading}
                  >
                    <Pause className="w-3 h-3 mr-2" />
                    Pause Subscription
                  </Button>
                ) : currentSubscription.status === 'paused' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleSubscriptionResume}
                    disabled={isLoading}
                  >
                    <Play className="w-3 h-3 mr-2" />
                    Resume Subscription
                  </Button>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {currentSubscription.status === 'active' ? 'Temporarily pause billing' : 'Resume active subscription'}
                </div>
              </div>
            </div>

            {/* Extensions & Benefits */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center space-x-2">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>Extensions & Benefits</span>
              </h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowExtensionDialog(true)}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Extend Subscription
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleAddFreeMonth}
                  disabled={isLoading}
                >
                  <Gift className="w-3 h-3 mr-2" />
                  Add Free Month
                </Button>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Danger Zone */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h4>
            <div className="flex items-center space-x-4">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowCancellationDialog(true)}
                disabled={currentSubscription.status === 'cancelled' || isLoading}
              >
                <XCircle className="w-3 h-3 mr-2" />
                Cancel Subscription
              </Button>
              <div className="text-xs text-muted-foreground">
                This action cannot be undone
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Management & History Section */}
      <Tabs defaultValue="billing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="billing">Billing Management</TabsTrigger>
          <TabsTrigger value="history">Subscription History</TabsTrigger>
        </TabsList>

        {/* Billing Management Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Billing Management</span>
              </CardTitle>
              <CardDescription>
                Payment history, outstanding amounts, and refund processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Billing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₹{currentSubscription.total_amount}</div>
                  <div className="text-sm text-muted-foreground">Current Amount</div>
                </div>
                
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">₹0</div>
                  <div className="text-sm text-muted-foreground">Outstanding</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">₹0</div>
                  <div className="text-sm text-muted-foreground">Total Refunds</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {format(parseISO(currentSubscription.next_billing_date), 'MMM dd')}
                  </div>
                  <div className="text-sm text-muted-foreground">Next Payment</div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Payment Method</span>
                </h4>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {PAYMENT_METHODS.find(method => method.value === currentSubscription.payment_method)?.icon && (
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {React.createElement(PAYMENT_METHODS.find(method => method.value === currentSubscription.payment_method)?.icon || CreditCard, {
                          className: "w-4 h-4 text-blue-600"
                        })}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {PAYMENT_METHODS.find(method => method.value === currentSubscription.payment_method)?.label || 'Unknown'}
                      </div>
                      <div className="text-sm text-muted-foreground">Primary payment method</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-3 h-3 mr-2" />
                    Update
                  </Button>
                </div>
              </div>

              {/* Billing Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowBillingDialog(true)}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowRefundDialog(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Process Refund
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download History
                </Button>
              </div>

              {/* Payment History */}
              <div className="mt-6">
                <h4 className="font-medium mb-3 flex items-center space-x-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Recent Payments</span>
                </h4>
                
                {billingHistory.length > 0 ? (
                  <div className="space-y-3">
                    {billingHistory.slice(0, 5).map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            payment.status === 'completed' ? 'bg-green-100' :
                            payment.status === 'failed' ? 'bg-red-100' :
                            payment.status === 'refunded' ? 'bg-blue-100' : 'bg-yellow-100'
                          }`}>
                            {payment.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {payment.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                            {payment.status === 'refunded' && <RefreshCw className="w-4 h-4 text-blue-600" />}
                            {payment.status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                          </div>
                          <div>
                            <div className="font-medium">₹{payment.amount}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(parseISO(payment.payment_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            payment.status === 'completed' ? 'default' :
                            payment.status === 'failed' ? 'destructive' :
                            payment.status === 'refunded' ? 'secondary' : 'outline'
                          }>
                            {payment.status}
                          </Badge>
                          {payment.invoice_url && (
                            <Button variant="ghost" size="sm" className="ml-2">
                              <Download className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No payment history available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5 text-purple-600" />
                <span>Subscription History</span>
              </CardTitle>
              <CardDescription>
                Complete timeline of subscription changes and actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Action Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{actionHistory.length}</div>
                  <div className="text-sm text-muted-foreground">Total Actions</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{currentSubscription.pause_count}</div>
                  <div className="text-sm text-muted-foreground">Pauses</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{currentSubscription.extension_days}</div>
                  <div className="text-sm text-muted-foreground">Extension Days</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{currentSubscription.free_months_added}</div>
                  <div className="text-sm text-muted-foreground">Free Months</div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-4 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Activity Timeline</span>
                </h4>
                
                <ScrollArea className="h-96">
                  {actionHistory.length > 0 ? (
                    <div className="space-y-4">
                      {actionHistory.map((action, index) => (
                        <div key={action.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            action.action_type === 'plan_change' ? 'bg-blue-100' :
                            action.action_type === 'pause' ? 'bg-yellow-100' :
                            action.action_type === 'resume' ? 'bg-green-100' :
                            action.action_type === 'extend' ? 'bg-purple-100' :
                            action.action_type === 'add_free_month' ? 'bg-orange-100' :
                            action.action_type === 'cancel' ? 'bg-red-100' : 'bg-gray-100'
                          }`}>
                            {action.action_type === 'plan_change' && <TrendingUp className="w-4 h-4 text-blue-600" />}
                            {action.action_type === 'pause' && <Pause className="w-4 h-4 text-yellow-600" />}
                            {action.action_type === 'resume' && <Play className="w-4 h-4 text-green-600" />}
                            {action.action_type === 'extend' && <Plus className="w-4 h-4 text-purple-600" />}
                            {action.action_type === 'add_free_month' && <Gift className="w-4 h-4 text-orange-600" />}
                            {action.action_type === 'cancel' && <XCircle className="w-4 h-4 text-red-600" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium capitalize">
                                {action.action_type.replace('_', ' ')}
                              </h5>
                              <div className="text-sm text-muted-foreground">
                                {format(parseISO(action.performed_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            </div>
                            
                            {action.action_type === 'plan_change' && action.action_data && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Changed from {action.action_data.from_plan} to {action.action_data.to_plan}
                                {action.amount_change && ` (₹${action.amount_change} prorated)`}
                              </div>
                            )}
                            
                            {action.action_type === 'extend' && action.action_data && (
                              <div className="text-sm text-muted-foreground mt-1">
                                Extended by {action.action_data.extension_days} days
                              </div>
                            )}
                            
                            {action.notes && (
                              <div className="text-sm text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                                <strong>Notes:</strong> {action.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No subscription history available</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Dialogs */}
      
      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Create and download invoice for current billing period
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Period</span>
                <span>₹{currentSubscription.total_amount}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(parseISO(currentSubscription.current_period_start), 'MMM dd')} - 
                {format(parseISO(currentSubscription.current_period_end), 'MMM dd, yyyy')}
              </div>
            </div>
            
            <div>
              <Label htmlFor="invoice-notes">Invoice Notes (optional)</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Add any additional notes for the invoice..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingDialog(false)}>
              Cancel
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Generate & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Change Dialog */}
      <Dialog open={showPlanChangeDialog} onOpenChange={setShowPlanChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Select a new plan and confirm the change
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-plan">New Plan</Label>
              <Select value={selectedNewPlan} onValueChange={(value) => setSelectedNewPlan(value as SubscriptionPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_PLANS.map(plan => (
                    <SelectItem key={plan.value} value={plan.value}>
                      <div className="flex items-center space-x-2">
                        <plan.icon className="w-4 h-4" />
                        <span>{plan.label} - ₹{plan.price}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {proratedAmount > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Prorated Amount</span>
                </div>
                <div className="text-lg font-bold text-blue-600">₹{proratedAmount.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  Additional charge for remaining period
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="plan-change-notes">Notes (optional)</Label>
              <Textarea
                id="plan-change-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add notes for this plan change..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanChangeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handlePlanChange(selectedNewPlan)}
              disabled={isLoading || selectedNewPlan === currentSubscription?.plan_type}
            >
              {isLoading ? 'Changing...' : 'Change Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Dialog */}
      <Dialog open={showExtensionDialog} onOpenChange={setShowExtensionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Subscription</DialogTitle>
            <DialogDescription>
              Add additional days to the current subscription period
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="extension-days">Extension Period</Label>
              <Select value={extensionDays.toString()} onValueChange={(value) => setExtensionDays(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXTENSION_OPTIONS.map(option => (
                    <SelectItem key={option.days} value={option.days.toString()}>
                      {option.label} ({option.days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="extension-notes">Reason for Extension</Label>
              <Textarea
                id="extension-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Explain why this extension is being added..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtensionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleSubscriptionExtension(extensionDays)}
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : `Add ${extensionDays} Days`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Dialog */}
      <AlertDialog open={showCancellationDialog} onOpenChange={setShowCancellationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the subscription immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancellation-reason">Reason for Cancellation</Label>
              <Select value={cancellationReason} onValueChange={setCancellationReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cancellation reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="payment_failed">Payment Failed</SelectItem>
                  <SelectItem value="service_issue">Service Issue</SelectItem>
                  <SelectItem value="moving_location">Moving Location</SelectItem>
                  <SelectItem value="financial_reasons">Financial Reasons</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cancellation-notes">Additional Notes</Label>
              <Textarea
                id="cancellation-notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSubscriptionCancellation(cancellationReason)}
              disabled={!cancellationReason || isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Issue a refund for the subscription payment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                max={currentSubscription.total_amount}
                placeholder="Enter refund amount"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Maximum refundable: ₹{currentSubscription.total_amount}
              </div>
            </div>
            
            <div>
              <Label htmlFor="refund-reason">Refund Reason</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select refund reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_issue">Service Issue</SelectItem>
                  <SelectItem value="billing_error">Billing Error</SelectItem>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="cancellation">Early Cancellation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="refund-notes">Additional Notes</Label>
              <Textarea
                id="refund-notes"
                placeholder="Explain the reason for this refund..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              disabled={!refundAmount || refundAmount <= 0 || refundAmount > currentSubscription.total_amount}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManager; 