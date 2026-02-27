import { SelectOption } from './InlineEditableSelect';

// Subscription Status Options
export const SUBSCRIPTION_STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'active',
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800',
    description: 'Subscription is active and running'
  },
  {
    value: 'deactivated',
    label: 'Deactivated',
    color: 'bg-red-100 text-red-800',
    description: 'Subscription is deactivated by admin'
  },
  {
    value: 'paused',
    label: 'Paused',
    color: 'bg-orange-100 text-orange-800',
    description: 'Subscription is temporarily paused'
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    description: 'Subscription has been cancelled'
  },
  {
    value: 'expired',
    label: 'Expired',
    color: 'bg-red-100 text-red-800',
    description: 'Subscription has expired'
  },
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-blue-100 text-blue-800',
    description: 'Subscription is pending activation'
  }
];

// Subscription Plan Options
export const SUBSCRIPTION_PLAN_OPTIONS: SelectOption[] = [
  {
    value: 'Discovery Delight',
    label: 'Discovery Delight',
    description: '4 toys for 30 days - ₹1,299'
  },
  {
    value: 'Silver Pack',
    label: 'Silver Pack',
    description: '6 toys for 6 months - ₹5,999'
  },
  {
    value: 'Gold Pack PRO',
    label: 'Gold Pack PRO',
    description: '8 toys for 6 months - ₹7,999'
  },
  {
    value: 'Ride-On Monthly',
    label: 'Ride-On Monthly',
    description: '1 ride-on toy for 30 days - ₹1,999'
  },
  {
    value: 'Books Monthly',
    label: 'Books Monthly',
    description: 'Educational books for 30 days - ₹599'
  }
];

// Age Group Options
export const AGE_GROUP_OPTIONS: SelectOption[] = [
  {
    value: '1-2',
    label: '6m-2 years',
    description: 'Toddler toys'
  },
  {
    value: '2-3',
    label: '2-3 years',
    description: 'Early development toys'
  },
  {
    value: '3-4',
    label: '3-4 years',
    description: 'Preschool toys'
  },
  {
    value: '4-6',
    label: '4-6 years',
    description: 'Learning and play toys'
  },
  {
    value: '6-8',
    label: '6-8 years',
    description: 'School age toys'
  },
  {
    value: '8+',
    label: '8+ years',
    description: 'Advanced toys'
  }
];

// Return Status Options
export const RETURN_STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-orange-100 text-orange-800',
    description: 'Return is pending'
  },
  {
    value: 'partial',
    label: 'Partial',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Some toys returned'
  },
  {
    value: 'complete',
    label: 'Complete',
    color: 'bg-green-100 text-green-800',
    description: 'All toys returned'
  },
  {
    value: 'lost',
    label: 'Lost',
    color: 'bg-red-100 text-red-800',
    description: 'Toys are lost'
  },
  {
    value: 'damaged',
    label: 'Damaged',
    color: 'bg-red-100 text-red-800',
    description: 'Toys returned damaged'
  }
];

// Order Status Options
export const ORDER_STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    description: 'Order is pending'
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
    color: 'bg-blue-100 text-blue-800',
    description: 'Order is confirmed'
  },
  {
    value: 'shipped',
    label: 'Shipped',
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Order has been shipped'
  },
  {
    value: 'delivered',
    label: 'Delivered',
    color: 'bg-green-100 text-green-800',
    description: 'Order has been delivered'
  },
  {
    value: 'active',
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800',
    description: 'Order is active'
  },
  {
    value: 'returned',
    label: 'Returned',
    color: 'bg-orange-100 text-orange-800',
    description: 'Order has been returned'
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    description: 'Order has been cancelled'
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-purple-100 text-purple-800',
    description: 'Order is completed'
  }
];

// Payment Status Options
export const PAYMENT_STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    color: 'bg-gray-100 text-gray-800',
    description: 'Payment is pending'
  },
  {
    value: 'paid',
    label: 'Paid',
    color: 'bg-green-100 text-green-800',
    description: 'Payment completed'
  },
  {
    value: 'failed',
    label: 'Failed',
    color: 'bg-red-100 text-red-800',
    description: 'Payment failed'
  },
  {
    value: 'refunded',
    label: 'Refunded',
    color: 'bg-orange-100 text-orange-800',
    description: 'Payment refunded'
  },
  {
    value: 'partially_refunded',
    label: 'Partially Refunded',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Payment partially refunded'
  }
];

// Payment Method Options
export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  {
    value: 'razorpay',
    label: 'Razorpay',
    color: 'bg-blue-100 text-blue-800',
    description: 'Razorpay payment gateway'
  },
  {
    value: 'upi',
    label: 'UPI',
    color: 'bg-green-100 text-green-800',
    description: 'UPI payment'
  },
  {
    value: 'card',
    label: 'Credit/Debit Card',
    color: 'bg-purple-100 text-purple-800',
    description: 'Card payment'
  },
  {
    value: 'netbanking',
    label: 'Net Banking',
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Net banking payment'
  },
  {
    value: 'wallet',
    label: 'Wallet',
    color: 'bg-orange-100 text-orange-800',
    description: 'Digital wallet payment'
  },
  {
    value: 'cash',
    label: 'Cash on Delivery',
    color: 'bg-gray-100 text-gray-800',
    description: 'Cash on delivery'
  }
];

// Validation Functions
export const validatePhone = (value: string): boolean => {
  return /^\+?[\d\s\-\(\)]+$/.test(value);
};

export const validateEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const validateNumeric = (value: string): boolean => {
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0;
};

export const validateDate = (value: string): boolean => {
  return !isNaN(Date.parse(value));
};

export const validateTrackingNumber = (value: string): boolean => {
  return /^[A-Z0-9]{8,20}$/.test(value);
}; 