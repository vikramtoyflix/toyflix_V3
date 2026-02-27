# 📊 Analytics Configuration Guide

## 🎯 **Your Existing Analytics Setup**

Your ToyFlix website now uses the same analytics tracking as your old WordPress site for continuity of data.

### **📈 Google Analytics GA4**
- **Measurement ID**: `G-LZ0KCP21VN`
- **Status**: ✅ Active and configured
- **Features**: Page views, product tracking, Core Web Vitals

### **🏷️ Google Tag Manager**
- **Container ID**: `GTM-57M5SSR`
- **Status**: ✅ Active and configured
- **Features**: E-commerce tracking, custom events, advanced analytics

### **💰 Google Ads Conversion Tracking**
- **Conversion ID**: `AW-10870553133`
- **Status**: Available for future integration
- **Note**: Currently implemented via GTM (recommended approach)

---

## 🔧 **Configuration Options**

### **Environment Variables** (Optional)
Create a `.env.local` file in your project root to override defaults:

```bash
# Override default analytics IDs (optional - defaults are set)
VITE_GA_MEASUREMENT_ID=G-LZ0KCP21VN
VITE_GTM_CONTAINER_ID=GTM-57M5SSR

# Control SEO features
VITE_ENABLE_SEO_META_TAGS=true
VITE_ENABLE_SEO_STRUCTURED_DATA=true
VITE_ENABLE_GOOGLE_ANALYTICS=true
```

### **Feature Flags**
All analytics features are **enabled by default** using your existing tracking IDs. You can disable them if needed by setting environment variables to `false`.

---

## 📊 **What's Being Tracked**

### **✅ Automatic Tracking**
- **Page Views**: Every page navigation
- **Product Views**: When users view toy details
- **Core Web Vitals**: Performance metrics (LCP, FID, CLS)
- **User Sessions**: Session duration and behavior

### **🛒 E-commerce Events**
- **Product Views**: `view_item` events with product details
- **Add to Cart**: Ready for subscription actions
- **Conversions**: Purchase/subscription completion

### **📱 SEO Tracking**
- **Meta Tag Performance**: Automatic optimization
- **Social Media Sharing**: Open Graph tracking
- **Search Engine Visibility**: Schema.org markup

---

## 🚀 **Deployment**

### **Production Setup**
1. **No changes needed** - Analytics IDs are built into the code
2. **Deploy normally** - Analytics will work immediately
3. **Verify tracking** - Check Google Analytics Real-Time reports

### **Testing**
```bash
# Start development server
npm run dev

# Check browser console for confirmation:
# ✅ Google Analytics initialized
# ✅ Google Tag Manager initialized with container: GTM-57M5SSR
# ✅ Critical resources preloaded for SEO performance
```

---

## 📈 **Analytics Dashboards**

### **Google Analytics GA4**
- URL: https://analytics.google.com/
- Property: ToyFlix (G-LZ0KCP21VN)
- **New Features**: Enhanced e-commerce, better mobile tracking

### **Google Tag Manager**
- URL: https://tagmanager.google.com/
- Container: GTM-57M5SSR
- **Continuity**: Same configuration as WordPress site

---

## 🔍 **Verification**

### **Check Analytics Working**
1. Visit your website
2. Open Browser Dev Tools (F12)
3. Look for console messages:
   - ✅ "Google Analytics initialized"
   - ✅ "Google Tag Manager initialized"
   - ✅ "Critical resources preloaded"

### **Real-Time Verification**
1. Go to Google Analytics → Real-Time
2. Navigate your website
3. See visitors appear in real-time dashboard

---

## 🎯 **Business Benefits**

### **Data Continuity**
- ✅ **Same tracking IDs** - Historical data preserved
- ✅ **Enhanced tracking** - Better product and conversion data
- ✅ **Performance metrics** - SEO insights included

### **Improved Analytics**
- ✅ **Faster tracking** - Direct implementation vs WordPress plugins
- ✅ **Better accuracy** - React SPA tracking optimized
- ✅ **Enhanced e-commerce** - Detailed subscription tracking

Your analytics setup is now **optimized, fast, and maintains full continuity** with your existing data! 🚀 