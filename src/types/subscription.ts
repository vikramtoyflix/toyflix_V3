export interface Plan {
  id: string;
  name: string;
  description: string; // Added missing description property
  price: number; // in rupees
  duration: number; // in months
  type: 'monthly' | 'six_month';
  features: {
    standardToys: number;
    bigToys: number;
    stemToys: number;
    educationalToys: number;
    books: number;
    premiumToys?: number;
    customizationPool: {
      toys: number;
      bigToys?: number;
      books: number;
    };
    valueCapMin: number; // minimum value per month
    valueCapMax: number; // maximum value per month
    pauseMonthsAllowed: number;
    specialPerks?: string[];
  };
}

// Add subscription types
export type SubscriptionType = 'regular' | 'ride_on';

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  subscription_type: SubscriptionType; // NEW: Type of subscription
  ride_on_toy_id?: string; // NEW: For ride-on subscriptions
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  current_period_start: string;
  current_period_end: string;
  pause_balance: number; // months of pause remaining
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  
  // TASK 5: NEW rental-based fields from database views
  actual_subscription_start_date?: Date;
  user_actual_start_date?: Date;
  total_days_subscribed_actual?: number;
  rental_orders_count?: number;
  cycle_progress_percentage?: number;
  selection_window_status?: 'open' | 'upcoming' | 'closed';
  days_to_selection_window?: number;
}

// NEW: Ride-On Subscription specific interface
export interface RideOnSubscription {
  id: string;
  user_id: string;
  toy_id: string;
  toy_name: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  current_period_start: string;
  current_period_end: string;
  monthly_amount: number; // ₹1999
  gst_amount: number; // 18% GST
  total_amount: number; // ₹2359
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  
  // TASK 5: NEW rental-based fields from database views (for consistency)
  actual_subscription_start_date?: Date;
  user_actual_start_date?: Date;
  total_days_subscribed_actual?: number;
  rental_orders_count?: number;
  cycle_progress_percentage?: number;
  selection_window_status?: 'open' | 'upcoming' | 'closed';
  days_to_selection_window?: number;
}

// NEW: Combined subscription status for dashboard
export interface UserSubscriptionStatus {
  regular?: Subscription;
  rideOn?: RideOnSubscription;
  hasBothSubscriptions: boolean;
  combinedBilling?: {
    totalAmount: number;
    nextBillingDate: string;
  };
}

// NEW: Ride-On Plan (fixed pricing)
export interface RideOnPlan {
  id: 'ride_on_fixed';
  name: 'Ride-On Monthly';
  description: 'Single ride-on toy rental with no age restrictions';
  basePrice: 1999; // ₹1999
  gstRate: 18; // 18%
  totalPrice: 2359; // ₹2359 (1999 + 18% GST)
  duration: 1; // monthly
  features: {
    toyLimit: 1;
    ageRestrictions: false;
    premiumToys: false;
    books: 0;
  };
}

export interface UserEntitlement {
  id: string;
  user_id: string;
  subscription_id: string;
  current_month: string;
  standard_toys_remaining: number;
  big_toys_remaining: number;
  books_remaining: number;
  premium_toys_remaining?: number;
  value_cap_remaining: number;
  early_access: boolean;
  reservation_enabled: boolean;
  roller_coaster_delivered: boolean;
  coupe_ride_delivered: boolean;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
}

export interface BillingRecord {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  gst: number;
  total_amount: number;
  billing_date: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  created_at: string;
}

export interface PauseRecord {
  id: string;
  user_id: string;
  subscription_id: string;
  pause_start_date: string;
  pause_end_date?: string;
  months_paused: number;
  reason?: string;
  created_at: string;
}

export interface PerkAssignment {
  id: string;
  user_id: string;
  subscription_id: string;
  perk_type: 'roller_coaster' | 'coupe_ride' | 'early_access' | 'reservation';
  status: 'pending' | 'delivered' | 'failed';
  assigned_date: string;
  delivered_date?: string;
  toy_id?: string;
  created_at: string;
}

export interface SubscriptionOperation {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ProrationCalculation {
  daysRemaining: number;
  creditAmount: number;
  newPlanProration: number;
  refundDue: number;
  additionalChargeRequired: number;
  requiresPayment: boolean;
}

// NEW: Payment Eligibility Interface for Payment Bypass System
export interface PaymentEligibilityResult {
  requiresPayment: boolean;
  planType: string | null;
  ageGroup: string | null;
  bypassReason: string | null;
  subscription?: any;
  subscriptionEndDate?: string | null;
  isActive?: boolean;
}

// NEW: Enhanced Subscription Cycle Interface with Rental-based Fields
export interface SubscriptionCycle {
  subscription_id: string;
  user_id: string;
  plan_id: string;
  subscription_status: string;
  current_cycle_number: number;
  current_cycle_start: string;
  current_cycle_end: string;
  last_selection_date?: string;
  next_selection_window_start?: string;
  next_selection_window_end?: string;
  current_cycle_status: string;
  total_cycles_completed: number;
  
  // NEW: Rental-based fields
  actual_subscription_start_date: Date;
  user_actual_start_date: Date;
  total_days_subscribed_actual: number;
  rental_orders_count: number;
  
  // Enhanced cycle tracking
  cycle_progress_percentage: number;
  current_day_in_cycle: number;
  days_remaining_in_cycle: number;
  selection_window_status: 'open' | 'upcoming' | 'closed';
  days_to_selection_window: number;
  
  // Original vs actual dates
  original_subscription_date: string;
  created_at: string;
  updated_at: string;
}

// NEW: Upcoming Cycles with Rental-based Calculations
export interface UpcomingCycle {
  subscription_id: string;
  user_id: string;
  plan_id: string;
  future_cycle_number: number;
  future_cycle_start: Date;
  future_cycle_end: Date;
  future_selection_start: Date;
  future_selection_end: Date;
  estimated_delivery_date: Date;
  actual_subscription_start_date: Date;
}

// NEW: Cycle History with Rental Performance
export interface CycleHistory {
  cycle_id: string;
  subscription_id: string;
  user_id: string;
  cycle_number: number;
  cycle_start_date: Date;
  cycle_end_date: Date;
  selection_window_start: Date;
  selection_window_end: Date;
  selection_opened_at?: Date;
  selection_closed_at?: Date;
  toys_selected_at?: Date;
  selected_toys?: any;
  toys_count: number;
  total_toy_value: number;
  delivery_scheduled_date?: Date;
  delivery_actual_date?: Date;
  delivery_status: string;
  tracking_number?: string;
  cycle_status: string;
  completed_at?: Date;
  plan_id_at_cycle: string;
  billing_amount: number;
  billing_status: string;
  
  // Performance metrics
  cycle_duration_days: number;
  selection_window_duration: number;
  delivery_delay_days?: number;
  cycle_completion_days?: number;
  rental_orders_count: number;
  actual_rental_start_date?: Date;
  
  created_at: string;
  updated_at: string;
}

// NEW: Selection Window Status
export interface SelectionWindowStatus {
  subscription_id: string;
  user_id: string;
  cycle_number: number;
  selection_window_start: Date;
  selection_window_end: Date;
  selection_opened_at?: Date;
  selection_closed_at?: Date;
  toys_selected_at?: Date;
  toys_count: number;
  cycle_status: string;
  
  // Window status
  window_status: 'upcoming' | 'open' | 'missed' | 'completed' | 'closed';
  days_until_opens: number;
  days_until_closes: number;
  days_to_select?: number;
  rental_orders_count: number;
  
  created_at: string;
  updated_at: string;
}

// NEW: Comprehensive Subscription Status
export interface EnhancedSubscriptionStatus {
  subscription: SubscriptionCycle | null;
  upcomingCycles: UpcomingCycle[];
  cycleHistory: CycleHistory[];
  selectionWindow: SelectionWindowStatus | null;
  actualStartDate: Date | null;
  totalDaysSubscribed: number;
  totalRentalOrders: number;
  error: string | null;
}
