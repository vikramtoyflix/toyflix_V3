import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShoppingCart, User, Package, DollarSign, X, Plus, Search, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToys } from "@/hooks/useToys";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { PlanService } from "@/services/planService";
import LocationPicker from "@/components/profile/LocationPicker";

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

interface OrderItem {
  toy_id: string;
  toy_name: string;
  quantity: number;
  subscription_category?: string;
}

interface OrderFormData {
  user_id: string;
  plan_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  base_amount: number;
  gst_amount: number;
  coupon_code: string;
  delivery_instructions: string;
  order_type: string;
  items: OrderItem[];
}

const CreateOrderDialog = ({ open, onOpenChange, onOrderCreated }: CreateOrderDialogProps) => {
  const { toast } = useToast();
  const { data: toys } = useToys();
  const { data: usersResponse } = useAdminUsers();
  const users = usersResponse?.users || [];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [toySearchTerm, setToySearchTerm] = useState("");
  
  const [formData, setFormData] = useState<OrderFormData>({
    user_id: '',
    plan_id: '',
    status: 'pending',
    total_amount: 0,
    base_amount: 0,
    gst_amount: 0,
    coupon_code: '',
    delivery_instructions: '',
    order_type: 'subscription',
    items: []
  });

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
    } else {
      setFormData(prev => ({
        ...prev,
        base_amount: 0,
        gst_amount: 0,
        total_amount: 0
      }));
      setSelectedPlan(null);
    }
  }, [formData.plan_id]);

  const handleInputChange = (field: keyof OrderFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setFormData(prev => ({
      ...prev,
      user_id: user.id
    }));
    setUserSearchTerm(`${user.first_name || ''} ${user.last_name || ''} (${user.phone})`.trim());
  };

  const addToyToOrder = (toy: any) => {
    if (!selectedPlan) {
      setError("Please select a plan first to understand toy limits");
      return;
    }

    const existingItem = formData.items.find(item => item.toy_id === toy.id);
    
    if (existingItem) {
      // For subscriptions, typically toys are unique (quantity = 1)
      toast({
        title: "Toy Already Selected",
        description: "This toy is already in the order. Each toy is typically sent once per cycle.",
        variant: "destructive"
      });
      return;
    }

    // Check plan limits
    const currentToyCount = formData.items.filter(item => item.subscription_category !== 'books').length;
    const currentBookCount = formData.items.filter(item => item.subscription_category === 'books').length;
    
    const toyCategory = toy.category === 'books' ? 'books' : 'toys';
    const planFeatures = selectedPlan.features;
    
    if (toyCategory === 'books') {
      if (currentBookCount >= planFeatures.books) {
        setError(`Plan limit reached: ${planFeatures.books} book(s) allowed per month`);
        return;
      }
    } else {
      const totalToysAllowed = planFeatures.standardToys + planFeatures.bigToys + planFeatures.stemToys + planFeatures.educationalToys;
      if (currentToyCount >= totalToysAllowed) {
        setError(`Plan limit reached: ${totalToysAllowed} toy(s) allowed per month`);
        return;
      }
    }

    // Add toy to order
    const newItem: OrderItem = {
      toy_id: toy.id,
      toy_name: toy.name,
      quantity: 1, // Always 1 for subscription toys
      subscription_category: toy.category
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeToyFromOrder = (toyId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.toy_id !== toyId)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.user_id) {
      return "Please select a user for this order";
    }
    
    if (!formData.plan_id) {
      return "Please select a subscription plan";
    }
    
    // For manual orders, toys are optional (admin might create subscription without pre-selecting toys)
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Creating subscription order:', formData);
      
      // Prepare order data for admin function (using only core fields that exist)
      const orderData = {
        user_id: formData.user_id,
        plan_id: formData.plan_id, // Required for subscription orders
        status: formData.status,
        total_amount: formData.total_amount, // Core field that should exist
        coupon_code: formData.coupon_code.trim() || null,
        delivery_instructions: formData.delivery_instructions.trim() || null,
        order_type: formData.order_type // Will be handled if column exists
      };

      const orderItems = formData.items.map(item => ({
        toy_id: item.toy_id,
        quantity: item.quantity,
        subscription_category: item.subscription_category,
        unit_price: 0, // For subscriptions, individual toy prices don't matter
        total_price: 0  // The subscription plan price covers all toys
      }));
      
      // Call the admin function to create order (bypasses RLS and type issues)
      const { data, error } = await supabase.functions.invoke('admin-create-order', {
        body: { orderData, orderItems }
      });
      
      if (error) {
        console.error('❌ Error calling admin function:', error);
        throw new Error(error.message || 'Failed to create order');
      }
      
      if (data?.error) {
        console.error('❌ Error creating order:', data);
        const errorMessage = data.error;
        const errorDetails = data.details ? ` (${data.details})` : '';
        const errorHint = data.hint ? ` Hint: ${data.hint}` : '';
        const errorCode = data.code ? ` Code: ${data.code}` : '';
        throw new Error(`${errorMessage}${errorDetails}${errorHint}${errorCode}`);
      }

      const orderResult = data.order;
      console.log('✅ Subscription order created successfully:', orderResult);
      
      toast({
        title: "Subscription Order Created Successfully",
        description: `${selectedPlan?.name} subscription order #${orderResult?.id?.slice(0, 8) || 'New'} has been created for ${selectedUser?.first_name || 'the selected user'}.`,
      });
      
      // Reset form
      setFormData({
        user_id: '',
        plan_id: '',
        status: 'pending',
        total_amount: 0,
        base_amount: 0,
        gst_amount: 0,
        coupon_code: '',
        delivery_instructions: '',
        order_type: 'subscription',
        items: []
      });
      setSelectedUser(null);
      setSelectedPlan(null);
      setUserSearchTerm("");
      setToySearchTerm("");
      
      onOrderCreated(); // Refresh order list
      onOpenChange(false); // Close dialog
      
    } catch (error) {
      console.error('❌ Failed to create subscription order:', error);
      setError(error instanceof Error ? error.message : 'Failed to create order');
      
      toast({
        title: "Error Creating Order",
        description: error instanceof Error ? error.message : 'Failed to create order',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      user_id: '',
      plan_id: '',
      status: 'pending',
      total_amount: 0,
      base_amount: 0,
      gst_amount: 0,
      coupon_code: '',
      delivery_instructions: '',
      order_type: 'subscription',
      items: []
    });
    setSelectedUser(null);
    setSelectedPlan(null);
    setUserSearchTerm("");
    setToySearchTerm("");
    setError(null);
    onOpenChange(false);
  };

  // Get available plans
  const availablePlans = PlanService.getAllPlans();

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  // Filter toys based on search and plan access
  const filteredToys = toys?.filter(toy => {
    const searchLower = toySearchTerm.toLowerCase();
    const matchesSearch = (
      toy.name.toLowerCase().includes(searchLower) ||
      toy.category.toLowerCase().includes(searchLower) ||
      toy.brand?.toLowerCase().includes(searchLower)
    );
    
    // Apply plan-based filtering if plan is selected
    if (selectedPlan && matchesSearch) {
      return PlanService.filterToysByPlanAccess([toy], selectedPlan.id).length > 0;
    }
    
    return matchesSearch;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Create Subscription Order
          </DialogTitle>
          <DialogDescription>
            Create a manual subscription order for a user. Select plan, user, and optionally pre-select toys.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Plan Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Select Subscription Plan
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="plan_select">Subscription Plan</Label>
              <Select value={formData.plan_id} onValueChange={(value) => handleInputChange('plan_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subscription plan..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}/{plan.duration === 1 ? 'month' : `${plan.duration} months`}
                    </SelectItem>
                  ))}
                  <SelectItem value="ride_on_fixed">
                    Ride-On Monthly - ₹1,999/month
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedPlan.name}:</strong> {selectedPlan.description}<br/>
                  <span className="text-sm">
                    Includes: {selectedPlan.features.standardToys + selectedPlan.features.bigToys + selectedPlan.features.stemToys + selectedPlan.features.educationalToys} toys + {selectedPlan.features.books} book(s) per month
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* User Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Select Customer
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="user_search">Search User</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user_search"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="pl-8"
                />
              </div>
              
              {userSearchTerm && !selectedUser && (
                <ScrollArea className="h-32 border rounded-md p-2">
                  {filteredUsers.slice(0, 5).map(user => (
                    <div
                      key={user.id}
                      className="p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="font-medium text-sm">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.phone} • {user.email || 'No email'}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-sm text-muted-foreground p-2">
                      No users found
                    </div>
                  )}
                </ScrollArea>
              )}
              
              {selectedUser && (
                <div className="p-3 border rounded-md bg-muted/50">
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
                        setFormData(prev => ({ ...prev, user_id: '' }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Order Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Order Details
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="order_type">Order Type</Label>
                <Select value={formData.order_type} onValueChange={(value) => handleInputChange('order_type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Subscription</SelectItem>
                    <SelectItem value="ride_on">Ride-On</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Order Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="coupon_code">Coupon Code</Label>
              <Input
                id="coupon_code"
                value={formData.coupon_code}
                onChange={(e) => handleInputChange('coupon_code', e.target.value)}
                placeholder="Enter coupon code"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery_instructions">Delivery Instructions</Label>
              <Textarea
                id="delivery_instructions"
                value={formData.delivery_instructions}
                onChange={(e) => handleInputChange('delivery_instructions', e.target.value)}
                placeholder="Any special delivery instructions..."
                rows={2}
              />
            </div>
          </div>
          
          {/* Toy Selection (Optional) */}
          {selectedPlan && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pre-select Toys (Optional)
              </h4>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <span className="text-sm">
                    You can optionally pre-select toys for this subscription. 
                    Customers can also select their own toys later during the subscription flow.
                  </span>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="toy_search">Search Toys</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="toy_search"
                    value={toySearchTerm}
                    onChange={(e) => setToySearchTerm(e.target.value)}
                    placeholder="Search toys by name, category, or brand..."
                    className="pl-8"
                  />
                </div>
                
                {toySearchTerm && (
                  <ScrollArea className="h-32 border rounded-md p-2">
                    {filteredToys.slice(0, 5).map(toy => (
                      <div
                        key={toy.id}
                        className="p-2 hover:bg-muted rounded cursor-pointer flex items-center justify-between"
                        onClick={() => addToyToOrder(toy)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{toy.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {toy.category} • Age: {toy.age_range}
                          </div>
                        </div>
                        <Plus className="w-4 h-4" />
                      </div>
                    ))}
                    {filteredToys.length === 0 && (
                      <div className="text-sm text-muted-foreground p-2">
                        No toys found
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
              
              {/* Selected Items */}
              {formData.items.length > 0 && (
                <div className="space-y-3">
                  <Label>Pre-selected Toys ({formData.items.length})</Label>
                  <div className="border rounded-md p-3 space-y-2">
                    {formData.items.map(item => (
                      <div key={item.toy_id} className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.toy_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Category: {item.subscription_category}
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeToyFromOrder(item.toy_id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pricing Summary */}
          {selectedPlan && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Subscription Pricing
              </h4>
              
              <div className="border rounded-md p-4 bg-muted/30">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{selectedPlan.name} ({selectedPlan.duration === 1 ? '1 month' : `${selectedPlan.duration} months`}):</span>
                    <span>₹{formData.base_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST (18%):</span>
                    <span>₹{formData.gst_amount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span>₹{formData.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  * Fixed subscription pricing. Individual toy values don't affect the total.
                </div>
              </div>
            </div>
          )}
        </form>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Subscription Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog; 