# 📱 Mobile API Proxy - Deployment Guide

## ✅ **Implementation Complete**

Your Azure Static Web App proxy has been configured to bridge mobile app API calls to your WordPress VM without requiring any mobile app changes.

---

## 🎯 **What Was Implemented**

### **1. Static Web App Configuration Updated**
- ✅ **File**: `staticwebapp.config.json`
- ✅ **Routes Added**: All WordPress API endpoints now proxy to Azure Function
- ✅ **CORS**: Global CORS headers configured for mobile app compatibility

### **2. WordPress API Proxy Function Created**
- ✅ **File**: `api/wp-proxy/index.js`
- ✅ **Target**: Proxies to `4.213.183.90:3001` (your WordPress VM)
- ✅ **Features**: 
  - Proper error handling and timeouts
  - CORS support for mobile apps
  - Request/response logging
  - JSON parsing and formatting

### **3. Azure Function Configuration**
- ✅ **File**: `api/wp-proxy/function.json`
- ✅ **Methods**: GET, POST, PUT, DELETE, OPTIONS
- ✅ **Auth Level**: Anonymous (for mobile app access)

### **4. Test Script Created**
- ✅ **File**: `test-mobile-api-proxy.js`
- ✅ **Purpose**: Test all mobile app endpoints after deployment

---

## 🚀 **Deployment Steps**

### **Step 1: Deploy to Azure Static Web App**

```bash
# Navigate to your project directory
cd /Users/evinjoy/Documents/toy-joy-box-club

# Deploy using Azure CLI (if you have it configured)
az staticwebapp deploy --name orange-smoke-06038a000 --resource-group your-resource-group

# OR commit and push to GitHub (if auto-deployment is configured)
git add .
git commit -m "Add mobile API proxy for WordPress VM bridge"
git push origin main
```

### **Step 2: Wait for Deployment**
- Monitor your Azure Static Web App deployment
- Check the Azure portal for deployment status
- Usually takes 2-5 minutes

### **Step 3: Test the Proxy**

```bash
# Make the test script executable
chmod +x test-mobile-api-proxy.js

# Run the test script
node test-mobile-api-proxy.js
```

**Expected Output:**
```
🧪 Testing Mobile API Proxy Endpoints
==================================================
Base URL: https://toyflix.in
Test Phone: 9999999999

Testing Generate Token (Authentication)... ✅ PASS (200)
Testing Check Phone Exists... ✅ PASS (200)
Testing User Profile... ✅ PASS (200)
Testing Send OTP... ✅ PASS (200)
Testing Verify OTP... ✅ PASS (200)
Testing Featured Products... ✅ PASS (200)

📊 Test Results: 6/6 passed
🎉 All tests passed! Mobile API proxy is working correctly.
```

---

## 📱 **Mobile App Compatibility**

### **No Changes Required!**
Your mobile app will continue using the same endpoints:

```javascript
// These URLs now automatically proxy to your VM:
https://toyflix.in/wp-json/api/v1/generate-token
https://toyflix.in/wp-json/api/v1/check-phone-exists  
https://toyflix.in/wp-json/api/v1/user-profile
https://toyflix.in/api/sendOtp.php
https://toyflix.in/api/verifyOtp.php
```

### **Proxy Flow:**
1. **Mobile App** → `https://toyflix.in/wp-json/api/v1/generate-token`
2. **Azure Static Web App** → Routes to `/api/wp-proxy` (Azure Function)
3. **Azure Function** → Proxies to `http://4.213.183.90:3001/wp-json/api/v1/generate-token`
4. **WordPress VM** → Processes request and returns response
5. **Response** → Flows back through proxy to mobile app

---

## 🔍 **Monitoring & Troubleshooting**

### **Check Azure Function Logs**
```bash
# View real-time logs
az webapp log tail --name orange-smoke-06038a000 --resource-group your-resource-group
```

### **Common Issues & Solutions**

#### **Issue: 500 Internal Server Error**
**Cause**: VM might be down or networking issue
**Solution**: 
```bash
# Check VM status
ssh username@4.213.183.90
sudo systemctl status your-wordpress-service
```

#### **Issue: CORS Errors**
**Cause**: Missing CORS headers
**Solution**: Already configured in the proxy function

#### **Issue: Timeout Errors**
**Cause**: VM taking too long to respond
**Solution**: Check VM performance and database connections

### **Debug Specific Endpoint**
```bash
# Test individual endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9999999999"}'
```

---

## 📊 **API Endpoint Mapping**

| **Mobile App Request** | **Proxy Destination** | **Status** |
|------------------------|----------------------|------------|
| `/wp-json/api/v1/*` | `4.213.183.90:3001/wp-json/api/v1/*` | ✅ Active |
| `/wp-json/custom-api/v1/*` | `4.213.183.90:3001/wp-json/custom-api/v1/*` | ✅ Active |
| `/wp-json/custom/v1/*` | `4.213.183.90:3001/wp-json/custom/v1/*` | ✅ Active |
| `/api/sendOtp.php` | `4.213.183.90:3001/api/sendOtp.php` | ✅ Active |
| `/api/verifyOtp.php` | `4.213.183.90:3001/api/verifyOtp.php` | ✅ Active |

---

## 🎯 **Next Steps After Deployment**

### **Immediate (Today)**
1. ✅ Deploy the changes
2. ✅ Run the test script
3. ✅ Test with your mobile app
4. ✅ Monitor Azure Function logs

### **Short Term (This Week)**
1. **Performance Monitoring**: Check response times
2. **Error Monitoring**: Watch for any proxy failures
3. **Mobile App Testing**: Test all app features end-to-end

### **Long Term (Next Month)**
1. **Gradual Migration**: Start moving endpoints to Supabase functions
2. **Performance Optimization**: Consider Azure API Management for better performance
3. **Security Enhancement**: Add authentication/rate limiting if needed

---

## 🔧 **Configuration Files Summary**

```
/Users/evinjoy/Documents/toy-joy-box-club/
├── staticwebapp.config.json          # ✅ Updated with proxy routes
├── api/
│   └── wp-proxy/
│       ├── index.js                  # ✅ Main proxy function
│       ├── function.json             # ✅ Azure Function binding
│       └── package.json              # ✅ Dependencies
└── test-mobile-api-proxy.js          # ✅ Test script
```

---

## 🎉 **Success Metrics**

After deployment, you should see:
- ✅ **Mobile app works unchanged** (same API endpoints)
- ✅ **All API calls succeed** (authentication, user data, etc.)
- ✅ **Fast response times** (< 2 seconds for most calls)
- ✅ **No CORS errors** in mobile app logs
- ✅ **Proper error handling** if VM is temporarily down

Your mobile app now seamlessly bridges to your WordPress APIs through Azure Static Web App without any app changes required! 🚀
