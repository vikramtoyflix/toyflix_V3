import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Save, 
  Package, 
  Crown, 
  History, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw,
  Shield,
  LifeBuoy,
  ShoppingCart,
  CreditCard,
  Gift,
  Activity,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import new comprehensive user management components
import RolePermissionManager from "./enhanced/RolePermissionManager";
import UserLifecycleManager from "./enhanced/UserLifecycleManager";
import ComprehensiveOrderEditor from "./enhanced/ComprehensiveOrderEditor";
import ToyOrderManager from "./enhanced/ToyOrderManager";
import SubscriptionManager from "./enhanced/SubscriptionManager";
import PromotionalOffersManager from "./enhanced/PromotionalOffersManager";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  onUserUpdated: () => void;
}

interface UserFormData {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin';
  city: string;
  state: string;
  address_line1: string;
  address_line2: string;
  zip_code: string;
  is_active: boolean;
  phone_verified: boolean;
}

interface UserSummaryStats {
  totalOrders: number;
  totalSpent: number;
  activeSubscriptions: number;
  lastLoginDate: string | null;
  registrationDate: string;
  currentPlan: string | null;
  lifetimeValue: number;
}

// Tab configuration for comprehensive user management
const userManagementTabs = [
  { 
    id: 'profile', 
    label: 'Profile', 
    icon: <User className="w-4 h-4" />,
    description: 'Basic user information and contact details'
  },
  { 
    id: 'roles', 
    label: 'Roles & Permissions', 
    icon: <Shield className="w-4 h-4" />,
    description: 'User roles, permissions, and access control'
  },
  { 
    id: 'lifecycle', 
    label: 'User Lifecycle', 
    icon: <LifeBuoy className="w-4 h-4" />,
    description: 'User status, lifecycle events, and management'
  },
  { 
    id: 'orders', 
    label: 'Order Management', 
    icon: <ShoppingCart className="w-4 h-4" />,
    description: 'Comprehensive order and toy management'
  },
  { 
    id: 'subscription', 
    label: 'Subscription', 
    icon: <CreditCard className="w-4 h-4" />,
    description: 'Subscription plans, billing, and extensions'
  },
  { 
    id: 'offers', 
    label: 'Promotional Offers', 
    icon: <Gift className="w-4 h-4" />,
    description: 'User-specific promotional offers and campaigns'
  }
];

const EditUserDialog = ({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [lastDataRefresh, setLastDataRefresh] = useState(Date.now());
  
  const [formData, setFormData] = useState<UserFormData>({
    phone: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    city: '',
    state: '',
    address_line1: '',
    address_line2: '',
    zip_code: '',
    is_active: true,
    phone_verified: false
  });

  // Enhanced user data fetching with comprehensive information
  const { data: enhancedUserData, isLoading: userDataLoading, refetch: refetchUserData } = useQuery({
    queryKey: ['enhanced-user-data', user?.id, lastDataRefresh],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch enhanced user data including statistics
      const [userResponse, ordersResponse] = await Promise.all([
        supabase
          .from('custom_users')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('rental_orders' as any)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const userData = userResponse.data;
      const orders = ordersResponse.data || [];

      // Calculate user summary statistics from available data
      const currentPlan = orders.length > 0 && orders[0] ? (orders[0] as any).subscription_plan : null;
      const stats: UserSummaryStats = {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0),
        activeSubscriptions: orders.filter((order: any) => 
          order.status === 'delivered' || order.status === 'shipped'
        ).length,
        lastLoginDate: userData?.last_login || null,
        registrationDate: userData?.created_at || '',
        currentPlan: currentPlan,
        lifetimeValue: orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0)
      };

      return {
        user: userData,
        orders,
        stats
      };
    },
    enabled: !!user?.id && open,
  });

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        city: user.city || '',
        state: user.state || '',
        address_line1: user.address_line1 || '',
        address_line2: user.address_line2 || '',
        zip_code: user.zip_code || '',
        is_active: user.is_active !== undefined ? user.is_active : true,
        phone_verified: user.phone_verified !== undefined ? user.phone_verified : false
      });
      setError(null);
    }
  }, [user]);

  // Reset active tab when user changes
  useEffect(() => {
    if (user) {
      setActiveTab("profile");
    }
  }, [user?.id]);

  // Global data refresh function
  const handleGlobalRefresh = async () => {
    setLastDataRefresh(Date.now());
    await Promise.all([
      refetchUserData(),
      queryClient.invalidateQueries({ queryKey: ['user-roles', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-lifecycle-events', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-offer-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-edit-user-orders', user?.id] })
    ]);
    
    toast({
      title: "Data Refreshed",
      description: "All user data has been refreshed successfully.",
    });
  };

  const handleInputChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!formData.phone.trim()) {
      return "Phone number is required";
    }
    
    if (formData.phone.length < 10) {
      return "Phone number must be at least 10 digits";
    }
    
    if (!formData.first_name.trim()) {
      return "First name is required";
    }
    
    if (formData.email && !formData.email.includes('@')) {
      return "Please enter a valid email address";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      setError("No user selected for editing");
      return;
    }
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Updating user:', user.id, formData);
      
      const userData = {
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim() || null,
        role: formData.role,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        address_line1: formData.address_line1.trim() || null,
        address_line2: formData.address_line2.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        is_active: formData.is_active,
        phone_verified: formData.phone_verified
      };
      
      // Try the admin function first, fallback to direct update
      let updateResult = null;
      let updateError = null;
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: user.id, userData }
        });
        
        if (error) {
          console.warn('⚠️ Admin function failed, trying direct update:', error);
          updateError = error;
        } else if (data?.error) {
          console.warn('⚠️ Admin function returned error, trying direct update:', data.error);
          updateError = new Error(data.error);
        } else {
          updateResult = data;
        }
      } catch (adminError) {
        console.warn('⚠️ Admin function unavailable, trying direct update:', adminError);
        updateError = adminError;
      }
      
      // Fallback to direct database update if admin function fails
      if (updateError) {
        console.log('🔄 Attempting direct database update...');
        const { data: directUpdateData, error: directUpdateError } = await supabase
          .from('custom_users')
          .update(userData)
          .eq('id', user.id)
          .select()
          .single();
          
        if (directUpdateError) {
          console.error('❌ Direct update also failed:', directUpdateError);
          throw new Error(`Failed to update user: ${directUpdateError.message}`);
        }
        
        updateResult = { user: directUpdateData };
      }
      
      console.log('✅ User updated successfully:', updateResult?.user);
      
      toast({
        title: "User Updated Successfully",
        description: `${formData.first_name} ${formData.last_name}'s information has been updated.`,
      });
      
      // Refresh data across all tabs
      await handleGlobalRefresh();
      onUserUpdated(); // Refresh user list
      
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      setError(errorMessage);
      
      toast({
        title: "Error Updating User",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      // Reset form to original values
      setFormData({
        phone: user.phone || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        city: user.city || '',
        state: user.state || '',
        address_line1: user.address_line1 || '',
        address_line2: user.address_line2 || '',
        zip_code: user.zip_code || '',
        is_active: user.is_active !== undefined ? user.is_active : true,
        phone_verified: user.phone_verified !== undefined ? user.phone_verified : false
      });
    }
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
        {!user ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No user selected for editing</p>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">
                      {user.first_name} {user.last_name}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Comprehensive User Management Dashboard
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGlobalRefresh}
                    disabled={userDataLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${userDataLoading ? 'animate-spin' : ''}`} />
                    Refresh All
                  </Button>
                  <Badge 
                    variant={user.is_active ? "default" : "secondary"}
                    className="text-sm"
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Enhanced User Summary Card */}
              {enhancedUserData?.stats && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Package className="w-4 h-4 text-blue-600 mr-1" />
                          <span className="text-2xl font-bold text-blue-600">
                            {enhancedUserData.stats.totalOrders}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                          <span className="text-2xl font-bold text-green-600">
                            ₹{enhancedUserData.stats.totalSpent.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Total Spent</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Crown className="w-4 h-4 text-purple-600 mr-1" />
                          <span className="text-lg font-bold text-purple-600">
                            {enhancedUserData.stats.currentPlan || 'None'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Current Plan</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Activity className="w-4 h-4 text-orange-600 mr-1" />
                          <span className="text-lg font-bold text-orange-600">
                            {enhancedUserData.stats.activeSubscriptions}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Active Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto p-1">
                {userManagementTabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex flex-col items-center gap-1 p-3 text-xs"
                    title={tab.description}
                  >
                    {tab.icon}
                    <span className="hidden md:block">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Enhanced Profile Tab */}
              <TabsContent value="profile" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">First Name *</Label>
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            placeholder="Enter first name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Last Name</Label>
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value as 'user' | 'admin')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="+91 9876543210 or 9876543210"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Address Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Address Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="address_line1">Address Line 1</Label>
                        <Input
                          id="address_line1"
                          value={formData.address_line1}
                          onChange={(e) => handleInputChange('address_line1', e.target.value)}
                          placeholder="Street address"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address_line2">Address Line 2</Label>
                        <Input
                          id="address_line2"
                          value={formData.address_line2}
                          onChange={(e) => handleInputChange('address_line2', e.target.value)}
                          placeholder="Apartment, suite, etc."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            placeholder="City"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            placeholder="State"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="zip_code">Zip Code</Label>
                        <Input
                          id="zip_code"
                          value={formData.zip_code}
                          onChange={(e) => handleInputChange('zip_code', e.target.value)}
                          placeholder="ZIP/Postal code"
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Account Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => handleInputChange('is_active', checked as boolean)}
                        />
                        <Label htmlFor="is_active" className="text-sm font-normal">
                          Account is active
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="phone_verified"
                          checked={formData.phone_verified}
                          onCheckedChange={(checked) => handleInputChange('phone_verified', checked as boolean)}
                        />
                        <Label htmlFor="phone_verified" className="text-sm font-normal">
                          Phone number is verified
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* Roles & Permissions Tab */}
              <TabsContent value="roles" className="space-y-4">
                {user?.id ? (
                  <RolePermissionManager userId={user.id} />
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No user selected for role management</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* User Lifecycle Tab */}
              <TabsContent value="lifecycle" className="space-y-4">
                {user ? (
                  <UserLifecycleManager user={user} />
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No user selected for lifecycle management</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Enhanced Order Management Tab */}
              <TabsContent value="orders" className="space-y-4">
                {user?.id ? (
                  <div className="space-y-6">
                    {/* Comprehensive Order Editor */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5" />
                          Order Editor
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ComprehensiveOrderEditor />
                      </CardContent>
                    </Card>

                    {/* Toy Order Manager */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Toy Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ToyOrderManager />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No user selected for order management</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Enhanced Subscription Management Tab */}
              <TabsContent value="subscription" className="space-y-4">
                {user?.id ? (
                  <SubscriptionManager userId={user.id} />
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No user selected for subscription management</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Promotional Offers Tab */}
              <TabsContent value="offers" className="space-y-4">
                {user?.id ? (
                  <div className="space-y-4">
                    <Alert>
                      <Gift className="w-4 h-4" />
                      <AlertDescription>
                        Managing promotional offers for {user.first_name} {user.last_name}. 
                        You can assign offers, view usage history, and track promotional campaign effectiveness.
                      </AlertDescription>
                    </Alert>
                    <PromotionalOffersManager />
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>No user selected for promotional offers management</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog; 