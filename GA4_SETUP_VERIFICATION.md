# 🎯 GA4 Stream Setup Verification Guide

## ✅ **Your New Stream Details**
- **Stream Name**: toyflix
- **Stream URL**: https://toyflix.in/
- **Stream ID**: 11477009502
- **Measurement ID**: `G-LZ0KCP21VN` ✅ **Already configured in code**

---

## 🔍 **Step-by-Step Verification**

### **Step 1: Check Your Website is Loading**
1. Go to http://localhost:8081
2. Confirm the page loads without errors
3. Check that all components render correctly

### **Step 2: Verify Analytics in Browser Console**
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for these success messages:
   ```
   ✅ Google Analytics initialized
   ✅ Google Tag Manager initialized with container: GTM-57M5SSR
   ✅ Critical resources preloaded for SEO performance
   ```

### **Step 3: Test Real-Time Tracking**
1. Open Google Analytics: https://analytics.google.com/
2. Select your property with ID `G-LZ0KCP21VN`
3. Go to **Reports** → **Real-time** → **Overview**
4. Keep this tab open
5. In another tab, navigate around your website (localhost:8081)
6. **You should see visitors appear in real-time!**

### **Step 4: Check Network Requests**
1. In Developer Tools, go to **Network** tab
2. Filter by "gtag" or "analytics"
3. Navigate your website
4. You should see requests to:
   - `googletagmanager.com/gtag/js?id=G-LZ0KCP21VN`
   - `google-analytics.com/g/collect`

---

## 🎯 **Expected Events Being Tracked**

### **Automatic Events**
- ✅ **page_view**: Every page navigation
- ✅ **session_start**: When users start browsing
- ✅ **user_engagement**: User interaction tracking

### **Custom Events** (when implemented)
- ✅ **view_item**: When users view toy details
- ✅ **add_to_cart**: Subscription selections
- ✅ **purchase**: Completed subscriptions

---

## 🚨 **Troubleshooting**

### **If Analytics Not Working:**

1. **Check Console for Errors**
   - Look for red error messages in console
   - Common issues: network blocks, ad blockers

2. **Verify Network Connection**
   - Check if requests to Google Analytics are being made
   - Disable ad blockers temporarily

3. **Check Feature Flags**
   - Analytics should be enabled by default
   - If needed, create `.env.local` with:
     ```bash
     VITE_ENABLE_GOOGLE_ANALYTICS=true
     VITE_GA_MEASUREMENT_ID=G-LZ0KCP21VN
     ```

### **If Real-Time Not Showing Data:**
1. Wait 1-2 minutes (GA4 has slight delay)
2. Try navigating multiple pages on your site
3. Check that you're looking at the correct property (G-LZ0KCP21VN)
4. Ensure you're not using ad blockers

---

## ✅ **Success Criteria**

You'll know everything is working when:
- ✅ Console shows "Google Analytics initialized"
- ✅ Real-time reports show your activity
- ✅ Network tab shows analytics requests
- ✅ No errors in browser console

---

## 🎉 **Next Steps After Verification**

Once tracking is confirmed:
1. **Set up Goals** in GA4 for subscription conversions
2. **Configure Enhanced E-commerce** for detailed product tracking
3. **Set up Custom Events** for toy rental specific metrics
4. **Connect to Google Ads** for conversion tracking

Your GA4 stream is ready to track your ToyFlix website performance! 🚀 