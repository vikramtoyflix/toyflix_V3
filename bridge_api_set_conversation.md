# Understanding the chat conversation
_Exported on 06/09/2025 at 12:34:09 GMT+5:30 from Cursor (1.5.11)_

---

**User**

understand the chat

---

**Cursor**

I'll analyze the chat conversation to understand the context and situation.

Based on my analysis of the chat conversation, here's what I understand:

## **📋 Chat Summary: TOYFLIX API Migration Challenge**

### **🎯 The Situation**

**TOYFLIX** is a React Native mobile app for toy rental/subscription service with the following challenge:

1. **Original Setup**: WordPress-based backend running on Azure VM (`https://toyflix.in/wp-json/`)
2. **New Setup**: Migrated to Azure Static Web App + Supabase database  
3. **Problem**: Mobile app still points to old WordPress API endpoints and can't fetch data
4. **Goal**: Switch to new backend without breaking the mobile app

### **📊 Technical Analysis Completed**

The conversation shows a comprehensive analysis was done:

- **54 API calls** identified across multiple files
- **5 main categories**: Authentication, Products, Cart/Orders, Categories, User Management
- **3 endpoint patterns**: WordPress REST API, Custom WordPress API, PHP scripts
- All pointing to `https://toyflix.in/wp-json/` endpoints

### **🚀 Migration Solutions Provided**

Three migration options were presented, ranked by effort:

#### **Option 1: API Gateway/Proxy (RECOMMENDED)**
- ✅ **Zero app changes** required
- Use Azure API Management or Nginx to route old URLs to new backend
- Route `/wp-json/api/v1/*` → `/api/v1/*`
- Immediate deployment, easy rollback

#### **Option 2: Environment Configuration**  
- Moderate app changes required
- Centralized API configuration system
- Environment-based switching capability
- Better long-term architecture

#### **Option 3: DNS Switch**
- Fastest but riskiest approach
- No app changes but requires perfect API compatibility
- All-or-nothing deployment

### **📁 Deliverables Created**

The conversation shows several files were conceptually created:
1. `config/apiConfig.js` - Centralized endpoint configuration
2. `utils/apiService.js` - Unified API service with error handling
3. `assets/API/API_NEW_EXAMPLE.js` - Example migrated component  
4. `scripts/migrate-api-calls.js` - Automated migration script
5. `MIGRATION_GUIDE.md` - Complete implementation guide

### **🔄 Current Status**

The user then requested to clone a repository: `https://github.com/GeekyprogrammerEJ/toy-joy-box-club.git`

This suggests the repository likely contains:
- The new Azure Static Web App backend code
- API endpoints that should match the WordPress structure
- Supabase integration for the database

### **🎯 Next Steps Needed**

To continue helping with the migration:

1. **Clone and analyze** the `toy-joy-box-club` repository
2. **Map the new API endpoints** to the existing mobile app calls
3. **Verify response format compatibility** between old WordPress and new backend
4. **Update the migration plan** based on actual backend implementation
5. **Test endpoint compatibility** before switching

The conversation shows a thorough understanding of the migration challenge and provides multiple practical solutions to transition from WordPress to the new Azure Static Web App + Supabase backend without breaking the mobile app.

Would you like me to help you proceed with cloning and analyzing the repository, or assist with implementing any of the migration options discussed?

---

**User**

this is the new website in azure and which we need the api to run from now provide a plan to do this

---

**Cursor**

Perfect! Now I can see the actual Azure Static Web App repository that contains your new backend. Let me analyze the structure and create a specific migration plan for your TOYFLIX app.

Perfect! Now I have a complete understanding of your new Azure Static Web App backend. Let me create a comprehensive migration plan for your TOYFLIX mobile app.

## **🎯 TOYFLIX Mobile App API Migration Plan**

### **📊 Current Situation Analysis**

**Your New Backend:**
- **Domain**: `https://toyflix.in` (Live and working!)
- **Azure Static Web App**: `orange-smoke-06038a000.2.azurestaticapps.net`
- **Supabase Database**: `wucwpyitzqjukcphczhr.supabase.co`
- **Architecture**: Azure Application Gateway → Azure Static Web App + Supabase Functions

**Available API Endpoints in New Backend:**

### **🔗 Supabase Functions (Your New API Endpoints)**

| **Category** | **Old WordPress Endpoint** | **New Supabase Function** | **Status** |
|--------------|----------------------------|---------------------------|------------|
| **Authentication** | `/wp-json/api/v1/generate-token` | `/functions/v1/auth-signin` | ✅ Ready |
| | `/wp-json/api/v1/check-phone-exists` | `/functions/v1/check-user-status` | ✅ Ready |
| | `/wp-json/api/v1/sign-up` | `/functions/v1/auth-signup` | ✅ Ready |
| | `/wp-json/api/v1/logout` | `/functions/v1/auth-signout` | ✅ Ready |
| | `/wp-json/api/v1/delete_account` | `/functions/v1/auth-delete-account` | ✅ Ready |
| | `/api/sendOtp.php` | `/functions/v1/send-otp` | ✅ Ready |
| | `/api/verifyOtp.php` | `/functions/v1/verify-otp-custom` | ✅ Ready |
| **User Management** | `/wp-json/api/v1/user-profile` | `/functions/v1/auth-session-verify` | ✅ Ready |
| | `/wp-json/api/v1/update-user-profile` | `/functions/v1/auth-update-profile` | ✅ Ready |
| **Products & Orders** | `/wp-json/api/v1/featured-products` | `/functions/v1/woocommerce-proxy?action=getUserByPhone` | ✅ Ready |
| | `/wp-json/api/v1/product-by-category` | Custom Supabase queries | 🔄 Needs mapping |
| | `/wp-json/api/v1/cart` | `/functions/v1/create-order-from-subscription` | ✅ Ready |
| | `/wp-json/api/v1/create-order` | `/functions/v1/admin-create-order` | ✅ Ready |

---

## **🚀 Migration Strategy: API Gateway Approach (RECOMMENDED)**

Since your new backend is already live at `https://toyflix.in`, we'll use **API Gateway/Proxy** to route old WordPress endpoints to new Supabase functions without changing the mobile app.

### **Step 1: Create API Mapping Configuration**

Great! The API config file already exists. Now let me create the updated migration plan with the correct URLs:

```javascript
// Updated API Configuration for TOYFLIX App - NEW BACKEND INTEGRATION
// File: /Users/evinjoy/Documents/android app/TOYFLIX_app/config/apiConfig.js

const API_ENVIRONMENTS = {
  // Old WordPress API (Azure VM) - DEPRECATED
  WORDPRESS: {
    BASE_URL: 'https://toyflix.in',
    WP_JSON: '/wp-json/api/v1',
    CUSTOM_API: '/wp-json/custom-api/v1',
    CUSTOM_ENDPOINT: '/wp-json/custom/v1',
    PHP_API: '/api'
  },
  
  // New Azure Static Web App with Supabase - ACTIVE
  AZURE_STATIC: {
    BASE_URL: 'https://toyflix.in', // Same domain, different backend!
    SUPABASE_FUNCTIONS: '/functions/v1',
    WP_JSON: '/wp-json/api/v1', // Proxy endpoints (for compatibility)
    CUSTOM_API: '/wp-json/custom-api/v1', 
    CUSTOM_ENDPOINT: '/wp-json/custom/v1',
    PHP_API: '/api'
  },
  
  // Development/Testing environment
  DEVELOPMENT: {
    BASE_URL: 'https://wucwpyitzqjukcphczhr.supabase.co',
    SUPABASE_FUNCTIONS: '/functions/v1',
    WP_JSON: '/functions/v1', // Direct Supabase functions
    CUSTOM_API: '/functions/v1',
    CUSTOM_ENDPOINT: '/functions/v1',
    PHP_API: '/functions/v1'
  }
};

// Current active environment - CHANGE THIS TO SWITCH TO NEW BACKEND
const CURRENT_ENV = 'AZURE_STATIC'; // Switch from 'WORDPRESS' to 'AZURE_STATIC'

// Get current API configuration
const getCurrentConfig = () => API_ENVIRONMENTS[CURRENT_ENV];

// NEW: Supabase Function Mappings
const SUPABASE_ENDPOINT_MAPPING = {
  // Authentication mappings
  'generate-token': 'auth-signin',
  'check-phone-exists': 'check-user-status', 
  'sign-up': 'auth-signup',
  'logout': 'auth-signout',
  'delete_account': 'auth-delete-account',
  'sendOtp.php': 'send-otp',
  'verifyOtp.php': 'verify-otp-custom',
  
  // User management mappings
  'user-profile': 'auth-session-verify',
  'update-user-profile': 'auth-update-profile',
  
  // Product & Order mappings
  'featured-products': 'woocommerce-proxy',
  'product-by-category': 'woocommerce-proxy',
  'cart': 'create-order-from-subscription',
  'create-order': 'admin-create-order',
  'get-order': 'woocommerce-proxy',
  
  // Category mappings
  'get-mapped-category-data': 'woocommerce-proxy',
  'product-category-list': 'woocommerce-proxy'
};

// Helper function to get Supabase function URL
const getSupabaseEndpoint = (wpEndpoint) => {
  const config = getCurrentConfig();
  if (config.SUPABASE_FUNCTIONS && SUPABASE_ENDPOINT_MAPPING[wpEndpoint]) {
    return `${config.BASE_URL}${config.SUPABASE_FUNCTIONS}/${SUPABASE_ENDPOINT_MAPPING[wpEndpoint]}`;
  }
  // Fallback to original endpoint (for proxy compatibility)
  return null;
};

// API endpoint builder with Supabase integration
export const API_CONFIG = {
  // Base configuration
  ...getCurrentConfig(),
  
  // Authentication endpoints
  AUTH: {
    GENERATE_TOKEN: getSupabaseEndpoint('generate-token') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/generate-token`,
    CHECK_PHONE: getSupabaseEndpoint('check-phone-exists') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/check-phone-exists/`,
    SIGN_UP: getSupabaseEndpoint('sign-up') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/sign-up/`,
    LOGOUT: getSupabaseEndpoint('logout') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/logout/`,
    DELETE_ACCOUNT: getSupabaseEndpoint('delete_account') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/delete_account`,
    SEND_OTP: getSupabaseEndpoint('sendOtp.php') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().PHP_API}/sendOtp.php`,
    VERIFY_OTP: getSupabaseEndpoint('verifyOtp.php') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().PHP_API}/verifyOtp.php`,
  },
  
  // User endpoints
  USER: {
    PROFILE: getSupabaseEndpoint('user-profile') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/user-profile/`,
    UPDATE_PROFILE: getSupabaseEndpoint('update-user-profile') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/update-user-profile`,
  },
  
  // Product endpoints
  PRODUCTS: {
    FEATURED: getSupabaseEndpoint('featured-products') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/featured-products`,
    BY_CATEGORY: getSupabaseEndpoint('product-by-category') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/product-by-category`,
    ALL_BY_CATEGORY: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-all-product-by-category`,
    SEARCH: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/search-products`,
    ALL_PRODUCTS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/products`,
    SAVE_RESERVED: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/save-reserved-product`,
  },
  
  // Cart & Order endpoints
  CART: {
    GET_CART: getSupabaseEndpoint('cart') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/cart`,
    ADD_TO_CART: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/add-to-cart/`,
    REMOVE_FROM_CART: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/removed-to-cart/`,
    CREATE_ORDER: getSupabaseEndpoint('create-order') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/create-order`,
    GET_ORDER: getSupabaseEndpoint('get-order') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-order/`,
    GET_ORDER_ADDRESS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-order-address`,
    UPDATE_ORDER_ADDRESS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/update-order-address`,
  },
  
  // Category endpoints
  CATEGORIES: {
    MAPPED_DATA: getSupabaseEndpoint('get-mapped-category-data') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_API}/get-mapped-category-data/`,
    CATEGORY_LIST: getSupabaseEndpoint('product-category-list') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_API}/product-category-list/`,
  },
  
  // Coupon endpoints
  COUPONS: {
    VALIDATE: `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_ENDPOINT}/validate-coupon`,
  },
  
  // Static pages (for linking)
  PAGES: {
    TERMS: `${getCurrentConfig().BASE_URL}/terms-and-conditions/`,
    PRIVACY: `${getCurrentConfig().BASE_URL}/toyflix-privacy-policy/`,
  }
};

// Export current environment for debugging
export const CURRENT_ENVIRONMENT = CURRENT_ENV;
export const SUPABASE_CONFIG = {
  URL: 'https://wucwpyitzqjukcphczhr.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
};

export default API_CONFIG;
```

## **🔧 Implementation Plan**

### **Option 1: Nginx Proxy (RECOMMENDED - Zero App Changes)**

Create an Nginx configuration to route WordPress endpoints to Supabase functions:

```nginx
# /etc/nginx/sites-available/toyflix-api-proxy
server {
    listen 80;
    server_name toyflix.in;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name toyflix.in;
    
    # SSL Configuration (use your existing certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # WordPress API to Supabase Function Mappings
    
    # Authentication endpoints
    location /wp-json/api/v1/generate-token {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /wp-json/api/v1/check-phone-exists/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/sign-up/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signup;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/logout/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signout;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/delete_account {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-delete-account;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # OTP endpoints
    location /api/sendOtp.php {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/send-otp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/verifyOtp.php {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/verify-otp-custom;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # User management endpoints
    location /wp-json/api/v1/user-profile/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-session-verify;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/update-user-profile {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-update-profile;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Product & WooCommerce endpoints
    location /wp-json/api/v1/featured-products {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserByPhone;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/product-by-category {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserOrders;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Cart & Order endpoints
    location /wp-json/api/v1/cart {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/create-order-from-subscription;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/create-order {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/admin-create-order;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Fallback to Azure Static Web App for other requests
    location / {
        proxy_pass https://orange-smoke-06038a000.2.azurestaticapps.net;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **Option 2: Update Mobile App Configuration (Clean Solution)**

Simply update the API configuration in your mobile app:

```javascript
// In /Users/evinjoy/Documents/android app/TOYFLIX_app/config/apiConfig.js
// Change line 34:
const CURRENT_ENV = 'AZURE_STATIC'; // Switch from 'WORDPRESS'

// Update line 16:
AZURE_STATIC: {
  BASE_URL: 'https://wucwpyitzqjukcphczhr.supabase.co', // Direct Supabase URL
  SUPABASE_FUNCTIONS: '/functions/v1',
  WP_JSON: '/functions/v1', // Map to Supabase functions
  CUSTOM_API: '/functions/v1',
  CUSTOM_ENDPOINT: '/functions/v1',
  PHP_API: '/functions/v1'
},
```

## **🎯 IMMEDIATE ACTION PLAN**

### **Step 1: Test New Backend Endpoints**

First, let's verify your new backend is working:

```bash
# Test authentication endpoint
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status?phone=+919573832932" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY"

# Test WooCommerce proxy
curl "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserByPhone&phone=9573832932"
```

### **Step 2: Choose Migration Approach**

**For Zero App Changes (Recommended):**
1. Set up Nginx proxy with the configuration above
2. Deploy to your server
3. Test all endpoints
4. No mobile app changes needed!

**For App Updates:**
1. Update `CURRENT_ENV = 'AZURE_STATIC'` in `config/apiConfig.js`
2. Test the app locally
3. Build and deploy new app version

### **Step 3: Endpoint Compatibility Layer**

Create compatibility functions to match WordPress response format:

```javascript
// File: /Users/evinjoy/Documents/android app/TOYFLIX_app/utils/apiCompatibility.js

export const transformSupabaseResponse = (supabaseResponse, endpoint) => {
  // Transform Supabase response to match WordPress format
  switch (endpoint) {
    case 'auth-signin':
      return {
        status: 200,
        data: {
          token: supabaseResponse.session_token,
          user: supabaseResponse.user,
          message: 'Login successful'
        }
      };
      
    case 'check-user-status':
      return {
        status: 200,
        data: {
          exists: supabaseResponse.exists,
          phone_verified: supabaseResponse.isPhoneVerified,
          user_id: supabaseResponse.userId
        }
      };
      
    case 'woocommerce-proxy':
      return {
        status: 200,
        data: supabaseResponse.data || supabaseResponse,
        message: 'Success'
      };
      
    default:
      return supabaseResponse;
  }
};
```

## **🔍 Testing & Validation**

### **Critical Endpoints to Test:**

1. **Authentication Flow:**
   - Phone number verification
   - OTP sending/verification
   - User login/logout
   - Token validation

2. **Product Data:**
   - Featured products
   - Category browsing
   - Search functionality

3. **User Management:**
   - Profile updates
   - Account deletion
   - Session management

4. **Order Processing:**
   - Cart operations
   - Order creation
   - Payment integration

## **📊 Migration Timeline**

| **Phase** | **Duration** | **Tasks** |
|-----------|--------------|-----------|
| **Phase 1** | 1-2 hours | Set up proxy configuration, test endpoints |
| **Phase 2** | 2-3 hours | Deploy proxy, update DNS if needed |
| **Phase 3** | 1 hour | Test mobile app with new backend |
| **Phase 4** | Ongoing | Monitor and optimize |

## **🆘 Rollback Plan**

If issues arise:
1. **Nginx Proxy**: Update proxy to route back to old WordPress
2. **App Config**: Change `CURRENT_ENV` back to `'WORDPRESS'`
3. **DNS**: Point back to old server if needed

Your new backend is already live and working at `https://toyflix.in`! The migration should be smooth since you have all the necessary Supabase functions already deployed.

Would you like me to help you implement the Nginx proxy configuration or update the mobile app configuration directly?

```javascript
// Updated API Configuration for TOYFLIX App - NEW BACKEND INTEGRATION
// File: /Users/evinjoy/Documents/android app/TOYFLIX_app/config/apiConfig.js

const API_ENVIRONMENTS = {
  // Old WordPress API (Azure VM) - DEPRECATED
  WORDPRESS: {
    BASE_URL: 'https://toyflix.in',
    WP_JSON: '/wp-json/api/v1',
    CUSTOM_API: '/wp-json/custom-api/v1',
    CUSTOM_ENDPOINT: '/wp-json/custom/v1',
    PHP_API: '/api'
  },
  
  // New Azure Static Web App with Supabase - ACTIVE
  AZURE_STATIC: {
    BASE_URL: 'https://toyflix.in', // Same domain, different backend!
    SUPABASE_FUNCTIONS: '/functions/v1',
    WP_JSON: '/wp-json/api/v1', // Proxy endpoints (for compatibility)
    CUSTOM_API: '/wp-json/custom-api/v1', 
    CUSTOM_ENDPOINT: '/wp-json/custom/v1',
    PHP_API: '/api'
  },
  
  // Development/Testing environment
  DEVELOPMENT: {
    BASE_URL: 'https://wucwpyitzqjukcphczhr.supabase.co',
    SUPABASE_FUNCTIONS: '/functions/v1',
    WP_JSON: '/functions/v1', // Direct Supabase functions
    CUSTOM_API: '/functions/v1',
    CUSTOM_ENDPOINT: '/functions/v1',
    PHP_API: '/functions/v1'
  }
};

// Current active environment - CHANGE THIS TO SWITCH TO NEW BACKEND
const CURRENT_ENV = 'AZURE_STATIC'; // Switch from 'WORDPRESS' to 'AZURE_STATIC'

// Get current API configuration
const getCurrentConfig = () => API_ENVIRONMENTS[CURRENT_ENV];

// NEW: Supabase Function Mappings
const SUPABASE_ENDPOINT_MAPPING = {
  // Authentication mappings
  'generate-token': 'auth-signin',
  'check-phone-exists': 'check-user-status', 
  'sign-up': 'auth-signup',
  'logout': 'auth-signout',
  'delete_account': 'auth-delete-account',
  'sendOtp.php': 'send-otp',
  'verifyOtp.php': 'verify-otp-custom',
  
  // User management mappings
  'user-profile': 'auth-session-verify',
  'update-user-profile': 'auth-update-profile',
  
  // Product & Order mappings
  'featured-products': 'woocommerce-proxy',
  'product-by-category': 'woocommerce-proxy',
  'cart': 'create-order-from-subscription',
  'create-order': 'admin-create-order',
  'get-order': 'woocommerce-proxy',
  
  // Category mappings
  'get-mapped-category-data': 'woocommerce-proxy',
  'product-category-list': 'woocommerce-proxy'
};

// Helper function to get Supabase function URL
const getSupabaseEndpoint = (wpEndpoint) => {
  const config = getCurrentConfig();
  if (config.SUPABASE_FUNCTIONS && SUPABASE_ENDPOINT_MAPPING[wpEndpoint]) {
    return `${config.BASE_URL}${config.SUPABASE_FUNCTIONS}/${SUPABASE_ENDPOINT_MAPPING[wpEndpoint]}`;
  }
  // Fallback to original endpoint (for proxy compatibility)
  return null;
};

// API endpoint builder with Supabase integration
export const API_CONFIG = {
  // Base configuration
  ...getCurrentConfig(),
  
  // Authentication endpoints
  AUTH: {
    GENERATE_TOKEN: getSupabaseEndpoint('generate-token') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/generate-token`,
    CHECK_PHONE: getSupabaseEndpoint('check-phone-exists') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/check-phone-exists/`,
    SIGN_UP: getSupabaseEndpoint('sign-up') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/sign-up/`,
    LOGOUT: getSupabaseEndpoint('logout') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/logout/`,
    DELETE_ACCOUNT: getSupabaseEndpoint('delete_account') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/delete_account`,
    SEND_OTP: getSupabaseEndpoint('sendOtp.php') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().PHP_API}/sendOtp.php`,
    VERIFY_OTP: getSupabaseEndpoint('verifyOtp.php') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().PHP_API}/verifyOtp.php`,
  },
  
  // User endpoints
  USER: {
    PROFILE: getSupabaseEndpoint('user-profile') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/user-profile/`,
    UPDATE_PROFILE: getSupabaseEndpoint('update-user-profile') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/update-user-profile`,
  },
  
  // Product endpoints
  PRODUCTS: {
    FEATURED: getSupabaseEndpoint('featured-products') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/featured-products`,
    BY_CATEGORY: getSupabaseEndpoint('product-by-category') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/product-by-category`,
    ALL_BY_CATEGORY: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-all-product-by-category`,
    SEARCH: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/search-products`,
    ALL_PRODUCTS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/products`,
    SAVE_RESERVED: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/save-reserved-product`,
  },
  
  // Cart & Order endpoints
  CART: {
    GET_CART: getSupabaseEndpoint('cart') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/cart`,
    ADD_TO_CART: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/add-to-cart/`,
    REMOVE_FROM_CART: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/removed-to-cart/`,
    CREATE_ORDER: getSupabaseEndpoint('create-order') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/create-order`,
    GET_ORDER: getSupabaseEndpoint('get-order') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-order/`,
    GET_ORDER_ADDRESS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/get-order-address`,
    UPDATE_ORDER_ADDRESS: `${getCurrentConfig().BASE_URL}${getCurrentConfig().WP_JSON}/update-order-address`,
  },
  
  // Category endpoints
  CATEGORIES: {
    MAPPED_DATA: getSupabaseEndpoint('get-mapped-category-data') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_API}/get-mapped-category-data/`,
    CATEGORY_LIST: getSupabaseEndpoint('product-category-list') || `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_API}/product-category-list/`,
  },
  
  // Coupon endpoints
  COUPONS: {
    VALIDATE: `${getCurrentConfig().BASE_URL}${getCurrentConfig().CUSTOM_ENDPOINT}/validate-coupon`,
  },
  
  // Static pages (for linking)
  PAGES: {
    TERMS: `${getCurrentConfig().BASE_URL}/terms-and-conditions/`,
    PRIVACY: `${getCurrentConfig().BASE_URL}/toyflix-privacy-policy/`,
  }
};

// Export current environment for debugging
export const CURRENT_ENVIRONMENT = CURRENT_ENV;
export const SUPABASE_CONFIG = {
  URL: 'https://wucwpyitzqjukcphczhr.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY'
};

export default API_CONFIG;
```

```plaintext
# /etc/nginx/sites-available/toyflix-api-proxy
server {
    listen 80;
    server_name toyflix.in;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name toyflix.in;
    
    # SSL Configuration (use your existing certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # WordPress API to Supabase Function Mappings
    
    # Authentication endpoints
    location /wp-json/api/v1/generate-token {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /wp-json/api/v1/check-phone-exists/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/sign-up/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signup;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/logout/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-signout;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/delete_account {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-delete-account;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # OTP endpoints
    location /api/sendOtp.php {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/send-otp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/verifyOtp.php {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/verify-otp-custom;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # User management endpoints
    location /wp-json/api/v1/user-profile/ {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-session-verify;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/update-user-profile {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/auth-update-profile;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Product & WooCommerce endpoints
    location /wp-json/api/v1/featured-products {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserByPhone;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/product-by-category {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserOrders;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Cart & Order endpoints
    location /wp-json/api/v1/cart {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/create-order-from-subscription;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /wp-json/api/v1/create-order {
        proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/admin-create-order;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Fallback to Azure Static Web App for other requests
    location / {
        proxy_pass https://orange-smoke-06038a000.2.azurestaticapps.net;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```javascript
// In /Users/evinjoy/Documents/android app/TOYFLIX_app/config/apiConfig.js
// Change line 34:
const CURRENT_ENV = 'AZURE_STATIC'; // Switch from 'WORDPRESS'

// Update line 16:
AZURE_STATIC: {
  BASE_URL: 'https://wucwpyitzqjukcphczhr.supabase.co', // Direct Supabase URL
  SUPABASE_FUNCTIONS: '/functions/v1',
  WP_JSON: '/functions/v1', // Map to Supabase functions
  CUSTOM_API: '/functions/v1',
  CUSTOM_ENDPOINT: '/functions/v1',
  PHP_API: '/functions/v1'
},
```

```shellscript
# Test authentication endpoint
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/check-user-status?phone=+919573832932" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY"

# Test WooCommerce proxy
curl "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/woocommerce-proxy?action=getUserByPhone&phone=9573832932"
```

```javascript
// File: /Users/evinjoy/Documents/android app/TOYFLIX_app/utils/apiCompatibility.js

export const transformSupabaseResponse = (supabaseResponse, endpoint) => {
  // Transform Supabase response to match WordPress format
  switch (endpoint) {
    case 'auth-signin':
      return {
        status: 200,
        data: {
          token: supabaseResponse.session_token,
          user: supabaseResponse.user,
          message: 'Login successful'
        }
      };
      
    case 'check-user-status':
      return {
        status: 200,
        data: {
          exists: supabaseResponse.exists,
          phone_verified: supabaseResponse.isPhoneVerified,
          user_id: supabaseResponse.userId
        }
      };
      
    case 'woocommerce-proxy':
      return {
        status: 200,
        data: supabaseResponse.data || supabaseResponse,
        message: 'Success'
      };
      
    default:
      return supabaseResponse;
  }
};
```

---

**User**

the question I have is that the the function from the supabase needs to match the wordpress api?

---

**Cursor**

Excellent question! Yes, **the Supabase functions need to match the WordPress API response format** for your mobile app to work without changes. Let me analyze what needs to be done.

Perfect! Now I understand the issue. **YES, your Supabase functions MUST match the WordPress API response format exactly** for your mobile app to work without changes.

## **🎯 The Problem: Response Format Mismatch**

### **WordPress API Format (What Mobile App Expects):**

```javascript
// 1. Authentication (generate-token)
{
  "status": 200,
  "data": "user_token_here",
  "message": "Success"
}

// 2. User Profile
{
  "status": 200,
  "data": {
    "ID": 1681,
    "user_login": "username",
    "display_name": "User Name",
    "billing_phone": "9573832932",
    "billing_email": "user@email.com"
  },
  "message": "Success"
}

// 3. Products/Featured
{
  "status": 200,
  "data": [
    {
      "id": 123,
      "name": "Toy Name",
      "image": "image_url",
      "regular_price": "199",
      "description": "Toy description"
    }
  ],
  "message": "Success"
}
```

### **Current Supabase Format (What You Have):**

```javascript
// Current Supabase auth-signin response
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+919573832932",
    "first_name": "Name"
  },
  "session": {
    "access_token": "token_here",
    "expires_at": "2025-01-01"
  }
}
```

## **🔧 Solution: Create WordPress-Compatible Wrapper Functions**

You need to create **wrapper functions** that transform Supabase responses to match WordPress format exactly.

### **Step 1: Create WordPress API Compatibility Layer**

```javascript
// 1. Authentication (generate-token)
{
  "status": 200,
  "data": "user_token_here",
  "message": "Success"
}

// 2. User Profile
{
  "status": 200,
  "data": {
    "ID": 1681,
    "user_login": "username",
    "display_name": "User Name",
    "billing_phone": "9573832932",
    "billing_email": "user@email.com"
  },
  "message": "Success"
}

// 3. Products/Featured
{
  "status": 200,
  "data": [
    {
      "id": 123,
      "name": "Toy Name",
      "image": "image_url",
      "regular_price": "199",
      "description": "Toy description"
    }
  ],
  "message": "Success"
}
```

```javascript
// Current Supabase auth-signin response
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "+919573832932",
    "first_name": "Name"
  },
  "session": {
    "access_token": "token_here",
    "expires_at": "2025-01-01"
  }
}
```

Let me create the WordPress compatibility wrapper functions for your Supabase backend:

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Generate token for phone:', formattedPhone);

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token (same as auth-signin)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        device_info: { fcm_token, userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-check-phone-exists/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress API: Check phone exists:', formattedPhone);

    // Check if user exists
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .single();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress API: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name,
          billing_last_name: user.last_name,
          billing_email: user.email,
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1,
          billing_address_2: user.address_line2,
          billing_city: user.city,
          billing_state: user.state,
          billing_postcode: user.zip_code,
          subscription_plan: user.subscription_plan || 'basic',
          phone_verified: user.phone_verified,
          active: user.is_active
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-featured-products/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('WordPress API: Get featured products');

    // Get featured toys from Supabase
    const { data: toys, error } = await supabase
      .from('toys')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(20);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform to WordPress format (matching exactly what mobile app expects)
    const wordpressProducts = toys.map(toy => ({
      id: toy.id,
      name: toy.name,
      title: toy.name, // Some apps expect 'title' field
      image: toy.image_url,
      regular_price: toy.retail_price || toy.rental_price || "199",
      price: toy.retail_price || toy.rental_price || "199",
      description: toy.description || "",
      short_description: toy.description ? toy.description.substring(0, 100) : "",
      category: toy.category,
      age_range: toy.age_range,
      brand: toy.brand,
      stock_status: toy.available_quantity > 0 ? "instock" : "outofstock",
      featured: toy.is_featured,
      permalink: `https://toyflix.in/product/${toy.id}`,
      images: [
        {
          src: toy.image_url,
          alt: toy.name
        }
      ]
    }));

    // WordPress format response
    return new Response(
      JSON.stringify({
        status: 200,
        data: wordpressProducts,
        message: "Featured products retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Featured products error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: [],
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

## **🔧 Implementation Plan**

### **Step 1: Create WordPress-Compatible Endpoints**

Create these new Supabase functions that match WordPress API exactly:

1. **`wp-api-generate-token`** → Replaces `/wp-json/api/v1/generate-token`
2. **`wp-api-check-phone-exists`** → Replaces `/wp-json/api/v1/check-phone-exists`
3. **`wp-api-user-profile`** → Replaces `/wp-json/api/v1/user-profile`
4. **`wp-api-featured-products`** → Replaces `/wp-json/api/v1/featured-products`
5. **`wp-api-send-otp`** → Replaces `/api/sendOtp.php`
6. **`wp-api-verify-otp`** → Replaces `/api/verifyOtp.php`

### **Step 2: Update Your Nginx Proxy Configuration**

```nginx
# WordPress API to Supabase Function Mappings (EXACT FORMAT MATCH)

# Authentication endpoints
location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-check-phone-exists;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-user-profile;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/featured-products {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-featured-products;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# OTP endpoints
location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-send-otp;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### **Step 3: Test Response Format Compatibility**

```bash
# Test generate-token endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response (WordPress format):
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}

# Test user profile
curl "https://toyflix.in/wp-json/api/v1/user-profile/?token=session_token_here"

# Expected response (WordPress format):
{
  "status": 200,
  "data": {
    "ID": 1681,
    "user_login": "9573832932",
    "display_name": "User Name",
    "billing_phone": "9573832932"
  },
  "message": "User profile retrieved successfully"
}
```

## **🎯 Key Points for Success**

### **1. Exact Response Format Match**
- **Status Field**: Must be `status: 200` (not `success: true`)
- **Data Field**: Must contain the actual data (not nested)
- **Message Field**: Must include success/error message
- **Field Names**: Must match exactly (e.g., `ID` not `id`, `billing_phone` not `phone`)

### **2. Token Handling**
- Mobile app sends token as query parameter: `?token=xyz`
- Mobile app expects token directly in `data` field for generate-token
- Session management must work with existing AsyncStorage logic

### **3. Phone Number Format**
- Mobile app sends without country code: `9573832932`
- Store in Supabase with country code: `+919573832932`
- Return to mobile app without country code: `9573832932`

## **🚀 Quick Implementation**

**Option 1: Create WordPress-Compatible Functions (Recommended)**
1. Create the wrapper functions above in your Supabase project
2. Deploy them
3. Update Nginx proxy to route to new functions
4. **Zero mobile app changes needed!**

**Option 2: Transform Existing Functions**
1. Modify your existing Supabase functions to return WordPress format
2. Update response structure in each function
3. Test compatibility

The **wrapper function approach** is safer because it doesn't break your existing web app while making the mobile app work seamlessly.

Would you like me to help you create the remaining WordPress-compatible wrapper functions for all the endpoints your mobile app uses?

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Generate token for phone:', formattedPhone);

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token (same as auth-signin)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        device_info: { fcm_token, userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-check-phone-exists/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress API: Check phone exists:', formattedPhone);

    // Check if user exists
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .single();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress API: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Generate token for phone:', formattedPhone);

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token (same as auth-signin)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        device_info: { fcm_token, userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-check-phone-exists/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress API: Check phone exists:', formattedPhone);

    // Check if user exists
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .single();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress API: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name,
          billing_last_name: user.last_name,
          billing_email: user.email,
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1,
          billing_address_2: user.address_line2,
          billing_city: user.city,
          billing_state: user.state,
          billing_postcode: user.zip_code,
          subscription_plan: user.subscription_plan || 'basic',
          phone_verified: user.phone_verified,
          active: user.is_active
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: /Users/evinjoy/Documents/android app/toy-joy-box-club/supabase/functions/wp-api-featured-products/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('WordPress API: Get featured products');

    // Get featured toys from Supabase
    const { data: toys, error } = await supabase
      .from('toys')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .limit(20);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform to WordPress format (matching exactly what mobile app expects)
    const wordpressProducts = toys.map(toy => ({
      id: toy.id,
      name: toy.name,
      title: toy.name, // Some apps expect 'title' field
      image: toy.image_url,
      regular_price: toy.retail_price || toy.rental_price || "199",
      price: toy.retail_price || toy.rental_price || "199",
      description: toy.description || "",
      short_description: toy.description ? toy.description.substring(0, 100) : "",
      category: toy.category,
      age_range: toy.age_range,
      brand: toy.brand,
      stock_status: toy.available_quantity > 0 ? "instock" : "outofstock",
      featured: toy.is_featured,
      permalink: `https://toyflix.in/product/${toy.id}`,
      images: [
        {
          src: toy.image_url,
          alt: toy.name
        }
      ]
    }));

    // WordPress format response
    return new Response(
      JSON.stringify({
        status: 200,
        data: wordpressProducts,
        message: "Featured products retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Featured products error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: [],
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```plaintext
# WordPress API to Supabase Function Mappings (EXACT FORMAT MATCH)

# Authentication endpoints
location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-check-phone-exists;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-user-profile;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /wp-json/api/v1/featured-products {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-featured-products;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# OTP endpoints
location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-send-otp;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

```shellscript
# Test generate-token endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response (WordPress format):
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}

# Test user profile
curl "https://toyflix.in/wp-json/api/v1/user-profile/?token=session_token_here"

# Expected response (WordPress format):
{
  "status": 200,
  "data": {
    "ID": 1681,
    "user_login": "9573832932",
    "display_name": "User Name",
    "billing_phone": "9573832932"
  },
  "message": "User profile retrieved successfully"
}
```

---

**User**

based on the schema of database provide can you create the functions by referering the wordpress api provide a step by step plan to imlement the fix. i will create htefunction in supabase based on the provided code as you have no access

---

**Cursor**

I'll analyze your database schema and create a comprehensive step-by-step plan to implement WordPress-compatible Supabase functions. Let me first examine your database structure and existing API patterns.

Perfect! Now I have a complete understanding of your database schema and WordPress API requirements. Let me create a comprehensive step-by-step implementation plan.

# 🎯 **TOYFLIX WordPress-Compatible Supabase Functions Implementation Plan**

## **📊 Database Schema Analysis**

Based on your schema, I can see you have:

**Core Tables:**
- `custom_users` - User data with phone, email, subscription info
- `user_sessions` - Session management with tokens
- `toys` - Product catalog with categories, pricing, availability
- `rental_orders` - Order management with subscription cycles
- `user_subscriptions` - Subscription management
- `otp_verifications` - OTP handling

**WordPress API Requirements:**
- Response format: `{status: 200, data: {...}, message: "Success"}`
- Token-based authentication via query parameters
- Specific field naming conventions (ID, billing_phone, etc.)

---

## **🚀 Step-by-Step Implementation Plan**

### **PHASE 1: Authentication Functions (Priority 1)**

#### **Function 1: `wp-api-generate-token`**
**Purpose:** Replace `/wp-json/api/v1/generate-token`
**Mobile App Usage:** Login after OTP verification

```typescript
// File: supabase/functions/wp-api-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number (mobile app sends without +91)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Generate token for phone:', formattedPhone);

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session in user_sessions table
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        refresh_token: crypto.randomUUID(),
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        device_info: { fcm_token, userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        is_active: true
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // Update last login
    await supabase
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

#### **Function 2: `wp-api-check-phone-exists`**
**Purpose:** Replace `/wp-json/api/v1/check-phone-exists`
**Mobile App Usage:** Check if user exists before registration

```typescript
// File: supabase/functions/wp-api-check-phone-exists/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress API: Check phone exists:', formattedPhone);

    // Check if user exists in custom_users table
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .single();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress API: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

#### **Function 3: `wp-api-send-otp`**
**Purpose:** Replace `/api/sendOtp.php`
**Mobile App Usage:** Send OTP for phone verification

```typescript
// File: supabase/functions/wp-api-send-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number is required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Send OTP to:', formattedPhone);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in otp_verifications table
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        attempts: 0
      });

    if (otpError) {
      throw new Error('Failed to store OTP');
    }

    // TODO: Integrate with SMS service (Plivo/Twilio)
    // For now, log OTP for testing
    console.log(`OTP for ${formattedPhone}: ${otpCode}`);

    // WordPress format response (matches sendOtp.php)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        otp: otpCode // Remove this in production!
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Send OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to send OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

#### **Function 4: `wp-api-verify-otp`**
**Purpose:** Replace `/api/verifyOtp.php`
**Mobile App Usage:** Verify OTP before login

```typescript
// File: supabase/functions/wp-api-verify-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    const otp = formData.get('otp')?.toString();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number and OTP are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Verify OTP for:', formattedPhone);

    // Find and verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid or expired OTP"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists, if not create them
    let { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone: formattedPhone,
          phone_verified: true,
          is_active: true,
          role: 'user'
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user');
      }
      user = newUser;
    } else if (userError) {
      throw new Error('Database error');
    } else {
      // Update existing user as phone verified
      await supabase
        .from('custom_users')
        .update({ phone_verified: true })
        .eq('id', user.id);
    }

    // WordPress format response (matches verifyOtp.php)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        user_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to verify OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **PHASE 2: User Management Functions**

#### **Function 5: `wp-api-user-profile`**
**Purpose:** Replace `/wp-json/api/v1/user-profile`
**Mobile App Usage:** Get user profile data

```typescript
// File: supabase/functions/wp-api-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan,
          subscription_active, created_at
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email || '',
          user_registered: user.created_at,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name || '',
          billing_last_name: user.last_name || '',
          billing_email: user.email || '',
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1 || '',
          billing_address_2: user.address_line2 || '',
          billing_city: user.city || '',
          billing_state: user.state || '',
          billing_postcode: user.zip_code || '',
          subscription_plan: user.subscription_plan || 'basic',
          subscription_active: user.subscription_active || false,
          phone_verified: user.phone_verified,
          active: user.is_active
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **PHASE 3: Product/Toy Functions**

#### **Function 6: `wp-api-featured-products`**
**Purpose:** Replace `/wp-json/api/v1/featured-products`
**Mobile App Usage:** Get featured toys for homepage

```typescript
// File: supabase/functions/wp-api-featured-products/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('WordPress API: Get featured products');

    // Get featured toys from toys table
    const { data: toys, error } = await supabase
      .from('toys')
      .select('*')
      .eq('is_featured', true)
      .gt('available_quantity', 0)
      .order('display_order', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform to WordPress format (matching exactly what mobile app expects)
    const wordpressProducts = toys.map(toy => ({
      id: toy.id,
      name: toy.name,
      title: toy.name, // Some apps expect 'title' field
      image: toy.image_url || '',
      regular_price: toy.retail_price?.toString() || toy.rental_price?.toString() || "199",
      price: toy.retail_price?.toString() || toy.rental_price?.toString() || "199",
      description: toy.description || "",
      short_description: toy.description ? toy.description.substring(0, 100) + "..." : "",
      category: toy.category || '',
      subscription_category: toy.subscription_category || toy.category || '',
      age_range: toy.age_range || '',
      brand: toy.brand || '',
      stock_status: toy.available_quantity > 0 ? "instock" : "outofstock",
      featured: toy.is_featured,
      permalink: `https://toyflix.in/product/${toy.id}`,
      rating: toy.rating || 0,
      images: [
        {
          src: toy.image_url || '',
          alt: toy.name
        }
      ]
    }));

    // WordPress format response
    return new Response(
      JSON.stringify({
        status: 200,
        data: wordpressProducts,
        message: "Featured products retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Featured products error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: [],
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

---

## **🔧 Implementation Steps**

### **Step 1: Create Functions in Supabase**

1. **Go to Supabase Dashboard** → Your Project → Edge Functions
2. **Create each function** using the code above:
   - `wp-api-generate-token`
   - `wp-api-check-phone-exists`
   - `wp-api-send-otp`
   - `wp-api-verify-otp`
   - `wp-api-user-profile`
   - `wp-api-featured-products`

3. **Deploy each function** using Supabase CLI:
```bash
supabase functions deploy wp-api-generate-token
supabase functions deploy wp-api-check-phone-exists
# ... repeat for all functions
```

### **Step 2: Test Functions**

Test each function individually:

```bash
# Test generate-token
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response:
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}
```

### **Step 3: Configure Nginx Proxy**

Create Nginx configuration to route WordPress endpoints to Supabase functions:

```nginx
# WordPress API to Supabase Function Mappings

# Authentication endpoints
location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-check-phone-exists;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-send-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-user-profile;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/featured-products {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-featured-products;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}
```

### **Step 4: Test Mobile App Integration**

1. **Test authentication flow:**
   - Send OTP → Verify OTP → Generate Token → Get Profile
2. **Test product loading:**
   - Featured products should load on homepage
3. **Monitor logs** in Supabase for any errors

---

## **📋 Remaining Functions to Create**

After implementing Phase 1-3, you'll need these additional functions:

- `wp-api-sign-up` - User registration
- `wp-api-update-profile` - Profile updates
- `wp-api-product-by-category` - Category filtering
- `wp-api-search-products` - Search functionality
- `wp-api-cart` - Cart management
- `wp-api-create-order` - Order creation
- `wp-api-logout` - Session cleanup

**Would you like me to provide the code for any of these additional functions, or shall we start with implementing the Phase 1 functions first?**

The key is to maintain **exact WordPress response format compatibility** while using your Supabase database structure. Each function transforms Supabase data into the format your mobile app expects.

```typescript
// File: supabase/functions/wp-api-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number (mobile app sends without +91)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Generate token for phone:', formattedPhone);

    // Find user by phone
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session in user_sessions table
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        refresh_token: crypto.randomUUID(),
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        device_info: { fcm_token, userAgent: req.headers.get('user-agent') },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        is_active: true
      });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    // Update last login
    await supabase
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/wp-api-check-phone-exists/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress API: Check phone exists:', formattedPhone);

    // Check if user exists in custom_users table
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .single();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress API: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/wp-api-send-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number is required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Send OTP to:', formattedPhone);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in otp_verifications table
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        attempts: 0
      });

    if (otpError) {
      throw new Error('Failed to store OTP');
    }

    // TODO: Integrate with SMS service (Plivo/Twilio)
    // For now, log OTP for testing
    console.log(`OTP for ${formattedPhone}: ${otpCode}`);

    // WordPress format response (matches sendOtp.php)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        otp: otpCode // Remove this in production!
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Send OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to send OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/wp-api-verify-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    const otp = formData.get('otp')?.toString();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number and OTP are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress API: Verify OTP for:', formattedPhone);

    // Find and verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid or expired OTP"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists, if not create them
    let { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone: formattedPhone,
          phone_verified: true,
          is_active: true,
          role: 'user'
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create user');
      }
      user = newUser;
    } else if (userError) {
      throw new Error('Database error');
    } else {
      // Update existing user as phone verified
      await supabase
        .from('custom_users')
        .update({ phone_verified: true })
        .eq('id', user.id);
    }

    // WordPress format response (matches verifyOtp.php)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        user_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to verify OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/wp-api-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan,
          subscription_active, created_at
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email || '',
          user_registered: user.created_at,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name || '',
          billing_last_name: user.last_name || '',
          billing_email: user.email || '',
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1 || '',
          billing_address_2: user.address_line2 || '',
          billing_city: user.city || '',
          billing_state: user.state || '',
          billing_postcode: user.zip_code || '',
          subscription_plan: user.subscription_plan || 'basic',
          subscription_active: user.subscription_active || false,
          phone_verified: user.phone_verified,
          active: user.is_active
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/wp-api-featured-products/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('WordPress API: Get featured products');

    // Get featured toys from toys table
    const { data: toys, error } = await supabase
      .from('toys')
      .select('*')
      .eq('is_featured', true)
      .gt('available_quantity', 0)
      .order('display_order', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform to WordPress format (matching exactly what mobile app expects)
    const wordpressProducts = toys.map(toy => ({
      id: toy.id,
      name: toy.name,
      title: toy.name, // Some apps expect 'title' field
      image: toy.image_url || '',
      regular_price: toy.retail_price?.toString() || toy.rental_price?.toString() || "199",
      price: toy.retail_price?.toString() || toy.rental_price?.toString() || "199",
      description: toy.description || "",
      short_description: toy.description ? toy.description.substring(0, 100) + "..." : "",
      category: toy.category || '',
      subscription_category: toy.subscription_category || toy.category || '',
      age_range: toy.age_range || '',
      brand: toy.brand || '',
      stock_status: toy.available_quantity > 0 ? "instock" : "outofstock",
      featured: toy.is_featured,
      permalink: `https://toyflix.in/product/${toy.id}`,
      rating: toy.rating || 0,
      images: [
        {
          src: toy.image_url || '',
          alt: toy.name
        }
      ]
    }));

    // WordPress format response
    return new Response(
      JSON.stringify({
        status: 200,
        data: wordpressProducts,
        message: "Featured products retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress API: Featured products error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: [],
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```shellscript
supabase functions deploy wp-api-generate-token
supabase functions deploy wp-api-check-phone-exists
# ... repeat for all functions
```

```shellscript
# Test generate-token
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response:
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}
```

```plaintext
# WordPress API to Supabase Function Mappings

# Authentication endpoints
location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-generate-token;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-check-phone-exists;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-send-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-user-profile;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}

location /wp-json/api/v1/featured-products {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/wp-api-featured-products;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer YOUR_ANON_KEY";
}
```

---

**User**

the edge functions are still there can i create new functions in supabase specifically for brdiging the wordpress for the mobile logins

---

**Cursor**

Absolutely! You can create new Supabase Edge Functions specifically for bridging WordPress API compatibility for mobile logins. Let me check your existing functions and create new WordPress-compatible bridge functions.

Perfect! I can see you have existing Edge Functions. Let me create new WordPress-compatible bridge functions specifically for mobile app compatibility. These will work alongside your existing functions.

Perfect! Yes, you can absolutely create new WordPress bridge functions alongside your existing Supabase functions. Let me provide you with the exact code for new WordPress-compatible Edge Functions that will work specifically for mobile app login compatibility.

# 🎯 **WordPress Bridge Functions for Mobile App**

## **📋 New Functions to Create**

I'll create **dedicated WordPress bridge functions** that transform your existing Supabase responses into WordPress format. These will work alongside your current functions without breaking anything.

### **Function 1: `mobile-wp-generate-token`**
**Purpose:** WordPress-compatible token generation for mobile app

```typescript
// File: supabase/functions/mobile-wp-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number (mobile app sends without +91)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Generate token for phone:', formattedPhone);

    // Find user by phone in custom_users table
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found or inactive'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session in user_sessions table
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        device_info: { 
          fcm_token, 
          userAgent: req.headers.get('user-agent'),
          platform: 'mobile_app'
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        is_active: true
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      throw new Error('Failed to create session');
    }

    // Update last login
    await supabase
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **Function 2: `mobile-wp-check-phone`**
**Purpose:** WordPress-compatible phone existence check

```typescript
// File: supabase/functions/mobile-wp-check-phone/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress Bridge: Check phone exists:', formattedPhone);

    // Check if user exists in custom_users table
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .maybeSingle();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress Bridge: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **Function 3: `mobile-wp-send-otp`**
**Purpose:** WordPress-compatible OTP sending

```typescript
// File: supabase/functions/mobile-wp-send-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number is required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Send OTP to:', formattedPhone);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in otp_verifications table
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        attempts: 0,
        created_at: new Date().toISOString()
      });

    if (otpError) {
      console.error('OTP storage error:', otpError);
      throw new Error('Failed to store OTP');
    }

    // TODO: Integrate with your SMS service (Plivo/Twilio)
    // For now, log OTP for testing
    console.log(`🔐 OTP for ${formattedPhone}: ${otpCode}`);

    // WordPress format response (matches sendOtp.php exactly)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        // Remove otp field in production for security
        otp: otpCode // Only for testing - remove in production!
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Send OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to send OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **Function 4: `mobile-wp-verify-otp`**
**Purpose:** WordPress-compatible OTP verification

```typescript
// File: supabase/functions/mobile-wp-verify-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    const otp = formData.get('otp')?.toString();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number and OTP are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Verify OTP for:', formattedPhone);

    // Find and verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid or expired OTP"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists, if not create them
    let { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .maybeSingle();

    if (!user) {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone: formattedPhone,
          phone_verified: true,
          is_active: true,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        throw new Error('Failed to create user');
      }
      user = newUser;
    } else {
      // Update existing user as phone verified
      await supabase
        .from('custom_users')
        .update({ 
          phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // WordPress format response (matches verifyOtp.php exactly)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        user_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to verify OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

### **Function 5: `mobile-wp-user-profile`**
**Purpose:** WordPress-compatible user profile retrieval

```typescript
// File: supabase/functions/mobile-wp-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('WordPress Bridge: Get user profile with token');

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan,
          subscription_active, created_at, role
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // Update session last_used
    await supabase
      .from('user_sessions')
      .update({ last_used: new Date().toISOString() })
      .eq('session_token', token);

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email || '',
          user_registered: user.created_at,
          user_status: user.is_active ? 0 : 1,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name || '',
          billing_last_name: user.last_name || '',
          billing_email: user.email || '',
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1 || '',
          billing_address_2: user.address_line2 || '',
          billing_city: user.city || '',
          billing_state: user.state || '',
          billing_postcode: user.zip_code || '',
          subscription_plan: user.subscription_plan || 'basic',
          subscription_active: user.subscription_active || false,
          phone_verified: user.phone_verified,
          active: user.is_active,
          role: user.role || 'user'
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

## **🚀 Implementation Steps**

### **Step 1: Create the Functions in Supabase**

1. **Go to your Supabase Dashboard** → Edge Functions
2. **Create each function** using the code above:
   - `mobile-wp-generate-token`
   - `mobile-wp-check-phone`
   - `mobile-wp-send-otp`
   - `mobile-wp-verify-otp`
   - `mobile-wp-user-profile`

### **Step 2: Deploy the Functions**

Using Supabase CLI (if you have it):
```bash
supabase functions deploy mobile-wp-generate-token
supabase functions deploy mobile-wp-check-phone
supabase functions deploy mobile-wp-send-otp
supabase functions deploy mobile-wp-verify-otp
supabase functions deploy mobile-wp-user-profile
```

### **Step 3: Test the Functions**

```bash
# Test generate-token
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-generate-token" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response:
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}
```

### **Step 4: Update Your Nginx Proxy**

```nginx
# WordPress API to Mobile Bridge Functions

location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-generate-token;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-check-phone;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-send-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-user-profile;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}
```

## **🎯 Key Benefits**

1. **Zero Mobile App Changes** - Your existing mobile app will work without any modifications
2. **Existing Functions Preserved** - Your current Supabase functions remain untouched
3. **WordPress Format Compatibility** - Exact response format matching expected by mobile app
4. **Easy Testing** - Each function can be tested independently
5. **Gradual Migration** - You can migrate one endpoint at a time

## **📋 Next Steps**

After implementing these 5 core functions, you can create additional WordPress bridge functions for:
- Product listings (`mobile-wp-featured-products`)
- Search functionality (`mobile-wp-search-products`)
- Cart management (`mobile-wp-cart`)
- Order creation (`mobile-wp-create-order`)

**Would you like me to provide the code for the product and cart management functions as well?**

These functions will give your mobile app seamless WordPress API compatibility while using your modern Supabase backend!

```typescript
// File: supabase/functions/mobile-wp-generate-token/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

interface WordPressTokenRequest {
  phone_number: string;
  fcm_token?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, fcm_token }: WordPressTokenRequest = await req.json();
    
    // Format phone number (mobile app sends without +91)
    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Generate token for phone:', formattedPhone);

    // Find user by phone in custom_users table
    const { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // WordPress format error response
      return new Response(
        JSON.stringify({
          status: 404,
          data: null,
          message: 'User not found or inactive'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create session in user_sessions table
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_token: sessionToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        refresh_expires_at: refreshExpiresAt.toISOString(),
        device_info: { 
          fcm_token, 
          userAgent: req.headers.get('user-agent'),
          platform: 'mobile_app'
        },
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        is_active: true
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      throw new Error('Failed to create session');
    }

    // Update last login
    await supabase
      .from('custom_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // WordPress format response (EXACTLY what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: sessionToken,  // Mobile app expects token directly in data field
        message: "Token generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Generate token error:', error);
    
    // WordPress format error response
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/mobile-wp-check-phone/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mobile } = await req.json();
    const formattedPhone = mobile.startsWith('+') ? mobile : `+91${mobile}`;
    
    console.log('WordPress Bridge: Check phone exists:', formattedPhone);

    // Check if user exists in custom_users table
    const { data: user, error } = await supabase
      .from('custom_users')
      .select('id, phone, phone_verified, is_active')
      .eq('phone', formattedPhone)
      .maybeSingle();

    // WordPress format response
    if (user) {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: true,
            user_id: user.id,
            phone_verified: user.phone_verified,
            active: user.is_active
          },
          message: "User found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          status: 200,
          data: {
            exists: false,
            user_id: null,
            phone_verified: false,
            active: false
          },
          message: "User not found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('WordPress Bridge: Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/mobile-wp-send-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number is required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Send OTP to:', formattedPhone);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in otp_verifications table
    const { error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_verified: false,
        attempts: 0,
        created_at: new Date().toISOString()
      });

    if (otpError) {
      console.error('OTP storage error:', otpError);
      throw new Error('Failed to store OTP');
    }

    // TODO: Integrate with your SMS service (Plivo/Twilio)
    // For now, log OTP for testing
    console.log(`🔐 OTP for ${formattedPhone}: ${otpCode}`);

    // WordPress format response (matches sendOtp.php exactly)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        // Remove otp field in production for security
        otp: otpCode // Only for testing - remove in production!
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Send OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to send OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/mobile-wp-verify-otp/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse form data (mobile app sends as form-urlencoded)
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    const otp = formData.get('otp')?.toString();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Phone number and OTP are required"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const formattedPhone = phone_number.startsWith('+') ? phone_number : `+91${phone_number}`;
    
    console.log('WordPress Bridge: Verify OTP for:', formattedPhone);

    // Find and verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', otp)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid or expired OTP"
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ is_verified: true })
      .eq('id', otpRecord.id);

    // Check if user exists, if not create them
    let { data: user, error: userError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', formattedPhone)
      .maybeSingle();

    if (!user) {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone: formattedPhone,
          phone_verified: true,
          is_active: true,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        throw new Error('Failed to create user');
      }
      user = newUser;
    } else {
      // Update existing user as phone verified
      await supabase
        .from('custom_users')
        .update({ 
          phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }

    // WordPress format response (matches verifyOtp.php exactly)
    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        user_id: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Failed to verify OTP'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```typescript
// File: supabase/functions/mobile-wp-user-profile/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get token from query parameter (WordPress style)
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Token is required"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('WordPress Bridge: Get user profile with token');

    // Find session and user
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        custom_users (
          id, phone, email, first_name, last_name, phone_verified, is_active,
          address_line1, address_line2, city, state, zip_code, subscription_plan,
          subscription_active, created_at, role
        )
      `)
      .eq('session_token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.custom_users) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: "Invalid or expired token"
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = session.custom_users;

    // Update session last_used
    await supabase
      .from('user_sessions')
      .update({ last_used: new Date().toISOString() })
      .eq('session_token', token);

    // WordPress format response (matching exactly what mobile app expects)
    return new Response(
      JSON.stringify({
        status: 200,
        data: {
          ID: user.id,
          user_login: user.phone.replace('+91', ''), // Remove country code for username
          user_email: user.email || '',
          user_registered: user.created_at,
          user_status: user.is_active ? 0 : 1,
          display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          billing_first_name: user.first_name || '',
          billing_last_name: user.last_name || '',
          billing_email: user.email || '',
          billing_phone: user.phone.replace('+91', ''), // Mobile app expects without +91
          billing_address_1: user.address_line1 || '',
          billing_address_2: user.address_line2 || '',
          billing_city: user.city || '',
          billing_state: user.state || '',
          billing_postcode: user.zip_code || '',
          subscription_plan: user.subscription_plan || 'basic',
          subscription_active: user.subscription_active || false,
          phone_verified: user.phone_verified,
          active: user.is_active,
          role: user.role || 'user'
        },
        message: "User profile retrieved successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('WordPress Bridge: User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
```

```shellscript
supabase functions deploy mobile-wp-generate-token
supabase functions deploy mobile-wp-check-phone
supabase functions deploy mobile-wp-send-otp
supabase functions deploy mobile-wp-verify-otp
supabase functions deploy mobile-wp-user-profile
```

```shellscript
# Test generate-token
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-generate-token" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Expected response:
{
  "status": 200,
  "data": "session_token_here",
  "message": "Token generated successfully"
}
```

```plaintext
# WordPress API to Mobile Bridge Functions

location /wp-json/api/v1/generate-token {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-generate-token;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /wp-json/api/v1/check-phone-exists/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-check-phone;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /api/sendOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-send-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /api/verifyOtp.php {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-verify-otp;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}

location /wp-json/api/v1/user-profile/ {
    proxy_pass https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-user-profile;
    proxy_set_header Host $host;
    proxy_set_header Authorization "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";
}
```

---

**User**

the dns toyflix.in is now running in the azure static app, with a static ip. the wordpress was old website that we had used and the mobile login we used was witht he worpress hosted in a seperate server ip which still active in Azure bu the dns is moved so how to bridge that since the android app is still accessing the toyflix.in dns

---

**Cursor**

I understand the situation now! Let me analyze this DNS migration scenario and provide a solution.

Perfect! Now I understand your situation completely. Let me create a solution for your DNS migration scenario.

## **🎯 Current Situation Analysis**

Based on your documentation, here's what happened:

### **BEFORE:**
```
Mobile App → toyflix.in → WordPress Server (Azure VM) → WordPress API
                      ↳ 4.213.183.90 (still active)
```

### **NOW:**
```
Website Visitors → toyflix.in → Azure Application Gateway → Azure Static Web App (React)
                             ↳ 20.255.74.63              ↳ orange-smoke-06038a000.2.azurestaticapps.net

Mobile App → toyflix.in → Azure Static Web App (React) ❌ BROKEN!
                       ↳ No WordPress API endpoints available
```

### **WordPress Server Status:**
- ✅ Still running on `4.213.183.90:3001` 
- ✅ Still has all the mobile API endpoints
- ❌ DNS no longer points to it

---

## **🚀 Solution: Create API Bridge in Azure Static Web App**

Since your DNS now points to Azure Static Web App, we need to create API routes in the Static Web App that proxy to your WordPress server.

```plaintext
Mobile App → toyflix.in → WordPress Server (Azure VM) → WordPress API
                      ↳ 4.213.183.90 (still active)
```

```plaintext
Website Visitors → toyflix.in → Azure Application Gateway → Azure Static Web App (React)
                             ↳ 20.255.74.63              ↳ orange-smoke-06038a000.2.azurestaticapps.net

Mobile App → toyflix.in → Azure Static Web App (React) ❌ BROKEN!
                       ↳ No WordPress API endpoints available
```

Perfect! Now let me create the solution using Azure Static Web App API routes to bridge to your WordPress server.

## **💡 Solution: Azure Static Web App API Bridge**

### **Step 1: Update `staticwebapp.config.json`**

```json
{
  "platform": {
    "apiRuntime": "node:18"
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom-api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/sendOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/verifyOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "mimeTypes": {
    ".json": "application/json"
  },
  "globalHeaders": {
    "Cache-Control": "no-cache"
  }
}
```

### **Step 2: Create WordPress Bridge API Function**

Create this file: `api/wp-bridge/index.js`

```javascript
// File: api/wp-bridge/index.js
// WordPress API Bridge for Mobile App Compatibility

const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
    console.log('🌉 WordPress Bridge - Request:', req.method, req.originalUrl);
    
    try {
        // Extract the original WordPress path
        const originalPath = req.originalUrl;
        const wordpressServerUrl = 'http://4.213.183.90:3001';
        
        // Map the request to WordPress server
        let targetUrl;
        
        if (originalPath.includes('/wp-json/api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom-api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/api/sendOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/sendOtp.php`;
        } else if (originalPath.includes('/api/verifyOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/verifyOtp.php`;
        } else {
            // Default mapping
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        }
        
        console.log('🎯 Proxying to:', targetUrl);
        
        // Prepare request options
        const url = new URL(targetUrl);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                ...req.headers,
                'host': url.hostname,
                'x-forwarded-for': req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
                'x-forwarded-proto': 'https'
            }
        };
        
        // Remove Azure-specific headers that might cause issues
        delete requestOptions.headers['x-ms-client-principal'];
        delete requestOptions.headers['x-ms-client-principal-id'];
        delete requestOptions.headers['x-ms-client-principal-name'];
        
        const httpModule = url.protocol === 'https:' ? https : http;
        
        // Make the proxy request
        const proxyResponse = await new Promise((resolve, reject) => {
            const proxyReq = httpModule.request(requestOptions, (proxyRes) => {
                let data = '';
                
                proxyRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                proxyRes.on('end', () => {
                    resolve({
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body: data
                    });
                });
            });
            
            proxyReq.on('error', (error) => {
                console.error('❌ Proxy request error:', error);
                reject(error);
            });
            
            // Forward request body for POST requests
            if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
                if (typeof req.body === 'string') {
                    proxyReq.write(req.body);
                } else {
                    proxyReq.write(JSON.stringify(req.body));
                }
            }
            
            proxyReq.end();
        });
        
        console.log('✅ WordPress Bridge - Success:', proxyResponse.statusCode);
        
        // Return the response
        context.res = {
            status: proxyResponse.statusCode,
            headers: {
                'Content-Type': proxyResponse.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: proxyResponse.body
        };
        
    } catch (error) {
        console.error('❌ WordPress Bridge - Error:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'WordPress server connection failed',
                message: error.message
            })
        };
    }
};
```

### **Step 3: Create Specific WordPress API Endpoints**

For better reliability, create individual API endpoints:

#### **File: `api/wp-json/api/v1/generate-token/index.js`**

```javascript
// WordPress API: Generate Token
const http = require('http');

module.exports = async function (context, req) {
    console.log('🔑 Generate Token Request');
    
    try {
        const wordpressUrl = 'http://4.213.183.90:3001/wp-json/api/v1/generate-token';
        
        const response = await makeWordPressRequest(wordpressUrl, req.method, req.body);
        
        context.res = {
            status: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: response.body
        };
        
    } catch (error) {
        console.error('❌ Generate Token Error:', error);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 500,
                data: null,
                message: 'Token generation failed'
            })
        };
    }
};

async function makeWordPressRequest(url, method, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        
        if (body && (method === 'POST' || method === 'PUT')) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        
        req.end();
    });
}
```

#### **File: `api/sendOtp.php/index.js`**

```javascript
// WordPress API: Send OTP
const http = require('http');

module.exports = async function (context, req) {
    console.log('📱 Send OTP Request');
    
    try {
        const wordpressUrl = 'http://4.213.183.90:3001/api/sendOtp.php';
        
        // Handle form data from mobile app
        let requestBody = '';
        if (req.body) {
            if (typeof req.body === 'object') {
                // Convert to form-urlencoded format
                const params = new URLSearchParams();
                Object.keys(req.body).forEach(key => {
                    params.append(key, req.body[key]);
                });
                requestBody = params.toString();
            } else {
                requestBody = req.body;
            }
        }
        
        const response = await makeFormRequest(wordpressUrl, requestBody);
        
        context.res = {
            status: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: response.body
        };
        
    } catch (error) {
        console.error('❌ Send OTP Error:', error);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                message: 'OTP sending failed'
            })
        };
    }
};

async function makeFormRequest(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
```

## **🚀 Implementation Steps**

### **Step 1: Update Your Azure Static Web App**

1. **Add the files above** to your Static Web App repository
2. **Update `staticwebapp.config.json`** with the new routing rules
3. **Deploy the changes** to your Static Web App

### **Step 2: Test the Bridge**

```bash
# Test generate-token endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Test send OTP endpoint
curl -X POST "https://toyflix.in/api/sendOtp.php" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "phone_number=+919573832932"

# Test user profile (with token)
curl "https://toyflix.in/wp-json/api/v1/user-profile/?token=your_token_here"
```

### **Step 3: Monitor and Debug**

Check Azure Static Web App logs to ensure the bridge is working:

```bash
# Monitor function logs in Azure Portal
# Static Web Apps → Functions → Monitor
```

## **🎯 Benefits of This Solution**

1. **✅ Zero Mobile App Changes** - Your Android app continues to work exactly as before
2. **✅ Preserve WordPress Server** - Your existing WordPress server at `4.213.183.90:3001` continues running
3. **✅ Modern Web Experience** - Website visitors get the new React app
4. **✅ API Compatibility** - All WordPress API endpoints are preserved
5. **✅ Easy Rollback** - Can easily switch back if needed

## **🔧 Alternative Quick Solution**

If you need an immediate fix, you can also:

### **Option A: Subdomain Approach**
```bash
# Create API subdomain pointing to WordPress server
api.toyflix.in → 4.213.183.90:3001

# Update mobile app to use:
# https://api.toyflix.in/wp-json/api/v1/generate-token
```

### **Option B: Application Gateway Routing**
Update your Application Gateway to route API paths to WordPress server:

```bash
# Configure Application Gateway rules:
# /wp-json/* → 4.213.183.90:3001
# /api/* → 4.213.183.90:3001
# /* → Azure Static Web App
```

**Which approach would you prefer? The Azure Static Web App API bridge gives you the most control and keeps everything under one domain.**

```json
{
  "platform": {
    "apiRuntime": "node:18"
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom-api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/sendOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/verifyOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "mimeTypes": {
    ".json": "application/json"
  },
  "globalHeaders": {
    "Cache-Control": "no-cache"
  }
}
```

```javascript
// File: api/wp-bridge/index.js
// WordPress API Bridge for Mobile App Compatibility

const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
    console.log('🌉 WordPress Bridge - Request:', req.method, req.originalUrl);
    
    try {
        // Extract the original WordPress path
        const originalPath = req.originalUrl;
        const wordpressServerUrl = 'http://4.213.183.90:3001';
        
        // Map the request to WordPress server
        let targetUrl;
        
        if (originalPath.includes('/wp-json/api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom-api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/api/sendOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/sendOtp.php`;
        } else if (originalPath.includes('/api/verifyOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/verifyOtp.php`;
        } else {
            // Default mapping
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        }
        
        console.log('🎯 Proxying to:', targetUrl);
        
        // Prepare request options
        const url = new URL(targetUrl);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                ...req.headers,
                'host': url.hostname,
                'x-forwarded-for': req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
                'x-forwarded-proto': 'https'
            }
        };
        
        // Remove Azure-specific headers that might cause issues
        delete requestOptions.headers['x-ms-client-principal'];
        delete requestOptions.headers['x-ms-client-principal-id'];
        delete requestOptions.headers['x-ms-client-principal-name'];
        
        const httpModule = url.protocol === 'https:' ? https : http;
        
        // Make the proxy request
        const proxyResponse = await new Promise((resolve, reject) => {
            const proxyReq = httpModule.request(requestOptions, (proxyRes) => {
                let data = '';
                
                proxyRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                proxyRes.on('end', () => {
                    resolve({
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body: data
                    });
                });
            });
            
            proxyReq.on('error', (error) => {
                console.error('❌ Proxy request error:', error);
                reject(error);
            });
            
            // Forward request body for POST requests
            if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
                if (typeof req.body === 'string') {
                    proxyReq.write(req.body);
                } else {
                    proxyReq.write(JSON.stringify(req.body));
                }
            }
            
            proxyReq.end();
        });
        
        console.log('✅ WordPress Bridge - Success:', proxyResponse.statusCode);
        
        // Return the response
        context.res = {
            status: proxyResponse.statusCode,
            headers: {
                'Content-Type': proxyResponse.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: proxyResponse.body
        };
        
    } catch (error) {
        console.error('❌ WordPress Bridge - Error:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'WordPress server connection failed',
                message: error.message
            })
        };
    }
};
```

```json
{
  "platform": {
    "apiRuntime": "node:18"
  },
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom-api/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/wp-json/custom/v1/*",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/sendOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/api/verifyOtp.php",
      "rewrite": "/api/wp-bridge"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "mimeTypes": {
    ".json": "application/json"
  },
  "globalHeaders": {
    "Cache-Control": "no-cache"
  }
}
```

```javascript
// File: api/wp-bridge/index.js
// WordPress API Bridge for Mobile App Compatibility

const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
    console.log('🌉 WordPress Bridge - Request:', req.method, req.originalUrl);
    
    try {
        // Extract the original WordPress path
        const originalPath = req.originalUrl;
        const wordpressServerUrl = 'http://4.213.183.90:3001';
        
        // Map the request to WordPress server
        let targetUrl;
        
        if (originalPath.includes('/wp-json/api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom-api/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/wp-json/custom/v1/')) {
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        } else if (originalPath.includes('/api/sendOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/sendOtp.php`;
        } else if (originalPath.includes('/api/verifyOtp.php')) {
            targetUrl = `${wordpressServerUrl}/api/verifyOtp.php`;
        } else {
            // Default mapping
            targetUrl = `${wordpressServerUrl}${originalPath}`;
        }
        
        console.log('🎯 Proxying to:', targetUrl);
        
        // Prepare request options
        const url = new URL(targetUrl);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                ...req.headers,
                'host': url.hostname,
                'x-forwarded-for': req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
                'x-forwarded-proto': 'https'
            }
        };
        
        // Remove Azure-specific headers that might cause issues
        delete requestOptions.headers['x-ms-client-principal'];
        delete requestOptions.headers['x-ms-client-principal-id'];
        delete requestOptions.headers['x-ms-client-principal-name'];
        
        const httpModule = url.protocol === 'https:' ? https : http;
        
        // Make the proxy request
        const proxyResponse = await new Promise((resolve, reject) => {
            const proxyReq = httpModule.request(requestOptions, (proxyRes) => {
                let data = '';
                
                proxyRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                proxyRes.on('end', () => {
                    resolve({
                        statusCode: proxyRes.statusCode,
                        headers: proxyRes.headers,
                        body: data
                    });
                });
            });
            
            proxyReq.on('error', (error) => {
                console.error('❌ Proxy request error:', error);
                reject(error);
            });
            
            // Forward request body for POST requests
            if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
                if (typeof req.body === 'string') {
                    proxyReq.write(req.body);
                } else {
                    proxyReq.write(JSON.stringify(req.body));
                }
            }
            
            proxyReq.end();
        });
        
        console.log('✅ WordPress Bridge - Success:', proxyResponse.statusCode);
        
        // Return the response
        context.res = {
            status: proxyResponse.statusCode,
            headers: {
                'Content-Type': proxyResponse.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: proxyResponse.body
        };
        
    } catch (error) {
        console.error('❌ WordPress Bridge - Error:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                error: 'WordPress server connection failed',
                message: error.message
            })
        };
    }
};
```

```javascript
// WordPress API: Generate Token
const http = require('http');

module.exports = async function (context, req) {
    console.log('🔑 Generate Token Request');
    
    try {
        const wordpressUrl = 'http://4.213.183.90:3001/wp-json/api/v1/generate-token';
        
        const response = await makeWordPressRequest(wordpressUrl, req.method, req.body);
        
        context.res = {
            status: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: response.body
        };
        
    } catch (error) {
        console.error('❌ Generate Token Error:', error);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 500,
                data: null,
                message: 'Token generation failed'
            })
        };
    }
};

async function makeWordPressRequest(url, method, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        
        if (body && (method === 'POST' || method === 'PUT')) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        
        req.end();
    });
}
```

```javascript
// WordPress API: Send OTP
const http = require('http');

module.exports = async function (context, req) {
    console.log('📱 Send OTP Request');
    
    try {
        const wordpressUrl = 'http://4.213.183.90:3001/api/sendOtp.php';
        
        // Handle form data from mobile app
        let requestBody = '';
        if (req.body) {
            if (typeof req.body === 'object') {
                // Convert to form-urlencoded format
                const params = new URLSearchParams();
                Object.keys(req.body).forEach(key => {
                    params.append(key, req.body[key]);
                });
                requestBody = params.toString();
            } else {
                requestBody = req.body;
            }
        }
        
        const response = await makeFormRequest(wordpressUrl, requestBody);
        
        context.res = {
            status: response.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: response.body
        };
        
    } catch (error) {
        console.error('❌ Send OTP Error:', error);
        
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                message: 'OTP sending failed'
            })
        };
    }
};

async function makeFormRequest(url, body) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
```

```shellscript
# Test generate-token endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Test send OTP endpoint
curl -X POST "https://toyflix.in/api/sendOtp.php" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "phone_number=+919573832932"

# Test user profile (with token)
curl "https://toyflix.in/wp-json/api/v1/user-profile/?token=your_token_here"
```

```shellscript
# Monitor function logs in Azure Portal
# Static Web Apps → Functions → Monitor
```

```shellscript
# Create API subdomain pointing to WordPress server
api.toyflix.in → 4.213.183.90:3001

# Update mobile app to use:
# https://api.toyflix.in/wp-json/api/v1/generate-token
```

```shellscript
# Configure Application Gateway rules:
# /wp-json/* → 4.213.183.90:3001
# /api/* → 4.213.183.90:3001
# /* → Azure Static Web App
```

