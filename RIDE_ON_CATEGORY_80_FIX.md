# Category 80 Ride-On Toys Fix - Complete Analysis

## ✅ Confirmed: Mobile App IS Using Supabase

**Evidence:**
- Line 85 in `product-by-category/index.js`: `const response = await fetch(toysQuery, {...})`
- Line 76: Query URL is `${supabaseUrl}/rest/v1/toys?available_quantity=gt.0...`
- Line 32-33: Supabase URL hardcoded: `https://wucwpyitzqjukcphczhr.supabase.co`

**Result:** ✅ Mobile app's ride-on data IS coming from Supabase (not mock data)

---

## 🐛 The Bug

### Current Behavior (WRONG):

When mobile app calls:
```javascript
/wp-json/api/v1/product-by-category?categories=80
```

Azure Function does:
```javascript
// Lines 55-58
case '80':
    minAge = 0;
    maxAge = 8;  // ❌ WRONG!
    break;

// Line 80
toysQuery += `&min_age=gte.0&max_age=lte.8`;
```

**Query:** All toys with age 0-8 years (could include regular toys!)  
**Result:** Shows MIXED toys instead of only ride-on

### Expected Behavior (CORRECT):

Like `/api/proxy/index.js` does (lines 669-678):
```javascript
if (categoryParam === '80') {
    response = await fetch(
        `${supabaseUrl}/rest/v1/toys?category=eq.ride_on_toys&available_quantity=gt.0...`
    );
}
```

**Query:** Only toys where category='ride_on_toys'  
**Result:** Shows ONLY ride-on toys ✅

---

## 🔢 Why Only 5 Toys?

### Two Possibilities:

**A) Database Only Has 5 Available Ride-On Toys**
- Most likely scenario
- Query: `SELECT * FROM toys WHERE category='ride_on_toys' AND available_quantity > 0`
- If result = 5 toys → That's all that exists
- Mobile app correctly showing all available

**B) Query Has Hidden Limit**
- Less likely
- No explicit `&limit=` in query (line 76)
- Supabase default limit is 1000 (no issue)
- Azure Function has no `.slice()` or pagination limit

**Diagnosis:** Almost certainly (A) - database has exactly 5 ride-on toys in stock

---

## 🔧 Fix Required

### Fix product-by-category to Handle Category 80 Correctly

**File:** `/api/product-by-category/index.js`

**Replace lines 52-82 with:**

```javascript
// Special case: Category 80 = Ride-On Toys (old WordPress convention)
let toysQuery;
let categoryName;

if (categories === '80') {
    // RIDE-ON TOYS - Query by category, not age
    context.log('🚗 Category 80 detected - fetching RIDE-ON TOYS ONLY');
    categoryName = 'Ride-On Toys';
    
    toysQuery = `${supabaseUrl}/rest/v1/toys?category=eq.ride_on_toys&available_quantity=gt.0&order=display_order.asc,created_at.desc`;
    
} else {
    // REGULAR TOYS - Age-based filtering
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
    
    categoryName = categoryNames[categories] || 'All Toys';
    
    let minAge, maxAge;
    switch (categories) {
        case '71': minAge = 0; maxAge = 6; break;
        case '72': minAge = 6; maxAge = 12; break;
        case '73': minAge = 1; maxAge = 2; break;
        case '74': minAge = 2; maxAge = 3; break;
        case '75': minAge = 3; maxAge = 4; break;
        case '76': minAge = 4; maxAge = 6; break;
        case '77': minAge = 5; maxAge = 8; break;
        case '812': minAge = 8; maxAge = 12; break;
        case '1216': minAge = 12; maxAge = 16; break;
        default: minAge = 0; maxAge = 16; break;
    }
    
    context.log(`🔍 Fetching toys for age range: ${minAge}-${maxAge} years`);
    
    toysQuery = `${supabaseUrl}/rest/v1/toys?available_quantity=gt.0&order=display_order.asc,created_at.desc`;
    
    if (minAge !== 0 || maxAge !== 16) {
        toysQuery += `&min_age=gte.${minAge}&max_age=lte.${maxAge}`;
    }
}

context.log('🔍 Query:', toysQuery);
```

---

## 🎯 What This Fixes

### Before:
```
Mobile App → categories=80
    ↓
Azure Function: minAge=0, maxAge=8
    ↓
Query: All toys for ages 0-8
    ↓
Returns: Mix of regular toys + ride-on toys ❌
```

### After:
```
Mobile App → categories=80
    ↓
Azure Function: Detects category 80
    ↓
Query: category='ride_on_toys'
    ↓
Returns: ONLY ride-on toys ✅
```

---

## 📊 Impact Assessment

### Fixes:
- ✅ Mobile app shows ONLY ride-on toys (not mixed)
- ✅ Matches old WordPress behavior
- ✅ Consistent with proxy/index.js implementation

### Doesn't Break:
- ✅ Other categories still work (age-based filtering)
- ✅ No changes to response format
- ✅ No app changes needed

### Toy Count:
- If 5 toys show → Database has 5 available
- If more show after fix → Great!
- Either way, shows correct data

---

## 🧪 Testing

### Before Deploying:
```bash
# Check database for ride-on toy count
# (Need Supabase SQL Editor or API access)
```

### After Deploying:
1. Mobile app → Browse ride-on section
2. Should see ONLY ride-on category toys
3. No regular toys mixed in
4. Count = database available count

---

## 🚀 Deployment

**Files to Change:** 1 file only
- `/api/product-by-category/index.js` (lines 52-82)

**Risk:** Low (isolated change, backwards compatible)

**Testing:** Easy (mobile app ride-on section)

---

## ✅ Summary

**Data Source:** ✅ Real Supabase data (not mocks)  
**Issue:** ❌ Wrong query (age-based instead of category-based)  
**Fix:** ✅ Add special case for category=80  
**Toy Count:** ❓ Likely database has only 5 (need to verify)  
**Ready to Fix:** ✅ Yes  

**Recommendation:** Implement the fix and verify database count separately.

