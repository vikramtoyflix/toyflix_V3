# 🎯 New User Exit-Intent System

## 📋 Requirements Met

✅ **Show banner EVERY TIME exit-intent is detected**
✅ **Only for new users (not signed in)**
✅ **Proper desktop mouse movement detection**
✅ **Proper mobile idle time detection**

## 🎨 How It Works

### 👤 **User Targeting**
- **Only shows to NEW USERS** (not authenticated/signed in)
- **Existing users NEVER see the banner** (clean experience for customers)
- **Perfect for first-time visitors** who are considering signing up

### 🖥️ **Desktop Exit-Intent Detection**
```typescript
// Triggers when mouse moves to top 10px of page (exit-intent)
if (e.clientY <= 10) {
  // Show banner after 300ms delay
  setTimeout(() => setIsVisible(true), 300);
}
```

**Behavior**:
- ✅ **Shows EVERY TIME** mouse moves toward top of page
- ✅ **Hides when mouse re-enters** page content
- ✅ **Can show multiple times** in same session
- ✅ **300ms delay** to prevent accidental triggers

### 📱 **Mobile Idle Detection**
```typescript
// Triggers after 20 seconds of no touch/scroll activity
if (timeSinceActivity >= 20000) {
  setIsVisible(true);
}
```

**Behavior**:
- ✅ **Shows after 20 seconds** of inactivity
- ✅ **Hides when user becomes active** (touch/scroll)
- ✅ **Can show multiple times** when user goes idle again
- ✅ **Tracks touch, scroll, and interaction** events

### ⏰ **Auto-Hide Feature**
- **Banner auto-hides after 10 seconds** to avoid being too persistent
- **User can manually close** with X button
- **Hides on user interaction** (mouse re-enter on desktop, activity on mobile)

## 🎯 **Banner Design**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎁 Wait! Don't leave without your discount! [20% OFF]          │
│ [SAVE20EXIT] [📋 Copy] [✕ Close]                               │
│ 🎉 New customer special! Use this code at checkout to get 20%  │
│ off your first subscription!                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Features**:
- 🎨 **Orange to red gradient** background
- 🎁 **Gift icon** for visual appeal
- 📋 **One-click copy** functionality
- ✕ **Manual close** option
- 🎉 **New customer messaging** to create urgency

## 🛠️ **Technical Implementation**

### **Component**: `PromoHeaderBanner.tsx`

**Key Features**:
```typescript
// Only show to new users
const isNewUser = !user;

// Show every time exit-intent is detected (no session limits)
const handleMouseLeave = (e: MouseEvent) => {
  if (e.clientY <= 10) {
    setIsVisible(true); // No hasInteracted check
  }
};

// Hide when user re-engages
const handleMouseEnter = () => {
  if (isVisible && !isMobile) {
    setIsVisible(false); // Hide so it can show again
  }
};
```

### **Page Targeting**
```typescript
// Enabled pages (where banner can show)
const enabledPages = [
  '/',           // Homepage
  '/pricing',    // Pricing page
  '/subscription-flow', // Subscription flow
  '/select-toys', // Toy selection
  '/about'       // About page
];

// Disabled pages (never show banner)
const disabledPages = [
  '/auth',       // Login/signup pages
  '/dashboard',  // User dashboard
  '/admin',      // Admin panel
  '/confirmation-success', // Success pages
  '/payment-success'
];
```

## 🧪 **Testing the System**

### **Development Test Helper**
In development mode, you'll see a yellow test helper in the bottom-right corner:

**Features**:
- 👤 **Shows current user status** (New User vs Signed In)
- 🖱️ **Manual trigger button** for desktop exit-intent
- 📱 **Instructions for mobile testing** (wait 20 seconds)
- ⚠️ **Warnings** if you're signed in (banner won't show)

### **Test Scenarios**

#### **Scenario 1: New User on Desktop**
1. **Open homepage** in incognito mode (or sign out)
2. **Move mouse to very top** of browser window
3. **Banner should appear** after 300ms
4. **Move mouse back** to page content
5. **Banner should hide**
6. **Repeat** - banner should show again on next exit-intent

#### **Scenario 2: New User on Mobile**
1. **Open homepage** in incognito mode (or sign out)
2. **Don't interact** for 20 seconds (no scrolling, touching)
3. **Banner should appear** automatically
4. **Touch or scroll** the page
5. **Banner should hide**
6. **Wait 20 seconds** again - banner should reappear

#### **Scenario 3: Existing User**
1. **Sign in** to your account
2. **Try exit-intent** or idle detection
3. **Banner should NOT appear** (only for new users)

## 📊 **User Journey**

### **New User Experience**:
```
1. User visits homepage (not signed in)
2. Browses content normally
3. Moves mouse toward top (exit-intent) OR goes idle (mobile)
4. Banner slides down: "Wait! Don't leave without your discount!"
5. User sees SAVE20EXIT code with copy button
6. User clicks copy button (code copied to clipboard)
7. User continues to subscription flow
8. User pastes SAVE20EXIT in promo code field
9. 20% discount applied automatically
10. User completes signup with discount
```

### **Repeat Behavior**:
- **Every time** user shows exit-intent, banner appears again
- **No session limits** - can show multiple times
- **Always hides** when user re-engages with content
- **Perfect for hesitant users** who need multiple reminders

## 🎯 **Business Benefits**

### **Conversion Optimization**:
✅ **Targets abandoning users** at the moment they're leaving
✅ **Multiple opportunities** to convert (shows every time)
✅ **New user focus** prevents annoying existing customers
✅ **Mobile-optimized** with proper idle detection
✅ **Copy-paste workflow** reduces friction

### **User Experience**:
✅ **Non-intrusive** header banner (doesn't block content)
✅ **Quick copy functionality** for easy code usage
✅ **Auto-hide feature** prevents banner fatigue
✅ **Responsive design** works on all devices
✅ **Clear messaging** specifically for new customers

## 🔧 **Admin Panel Integration**

**Location**: Admin Panel → Promotional Offers → Exit-Intent Popup Tab

**Updated Features**:
- 📊 **Analytics tracking** for banner shows and conversions
- ⚙️ **Configuration controls** for timing and behavior
- 👥 **User targeting** settings (new users only)
- 📈 **Performance metrics** and A/B testing capabilities

## 📈 **Expected Results**

### **Performance**:
✅ **No more infinite loops** or React errors
✅ **Fast page loading** with lightweight implementation
✅ **Smooth animations** and responsive design
✅ **Stable system** without memory leaks

### **Conversion Metrics**:
🎯 **Higher signup rates** from exit-intent targeting
🎯 **Increased promo code usage** with easy copy functionality
🎯 **Better mobile conversion** with proper idle detection
🎯 **Reduced bounce rates** by capturing leaving users

### **User Satisfaction**:
😊 **New users** get helpful discount offers
😊 **Existing users** have clean, uninterrupted experience
😊 **Mobile users** get proper idle-based targeting
😊 **All users** benefit from non-intrusive design

## 🚀 **Ready to Test**

**Refresh your browser and try these tests:**

1. **Sign out** or use **incognito mode**
2. **Go to homepage** (`/`)
3. **Move mouse to top** of page (desktop) or **wait 20 seconds** (mobile)
4. **Banner should appear** with SAVE20EXIT code
5. **Click copy button** and test in checkout

The system now perfectly meets your requirements:
- ✅ **Shows EVERY TIME** exit-intent is detected
- ✅ **Only for NEW USERS** (not signed in)
- ✅ **Proper mouse detection** for desktop
- ✅ **Proper idle detection** for mobile
- ✅ **Fast, stable performance** without React errors

**Your new user conversion system is ready! 🎉**
