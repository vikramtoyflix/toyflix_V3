# 🔍 Selection Window Logic Analysis - Issues & Fixes

## 🚨 **Critical Issues Identified**

### **1. Day Calculation Inconsistencies**

#### **Issue A: Multiple Day Calculation Methods**
There are **3 different day calculation approaches** across the codebase:

**Method 1: SubscriptionService.calculateCycleData()**
```typescript
// Line 236: src/services/subscriptionService.ts
const totalDaysSubscribed = Math.max(0, differenceInDays(currentDate, subscriptionStart));
const daysInCurrentCycle = (totalDaysSubscribed % cycleDays) + 1; // +1 makes day 1 the first day

// Line 262: Selection window logic
if (daysInCurrentCycle >= 24 && daysInCurrentCycle <= 34) {
  selectionWindowStatus = 'open';
}
```

**Method 2: Database Function**
```sql
-- Line 61: supabase/migrations/20250108000000_add_selection_window_controls.sql
v_days_elapsed := EXTRACT(DAY FROM (CURRENT_DATE - p_rental_start_date));
v_cycle_day := v_days_elapsed + 1; -- Day 1 is the first day

-- Line 70: Selection window logic  
IF v_cycle_day >= 24 AND v_cycle_day <= 34 THEN
    RETURN 'auto_open';
```

**Method 3: useSubscriptionCycle Hook**
```typescript
// Line 427-428: src/hooks/useSubscriptionCycle.ts
const windowOpenDate = addDays(cycleEndDate, -planConfig.selectionWindowStart);
const windowCloseDate = addDays(cycleEndDate, -planConfig.selectionWindowEnd);

// This calculates from cycle END backwards, not from cycle START forwards
```

#### **Issue B: EXTRACT(DAY FROM ...) Bug**
```sql
-- ❌ CRITICAL BUG in database function
v_days_elapsed := EXTRACT(DAY FROM (CURRENT_DATE - p_rental_start_date));
```

**Problem**: `EXTRACT(DAY FROM interval)` only returns the **day component** of the interval, not the total days!

**Example**:
- Subscription start: 2025-01-01
- Current date: 2025-02-15 
- Interval: 45 days
- `EXTRACT(DAY FROM interval '45 days')` = **15** (not 45!)
- Should use: `(CURRENT_DATE - p_rental_start_date)::integer`

### **2. Admin Manual Control Issues**

#### **Issue A: Cache Invalidation Problems**
The admin selection window controls don't properly invalidate all dashboard caches:

```typescript
// Line 142-154: src/components/admin/subscription-management/SelectionWindowControls.tsx
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard', userId] }),
  queryClient.invalidateQueries({ queryKey: ['subscription-selection'] }),
  // Missing key invalidations for mobile dashboard
]);
```

#### **Issue B: Dashboard Logic Priority Issues**
The dashboard has conflicting logic for determining `canSelectToys`:

```typescript
// Line 525-550: src/components/dashboard/RentalOrdersOnlyDashboard.tsx
const unifiedCycleLogic = currentCycle ? {
  canSelectToys: canUpdateCycle, // Uses new system
} : (selectionWindow ? {
  canSelectToys: hookCanSelectToys || false, // Uses old system
} : {
  canSelectToys: false, // No data
});
```

**Problem**: The `canUpdateCycle` logic may not respect admin manual controls.

### **3. Selection Window Status Mismatch**

#### **Issue A: Status Field Inconsistencies**
Different parts of the system use different status values:

**Database Values**:
- `'auto'`, `'manual_open'`, `'manual_closed'`, `'force_open'`, `'force_closed'`

**Service Layer Values**:
- `'open'`, `'closed'`, `'upcoming'`, `'auto_open'`, `'auto_closed'`

**Frontend Values**:
- `'open'`, `'closed'`, `'unknown'`

#### **Issue B: Manual Control Not Propagating**
Manual admin controls in `rental_orders` table may not be reflected in dashboard logic.

---

## 🔧 **Fixes Required**

### **Fix 1: Correct Database Day Calculation**

```sql
-- Replace in supabase/migrations/20250108000000_add_selection_window_controls.sql
CREATE OR REPLACE FUNCTION get_current_cycle_day(p_rental_start_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- ✅ FIX: Use integer conversion instead of EXTRACT(DAY)
    RETURN (CURRENT_DATE - p_rental_start_date)::integer + 1;
END;
$$;
```

### **Fix 2: Standardize Day Calculation Logic**

Create a unified day calculation utility:

```typescript
// src/utils/cycleCalculations.ts
export const calculateCycleDay = (startDate: Date, currentDate: Date = new Date()): number => {
  const daysSinceStart = differenceInDays(currentDate, startDate);
  return daysSinceStart + 1; // Day 1 is the first day
};

export const isSelectionWindowOpen = (cycleDay: number): boolean => {
  return cycleDay >= 24 && cycleDay <= 34;
};
```

### **Fix 3: Enhanced Dashboard Logic**

Update the dashboard to properly handle admin manual controls:

```typescript
// In RentalOrdersOnlyDashboard.tsx
const getCanSelectToys = () => {
  // Priority 1: Check manual admin control
  if (currentSubscriptionCycle?.manual_selection_control) {
    return currentSubscriptionCycle.selection_window_status === 'manual_open';
  }
  
  // Priority 2: Check auto logic (day 24-34)
  if (currentSubscriptionCycle?.current_day_in_cycle) {
    return currentSubscriptionCycle.current_day_in_cycle >= 24 && 
           currentSubscriptionCycle.current_day_in_cycle <= 34;
  }
  
  // Priority 3: Fallback to hook logic
  return hookCanSelectToys || false;
};
```

### **Fix 4: Complete Cache Invalidation**

Update admin controls to invalidate all relevant caches:

```typescript
// In SelectionWindowControls.tsx
const invalidateAllCaches = async (userId: string) => {
  await Promise.all([
    // Dashboard caches
    queryClient.invalidateQueries({ queryKey: ['rental-orders-dashboard', userId] }),
    queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] }),
    
    // Selection caches  
    queryClient.invalidateQueries({ queryKey: ['subscription-selection', userId] }),
    queryClient.invalidateQueries({ queryKey: ['selection-status', userId] }),
    queryClient.invalidateQueries({ queryKey: ['can-select-toys', userId] }),
    
    // Cycle caches
    queryClient.invalidateQueries({ queryKey: ['subscription-cycle', userId] }),
    queryClient.invalidateQueries({ queryKey: ['cycleStatus', userId] }),
    
    // Mobile dashboard caches
    queryClient.invalidateQueries({ queryKey: ['mobile-dashboard', userId] }),
    
    // Next cycle caches
    queryClient.invalidateQueries({ queryKey: ['next-cycle-manager', userId] }),
    queryClient.invalidateQueries({ queryKey: ['next-cycle-eligibility', userId] }),
  ]);
};
```

### **Fix 5: Status Standardization**

Create a status mapping utility:

```typescript
// src/utils/selectionWindowStatus.ts
export const normalizeSelectionStatus = (dbStatus: string): 'open' | 'closed' => {
  const openStatuses = ['manual_open', 'force_open', 'auto_open'];
  return openStatuses.includes(dbStatus) ? 'open' : 'closed';
};

export const getStatusDisplayText = (status: string, cycleDay: number): string => {
  switch (status) {
    case 'manual_open':
      return 'Selection manually opened by admin';
    case 'manual_closed':
      return 'Selection manually closed by admin';
    case 'auto_open':
      return `Selection window open (Day ${cycleDay})`;
    case 'auto_closed':
      return cycleDay < 24 
        ? `Selection opens in ${24 - cycleDay} days (Day 24)`
        : 'Selection window closed for this cycle';
    default:
      return 'Selection status unknown';
  }
};
```

---

## 🧪 **Testing Scenarios**

### **Day Calculation Tests**

1. **Subscription Start**: 2025-01-01
   - **Day 1** (2025-01-01): Should be cycle day 1
   - **Day 24** (2025-01-24): Selection window should open
   - **Day 34** (2025-02-03): Selection window should close
   - **Day 35** (2025-02-04): Should be in next cycle (day 5)

2. **Edge Cases**:
   - Leap year calculations
   - Month boundary crossings
   - Timezone considerations

### **Admin Control Tests**

1. **Manual Open**: Admin opens window on day 10
   - Dashboard should show "Select Toys" button
   - Status should show "manually opened"
   - Should work regardless of cycle day

2. **Manual Close**: Admin closes window on day 28
   - Dashboard should hide "Select Toys" button  
   - Status should show "manually closed"
   - Should override auto logic

3. **Reset to Auto**: Admin resets to auto on day 30
   - Should follow day 24-34 logic
   - Status should update accordingly

### **Mobile Dashboard Tests**

1. **Selection Window Open**: 
   - Floating action button should show "Select Toys"
   - Alert banner should show selection window status
   - Should work for both auto and manual open

2. **Selection Window Closed**:
   - Floating action button should show "Browse Toys"
   - Should show days until next window opens

---

## 🎯 **Implementation Priority**

### **High Priority (Critical)**
1. ✅ Fix database day calculation bug
2. ✅ Standardize day calculation across services
3. ✅ Fix admin manual control propagation

### **Medium Priority (Important)**  
1. ✅ Complete cache invalidation
2. ✅ Status standardization
3. ✅ Enhanced dashboard logic

### **Low Priority (Nice to have)**
1. ✅ Comprehensive testing suite
2. ✅ Better error handling
3. ✅ Performance optimizations

---

## 📊 **Current Status Summary**

| **Component** | **Status** | **Issues** | **Impact** |
|---------------|------------|------------|------------|
| **Database Functions** | ❌ Critical Bug | EXTRACT(DAY) incorrect | Selection windows wrong |
| **SubscriptionService** | ⚠️ Inconsistent | Multiple calculation methods | Conflicting results |
| **Dashboard Logic** | ⚠️ Complex | Priority conflicts | User confusion |
| **Admin Controls** | ⚠️ Incomplete | Cache invalidation issues | Changes not reflected |
| **Mobile Dashboard** | ✅ Working | Uses dashboard logic | Inherits issues |

**Overall Assessment**: **HIGH PRIORITY FIXES NEEDED** 🚨

The day calculation bug in database functions is causing incorrect selection window behavior. Admin manual controls may not be working properly due to cache invalidation and logic priority issues.

**Recommendation**: Implement fixes in order of priority to ensure selection window logic works correctly across all user interfaces.
