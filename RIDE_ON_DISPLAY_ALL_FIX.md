# Fix: Display ALL Ride-On Toys in Mobile App

## 🎯 Requirement

**Website Behavior:** Shows ALL ride-on toys (no limit)  
**Mobile App Should:** Show ALL ride-on toys (matching website)  
**Current Problem:** Only 5 showing (query may be wrong + possible hidden limits)

---

## 🔍 Analysis

### Website Implementation (Correct):

**File:** `/toy-joy-box-club/src/hooks/useToys/rideOnToys.ts` (Lines 11-17)
```typescript
const { data, error } = await supabase
    .from('toys')
    .select('*')
    .eq('category', 'ride_on_toys')  // Filter by category only
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('name');
// NO LIMIT! Returns all ride-on toys
```

**Result:** Website shows ALL ride-on toys from database ✅

### Mobile App Backend (Current - Incorrect):

**File:** `/api/product-by-category/index.js` (Lines 55-80)
```javascript
case '80':
    minAge = 0;
    maxAge = 8;  // ❌ Age-based filtering (WRONG)
    
toysQuery = `...toys?available_quantity=gt.0&order=display_order.asc,created_at.desc`;
toysQuery += `&min_age=gte.0&max_age=lte.8`;  // ❌ Age filter
// NO LIMIT - but wrong query!
```

**Problems:**
1. ❌ Filters by age (0-8 years) instead of category
2. ❌ Ride-on toys have NO age limit (can be for any age)
3. ❌ May exclude ride-on toys with different age values
4. ❌ May include regular toys for ages 0-8

**Result:** Shows WRONG toys (mixed set) ❌

### Correct Approach (Like proxy/index.js):

**File:** `/api/proxy/index.js` (Line 670)
```javascript
if (categoryParam === '80') {
    response = await fetch(
        `${supabaseUrl}/rest/v1/toys?category=eq.ride_on_toys&available_quantity=gt.0&order=display_order.asc,created_at.desc&limit=50`
    );
}
```

**Note:** Even proxy has `limit=50` - should remove for mobile to show ALL

---

## 🔧 Complete Fix

### File to Update: `/api/product-by-category/index.js`

**Replace Lines 52-82 with:**

```javascript
// Build Supabase query based on category
let toysQuery;
let categoryName;

// SPECIAL CASE: Category 80 = Ride-On Toys (no age restrictions)
if (categories === '80') {
    context.log('🚗 Category 80: Fetching ALL RIDE-ON TOYS');
    categoryName = 'Ride-On Toys';
    
    // Query by category ONLY, no age filtering, NO LIMIT
    toysQuery = `${supabaseUrl}/rest/v1/toys?category=eq.ride_on_toys&available_quantity=gt.0&order=display_order.asc,is_featured.desc,created_at.desc`;
    
} else {
    // Age category names (for backward compatibility)
    const categoryNames = {
        '71': '0-6 Months',
        '72': '6-12 Months',
        '73': '1-2 Years',
        '74': '2-3 Years',
        '75': '3-4 Years',
        '76': '4-5 Years',
        '77': '5+ Years',
        '812': '8-12 Years',
        '1216': '12-16 Years'
    };
    
    categoryName = categoryNames[categories] || 'All Toys (0-16 Years)';
    context.log('Category name:', categoryName);
    
    // Convert age categories to min_age/max_age ranges
    let minAge, maxAge;
    switch (categories) {
        case '71':
            minAge = 0;
            maxAge = 6;
            break;
        case '72':
            minAge = 6;
            maxAge = 12;
            break;
        case '73':
            minAge = 1;
            maxAge = 2;
            break;
        case '74':
            minAge = 2;
            maxAge = 3;
            break;
        case '75':
            minAge = 3;
            maxAge = 4;
            break;
        case '76':
            minAge = 4;
            maxAge = 6;
            break;
        case '77':
            minAge = 5;
            maxAge = 8;
            break;
        case '812':
            minAge = 8;
            maxAge = 12;
            break;
        case '1216':
            minAge = 12;
            maxAge = 16;
            break;
        default:
            minAge = 0;
            maxAge = 16;
            break;
    }
    
    context.log(`🔍 Fetching toys for age range: ${minAge}-${maxAge} years`);
    
    // Build age-based query
    toysQuery = `${supabaseUrl}/rest/v1/toys?available_quantity=gt.0&order=display_order.asc,created_at.desc`;
    
    // Add age filtering if not showing all toys
    if (minAge !== 0 || maxAge !== 16) {
        toysQuery += `&min_age=gte.${minAge}&max_age=lte.${maxAge}`;
    }
}

context.log('🔍 Final Query:', toysQuery);
```

---

## 🎯 Key Changes

### 1. Category-Based Filtering for Ride-On ✅
```javascript
// Ride-on: Filter by category='ride_on_toys'
// NOT by age (because ride-on has no age restrictions)
```

### 2. No Limit ✅
```javascript
// No &limit= parameter
// Returns ALL available ride-on toys
```

### 3. Proper Ordering ✅
```javascript
&order=display_order.asc,is_featured.desc,created_at.desc
// Featured first, then by display order, then newest
```

---

## 📊 Expected Outcome

**Before Fix:**
```
Mobile App → categories=80
    ↓
Query: min_age >= 0 AND max_age <= 8
    ↓
Returns: 5 toys (some ride-on, some regular, age-filtered) ❌
```

**After Fix:**
```
Mobile App → categories=80
    ↓
Query: category = 'ride_on_toys' (no age filter)
    ↓
Returns: ALL ride-on toys in database (10? 15? 20?) ✅
```

---

## 🧪 Verification

After deploying the fix, the mobile app should show:
- ✅ ONLY ride-on category toys (no regular toys)
- ✅ ALL available ride-on toys (not just 5)
- ✅ Matching what website shows
- ✅ No age-based filtering

---

## 🚀 Implementation

**File to Modify:** `/api/product-by-category/index.js`  
**Lines to Replace:** 52-82 (entire category logic section)  
**New Lines:** ~60 lines (cleaner structure)  
**Risk:** Low (backwards compatible with other categories)  

---

**This fix will ensure mobile app shows ALL ride-on toys, just like the website!**

**Ready to implement?**
