# Signals Gateway Pixel Code - Testing & Verification Guide

## 📋 Overview

This guide provides comprehensive instructions for testing and verifying the Signals Gateway Pixel Code implementation for Toyflix.

**Account ID**: `1624774576036784247`  
**Pixel URL**: `https://signals.madgicx.cc/sdk/1624774576036784247/events.js`  
**Events Tracked**: 21 custom events across 13 files

---

## 🔍 Initial Diagnosis & Findings

### ✅ What's Correctly Implemented

1. **Pixel Installation** ([`index.html:53-67`](index.html:53-67))
   - Pixel code properly installed in `<head>` section
   - Account ID configured: `1624774576036784247`
   - Host set to: `https://signals.madgicx.cc/`
   - Initial `PageView` event tracked on load

2. **TypeScript Declarations** ([`src/types/analytics.d.ts`](src/types/analytics.d.ts))
   - Proper type definitions for `window.cbq`
   - Correct function signature: `(action: string, eventName: string, eventData?: Record<string, any>) => void`

3. **Event Implementation Pattern**
   - All events use proper existence checks: `if (typeof window !== 'undefined' && window.cbq)`
   - Consistent event data structure with `user_id` and contextual parameters
   - Helper functions in [`src/utils/fbq.ts`](src/utils/fbq.ts) for tracking

### ⚠️ Potential Issues Identified

Based on browser console testing, the following issues may exist:

1. **Silent Loading**: 
   - No console confirmation that Signals Gateway pixel loaded
   - Other analytics (Google Analytics, Meta Pixel) show initialization logs
   - May indicate script loading issue or network blocking

2. **Missing Console Feedback**:
   - `window.cbq` function availability not confirmed in initial page load
   - No error messages visible, which could indicate silent failure

3. **Possible Root Causes**:
   - Script may be blocked by ad blockers or privacy extensions
   - Network request to `signals.madgicx.cc` may fail
   - CORS or CSP issues preventing script execution
   - Account ID may not be active/valid

---

## 🧪 Step-by-Step Testing Instructions

### Phase 1: Verify Pixel Installation

#### Test 1.1: Check Script Loading
1. Open browser Developer Tools (F12)
2. Navigate to **Network** tab
3. Filter by "events.js" or "madgicx"
4. Reload the page (Ctrl+R / Cmd+R)
5. **Expected Result**: See request to `https://signals.madgicx.cc/sdk/1624774576036784247/events.js`
6. **Check Response**: Status should be `200 OK`

**✅ Success Criteria**:
- Script request appears in Network tab
- Status code: 200
- Content-Type: application/javascript
- Response body contains pixel code

**❌ Failure Indicators**:
- No request to signals.madgicx.cc
- 404 Not Found (invalid account ID)
- 403 Forbidden (account not active)
- Request blocked by browser extension

#### Test 1.2: Verify cbq Function Availability
1. Open browser Console tab
2. Type and execute:
```javascript
console.log('cbq exists:', typeof window.cbq);
console.log('cbq function:', window.cbq);
```

**✅ Expected Output**:
```
cbq exists: function
cbq function: ƒ cbq() { ... }
```

**❌ If Undefined**:
```
cbq exists: undefined
cbq function: undefined
```
→ This indicates the pixel script failed to load or execute

#### Test 1.3: Check Pixel Properties
If `window.cbq` exists, run:
```javascript
console.log('Pixel loaded:', window.cbq.loaded);
console.log('Pixel version:', window.cbq.version);
console.log('Event queue:', window.cbq.queue);
```

**✅ Expected Output**:
```
Pixel loaded: true
Pixel version: "2.0"
Event queue: [...]
```

---

### Phase 2: Test Automatic PageView Event

#### Test 2.1: Verify PageView on Page Load
1. Clear console logs (Ctrl+L / Cmd+K)
2. Reload the page
3. Check Network tab for outgoing tracking request

**✅ Expected Result**:
- Request to `https://signals.madgicx.cc/` with PageView event data
- Status: 200 OK

**To Debug**: Add temporary logging to [`index.html:65`](index.html:65):
```javascript
console.log('📊 Signals Gateway - PageView tracked');
cbq('track', 'PageView');
```

---

### Phase 3: Test Critical Custom Events

#### Test 3.1: SendOTP Event ([`src/hooks/useOTPAuth.ts:50`](src/hooks/useOTPAuth.ts:50))

**User Journey**: Login with Phone Number

1. Navigate to Sign In page
2. Open Developer Console
3. Enter phone number: `9876543210`
4. Click "Send OTP"

**Check Console for**:
```javascript
📊 Signals Gateway tracked: SendOTP {phone: '+919876543210', timestamp: ...}
```

**Manual Test**:
```javascript
// Simulate the event
window.cbq('track', 'SendOTP', {
  phone: '+919876543210',
  timestamp: new Date().toISOString()
});
```

**Check Network Tab**:
- Look for POST request to `signals.madgicx.cc`
- Payload should contain: `event: "SendOTP"`, `phone: "+919876543210"`

---

#### Test 3.2: CompleteRegistration Event

**Locations**: 
- [`src/hooks/useSignupCompletionTracking.ts:113`](src/hooks/useSignupCompletionTracking.ts:113)
- [`src/hooks/useOTPAuth.ts:113`](src/hooks/useOTPAuth.ts:113)

**User Journey**: Complete Signup Flow

1. Start new account registration
2. Enter phone number → Verify OTP
3. Complete profile information
4. Submit registration

**Expected Console**:
```javascript
📊 Signals Gateway tracked: CompleteRegistration {
  user_id: "uuid-here",
  registration_method: "phone",
  timestamp: "2025-10-28T..."
}
```

**Manual Test**:
```javascript
window.cbq('track', 'CompleteRegistration', {
  user_id: 'test-user-123',
  registration_method: 'phone',
  timestamp: new Date().toISOString()
});
```

---

#### Test 3.3: Subscribe Event ([`src/services/subscription/subscriptionCreation.ts:104`](src/services/subscription/subscriptionCreation.ts:104))

**User Journey**: Create New Subscription

1. Navigate to Pricing page
2. Select a subscription plan
3. Complete checkout process
4. Confirm subscription

**Expected Event Data**:
```javascript
{
  user_id: "uuid",
  subscription_plan_id: "plan-uuid",
  plan_name: "Premium Monthly",
  currency: "INR",
  value: 2999,
  timestamp: "2025-10-28T..."
}
```

**Manual Test**:
```javascript
window.cbq('track', 'Subscribe', {
  user_id: 'test-user-123',
  subscription_plan_id: 'plan-premium',
  plan_name: 'Premium Monthly',
  currency: 'INR',
  value: 2999,
  timestamp: new Date().toISOString()
});
```

---

#### Test 3.4: Purchase Event ([`src/hooks/useRazorpay.ts:184`](src/hooks/useRazorpay.ts:184))

**User Journey**: Complete Payment

1. Select subscription plan
2. Proceed to payment
3. Complete Razorpay payment
4. Verify success

**Expected Event Data**:
```javascript
{
  user_id: "uuid",
  currency: "INR",
  value: 2999,
  payment_method: "razorpay",
  order_id: "order_xxx",
  payment_id: "pay_xxx",
  timestamp: "2025-10-28T..."
}
```

**Simulation** (for testing without actual payment):
```javascript
window.cbq('track', 'Purchase', {
  user_id: 'test-user-123',
  currency: 'INR',
  value: 2999,
  payment_method: 'razorpay',
  order_id: 'order_test123',
  payment_id: 'pay_test456',
  timestamp: new Date().toISOString()
});
```

---

### Phase 4: Network Monitoring

#### Test 4.1: Monitor All Tracking Requests
1. Open Developer Tools → Network tab
2. Filter by "madgicx" or "signals"
3. Perform user actions (login, subscribe, etc.)
4. Review each tracking request

**For Each Request, Check**:
- URL: Should be to `https://signals.madgicx.cc/`
- Method: POST
- Status: 200 OK
- Request Payload: Contains event name and data
- Response: Success confirmation

**Example Request Payload**:
```json
{
  "event": "Purchase",
  "data": {
    "user_id": "uuid-here",
    "currency": "INR",
    "value": 2999,
    "timestamp": "2025-10-28T14:30:00.000Z"
  },
  "account_id": "1624774576036784247"
}
```

---

## 🐛 Troubleshooting Guide

### Issue 1: `window.cbq is undefined`

**Diagnosis Steps**:
1. Check Network tab for script loading
2. Look for blocked requests (red X or blocked status)
3. Check browser console for errors
4. Verify no ad blockers are enabled

**Possible Solutions**:
- **Ad Blocker**: Disable ad blocker or privacy extension
- **Script Load Failure**: Check account ID validity
- **Network Issue**: Verify internet connection to signals.madgicx.cc
- **CSP Policy**: Check for Content Security Policy restrictions

**Quick Test**:
```javascript
// Manually load the script
const script = document.createElement('script');
script.src = 'https://signals.madgicx.cc/sdk/1624774576036784247/events.js';
script.async = true;
document.head.appendChild(script);
script.onload = () => console.log('✅ Pixel loaded successfully');
script.onerror = () => console.error('❌ Pixel failed to load');
```

---

### Issue 2: No Network Requests to signals.madgicx.cc

**Diagnosis**:
- Pixel may be queuing events but not sending them
- Network configuration issue
- CORS blocking requests

**Check**:
```javascript
console.log('Event queue:', window.cbq?.queue);
console.log('Queue length:', window.cbq?.queue?.length);
```

**Solution**:
```javascript
// Force flush queue (if applicable)
if (window.cbq && window.cbq.queue) {
  console.log('Pending events:', window.cbq.queue.length);
}
```

---

### Issue 3: Events Tracked but Not Appearing in Dashboard

**Diagnosis**:
- Events are sent (Network shows 200 OK)
- But not visible in Signals Gateway dashboard

**Possible Causes**:
1. **Delayed Processing**: Events may take 5-15 minutes to appear
2. **Invalid Account ID**: Check account is active
3. **Event Name Mismatch**: Verify event names match expected format
4. **Data Validation**: Event data may be rejected due to format issues

**Test with Standard Event**:
```javascript
// Test with minimal data
window.cbq('track', 'PageView', {});
```

---

### Issue 4: Some Events Work, Others Don't

**Diagnosis Pattern**:
- PageView works → Pixel is functional
- Custom events don't work → Implementation issue

**Check Event Implementation**:
1. Review event calling code
2. Verify data structure matches requirements
3. Check for typos in event names
4. Ensure user_id is valid UUID format

**Validate Event Data**:
```javascript
// Before sending event, log it
const eventData = {
  user_id: 'test-123',
  value: 2999,
  currency: 'INR'
};
console.log('Sending event:', 'Purchase', eventData);
window.cbq('track', 'Purchase', eventData);
```

---

## 📊 Complete Event Inventory

### Navigation & Discovery Events
1. **PageView** - Automatic on every page load ([`index.html:65`](index.html:65))

### Authentication Events
2. **SendOTP** - OTP request ([`src/hooks/useOTPAuth.ts:50`](src/hooks/useOTPAuth.ts:50))
3. **CompleteRegistration** - Signup completion ([`src/hooks/useSignupCompletionTracking.ts:113`](src/hooks/useSignupCompletionTracking.ts:113))
4. **Logout** - User sign out ([`src/services/auth/signOutService.ts:23`](src/services/auth/signOutService.ts:23))

### Subscription Events
5. **Subscribe** - New subscription ([`src/services/subscription/subscriptionCreation.ts:104`](src/services/subscription/subscriptionCreation.ts:104))
6. **StartSubscriptionFlow** - Flow initiated ([`src/hooks/useSubscriptionFlow.ts:32`](src/hooks/useSubscriptionFlow.ts:32))
7. **UpgradeSubscription** - Plan upgrade ([`src/hooks/useSubscriptionUpgrade.ts:28`](src/hooks/useSubscriptionUpgrade.ts:28))
8. **PauseSubscription** - Subscription paused ([`src/services/subscription/subscriptionPauseResume.ts:46`](src/services/subscription/subscriptionPauseResume.ts:46))
9. **ResumeSubscription** - Subscription resumed ([`src/services/subscription/subscriptionPauseResume.ts:119`](src/services/subscription/subscriptionPauseResume.ts:119))
10. **RideOnSubscriptionStarted** - Ride-on toy subscription ([`src/pages/ProductDetail.tsx:142`](src/pages/ProductDetail.tsx:142))

### Selection & Ordering Events
11. **SelectToy** - Toy selected ([`src/pages/ToySelection.tsx:109`](src/pages/ToySelection.tsx:109))
12. **AddressSelected** - Delivery address chosen ([`src/pages/ToySelection.tsx:170`](src/pages/ToySelection.tsx:170))
13. **QueueOrderCreated** - Queue order placed ([`src/pages/ToySelection.tsx:234`](src/pages/ToySelection.tsx:234))

### Profile Events
14. **ProfileUpdated** - User profile changed ([`src/hooks/useProfile.ts:82`](src/hooks/useProfile.ts:82))

### Payment Events
15. **InitiateCheckout** - Checkout started ([`src/hooks/useRazorpay.ts:71`](src/hooks/useRazorpay.ts:71))
16. **CheckoutStarted** - Payment flow begun ([`src/hooks/useRazorpay.ts:369`](src/hooks/useRazorpay.ts:369))
17. **Purchase** - Payment completed ([`src/hooks/useRazorpay.ts:184`](src/hooks/useRazorpay.ts:184))
18. **PaymentFailed** - Payment error ([`src/hooks/useRazorpay.ts:131`](src/hooks/useRazorpay.ts:131))
19. **CancelCheckout** - Checkout abandoned ([`src/hooks/useRazorpay.ts:337`](src/hooks/useRazorpay.ts:337))

### Engagement Events
20. **ExitIntent** - User about to leave ([`src/hooks/useExitIntent.ts:91`](src/hooks/useExitIntent.ts:91))

---

## ✅ Verification Checklist

Use this checklist to systematically verify the implementation:

### Pre-Testing Setup
- [ ] Browser Developer Tools open (F12)
- [ ] Console tab visible
- [ ] Network tab open and recording
- [ ] Ad blockers disabled
- [ ] Privacy extensions disabled
- [ ] Internet connection stable

### Pixel Installation Verification
- [ ] Script loads from `https://signals.madgicx.cc/sdk/1624774576036784247/events.js`
- [ ] Network request shows 200 OK status
- [ ] `window.cbq` is defined as a function
- [ ] `window.cbq.loaded === true`
- [ ] `window.cbq.version === "2.0"`
- [ ] No console errors related to pixel

### Automatic Event Testing
- [ ] PageView tracked automatically on page load
- [ ] Network shows POST to signals.madgicx.cc
- [ ] Request payload contains PageView event

### Critical Events Testing
- [ ] SendOTP: Triggered when requesting OTP
- [ ] CompleteRegistration: Tracked on signup completion
- [ ] Subscribe: Fired when subscription created
- [ ] Purchase: Tracked on successful payment

### Event Data Quality
- [ ] All events include valid `user_id`
- [ ] Timestamp format is ISO 8601
- [ ] Currency values are numbers
- [ ] Event names match exactly (case-sensitive)
- [ ] No undefined or null values in critical fields

### Network Verification
- [ ] All tracking requests return 200 OK
- [ ] No CORS errors in console
- [ ] Request payloads are well-formed JSON
- [ ] Responses indicate success

### Dashboard Verification (After 15 mins)
- [ ] PageView events appear in dashboard
- [ ] Custom events visible
- [ ] Event counts match test actions
- [ ] User data properly attributed

---

## 🔧 Quick Testing Commands

Copy and paste these into the browser console for rapid testing:

### Test Pixel Status
```javascript
console.log(`
=== SIGNALS GATEWAY STATUS ===
Loaded: ${!!window.cbq}
Type: ${typeof window.cbq}
Version: ${window.cbq?.version || 'N/A'}
Queue: ${window.cbq?.queue?.length || 0} events
==============================
`);
```

### Test All Critical Events
```javascript
// Test event firing sequence
const testUserId = 'test-user-' + Date.now();

console.log('🧪 Testing Signals Gateway Events...\n');

// 1. PageView
window.cbq('track', 'PageView', { timestamp: new Date().toISOString() });
console.log('✓ PageView');

// 2. SendOTP
window.cbq('track', 'SendOTP', { 
  phone: '+919876543210', 
  timestamp: new Date().toISOString() 
});
console.log('✓ SendOTP');

// 3. CompleteRegistration
window.cbq('track', 'CompleteRegistration', { 
  user_id: testUserId,
  registration_method: 'phone',
  timestamp: new Date().toISOString() 
});
console.log('✓ CompleteRegistration');

// 4. Subscribe
window.cbq('track', 'Subscribe', { 
  user_id: testUserId,
  subscription_plan_id: 'plan-premium',
  plan_name: 'Premium Monthly',
  currency: 'INR',
  value: 2999,
  timestamp: new Date().toISOString() 
});
console.log('✓ Subscribe');

// 5. Purchase
window.cbq('track', 'Purchase', { 
  user_id: testUserId,
  currency: 'INR',
  value: 2999,
  payment_method: 'razorpay',
  timestamp: new Date().toISOString() 
});
console.log('✓ Purchase');

console.log('\n✅ All test events sent! Check Network tab for requests.');
```

### Monitor Network Requests
```javascript
// Log all fetch requests to madgicx
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  if (args[0]?.includes('madgicx') || args[0]?.includes('signals')) {
    console.log('📡 Signals Gateway Request:', args);
  }
  return originalFetch.apply(this, args);
};
console.log('✅ Network monitoring enabled for Signals Gateway');
```

---

## 📝 Test Results Template

Use this template to document your testing:

```markdown
## Test Session: [DATE]
**Tester**: [NAME]
**Browser**: [Chrome/Firefox/Safari] [VERSION]
**Environment**: [Development/Production]

### Pixel Installation
- Script Loads: ✅ / ❌
- cbq Function Available: ✅ / ❌
- Network Status: [200 OK / Other]
- Issues Found: [None / Description]

### Event Testing Results

| Event Name | Triggered | Network Request | Dashboard | Notes |
|------------|-----------|-----------------|-----------|-------|
| PageView | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | |
| SendOTP | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | |
| CompleteRegistration | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | |
| Subscribe | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | |
| Purchase | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | |

### Issues Identified
1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Affected Events: [List]
   - Reproduction Steps: [Steps]
   - Proposed Solution: [Description]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## 🚨 Critical Recommendations

### For Development Team

1. **Add Console Logging**: 
   - Temporarily add `console.log('📊 Signals Gateway tracked:', eventName, eventData)` after each tracking call
   - Example in [`src/utils/fbq.ts:12`](src/utils/fbq.ts:12) already has this pattern

2. **Verify Account Status**:
   - Confirm account ID `1624774576036784247` is active
   - Check Signals Gateway dashboard for account status
   - Verify billing and subscription are current

3. **Test in Multiple Browsers**:
   - Chrome (recommended)
   - Firefox
   - Safari
   - Edge
   - Mobile browsers (iOS Safari, Chrome Mobile)

4. **Monitor Error Rates**:
   - Set up error logging for `window.cbq` failures
   - Track percentage of users where pixel doesn't load
   - Alert if error rate exceeds 5%

5. **Create Automated Tests**:
   - Add E2E tests that verify pixel loading
   - Test critical event flows (signup → subscribe → purchase)
   - Run tests before each deployment

### For QA Team

1. **Test User Flows**:
   - Complete registration flow
   - Subscribe to plan
   - Complete payment
   - Pause/resume subscription
   - Update profile

2. **Cross-Browser Testing**:
   - Test on all supported browsers
   - Verify mobile responsiveness
   - Check incognito/private mode

3. **Network Conditions**:
   - Test on slow 3G
   - Test with intermittent connectivity
   - Verify event queuing and retry logic

---

## 📞 Support & Resources

### Signals Gateway Documentation
- Dashboard: [https://signals.madgicx.cc](https://signals.madgicx.cc)
- API Docs: Contact Signals Gateway support
- Support Email: [support email]

### Internal Resources
- Implementation Doc: [`COMPREHENSIVE_EVENT_TRACKING_IMPLEMENTATION.md`](COMPREHENSIVE_EVENT_TRACKING_IMPLEMENTATION.md)
- TypeScript Types: [`src/types/analytics.d.ts`](src/types/analytics.d.ts)
- Helper Functions: [`src/utils/fbq.ts`](src/utils/fbq.ts)

### Common Issues & Solutions
- **Issue Tracker**: [Link to issue tracker]
- **Knowledge Base**: [Link to KB]
- **Slack Channel**: #analytics-tracking

---

## 🎯 Success Criteria

The Signals Gateway implementation is considered successful when:

1. ✅ Pixel loads on 100% of page views (excluding ad blocker users)
2. ✅ `window.cbq` is available and functional
3. ✅ PageView tracked automatically on every page load
4. ✅ All 21 custom events fire correctly in their contexts
5. ✅ Network requests return 200 OK status
6. ✅ Events appear in Signals Gateway dashboard within 15 minutes
7. ✅ No console errors related to tracking
8. ✅ Mobile and desktop tracking both work
9. ✅ Works across all major browsers (95%+ success rate)
10. ✅ Event data quality is high (no invalid/missing data)

---

## 📅 Next Steps

1. **Immediate** (Day 1):
   - [ ] Run Phase 1 tests (Pixel Installation)
   - [ ] Verify `window.cbq` availability
   - [ ] Check Network tab for script loading

2. **Short-term** (Week 1):
   - [ ] Complete all manual tests for critical events
   - [ ] Document any issues found
   - [ ] Create bug reports for failures
   - [ ] Verify fixes in staging environment

3. **Medium-term** (Month 1):
   - [ ] Monitor dashboard for event data
   - [ ] Analyze event volume and quality
   - [ ] Optimize event data structure
   - [ ] Add automated testing

4. **Long-term** (Ongoing):
   - [ ] Regular monitoring of tracking health
   - [ ] Quarterly audits of implementation
   - [ ] Update documentation as events change
   - [ ] Train team on best practices

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-28  
**Author**: Kilo Code (Debug Mode)  
**Status**: Ready for Testing