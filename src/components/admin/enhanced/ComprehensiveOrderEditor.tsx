import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ComponentLoader } from "@/components/ui/component-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package,
  Edit3,
  Save,
  X,
  Calendar as CalendarIcon,
  MapPin,
  DollarSign,
  Clock,
  Settings,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Copy,
  History,
  Zap,
  FileText,
  ShoppingCart,
  Truck,
  Home,
  User,
  Phone,
  Mail,
  Calculator,
  CreditCard,
  RotateCcw
} from "lucide-react";
import { format, addDays, differenceInDays, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useToys } from "@/hooks/useToys";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface ComprehensiveOrderEditorProps {
  order: any;
  onUpdate: () => void;
  onClose?: () => void;
  showInDialog?: boolean;
  className?: string;
}

interface OrderFormData {
  // Order Information
  status: string;
  subscription_plan: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  discount_amount: number;
  cycle_number: number;
  payment_status: string;
  payment_method: string;
  coupon_code: string;
  
  // Rental Period
  rental_start_date: string;
  rental_end_date: string;
  delivery_date: string | null;
  returned_date: string | null;
  
  // Toys Data
  toys_data: ToyData[];
  toys_delivered_count: number;
  toys_returned_count: number;
  
  // Shipping Address
  shipping_address: ShippingAddress;
  delivery_instructions: string;
  pickup_instructions: string;
  
  // Admin Notes
  admin_notes: string;
  internal_status: string;
}

interface ToyData {
  toy_id: string;
  name: string;
  category: string;
  image_url: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  returned: boolean;
  condition?: string;
  notes?: string;
}

interface ShippingAddress {
  name: string;
  phone: string;
  email: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface ValidationError {
  field: string;
  message: string;
}

interface ChangeHistory {
  id: string;
  field: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

// ================================================================================================
// CONSTANTS
// ================================================================================================

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-orange-100 text-orange-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'active', label: 'Active', color: 'bg-teal-100 text-teal-800' },
  { value: 'returned', label: 'Returned', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800' }
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-purple-100 text-purple-800' },
  { value: 'partially_refunded', label: 'Partially Refunded', color: 'bg-orange-100 text-orange-800' }
];

const SUBSCRIPTION_PLANS = [
  { value: 'basic', label: 'Basic Plan', monthlyPrice: 999 },
  { value: 'standard', label: 'Standard Plan', monthlyPrice: 1499 },
  { value: 'premium', label: 'Premium Plan', monthlyPrice: 1999 },
  { value: 'trial', label: 'Trial Plan', monthlyPrice: 499 }
];

const PAYMENT_METHODS = [
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'admin', label: 'Admin Created' },
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
];

const GST_RATE = 0.18; // 18% GST

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const ComprehensiveOrderEditor: React.FC<ComprehensiveOrderEditorProps> = ({
  order,
  onUpdate,
  onClose,
  showInDialog = true,
  className
}) => {
  // ================================================================================================
  // STATE MANAGEMENT
  // ================================================================================================

  const [formData, setFormData] = useState<OrderFormData>(() => initializeFormData(order));
  const [originalData, setOriginalData] = useState<OrderFormData>(() => initializeFormData(order));
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showToySelector, setShowToySelector] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeHistory[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['order-info']));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerField, setDatePickerField] = useState<string>('');

  // ================================================================================================
  // HOOKS
  // ================================================================================================

  const { user: currentUser } = useCustomAuth();
  const { data: availableToys, isLoading: toysLoading } = useToys();

  // ================================================================================================
  // COMPUTED VALUES
  // ================================================================================================

  const calculatedAmounts = useMemo(() => {
    const baseAmount = formData.base_amount || 0;
    const discountAmount = formData.discount_amount || 0;
    const afterDiscount = Math.max(0, baseAmount - discountAmount);
    const gstAmount = Math.round(afterDiscount * GST_RATE);
    const totalAmount = afterDiscount + gstAmount;

    return {
      base_amount: baseAmount,
      discount_amount: discountAmount,
      after_discount: afterDiscount,
      gst_amount: gstAmount,
      total_amount: totalAmount
    };
  }, [formData.base_amount, formData.discount_amount]);

  const rentalDuration = useMemo(() => {
    if (!formData.rental_start_date || !formData.rental_end_date) return 0;
    const start = parseISO(formData.rental_start_date);
    const end = parseISO(formData.rental_end_date);
    if (!isValid(start) || !isValid(end)) return 0;
    return differenceInDays(end, start) + 1;
  }, [formData.rental_start_date, formData.rental_end_date]);

  const toysValue = useMemo(() => {
    return formData.toys_data.reduce((total, toy) => total + (toy.total_price || 0), 0);
  }, [formData.toys_data]);

  const validationStatus = useMemo(() => {
    const errors = validateForm(formData);
    setValidationErrors(errors);
    return {
      isValid: errors.length === 0,
      errors,
      hasErrors: errors.length > 0
    };
  }, [formData]);

  // ================================================================================================
  // UTILITY FUNCTIONS
  // ================================================================================================

  function initializeFormData(orderData: any): OrderFormData {
    return {
      status: orderData?.status || 'pending',
      subscription_plan: orderData?.subscription_plan || 'basic',
      total_amount: orderData?.total_amount || 0,
      base_amount: orderData?.base_amount || 0,
      gst_amount: orderData?.gst_amount || 0,
      discount_amount: orderData?.discount_amount || 0,
      cycle_number: orderData?.cycle_number || 1,
      payment_status: orderData?.payment_status || 'pending',
      payment_method: orderData?.payment_method || 'razorpay',
      coupon_code: orderData?.coupon_code || '',
      rental_start_date: orderData?.rental_start_date ? format(parseISO(orderData.rental_start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      rental_end_date: orderData?.rental_end_date ? format(parseISO(orderData.rental_end_date), 'yyyy-MM-dd') : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      delivery_date: orderData?.delivery_date ? format(parseISO(orderData.delivery_date), 'yyyy-MM-dd') : null,
      returned_date: orderData?.returned_date ? format(parseISO(orderData.returned_date), 'yyyy-MM-dd') : null,
      toys_data: orderData?.toys_data || [],
      toys_delivered_count: orderData?.toys_delivered_count || 0,
      toys_returned_count: orderData?.toys_returned_count || 0,
      shipping_address: orderData?.shipping_address || {
        name: '',
        phone: '',
        email: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India'
      },
      delivery_instructions: orderData?.delivery_instructions || '',
      pickup_instructions: orderData?.pickup_instructions || '',
      admin_notes: orderData?.admin_notes || '',
      internal_status: orderData?.internal_status || 'active'
    };
  }

  function validateForm(data: OrderFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required fields validation
    if (!data.status) errors.push({ field: 'status', message: 'Order status is required' });
    if (!data.subscription_plan) errors.push({ field: 'subscription_plan', message: 'Subscription plan is required' });
    if (!data.rental_start_date) errors.push({ field: 'rental_start_date', message: 'Rental start date is required' });
    if (!data.rental_end_date) errors.push({ field: 'rental_end_date', message: 'Rental end date is required' });

    // Date validation
    if (data.rental_start_date && data.rental_end_date) {
      const start = parseISO(data.rental_start_date);
      const end = parseISO(data.rental_end_date);
      if (isValid(start) && isValid(end) && end <= start) {
        errors.push({ field: 'rental_end_date', message: 'End date must be after start date' });
      }
    }

    // Amount validation
    if (data.total_amount < 0) errors.push({ field: 'total_amount', message: 'Total amount cannot be negative' });
    if (data.base_amount < 0) errors.push({ field: 'base_amount', message: 'Base amount cannot be negative' });
    if (data.cycle_number <= 0) errors.push({ field: 'cycle_number', message: 'Cycle number must be positive' });

    // Address validation
    const addr = data.shipping_address;
    if (!addr.name) errors.push({ field: 'shipping_address.name', message: 'Customer name is required' });
    if (!addr.phone) errors.push({ field: 'shipping_address.phone', message: 'Phone number is required' });
    if (!addr.address_line_1) errors.push({ field: 'shipping_address.address_line_1', message: 'Address is required' });
    if (!addr.city) errors.push({ field: 'shipping_address.city', message: 'City is required' });
    if (!addr.state) errors.push({ field: 'shipping_address.state', message: 'State is required' });
    if (!addr.postal_code) errors.push({ field: 'shipping_address.postal_code', message: 'Postal code is required' });

    return errors;
  }

  // ================================================================================================
  // EVENT HANDLERS
  // ================================================================================================

  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const fieldPath = field.split('.');
      
      if (fieldPath.length === 1) {
        (newData as any)[fieldPath[0]] = value;
      } else if (fieldPath.length === 2) {
        (newData as any)[fieldPath[0]][fieldPath[1]] = value;
      }
      
      return newData;
    });
    
    setIsDirty(true);

    // Auto-calculate amounts when base amount or discount changes
    if (field === 'base_amount' || field === 'discount_amount') {
      const baseAmount = field === 'base_amount' ? value : formData.base_amount;
      const discountAmount = field === 'discount_amount' ? value : formData.discount_amount;
      const afterDiscount = Math.max(0, baseAmount - discountAmount);
      const gstAmount = Math.round(afterDiscount * GST_RATE);
      const totalAmount = afterDiscount + gstAmount;

      setFormData(prev => ({
        ...prev,
        [field]: value,
        gst_amount: gstAmount,
        total_amount: totalAmount
      }));
    }

    // Auto-calculate end date when start date changes
    if (field === 'rental_start_date' && value) {
      const startDate = parseISO(value);
      if (isValid(startDate)) {
        const endDate = addDays(startDate, 30);
        setFormData(prev => ({
          ...prev,
          rental_start_date: value,
          rental_end_date: format(endDate, 'yyyy-MM-dd')
        }));
      }
    }
  }, [formData.base_amount, formData.discount_amount]);

  const handleDateSelect = (date: Date | undefined, field: string) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      handleFieldChange(field, dateString);
    }
    setSelectedDate(undefined);
    setDatePickerField('');
  };

  const handleExtendPeriod = (days: number) => {
    if (formData.rental_end_date) {
      const currentEnd = parseISO(formData.rental_end_date);
      if (isValid(currentEnd)) {
        const newEnd = addDays(currentEnd, days);
        handleFieldChange('rental_end_date', format(newEnd, 'yyyy-MM-dd'));
        toast.success(`Rental period extended by ${days} days`);
      }
    }
  };

  const handleSave = async () => {
    if (!validationStatus.isValid) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.id
      };

      // Use any type to bypass TypeScript table restrictions
      const { error } = await (supabase as any)
        .from('rental_orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      setLastSavedAt(new Date());
      setIsDirty(false);
      setOriginalData(formData);
      toast.success('Order updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(originalData);
    setIsDirty(false);
    setValidationErrors([]);
    toast.info('Changes reset to last saved state');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // ================================================================================================
  // COMPONENT SECTIONS
  // ================================================================================================

  const HeaderSection = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <Edit3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Editor</h2>
          <p className="text-sm text-muted-foreground">
            Order #{order?.order_number} • Last saved: {lastSavedAt ? format(lastSavedAt, 'MMM dd, HH:mm') : 'Never'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {isDirty && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Unsaved Changes
          </Badge>
        )}
        {!validationStatus.isValid && (
          <Badge variant="outline" className="text-red-600 border-red-200">
            {validationStatus.errors.length} Error{validationStatus.errors.length > 1 ? 's' : ''}
          </Badge>
        )}
        
        <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
        
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={!isDirty || !validationStatus.isValid || isSaving}
        >
          {isSaving ? (
            <>
              <ComponentLoader text="" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </>
          )}
        </Button>
        
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const OrderInformationCard = () => (
    <Card>
      <Collapsible open={expandedSections.has('order-info')} onOpenChange={() => toggleSection('order-info')}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Order Information</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={ORDER_STATUSES.find(s => s.value === formData.status)?.color || 'bg-gray-100 text-gray-800'}>
                  {ORDER_STATUSES.find(s => s.value === formData.status)?.label || formData.status}
                </Badge>
                {expandedSections.has('order-info') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
            </div>
            <CardDescription>
              Manage order status, subscription plan, and financial details
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Order Status and Plan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Order Status *</Label>
                <Select value={formData.status} onValueChange={(value) => handleFieldChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                          <span>{status.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subscription_plan">Subscription Plan *</Label>
                <Select value={formData.subscription_plan} onValueChange={(value) => handleFieldChange('subscription_plan', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <SelectItem key={plan.value} value={plan.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{plan.label}</span>
                          <span className="text-muted-foreground">₹{plan.monthlyPrice}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cycle_number">Cycle Number *</Label>
                <Input
                  id="cycle_number"
                  type="number"
                  min="1"
                  value={formData.cycle_number}
                  onChange={(e) => handleFieldChange('cycle_number', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Financial Information */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Financial Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_amount">Base Amount (₹)</Label>
                  <Input
                    id="base_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_amount}
                    onChange={(e) => handleFieldChange('base_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_amount}
                    onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gst_amount">GST Amount (₹)</Label>
                  <Input
                    id="gst_amount"
                    type="number"
                    step="0.01"
                    value={calculatedAmounts.gst_amount}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated (18%)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount (₹)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={calculatedAmounts.total_amount}
                    readOnly
                    className="bg-muted font-medium"
                  />
                  <p className="text-xs text-muted-foreground">Auto-calculated</p>
                </div>
              </div>
              
              {/* Amount Breakdown */}
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>₹{calculatedAmounts.base_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-₹{calculatedAmounts.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>After Discount:</span>
                    <span>₹{calculatedAmounts.after_discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18%):</span>
                    <span>₹{calculatedAmounts.gst_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total Amount:</span>
                    <span>₹{calculatedAmounts.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center">
                <CreditCard className="w-4 h-4 mr-1" />
                Payment Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => handleFieldChange('payment_status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => handleFieldChange('payment_method', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="coupon_code">Coupon Code</Label>
                  <Input
                    id="coupon_code"
                    value={formData.coupon_code}
                    onChange={(e) => handleFieldChange('coupon_code', e.target.value)}
                    placeholder="Enter coupon code"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  const RentalPeriodCard = () => (
    <Card>
      <Collapsible open={expandedSections.has('rental-period')} onOpenChange={() => toggleSection('rental-period')}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">Rental Period</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-green-700 border-green-200">
                  {rentalDuration} days
                </Badge>
                {expandedSections.has('rental-period') ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </div>
            </div>
            <CardDescription>
              Manage rental dates, delivery tracking, and period extensions
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Rental Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rental_start_date">Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.rental_start_date ? format(parseISO(formData.rental_start_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.rental_start_date ? parseISO(formData.rental_start_date) : undefined}
                      onSelect={(date) => handleDateSelect(date, 'rental_start_date')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rental_end_date">End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.rental_end_date ? format(parseISO(formData.rental_end_date), 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.rental_end_date ? parseISO(formData.rental_end_date) : undefined}
                      onSelect={(date) => handleDateSelect(date, 'rental_end_date')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Duration Calculator */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Rental Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    From {formData.rental_start_date ? format(parseISO(formData.rental_start_date), 'MMM dd') : 'Start'} to {formData.rental_end_date ? format(parseISO(formData.rental_end_date), 'MMM dd') : 'End'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{rentalDuration}</div>
                  <div className="text-sm text-muted-foreground">days</div>
                </div>
              </div>
            </div>

            {/* Quick Extension Buttons */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center">
                <Zap className="w-4 h-4 mr-1" />
                Quick Extensions
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {[7, 15, 30].map((days) => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendPeriod(days)}
                    className="flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{days} days</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Delivery Tracking */}
            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center">
                <Truck className="w-4 h-4 mr-1" />
                Delivery Tracking
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.delivery_date ? format(parseISO(formData.delivery_date), 'PPP') : 'Not delivered yet'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.delivery_date ? parseISO(formData.delivery_date) : undefined}
                        onSelect={(date) => handleDateSelect(date, 'delivery_date')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="returned_date">Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.returned_date ? format(parseISO(formData.returned_date), 'PPP') : 'Not returned yet'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.returned_date ? parseISO(formData.returned_date) : undefined}
                        onSelect={(date) => handleDateSelect(date, 'returned_date')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  // ================================================================================================
  // MAIN RENDER
  // ================================================================================================

  const content = (
    <div className={`space-y-6 ${className}`}>
      <HeaderSection />
      
      {/* Validation Errors Alert */}
      {validationStatus.hasErrors && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">Please fix the following errors:</div>
            <ul className="space-y-1 text-sm">
              {validationStatus.errors.map((error, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-red-600 rounded-full" />
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <OrderInformationCard />
      <RentalPeriodCard />
      
      {/* Placeholder for remaining cards */}
      <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">More Components Coming</h3>
        <p className="text-muted-foreground">
          Toys Management and Shipping Address cards will be added in the next parts
        </p>
      </div>
    </div>
  );

  if (showInDialog) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprehensive Order Editor</DialogTitle>
            <DialogDescription>
              Edit all aspects of order #{order?.order_number}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};

export default ComprehensiveOrderEditor; 