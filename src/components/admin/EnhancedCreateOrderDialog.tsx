import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, ShoppingCart, User, Package, DollarSign, X, Plus, Search, 
  Info, ArrowRight, ArrowLeft, CheckCircle, Clock, MapPin, Calendar,
  Phone, Mail, Home, Edit, Trash2, Star, BookOpen, Building, Zap
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlanService } from "@/services/planService";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useToysForAgeGroup } from "@/hooks/useToysWithAgeBands";
import { format, addDays, addMonths } from "date-fns";
import AddressSelectionDialog from "./AddressSelectionDialog";

interface EnhancedCreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

interface OrderFormData {
  // Step 1: Plan Selection
  plan_id: string;
  order_type: 'subscription' | 'ride_on';
  
  // Step 2: Customer Selection
  user_id: string;
  customer_type: 'existing' | 'new';
  new_customer: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  
  // Step 3: Order Configuration
  age_group: string;
  selected_toys: string[];
  shipping_address: any;
  delivery_instructions: string;
  rental_start_date: string;
  rental_end_date: string;
  
  // Step 4: Final Details
  status: string;
  payment_status: string;
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  coupon_code: string;
  admin_notes: string;
}

const STEPS = [
  { id: 1, title: "Plan Selection", description: "Choose subscription plan" },
  { id: 2, title: "Customer", description: "Select or create customer" },
  { id: 3, title: "Configuration", description: "Configure order details" },
  { id: 4, title: "Review", description: "Review and confirm" }
];

const EnhancedCreateOrderDialog = ({ 
  open, 
  onOpenChange, 
  onOrderCreated 
}: EnhancedCreateOrderDialogProps) => {
  const { toast } = useToast();
  const { data: usersResponse } = useAdminUsers();
  const users = usersResponse?.users || [];
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [toySearchTerm, setToySearchTerm] = useState("");
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  
  const [formData, setFormData] = useState<OrderFormData>({
    plan_id: '',
    order_type: 'subscription',
    user_id: '',
    customer_type: 'existing',
    new_customer: {
      first_name: '',
      last_name: '',
      phone: '',
      email: ''
    },
    age_group: '',
    selected_toys: [],
    shipping_address: null,
    delivery_instructions: '',
    rental_start_date: format(new Date(), 'yyyy-MM-dd'),
    rental_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'pending',
    payment_status: 'pending',
    total_amount: 0,
    base_amount: 0,
    gst_amount: 0,
    coupon_code: '',
    admin_notes: ''
  });

  // Get toys for selected age group with performance optimization
  const toysQuery = useToysForAgeGroup(formData.age_group);
  const availableToys = toysQuery.data || [];
  const toysLoading = toysQuery.isLoading;

  // Calculate pricing when plan changes
  useEffect(() => {
    if (formData.plan_id) {
      const plan = PlanService.getPlan(formData.plan_id);
      if (plan) {
        const baseAmount = plan.price;
        const gstAmount = PlanService.calculateGST(baseAmount);
        const totalAmount = baseAmount + gstAmount;
        
        setFormData(prev => ({
          ...prev,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount
        }));
        setSelectedPlan(plan);
      }
    }
  }, [formData.plan_id]);

  // Set default rental end date when plan changes
  useEffect(() => {
    if (selectedPlan && formData.rental_start_date) {
      const startDate = new Date(formData.rental_start_date);
      const endDate = addMonths(startDate, selectedPlan.duration || 1);
      setFormData(prev => ({
        ...prev,
        rental_end_date: format(endDate, 'yyyy-MM-dd')
      }));
    }
  }, [selectedPlan, formData.rental_start_date]);

  const updateFormData = useCallback((updates: Partial<OrderFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.plan_id) return "Please select a subscription plan";
        break;
      case 2:
        if (formData.customer_type === 'existing' && !formData.user_id) {
          return "Please select an existing customer";
        }
        if (formData.customer_type === 'new') {
          if (!formData.new_customer.first_name.trim()) return "First name is required";
          if (!formData.new_customer.phone.trim()) return "Phone number is required";
        }
        break;
      case 3:
        if (!formData.age_group) return "Please select an age group";
        if (!formData.shipping_address) return "Please select a shipping address";
        break;
      case 4:
        // Final validation
        break;
    }
    return null;
  };

  const nextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleUserSelect = useCallback((user: any) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      user_id: user.id,
      customer_type: 'existing'
    }));
    setUserSearchTerm(`${user.first_name || ''} ${user.last_name || ''} (${user.phone})`.trim());
  }, []);

  const createNewCustomer = async (): Promise<string> => {
    try {
      const { data: newUser, error } = await supabase
        .from('custom_users')
        .insert({
          first_name: formData.new_customer.first_name,
          last_name: formData.new_customer.last_name,
          phone: formData.new_customer.phone,
          email: formData.new_customer.email || null,
          role: 'user',
          subscription_active: false,
          phone_verified: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      return newUser.id;
    } catch (error: any) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  };

  const handleSubmit = async () => {
    const finalValidation = validateStep(4);
    if (finalValidation) {
      setError(finalValidation);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let userId = formData.user_id;

      // Create new customer if needed
      if (formData.customer_type === 'new') {
        userId = await createNewCustomer();
      }

      // Prepare order data following existing patterns
      const orderData = {
        user_id: userId,
        plan_id: formData.plan_id,
        status: formData.status,
        payment_status: formData.payment_status,
        total_amount: formData.total_amount,
        base_amount: formData.base_amount,
        gst_amount: formData.gst_amount,
        order_type: formData.order_type,
        subscription_plan: selectedPlan?.name || '',
        age_group: formData.age_group,
        rental_start_date: formData.rental_start_date,
        rental_end_date: formData.rental_end_date,
        shipping_address: formData.shipping_address,
        delivery_instructions: formData.delivery_instructions,
        coupon_code: formData.coupon_code || null,
        admin_notes: formData.admin_notes,
        toys_data: formData.selected_toys.map(toyId => ({ 
          toy_id: toyId, 
          selected_at: new Date().toISOString() 
        })),
        cycle_number: 1,
        user_phone: formData.customer_type === 'new' 
          ? formData.new_customer.phone 
          : selectedUser?.phone || ''
      };

      // Create order using existing admin function
      const { data, error } = await supabase.functions.invoke('admin-create-order', {
        body: { 
          orderData,
          orderItems: formData.selected_toys.map(toyId => ({
            toy_id: toyId,
            quantity: 1,
            subscription_category: formData.age_group,
            unit_price: 0,
            total_price: 0
          }))
        }
      });

      if (error) throw new Error(error.message || 'Failed to create order');
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Order Created Successfully",
        description: `${selectedPlan?.name} order has been created successfully.`,
      });

      // Reset form and close
      resetForm();
      onOrderCreated();
      onOpenChange(false);

    } catch (error: any) {
      console.error('❌ Failed to create order:', error);
      setError(error.message || 'Failed to create order');
      toast({
        title: "Error Creating Order",
        description: error.message || 'Failed to create order',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      plan_id: '',
      order_type: 'subscription',
      user_id: '',
      customer_type: 'existing',
      new_customer: {
        first_name: '',
        last_name: '',
        phone: '',
        email: ''
      },
      age_group: '',
      selected_toys: [],
      shipping_address: null,
      delivery_instructions: '',
      rental_start_date: format(new Date(), 'yyyy-MM-dd'),
      rental_end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      status: 'pending',
      payment_status: 'pending',
      total_amount: 0,
      base_amount: 0,
      gst_amount: 0,
      coupon_code: '',
      admin_notes: ''
    });
    setCurrentStep(1);
    setSelectedUser(null);
    setSelectedPlan(null);
    setUserSearchTerm("");
    setToySearchTerm("");
    setError(null);
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  // Filtered users and toys
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = userSearchTerm.toLowerCase();
      return (
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.phone.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }).slice(0, 10); // Limit for performance
  }, [users, userSearchTerm]);

  const filteredToys = useMemo(() => {
    if (!availableToys) return [];
    
    return availableToys.filter(toy => {
      const searchLower = toySearchTerm.toLowerCase();
      return (
        toy.name.toLowerCase().includes(searchLower) ||
        toy.category.toLowerCase().includes(searchLower) ||
        toy.brand?.toLowerCase().includes(searchLower)
      );
    });
  }, [availableToys, toySearchTerm]);

  const availablePlans = useMemo(() => PlanService.getAllPlans(), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Create New Order
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive order with guided steps
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                  currentStep > step.id ? 'bg-green-500 text-white' :
                  currentStep === step.id ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step 1: Plan Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Select Subscription Plan</h3>
                <p className="text-sm text-muted-foreground">Choose the plan for this order</p>
              </div>

              <div className="grid gap-4">
                {availablePlans.map(plan => (
                  <Card 
                    key={plan.id} 
                    className={`cursor-pointer transition-all ${
                      formData.plan_id === plan.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => updateFormData({ plan_id: plan.id })}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <Badge variant="outline">₹{plan.price}/{plan.duration === 1 ? 'month' : `${plan.duration}mo`}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {plan.features.standardToys + plan.features.bigToys + plan.features.stemToys + plan.features.educationalToys} toys
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {plan.features.books} books
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Ride-On Option */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    formData.plan_id === 'ride_on_fixed' ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => updateFormData({ plan_id: 'ride_on_fixed', order_type: 'ride_on' })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Ride-On Monthly</CardTitle>
                      <Badge variant="outline">₹1,999/month</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Large ride-on toys for outdoor fun</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Customer Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Select Customer</h3>
                <p className="text-sm text-muted-foreground">Choose existing customer or create new</p>
              </div>

              {/* Customer Type Selection */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.customer_type === 'existing' ? 'default' : 'outline'}
                  onClick={() => updateFormData({ customer_type: 'existing' })}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Existing Customer
                </Button>
                <Button
                  type="button"
                  variant={formData.customer_type === 'new' ? 'default' : 'outline'}
                  onClick={() => updateFormData({ customer_type: 'new' })}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Customer
                </Button>
              </div>

              {/* Existing Customer Selection */}
              {formData.customer_type === 'existing' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Search by name, phone, or email..."
                      className="pl-8"
                    />
                  </div>

                  {userSearchTerm && !selectedUser && (
                    <ScrollArea className="h-48 border rounded-md">
                      {filteredUsers.map(user => (
                        <div
                          key={user.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                                {user.email && (
                                  <>
                                    <Mail className="w-3 h-3 ml-2" />
                                    {user.email}
                                  </>
                                )}
                              </div>
                            </div>
                            {user.role === 'user' && (
                              <Badge variant="secondary">Customer</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground">
                          No customers found
                        </div>
                      )}
                    </ScrollArea>
                  )}

                  {selectedUser && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {selectedUser.first_name} {selectedUser.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedUser.phone} • {selectedUser.email || 'No email'}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(null);
                              setUserSearchTerm("");
                              updateFormData({ user_id: '' });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* New Customer Form */}
              {formData.customer_type === 'new' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.new_customer.first_name}
                        onChange={(e) => updateFormData({
                          new_customer: { ...formData.new_customer, first_name: e.target.value }
                        })}
                        placeholder="First name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.new_customer.last_name}
                        onChange={(e) => updateFormData({
                          new_customer: { ...formData.new_customer, last_name: e.target.value }
                        })}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.new_customer.phone}
                        onChange={(e) => updateFormData({
                          new_customer: { ...formData.new_customer, phone: e.target.value }
                        })}
                        placeholder="Phone number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.new_customer.email}
                        onChange={(e) => updateFormData({
                          new_customer: { ...formData.new_customer, email: e.target.value }
                        })}
                        placeholder="Email address"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Configure Order</h3>
                <p className="text-sm text-muted-foreground">Set age group, toys, and delivery details</p>
              </div>

              {/* Age Group Selection */}
              <div className="space-y-3">
                <Label>Age Group</Label>
                <div className="grid grid-cols-5 gap-2">
                  {['1-2', '2-3', '3-4', '4-6', '6-8'].map(age => (
                    <Button
                      key={age}
                      type="button"
                      variant={formData.age_group === age ? 'default' : 'outline'}
                      onClick={() => updateFormData({ age_group: age, selected_toys: [] })}
                      className="text-xs"
                    >
                      {age} years
                    </Button>
                  ))}
                </div>
              </div>

              {/* Toy Selection */}
              {formData.age_group && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Toys ({formData.selected_toys.length} selected)</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                      <Input
                        value={toySearchTerm}
                        onChange={(e) => setToySearchTerm(e.target.value)}
                        placeholder="Search toys..."
                        className="w-40 h-8 pl-7 text-xs"
                      />
                    </div>
                  </div>

                  {toysLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="ml-2">Loading toys...</span>
                    </div>
                  ) : (
                    <ScrollArea className="h-48 border rounded-md p-2">
                      <div className="grid gap-2">
                        {filteredToys.map(toy => (
                          <div key={toy.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                            <Checkbox
                              checked={formData.selected_toys.includes(toy.id)}
                              disabled={toy.available_quantity === 0}
                              onCheckedChange={(checked) => {
                                if (toy.available_quantity === 0) {
                                  console.warn('🚫 Attempted to select out-of-stock toy:', toy.name, 'Quantity:', toy.available_quantity);
                                  return;
                                }
                                if (checked) {
                                  console.log('✅ Selected toy:', toy.name, 'Quantity:', toy.available_quantity);
                                  updateFormData({
                                    selected_toys: [...formData.selected_toys, toy.id]
                                  });
                                } else {
                                  updateFormData({
                                    selected_toys: formData.selected_toys.filter(id => id !== toy.id)
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium flex items-center gap-2">
                                {toy.name}
                                {toy.available_quantity === 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Out of Stock
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {toy.category} • {toy.brand} • {toy.available_quantity} available
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {toy.category === 'books' ? <BookOpen className="w-3 h-3" /> :
                               toy.category === 'big_toys' ? <Building className="w-3 h-3" /> :
                               toy.category === 'stem_toys' ? <Zap className="w-3 h-3" /> :
                               <Package className="w-3 h-3" />}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Shipping Address */}
              <div className="space-y-3">
                <Label>Shipping Address</Label>
                <Card 
                  className="cursor-pointer border-dashed" 
                  onClick={() => setShowAddressDialog(true)}
                >
                  <CardContent className="p-4">
                    {formData.shipping_address ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                        <div className="text-sm">
                          <div className="font-medium">{formData.shipping_address.label}</div>
                          <div>{formData.shipping_address.line1}</div>
                          {formData.shipping_address.line2 && <div>{formData.shipping_address.line2}</div>}
                          <div>{formData.shipping_address.city}, {formData.shipping_address.state} {formData.shipping_address.pincode}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plus className="w-4 h-4" />
                        <span>Click to select address</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-2">
                <Label htmlFor="delivery_instructions">Delivery Instructions</Label>
                <Textarea
                  id="delivery_instructions"
                  value={formData.delivery_instructions}
                  onChange={(e) => updateFormData({ delivery_instructions: e.target.value })}
                  placeholder="Special delivery instructions..."
                  rows={2}
                />
              </div>

              {/* Rental Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rental_start_date">Rental Start Date</Label>
                  <Input
                    id="rental_start_date"
                    type="date"
                    value={formData.rental_start_date}
                    onChange={(e) => updateFormData({ rental_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_end_date">Rental End Date</Label>
                  <Input
                    id="rental_end_date"
                    type="date"
                    value={formData.rental_end_date}
                    onChange={(e) => updateFormData({ rental_end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Review Order</h3>
                <p className="text-sm text-muted-foreground">Review all details before creating</p>
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                {/* Plan Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Plan Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Plan:</span>
                      <span className="font-medium">{selectedPlan?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{selectedPlan?.duration === 1 ? '1 month' : `${selectedPlan?.duration} months`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Age Group:</span>
                      <span>{formData.age_group} years</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">
                        {formData.customer_type === 'existing' 
                          ? `${selectedUser?.first_name} ${selectedUser?.last_name}`
                          : `${formData.new_customer.first_name} ${formData.new_customer.last_name}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span>
                        {formData.customer_type === 'existing' 
                          ? selectedUser?.phone
                          : formData.new_customer.phone
                        }
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Base Amount:</span>
                      <span>₹{formData.base_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span>₹{formData.gst_amount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span>₹{formData.total_amount.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Final Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="final_status">Order Status</Label>
                    <Select value={formData.status} onValueChange={(value) => updateFormData({ status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_status">Payment Status</Label>
                    <Select value={formData.payment_status} onValueChange={(value) => updateFormData({ payment_status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label htmlFor="admin_notes">Admin Notes</Label>
                  <Textarea
                    id="admin_notes"
                    value={formData.admin_notes}
                    onChange={(e) => updateFormData({ admin_notes: e.target.value })}
                    placeholder="Internal notes for this order..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? handleCancel : prevStep}
            disabled={isLoading}
          >
            {currentStep === 1 ? 'Cancel' : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </>
            )}
          </Button>

          <div className="text-xs text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </div>

          <Button
            type="button"
            onClick={currentStep === STEPS.length ? handleSubmit : nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : currentStep === STEPS.length ? (
              'Create Order'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Address Selection Dialog */}
      <AddressSelectionDialog
        open={showAddressDialog}
        onOpenChange={setShowAddressDialog}
        customerId={formData.customer_type === 'existing' ? formData.user_id : undefined}
        selectedAddress={formData.shipping_address}
        onAddressSelected={(address) => {
          updateFormData({ shipping_address: address });
        }}
      />
    </Dialog>
  );
};

export default EnhancedCreateOrderDialog; 