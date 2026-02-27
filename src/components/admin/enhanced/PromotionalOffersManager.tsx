import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users, 
  TrendingUp, 
  Calendar as CalendarIcon,
  Gift,
  Target,
  DollarSign,
  Percent,
  Clock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Copy,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays, isAfter, isBefore } from 'date-fns';
// import ExitIntentManager from '../ExitIntentManager'; // Temporarily disabled

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface PromotionalOffer {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: OfferType;
  value: number;
  min_order_value: number;
  max_discount_amount?: number;
  target_plans: string[];
  usage_limit?: number;
  usage_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_apply: boolean;
  stackable: boolean;
  first_time_users_only: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UserOfferAssignment {
  id: string;
  user_id: string;
  offer_id: string;
  assigned_by: string;
  assigned_at: string;
  used_at?: string;
  is_used: boolean;
  order_id?: string;
  notes?: string;
  expires_at?: string;
  promotional_offers?: PromotionalOffer;
  custom_users?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

interface OfferUsageHistory {
  id: string;
  offer_id: string;
  user_id: string;
  order_id?: string;
  discount_amount: number;
  original_amount: number;
  final_amount: number;
  used_at: string;
  promotional_offers?: PromotionalOffer;
  custom_users?: {
    full_name: string;
    email: string;
  };
}

interface OfferTemplate {
  id: string;
  name: string;
  description: string;
  template_data: {
    type: OfferType;
    value: number;
    min_order_value?: number;
    duration_days?: number;
    target_plans?: string[];
    first_time_users_only?: boolean;
    auto_apply?: boolean;
  };
  category: string;
  is_active: boolean;
}

interface OfferAnalytics {
  total_offers: number;
  active_offers: number;
  total_usage: number;
  total_discount_given: number;
  avg_discount: number;
  conversion_rate: number;
  revenue_impact: number;
  top_offers: Array<{
    offer_id: string;
    code: string;
    name: string;
    usage_count: number;
    total_discount: number;
    conversion_rate: number;
  }>;
}

type OfferType = 
  | 'discount_percentage'
  | 'discount_amount'
  | 'free_month'
  | 'free_toys'
  | 'upgrade'
  | 'shipping_free'
  | 'early_access';

type OfferStatus = 'active' | 'inactive' | 'expired' | 'draft';
type FilterType = 'all' | 'active' | 'inactive' | 'expired' | 'percentage' | 'amount' | 'free_month';

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const PromotionalOffersManager: React.FC = () => {
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState<string>('offers');
  const [selectedOffer, setSelectedOffer] = useState<PromotionalOffer | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Form state for creating offers
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'discount_percentage' as OfferType,
    value: 0,
    min_order_value: 0,
    max_discount_amount: 0,
    target_plans: [] as string[],
    usage_limit: undefined as number | undefined,
    start_date: new Date(),
    end_date: addDays(new Date(), 30),
    auto_apply: false,
    stackable: false,
    first_time_users_only: false,
    // 🎨 NEW: Display control settings
    display_on_homepage: false,
    display_on_pricing: true,
    display_in_header: false,
    display_priority: 1
  });

  // ================================================================================================
  // DATA FETCHING
  // ================================================================================================

  // Fetch promotional offers
  const { data: offers = [], isLoading: offersLoading, error: offersError } = useQuery({
    queryKey: ['promotional-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotional_offers')
        .select(`
          *,
          custom_users!promotional_offers_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PromotionalOffer[];
    }
  });

  // Fetch user offer assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['user-offer-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_offer_assignments')
        .select(`
          *,
          promotional_offers(*),
          custom_users!user_offer_assignments_user_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data as UserOfferAssignment[];
    }
  });

  // Fetch offer usage history
  const { data: usageHistory = [], isLoading: usageLoading } = useQuery({
    queryKey: ['offer-usage-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_usage_history')
        .select(`
          *,
          promotional_offers(code, name),
          custom_users!offer_usage_history_user_id_fkey(
            full_name,
            email
          )
        `)
        .order('used_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as OfferUsageHistory[];
    }
  });

  // Fetch offer templates
  const { data: templates = [] } = useQuery({
    queryKey: ['offer-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as OfferTemplate[];
    }
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_users')
        .select('id, full_name, email, phone, user_type')
        .order('full_name');

      if (error) throw error;
      return data;
    }
  });

  // ================================================================================================
  // MUTATIONS
  // ================================================================================================

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (offerData: Partial<PromotionalOffer>) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!currentUser) throw new Error('User not found');

      const { data, error } = await supabase
        .from('promotional_offers')
        .insert([{
          ...offerData,
          created_by: currentUser.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotional-offers'] });
      setShowCreateDialog(false);
      resetCreateForm();
      toast.success('Promotional offer created successfully');
    },
    onError: (error) => {
      console.error('Create offer error:', error);
      toast.error('Failed to create promotional offer');
    }
  });

  // Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PromotionalOffer> }) => {
      const { data, error } = await supabase
        .from('promotional_offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotional-offers'] });
      toast.success('Offer updated successfully');
    },
    onError: (error) => {
      console.error('Update offer error:', error);
      toast.error('Failed to update offer');
    }
  });

  // Delete offer mutation
  const deleteOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase
        .from('promotional_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotional-offers'] });
      toast.success('Offer deleted successfully');
    },
    onError: (error) => {
      console.error('Delete offer error:', error);
      toast.error('Failed to delete offer');
    }
  });

  // Assign offer mutation
  const assignOfferMutation = useMutation({
    mutationFn: async ({ offerIds, userIds, notes }: { 
      offerIds: string[]; 
      userIds: string[]; 
      notes?: string 
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: currentUser } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!currentUser) throw new Error('User not found');

      const assignments = [];
      for (const offerId of offerIds) {
        for (const userId of userIds) {
          assignments.push({
            offer_id: offerId,
            user_id: userId,
            assigned_by: currentUser.id,
            notes
          });
        }
      }

      const { data, error } = await supabase
        .from('user_offer_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-offer-assignments'] });
      setShowAssignDialog(false);
      setShowBulkDialog(false);
      setSelectedUsers([]);
      toast.success(`Successfully assigned offers to ${data.length} users`);
    },
    onError: (error) => {
      console.error('Assign offer error:', error);
      toast.error('Failed to assign offers');
    }
  });

  // ================================================================================================
  // HELPER FUNCTIONS
  // ================================================================================================

  const resetCreateForm = () => {
    setCreateForm({
      code: '',
      name: '',
      description: '',
      type: 'discount_percentage',
      value: 0,
      min_order_value: 0,
      max_discount_amount: 0,
      target_plans: [],
      usage_limit: undefined,
      start_date: new Date(),
      end_date: addDays(new Date(), 30),
      auto_apply: false,
      stackable: false,
      first_time_users_only: false
    });
  };

  const generateOfferCode = () => {
    const prefix = createForm.type.toUpperCase().substring(0, 3);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  };

  const getOfferStatus = (offer: PromotionalOffer): OfferStatus => {
    if (!offer.is_active) return 'inactive';
    
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    
    if (isAfter(now, endDate)) return 'expired';
    if (isBefore(now, startDate)) return 'draft';
    
    return 'active';
  };

  const getStatusColor = (status: OfferStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOfferTypeLabel = (type: OfferType) => {
    switch (type) {
      case 'discount_percentage': return 'Percentage Discount';
      case 'discount_amount': return 'Amount Discount';
      case 'free_month': return 'Free Month';
      case 'free_toys': return 'Free Toys';
      case 'upgrade': return 'Plan Upgrade';
      case 'shipping_free': return 'Free Shipping';
      case 'early_access': return 'Early Access';
      default: return type;
    }
  };

  const getOfferTypeIcon = (type: OfferType) => {
    switch (type) {
      case 'discount_percentage': return <Percent className="h-4 w-4" />;
      case 'discount_amount': return <DollarSign className="h-4 w-4" />;
      case 'free_month': return <Clock className="h-4 w-4" />;
      case 'free_toys': return <Gift className="h-4 w-4" />;
      case 'upgrade': return <TrendingUp className="h-4 w-4" />;
      case 'shipping_free': return <Target className="h-4 w-4" />;
      case 'early_access': return <Eye className="h-4 w-4" />;
      default: return <Gift className="h-4 w-4" />;
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         offer.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterType === 'all') return true;
    
    const status = getOfferStatus(offer);
    if (filterType === 'active') return status === 'active';
    if (filterType === 'inactive') return status === 'inactive';
    if (filterType === 'expired') return status === 'expired';
    if (filterType === 'percentage') return offer.type === 'discount_percentage';
    if (filterType === 'amount') return offer.type === 'discount_amount';
    if (filterType === 'free_month') return offer.type === 'free_month';
    
    return true;
  });

  // Calculate analytics
  const analytics: OfferAnalytics = {
    total_offers: offers.length,
    active_offers: offers.filter(offer => getOfferStatus(offer) === 'active').length,
    total_usage: usageHistory.length,
    total_discount_given: usageHistory.reduce((sum, usage) => sum + usage.discount_amount, 0),
    avg_discount: usageHistory.length > 0 ? 
      usageHistory.reduce((sum, usage) => sum + usage.discount_amount, 0) / usageHistory.length : 0,
    conversion_rate: offers.length > 0 ? 
      (usageHistory.length / offers.reduce((sum, offer) => sum + offer.usage_count, 0)) * 100 : 0,
    revenue_impact: usageHistory.reduce((sum, usage) => sum + (usage.original_amount - usage.final_amount), 0),
    top_offers: offers
      .map(offer => ({
        offer_id: offer.id,
        code: offer.code,
        name: offer.name,
        usage_count: offer.usage_count,
        total_discount: usageHistory
          .filter(usage => usage.offer_id === offer.id)
          .reduce((sum, usage) => sum + usage.discount_amount, 0),
        conversion_rate: offer.usage_count > 0 ? 
          (usageHistory.filter(usage => usage.offer_id === offer.id).length / offer.usage_count) * 100 : 0
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promotional Offers</h2>
          <p className="text-muted-foreground">
            Manage promotional offers, campaigns, and user assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowBulkDialog(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Offer
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_offers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.active_offers} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_usage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.conversion_rate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.total_discount_given.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ₹{analytics.avg_discount.toFixed(0)} average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.revenue_impact.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total order value increase
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="offers">All Offers</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="usage">Usage History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="exit-intent">Exit-Intent Popup</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search offers by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offers</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="free_month">Free Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Offers Grid */}
          {offersLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : offersError ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">Failed to load offers</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredOffers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No offers found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer) => {
                const status = getOfferStatus(offer);
                const usagePercentage = offer.usage_limit ? 
                  (offer.usage_count / offer.usage_limit) * 100 : 0;
                
                return (
                  <Card key={offer.id} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {getOfferTypeIcon(offer.type)}
                            <CardTitle className="text-lg">{offer.name}</CardTitle>
                          </div>
                          <CardDescription>
                            Code: <span className="font-mono font-medium">{offer.code}</span>
                          </CardDescription>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40">
                            <div className="space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  setSelectedOffer(offer);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Assign
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  updateOfferMutation.mutate({
                                    id: offer.id,
                                    updates: { is_active: !offer.is_active }
                                  });
                                }}
                              >
                                {offer.is_active ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  navigator.clipboard.writeText(offer.code);
                                  toast.success('Offer code copied to clipboard');
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Code
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{offer.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOfferMutation.mutate(offer.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Offer Details */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{getOfferTypeLabel(offer.type)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Value:</span>
                          <span className="font-medium">
                            {offer.type === 'discount_percentage' ? (
                              `${offer.value}%`
                            ) : offer.type === 'discount_amount' ? (
                              `₹${offer.value}`
                            ) : offer.type === 'free_month' ? (
                              `${offer.value} month${offer.value > 1 ? 's' : ''}`
                            ) : offer.type === 'free_toys' ? (
                              `${offer.value} toy${offer.value > 1 ? 's' : ''}`
                            ) : (
                              `${offer.value}`
                            )}
                          </span>
                        </div>
                        {offer.min_order_value > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Min Order:</span>
                            <span className="font-medium">₹{offer.min_order_value}</span>
                          </div>
                        )}
                        {offer.max_discount_amount && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Max Discount:</span>
                            <span className="font-medium">₹{offer.max_discount_amount}</span>
                          </div>
                        )}
                      </div>

                      {/* Status and Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(status)}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            {offer.usage_count} uses
                          </div>
                        </div>
                        
                        {offer.usage_limit && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Usage Limit</span>
                              <span>{offer.usage_count} / {offer.usage_limit}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Validity Period */}
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        <div>Valid: {format(new Date(offer.start_date), 'MMM dd, yyyy')}</div>
                        <div>Until: {format(new Date(offer.end_date), 'MMM dd, yyyy')}</div>
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-1">
                        {offer.auto_apply && (
                          <Badge variant="secondary" className="text-xs">Auto Apply</Badge>
                        )}
                        {offer.stackable && (
                          <Badge variant="secondary" className="text-xs">Stackable</Badge>
                        )}
                        {offer.first_time_users_only && (
                          <Badge variant="secondary" className="text-xs">New Users Only</Badge>
                        )}
                        {offer.target_plans.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {offer.target_plans.length} Plan{offer.target_plans.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">User Offer Assignments</h3>
            <div className="text-sm text-muted-foreground">
              Total: {assignments.length} assignments
            </div>
          </div>

          {assignmentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No offer assignments found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {assignments.slice(0, 50).map((assignment) => (
                    <div key={assignment.id} className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {assignment.custom_users?.full_name || 'Unknown User'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {assignment.promotional_offers?.code}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.custom_users?.email} • 
                          Assigned {format(new Date(assignment.assigned_at), 'MMM dd, yyyy')}
                        </div>
                        {assignment.notes && (
                          <div className="text-xs text-muted-foreground">
                            Note: {assignment.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={assignment.is_used ? 
                            'bg-green-100 text-green-800' : 
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {assignment.is_used ? 'Used' : 'Available'}
                        </Badge>
                        {assignment.is_used && assignment.used_at && (
                          <div className="text-xs text-muted-foreground">
                            Used {format(new Date(assignment.used_at), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage History Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Offer Usage History</h3>
            <div className="text-sm text-muted-foreground">
              Total: {usageHistory.length} uses
            </div>
          </div>

          {usageLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/5"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : usageHistory.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No usage history found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {usageHistory.map((usage) => (
                    <div key={usage.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {usage.custom_users?.full_name || 'Unknown User'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {usage.promotional_offers?.code}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {usage.custom_users?.email} • 
                            Used {format(new Date(usage.used_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm font-medium text-green-600">
                            -₹{usage.discount_amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₹{usage.original_amount.toLocaleString()} → ₹{usage.final_amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Performing Offers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Performing Offers</CardTitle>
                <CardDescription>Most used offers by popularity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.top_offers.map((offer, index) => (
                    <div key={offer.offer_id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{offer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Code: {offer.code}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold text-lg">#{index + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {offer.usage_count} uses
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Offer Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offer Type Distribution</CardTitle>
                <CardDescription>Breakdown by offer types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'discount_percentage', count: offers.filter(o => o.type === 'discount_percentage').length },
                    { type: 'discount_amount', count: offers.filter(o => o.type === 'discount_amount').length },
                    { type: 'free_month', count: offers.filter(o => o.type === 'free_month').length },
                    { type: 'free_toys', count: offers.filter(o => o.type === 'free_toys').length },
                    { type: 'upgrade', count: offers.filter(o => o.type === 'upgrade').length }
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getOfferTypeIcon(item.type as OfferType)}
                        <span>{getOfferTypeLabel(item.type as OfferType)}</span>
                      </div>
                      <div className="font-medium">{item.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Usage Activity</CardTitle>
              <CardDescription>Latest offer redemptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usageHistory.slice(0, 10).map((usage) => (
                  <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {usage.promotional_offers?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        by {usage.custom_users?.full_name}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-medium text-green-600">
                        -₹{usage.discount_amount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(usage.used_at), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exit-Intent Popup Tab - Temporarily disabled */}
        <TabsContent value="exit-intent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exit Intent Management</CardTitle>
              <CardDescription>Exit intent popup management is temporarily disabled</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature will be re-enabled once the exit intent system is stabilized.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Offer Templates</h3>
            <Button 
              variant="outline"
              onClick={() => {
                // Pre-fill form from template
                setShowCreateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="secondary">{template.category}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{getOfferTypeLabel(template.template_data.type as OfferType)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Value:</span>
                      <span>{template.template_data.value}</span>
                    </div>
                    {template.template_data.duration_days && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span>{template.template_data.duration_days} days</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => {
                      setCreateForm({
                        ...createForm,
                        name: template.name,
                        description: template.description,
                        type: template.template_data.type as OfferType,
                        value: template.template_data.value,
                        min_order_value: template.template_data.min_order_value || 0,
                        target_plans: template.template_data.target_plans || [],
                        first_time_users_only: template.template_data.first_time_users_only || false,
                        auto_apply: template.template_data.auto_apply || false,
                        end_date: template.template_data.duration_days ? 
                          addDays(new Date(), template.template_data.duration_days) : 
                          addDays(new Date(), 30)
                      });
                      setShowCreateDialog(true);
                    }}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Offer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Promotional Offer</DialogTitle>
            <DialogDescription>
              Set up a new promotional offer with specific terms and conditions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Basic Information</h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="offer-name">Offer Name *</Label>
                  <Input
                    id="offer-name"
                    placeholder="e.g., Welcome 20% Off"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="offer-code">Offer Code *</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="offer-code"
                      placeholder="e.g., WELCOME20"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateForm({ ...createForm, code: generateOfferCode() })}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-description">Description</Label>
                <Textarea
                  id="offer-description"
                  placeholder="Describe the offer and its benefits"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Offer Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Offer Configuration</h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="offer-type">Offer Type *</Label>
                  <Select 
                    value={createForm.type} 
                    onValueChange={(value) => setCreateForm({ ...createForm, type: value as OfferType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount_percentage">Percentage Discount</SelectItem>
                      <SelectItem value="discount_amount">Amount Discount</SelectItem>
                      <SelectItem value="free_month">Free Month</SelectItem>
                      <SelectItem value="free_toys">Free Toys</SelectItem>
                      <SelectItem value="upgrade">Plan Upgrade</SelectItem>
                      <SelectItem value="shipping_free">Free Shipping</SelectItem>
                      <SelectItem value="early_access">Early Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-value">
                    Value * 
                    {createForm.type === 'discount_percentage' && ' (%)'}
                    {createForm.type === 'discount_amount' && ' (₹)'}
                    {createForm.type === 'free_month' && ' (months)'}
                    {createForm.type === 'free_toys' && ' (toys)'}
                  </Label>
                  <Input
                    id="offer-value"
                    type="number"
                    min="0"
                    step={createForm.type === 'discount_percentage' ? '0.1' : '1'}
                    max={createForm.type === 'discount_percentage' ? '100' : undefined}
                    value={createForm.value}
                    onChange={(e) => setCreateForm({ ...createForm, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-order">Minimum Order Value (₹)</Label>
                  <Input
                    id="min-order"
                    type="number"
                    min="0"
                    value={createForm.min_order_value}
                    onChange={(e) => setCreateForm({ ...createForm, min_order_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                {createForm.type === 'discount_percentage' && (
                  <div className="space-y-2">
                    <Label htmlFor="max-discount">Maximum Discount (₹)</Label>
                    <Input
                      id="max-discount"
                      type="number"
                      min="0"
                      value={createForm.max_discount_amount}
                      onChange={(e) => setCreateForm({ ...createForm, max_discount_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage-limit">Usage Limit (leave empty for unlimited)</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  min="1"
                  value={createForm.usage_limit || ''}
                  onChange={(e) => setCreateForm({ ...createForm, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>

            {/* Target Plans */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Target Plans (leave empty for all plans)</h4>
              <div className="grid gap-2 md:grid-cols-3">
                {['trial', 'basic', 'standard', 'premium', 'enterprise'].map((plan) => (
                  <div key={plan} className="flex items-center space-x-2">
                    <Checkbox
                      id={`plan-${plan}`}
                      checked={createForm.target_plans.includes(plan)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCreateForm({
                            ...createForm,
                            target_plans: [...createForm.target_plans, plan]
                          });
                        } else {
                          setCreateForm({
                            ...createForm,
                            target_plans: createForm.target_plans.filter(p => p !== plan)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`plan-${plan}`} className="capitalize">
                      {plan}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Validity Period */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Validity Period</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(createForm.start_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createForm.start_date}
                        onSelect={(date) => date && setCreateForm({ ...createForm, start_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(createForm.end_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={createForm.end_date}
                        onSelect={(date) => date && setCreateForm({ ...createForm, end_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Options</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Apply</Label>
                    <div className="text-sm text-muted-foreground">
                      Automatically apply to eligible orders
                    </div>
                  </div>
                  <Switch
                    checked={createForm.auto_apply}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, auto_apply: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Stackable</Label>
                    <div className="text-sm text-muted-foreground">
                      Can be combined with other offers
                    </div>
                  </div>
                  <Switch
                    checked={createForm.stackable}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, stackable: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>First-time Users Only</Label>
                    <div className="text-sm text-muted-foreground">
                      Only for users with no previous orders
                    </div>
                  </div>
                  <Switch
                    checked={createForm.first_time_users_only}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, first_time_users_only: checked })}
                  />
                </div>
              </div>
            </div>

            {/* 🎨 NEW: Display Control Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Display Settings
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Display on Homepage</Label>
                    <div className="text-sm text-muted-foreground">
                      Show promo code on the main homepage
                    </div>
                  </div>
                  <Switch
                    checked={createForm.display_on_homepage}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, display_on_homepage: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Display on Pricing Page</Label>
                    <div className="text-sm text-muted-foreground">
                      Show promo code on the subscription plans page
                    </div>
                  </div>
                  <Switch
                    checked={createForm.display_on_pricing}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, display_on_pricing: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Display in Header Banner</Label>
                    <div className="text-sm text-muted-foreground">
                      Show as header banner across all pages
                    </div>
                  </div>
                  <Switch
                    checked={createForm.display_in_header}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, display_in_header: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-priority">Display Priority</Label>
                  <Input
                    id="display-priority"
                    type="number"
                    min="1"
                    max="10"
                    value={createForm.display_priority}
                    onChange={(e) => setCreateForm({ ...createForm, display_priority: parseInt(e.target.value) || 1 })}
                    placeholder="1 (highest) to 10 (lowest)"
                  />
                  <div className="text-xs text-muted-foreground">
                    Higher priority offers appear first in displays
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!createForm.name || !createForm.code || createForm.value <= 0) {
                  toast.error('Please fill in all required fields');
                  return;
                }
                
                createOfferMutation.mutate({
                  code: createForm.code,
                  name: createForm.name,
                  description: createForm.description,
                  type: createForm.type,
                  value: createForm.value,
                  min_order_value: createForm.min_order_value,
                  max_discount_amount: createForm.max_discount_amount || null,
                  target_plans: createForm.target_plans,
                  usage_limit: createForm.usage_limit,
                  start_date: createForm.start_date.toISOString(),
                  end_date: createForm.end_date.toISOString(),
                  is_active: true,
                  auto_apply: createForm.auto_apply,
                  stackable: createForm.stackable,
                  first_time_users_only: createForm.first_time_users_only,
                  // 🎨 NEW: Include display settings
                  display_on_homepage: createForm.display_on_homepage,
                  display_on_pricing: createForm.display_on_pricing,
                  display_in_header: createForm.display_in_header,
                  display_priority: createForm.display_priority
                } as Partial<PromotionalOffer>);
              }}
              disabled={createOfferMutation.isPending}
            >
              {createOfferMutation.isPending ? 'Creating...' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Offer Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Offer to Users</DialogTitle>
            <DialogDescription>
              Select users to assign the offer "{selectedOffer?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-8"
                />
              </div>
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label>Select Users</Label>
              <div className="space-y-2 border rounded-md p-2">
                {users.slice(0, 10).map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.phone}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Notes */}
            <div className="space-y-2">
              <Label htmlFor="assignment-notes">Notes (optional)</Label>
              <Textarea
                id="assignment-notes"
                placeholder="Add notes about this assignment..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedUsers.length === 0) {
                  toast.error('Please select at least one user');
                  return;
                }
                if (!selectedOffer) {
                  toast.error('No offer selected');
                  return;
                }
                
                assignOfferMutation.mutate({
                  offerIds: [selectedOffer.id],
                  userIds: selectedUsers,
                  notes: (document.getElementById('assignment-notes') as HTMLTextAreaElement)?.value
                });
              }}
              disabled={assignOfferMutation.isPending || selectedUsers.length === 0}
            >
              {assignOfferMutation.isPending ? 'Assigning...' : `Assign to ${selectedUsers.length} User${selectedUsers.length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assignment Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Offer Assignment</DialogTitle>
            <DialogDescription>
              Assign multiple offers to multiple users at once
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Select Offers */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Select Offers</h4>
              <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {offers.filter(offer => getOfferStatus(offer) === 'active').map((offer) => (
                  <div key={offer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-offer-${offer.id}`}
                      checked={selectedUsers.includes(offer.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, offer.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== offer.id));
                        }
                      }}
                    />
                    <Label htmlFor={`bulk-offer-${offer.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{offer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Code: {offer.code} • Type: {getOfferTypeLabel(offer.type)}
                          </div>
                        </div>
                        <Badge className="text-xs">
                          {offer.usage_count} uses
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Select Users */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Select Users</h4>
              
              {/* User Filter Options */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Filter by Plan</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Filter by Status</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="new">New Users</SelectItem>
                      <SelectItem value="active">Active Users</SelectItem>
                      <SelectItem value="inactive">Inactive Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quick Select</Label>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedUsers(users.slice(0, 10).map(u => u.id))}
                    >
                      First 10
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedUsers([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                {users.slice(0, 50).map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bulk-user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <Label htmlFor={`bulk-user-${user.id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email} • {user.phone}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.user_type}
                        </Badge>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* CSV Upload Option */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Or Upload User List</h4>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="space-y-2">
                  <div className="font-medium">Upload CSV file</div>
                  <div className="text-sm text-muted-foreground">
                    Upload a CSV file with user emails or phone numbers
                  </div>
                  <Button variant="outline" size="sm">
                    Choose File
                  </Button>
                </div>
              </div>
            </div>

            {/* Assignment Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulk-assignment-notes">Assignment Notes</Label>
              <Textarea
                id="bulk-assignment-notes"
                placeholder="Add notes for this bulk assignment..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedUsers.length === 0) {
                  toast.error('Please select at least one user and one offer');
                  return;
                }
                
                // For bulk assignment, we need to separate offer IDs and user IDs
                // This is a simplified version - in real implementation, you'd manage separate states
                const offerIds = offers.filter(offer => 
                  getOfferStatus(offer) === 'active' && selectedUsers.includes(offer.id)
                ).map(offer => offer.id);
                
                const userIds = users.filter(user => 
                  selectedUsers.includes(user.id)
                ).map(user => user.id);
                
                if (offerIds.length === 0 || userIds.length === 0) {
                  toast.error('Please select both offers and users');
                  return;
                }
                
                assignOfferMutation.mutate({
                  offerIds,
                  userIds,
                  notes: (document.getElementById('bulk-assignment-notes') as HTMLTextAreaElement)?.value
                });
              }}
              disabled={assignOfferMutation.isPending || selectedUsers.length === 0}
            >
              {assignOfferMutation.isPending ? 'Assigning...' : 'Bulk Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionalOffersManager; 