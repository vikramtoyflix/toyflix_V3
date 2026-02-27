# 🎯 ToyFlix User Dashboard - AI Assistant Knowledge Base

## 📋 Table of Contents
1. [Dashboard Architecture Overview](#dashboard-architecture-overview)
2. [Core Components & Data Flow](#core-components--data-flow)
3. [User States & Journey Flows](#user-states--journey-flows)
4. [Subscription & Cycle Management](#subscription--cycle-management)
5. [Toy Selection & Queue System](#toy-selection--queue-system)
6. [Mobile vs Desktop Experience](#mobile-vs-desktop-experience)
7. [Hooks & Services Architecture](#hooks--services-architecture)
8. [UI Components & Patterns](#ui-components--patterns)
9. [Common Development Scenarios](#common-development-scenarios)
10. [Troubleshooting & Edge Cases](#troubleshooting--edge-cases)
11. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## 🏗️ Dashboard Architecture Overview

### **Multi-Dashboard System Architecture**

ToyFlix uses a sophisticated multi-dashboard system to handle different user scenarios and data sources:

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
   - **File**: `src/components/dashboard/RentalOrdersOnlyDashboard.tsx` (1,172 lines)
   - **Purpose**: Unified data source from `rental_orders` table
   - **Features**: Real-time updates, mobile responsive, tab navigation

2. **`SupabaseOnlyDashboard`** - Legacy Supabase-only data (deprecated)
3. **`SimpleDashboard`** - Hybrid data view (development/testing)

#### **Supporting Components**
- **`CycleStatusDashboard`** - Subscription cycle management
- **`SubscriptionTimeline`** - Historical subscription view  
- **`NextDeliveryUpdates`** - Queue order management
- **`CombinedOrderHistory`** - Order history display
- **`QuickActions`** - Action buttons and shortcuts

---

## 🧩 Core Components & Data Flow

### **1. Main Dashboard Data Hook**

```typescript
// Primary data query in RentalOrdersOnlyDashboard
const { data: dashboardData, isLoading, error, refetch } = useQuery({
  queryKey: ['rental-orders-dashboard', user?.id],
  queryFn: async () => {
    // Enhanced subscription status using database views
    const enhancedSubscriptionStatus = await SubscriptionService.getEnhancedSubscriptionStatus(user.id);
    
    // Current subscription cycle using database view
    const currentSubscriptionCycle = await SubscriptionService.getCurrentSubscriptionCycle(user.id);
    
    // Upcoming cycles and history
    const upcomingCycles = await SubscriptionService.getUpcomingCycles(user.id);
    const cycleHistory = await SubscriptionService.getCycleHistory(user.id);
    
    return { enhancedSubscriptionStatus, currentSubscriptionCycle, upcomingCycles, cycleHistory };
  },
  enabled: !!user?.id,
  staleTime: 1000 * 60 * 2, // 2 minutes
  refetchInterval: 1000 * 60 * 5, // 5 minutes
});
```

### **2. Key Data Sources**

#### **Database Tables**
- **`custom_users`** - User profile information
- **`rental_orders`** - Main order management (primary data source)
- **`subscriptions`** - Subscription records
- **`subscription_cycles`** - Cycle management
- **`user_entitlements`** - Monthly toy allowances
- **`queue_orders`** - Next cycle toy selections
- **`toys`** - Toy catalog with inventory

#### **Service Layer**
- **`SubscriptionService`** - Core subscription logic
- **`NextCycleService`** - Queue management
- **`CycleIntegrationService`** - Cycle operations
- **`SubscriptionSelectionService`** - Selection window logic

---

## 🚶 User States & Journey Flows

### **User State Matrix**

| User Type | Subscription Status | Dashboard View | Available Actions |
|-----------|-------------------|----------------|-------------------|
| **New User** | No subscription | Welcome screen | Browse plans, start subscription |
| **Active Subscriber** | Active subscription | Full dashboard | Select toys, manage queue, view orders |
| **Selection Window** | Active + Day 24-34 | Enhanced dashboard | Select next cycle toys |
| **Paused Subscriber** | Paused subscription | Limited dashboard | Resume subscription, view history |
| **Expired Subscriber** | Expired subscription | Renewal prompt | Renew subscription |
| **Admin User** | Any status | Admin dashboard | All admin functions |

### **Dashboard State Flow**

```typescript
// User state determination logic
const determineUserState = (user, subscriptionData) => {
  if (!user) return 'unauthenticated';
  if (user.role === 'admin') return 'admin';
  if (!subscriptionData?.hasActiveSubscription) return 'no_subscription';
  if (subscriptionData.status === 'paused') return 'paused';
  if (subscriptionData.isSelectionWindowOpen) return 'selection_window';
  return 'active_subscriber';
};
```

### **Navigation Flow**

1. **Authentication** (`/auth`) → Phone OTP verification
2. **Dashboard** (`/dashboard`) → Main user interface
3. **Toy Selection** (`/select-toys`) → Selection wizard
4. **Queue Management** → Integrated in dashboard
5. **Order History** → Tab in dashboard
6. **Profile Management** → Modal dialogs

---

## 📅 Subscription & Cycle Management

### **Cycle Management System**

```typescript
interface SubscriptionCycle {
  id: string;
  subscription_id: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  selection_window_start: string; // Day 24
  selection_window_end: string;   // Day 34
  cycle_status: 'upcoming' | 'active' | 'selection_open' | 'completed';
  selected_toys: any[];
  delivery_status: string;
}
```

### **Selection Window Logic**

```typescript
// Selection window calculation
const calculateSelectionWindow = (cycleStartDate: string) => {
  const startDate = new Date(cycleStartDate);
  const currentDate = new Date();
  const cycleDay = differenceInDays(currentDate, startDate) + 1;
  
  const isSelectionOpen = cycleDay >= 24 && cycleDay <= 34;
  const daysUntilOpens = Math.max(0, 24 - cycleDay);
  const daysUntilCloses = Math.max(0, 34 - cycleDay);
  
  return {
    cycleDay,
    isSelectionOpen,
    daysUntilOpens,
    daysUntilCloses,
    status: isSelectionOpen ? 'open' : 'closed'
  };
};
```

### **Subscription Plans**

1. **Discovery Delight**: ₹1,299/month
   - 3 educational toys + 1 book
   - Monthly cycle
   - Basic plan for new customers

2. **Silver Pack**: ₹5,999/6 months  
   - 3 toys + 1 book + access to big toys
   - 6-month commitment

3. **Gold Pack PRO**: ₹7,999/6 months
   - Premium toys with no age restrictions
   - Access to all toy categories

---

## 🎮 Toy Selection & Queue System

### **Next Cycle Queue Management**

```typescript
// Next Cycle Manager Hook
const useNextCycleManager = (userId: string) => {
  const {
    eligibility,
    queuedToys,
    subscriptionDetails,
    isLoadingEligibility,
    isLoadingQueue,
    hasQueue,
    hasActiveSubscription,
    toyLimit,
    queuedToyCount,
    removeToys,
    isRemoving
  } = useNextCycleManager(userId);
  
  return {
    // Queue status
    hasQueue,
    queuedToys,
    queuedToyCount,
    toyLimit,
    
    // Actions
    removeToys,
    refreshQueue: () => queryClient.invalidateQueries(['next-cycle-queue', userId]),
    
    // Loading states
    isLoading: isLoadingQueue || isLoadingEligibility
  };
};
```

### **Toy Selection Wizard**

```typescript
// Toy Selection Flow
interface ToySelectionWizardProps {
  planId: string;
  ageGroup: string;
  onComplete: (toys: Toy[]) => void;
  isQueueManagement?: boolean;
}

const ToySelectionWizard = ({ planId, ageGroup, onComplete, isQueueManagement }) => {
  const {
    currentStep,
    stepSelections,
    isComplete,
    selectionSteps,
    currentStepInfo,
    handleToySelect,
    handleNextStep,
    handleComplete
  } = useToySelectionLogic(planId);
  
  // Selection steps based on plan
  const getSelectionSteps = (planId: string) => {
    switch (planId) {
      case 'discovery-delight':
        return [
          { category: 'educational_toys', required: 3 },
          { category: 'books', required: 1 }
        ];
      case 'silver-pack':
        return [
          { category: 'educational_toys', required: 2 },
          { category: 'big_toys', required: 1 },
          { category: 'books', required: 1 }
        ];
      case 'gold-pack':
        return [
          { category: 'premium_toys', required: 3, ageRestriction: false }
        ];
    }
  };
};
```

---

## 📱 Mobile vs Desktop Experience

### **Responsive Design Patterns**

```typescript
// Mobile Detection and Layout
const Dashboard = () => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <MobileLayout>
        <MobilePullToRefresh onRefresh={refetch}>
          <RentalOrdersOnlyDashboard />
        </MobilePullToRefresh>
      </MobileLayout>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <DashboardHeader />
      <RentalOrdersOnlyDashboard />
    </div>
  );
};
```

### **Mobile-Specific Features**

- **Pull-to-Refresh**: Refresh dashboard data
- **Tab Navigation**: Overview, Timeline, Orders, Profile
- **Floating Action Button**: Quick toy selection
- **Swipe Gestures**: Navigate between sections
- **Optimized Touch Targets**: Larger buttons and touch areas

### **Desktop-Specific Features**

- **Sidebar Navigation**: Persistent navigation
- **Multi-column Layout**: Better space utilization
- **Hover States**: Interactive feedback
- **Keyboard Shortcuts**: Quick actions
- **Advanced Filtering**: More complex UI elements

---

## 🔧 Hooks & Services Architecture

### **Core Dashboard Hooks**

#### **1. useUnifiedSubscriptionStatus**
```typescript
const useUnifiedSubscriptionStatus = () => {
  return useQuery({
    queryKey: ['unified-subscription-status', user?.id],
    queryFn: async () => {
      // Unified subscription status across all data sources
      const rentalOrdersStatus = await SubscriptionService.getEnhancedSubscriptionStatus(user.id);
      const supabaseStatus = await SubscriptionService.getSupabaseSubscriptionStatus(user.id);
      
      return {
        hasActiveSubscription: rentalOrdersStatus.hasActiveSubscription || supabaseStatus.hasActiveSubscription,
        currentPlan: rentalOrdersStatus.currentPlan || supabaseStatus.currentPlan,
        source: rentalOrdersStatus.hasActiveSubscription ? 'rental_orders' : 'supabase'
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
```

#### **2. useSubscriptionSelection**
```typescript
const useSubscriptionSelection = (options = {}) => {
  const {
    cycleData,
    selectionWindow,
    selectionRules,
    notifications,
    canSelectToys,
    isSelectionUrgent,
    selectionStatus,
    selectionMessage,
    refreshData,
    getActionButtons
  } = useSubscriptionSelection({
    enableNotifications: true,
    enableRealTimeUpdates: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
  
  return {
    // Selection state
    canSelectToys,
    selectionWindow,
    selectionStatus,
    
    // Actions
    refreshData,
    getActionButtons,
    
    // Notifications
    notifications,
    isSelectionUrgent
  };
};
```

#### **3. useNextCycleManager**
```typescript
const useNextCycleManager = (userId: string) => {
  const eligibility = useQuery({
    queryKey: ['next-cycle-eligibility', userId],
    queryFn: () => SubscriptionService.checkQueueEligibility(userId),
  });
  
  const queuedToys = useQuery({
    queryKey: ['next-cycle-queue', userId],
    queryFn: () => NextCycleService.getQueuedToys(userId),
  });
  
  return {
    eligibility: eligibility.data,
    queuedToys: queuedToys.data?.toys || [],
    hasQueue: queuedToys.data?.hasQueue || false,
    toyLimit: eligibility.data?.toyLimit || 3,
    refreshQueue: () => queryClient.invalidateQueries(['next-cycle-queue', userId]),
  };
};
```

### **Service Layer Architecture**

#### **SubscriptionService**
```typescript
export class SubscriptionService {
  // Core subscription operations
  static async getEnhancedSubscriptionStatus(userId: string) { /* ... */ }
  static async getCurrentSubscriptionCycle(userId: string) { /* ... */ }
  static async checkQueueEligibility(userId: string) { /* ... */ }
  
  // Selection window management
  static async calculateSelectionWindow(userId: string) { /* ... */ }
  static async openSelectionWindow(userId: string) { /* ... */ }
  static async closeSelectionWindow(userId: string) { /* ... */ }
}
```

#### **NextCycleService**
```typescript
export class NextCycleService {
  // Queue operations
  static async queueToysForNextCycle(userId: string, toys: ToyData[]) { /* ... */ }
  static async getQueuedToys(userId: string) { /* ... */ }
  static async removeToysFromQueue(userId: string, toyIds: string[]) { /* ... */ }
  
  // Cycle processing
  static async processNextCycle(userId: string) { /* ... */ }
}
```

---

## 🎨 UI Components & Patterns

### **Dashboard Tab Structure**

```typescript
const DashboardTabs = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="profile">Profile</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <OverviewTab />
      </TabsContent>
      <TabsContent value="timeline">
        <SubscriptionTimeline />
      </TabsContent>
      <TabsContent value="orders">
        <CombinedOrderHistory />
      </TabsContent>
      <TabsContent value="profile">
        <ProfileManagement />
      </TabsContent>
    </Tabs>
  );
};
```

### **Status Badge Components**

```typescript
const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { variant: 'success', text: 'Active', icon: CheckCircle },
    paused: { variant: 'warning', text: 'Paused', icon: Pause },
    expired: { variant: 'destructive', text: 'Expired', icon: AlertCircle },
    selection_open: { variant: 'info', text: 'Selection Open', icon: Clock }
  };
  
  const config = statusConfig[status] || statusConfig.active;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <config.icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};
```

### **Action Button Patterns**

```typescript
const getActionButtons = () => {
  const buttons = [];
  
  if (canSelectToys) {
    buttons.push({
      label: 'Select Toys',
      action: () => navigate('/select-toys'),
      variant: 'default',
      icon: Package
    });
  }
  
  if (hasQueue) {
    buttons.push({
      label: 'Manage Queue',
      action: () => setShowQueueManagement(true),
      variant: 'outline',
      icon: Settings
    });
  }
  
  return buttons;
};
```

---

## 🛠️ Common Development Scenarios

### **1. Adding New Dashboard Features**

```typescript
// 1. Create new hook for data fetching
const useNewFeature = (userId: string) => {
  return useQuery({
    queryKey: ['new-feature', userId],
    queryFn: () => NewFeatureService.getData(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// 2. Add to main dashboard component
const RentalOrdersOnlyDashboard = () => {
  const { data: newFeatureData } = useNewFeature(user?.id);
  
  // 3. Add to UI
  return (
    <div>
      {/* Existing dashboard content */}
      <NewFeatureComponent data={newFeatureData} />
    </div>
  );
};
```

### **2. Modifying Selection Window Logic**

```typescript
// Update selection window calculation
const updateSelectionWindowLogic = async (userId: string, newRules: SelectionRules) => {
  try {
    // 1. Update database rules
    await SubscriptionService.updateSelectionRules(userId, newRules);
    
    // 2. Invalidate related queries
    queryClient.invalidateQueries(['subscription-selection', userId]);
    queryClient.invalidateQueries(['cycle-status', userId]);
    
    // 3. Show success message
    toast.success('Selection window rules updated');
  } catch (error) {
    toast.error('Failed to update selection rules');
  }
};
```

### **3. Adding New User States**

```typescript
// 1. Extend user state enum
type UserState = 'new_user' | 'active' | 'paused' | 'expired' | 'trial' | 'new_state';

// 2. Update state determination logic
const determineUserState = (user, subscription): UserState => {
  if (/* new condition */) return 'new_state';
  // ... existing logic
};

// 3. Add UI handling
const renderDashboardForState = (state: UserState) => {
  switch (state) {
    case 'new_state':
      return <NewStateComponent />;
    // ... existing cases
  }
};
```

---

## 🚨 Troubleshooting & Edge Cases

### **Common Issues**

#### **1. Selection Window Not Opening**
```typescript
// Debug selection window status
const debugSelectionWindow = async (userId: string) => {
  const cycleData = await SubscriptionService.getCurrentSubscriptionCycle(userId);
  
  console.log('Selection Window Debug:', {
    cycleDay: cycleData?.current_cycle_day,
    manualControl: cycleData?.manual_selection_control,
    windowStatus: cycleData?.selection_window_status,
    expectedOpen: cycleData?.current_cycle_day >= 24 && cycleData?.current_cycle_day <= 34
  });
};
```

#### **2. Queue Data Inconsistency**
```typescript
// Sync queue data across tables
const syncQueueData = async (userId: string) => {
  try {
    // Check both queue sources
    const nextCycleQueue = await NextCycleService.getQueuedToys(userId);
    const rentalOrderQueue = await SubscriptionService.getRentalOrderQueue(userId);
    
    if (nextCycleQueue.hasQueue !== rentalOrderQueue.hasQueue) {
      // Resolve inconsistency
      await NextCycleService.reconcileQueueData(userId);
    }
  } catch (error) {
    console.error('Queue sync failed:', error);
  }
};
```

#### **3. Mobile Layout Issues**
```typescript
// Mobile-specific debugging
const debugMobileLayout = () => {
  const isMobile = useIsMobile();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    userAgent: navigator.userAgent
  };
  
  console.log('Mobile Debug:', { isMobile, viewport });
};
```

### **Edge Case Handling**

```typescript
// Handle edge cases in dashboard
const handleEdgeCases = (dashboardData) => {
  // No subscription but has orders
  if (!dashboardData.subscription && dashboardData.orders?.length > 0) {
    return 'orphaned_orders';
  }
  
  // Selection window stuck open
  if (dashboardData.selectionWindow?.isOpen && dashboardData.cycle?.day > 34) {
    return 'stuck_selection_window';
  }
  
  // Multiple active subscriptions
  if (dashboardData.subscriptions?.length > 1) {
    return 'multiple_subscriptions';
  }
  
  return 'normal';
};
```

---

## 🤖 AI Assistant Guidelines

### **When Working with Dashboard Code**

#### **1. Understanding Context**
- Always check user authentication state first
- Identify current subscription status and cycle day
- Understand mobile vs desktop context
- Check for admin impersonation mode

#### **2. Data Flow Analysis**
- Primary data source: `rental_orders` table
- Fallback data sources: `subscriptions`, `subscription_tracking`
- Real-time updates via React Query with 2-5 minute stale time
- Cache invalidation on user actions

#### **3. Component Hierarchy**
- Entry point: `src/pages/Dashboard.tsx`
- Main component: `src/components/dashboard/RentalOrdersOnlyDashboard.tsx`
- Supporting components in `src/components/dashboard/` and `src/components/subscription/`

#### **4. Common Patterns**
- Use `useQuery` for data fetching with proper error handling
- Implement loading states for all async operations
- Show appropriate error messages for failed operations
- Use optimistic updates for better UX

#### **5. Testing Considerations**
- Test across different user states
- Verify mobile responsive behavior
- Check selection window logic edge cases
- Validate queue management operations

### **Code Modification Guidelines**

#### **1. Adding New Features**
```typescript
// Follow this pattern for new features
const useNewDashboardFeature = (userId: string) => {
  return useQuery({
    queryKey: ['new-feature', userId],
    queryFn: async () => {
      // Implement data fetching logic
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    onError: (error) => {
      console.error('New feature error:', error);
      toast.error('Failed to load new feature');
    }
  });
};
```

#### **2. Modifying Existing Logic**
- Always check for backward compatibility
- Update related hooks and services
- Test across different user scenarios
- Update loading and error states

#### **3. Performance Considerations**
- Use React Query for caching and background updates
- Implement proper loading states
- Avoid unnecessary re-renders with `useMemo` and `useCallback`
- Lazy load heavy components

### **Debugging Workflow**

1. **Check Authentication**: Verify user is logged in and has proper permissions
2. **Inspect Data Sources**: Check which data source is being used (rental_orders vs subscriptions)
3. **Validate State**: Ensure component state matches expected user journey
4. **Test Responsive**: Verify mobile and desktop layouts work correctly
5. **Check Network**: Inspect API calls and response data
6. **Validate Business Logic**: Ensure selection windows and cycle logic work correctly

### **Best Practices**

- **Error Boundaries**: Implement error boundaries for dashboard sections
- **Loading States**: Show skeleton loaders for better UX
- **Accessibility**: Ensure proper ARIA labels and keyboard navigation
- **Performance**: Use React.memo for expensive components
- **Testing**: Write unit tests for business logic, integration tests for user flows

This knowledge base provides comprehensive context for AI assistants working with the ToyFlix user dashboard codebase, enabling efficient development and troubleshooting.
