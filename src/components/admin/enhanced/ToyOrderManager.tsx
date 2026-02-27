import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ComponentLoader } from "@/components/ui/component-loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Truck,
  ArrowRightLeft,
  ShoppingCart,
  Grid3X3,
  List,
  Star,
  AlertCircle,
  Zap,
  Calendar,
  DollarSign,
  Box,
  MapPin,
  Phone,
  User,
  Image,
  Info,
  Settings,
  Download,
  Upload,
  Copy,
  RotateCcw
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface ToyOrderManagerProps {
  orderId: string;
  toys: OrderToy[];
  onUpdate: (toys: OrderToy[]) => void;
  className?: string;
}

interface OrderToy {
  id: string;
  toy_id: string;
  name: string;
  category: string;
  subscription_category?: string;
  image_url?: string;
  age_range: string;
  status: 'pending' | 'delivered' | 'returned' | 'damaged' | 'lost' | 'replaced';
  quantity: number;
  unit_price: number;
  rental_price: number;
  total_price: number;
  delivery_date?: string;
  return_date?: string;
  condition?: string;
  notes?: string;
  replacement_toy_id?: string;
  damage_reported?: boolean;
  damage_details?: string;
}

interface AvailableToy {
  id: string;
  name: string;
  description?: string;
  category: string;
  subscription_category?: string;
  age_range: string;
  brand?: string;
  image_url?: string;
  retail_price?: number;
  rental_price?: number;
  available_quantity: number;
  total_quantity: number;
  rating?: number;
  is_featured: boolean;
}

interface ToySearchFilters {
  searchTerm: string;
  category: string;
  ageGroup: string;
  availability: 'all' | 'available' | 'out_of_stock';
  priceRange: 'all' | 'low' | 'medium' | 'high';
  featured: boolean;
}

interface BulkAction {
  action: 'delivered' | 'returned' | 'damaged' | 'replace' | 'remove';
  selectedIds: string[];
  notes?: string;
}

// ================================================================================================
// CONSTANTS
// ================================================================================================

const TOY_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  { value: 'returned', label: 'Returned', color: 'bg-blue-100 text-blue-800', icon: ArrowRightLeft },
  { value: 'damaged', label: 'Damaged', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  { value: 'lost', label: 'Lost', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  { value: 'replaced', label: 'Replaced', color: 'bg-purple-100 text-purple-800', icon: RefreshCw }
];

const TOY_CATEGORIES = [
  { value: 'big_toys', label: 'Big Toys' },
  { value: 'stem_toys', label: 'STEM Toys' },
  { value: 'educational_toys', label: 'Educational Toys' },
  { value: 'books', label: 'Books' },
  { value: 'developmental_toys', label: 'Developmental Toys' },
  { value: 'ride_on_toys', label: 'Ride-On Toys' }
];

const AGE_GROUPS = [
  { value: '0-1', label: '0-1 years' },
  { value: '1-2', label: '6m-2 years' },
  { value: '2-3', label: '2-3 years' },
  { value: '3-4', label: '3-4 years' },
  { value: '4-6', label: '4-6 years' },
  { value: '6-8', label: '6-8 years' },
  { value: '8+', label: '8+ years' }
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New', color: 'text-green-600' },
  { value: 'excellent', label: 'Excellent', color: 'text-blue-600' },
  { value: 'good', label: 'Good', color: 'text-yellow-600' },
  { value: 'fair', label: 'Fair', color: 'text-orange-600' },
  { value: 'poor', label: 'Poor', color: 'text-red-600' }
];

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const ToyOrderManager: React.FC<ToyOrderManagerProps> = ({
  orderId,
  toys,
  onUpdate,
  className
}) => {
  // ================================================================================================
  // STATE MANAGEMENT
  // ================================================================================================

  const [orderToys, setOrderToys] = useState<OrderToy[]>(toys);
  const [selectedToyIds, setSelectedToyIds] = useState<Set<string>>(new Set());
  const [showAddToyDialog, setShowAddToyDialog] = useState(false);
  const [showReplaceToyDialog, setShowReplaceToyDialog] = useState(false);
  const [showDamageReportDialog, setShowDamageReportDialog] = useState(false);
  const [showBulkActionsDialog, setShowBulkActionsDialog] = useState(false);
  const [showToyDetailsDialog, setShowToyDetailsDialog] = useState(false);
  const [selectedToyForAction, setSelectedToyForAction] = useState<OrderToy | null>(null);
  const [selectedAvailableToy, setSelectedAvailableToy] = useState<AvailableToy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Search and filter states
  const [searchFilters, setSearchFilters] = useState<ToySearchFilters>({
    searchTerm: '',
    category: '',
    ageGroup: '',
    availability: 'available',
    priceRange: 'all',
    featured: false
  });

  // Bulk actions state
  const [bulkAction, setBulkAction] = useState<BulkAction>({
    action: 'delivered',
    selectedIds: [],
    notes: ''
  });

  // Damage report state
  const [damageReport, setDamageReport] = useState({
    toyId: '',
    condition: '',
    damageDetails: '',
    replacementNeeded: false,
    photos: []
  });

  // ================================================================================================
  // HOOKS
  // ================================================================================================

  const { user: currentUser } = useCustomAuth();
  const { data: availableToys, isLoading: toysLoading, refetch: refetchToys } = useToysWithAgeBands();

  // ================================================================================================
  // COMPUTED VALUES
  // ================================================================================================

  const filteredAvailableToys = useMemo(() => {
    if (!availableToys) return [];

    return availableToys.filter(toy => {
      // Search term filter
      if (searchFilters.searchTerm) {
        const searchLower = searchFilters.searchTerm.toLowerCase();
        const matchesSearch = toy.name.toLowerCase().includes(searchLower) ||
                            toy.description?.toLowerCase().includes(searchLower) ||
                            toy.category.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (searchFilters.category && toy.category !== searchFilters.category) {
        return false;
      }

      // Age group filter
      if (searchFilters.ageGroup && !toy.age_range.includes(searchFilters.ageGroup)) {
        return false;
      }

      // Availability filter
      if (searchFilters.availability === 'available' && toy.available_quantity <= 0) {
        return false;
      }
      if (searchFilters.availability === 'out_of_stock' && toy.available_quantity > 0) {
        return false;
      }

      // Price range filter
      if (searchFilters.priceRange !== 'all' && toy.rental_price) {
        const price = toy.rental_price;
        switch (searchFilters.priceRange) {
          case 'low': if (price > 200) return false; break;
          case 'medium': if (price <= 200 || price > 500) return false; break;
          case 'high': if (price <= 500) return false; break;
        }
      }

      // Featured filter
      if (searchFilters.featured && !toy.is_featured) {
        return false;
      }

      return true;
    });
  }, [availableToys, searchFilters]);

  const toysByCategory = useMemo(() => {
    return filteredAvailableToys.reduce((acc, toy) => {
      if (!acc[toy.category]) acc[toy.category] = [];
      acc[toy.category].push(toy);
      return acc;
    }, {} as Record<string, AvailableToy[]>);
  }, [filteredAvailableToys]);

  const orderSummary = useMemo(() => {
    const totalToys = orderToys.length;
    const totalQuantity = orderToys.reduce((sum, toy) => sum + toy.quantity, 0);
    const totalValue = orderToys.reduce((sum, toy) => sum + toy.total_price, 0);
    
    const statusCounts = orderToys.reduce((acc, toy) => {
      acc[toy.status] = (acc[toy.status] || 0) + toy.quantity;
      return acc;
    }, {} as Record<string, number>);

    const categoryCounts = orderToys.reduce((acc, toy) => {
      acc[toy.category] = (acc[toy.category] || 0) + toy.quantity;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalToys,
      totalQuantity,
      totalValue,
      statusCounts,
      categoryCounts,
      avgRentalPrice: totalToys > 0 ? totalValue / totalQuantity : 0
    };
  }, [orderToys]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(orderToys) !== JSON.stringify(toys);
  }, [orderToys, toys]);

  // ================================================================================================
  // EVENT HANDLERS
  // ================================================================================================

  const handleToyStatusChange = useCallback((toyId: string, newStatus: OrderToy['status']) => {
    setOrderToys(prev => prev.map(toy => 
      toy.id === toyId 
        ? { 
            ...toy, 
            status: newStatus,
            delivery_date: newStatus === 'delivered' && !toy.delivery_date ? new Date().toISOString().split('T')[0] : toy.delivery_date,
            return_date: newStatus === 'returned' && !toy.return_date ? new Date().toISOString().split('T')[0] : toy.return_date
          }
        : toy
    ));
  }, []);

  const handleQuantityChange = useCallback((toyId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setOrderToys(prev => prev.map(toy => 
      toy.id === toyId 
        ? { 
            ...toy, 
            quantity: newQuantity,
            total_price: toy.unit_price * newQuantity
          }
        : toy
    ));
  }, []);

  const handleRemoveToy = useCallback((toyId: string) => {
    setOrderToys(prev => prev.filter(toy => toy.id !== toyId));
    setSelectedToyIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(toyId);
      return newSet;
    });
  }, []);

  const handleAddToy = useCallback((selectedToy: AvailableToy, quantity: number = 1) => {
    const newOrderToy: OrderToy = {
      id: `order_toy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toy_id: selectedToy.id,
      name: selectedToy.name,
      category: selectedToy.category,
      subscription_category: selectedToy.subscription_category,
      image_url: selectedToy.image_url,
      age_range: selectedToy.age_range,
      status: 'pending',
      quantity,
      unit_price: selectedToy.rental_price || 0,
      rental_price: selectedToy.rental_price || 0,
      total_price: (selectedToy.rental_price || 0) * quantity,
      condition: 'new'
    };

    setOrderToys(prev => [...prev, newOrderToy]);
    toast.success(`Added ${selectedToy.name} to order`);
  }, []);

  const handleReplaceToy = useCallback((originalToyId: string, replacementToy: AvailableToy) => {
    // Get the original toy name before replacement
    const originalToy = orderToys.find(toy => toy.id === originalToyId);
    
    setOrderToys(prev => prev.map(toy => 
      toy.id === originalToyId
        ? {
            ...toy,
            toy_id: replacementToy.id,
            name: replacementToy.name,
            category: replacementToy.category,
            image_url: replacementToy.image_url,
            unit_price: replacementToy.rental_price || 0,
            rental_price: replacementToy.rental_price || 0,
            total_price: (replacementToy.rental_price || 0) * toy.quantity,
            replacement_toy_id: toy.toy_id, // Store original toy ID
            status: 'replaced'
          }
        : toy
    ));
    
    toast.success(`Replaced ${originalToy?.name || 'toy'} with ${replacementToy.name}`);
    setShowReplaceToyDialog(false);
    setSelectedToyForAction(null);
  }, [orderToys]);

  const handleBulkAction = useCallback(async (action: BulkAction) => {
    setIsLoading(true);
    try {
      const updatedToys = orderToys.map(toy => {
        if (action.selectedIds.includes(toy.id)) {
          const updates: Partial<OrderToy> = {
            notes: action.notes || toy.notes
          };

          switch (action.action) {
            case 'delivered':
              updates.status = 'delivered';
              updates.delivery_date = new Date().toISOString().split('T')[0];
              break;
            case 'returned':
              updates.status = 'returned';
              updates.return_date = new Date().toISOString().split('T')[0];
              break;
            case 'damaged':
              updates.status = 'damaged';
              updates.damage_reported = true;
              updates.damage_details = action.notes;
              break;
          }

          return { ...toy, ...updates };
        }
        return toy;
      });

      if (action.action === 'remove') {
        const filteredToys = orderToys.filter(toy => !action.selectedIds.includes(toy.id));
        setOrderToys(filteredToys);
      } else {
        setOrderToys(updatedToys);
      }

      setSelectedToyIds(new Set());
      setShowBulkActionsDialog(false);
      toast.success(`Bulk action ${action.action} applied to ${action.selectedIds.length} toys`);
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setIsLoading(false);
    }
  }, [orderToys]);

  const handleSaveChanges = useCallback(async () => {
    setIsLoading(true);
    try {
      // Update the parent component with new toys data
      onUpdate(orderToys);
      toast.success('Toy changes saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save toy changes');
    } finally {
      setIsLoading(false);
    }
  }, [orderToys, onUpdate]);

  const handleResetChanges = useCallback(() => {
    setOrderToys(toys);
    setSelectedToyIds(new Set());
    toast.info('Changes reset to original state');
  }, [toys]);

  const toggleToySelection = useCallback((toyId: string) => {
    setSelectedToyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toyId)) {
        newSet.delete(toyId);
      } else {
        newSet.add(toyId);
      }
      return newSet;
    });
  }, []);

  const selectAllToys = useCallback(() => {
    setSelectedToyIds(new Set(orderToys.map(toy => toy.id)));
  }, [orderToys]);

  const clearSelection = useCallback(() => {
    setSelectedToyIds(new Set());
  }, []);

  // ================================================================================================
  // UTILITY FUNCTIONS
  // ================================================================================================

  const getStatusInfo = (status: OrderToy['status']) => {
    return TOY_STATUSES.find(s => s.value === status) || TOY_STATUSES[0];
  };

  const getCategoryLabel = (category: string) => {
    return TOY_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getConditionInfo = (condition: string) => {
    return CONDITION_OPTIONS.find(c => c.value === condition) || CONDITION_OPTIONS[2];
  };

  const checkToyAvailability = (toyId: string, requestedQuantity: number) => {
    const availableToy = availableToys?.find(toy => toy.id === toyId);
    return availableToy ? availableToy.available_quantity >= requestedQuantity : false;
  };

  // ================================================================================================
  // COMPONENT SECTIONS
  // ================================================================================================

  const HeaderSection = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
          <Package className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Toy Management</h3>
          <p className="text-sm text-muted-foreground">
            Order #{orderId} • {orderSummary.totalToys} toys • {orderSummary.totalQuantity} items
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {hasUnsavedChanges && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Unsaved Changes
          </Badge>
        )}
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetChanges}
            disabled={!hasUnsavedChanges || isLoading}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          
          <Button
            size="sm"
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges || isLoading}
          >
            {isLoading ? (
              <>
                <ComponentLoader text="" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const SummarySection = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <span>Order Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{orderSummary.totalToys}</div>
            <div className="text-sm text-muted-foreground">Unique Toys</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{orderSummary.totalQuantity}</div>
            <div className="text-sm text-muted-foreground">Total Items</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">₹{orderSummary.totalValue.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">₹{orderSummary.avgRentalPrice.toFixed(0)}</div>
            <div className="text-sm text-muted-foreground">Avg. Price</div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Status Distribution</h4>
          <div className="flex flex-wrap gap-2">
            {TOY_STATUSES.map(status => {
              const count = orderSummary.statusCounts[status.value] || 0;
              if (count === 0) return null;
              
              return (
                <Badge key={status.value} variant="outline" className={status.color}>
                  <status.icon className="w-3 h-3 mr-1" />
                  {status.label}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ToyListItem = ({ toy }: { toy: OrderToy }) => {
    const statusInfo = getStatusInfo(toy.status);
    const conditionInfo = getConditionInfo(toy.condition || 'good');
    const isSelected = selectedToyIds.has(toy.id);

    return (
      <div className={`border rounded-lg p-4 transition-colors ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
        <div className="flex items-start space-x-4">
          {/* Selection Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleToySelection(toy.id)}
            className="mt-1"
          />

          {/* Toy Image */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {toy.image_url ? (
              <img
                src={toy.image_url.includes('/storage/v1/s3/') 
                  ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                  : toy.image_url
                }
                alt={toy.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Package className="w-8 h-8 text-gray-400" />
            )}
          </div>

          {/* Toy Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900 truncate">{toy.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(toy.category)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {toy.age_range}
                  </Badge>
                  {toy.condition && (
                    <Badge variant="outline" className={`text-xs ${conditionInfo.color}`}>
                      {conditionInfo.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <Badge className={statusInfo.color}>
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>

            {/* Pricing and Quantity */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  ₹{toy.unit_price}/item
                </div>
                <div className="text-sm font-medium">
                  Total: ₹{toy.total_price}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(toy.id, toy.quantity - 1)}
                  disabled={toy.quantity <= 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium min-w-[3rem] text-center">
                  {toy.quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(toy.id, toy.quantity + 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-3">
              <Select value={toy.status} onValueChange={(value: OrderToy['status']) => handleToyStatusChange(toy.id, value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOY_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center space-x-2">
                        <status.icon className="w-3 h-3" />
                        <span>{status.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedToyForAction(toy);
                  setShowReplaceToyDialog(true);
                }}
              >
                <ArrowRightLeft className="w-3 h-3 mr-1" />
                Replace
              </Button>

              {toy.status === 'damaged' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedToyForAction(toy);
                    setShowDamageReportDialog(true);
                  }}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Report
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveToy(toy.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            {/* Notes */}
            {toy.notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-muted-foreground">
                <strong>Notes:</strong> {toy.notes}
              </div>
            )}

            {/* Dates */}
            {(toy.delivery_date || toy.return_date) && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                {toy.delivery_date && (
                  <div>Delivered: {format(parseISO(toy.delivery_date), 'MMM dd, yyyy')}</div>
                )}
                {toy.return_date && (
                  <div>Returned: {format(parseISO(toy.return_date), 'MMM dd, yyyy')}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const AddToyDialog = () => (
    <Dialog open={showAddToyDialog} onOpenChange={setShowAddToyDialog}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Toys to Order</DialogTitle>
          <DialogDescription>
            Search and select toys to add to this rental order
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Search and Filter Controls */}
          <div className="space-y-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search toys by name, description, or category..."
                  value={searchFilters.searchTerm}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSearchFilters({
                  searchTerm: '',
                  category: '',
                  ageGroup: '',
                  availability: 'available',
                  priceRange: 'all',
                  featured: false
                })}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select value={searchFilters.category} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {TOY_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={searchFilters.ageGroup} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, ageGroup: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Ages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Ages</SelectItem>
                  {AGE_GROUPS.map(age => (
                    <SelectItem key={age.value} value={age.value}>
                      {age.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={searchFilters.availability} onValueChange={(value: any) => setSearchFilters(prev => ({ ...prev, availability: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Toys</SelectItem>
                  <SelectItem value="available">Available Only</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={searchFilters.priceRange} onValueChange={(value: any) => setSearchFilters(prev => ({ ...prev, priceRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="low">₹0 - ₹200</SelectItem>
                  <SelectItem value="medium">₹201 - ₹500</SelectItem>
                  <SelectItem value="high">₹500+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={searchFilters.featured}
                onCheckedChange={(checked) => setSearchFilters(prev => ({ ...prev, featured: !!checked }))}
              />
              <Label htmlFor="featured" className="text-sm">Featured toys only</Label>
            </div>
          </div>

          {/* Available Toys List */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4">
              {toysLoading ? (
                <div className="text-center py-8">
                  <ComponentLoader text="Loading available toys..." />
                </div>
              ) : filteredAvailableToys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No toys found matching your criteria</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailableToys.map(toy => (
                    <div key={toy.id} className="border rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {toy.image_url ? (
                            <img
                              src={toy.image_url.includes('/storage/v1/s3/') 
                                ? toy.image_url.replace('/storage/v1/s3/', '/storage/v1/object/public/')
                                : toy.image_url
                              }
                              alt={toy.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">{toy.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(toy.category)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {toy.age_range}
                            </Badge>
                            {toy.is_featured && (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                <Star className="w-2 h-2 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm">
                              <span className="font-medium">₹{toy.rental_price}</span>
                              <span className="text-muted-foreground ml-1">
                                ({toy.available_quantity} available)
                              </span>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => {
                                handleAddToy(toy);
                                setShowAddToyDialog(false);
                              }}
                              disabled={toy.available_quantity <= 0}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );

  const BulkActionsDialog = () => (
    <Dialog open={showBulkActionsDialog} onOpenChange={setShowBulkActionsDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>
            Apply actions to {selectedToyIds.size} selected toys
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-action">Action</Label>
            <Select value={bulkAction.action} onValueChange={(value: any) => setBulkAction(prev => ({ ...prev, action: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivered">Mark as Delivered</SelectItem>
                <SelectItem value="returned">Mark as Returned</SelectItem>
                <SelectItem value="damaged">Mark as Damaged</SelectItem>
                <SelectItem value="remove">Remove from Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bulk-notes">Notes (optional)</Label>
            <Textarea
              id="bulk-notes"
              value={bulkAction.notes}
              onChange={(e) => setBulkAction(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes for this bulk action..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBulkActionsDialog(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleBulkAction({ ...bulkAction, selectedIds: Array.from(selectedToyIds) })}>
            Apply to {selectedToyIds.size} Toys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <HeaderSection />
      <SummarySection />
      
      {/* Current Toys Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-green-600" />
              <span>Current Toys ({orderToys.length})</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {selectedToyIds.size > 0 && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {selectedToyIds.size} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkActionsDialog(true)}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Bulk Actions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </div>
              )}
              
              <Button
                size="sm"
                onClick={() => setShowAddToyDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Toys
              </Button>
            </div>
          </div>
          <CardDescription>
            Manage toys in this order - quantities, status, and replacements
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {orderToys.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No toys in this order</h3>
              <p className="text-muted-foreground mb-4">
                Add toys to get started with this rental order
              </p>
              <Button onClick={() => setShowAddToyDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Toy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All Controls */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedToyIds.size === orderToys.length && orderToys.length > 0}
                    onCheckedChange={(checked) => checked ? selectAllToys() : clearSelection()}
                  />
                  <Label className="text-sm">
                    Select all toys ({orderToys.length})
                  </Label>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Total value: ₹{orderSummary.totalValue.toFixed(2)}
                </div>
              </div>

              {/* Toys List */}
              <div className="space-y-3">
                {orderToys.map(toy => (
                  <ToyListItem key={toy.id} toy={toy} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddToyDialog />
      <BulkActionsDialog />
    </div>
  );
};

export default ToyOrderManager; 