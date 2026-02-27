# Step 1: Azure Static Web App API Bridge Implementation

## 🎯 Goal
Create API routes in your Azure Static Web App that proxy WordPress API calls to your existing WordPress server at `4.213.183.90:3001`.

## 📁 Files to Create

### 1. Update `staticwebapp.config.json`
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
  ]
}
```

### 2. Create WordPress Bridge Function
**File: `api/wp-bridge/index.js`**

```javascript
const http = require('http');

module.exports = async function (context, req) {
    console.log('🌉 WordPress Bridge:', req.method, req.originalUrl);
    
    try {
        // WordPress server details
        const WORDPRESS_SERVER = '4.213.183.90';
        const WORDPRESS_PORT = 3001;
        
        // Build target URL
        const targetPath = req.originalUrl;
        const targetUrl = `http://${WORDPRESS_SERVER}:${WORDPRESS_PORT}${targetPath}`;
        
        console.log('🎯 Proxying to:', targetUrl);
        
        // Proxy the request
        const response = await proxyRequest(targetUrl, req);
        
        context.res = {
            status: response.statusCode,
            headers: {
                'Content-Type': response.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: response.body
        };
        
    } catch (error) {
        console.error('❌ Bridge Error:', error);
        
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

async function proxyRequest(targetUrl, req) {
    return new Promise((resolve, reject) => {
        const url = new URL(targetUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                ...req.headers,
                'host': url.hostname
            }
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => data += chunk);
            proxyRes.on('end', () => {
                resolve({
                    statusCode: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    body: data
                });
            });
        });
        
        proxyReq.on('error', reject);
        
        // Forward request body for POST requests
        if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
            const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            proxyReq.write(bodyStr);
        }
        
        proxyReq.end();
    });
}
```

## 🚀 Implementation Steps

### Step 1.1: Add Files to Your Repository
```bash
# In your toy-joy-box-club repository
git checkout main
git pull origin main

# Add the staticwebapp.config.json to root
# Add the api/wp-bridge/index.js file

git add .
git commit -m "Add WordPress API bridge for mobile app compatibility"
git push origin main
```

### Step 1.2: Deploy to Azure Static Web App
- GitHub Actions will automatically deploy your changes
- Wait 2-3 minutes for deployment to complete

### Step 1.3: Test the Bridge
```bash
# Test generate-token endpoint
curl -X POST "https://toyflix.in/wp-json/api/v1/generate-token" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "9573832932", "fcm_token": "test"}'

# Test send OTP endpoint  
curl -X POST "https://toyflix.in/api/sendOtp.php" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "phone_number=9573832932"

# Test check phone exists
curl -X POST "https://toyflix.in/wp-json/api/v1/check-phone-exists/" \
  -H "Content-Type: application/json" \
  -d '{"mobile": "9573832932"}'
```

## ✅ Success Criteria

After Step 1, you should see:
- ✅ All curl commands return WordPress-formatted responses
- ✅ Mobile app can connect to API endpoints
- ✅ No errors in Azure Static Web App logs
- ✅ WordPress server logs show incoming requests

## 🔧 Troubleshooting

### If requests fail:
1. **Check WordPress server status:**
   ```bash
   curl http://4.213.183.90:3001/wp-json/api/v1/generate-token
   ```

2. **Check Azure Static Web App logs:**
   - Go to Azure Portal → Static Web Apps → Functions → Monitor

3. **Verify network connectivity:**
   - Ensure WordPress server allows connections from Azure IP ranges

## ⏭️ Next Steps After Step 1

Once Step 1 is working:
- **Step 2**: Test mobile app compatibility
- **Step 3**: Implement Supabase WordPress bridge functions (long-term)
- **Step 4**: Gradual migration planning

## 📊 Expected Timeline
- **Setup**: 30 minutes
- **Testing**: 30 minutes  
- **Debugging**: 1-2 hours (if needed)
- **Total**: 2-4 hours

This gives you immediate mobile app compatibility while you work on the more sophisticated Supabase bridge solution.
