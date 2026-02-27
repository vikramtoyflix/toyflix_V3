# Step 1: Supabase WordPress Bridge Functions

## 🎯 Goal
Create Supabase Edge Functions that provide WordPress-compatible API endpoints for your mobile app, while using your existing WordPress server as the data source.

## 📋 Functions to Create in Supabase Console

### Function 1: `mobile-wp-generate-token`
**Purpose:** WordPress-compatible token generation for mobile login

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 WordPress Bridge: Generate token request');
    
    const { phone_number, fcm_token } = await req.json();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          status: 400,
          data: null,
          message: 'Phone number is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward request to WordPress server
    const wordpressUrl = 'http://4.213.183.90:3001/wp-json/api/v1/generate-token';
    
    const wpResponse = await fetch(wordpressUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number, fcm_token })
    });

    const wpData = await wpResponse.text();
    
    console.log('✅ WordPress response received');
    
    return new Response(wpData, {
      status: wpResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Generate token error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Token generation failed'
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

### Function 2: `mobile-wp-check-phone`
**Purpose:** Check if phone number exists in WordPress database

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 WordPress Bridge: Check phone exists');
    
    const { mobile } = await req.json();
    
    if (!mobile) {
      return new Response(
        JSON.stringify({
          status: 400,
          data: null,
          message: 'Mobile number is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward request to WordPress server
    const wordpressUrl = 'http://4.213.183.90:3001/wp-json/api/v1/check-phone-exists/';
    
    const wpResponse = await fetch(wordpressUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobile })
    });

    const wpData = await wpResponse.text();
    
    console.log('✅ WordPress check phone response received');
    
    return new Response(wpData, {
      status: wpResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Check phone error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Phone check failed'
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

### Function 3: `mobile-wp-send-otp`
**Purpose:** Send OTP via WordPress server

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📨 WordPress Bridge: Send OTP');
    
    // Handle form data from mobile app
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    
    if (!phone_number) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Phone number is required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward request to WordPress server
    const wordpressUrl = 'http://4.213.183.90:3001/api/sendOtp.php';
    
    // Create form data for WordPress
    const wpFormData = new FormData();
    wpFormData.append('phone_number', phone_number);
    
    const wpResponse = await fetch(wordpressUrl, {
      method: 'POST',
      body: wpFormData
    });

    const wpData = await wpResponse.text();
    
    console.log('✅ WordPress send OTP response received');
    
    return new Response(wpData, {
      status: wpResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Send OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'OTP sending failed'
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

### Function 4: `mobile-wp-verify-otp`
**Purpose:** Verify OTP via WordPress server

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 WordPress Bridge: Verify OTP');
    
    // Handle form data from mobile app
    const formData = await req.formData();
    const phone_number = formData.get('phone_number')?.toString();
    const otp = formData.get('otp')?.toString();
    
    if (!phone_number || !otp) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Phone number and OTP are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward request to WordPress server
    const wordpressUrl = 'http://4.213.183.90:3001/api/verifyOtp.php';
    
    // Create form data for WordPress
    const wpFormData = new FormData();
    wpFormData.append('phone_number', phone_number);
    wpFormData.append('otp', otp);
    
    const wpResponse = await fetch(wordpressUrl, {
      method: 'POST',
      body: wpFormData
    });

    const wpData = await wpResponse.text();
    
    console.log('✅ WordPress verify OTP response received');
    
    return new Response(wpData, {
      status: wpResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ Verify OTP error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'OTP verification failed'
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

### Function 5: `mobile-wp-user-profile`
**Purpose:** Get user profile from WordPress

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('👤 WordPress Bridge: Get user profile');
    
    // Get token from query parameter
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        JSON.stringify({
          status: 401,
          data: null,
          message: 'Token is required'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward request to WordPress server
    const wordpressUrl = `http://4.213.183.90:3001/wp-json/api/v1/user-profile/?token=${token}`;
    
    const wpResponse = await fetch(wordpressUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const wpData = await wpResponse.text();
    
    console.log('✅ WordPress user profile response received');
    
    return new Response(wpData, {
      status: wpResponse.status,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('❌ User profile error:', error);
    
    return new Response(
      JSON.stringify({
        status: 500,
        data: null,
        message: error.message || 'Profile fetch failed'
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

## 🔧 CORS Headers File
First, create the shared CORS headers file:

### Function: `_shared/cors.ts`
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

## 🚀 Implementation Steps

### Step 1.1: Create CORS Helper
1. Go to Supabase Dashboard → Edge Functions
2. Create new function: `_shared`
3. Create file: `cors.ts`
4. Paste the CORS headers code above
5. Deploy the function

### Step 1.2: Create Bridge Functions
For each of the 5 functions above:

1. **Create Function in Supabase:**
   - Go to Supabase Dashboard → Edge Functions
   - Click "New Function"
   - Enter function name (e.g., `mobile-wp-generate-token`)
   - Paste the corresponding TypeScript code
   - Click "Deploy"

2. **Repeat for all functions:**
   - `mobile-wp-generate-token`
   - `mobile-wp-check-phone`
   - `mobile-wp-send-otp`
   - `mobile-wp-verify-otp`
   - `mobile-wp-user-profile`

### Step 1.3: Update Your Nginx/Proxy Configuration
Update your proxy to route WordPress API calls to Supabase functions:

```nginx
# WordPress API to Supabase Bridge Functions
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

## 🧪 Testing Your Functions

### Test Each Function Individually:

```bash
# Test generate-token
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-generate-token" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Test check phone
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-check-phone" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY" \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9573832932"}'

# Test send OTP
curl -X POST "https://wucwpyitzqjukcphczhr.supabase.co/functions/v1/mobile-wp-send-otp" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "phone_number=9573832932"
```

## ✅ Success Criteria

After implementing Step 1, you should have:
- ✅ 5 Supabase Edge Functions deployed and working
- ✅ All functions successfully proxy to WordPress server
- ✅ WordPress-formatted responses returned to mobile app
- ✅ Zero mobile app code changes needed

## 📊 Expected Timeline
- **Setup CORS**: 10 minutes
- **Create 5 functions**: 45 minutes
- **Testing**: 30 minutes
- **Nginx config**: 15 minutes
- **Total**: 1.5-2 hours

This approach gives you modern serverless functions while maintaining full WordPress API compatibility!
