# 🎯 ToyFlix User Dashboard - Comprehensive Knowledge Base

## 📋 Table of Contents
1. [Dashboard Architecture Overview](#dashboard-architecture-overview)
2. [Core Dashboard Components](#core-dashboard-components)
3. [Data Flow and State Management](#data-flow-and-state-management)
4. [Subscription Status Display](#subscription-status-display)
5. [Cycle Management System](#cycle-management-system)
6. [Selection Window Logic](#selection-window-logic)
7. [Mobile vs Desktop Experience](#mobile-vs-desktop-experience)
8. [UI Design Patterns](#ui-design-patterns)
9. [Hooks and Services](#hooks-and-services)
10. [Common Issues and Solutions](#common-issues-and-solutions)
11. [Development Guidelines](#development-guidelines)

---

## 🏗️ Dashboard Architecture Overview

### **Multi-Dashboard System**
ToyFlix employs a sophisticated multi-dashboard architecture to handle different user scenarios and data sources:

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Entry Point                    │
│                   (src/pages/Dashboard.tsx)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                ┌─────▼─────┐
                │ Device    │
                │ Detection │
                └─────┬─────┘
                      │
            ┌─────────▼─────────┐
            │     isMobile?     │
            └─────┬─────────┬───┘
                  │ Yes     │ No
        ┌─────────▼───┐   ┌─▼──────────────┐
        │ MobileLayout│   │ Desktop Layout │
        │ + Pull to   │   │ + Header       │
        │ Refresh     │   │ + Max Width    │
        └─────────────┘   └────────────────┘
                      │
            ┌─────────▼─────────┐
            │ RentalOrdersOnly  │
            │ Dashboard         │
            │ (Main Component)  │
            └───────────────────┘
```

### **Dashboard Component Hierarchy**

#### **Primary Dashboards**
1. **`RentalOrdersOnlyDashboard`** - Main production dashboard (current)
2. **`SupabaseOnlyDashboard`** - Legacy Supabase-only data (deprecated)
3. **`SimpleDashboard`** - Hybrid data view (development/testing)

#### **Supporting Components**
- **`CycleStatusDashboard`** - Subscription cycle management
- **`SubscriptionTimeline`** - Historical subscription view
- **`NextDeliveryUpdates`** - Queue order management
- **`CombinedOrderHistory`** - Order history display
- **`QuickActions`** - Action buttons and shortcuts

---

## 🧩 Core Dashboard Components

### **1. RentalOrdersOnlyDashboard (Main Dashboard)**
**File**: `src/components/dashboard/RentalOrdersOnlyDashboard.tsx` (1,172 lines)

#### **Key Features**
- **Unified Data Source**: Primary data from `rental_orders` table
- **Real-time Updates**: React Query with 2-minute stale time
- **Mobile Responsive**: Adaptive layout for mobile/desktop
- **Tab Navigation**: Overview, Timeline, Orders, Profile
- **Action Buttons**: Context-aware action buttons
- **Selection Window Management**: Integrated toy selection logic

#### **Data Sources**
```typescript
// Primary data hook
const { data: dashboardData } = useRentalOrdersDashboard();

// Unified subscription status
const { data: unifiedStatus } = useUnifiedSubscriptionStatus();

// Selection window management
const { selectionWindow, canSelectToys } = useSubscriptionSelection();

// Next cycle management
const nextCycleManager = useNextCycleManager(user?.id);
```

#### **Component Structure**
```typescript
interface RentalOrder {
  id: string;
  order_number: string;
  user_id: string;
  cycle_number: number;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  toys_delivered_count: number;
  toys_returned_count: number;
  total_amount: number;
  toys_data: any[];
  subscription_plan: string;
  payment_status: string;
  selection_window_status?: string;
  manual_selection_control?: boolean;
}
```

### **2. CycleStatusDashboard**
**File**: `src/components/subscription/CycleStatusDashboard.tsx`

#### **Purpose**
- **Cycle Progress Tracking**: Real-time cycle day calculation
- **Selection Window Status**: Day 24-34 window management
- **Queue Management**: Next cycle toy selection
- **Action Buttons**: Context-sensitive actions

#### **Key Logic**
```typescript
const selectionEligibility = useMemo(() => {
  // Auto logic: Day 24-34
  if (cycleDay >= 24 && cycleDay <= 34) {
    canQueue = true;
    isSelectionOpen = true;
    status = 'auto_open';
    reason = `Selection window open (Day ${cycleDay} of cycle)`;
  } else if (cycleDay < 24) {
    canQueue = false;
    isSelectionOpen = false;
    status = 'auto_closed_early';
    reason = `Selection opens in ${daysUntilOpens} days (Day 24)`;
  }
}, [selectionWindowStatus]);
```

### **3. SubscriptionTimeline**
**File**: `src/components/dashboard/SubscriptionTimeline.tsx`

#### **Features**
- **Historical View**: Complete subscription journey
- **Cycle Visualization**: Visual cycle progression
- **Milestone Tracking**: Key subscription events
- **Responsive Design**: Compact mobile view

### **4. NextDeliveryUpdates**
**File**: `src/components/dashboard/NextDeliveryUpdates.tsx`

#### **Purpose**
- **Queue Order Display**: Show queued toys for next delivery
- **Status Tracking**: Queue order status updates
- **Modification Options**: Edit/cancel queue orders

### **5. Mobile-Specific Components**

#### **MobileDashboard**
**File**: `src/components/mobile/MobileDashboard.tsx`
- **Touch-Optimized**: Large touch targets
- **Simplified Layout**: Essential information only
- **Pull-to-Refresh**: Native mobile gesture support

#### **MobileLayout**
**File**: `src/components/mobile/MobileLayout.tsx`
- **Bottom Navigation**: Mobile navigation pattern
- **Header Management**: Dynamic header display
- **Safe Area Handling**: iOS/Android safe areas

---

## 🔄 Data Flow and State Management

### **Data Sources Priority**

#### **1. Primary Data Source: rental_orders**
```typescript
// Main dashboard query
const { data: rentalOrdersData } = await supabase
  .from('rental_orders')
  .select('*')
  .eq('user_id', user.id)
  .order('cycle_number', { ascending: false });
```

#### **2. Unified Status System**
```typescript
// Unified subscription status hook
export const useUnifiedSubscriptionStatus = () => {
  // Priority: rental_orders → subscriptions → user_profile → hybrid
  let source: 'rental_orders' | 'subscriptions' | 'user_profile' | 'hybrid';
  let confidence: 'high' | 'medium' | 'low';
  
  if (currentOrder && currentOrder.subscription_status === 'active') {
    source = 'rental_orders';
    confidence = 'high';
  }
};
```

#### **3. Selection Window Management**
```typescript
// Selection window service
const selectionService = SubscriptionSelectionService.getInstance();
const selectionWindow = await selectionService.calculateSelectionWindow(userId);
```

### **State Management Patterns**

#### **React Query Integration**
```typescript
// Dashboard data with optimistic updates
const { data, isLoading, refetch } = useQuery({
  queryKey: ['rental-orders-dashboard', user?.id],
  queryFn: fetchDashboardData,
  staleTime: 1000 * 60 * 2, // 2 minutes
  refetchInterval: 1000 * 60 * 5, // 5 minutes auto-refresh
});
```

#### **Multi-Hook Coordination**
```typescript
// Multiple hooks providing different aspects
const dashboardData = useRentalOrdersDashboard();
const unifiedStatus = useUnifiedSubscriptionStatus();
const selectionData = useSubscriptionSelection();
const nextCycleManager = useNextCycleManager(user?.id);
```

#### **Cache Invalidation Strategy**
```typescript
// Comprehensive cache invalidation after actions
queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard'] });
queryClient.invalidateQueries({ queryKey: ['subscription-cycle'] });
queryClient.invalidateQueries({ queryKey: ['selection-status'] });
queryClient.invalidateQueries({ queryKey: ['queued-toys'] });
```

---

## 📊 Subscription Status Display

### **Status Calculation Logic**

#### **Subscription Active Determination**
```typescript
// Multi-source subscription status
const isActive = 
  unifiedStatus?.hasActiveSubscription ?? // Unified status (primary)
  userProfile.subscription_active ?? // User profile flag
  orders.length > 0; // Has orders (fallback)
```

#### **Plan Detection**
```typescript
// Plan hierarchy
const plan = 
  unifiedStatus?.currentPlan ?? // Unified detection
  userProfile.subscription_plan ?? // Profile plan
  currentOrder?.subscription_plan ?? // Order plan
  'Discovery Delight'; // Default fallback
```

#### **Subscription Plans**
- **Discovery Delight**: ₹1,299/month - Monthly plan
- **Silver Pack**: ₹5,999/6 months - 6-month plan with big toys
- **Gold Pack PRO**: ₹7,999/6 months - Premium plan, no age restrictions

### **Status Display Components**

#### **Status Badge System**
```typescript
// Dynamic status badges
<Badge variant={isActive ? "default" : "secondary"}>
  {isActive ? "Active" : "Inactive"}
</Badge>

// Plan-specific badges
<Badge className="bg-yellow-100 text-yellow-800">
  <Crown className="w-4 h-4 mr-1" />
  Gold Pack PRO Member
</Badge>
```

#### **Welcome Message Pattern**
```typescript
// Personalized welcome with plan info
<h1 className="text-4xl font-bold text-gray-900">
  Welcome back, {displayName}!
</h1>
<p className="text-gray-600 flex items-center justify-center gap-2">
  <Crown className="w-4 h-4 text-yellow-500" />
  {plan} Member
  {monthsActive > 0 && (
    <span className="text-gray-500">• {monthsActive} months with ToyFlix</span>
  )}
</p>
```

---

## 🔄 Cycle Management System

### **30-Day Cycle Logic**

#### **Cycle Day Calculation**
```typescript
// Current cycle day calculation
const dayInCycle = Math.max(1, differenceInDays(today, startDate) + 1);
const progressPercentage = Math.min(100, (dayInCycle / 30) * 100);

// Cycle status determination
const isCurrentCycle = isWithinInterval(today, { start: startDate, end: endDate });
```

#### **Cycle Phases**
```
Day 1-23:  Toy Usage Period
Day 24-30: Selection Window (Next Cycle)
Day 31:    Cycle End → New Cycle Begins
```

#### **Progress Visualization**
```typescript
// Visual progress bar
<Progress 
  value={cycleProgress} 
  className="h-3 bg-gray-200"
/>
<span className="font-medium text-gray-900">
  {Math.round(cycleProgress)}%
</span>
```

### **Cycle Status Cards**

#### **Current Cycle Information**
```typescript
// Cycle status display
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <span className="text-gray-600">Subscription Progress</span>
    <span className="font-medium text-gray-900">
      {Math.round(cycleProgress)}%
    </span>
  </div>
  
  <Progress value={cycleProgress} className="h-3" />
  
  <p className="text-sm text-gray-600">
    Day {currentSubscriptionCycle?.current_day_in_cycle || 'N/A'} of 30 • 
    {daysUntilNextPickup} days until next pickup
  </p>
</div>
```

#### **Next Cycle Preparation**
```typescript
// Next cycle status
<div className="bg-green-100 border-green-300 rounded-lg p-3">
  <div className="flex items-center gap-2 text-green-800 font-medium">
    <Gift className="w-4 h-4" />
    {selectionMessage}
  </div>
  <p className="text-sm text-green-700 mt-1">
    {selectionWindow.isOpen ? 
      `Window closes in ${selectionWindow.daysUntilClose} days` :
      `Next window opens in ${selectionWindow.daysUntilOpen} days`
    }
  </p>
</div>
```

---

## 🎯 Selection Window Logic

### **Selection Window States**

#### **Window Status Types**
- **`auto`**: System-controlled based on cycle day
- **`manual_open`**: Admin manually opened
- **`manual_closed`**: Admin manually closed
- **`force_open`**: Admin forced open (overrides timing)
- **`force_closed`**: Admin forced closed
- **`auto_closed`**: Automatically closed after order placement
- **`auto_open`**: Automatically opened on day 24

#### **Selection Eligibility Logic**
```typescript
const selectionEligibility = useMemo(() => {
  let canQueue = false;
  let isSelectionOpen = false;
  let status = 'closed';
  let reason = '';

  if (isManualControl) {
    // Manual control is active
    if (windowStatus === 'manual_open') {
      canQueue = true;
      isSelectionOpen = true;
      status = 'manual_open';
      reason = 'Selection window manually opened by admin';
    } else {
      canQueue = false;
      isSelectionOpen = false;
      status = 'manual_closed';
      reason = 'Selection window manually closed by admin';
    }
  } else {
    // Auto logic: Day 24-34
    if (cycleDay >= 24 && cycleDay <= 34) {
      canQueue = true;
      isSelectionOpen = true;
      status = 'auto_open';
      reason = `Selection window open (Day ${cycleDay} of cycle)`;
    } else if (cycleDay < 24) {
      canQueue = false;
      isSelectionOpen = false;
      status = 'auto_closed_early';
      reason = `Selection opens in ${daysUntilOpens} days (Day 24)`;
    }
  }
}, [selectionWindowStatus]);
```

### **Action Button Logic**

#### **Select Toys Button**
```typescript
// Button rendering logic
{selectionEligibility.canQueue && !hasQueue && (
  <Button 
    onClick={() => navigate('/select-toys')}
    className="flex-1"
    disabled={shouldDisableSelection}
  >
    <Package className="h-4 w-4 mr-2" />
    Select Toys for Next Cycle
  </Button>
)}

// Disable logic
const shouldDisableSelection = hasQueuedToys || 
  (selectionWindow?.status === 'closed' && 
   (selectionWindow?.reason?.includes('queue order') || 
    selectionWindow?.reason?.includes('order placement')));
```

#### **Button States and Feedback**
```typescript
// Disabled state feedback
if (shouldDisableSelection) {
  sonnerToast.info('Toy selection is currently disabled', {
    description: hasQueuedToys 
      ? 'You have already selected toys for your next delivery'
      : 'Selection window was closed after placing an order'
  });
  return;
}
```

---

## 📱 Mobile vs Desktop Experience

### **Responsive Design Breakpoints**

#### **Mobile (< 768px)**
```typescript
const MOBILE_BREAKPOINT = 768;

// Mobile-specific adaptations
const isMobile = useIsMobile();

// Conditional styling
className={`${isMobile ? 'p-4 space-y-4' : 'p-6 space-y-6'}`}
```

#### **Layout Differences**

| Feature | Mobile | Desktop |
|---------|--------|---------|
| **Layout** | Single column, stacked | Multi-column grid |
| **Navigation** | Bottom nav + tabs | Top header + sidebar |
| **Cards** | Full width, compact | Grid layout, spacious |
| **Buttons** | Full width, large | Inline, standard size |
| **Typography** | Smaller text, condensed | Standard text, comfortable |
| **Spacing** | `p-4 space-y-4` | `p-6 space-y-6` |

### **Mobile-Specific Features**

#### **Pull-to-Refresh**
```typescript
// Mobile pull-to-refresh implementation
<MobilePullToRefresh onRefresh={handleRefresh}>
  {content}
</MobilePullToRefresh>
```

#### **Touch-Optimized Interactions**
```typescript
// Large touch targets for mobile
<Button 
  size={isMobile ? "lg" : "sm"}
  className={`${isMobile ? 'w-full' : ''} ${isMobile ? 'text-sm' : 'text-xs'}`}
>
```

#### **Mobile Layout Wrapper**
```typescript
// Mobile layout with bottom navigation
if (isMobile) {
  return (
    <MobileLayout title="Dashboard" showHeader={true} showBottomNav={true}>
      <MobilePullToRefresh onRefresh={handleRefresh}>
        {content}
      </MobilePullToRefresh>
    </MobileLayout>
  );
}
```

---

## 🎨 UI Design Patterns

### **Card-Based Layout System**

#### **Primary Card Structure**
```typescript
// Standard card pattern
<Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-blue-600" />
      Title
      <Badge variant="default">Status</Badge>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

#### **Status-Based Color Coding**
```typescript
// Dynamic color themes based on status
const cardTheme = {
  critical: 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50',
  urgent: 'border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50',
  active: 'border-green-200 bg-gradient-to-r from-green-50 to-blue-50',
  normal: 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
};
```

### **Icon System**

#### **Semantic Icon Usage**
```typescript
// Icon mapping for different contexts
const iconMap = {
  subscription: <Crown className="w-5 h-5" />,
  cycle: <Calendar className="w-5 h-5" />,
  toys: <Package className="w-5 h-5" />,
  delivery: <Truck className="w-5 h-5" />,
  selection: <Gift className="w-5 h-5" />,
  progress: <TrendingUp className="w-5 h-5" />,
  alert: <AlertCircle className="w-5 h-5" />,
  urgent: <Zap className="w-5 h-5" />
};
```

### **Typography Hierarchy**

#### **Text Size System**
```typescript
// Responsive typography
const textSizes = {
  hero: isMobile ? 'text-3xl' : 'text-4xl',
  title: isMobile ? 'text-lg' : 'text-xl',
  subtitle: isMobile ? 'text-sm' : 'text-base',
  body: isMobile ? 'text-xs' : 'text-sm',
  caption: isMobile ? 'text-xs' : 'text-xs'
};
```

#### **Color System**
```typescript
// Status-based color system
const colorSystem = {
  primary: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-orange-600',
  error: 'text-red-600',
  muted: 'text-gray-600',
  emphasis: 'text-gray-900'
};
```

### **Button Design Patterns**

#### **Action Button Types**
```typescript
// Primary actions
<Button variant="default" className="bg-green-500 hover:bg-green-600">
  Primary Action
</Button>

// Secondary actions
<Button variant="outline" className="border-blue-200">
  Secondary Action
</Button>

// Destructive actions
<Button variant="destructive">
  Delete/Cancel
</Button>
```

#### **Button States**
```typescript
// Loading state
<Button disabled={isLoading}>
  {isLoading ? 'Processing...' : 'Action'}
</Button>

// Success state
<Button className="bg-green-600 text-white">
  <CheckCircle className="w-4 h-4 mr-2" />
  Completed
</Button>
```

---

## 🔧 Hooks and Services

### **Core Dashboard Hooks**

#### **useRentalOrdersDashboard**
```typescript
export const useRentalOrdersDashboard = () => {
  return useQuery<DashboardData>({
    queryKey: ['rental-orders-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      // Fetch user profile
      // Fetch rental orders
      // Calculate cycle info
      // Process subscription data
      // Return unified dashboard data
    }
  });
};
```

#### **useUnifiedSubscriptionStatus**
```typescript
export const useUnifiedSubscriptionStatus = () => {
  return useQuery<UnifiedSubscriptionStatus>({
    queryKey: ['unified-subscription-status', user?.id],
    queryFn: async () => {
      // Check rental_orders (primary)
      // Check subscriptions table (secondary)
      // Check user_profile flags (fallback)
      // Return unified status with confidence scoring
    }
  });
};
```

#### **useSubscriptionSelection**
```typescript
export const useSubscriptionSelection = () => {
  return {
    cycleData,           // Current cycle information
    selectionWindow,     // Selection window status
    selectionRules,      // Plan-specific rules
    canSelectToys,       // Boolean eligibility
    isSelectionUrgent,   // Time-based urgency
    selectionMessage,    // User-friendly status message
    getActionButtons,    // Context-aware action buttons
    refreshData,         // Manual refresh function
    handleEdgeCase       // Edge case handling
  };
};
```

#### **useNextCycleManager**
```typescript
export const useNextCycleManager = (userId: string) => {
  return {
    hasQueue,            // Has queued toys
    queuedToys,          // Queued toy details
    toyLimit,            // Plan toy limit
    hasActiveSubscription, // Subscription status
    eligibility,         // Queue eligibility
    removeToys,          // Remove queued toys
    isRemoving          // Loading state
  };
};
```

### **Supporting Services**

#### **SubscriptionService**
```typescript
export class SubscriptionService {
  // Cycle data calculation
  static calculateCycleData(subscription: any): SubscriptionCycle | null
  
  // Selection window control
  static async controlSelectionWindow(rentalOrderId: string, action: 'open' | 'close')
  
  // Auto-close after order
  static async closeSelectionWindowAfterOrder(userId: string, orderType: string)
}
```

#### **SubscriptionSelectionService**
```typescript
export class SubscriptionSelectionService {
  // Selection window calculation
  public async calculateSelectionWindow(userId: string): Promise<SubscriptionSelectionWindow>
  
  // Selection rules
  public async getSelectionRules(userId: string): Promise<SubscriptionSelectionRules>
  
  // Cycle data
  public async getSubscriptionCycleData(userId: string): Promise<SubscriptionCycleData>
}
```

---

## 📋 Dashboard Features and Capabilities

### **Core Features**

#### **1. Subscription Overview**
- **Current Plan Display**: Plan name, pricing, duration
- **Membership Duration**: Months active with ToyFlix
- **Subscription Status**: Active/Inactive with visual indicators
- **Financial Summary**: Total spent, average order value

#### **2. Cycle Progress Tracking**
- **Current Cycle Day**: Day X of 30
- **Progress Visualization**: Animated progress bar
- **Days Remaining**: Until next pickup/cycle end
- **Cycle Number**: Current cycle in subscription

#### **3. Selection Window Management**
- **Window Status**: Open/Closed/Upcoming
- **Timing Information**: Days until opens/closes
- **Action Buttons**: Select toys, modify queue
- **Admin Overrides**: Manual open/close capability

#### **4. Queue Management**
- **Queued Toys Display**: Next delivery toys
- **Modification Options**: Edit/cancel queue
- **Status Tracking**: Queue order processing status
- **Delivery Estimates**: Expected delivery dates

#### **5. Order History**
- **Recent Orders**: Last 5-10 orders
- **Order Details**: Status, amount, toys
- **Timeline View**: Historical subscription journey
- **Export Options**: Download order history

### **Advanced Features**

#### **6. Real-time Updates**
- **Auto-refresh**: 5-minute intervals
- **Manual Refresh**: Pull-to-refresh on mobile
- **Live Status**: Real-time selection window updates
- **Cache Management**: Optimistic updates

#### **7. User Actions**
- **Toy Selection**: Navigate to selection wizard
- **Profile Management**: Edit user information
- **Subscription Control**: Pause/resume subscription
- **Support Access**: WhatsApp integration

#### **8. Admin Features**
- **Impersonation Support**: Admin can view as user
- **Debug Information**: Data source and confidence display
- **Manual Overrides**: Selection window control
- **Audit Trail**: Action logging

---

## 🔄 Common Issues and Solutions

### **Data Mismatch Issues**

#### **Issue 1: Selection Window Timing Mismatch**
**Problem**: Shows "Selection opens in 19 days" but "Select Toys" button is active

**Root Cause**: Multiple calculation methods using different data sources
```typescript
// Problem: Different hooks using different logic
const timing1 = calculateFromCycleStart(startDate); // Shows 19 days
const timing2 = checkDatabaseStatus(windowStatus); // Shows active
```

**Solution**: Unified calculation with database status priority
```typescript
// Enhanced logic with database override
const isSelectionWindow = isCurrentCycle && dayInCycle >= 24 && dayInCycle <= 30;

// Database status override
if (userProfile.phone?.startsWith('+91') && currentOrder) {
  const isDatabaseClosed = currentOrder.selection_window_status === 'manual_closed' || 
                          currentOrder.selection_window_status === 'force_closed' ||
                          currentOrder.selection_window_status === 'auto_closed';
  if (isDatabaseClosed) {
    isSelectionWindow = false; // Override timing logic
  }
}
```

#### **Issue 2: Multiple Data Sources Conflict**
**Problem**: Different components show different subscription status

**Solution**: Unified subscription status hook
```typescript
// Unified status with priority system
const unifiedStatus = useUnifiedSubscriptionStatus();
const isActive = unifiedStatus?.hasActiveSubscription ?? legacyIsActive;
const plan = unifiedStatus?.currentPlan ?? legacyPlan;
```

#### **Issue 3: Button State Inconsistency**
**Problem**: Buttons remain active after actions

**Solution**: Enhanced disable logic
```typescript
const shouldDisableSelection = hasQueuedToys || 
  (selectionWindow?.status === 'closed' && 
   (selectionWindow?.reason?.includes('queue order') || 
    selectionWindow?.reason?.includes('order placement')));
```

### **Performance Issues**

#### **Issue 1: Slow Dashboard Loading**
**Solution**: Optimized queries with proper stale times
```typescript
// Optimized query configuration
{
  staleTime: 1000 * 60 * 2, // 2 minutes
  refetchInterval: 1000 * 60 * 5, // 5 minutes
  retry: 1, // Limited retries
}
```

#### **Issue 2: Excessive Re-renders**
**Solution**: Memoized calculations and useMemo
```typescript
// Memoized expensive calculations
const selectionEligibility = useMemo(() => {
  // Complex calculation logic
}, [selectionWindowStatus, cycleDay]);
```

---

## 🛠️ Development Guidelines

### **Adding New Dashboard Features**

#### **1. Data Integration**
```typescript
// Always use unified data sources
const dashboardData = useRentalOrdersDashboard();
const unifiedStatus = useUnifiedSubscriptionStatus();

// Avoid direct database calls in components
// Use established hooks and services
```

#### **2. Responsive Design**
```typescript
// Always consider mobile experience
const isMobile = useIsMobile();

// Use conditional styling
className={`${isMobile ? 'mobile-class' : 'desktop-class'}`}

// Test on mobile devices
```

#### **3. State Management**
```typescript
// Use React Query for server state
const { data, isLoading, refetch } = useQuery({
  queryKey: ['feature-data', userId],
  queryFn: fetchFeatureData
});

// Use useState for UI state only
const [showModal, setShowModal] = useState(false);
```

#### **4. Error Handling**
```typescript
// Graceful error handling
if (error || !data) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Title</h3>
        <p className="text-gray-600 mb-4">User-friendly error message</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
```

### **Performance Best Practices**

#### **1. Query Optimization**
```typescript
// Efficient query patterns
const { data } = useQuery({
  queryKey: ['data', userId, dependency],
  queryFn: optimizedFetchFunction,
  enabled: !!userId, // Conditional execution
  staleTime: appropriateStaleTime,
  select: (data) => processedData // Transform data
});
```

#### **2. Component Optimization**
```typescript
// Memoize expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for calculations
const calculatedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

#### **3. Bundle Optimization**
```typescript
// Dynamic imports for large dependencies
const handleAction = async () => {
  const { LargeService } = await import('@/services/largeService');
  await LargeService.performAction();
};
```

### **Testing Considerations**

#### **1. Data Scenarios**
- **New User**: No subscription history
- **Active Subscriber**: Current cycle with toys
- **Selection Window**: Day 24-34 of cycle
- **Queue Orders**: Toys selected for next cycle
- **Expired Subscription**: Past subscription
- **Multiple Cycles**: Long-term subscriber

#### **2. Device Testing**
- **Mobile Devices**: iOS Safari, Android Chrome
- **Tablet**: iPad, Android tablets
- **Desktop**: Chrome, Firefox, Safari
- **Touch vs Mouse**: Different interaction patterns

#### **3. Edge Cases**
- **Network Failures**: Offline scenarios
- **Data Inconsistency**: Multiple data sources
- **Admin Impersonation**: Admin viewing as user
- **Legacy Data**: WooCommerce migrated users

---

## 🎯 Key Takeaways for AI Development

### **Dashboard Complexity**
- **Multi-component Architecture**: 20+ dashboard-related components
- **Responsive Design**: Mobile-first with desktop enhancements
- **Real-time Data**: Live updates with React Query
- **Complex State**: Multiple data sources requiring unification

### **Business Logic Priority**
- **Subscription Status**: Primary business metric
- **Cycle Management**: 30-day cycles with selection windows
- **User Experience**: Seamless mobile experience
- **Data Consistency**: Unified status across components

### **Technical Patterns**
- **Hook-based Architecture**: Custom hooks for data and logic
- **Service Layer**: Business logic in service classes
- **Component Composition**: Reusable UI components
- **Error Boundaries**: Graceful error handling

### **Mobile-First Design**
- **Touch Optimization**: Large touch targets
- **Performance**: Optimized for mobile networks
- **Native Patterns**: Pull-to-refresh, bottom navigation
- **Responsive**: Adaptive layout for all screen sizes

### **Data Management**
- **Unified Status**: Single source of truth for subscription status
- **Cache Strategy**: Appropriate stale times and refresh intervals
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Retry mechanisms and fallbacks

This comprehensive knowledge base provides complete context for AI agents working with the ToyFlix user dashboard system, enabling informed decision-making for feature development, debugging, and system enhancements.
