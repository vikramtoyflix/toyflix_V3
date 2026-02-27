# Azure Static Web App Deployment Guide

## 🎯 **Deployment Architecture**

```
React App (Azure Static Web App) ←→ Azure Functions ←→ Azure VM Database
                ↓
            Supabase Database
```

## 📋 **Step-by-Step Deployment**

### **Step 1: Prepare Azure Function App**

1. **Create Azure Function App:**
   ```bash
   # In Azure Portal
   Create Resource → Function App
   - Runtime: Node.js 18
   - Region: Same as your Static Web App
   - Plan: Consumption (pay-per-use)
   ```

2. **Deploy the Function:**
   - Upload `azure-functions/woocommerce-api.js`
   - Install dependencies: `npm install mysql2`

3. **Configure Function Environment Variables:**
   ```env
   WC_DB_HOST=4.213.183.90
   WC_DB_USER=toyflix_user
   WC_DB_PASSWORD=toyflixX1@@
   WC_DB_NAME=toyflix
   WC_DB_PORT=3306
   ```

### **Step 2: Deploy Static Web App**

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Deploy to Azure Static Web Apps:**
   - Connect GitHub repository
   - Set build folder: `dist`
   - Set API folder: `azure-functions` (if using)

3. **Configure Static Web App Environment Variables:**
   ```env
   VITE_SUPABASE_URL=https://wucwpyitzqjukcphczhr.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_AZURE_FUNCTION_URL=https://your-function-app.azurewebsites.net
   VITE_RAZORPAY_KEY_ID=your_razorpay_key
   ```

### **Step 3: Update Code for Azure**

Update your hybrid authentication to use Azure Functions:

```typescript
// In src/hooks/useHybridAuth.ts
import { AzureWooCommerceService } from '@/services/azureWooCommerceService';

// Replace WooCommerceService with AzureWooCommerceService
const wcUser = await AzureWooCommerceService.getUserByPhone(phone);
```

### **Step 4: Network Configuration**

1. **Azure VM Network Security Group:**
   - Allow port 3306 from Azure Function App IP ranges
   - Get Azure Function outbound IPs from Azure Portal

2. **Function App Configuration:**
   - Enable CORS for your Static Web App domain
   - Configure authentication if needed

## 🔧 **Alternative Options**

### **Option 2: WordPress REST API (Simpler)**

Instead of Azure Functions, create a WordPress plugin:

```php
// In your WordPress site
add_action('rest_api_init', function () {
    register_rest_route('toyflix/v1', '/user/(?P<phone>[0-9]+)', array(
        'methods' => 'GET',
        'callback' => 'get_user_by_phone',
        'permission_callback' => '__return_true'
    ));
});

function get_user_by_phone($request) {
    $phone = $request['phone'];
    // Query WordPress database and return user data
}
```

Then in your React app:
```typescript
const response = await fetch(`https://your-wordpress-site.com/wp-json/toyflix/v1/user/${phone}`);
```

### **Option 3: Supabase Edge Functions (Recommended)**

Create a Supabase Edge Function that connects to your WordPress database:

```typescript
// supabase/functions/woocommerce-proxy/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

serve(async (req) => {
  const client = await new Client().connect({
    hostname: "4.213.183.90",
    username: "toyflix_user",
    password: "toyflixX1@@",
    db: "toyflix",
  });

  // Handle database queries here
  const result = await client.execute("SELECT * FROM wp_users WHERE ...");
  
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## 🚀 **Recommended Deployment Strategy**

### **For Production:**

1. **Use Supabase Edge Functions** (Option 3)
   - ✅ Same infrastructure as your main database
   - ✅ Serverless and scalable
   - ✅ Better security and performance
   - ✅ Easier to manage

2. **Deployment Steps:**
   ```bash
   # Deploy Supabase Edge Function
   supabase functions deploy woocommerce-proxy
   
   # Update React app to use Supabase function
   # Deploy to Azure Static Web Apps
   ```

3. **Environment Variables in Azure:**
   ```env
   VITE_SUPABASE_URL=https://wucwpyitzqjukcphczhr.supabase.co
   VITE_SUPABASE_ANON_KEY=your_key
   VITE_RAZORPAY_KEY_ID=your_key
   ```

## 🔐 **Security Considerations**

1. **Database Access:**
   - Use read-only database user for WordPress queries
   - Implement rate limiting on API endpoints
   - Validate all inputs

2. **CORS Configuration:**
   - Only allow your domain
   - Set appropriate headers

3. **Environment Variables:**
   - Never expose database credentials in frontend
   - Use Azure Key Vault for sensitive data

## 📊 **Testing Deployment**

1. **Local Testing:**
   ```bash
   # Test with production environment variables
   VITE_AZURE_FUNCTION_URL=https://your-function.azurewebsites.net npm run dev
   ```

2. **Production Testing:**
   - Test with existing user phone numbers
   - Verify dashboard shows historical data
   - Test new user registration

## 🎯 **Final Checklist**

- [ ] Azure Function deployed with database connectivity
- [ ] Static Web App deployed with correct environment variables
- [ ] Network security configured for database access
- [ ] CORS configured for API endpoints
- [ ] Existing users can login and see historical data
- [ ] New users can register and use modern features
- [ ] Payment processing works correctly

---

**This deployment will enable your hybrid approach to work in production on Azure!** 