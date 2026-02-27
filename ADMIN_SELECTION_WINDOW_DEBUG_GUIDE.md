# 🔧 Admin Selection Window Control - Debug Guide

## 🎯 **Issue Summary**

**Problem**: When admin opens selection window from admin panel, the user dashboard doesn't show the "Select Toys" button.

**Root Cause Analysis**: The issue could be in several places:
1. Database fields not being updated correctly
2. Dashboard query not fetching manual control fields
3. Cache not being invalidated properly
4. Logic not properly handling manual control states

## 🛠️ **Debug Tools Added**

### **1. Enhanced Logging in SubscriptionService**
Added comprehensive logging to `calculateCycleData()` method:
- Raw database fields received
- Manual control logic execution
- Selection window status calculation

### **2. Debug Panel in Dashboard**
Added `SelectionWindowDebugPanel` component (development only) that shows:
- Current database values
- Calculated logic results  
- Expected vs actual behavior
- Force refresh capability

### **3. Test Script**
Created `test_admin_selection_window_control.js` for console testing:
- Tests manual open/close functions
- Verifies database updates
- Shows expected behavior

### **4. Enhanced Cache Invalidation**
Updated admin controls to invalidate all relevant caches and force immediate refresh.

---

## 🔍 **Debugging Steps**

### **Step 1: Check Database State**
Run this query in Supabase SQL editor:
```sql
SELECT 
    id,
    order_number,
    user_id,
    rental_start_date,
    selection_window_status,
    manual_selection_control,
    selection_window_opened_at,
    selection_window_closed_at,
    subscription_status
FROM rental_orders 
WHERE user_id = 'USER_ID_HERE' 
AND subscription_status = 'active'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result After Admin Opens Window:**
- `manual_selection_control` = `true`
- `selection_window_status` = `'manual_open'`
- `selection_window_opened_at` = recent timestamp

### **Step 2: Check Dashboard Debug Panel**
1. Open user dashboard
2. Look for orange "Selection Window Debug" panel at top
3. Expand it to see:
   - **Database Data**: Raw fields from database
   - **Calculated Logic**: Result of unified logic
   - **Expected Behavior**: What should happen

### **Step 3: Check Browser Console Logs**
Look for these specific log messages:

#### **✅ Expected Logs When Working:**
```
🔍 calculateCycleData - Raw subscription data: {
  manual_selection_control: true,
  selection_window_status: "manual_open"
}
✅ Selection window MANUALLY OPENED by admin
🔍 Normalized selection data result: {
  isOpen: true,
  status: "open",
  reason: "Selection manually opened by admin"
}
🔍 Dashboard unified cycle logic: {
  finalCanSelectToys: true,
  manualControlActive: true,
  source: "current_subscription_cycle"
}
```

#### **❌ Problem Logs:**
```
🔍 calculateCycleData - Raw subscription data: {
  manual_selection_control: false, // Should be true
  selection_window_status: "auto"  // Should be "manual_open"
}
```

### **Step 4: Test Admin Control Function**
1. Open browser console on admin panel
2. Copy and paste the test script from `test_admin_selection_window_control.js`
3. Update the `testUserId` variable
4. Run `testAdminSelectionWindowControl()`
5. Check if database updates properly

### **Step 5: Manual Database Fix (If Needed)**
If the admin control function isn't working, manually update:
```sql
UPDATE rental_orders 
SET 
    selection_window_status = 'manual_open',
    manual_selection_control = true,
    selection_window_opened_at = NOW(),
    updated_at = NOW()
WHERE user_id = 'USER_ID_HERE' 
AND subscription_status = 'active';
```

---

## 🚨 **Common Issues & Fixes**

### **Issue 1: Manual Control Fields Missing**
**Symptoms**: Debug panel shows `manual_selection_control: null`
**Fix**: The database migration might not have been applied
```sql
-- Check if columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'rental_orders' 
AND column_name IN ('manual_selection_control', 'selection_window_status');

-- If missing, apply the migration
\i fix_selection_window_logic.sql
```

### **Issue 2: Cache Not Invalidating**
**Symptoms**: Database shows correct values but dashboard doesn't update
**Fix**: Use the "Force Refresh Dashboard" button in debug panel

### **Issue 3: Wrong Rental Order Selected**
**Symptoms**: Admin is updating wrong rental order
**Fix**: Verify the rental order ID in admin panel matches the active subscription

### **Issue 4: Logic Priority Issues**
**Symptoms**: Manual control is ignored
**Fix**: Check the unified logic source - should be `"current_subscription_cycle"`

---

## 🔧 **Quick Fixes**

### **Fix 1: Force Dashboard Refresh**
```javascript
// Run in browser console on user dashboard
window.location.reload();
```

### **Fix 2: Clear All Caches**
```javascript
// Run in browser console
if (window.queryClient) {
  window.queryClient.clear();
  window.location.reload();
}
```

### **Fix 3: Manual Database Update**
```sql
-- Force open selection window for testing
UPDATE rental_orders 
SET 
    selection_window_status = 'manual_open',
    manual_selection_control = true,
    selection_window_opened_at = NOW()
WHERE user_id = 'a2ff606e-a625-4a03-852f-3da91da3e0f6'
AND subscription_status = 'active';
```

---

## 📊 **Expected Behavior Matrix**

| **Database State** | **Dashboard Should Show** | **Debug Panel Shows** |
|-------------------|--------------------------|----------------------|
| `manual_control: true, status: 'manual_open'` | ✅ Select Toys Button | `canSelectToys: true` |
| `manual_control: true, status: 'manual_closed'` | ❌ No Select Button | `canSelectToys: false` |
| `manual_control: false, day 24-34` | ✅ Select Toys Button | `canSelectToys: true` |
| `manual_control: false, day 1-23` | ❌ No Select Button | `canSelectToys: false` |

---

## 🎯 **Testing Checklist**

### **Admin Panel Side:**
- [ ] Select user in subscription management
- [ ] Click "Open Selection Window"
- [ ] Verify success toast appears
- [ ] Check admin panel shows "Manually Open" status

### **User Dashboard Side:**
- [ ] Open user dashboard in new tab/window
- [ ] Check debug panel (orange card at top)
- [ ] Verify "Database Data" shows correct manual control values
- [ ] Verify "Calculated Logic" shows `canSelectToys: true`
- [ ] Check if "Select Toys" button appears (or floating action button on mobile)

### **If Still Not Working:**
1. Check browser console for error messages
2. Use "Force Refresh Dashboard" button
3. Run the test script in console
4. Check database directly with SQL query
5. Apply manual database fix if needed

---

## 🚀 **Files Modified for Debugging**

1. **`src/services/subscriptionService.ts`**
   - Added comprehensive logging to `calculateCycleData()`
   - Enhanced manual control field handling

2. **`src/components/dashboard/RentalOrdersOnlyDashboard.tsx`**
   - Added debug logging for unified cycle logic
   - Integrated debug panel

3. **`src/components/admin/subscription-management/SelectionWindowControls.tsx`**
   - Enhanced cache invalidation
   - Added force refresh mechanism

4. **`src/components/dashboard/SelectionWindowDebugPanel.tsx`** (New)
   - Visual debug panel for real-time status checking

5. **`test_admin_selection_window_control.js`** (New)
   - Console test script for admin functionality

**With these debugging tools, you should be able to identify exactly where the issue is occurring and fix it accordingly.** 🎯

The enhanced logging will show you in the browser console exactly what data is being received and how the logic is being calculated.
