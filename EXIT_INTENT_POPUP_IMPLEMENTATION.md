# 🎯 Exit-Intent Popup with 20% Discount Implementation

## 📋 Overview

This implementation adds an exit-intent popup system that shows a 20% discount offer when users are about to leave the website. The system is designed to improve conversion rates by capturing users who might otherwise abandon their purchase.

## ✨ Features

### 🎪 Exit-Intent Popup
- **Smart Detection**: Detects when users move their mouse toward the browser's top edge (exit intent)
- **Mobile Support**: Uses scroll-based detection for mobile devices (70% page scroll)
- **Frequency Control**: Shows only once per session with 24-hour cookie expiry
- **Page Targeting**: Only shows on specific pages (landing, pricing, subscription flow)
- **User Type Filtering**: Can target guests, authenticated users, or both

### 💰 Discount System
- **20% Discount**: Automatic 20% discount on all subscription plans
- **Maximum Cap**: ₹500 maximum discount to prevent abuse
- **Multiple Codes**: 
  - `SAVE20EXIT`: General exit-intent discount
  - `MOBILE20`: Mobile-specific discount
  - `WELCOME20`: First-time users only
- **Auto-Application**: Automatically applies stored discount in payment flow
- **Validation**: Server-side validation with comprehensive error handling

### 📊 Analytics Integration
- **Facebook Pixel**: Tracks popup views, claims, and conversions
- **Drop Tracking**: Integrates with existing customer drop tracking system
- **Journey Events**: Records user interactions for analysis
- **Microsoft Clarity**: Compatible with existing Clarity tracking

## 🏗️ Architecture

### Components
```
src/components/
├── ExitIntentPopup.tsx          # Main popup component
├── ExitIntentProvider.tsx       # App-level provider
└── subscription/
    └── PaymentFlow.tsx          # Updated with promo code field
```

### Hooks
```
src/hooks/
├── useExitIntent.ts             # Core exit-intent detection
└── useExitIntentManager.ts      # Page-specific management
```

### Services
```
src/services/
└── discountService.ts           # Discount validation & application
```

### Database
```
supabase/migrations/
└── 20250126000000_create_exit_intent_discount.sql
```

## 🚀 Implementation Details

### 1. Exit-Intent Detection

The system uses mouse movement tracking to detect exit intent:

```typescript
// Desktop: Mouse leaving from top edge
if (e.clientY <= config.sensitivity) {
  triggerExitIntent();
}

// Mobile: 70% page scroll
if (scrollPercentage > 70) {
  triggerExitIntent();
}
```

### 2. Popup Flow

1. **Offer Step**: Shows 20% discount with social proof
2. **Capture Step**: Collects email/phone for non-authenticated users
3. **Success Step**: Confirms discount application and redirects

### 3. Payment Integration

The payment flow now supports two discount systems:

- **Coupon Codes**: Existing system for queue bypass (admin only)
- **Promo Codes**: New system for customer discounts (20% off)

```typescript
// Separate state management
const [couponCode, setCouponCode] = useState('');      // Queue bypass
const [promoCode, setPromoCode] = useState('');        // Customer discounts

// Combined discount calculation
const totalDiscount = couponDiscount + promoDiscount;
const finalAmount = subtotalAmount - totalDiscount;
```

### 4. Auto-Application

When users claim the exit-intent discount:

1. Discount code stored in localStorage with 30-minute expiry
2. User redirected to subscription flow
3. Payment component auto-detects and applies discount
4. Success message shown to user

## 📱 User Experience

### Desktop Flow
1. User browses website for 30+ seconds
2. Mouse moves toward browser top edge
3. Popup appears with 20% discount offer
4. User can claim discount or dismiss popup
5. If claimed, redirected to subscription with discount applied

### Mobile Flow
1. User scrolls through 70% of page content
2. Popup appears (optimized for mobile)
3. Same claim/dismiss flow as desktop
4. Touch-friendly interface

## 🎛️ Configuration

### Page Targeting
```typescript
const config = {
  enabledPages: [
    '/',
    '/pricing',
    '/subscription-flow',
    '/select-toys',
    '/about'
  ],
  disabledPages: [
    '/auth',
    '/dashboard',
    '/admin',
    '/confirmation-success'
  ],
  minTimeOnPage: 30,        // seconds
  maxShowsPerSession: 1,
  userTypeRestrictions: ['guest', 'authenticated']
};
```

### Discount Settings
```sql
-- 20% discount with ₹500 cap
value: 20.00
max_discount_amount: 500.00
target_plans: ['discovery-delight', 'silver-pack', 'gold-pack']
```

## 🔧 Setup Instructions

### 1. Database Setup

Run the discount creation script:
```bash
cd /path/to/toy-joy-box-club
node scripts/create-exit-intent-discounts.js
```

Or manually run the SQL migration:
```sql
-- Run the contents of supabase/migrations/20250126000000_create_exit_intent_discount.sql
```

### 2. Environment Variables

No additional environment variables required. Uses existing:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Component Integration

The system is automatically integrated via `ExitIntentProvider` in `App.tsx`:

```tsx
<ExitIntentProvider>
  <Routes>
    {/* Your routes */}
  </Routes>
</ExitIntentProvider>
```

## 📊 Analytics & Tracking

### Events Tracked

1. **Popup Events**:
   - `exit_intent_popup_shown`
   - `exit_intent_offer_claimed`
   - `exit_intent_info_captured`
   - `exit_intent_popup_dismissed`

2. **Facebook Pixel Events**:
   - `ViewContent`: Popup shown
   - `Lead`: Discount claimed
   - `CompleteRegistration`: Info captured

3. **Drop Tracking**:
   - Integrates with existing customer drop analysis
   - Records page context and user behavior

### Microsoft Clarity

The popup is fully compatible with Microsoft Clarity and will appear in session recordings for analysis.

## 🧪 Testing

### Test Scenarios

1. **Desktop Exit Intent**:
   - Visit homepage
   - Wait 30 seconds
   - Move mouse to top edge
   - Verify popup appears

2. **Mobile Scroll Intent**:
   - Visit on mobile device
   - Scroll to 70% of page
   - Verify popup appears

3. **Discount Application**:
   - Claim discount from popup
   - Complete subscription flow
   - Verify 20% discount applied

4. **Frequency Control**:
   - Trigger popup once
   - Try to trigger again
   - Verify it doesn't show again

### Debug Mode

In development, check browser console for debug logs:
```
🔍 Exit Intent Manager State: { ... }
🎯 Exit intent popup triggered: { ... }
```

## 🚨 Important Notes

### Existing Functionality Preserved

- **Queue Bypass Codes**: All existing coupon codes (freecode, testfree, etc.) continue to work
- **Admin Functions**: Queue management and bypass functionality unchanged
- **Payment Flow**: Existing payment logic preserved with additions

### Performance Considerations

- **Lightweight**: Minimal impact on page load
- **Efficient**: Uses passive event listeners
- **Cached**: Popup state cached to prevent repeated shows

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Fallbacks**: Graceful degradation for older browsers

## 🔮 Future Enhancements

### Potential Improvements

1. **A/B Testing**: Different discount amounts and messaging
2. **Personalization**: User-specific offers based on behavior
3. **Advanced Targeting**: Geographic, device, or referrer-based rules
4. **Email Integration**: Automated follow-up emails for non-converters
5. **Social Proof**: Real-time customer count and testimonials

### Analytics Insights

Monitor these metrics to optimize performance:
- **Popup Show Rate**: How often popup is triggered
- **Claim Rate**: Percentage of users who claim discount
- **Conversion Rate**: Percentage who complete purchase
- **Revenue Impact**: Total additional revenue generated

## 📞 Support

For issues or questions:
1. Check browser console for error messages
2. Verify database discount codes exist
3. Test in incognito mode to reset cookies
4. Check network requests for API errors

The system is designed to fail gracefully - if any component fails, the user experience remains intact without the popup.
