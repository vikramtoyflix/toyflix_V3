# Supabase-Only User Dashboard Implementation Plan

## 🎯 **Overview**
Complete implementation plan for a Supabase-only user dashboard that shows migrated WooCommerce data with 24-day rental cycle management and pickup date calculations.

## 📊 **Database Schema Analysis**

### **Core Tables Structure**
```sql
custom_users (UUID id) 
├── orders (user_id → custom_users.id)
│   ├── order_items (order_id → orders.id, toy_id → toys.id)
│   └── toys (id referenced by order_items.toy_id)
└── subscriptions (user_id → custom_users.id)
    └── user_entitlements (user_id → custom_users.id, subscription_id → subscriptions.id)
```

### **Key Data Points**
- **User**: `custom_users.id` (UUID)
- **Orders**: `status`, `shipping_address` (JSON), `rental_start_date`, `rental_end_date`
- **Rental Cycle**: 24-day logic for toy selection window
- **Pickup Date**: Calculated based on rental cycle and order status

## 🔄 **24-Day Rental Cycle Logic**

### **Cycle Phases**
1. **Days 1-23**: Toys in possession, no selection allowed
2. **Days 24-30**: Selection window open for next cycle
3. **Day 30+**: New cycle begins, pickup scheduled

### **Key Calculations**
```typescript
// Selection window activation (Day 24)
const isSelectionWindowActive = (cycleStartDate: string) => {
  const startDate = new Date(cycleStartDate);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff >= 24 && daysDiff <= 30;
};

// Next pickup date calculation
const calculateNextPickupDate = (currentCycleStart: string) => {
  const startDate = new Date(currentCycleStart);
  const pickupDate = new Date(startDate);
  pickupDate.setDate(startDate.getDate() + 30); // Next cycle start
  return pickupDate;
};
```

## 🏗️ **Implementation Architecture**

### **1. Core Data Hook: `useSupabaseUserDashboard`**
```typescript
interface SupabaseUserDashboard {
  // User Profile
  user: UserProfile;
  
  // Subscription Data
  subscription: {
    id: string;
    plan_id: string;
    status: string;
    current_cycle_start: string;
    current_cycle_end: string;
    cycle_status: 'selection' | 'delivery_pending' | 'toys_in_possession' | 'return_pending';
  };
  
  // Entitlements
  entitlements: {
    standard_toys_remaining: number;
    big_toys_remaining: number;
    books_remaining: number;
    value_cap_remaining: number;
    toys_in_possession: boolean;
    selection_window_active: boolean;
  };
  
  // Current Cycle
  currentCycle: {
    dayInCycle: number;
    isSelectionWindowActive: boolean;
    nextPickupDate: string;
    currentToys: ToyWithRentalInfo[];
  };
  
  // Order History
  orders: OrderWithItems[];
}
```

### **2. Database Queries Structure**

#### **Main Query Function**
```typescript
const fetchUserDashboardData = async (userId: string) => {
  // 1. Get user profile
  const userProfile = await supabase
    .from('custom_users')
    .select('*')
    .eq('id', userId)
    .single();

  // 2. Get active subscription with cycle info
  const subscription = await supabase
    .from('subscriptions')
    .select(`
      *,
      user_entitlements(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // 3. Get current orders (toys at home)
  const currentOrders = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        toys(*)
      )
    `)
    .eq('user_id', userId)
    .in('status', ['shipped', 'delivered'])
    .is('returned_date', null);

  // 4. Get order history
  const orderHistory = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        toys(name, image_url, category)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return { userProfile, subscription, currentOrders, orderHistory };
};
```

### **3. Dashboard Components Structure**

#### **Main Dashboard Layout**
```
Dashboard.tsx
├── DashboardHeader (user info, cycle status)
├── SubscriptionOverview (plan, cycle info, selection window)
├── CurrentRentals (toys at home, return dates)
├── CycleManagement (pickup dates, selection window)
├── OrderHistory (past orders, status tracking)
└── QuickActions (profile, support, plans)
```

#### **Key Components to Build**

1. **`CycleStatusCard`**
   - Current day in cycle
   - Selection window status
   - Next pickup date
   - Progress indicator

2. **`CurrentToysGrid`**
   - Toys currently at home
   - Rental start/end dates
   - Return due dates
   - Toy details and images

3. **`PickupScheduleCard`**
   - Next pickup date
   - Address confirmation
   - Special instructions
   - Scheduling options

4. **`EntitlementsDisplay`**
   - Remaining toy quotas
   - Value cap remaining
   - Plan features

## 🔧 **Step-by-Step Implementation**

### **Phase 1: Core Data Infrastructure**

#### **Step 1.1: Create Main Dashboard Hook**
```typescript
// src/hooks/useSupabaseUserDashboard.ts
export const useSupabaseUserDashboard = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['supabase-user-dashboard', user?.id],
    queryFn: () => fetchUserDashboardData(user.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
```

#### **Step 1.2: Create Cycle Management Hook**
```typescript
// src/hooks/useCycleManagement.ts
export const useCycleManagement = () => {
  const { user } = useCustomAuth();
  
  return useQuery({
    queryKey: ['cycle-management', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_cycle_status', {
        user_id_param: user.id
      });
      return data[0];
    },
    enabled: !!user?.id,
  });
};
```

### **Phase 2: Dashboard Components**

#### **Step 2.1: Update Main Dashboard**
```typescript
// src/pages/Dashboard.tsx
const Dashboard = () => {
  const { data: dashboardData, isLoading } = useSupabaseUserDashboard();
  const { data: cycleData } = useCycleManagement();
  
  if (isLoading) return <DashboardSkeleton />;
  
  return (
    <div className="dashboard-container">
      <DashboardHeader user={dashboardData.user} cycle={cycleData} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CycleStatusCard cycle={cycleData} />
          <CurrentToysGrid toys={dashboardData.currentToys} />
          <OrderHistory orders={dashboardData.orders} />
        </div>
        <div>
          <SubscriptionOverview subscription={dashboardData.subscription} />
          <PickupScheduleCard cycle={cycleData} />
          <EntitlementsDisplay entitlements={dashboardData.entitlements} />
        </div>
      </div>
    </div>
  );
};
```

#### **Step 2.2: Create Cycle Status Card**
```typescript
// src/components/dashboard/CycleStatusCard.tsx
const CycleStatusCard = ({ cycle }) => {
  const progressPercentage = (cycle.days_in_current_cycle / 30) * 100;
  const nextPickupDate = calculateNextPickupDate(cycle.current_cycle_start);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rental Cycle Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>Day {cycle.days_in_current_cycle} of 30</span>
              <span>{30 - cycle.days_in_current_cycle} days remaining</span>
            </div>
            <Progress value={progressPercentage} />
          </div>
          
          {cycle.selection_window_active ? (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900">Selection Window Open!</h4>
              <p className="text-green-700">You can now select toys for your next cycle.</p>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900">Enjoy Your Toys!</h4>
              <p className="text-blue-700">
                Selection opens on day 24 ({format(getSelectionDate(), 'MMM d')})
              </p>
            </div>
          )}
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Next Pickup</h4>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(nextPickupDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### **Phase 3: Data Processing Functions**

#### **Step 3.1: Cycle Calculation Utilities**
```typescript
// src/utils/cycleUtils.ts
export const calculateCycleInfo = (cycleStartDate: string) => {
  const startDate = new Date(cycleStartDate);
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dayInCycle = Math.max(1, daysDiff + 1);
  const isSelectionWindowActive = dayInCycle >= 24 && dayInCycle <= 30;
  const nextPickupDate = new Date(startDate);
  nextPickupDate.setDate(startDate.getDate() + 30);
  
  return {
    dayInCycle,
    isSelectionWindowActive,
    nextPickupDate,
    daysUntilSelection: Math.max(0, 24 - dayInCycle),
    daysUntilPickup: Math.max(0, 30 - dayInCycle)
  };
};

export const formatPickupDate = (date: Date) => {
  return {
    formatted: format(date, 'EEEE, MMMM d, yyyy'),
    dayOfWeek: format(date, 'EEEE'),
    shortDate: format(date, 'MMM d'),
    isToday: isSameDay(date, new Date()),
    isTomorrow: isSameDay(date, addDays(new Date(), 1))
  };
};
```

### **Phase 4: Integration Steps**

#### **Step 4.1: Remove WooCommerce Dependencies**
1. Update `useUserDataWaterfall` to skip WooCommerce API calls
2. Remove WooCommerce service imports from dashboard components
3. Update all dashboard hooks to use Supabase-only queries

#### **Step 4.2: Database Function Updates**
```sql
-- Ensure cycle status function exists
CREATE OR REPLACE FUNCTION get_user_cycle_status(user_id_param UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  cycle_status TEXT,
  toys_in_possession BOOLEAN,
  selection_window_active BOOLEAN,
  days_in_current_cycle INTEGER,
  plan_id TEXT,
  current_cycle_start DATE,
  next_pickup_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (s.id IS NOT NULL) as has_active_subscription,
    COALESCE(s.cycle_status::TEXT, 'selection') as cycle_status,
    COALESCE(ue.toys_in_possession, FALSE) as toys_in_possession,
    (EXTRACT(DAY FROM (CURRENT_DATE - s.current_cycle_start)) >= 24 
     AND EXTRACT(DAY FROM (CURRENT_DATE - s.current_cycle_start)) <= 30) as selection_window_active,
    COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - s.current_cycle_start))::INTEGER, 0) as days_in_current_cycle,
    s.plan_id,
    s.current_cycle_start,
    (s.current_cycle_start + INTERVAL '30 days')::DATE as next_pickup_date
  FROM subscriptions s
  LEFT JOIN user_entitlements ue ON ue.subscription_id = s.id
  WHERE s.user_id = user_id_param 
  AND s.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

## 📱 **User Experience Features**

### **Dashboard Highlights**
1. **Cycle Progress**: Visual progress bar showing current day
2. **Selection Window**: Clear indication when toy selection is available
3. **Pickup Scheduling**: Next pickup date with calendar integration
4. **Toy Management**: Current toys with return tracking
5. **Order History**: Complete order timeline with status updates

### **Smart Notifications**
- Selection window opening (Day 24)
- Pickup reminders (Day 28-30)
- Return reminders for overdue toys
- Plan renewal notifications

### **Mobile Optimization**
- Responsive grid layouts
- Touch-friendly interactions
- Optimized loading states
- Offline capability for basic info

## 🎯 **Success Metrics**

### **Technical Goals**
- ✅ 100% Supabase data usage (no WooCommerce API calls)
- ✅ Sub-2 second dashboard load times
- ✅ Real-time cycle status updates
- ✅ Accurate pickup date calculations

### **User Experience Goals**
- ✅ Clear rental cycle understanding
- ✅ Intuitive toy selection process
- ✅ Transparent pickup scheduling
- ✅ Complete order visibility

## 🚀 **Implementation Timeline**

### **Week 1: Infrastructure**
- [ ] Create core dashboard hook
- [ ] Implement cycle management utilities
- [ ] Update database functions

### **Week 2: Components**
- [ ] Build cycle status card
- [ ] Create current toys grid
- [ ] Implement pickup schedule card

### **Week 3: Integration**
- [ ] Remove WooCommerce dependencies
- [ ] Update main dashboard layout
- [ ] Add entitlements display

### **Week 4: Polish & Testing**
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] User testing and feedback

This implementation plan provides a complete Supabase-only dashboard that leverages migrated data with proper 24-day rental cycle management and pickup date calculations. 