# Subscription Status Mismatch Fix

## 🐛 Problem Identified

The user dashboard was showing **conflicting subscription information**:

1. **Top section**: "discovery-delight Member • 1 months with ToyFlix" ✅
2. **Subscription status**: "4 toys at home • discovery-delight" with cycle progress ✅  
3. **Right sidebar**: "No active subscription found" ❌
4. **Selection window**: "Selection window opens in Soon" (vague) ❌

## 🔍 Root Cause Analysis

The dashboard components were using **multiple data sources** that weren't synchronized:

- **`RentalOrdersOnlyDashboard`**: Used `rental_orders` table (primary source)
- **`SubscriptionTimeline`**: Used `SubscriptionService` (secondary source)  
- **Various hooks**: Used different queries with different stale times
- **Legacy components**: Still referenced old subscription detection logic

This created a **"multiple sources of truth"** problem where different parts of the UI showed different subscription states.

## ✅ Solution Implemented

### 1. **Created `useUnifiedSubscriptionStatus` Hook**

**File**: `src/hooks/useUnifiedSubscriptionStatus.ts`

**Features**:
- **Prioritized data sources**: `rental_orders` → `subscriptions` → `user_profile` → `hybrid`
- **Conflict detection**: Identifies when different sources disagree
- **Confidence scoring**: High/Medium/Low based on data quality
- **Debug information**: Shows which source was used and why
- **Phone number normalization**: Handles +91, 91, etc. variations

### 2. **Updated Dashboard Components**

**Files Modified**:
- `src/components/dashboard/RentalOrdersOnlyDashboard.tsx`
- `src/components/dashboard/SubscriptionTimeline.tsx`

**Changes**:
- Import unified subscription hook
- Use unified status for `isActive`, `plan`, `currentOrder`, `monthsActive`
- Added debug info display (shows data source and confidence)
- Updated refresh functions to include unified status
- Consistent subscription state across all components

### 3. **Decision Logic Priority**

```typescript
// 1. PRIMARY: Active rental orders (most reliable)
if (currentOrder?.subscription_status === 'active') {
  hasActiveSubscription = true;
  source = 'rental_orders';
  confidence = 'high';
}
// 2. SECONDARY: Subscriptions table
else if (activeSubscription) {
  hasActiveSubscription = true;
  source = 'subscriptions'; 
  confidence = 'high';
}
// 3. TERTIARY: User profile flags (fallback)
else if (userProfile.subscription_active) {
  hasActiveSubscription = true;
  source = 'user_profile';
  confidence = 'medium';
}
// 4. HYBRID: Recent activity detection
else if (daysSinceLastOrder <= 45) {
  hasActiveSubscription = true;
  source = 'hybrid';
  confidence = 'medium';
}
```

## 🎯 Expected Results

### Before Fix:
- ❌ "discovery-delight Member" vs "No active subscription found"
- ❌ "Selection window opens in Soon" (unclear)
- ❌ Multiple refresh buttons for different data sources
- ❌ Inconsistent subscription status across components

### After Fix:
- ✅ **Consistent subscription status**: All components show same data
- ✅ **Clear data source**: Debug info shows which source is being used
- ✅ **Conflict detection**: Warns when data sources disagree  
- ✅ **Unified refresh**: Single refresh updates all subscription data
- ✅ **Better error handling**: Falls back gracefully through data sources

## 🔧 Debug Information

The dashboard now shows debug information in development:

```
Status source: rental_orders (confidence: high)
⚠️ Conflicts: Subscription record exists but no rental orders
```

This helps identify when data sources are out of sync and need attention.

## 🚀 Testing

1. **User with rental orders**: Should show high confidence from rental_orders
2. **User with subscription only**: Should show high confidence from subscriptions  
3. **User with profile flag only**: Should show medium confidence from user_profile
4. **User with recent activity**: Should show medium confidence from hybrid
5. **Conflicting data**: Should show warning with conflict details

## 📝 Notes

- The unified hook uses a 30-second stale time for responsive updates
- All dashboard components now refresh subscription status consistently
- Debug information is only shown when available (development mode)
- The fix maintains backward compatibility with existing data structures

