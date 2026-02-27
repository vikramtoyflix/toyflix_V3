# 🌍 Global Exit-Intent Test Plan

## ✅ **Updated System - Works on ALL Pages**

The exit-intent banner now works **globally across your entire website** to catch users who might leave from any page.

### 🎯 **Pages Where Banner Works**

#### **✅ ENABLED (All Pages Except Disabled List)**:
- 🏠 **Homepage** (`/`)
- 💰 **Pricing** (`/pricing`)
- 🔐 **Authentication** (`/auth`) - *Now enabled!*
- 📱 **Dashboard** (`/dashboard`) - *Now enabled for new users!*
- 🎯 **Subscription Flow** (`/subscription-flow`)
- 🧸 **Toy Selection** (`/select-toys`)
- ℹ️ **About Page** (`/about`)
- 📞 **Contact** (`/contact`)
- 🛒 **All Product Pages**
- 📄 **All Content Pages**
- **...and every other page on your site!**

#### **❌ DISABLED (Only These Pages)**:
- ✅ **Confirmation Success** (`/confirmation-success`) - User already converted
- ✅ **Payment Success** (`/payment-success`) - User already paid
- ✅ **Signup Success** (`/signup-success`) - User already signed up
- 🛠️ **Admin Panel** (`/admin`) - Keep admin interface clean

### 🧪 **Complete Test Plan**

#### **Test 1: Homepage Exit-Intent**
```bash
# Test on main landing page
1. Open incognito window
2. Go to: https://yoursite.com/
3. Move mouse to top → Banner should appear
4. Move mouse back → Banner should hide
5. Repeat → Banner should appear again
```

#### **Test 2: Pricing Page Exit-Intent**
```bash
# Test on pricing page (high-intent users)
1. Open incognito window
2. Go to: https://yoursite.com/pricing
3. Move mouse to top → Banner should appear
4. Test mobile idle (20 seconds) → Banner should appear
```

#### **Test 3: Auth Page Exit-Intent** ⭐ **NEW!**
```bash
# Test on login/signup page (users considering signup)
1. Open incognito window
2. Go to: https://yoursite.com/auth
3. Move mouse to top → Banner should appear
4. Perfect for users hesitating to sign up!
```

#### **Test 4: Dashboard Exit-Intent** ⭐ **NEW!**
```bash
# Test on dashboard (but only for new users)
1. Open incognito window (not signed in)
2. Go to: https://yoursite.com/dashboard
3. Move mouse to top → Banner should appear
4. Sign in → Banner should disappear (existing users don't see it)
```

#### **Test 5: Product Pages Exit-Intent** ⭐ **NEW!**
```bash
# Test on any product/toy page
1. Open incognito window
2. Go to any product page
3. Move mouse to top → Banner should appear
4. Great for users browsing products!
```

#### **Test 6: Subscription Flow Exit-Intent**
```bash
# Test during subscription process (critical!)
1. Open incognito window
2. Go to: https://yoursite.com/subscription-flow
3. Move mouse to top → Banner should appear
4. Perfect for users abandoning checkout!
```

### 📊 **Expected Behavior by Page Type**

| Page Type | New Users | Signed-In Users | Exit-Intent Works |
|-----------|-----------|-----------------|-------------------|
| **Homepage** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Pricing** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Auth/Login** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Dashboard** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Products** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Checkout** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **About/Contact** | ✅ Shows Banner | ❌ No Banner | ✅ Yes |
| **Success Pages** | ❌ No Banner | ❌ No Banner | ❌ Disabled |
| **Admin Panel** | ❌ No Banner | ❌ No Banner | ❌ Disabled |

### 🎯 **Why This Is Better**

#### **Maximum Coverage**:
✅ **Catch users leaving from ANY page** - not just homepage
✅ **Auth page exit-intent** - users hesitating to sign up
✅ **Product page exit-intent** - users browsing but not buying
✅ **Checkout abandonment** - users leaving during payment
✅ **Dashboard exit-intent** - new users exploring features

#### **Smart Targeting**:
✅ **Only new users see it** - existing customers have clean experience
✅ **Disabled on success pages** - don't annoy users who already converted
✅ **Clean admin interface** - no distractions for admins

### 🚀 **Real-World Scenarios**

#### **Scenario 1: Homepage Visitor**
```
User visits homepage → Browses content → Moves mouse to leave
→ Banner appears: "Wait! Don't leave without your discount!"
→ User copies SAVE20EXIT → Proceeds to signup with discount
```

#### **Scenario 2: Pricing Page Browser**
```
User checks pricing → Compares plans → Starts to leave
→ Banner appears with 20% off → User reconsiders
→ Copies code → Signs up with discount
```

#### **Scenario 3: Auth Page Hesitation** ⭐ **NEW!**
```
User reaches signup page → Hesitates about signing up → Moves to leave
→ Banner appears with discount → Reduces signup friction
→ User signs up with 20% off incentive
```

#### **Scenario 4: Product Browser** ⭐ **NEW!**
```
User browses toys → Likes products but unsure → Starts to leave
→ Banner appears → User realizes they can get 20% off
→ Proceeds to subscription with confidence
```

#### **Scenario 5: Checkout Abandonment** ⭐ **NEW!**
```
User in subscription flow → Sees total price → Hesitates → Starts to leave
→ Banner appears with discount → Perfect timing!
→ User applies discount and completes purchase
```

### 📱 **Mobile Testing**

#### **Global Mobile Exit-Intent**:
```bash
# Test on ANY page with mobile device
1. Open any page in incognito (mobile)
2. Don't interact for 20 seconds
3. Banner should appear automatically
4. Touch/scroll → Banner should hide
5. Go idle again → Banner reappears
```

### 🔧 **Development Testing**

#### **Use the Test Helper**:
The yellow test helper (bottom-right in dev mode) now shows:
- 🌍 **"Works on ALL pages"** indicator
- 🧪 **Manual trigger button** works on any page
- 👤 **User status** (new vs signed-in)
- ⚠️ **Warnings** if you're signed in

### 📈 **Expected Impact**

#### **Conversion Improvements**:
🎯 **5-10x more opportunities** to show discount (all pages vs limited pages)
🎯 **Higher auth page conversions** - catch signup hesitation
🎯 **Reduced checkout abandonment** - discount at critical moment
🎯 **Better product page engagement** - incentive to subscribe
🎯 **Overall higher signup rates** - global coverage

#### **User Experience**:
😊 **New users** get help wherever they are on the site
😊 **Existing users** never see promotional banners
😊 **Contextual timing** - appears when users are leaving
😊 **Non-intrusive** - header banner doesn't block content

### ✅ **Quick Verification**

**Test right now:**
1. **Open incognito window**
2. **Visit ANY page** on your site (except success/admin pages)
3. **Move mouse to top** of browser window
4. **Banner should appear** with SAVE20EXIT code
5. **Try different pages** - should work everywhere!

The exit-intent system now provides **complete coverage** across your entire website, maximizing conversion opportunities while maintaining a clean experience for existing customers.

**Your global exit-intent system is ready! 🌍🎯**
