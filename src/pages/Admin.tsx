import { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { 
  Upload, User, Menu, Settings, BarChart3, Users, Package, Grid3X3, Image, ShoppingCart,
  HelpCircle, ImageIcon, Database, ChevronLeft, ChevronRight, X, TestTube, AlertTriangle,
  RefreshCw, Truck, Activity, Crown, Gift, Shield, UserCog, Calendar, TrendingUp,
  Search, Clock, Star, ChevronDown, ChevronUp, Filter, UserCheck, Zap, Target,
  FileText, CreditCard, Percent, DollarSign, PieChart, UserPlus, UserX, Mail,
  Edit3, Eye, History, ArrowUpDown, MapPin
} from "lucide-react";
import AdminSettings from "@/components/AdminSettings";
import AdminOverview from "@/components/admin/AdminOverview";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import React from "react";
import { AdvancedInventoryDashboard } from '@/components/admin/advanced-inventory/AdvancedInventoryDashboard';
import InventoryDashboard from '@/components/admin/InventoryDashboard';
import InventoryAlerts from '@/components/admin/InventoryAlerts';
import InventoryMovements from '@/components/admin/InventoryMovements';
import InventoryReports from '@/components/admin/InventoryReports';
import CurrentlyRentedToys from '@/components/admin/CurrentlyRentedToys';
import InventoryCRUD from '@/components/admin/InventoryCRUD';
import InventoryDebugger from '@/components/admin/InventoryDebugger';
import InventoryQuickTest from '@/components/admin/InventoryQuickTest';

// Pickup Management Components
import PickupDashboard from '@/components/admin/PickupDashboard';
import PincodePickupManagement from '@/components/admin/PincodePickupManagement';

// Exchange Management Components
import ExchangeManagementDashboard from '@/components/admin/ExchangeManagementDashboard';
import ExchangeManagementComparison from '@/components/admin/ExchangeManagementComparison';
import PincodeManagement from '@/components/admin/PincodeManagement';

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; FallbackComponent: React.ComponentType<any>; onError?: (error: Error, errorInfo: any) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.FallbackComponent;
      return <FallbackComponent error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: undefined })} />;
    }

    return this.props.children;
  }
}

// Feature flags for progressive rollout
const FEATURE_FLAGS = {
  ENHANCED_USER_MANAGEMENT: import.meta.env.VITE_ENHANCED_USER_MANAGEMENT !== 'false',
  SUBSCRIPTION_MANAGEMENT: import.meta.env.VITE_SUBSCRIPTION_MANAGEMENT !== 'false',
  PROMOTIONAL_OFFERS: import.meta.env.VITE_PROMOTIONAL_OFFERS !== 'false',
  ROLE_PERMISSIONS: import.meta.env.VITE_ROLE_PERMISSIONS !== 'false',
  USER_LIFECYCLE: import.meta.env.VITE_USER_LIFECYCLE !== 'false',
  ADVANCED_ANALYTICS: import.meta.env.VITE_ADVANCED_ANALYTICS !== 'false',
  BULK_OPERATIONS: import.meta.env.VITE_BULK_OPERATIONS !== 'false',
  A_B_TESTING: import.meta.env.VITE_A_B_TESTING === 'true'
};

// Lazy load existing components for better performance
const AdminToys = lazy(() => import("@/components/admin/AdminToys").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminToys component" /> })));
const AdminLegacyOrders = lazy(() => import("@/components/admin/AdminLegacyOrders").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminLegacyOrders component" /> })));
const AdminAnalytics = lazy(() => import("@/components/admin/AdminAnalytics").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminAnalytics component" /> })));
const UserAnalyticsDashboard = lazy(() => import("@/components/admin/UserAnalyticsDashboard").catch(() => ({ default: () => <ErrorFallback error="Failed to load UserAnalyticsDashboard component" /> })));
const AdminCategories = lazy(() => import("@/components/admin/AdminCategories").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminCategories component" /> })));
const AdminRequests = lazy(() => import("@/components/admin/AdminRequests").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminRequests component" /> })));
const AdminCarousel = lazy(() => import("@/components/admin/AdminCarousel").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminCarousel component" /> })));
const AdminToyCarousel = lazy(() => import("@/components/admin/AdminToyCarousel").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminToyCarousel component" /> })));
const AdminUsers = lazy(() => import("@/components/admin/AdminUsers").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminUsers component" /> })));
const AdminOrders = lazy(() => import("@/components/admin/AdminOrders").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminOrders component" /> })));
const OrderDashboard = lazy(() => import("@/components/admin/OrderDashboard").catch(() => ({ default: () => <ErrorFallback error="Failed to load OrderDashboard component" /> })));
const AdminDispatch = lazy(() => import("@/components/admin/AdminDispatch").catch(() => ({ default: () => <ErrorFallback error="Failed to load AdminDispatch component" /> })));
const PaymentFlowTest = lazy(() => import("@/components/admin/PaymentFlowTest").catch(() => ({ default: () => <ErrorFallback error="Failed to load PaymentFlowTest component" /> })));
const ImageOptimizationDemo = lazy(() => import("@/components/admin/ImageOptimizationDemo").catch(() => ({ default: () => <ErrorFallback error="Failed to load ImageOptimizationDemo component" /> })));
const FixMissingOrders = lazy(() => import("@/components/admin/FixMissingOrders").catch(() => ({ default: () => <ErrorFallback error="Failed to load FixMissingOrders component" /> })));
const TestPaymentFlow = lazy(() => import("@/components/admin/TestPaymentFlow").catch(() => ({ default: () => <ErrorFallback error="Failed to load TestPaymentFlow component" /> })));

// Enhanced User Management Components (lazy loaded with fallbacks)
const RolePermissionManager = lazy(() => import("@/components/admin/enhanced/RolePermissionManager").catch(() => ({ default: () => <PlaceholderComponent title="Roles & Permissions" description="Role-based access control system" /> })));
const UserLifecycleManager = lazy(() => import("@/components/admin/enhanced/UserLifecycleManager").catch(() => ({ default: () => <PlaceholderComponent title="User Lifecycle" description="User lifecycle management system" /> })));
const ComprehensiveOrderEditor = lazy(() => import("@/components/admin/enhanced/ComprehensiveOrderEditor").catch(() => ({ default: () => <PlaceholderComponent title="Order Editor" description="Advanced order editing system" /> })));
const ToyOrderManager = lazy(() => import("@/components/admin/enhanced/ToyOrderManager").catch(() => ({ default: () => <PlaceholderComponent title="Toy Orders" description="Toy order management system" /> })));
const SubscriptionManagementDashboard = lazy(() => import("@/components/admin/subscription-management/SubscriptionManagementDashboard").catch(() => ({ default: () => <PlaceholderComponent title="Subscription Management" description="Advanced subscription management with admin controls" /> })));
const PromotionalOffersManager = lazy(() => import("@/components/admin/enhanced/PromotionalOffersManager").catch(() => ({ default: () => <PlaceholderComponent title="Promotional Offers" description="Promotional offers management" /> })));

// Placeholder Components for Missing Enhanced Features
const PlaceholderComponent = ({ title, description, isNew = true }: { title: string; description: string; isNew?: boolean }) => (
  <Card className="m-4">
    <CardContent className="p-8">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Settings className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {isNew && <Badge variant="secondary">New</Badge>}
          </div>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Enhanced Feature Coming Soon</p>
              <p className="text-blue-600 mt-1">
                This enhanced feature is part of our user management improvements and will be available soon.
                The current basic functionality is still available through the standard admin panels.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const EnhancedUsersPlaceholder = () => (
  <PlaceholderComponent 
    title="Enhanced User Management" 
    description="Advanced user management with comprehensive editing capabilities"
  />
);

const UserAnalyticsPlaceholder = () => (
  <PlaceholderComponent 
    title="User Analytics Dashboard" 
    description="Advanced user insights and analytics reporting"
  />
);

const BulkOperationsPlaceholder = () => (
  <PlaceholderComponent 
    title="Bulk Operations Manager" 
    description="Bulk user operations and management tools"
  />
);

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }: { error?: any, resetErrorBoundary?: () => void }) => (
  <Card className="m-4">
    <CardContent className="p-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-4">
            <div>
              <strong>Something went wrong loading this page:</strong>
              <div className="mt-2 text-sm">
                {typeof error === 'string' ? error : error?.message || 'Unknown error occurred'}
              </div>
            </div>
            <div className="flex gap-2">
              {resetErrorBoundary && (
                <Button onClick={resetErrorBoundary} size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

// Enhanced Loading Spinner
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <Card className="m-4">
    <CardContent className="p-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </CardContent>
  </Card>
);

// Menu search functionality
const useMenuSearch = (items: any[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => 
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);

  return { searchTerm, setSearchTerm, filteredItems };
};

const Admin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentlyAccessed, setRecentlyAccessed] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['dashboard', 'user-management']);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Enhanced menu structure with categorization
  const menuCategories = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: BarChart3,
      items: [
        { id: "overview", label: "Overview", icon: BarChart3, description: "Dashboard overview", category: "dashboard" },
        { id: "order-dashboard", label: "Order Dashboard", icon: Activity, description: "Real-time order analytics", category: "dashboard" },
        ...(FEATURE_FLAGS.ADVANCED_ANALYTICS ? [
          { id: "user-analytics", label: "User Analytics", icon: TrendingUp, description: "Advanced user insights", category: "dashboard", isNew: true }
        ] : [])
      ]
    },
    {
      id: "user-management",
      label: "User Management",
      icon: Users,
      items: [
        { id: "users", label: "Users Overview", icon: Users, description: "User management", category: "user-management" },
        ...(FEATURE_FLAGS.ENHANCED_USER_MANAGEMENT ? [
          { id: "enhanced-users", label: "Enhanced Users", icon: UserCog, description: "Advanced user management", category: "user-management", isNew: true }
        ] : []),
        ...(FEATURE_FLAGS.ROLE_PERMISSIONS ? [
          { id: "roles-permissions", label: "Roles & Permissions", icon: Shield, description: "Role-based access control", category: "user-management", isNew: true }
        ] : []),
        ...(FEATURE_FLAGS.USER_LIFECYCLE ? [
          { id: "user-lifecycle", label: "User Lifecycle", icon: Calendar, description: "User lifecycle management", category: "user-management", isNew: true }
        ] : []),
        ...(FEATURE_FLAGS.BULK_OPERATIONS ? [
          { id: "bulk-operations", label: "Bulk Operations", icon: Zap, description: "Bulk user operations", category: "user-management", isNew: true }
        ] : [])
      ]
    },
    {
      id: "orders-subscriptions",
      label: "Orders & Subscriptions",
      icon: ShoppingCart,
      items: [
        { id: "orders", label: "Orders", icon: ShoppingCart, description: "Order management", category: "orders-subscriptions" },
        { id: "order-editor", label: "Order Editor", icon: FileText, description: "Advanced order editing", category: "orders-subscriptions", isNew: true },
        { id: "toy-orders", label: "Toy Orders", icon: Package, description: "Toy order management", category: "orders-subscriptions", isNew: true },
        { id: "dispatch", label: "Dispatch", icon: Truck, description: "Order dispatch & tracking", category: "orders-subscriptions" },
        { id: "exchange-management", label: "Exchange Management", icon: ArrowUpDown, description: "Intelligent toy exchange operations with calendar and day-based views", category: "orders-subscriptions", isNew: true },
        { id: "pickup-dashboard", label: "Pickup Dashboard", icon: Calendar, description: "Manage return pickups & routes", category: "orders-subscriptions", isNew: true },
        { id: "pickup-management", label: "Pincode Pickup Setup", icon: Settings, description: "Configure day-wise pickup areas", category: "orders-subscriptions", isNew: true },
        { id: "pincode-management", label: "Pincode Management", icon: MapPin, description: "Manage pincode-day assignments", category: "orders-subscriptions", isNew: true },
        { id: "unified-orders", label: "Unified Orders", icon: Database, description: "Legacy + current orders", category: "orders-subscriptions" },
        ...(FEATURE_FLAGS.SUBSCRIPTION_MANAGEMENT ? [
          { id: "subscriptions", label: "Subscriptions", icon: Crown, description: "Advanced subscription management", category: "orders-subscriptions", isNew: true },
          { id: "billing-management", label: "Billing", icon: CreditCard, description: "Billing & payments", category: "orders-subscriptions", isNew: true }
        ] : [])
      ]
    },
    {
      id: "promotions",
      label: "Promotions & Offers",
      icon: Gift,
      items: [
        ...(FEATURE_FLAGS.PROMOTIONAL_OFFERS ? [
          { id: "promotional-offers", label: "Promotional Offers", icon: Gift, description: "Create and manage offers", category: "promotions", isNew: true },
          { id: "offer-analytics", label: "Offer Analytics", icon: PieChart, description: "Offer performance metrics", category: "promotions", isNew: true },
          { id: "discount-manager", label: "Discount Manager", icon: Percent, description: "Discount code management", category: "promotions", isNew: true }
        ] : [])
      ]
    },
    {
      id: "inventory",
      label: "Inventory & Catalog",
      icon: Package,
      items: [
        { id: "toys", label: "Toys", icon: Package, description: "Manage toy inventory", category: "inventory" },
        { id: "inventory-dashboard", label: "Inventory Dashboard", icon: Activity, description: "Real-time inventory tracking", category: "inventory", isNew: true },
        { id: "currently-rented", label: "Currently Rented", icon: UserCheck, description: "Toys with customers now", category: "inventory", isNew: true },
        { id: "inventory-alerts", label: "Inventory Alerts", icon: AlertTriangle, description: "Stock alerts & notifications", category: "inventory", isNew: true },
        { id: "inventory-movements", label: "Inventory Movements", icon: History, description: "Track inventory movements", category: "inventory", isNew: true },
        { id: "inventory-reports", label: "Inventory Reports", icon: FileText, description: "Analytics & reporting", category: "inventory", isNew: true },
        { id: "advanced-inventory", label: "Advanced Inventory", icon: BarChart3, description: "Purchase orders & automation", category: "inventory" },
        { id: "categories", label: "Categories", icon: Grid3X3, description: "Manage toy categories", category: "inventory" },
        { id: "carousel", label: "Home Slides", icon: Image, description: "Homepage carousel", category: "inventory" },
        { id: "toy-carousel", label: "Toy Carousel", icon: Grid3X3, description: "Featured toys", category: "inventory" },
        { id: "inventory-management", label: "Inventory Management", icon: Settings, description: "Manage inventory items", category: "inventory", isNew: true },
        { id: "inventory-debugger", label: "Inventory Debugger", icon: TestTube, description: "Debug inventory system", category: "inventory", isNew: true },
        { id: "inventory-quick-test", label: "Inventory Quick Test", icon: Zap, description: "Quick inventory testing", category: "inventory", isNew: true }
      ]
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      icon: BarChart3,
      items: [
        { id: "analytics", label: "Analytics", icon: BarChart3, description: "Analytics dashboard", category: "analytics" },
        { id: "requests", label: "Requests", icon: HelpCircle, description: "Customer requests", category: "analytics" }
      ]
    },
    {
      id: "tools",
      label: "Tools & Testing",
      icon: Settings,
      items: [
        { id: "test", label: "Payment Test", icon: ShoppingCart, description: "Test payments", category: "tools" },
        { id: "fix-orders", label: "Fix Orders", icon: Database, description: "Fix missing orders", category: "tools" },
        { id: "test-flow", label: "Test Flow", icon: TestTube, description: "Test payment flow", category: "tools" },
        { id: "image-demo", label: "Image Demo", icon: ImageIcon, description: "Image optimization", category: "tools" },
        { id: "settings", label: "Settings", icon: Settings, description: "System settings", category: "tools" }
      ]
    }
  ];

  // Flatten all menu items for search and navigation
  const allMenuItems = menuCategories.flatMap(category => category.items);

  const { searchTerm, setSearchTerm, filteredItems } = useMenuSearch(allMenuItems);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && allMenuItems.find(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, allMenuItems]);

  const handleTabChange = (tabId: string) => {
    console.log(`🔄 Switching to admin tab: ${tabId}`);
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    
    // Update recently accessed items
    const newRecentlyAccessed = [tabId, ...recentlyAccessed.filter(id => id !== tabId)].slice(0, 5);
    setRecentlyAccessed(newRecentlyAccessed);
    
    // Store in localStorage
    localStorage.setItem('admin-recent-tabs', JSON.stringify(newRecentlyAccessed));
    
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderContent = () => {
    console.log(`🎯 Rendering content for tab: ${activeTab}`);
    
    try {
      switch (activeTab) {
        case "overview":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Overview error:', error)}>
              <AdminOverview />
            </ErrorBoundary>
          );
        case "order-dashboard":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('OrderDashboard error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading order dashboard..." />}>
                <OrderDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "user-analytics":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('UserAnalytics error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading user analytics..." />}>
                <UserAnalyticsDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "users":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminUsers error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading user management..." />}>
                <AdminUsers />
              </Suspense>
            </ErrorBoundary>
          );
        case "enhanced-users":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('EnhancedUsers error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading enhanced user management..." />}>
                <EnhancedUsersPlaceholder />
              </Suspense>
            </ErrorBoundary>
          );
        case "roles-permissions":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('RolePermissions error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading roles & permissions..." />}>
                <RolePermissionManager userId="demo-user" />
              </Suspense>
            </ErrorBoundary>
          );
        case "user-lifecycle":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('UserLifecycle error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading user lifecycle..." />}>
                <UserLifecycleManager 
                  standalone={true}
                  showInDialog={false}
                  onUpdate={() => console.log('User updated')} 
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "bulk-operations":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('BulkOperations error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading bulk operations..." />}>
                <BulkOperationsPlaceholder />
              </Suspense>
            </ErrorBoundary>
          );
        case "orders":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminOrders error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading order management..." />}>
                <AdminOrders />
              </Suspense>
            </ErrorBoundary>
          );
        case "order-editor":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('OrderEditor error:', error)}>
              <div className="max-w-4xl mx-auto">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <Edit3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Order Editor</CardTitle>
                        <CardDescription>
                          Edit and manage customer orders with the comprehensive order editor
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Order Selected</AlertTitle>
                      <AlertDescription>
                        The Order Editor requires a specific order to edit. You can access it through the proper workflow below.
                      </AlertDescription>
                    </Alert>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Current Orders
                          </CardTitle>
                          <CardDescription>
                            View and edit active orders from the main orders dashboard
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => handleTabChange('orders')}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Go to Orders Dashboard
                          </Button>
                          <p className="text-sm text-muted-foreground mt-3">
                            From the Orders tab, you can:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• Search and filter orders</li>
                            <li>• View order details</li>
                            <li>• Edit order information</li>
                            <li>• Update order status</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Unified Orders
                          </CardTitle>
                          <CardDescription>
                            Access both current and legacy order data
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => handleTabChange('unified-orders')}
                            variant="outline"
                            className="w-full"
                          >
                            <Database className="w-4 h-4 mr-2" />
                            Go to Unified Orders
                          </Button>
                          <p className="text-sm text-muted-foreground mt-3">
                            From the Unified Orders tab, you can:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                            <li>• View all historical orders</li>
                            <li>• Access WooCommerce data</li>
                            <li>• Compare order sources</li>
                            <li>• Edit current orders</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          How to Edit Orders
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-semibold">
                              1
                            </div>
                            <h4 className="font-medium">Find Order</h4>
                            <p className="text-sm text-muted-foreground">
                              Use the Orders tab to search and locate the specific order
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-semibold">
                              2
                            </div>
                            <h4 className="font-medium">View Details</h4>
                            <p className="text-sm text-muted-foreground">
                              Click "View Details" to open the comprehensive order view
                            </p>
                          </div>
                          <div className="text-center">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-semibold">
                              3
                            </div>
                            <h4 className="font-medium">Edit Order</h4>
                            <p className="text-sm text-muted-foreground">
                              Use the edit buttons to modify order details and save changes
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-center gap-3">
                      <Button 
                        onClick={() => handleTabChange('orders')}
                        size="lg"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Start with Current Orders
                      </Button>
                      <Button 
                        onClick={() => handleTabChange('unified-orders')}
                        variant="outline"
                        size="lg"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        View All Orders
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ErrorBoundary>
          );
        case "toy-orders":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('ToyOrders error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading toy orders..." />}>
                <ToyOrderManager 
                  orderId="demo-order" 
                  toys={[]} 
                  onUpdate={() => console.log('Toy order updated')} 
                />
              </Suspense>
            </ErrorBoundary>
          );
        case "subscriptions":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Subscriptions error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading subscription management..." />}>
                <SubscriptionManagementDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "promotional-offers":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('PromotionalOffers error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading promotional offers..." />}>
                <PromotionalOffersManager />
              </Suspense>
            </ErrorBoundary>
          );
        case "dispatch":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminDispatch error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading dispatch management..." />}>
                <AdminDispatch />
              </Suspense>
            </ErrorBoundary>
          );
        case "exchange-management":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('ExchangeManagement error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading exchange management..." />}>
                <ExchangeManagementComparison />
              </Suspense>
            </ErrorBoundary>
          );
        case "pickup-dashboard":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('PickupDashboard error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading pickup dashboard..." />}>
                <PickupDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "pickup-management":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('PincodePickupManagement error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading pickup management..." />}>
                <PincodePickupManagement />
              </Suspense>
            </ErrorBoundary>
          );
        case "pincode-management":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('PincodeManagement error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading pincode management..." />}>
                <PincodeManagement />
              </Suspense>
            </ErrorBoundary>
          );
        case "unified-orders":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminLegacyOrders error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading unified orders..." />}>
                <AdminLegacyOrders />
              </Suspense>
            </ErrorBoundary>
          );
        case "toys":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminToys error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading toys management..." />}>
                <AdminToys />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-dashboard":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryDashboard error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory dashboard..." />}>
                <InventoryDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "currently-rented":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('CurrentlyRentedToys error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading currently rented toys..." />}>
                <CurrentlyRentedToys />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-alerts":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryAlerts error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory alerts..." />}>
                <InventoryAlerts />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-movements":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryMovements error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory movements..." />}>
                <InventoryMovements />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-reports":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryReports error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory reports..." />}>
                <InventoryReports />
              </Suspense>
            </ErrorBoundary>
          );
        case "advanced-inventory":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdvancedInventory error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading advanced inventory..." />}>
                <AdvancedInventoryDashboard />
              </Suspense>
            </ErrorBoundary>
          );
        case "categories":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminCategories error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading categories management..." />}>
                <AdminCategories />
              </Suspense>
            </ErrorBoundary>
          );
        case "carousel":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminCarousel error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading carousel management..." />}>
                <AdminCarousel />
              </Suspense>
            </ErrorBoundary>
          );
        case "toy-carousel":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminToyCarousel error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading toy carousel..." />}>
                <AdminToyCarousel />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-management":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryCRUD error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory management..." />}>
                <InventoryCRUD />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-debugger":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryDebugger error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory debugger..." />}>
                <InventoryDebugger />
              </Suspense>
            </ErrorBoundary>
          );
        case "inventory-quick-test":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('InventoryQuickTest error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading inventory quick test..." />}>
                <InventoryQuickTest />
              </Suspense>
            </ErrorBoundary>
          );
        case "requests":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminRequests error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading customer requests..." />}>
                <AdminRequests />
              </Suspense>
            </ErrorBoundary>
          );
        case "analytics":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminAnalytics error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading analytics..." />}>
                <AdminAnalytics />
              </Suspense>
            </ErrorBoundary>
          );
        case "test":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('PaymentFlowTest error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading payment test..." />}>
                <PaymentFlowTest />
              </Suspense>
            </ErrorBoundary>
          );
        case "fix-orders":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('FixMissingOrders error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading order fixes..." />}>
                <FixMissingOrders />
              </Suspense>
            </ErrorBoundary>
          );
        case "test-flow":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('TestPaymentFlow error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading test flow..." />}>
                <TestPaymentFlow />
              </Suspense>
            </ErrorBoundary>
          );
        case "image-demo":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('ImageOptimizationDemo error:', error)}>
              <Suspense fallback={<LoadingSpinner message="Loading image demo..." />}>
                <ImageOptimizationDemo />
              </Suspense>
            </ErrorBoundary>
          );
        case "settings":
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('AdminSettings error:', error)}>
              <AdminSettings />
            </ErrorBoundary>
          );
        default:
          return (
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Default overview error:', error)}>
              <AdminOverview />
            </ErrorBoundary>
          );
      }
    } catch (error) {
      console.error(`Error rendering content for tab ${activeTab}:`, error);
      return <ErrorFallback error={error} />;
    }
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileLayout>
        <div className="flex flex-col h-screen bg-gray-50">
          {/* Mobile Header */}
          <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <div className="flex items-center gap-2">
              {FEATURE_FLAGS.ENHANCED_USER_MANAGEMENT && (
                <Badge variant="secondary" className="text-xs">Enhanced</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
              <div className="bg-white w-80 h-full p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search menu..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {(searchTerm ? filteredItems : allMenuItems).map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleTabChange(item.id)}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
                        {item.isNew && <Badge variant="secondary" className="ml-2 text-xs">New</Badge>}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Mobile Content */}
          <div className="flex-1 overflow-auto">
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Mobile content error:', error)}>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Desktop Layout with Enhanced Vertical Sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Sidebar */}
      <div className={cn(
        "bg-white shadow-lg border-r transition-all duration-300 flex flex-col",
        sidebarCollapsed ? "w-16" : "w-72"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
                <div className="flex items-center gap-2 mt-1">
                  {FEATURE_FLAGS.ENHANCED_USER_MANAGEMENT && (
                    <Badge variant="secondary" className="text-xs">Enhanced</Badge>
                  )}
                  {FEATURE_FLAGS.A_B_TESTING && (
                    <Badge variant="outline" className="text-xs">A/B Testing</Badge>
                  )}
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>
        )}

        {/* Recently Accessed */}
        {!sidebarCollapsed && recentlyAccessed.length > 0 && !searchTerm && (
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Recently Accessed</span>
            </div>
            <div className="space-y-1">
              {recentlyAccessed.slice(0, 3).map(itemId => {
                const item = allMenuItems.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <Button
                    key={itemId}
                    variant={activeTab === itemId ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleTabChange(itemId)}
                  >
                    <item.icon className="w-3 h-3 mr-2" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sidebar Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          {searchTerm ? (
            // Search Results
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start transition-all duration-200",
                    sidebarCollapsed ? "px-2" : "px-3",
                    activeTab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-gray-100"
                  )}
                  onClick={() => handleTabChange(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("w-4 h-4", !sidebarCollapsed && "mr-3")} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 text-left flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.description}
                        </div>
                      </div>
                      {item.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
                    </div>
                  )}
                </Button>
              ))}
            </div>
          ) : (
            // Categorized Menu
            <nav className="space-y-4">
              {menuCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.id);
                const CategoryIcon = category.icon;
                
                return (
                  <div key={category.id} className="space-y-1">
                    {/* Category Header */}
                    {!sidebarCollapsed && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-xs font-semibold text-muted-foreground hover:text-foreground"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <CategoryIcon className="w-4 h-4 mr-2" />
                        {category.label}
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                      </Button>
                    )}
                    
                    {/* Category Items */}
                    {(isExpanded || sidebarCollapsed) && (
                      <div className="space-y-1">
                        {category.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeTab === item.id;
                          
                          return (
                            <Button
                              key={item.id}
                              variant={isActive ? "default" : "ghost"}
                              className={cn(
                                "w-full justify-start transition-all duration-200",
                                sidebarCollapsed ? "px-2" : "px-3 ml-2",
                                isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-gray-100"
                              )}
                              onClick={() => handleTabChange(item.id)}
                              title={sidebarCollapsed ? item.label : undefined}
                            >
                              <Icon className={cn("w-4 h-4", !sidebarCollapsed && "mr-3")} />
                              {!sidebarCollapsed && (
                                <div className="flex-1 text-left flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{item.label}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {item.description}
                                    </div>
                                  </div>
                                  {item.isNew && <Badge variant="secondary" className="text-xs">New</Badge>}
                                </div>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">Admin User</div>
                <div className="text-xs text-gray-500">System Administrator</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Top Bar */}
        <div className="bg-white shadow-sm border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {allMenuItems.find(item => item.id === activeTab)?.label || "Overview"}
                </h2>
                {allMenuItems.find(item => item.id === activeTab)?.isNew && (
                  <Badge variant="secondary" className="text-xs">New</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {allMenuItems.find(item => item.id === activeTab)?.description || "Admin dashboard overview"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Admin Panel
            </Badge>
            {FEATURE_FLAGS.ENHANCED_USER_MANAGEMENT && (
              <Badge variant="secondary" className="text-xs">Enhanced</Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              View Site
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => console.error('Desktop content error:', error)}>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
