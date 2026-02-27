# Understand the repository
_Exported on 25/08/2025 at 15:14:34 GMT+5:30 from Cursor (1.4.5)_

---

**User**

undesrtand the repo

---

**Cursor**

I'll help you understand the repository structure and codebase. Let me start by exploring the workspace to get a comprehensive overview.

Now let me read the main configuration files to understand the project structure better:

Now let me explore the custom files and scripts that seem to be specific to this project:

Now let me explore the API directory and other key files:

Let me also check the active theme and some key plugins:

Now let me check some of the custom plugins to understand the mobile app API:

Let me create a comprehensive overview of this repository based on my analysis:

# Repository Overview: ToyFlix WordPress E-commerce Platform

Based on my analysis, this is a **WordPress-based e-commerce platform** for a toy subscription service called "ToyFlix". Here's a comprehensive breakdown:

## 🏗️ **Architecture Overview**

### **Core Technology Stack**
- **WordPress** (Latest version with WooCommerce)
- **MySQL Database** (`toyflix` database)
- **Node.js API Server** (Express.js on port 3001)
- **PHP** (WordPress backend)
- **Twilio** (SMS/OTP services)

### **Database Structure**
- **Database Name**: `toyflix`
- **User**: `toyflix_user`
- **Key Tables**: WordPress standard tables + custom `migration_data` table
- **Custom Fields**: Extensive subscription metadata, delivery tracking, user preferences

## 🎯 **Business Model: Toy Subscription Service**

### **Core Features**
1. **Subscription Management**: Monthly toy rental/subscription plans
2. **Age-based Categorization**: Toys categorized by age groups
3. **Delivery & Pickup Tracking**: Complete logistics management
4. **Mobile App Integration**: REST APIs for mobile application
5. **OTP Authentication**: Phone number verification via Twilio

### **Subscription Workflow**
- Users subscribe to monthly toy plans
- System tracks subscription cycles, delivery dates, pickup dates
- Custom order statuses: `del-completed`, `pic-completed`
- Subscription metadata includes: months, status, current cycle, expiry dates

## 🔧 **Key Components**

### **1. Custom WordPress Plugins**
- **Mobile App API**: REST endpoints for mobile app integration
- **Custom Migration API**: Data export/import functionality  
- **Custom OTP API**: Twilio-based phone verification
- **Custom Orders Table**: Enhanced order management

### **2. Node.js WooCommerce Server** (`woocommerce-server.js`)
- **Port**: 3001
- **Purpose**: Advanced WooCommerce data queries
- **Endpoints**: User lookup, subscription cycles, current toys, history
- **Database**: Direct MySQL connections for performance

### **3. Migration & Data Export Tools**
- **Migration Table**: Comprehensive data structure for system migration
- **Export Scripts**: CSV export functionality
- **Migration Client**: JavaScript client for data transformation
- **Test Scripts**: Subscription data validation

### **4. Custom Theme** (Pippo Child Theme)
- **Base**: Pippo theme with child theme customizations
- **Features**: Custom product buttons, subscription UI, OTP integration
- **WooCommerce**: Extensive WooCommerce template overrides

## 📊 **Data Structure**

### **User Data**
- Standard WordPress users + WooCommerce billing/shipping
- Phone number verification status
- Subscription preferences and history
- Age group preferences for toy selection

### **Order/Subscription Data**
- **Subscription Name**: Plan type
- **Subscription Status**: Active/Paused/Expired
- **Subscription Months**: Duration
- **Delivery Tracking**: Estimated dates, completion status
- **Pickup Tracking**: Return logistics
- **Payment Integration**: Multiple payment methods

### **Product Data**
- Toys with age group categorization
- Inventory management
- Product attributes and variations

## 🚀 **API Endpoints**

### **WordPress REST API** (`/wp-json/`)
- **Migration API**: `/migration/v1/users`, `/migration/v1/orders`, `/migration/v1/subscriptions`
- **OTP API**: `/custom/v1/send-otp`, `/custom/v1/verify-otp`
- **Mobile App API**: Various mobile-specific endpoints

### **Node.js API** (Port 3001)
- **Health Check**: `/health`
- **User Lookup**: `/api/woocommerce?action=getUserByPhone`
- **Subscription Data**: `/api/woocommerce?action=getUserSubscriptionCycle`
- **Current Toys**: `/api/woocommerce?action=getUserCurrentToys`

## 🔐 **Security & Authentication**
- **OTP Verification**: Twilio-based SMS authentication
- **WordPress Security**: Standard WordPress authentication
- **API Security**: Basic authentication for development (needs production hardening)

## 📱 **Mobile Integration**
- **REST APIs**: Comprehensive mobile app support
- **Data Sync**: Real-time subscription and order data
- **Authentication**: OTP-based mobile login

## 🔄 **Migration & Data Management**
- **Migration Table**: Single comprehensive table for data export
- **Batch Processing**: Large dataset handling
- **Data Transformation**: JavaScript clients for data format conversion
- **CSV Export**: Business intelligence and backup functionality

## 🛠️ **Development & Deployment**
- **Environment**: Linux (Azure VM)
- **Web Server**: Apache/Nginx
- **PHP Extensions**: MySQL, cURL, XML, mbstring, zip
- **Node.js**: Express server for enhanced API functionality
- **Package Management**: Composer (PHP), npm (Node.js)

## 📈 **Business Intelligence**
- **Order Tracking**: Complete order lifecycle management
- **Subscription Analytics**: Customer retention, cycle analysis
- **Revenue Tracking**: Subscription revenue, payment method analysis
- **Customer Insights**: Age group preferences, delivery patterns

This is a sophisticated e-commerce platform specifically designed for a toy subscription business, with extensive customizations for subscription management, logistics tracking, and mobile app integration.

---

**User**

now the dns of this website is used in a static azure app. because of that the android and azure apps are not working. can we create some kind of proxy or some how connect the dns with the current website thorught the current api inthis repo. think about a solution.

---

**Cursor**

I understand the issue! The DNS is pointing to a static Azure app, but your Android/iOS apps expect to connect to this WordPress/WooCommerce backend. Let me analyze the current API structure and propose solutions.

Let me check the current domain configuration and create a solution:

Now I understand the situation better. Let me create a comprehensive solution for connecting your mobile apps to the WordPress backend through the current DNS that points to a static Azure app.

## 🔧 **Solution: API Proxy Bridge**

I'll provide you with **3 different approaches** to solve this DNS/routing issue:

### **Option 1: WordPress Plugin API Proxy (Recommended)**

Create a new WordPress plugin that acts as a proxy/bridge:

Let me provide you with the solution files and configuration:

## 🚀 **Solution: API Bridge Proxy System**

### **Option 1: WordPress Plugin Proxy (Recommended)**

Create this file: `/wp-content/plugins/api-bridge-proxy/api-bridge-proxy.php`

```php
<?php
/**
 * Plugin Name: API Bridge Proxy
 * Description: Bridges mobile app requests to WordPress backend when DNS points to static Azure app
 * Version: 1.0.0
 * Author: ToyFlix Team
 */

if (!defined('ABSPATH')) {
    exit;
}

class APIBridgeProxy {
    
    private $backend_url;
    private $node_api_url;
    
    public function __construct() {
        // Configure your actual WordPress backend URLs
        $this->backend_url = 'http://localhost'; // Your current WordPress installation
        $this->node_api_url = 'http://localhost:3001'; // Your Node.js API server
        
        add_action('rest_api_init', array($this, 'register_proxy_routes'));
        add_action('init', array($this, 'handle_legacy_api_calls'));
    }
    
    /**
     * Register proxy routes that mirror your existing mobile API structure
     */
    public function register_proxy_routes() {
        
        // Mobile App API Proxy Routes
        register_rest_route('mobile-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_mobile_api'),
            'permission_callback' => '__return_true',
        ));
        
        // WooCommerce API Proxy Routes
        register_rest_route('wc-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_woocommerce_api'),
            'permission_callback' => '__return_true',
        ));
        
        // Node.js API Proxy Routes
        register_rest_route('node-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_node_api'),
            'permission_callback' => '__return_true',
        ));
        
        // OTP API Proxy
        register_rest_route('otp-proxy/v1', '/(?P<action>send-otp|verify-otp)', array(
            'methods' => 'POST',
            'callback' => array($this, 'proxy_otp_api'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Proxy mobile app API calls to the actual WordPress backend
     */
    public function proxy_mobile_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        // Map the endpoint to the actual WordPress API
        $target_url = $this->backend_url . '/wp-json/api/v1/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy WooCommerce API calls
     */
    public function proxy_woocommerce_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        $target_url = $this->backend_url . '/wp-json/wc/v3/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy Node.js API calls
     */
    public function proxy_node_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        $target_url = $this->node_api_url . '/api/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy OTP API calls
     */
    public function proxy_otp_api($request) {
        $action = $request->get_param('action');
        $method = $request->get_method();
        
        $target_url = $this->backend_url . '/wp-json/custom/v1/' . $action;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Make the actual proxy request
     */
    private function make_proxy_request($target_url, $method, $request) {
        // Get request parameters
        $params = $request->get_params();
        $body = $request->get_body();
        $headers = $request->get_headers();
        
        // Prepare request arguments
        $args = array(
            'method' => $method,
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'ToyFlix-API-Proxy/1.0'
            )
        );
        
        // Forward authorization headers
        if (isset($headers['authorization'])) {
            $args['headers']['Authorization'] = $headers['authorization'][0];
        }
        
        // Handle different HTTP methods
        if ($method === 'GET') {
            if (!empty($params)) {
                $target_url .= '?' . http_build_query($params);
            }
        } else {
            if (!empty($body)) {
                $args['body'] = $body;
            } elseif (!empty($params)) {
                $args['body'] = json_encode($params);
            }
        }
        
        // Make the request
        $response = wp_remote_request($target_url, $args);
        
        // Handle errors
        if (is_wp_error($response)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Proxy request failed: ' . $response->get_error_message(),
                'target_url' => $target_url
            ), 500);
        }
        
        // Get response data
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        // Try to decode JSON response
        $decoded_body = json_decode($response_body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $response_body = $decoded_body;
        }
        
        return new WP_REST_Response($response_body, $response_code);
    }
}

// Initialize the plugin
new APIBridgeProxy();
```

### **Option 2: Standalone Node.js Proxy Server**

Create `api-proxy-server.js`:

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// WordPress Backend Configuration
const WORDPRESS_URL = 'http://localhost';
const NODE_API_URL = 'http://localhost:3001';

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        proxy: 'healthy',
        timestamp: new Date().toISOString(),
        backends: {
            wordpress: WORDPRESS_URL,
            nodeApi: NODE_API_URL
        }
    });
});

// Proxy WordPress REST API
app.use('/wp-json', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/wp-json': '/wp-json'
    },
    onError: (err, req, res) => {
        console.error('WordPress Proxy Error:', err);
        res.status(500).json({ error: 'WordPress backend unavailable' });
    }
}));

// Proxy Mobile App API
app.use('/api', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/wp-json/api'
    },
    onError: (err, req, res) => {
        console.error('Mobile API Proxy Error:', err);
        res.status(500).json({ error: 'Mobile API backend unavailable' });
    }
}));

// Proxy Node.js WooCommerce API
app.use('/node-api', createProxyMiddleware({
    target: NODE_API_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/node-api': '/api'
    },
    onError: (err, req, res) => {
        console.error('Node API Proxy Error:', err);
        res.status(500).json({ error: 'Node API backend unavailable' });
    }
}));

// Proxy OTP API
app.use('/otp', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/otp': '/wp-json/custom/v1'
    }
}));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API Proxy Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxying to WordPress: ${WORDPRESS_URL}`);
    console.log(`🔗 Proxying to Node API: ${NODE_API_URL}`);
});

module.exports = app;
```

### **Option 3: Azure Static Web App Integration**

Create `staticwebapp.config.json` for your Azure Static Web App:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "/wp-json/mobile-proxy/v1/{params:0}"
    },
    {
      "route": "/wp-json/*",
      "rewrite": "/wp-json/{params:0}"
    },
    {
      "route": "/otp/*",
      "rewrite": "/wp-json/otp-proxy/v1/{params:0}"
    },
    {
      "route": "/woocommerce/*",
      "rewrite": "/wp-json/node-proxy/v1/{params:0}"
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }
}
```

## 📱 **Mobile App Configuration Updates**

Update your mobile app's API base URLs to use the proxy endpoints:

### **Android/iOS App Configuration**

```javascript
// Old configuration
const API_BASE_URL = 'https://yourdomain.com/wp-json/api/v1/';

// New configuration with proxy
const API_ENDPOINTS = {
    // Mobile App APIs
    mobile: 'https://yourdomain.com/wp-json/mobile-proxy/v1/',
    
    // WooCommerce APIs  
    woocommerce: 'https://yourdomain.com/wp-json/wc-proxy/v1/',
    
    // Node.js APIs
    nodeApi: 'https://yourdomain.com/wp-json/node-proxy/v1/',
    
    // OTP APIs
    otp: 'https://yourdomain.com/wp-json/otp-proxy/v1/',
    
    // Migration APIs
    migration: 'https://yourdomain.com/wp-json/migration-proxy/v1/'
};

// Example API calls
const loginUser = async (phoneNumber) => {
    const response = await fetch(`${API_ENDPOINTS.mobile}check-phone-exists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
    });
    return response.json();
};

const sendOTP = async (phoneNumber) => {
    const response = await fetch(`${API_ENDPOINTS.otp}send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
    });
    return response.json();
};
```

## 🔧 **Implementation Steps**

### **Step 1: Install the WordPress Plugin**
```bash
# Create plugin directory
mkdir -p /var/www/html/wp-content/plugins/api-bridge-proxy

# Create the plugin file (copy the PHP code above)
# Then activate it in WordPress admin
```

### **Step 2: Update WordPress Configuration**
Add to `wp-config.php`:
```php
// API Proxy Configuration
define('API_PROXY_BACKEND_URL', 'http://localhost');
define('API_PROXY_NODE_URL', 'http://localhost:3001');
define('API_PROXY_ENABLED', true);
```

### **Step 3: Test the Proxy**
```bash
# Test WordPress proxy
curl -X GET "https://yourdomain.com/wp-json/mobile-proxy/v1/products"

# Test OTP proxy
curl -X POST "https://yourdomain.com/wp-json/otp-proxy/v1/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Test Node.js proxy
curl -X GET "https://yourdomain.com/wp-json/node-proxy/v1/woocommerce?action=getUserByPhone&phone=1234567890"
```

### **Step 4: Update Mobile Apps**
- Change API base URLs to use proxy endpoints
- Test all existing functionality
- Update authentication flows if needed

## 🎯 **Benefits of This Solution**

1. **Zero DNS Changes**: Works with existing DNS pointing to Azure Static App
2. **Backward Compatible**: Existing WordPress APIs continue to work
3. **Centralized**: All API traffic goes through one proxy system
4. **Scalable**: Can handle multiple backend services
5. **Monitoring**: Built-in health checks and logging
6. **Security**: Can add authentication/rate limiting easily

## 🚨 **Important Notes**

1. **Activate the Plugin**: Don't forget to activate the API Bridge Proxy plugin in WordPress admin
2. **Update Mobile Apps**: Change API endpoints in your mobile apps to use the proxy URLs
3. **Test Thoroughly**: Test all mobile app functionality with the new proxy setup
4. **Monitor Performance**: The proxy adds a small latency overhead
5. **Security**: Consider adding authentication to the proxy endpoints for production

This solution allows your mobile apps to continue working through the existing DNS while routing requests to your WordPress backend seamlessly!

```php
<?php
/**
 * Plugin Name: API Bridge Proxy
 * Description: Bridges mobile app requests to WordPress backend when DNS points to static Azure app
 * Version: 1.0.0
 * Author: ToyFlix Team
 */

if (!defined('ABSPATH')) {
    exit;
}

class APIBridgeProxy {
    
    private $backend_url;
    private $node_api_url;
    
    public function __construct() {
        // Configure your actual WordPress backend URLs
        $this->backend_url = 'http://localhost'; // Your current WordPress installation
        $this->node_api_url = 'http://localhost:3001'; // Your Node.js API server
        
        add_action('rest_api_init', array($this, 'register_proxy_routes'));
        add_action('init', array($this, 'handle_legacy_api_calls'));
    }
    
    /**
     * Register proxy routes that mirror your existing mobile API structure
     */
    public function register_proxy_routes() {
        
        // Mobile App API Proxy Routes
        register_rest_route('mobile-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_mobile_api'),
            'permission_callback' => '__return_true',
        ));
        
        // WooCommerce API Proxy Routes
        register_rest_route('wc-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_woocommerce_api'),
            'permission_callback' => '__return_true',
        ));
        
        // Node.js API Proxy Routes
        register_rest_route('node-proxy/v1', '/(?P<endpoint>.*)', array(
            'methods' => ['GET', 'POST', 'PUT', 'DELETE'],
            'callback' => array($this, 'proxy_node_api'),
            'permission_callback' => '__return_true',
        ));
        
        // OTP API Proxy
        register_rest_route('otp-proxy/v1', '/(?P<action>send-otp|verify-otp)', array(
            'methods' => 'POST',
            'callback' => array($this, 'proxy_otp_api'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Proxy mobile app API calls to the actual WordPress backend
     */
    public function proxy_mobile_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        // Map the endpoint to the actual WordPress API
        $target_url = $this->backend_url . '/wp-json/api/v1/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy WooCommerce API calls
     */
    public function proxy_woocommerce_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        $target_url = $this->backend_url . '/wp-json/wc/v3/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy Node.js API calls
     */
    public function proxy_node_api($request) {
        $endpoint = $request->get_param('endpoint');
        $method = $request->get_method();
        
        $target_url = $this->node_api_url . '/api/' . $endpoint;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Proxy OTP API calls
     */
    public function proxy_otp_api($request) {
        $action = $request->get_param('action');
        $method = $request->get_method();
        
        $target_url = $this->backend_url . '/wp-json/custom/v1/' . $action;
        
        return $this->make_proxy_request($target_url, $method, $request);
    }
    
    /**
     * Make the actual proxy request
     */
    private function make_proxy_request($target_url, $method, $request) {
        // Get request parameters
        $params = $request->get_params();
        $body = $request->get_body();
        $headers = $request->get_headers();
        
        // Prepare request arguments
        $args = array(
            'method' => $method,
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'User-Agent' => 'ToyFlix-API-Proxy/1.0'
            )
        );
        
        // Forward authorization headers
        if (isset($headers['authorization'])) {
            $args['headers']['Authorization'] = $headers['authorization'][0];
        }
        
        // Handle different HTTP methods
        if ($method === 'GET') {
            if (!empty($params)) {
                $target_url .= '?' . http_build_query($params);
            }
        } else {
            if (!empty($body)) {
                $args['body'] = $body;
            } elseif (!empty($params)) {
                $args['body'] = json_encode($params);
            }
        }
        
        // Make the request
        $response = wp_remote_request($target_url, $args);
        
        // Handle errors
        if (is_wp_error($response)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Proxy request failed: ' . $response->get_error_message(),
                'target_url' => $target_url
            ), 500);
        }
        
        // Get response data
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        // Try to decode JSON response
        $decoded_body = json_decode($response_body, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            $response_body = $decoded_body;
        }
        
        return new WP_REST_Response($response_body, $response_code);
    }
}

// Initialize the plugin
new APIBridgeProxy();
```

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// WordPress Backend Configuration
const WORDPRESS_URL = 'http://localhost';
const NODE_API_URL = 'http://localhost:3001';

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        proxy: 'healthy',
        timestamp: new Date().toISOString(),
        backends: {
            wordpress: WORDPRESS_URL,
            nodeApi: NODE_API_URL
        }
    });
});

// Proxy WordPress REST API
app.use('/wp-json', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/wp-json': '/wp-json'
    },
    onError: (err, req, res) => {
        console.error('WordPress Proxy Error:', err);
        res.status(500).json({ error: 'WordPress backend unavailable' });
    }
}));

// Proxy Mobile App API
app.use('/api', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/wp-json/api'
    },
    onError: (err, req, res) => {
        console.error('Mobile API Proxy Error:', err);
        res.status(500).json({ error: 'Mobile API backend unavailable' });
    }
}));

// Proxy Node.js WooCommerce API
app.use('/node-api', createProxyMiddleware({
    target: NODE_API_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/node-api': '/api'
    },
    onError: (err, req, res) => {
        console.error('Node API Proxy Error:', err);
        res.status(500).json({ error: 'Node API backend unavailable' });
    }
}));

// Proxy OTP API
app.use('/otp', createProxyMiddleware({
    target: WORDPRESS_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/otp': '/wp-json/custom/v1'
    }
}));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 API Proxy Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxying to WordPress: ${WORDPRESS_URL}`);
    console.log(`🔗 Proxying to Node API: ${NODE_API_URL}`);
});

module.exports = app;
```

```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "/wp-json/mobile-proxy/v1/{params:0}"
    },
    {
      "route": "/wp-json/*",
      "rewrite": "/wp-json/{params:0}"
    },
    {
      "route": "/otp/*",
      "rewrite": "/wp-json/otp-proxy/v1/{params:0}"
    },
    {
      "route": "/woocommerce/*",
      "rewrite": "/wp-json/node-proxy/v1/{params:0}"
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }
}
```

```javascript
// Old configuration
const API_BASE_URL = 'https://yourdomain.com/wp-json/api/v1/';

// New configuration with proxy
const API_ENDPOINTS = {
    // Mobile App APIs
    mobile: 'https://yourdomain.com/wp-json/mobile-proxy/v1/',
    
    // WooCommerce APIs  
    woocommerce: 'https://yourdomain.com/wp-json/wc-proxy/v1/',
    
    // Node.js APIs
    nodeApi: 'https://yourdomain.com/wp-json/node-proxy/v1/',
    
    // OTP APIs
    otp: 'https://yourdomain.com/wp-json/otp-proxy/v1/',
    
    // Migration APIs
    migration: 'https://yourdomain.com/wp-json/migration-proxy/v1/'
};

// Example API calls
const loginUser = async (phoneNumber) => {
    const response = await fetch(`${API_ENDPOINTS.mobile}check-phone-exists/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
    });
    return response.json();
};

const sendOTP = async (phoneNumber) => {
    const response = await fetch(`${API_ENDPOINTS.otp}send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
    });
    return response.json();
};
```

```shellscript
# Create plugin directory
mkdir -p /var/www/html/wp-content/plugins/api-bridge-proxy

# Create the plugin file (copy the PHP code above)
# Then activate it in WordPress admin
```

```php
// API Proxy Configuration
define('API_PROXY_BACKEND_URL', 'http://localhost');
define('API_PROXY_NODE_URL', 'http://localhost:3001');
define('API_PROXY_ENABLED', true);
```

```shellscript
# Test WordPress proxy
curl -X GET "https://yourdomain.com/wp-json/mobile-proxy/v1/products"

# Test OTP proxy
curl -X POST "https://yourdomain.com/wp-json/otp-proxy/v1/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890"}'

# Test Node.js proxy
curl -X GET "https://yourdomain.com/wp-json/node-proxy/v1/woocommerce?action=getUserByPhone&phone=1234567890"
```

---

**User**

we cannot make any changes in the app as the users have to update or get the update delivered properly so how we can do

---

**Cursor**

Ah, I understand! You can't update the mobile apps because users already have them installed and you can't force updates. We need to make the existing app API calls work without any changes to the mobile app code.

Let me analyze the current API structure and create a solution that intercepts the existing API calls:

Perfect! Now I understand the exact API structure. The mobile apps are calling endpoints like:
- `https://yourdomain.com/wp-json/api/v1/check-phone-exists/`
- `https://yourdomain.com/wp-json/api/v1/products`
- `https://yourdomain.com/wp-json/custom/v1/send-otp`

Since you can't update the mobile apps, we need to make these exact same endpoints work on the static Azure app domain. Here are **3 solutions** that require **zero mobile app changes**:

## 🚀 **Solution 1: Azure Static Web App Proxy Rules (Recommended)**

This is the cleanest solution. Configure your Azure Static Web App to proxy API calls to your WordPress backend.

### **Create `staticwebapp.config.json` in your Azure Static Web App root:**

```json
{
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/custom/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/custom-api/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/migration/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  },
  "forwardingGateway": {
    "allowedForwardedHosts": ["your-wordpress-backend-domain.com"],
    "requiredHeaders": {}
  }
}
```

### **Create Azure Functions for API Proxying:**

Create `api/proxy.js` in your Azure Static Web App:

```javascript
const { app } = require('@azure/functions');

// Your WordPress backend URL
const WORDPRESS_BACKEND = 'https://your-wordpress-backend.com'; // Replace with your actual WordPress URL
const NODE_API_BACKEND = 'http://your-wordpress-server:3001'; // Your Node.js API

app.http('apiProxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'wp-json/{*restOfPath}',
    handler: async (request, context) => {
        const restOfPath = request.params.restOfPath;
        const method = request.method;
        const headers = request.headers;
        
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            };
        }
        
        try {
            // Determine target URL
            let targetUrl;
            if (restOfPath.startsWith('api/v1/') || 
                restOfPath.startsWith('custom/v1/') || 
                restOfPath.startsWith('custom-api/v1/') ||
                restOfPath.startsWith('migration/v1/')) {
                targetUrl = `${WORDPRESS_BACKEND}/wp-json/${restOfPath}`;
            } else {
                targetUrl = `${WORDPRESS_BACKEND}/wp-json/${restOfPath}`;
            }
            
            // Prepare request options
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Azure-Static-App-Proxy/1.0'
                }
            };
            
            // Forward authorization header if present
            if (headers.authorization) {
                requestOptions.headers.Authorization = headers.authorization;
            }
            
            // Add body for POST/PUT requests
            if (method === 'POST' || method === 'PUT') {
                const body = await request.text();
                if (body) {
                    requestOptions.body = body;
                }
            }
            
            // Add query parameters for GET requests
            if (method === 'GET' && request.url.includes('?')) {
                const queryString = request.url.split('?')[1];
                targetUrl += '?' + queryString;
            }
            
            // Make the proxy request
            const response = await fetch(targetUrl, requestOptions);
            const responseBody = await response.text();
            
            // Try to parse as JSON, fallback to text
            let parsedBody;
            try {
                parsedBody = JSON.parse(responseBody);
            } catch {
                parsedBody = responseBody;
            }
            
            return {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('content-type') || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
                body: JSON.stringify(parsedBody)
            };
            
        } catch (error) {
            context.log('Proxy error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Proxy request failed',
                    error: error.message
                })
            };
        }
    }
});
```

## 🚀 **Solution 2: WordPress .htaccess Redirect (If you have access to WordPress hosting)**

Add this to your WordPress `.htaccess` file to handle requests that come to the static app:

```apache
# API Proxy Rules for Mobile App Compatibility
RewriteEngine On

# Handle CORS preflight requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^wp-json/(.*)$ - [R=200,L]

# Proxy API calls to local WordPress if they come from external domain
RewriteCond %{HTTP_HOST} ^your-static-app-domain\.azurestaticapps\.net$ [NC]
RewriteCond %{REQUEST_URI} ^/wp-json/(api|custom|custom-api|migration)/v1/(.*)$
RewriteRule ^wp-json/(.*)$ http://localhost/wp-json/$1 [P,L]

# Add CORS headers for API responses
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

## 🚀 **Solution 3: WordPress Plugin Interceptor (Most Reliable)**

Create a WordPress plugin that intercepts and handles the exact API calls your mobile apps are making:

### **Create `/wp-content/plugins/mobile-api-interceptor/mobile-api-interceptor.php`:**

```php
<?php
/**
 * Plugin Name: Mobile API Interceptor
 * Description: Intercepts mobile app API calls and ensures they work regardless of DNS configuration
 * Version: 1.0.0
 * Author: ToyFlix Team
 */

if (!defined('ABSPATH')) {
    exit;
}

class MobileAPIInterceptor {
    
    public function __construct() {
        add_action('init', array($this, 'handle_api_requests'), 1);
        add_action('rest_api_init', array($this, 'ensure_api_routes'));
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers'), 10, 4);
    }
    
    /**
     * Handle direct API requests that bypass WordPress routing
     */
    public function handle_api_requests() {
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        
        // Check if this is an API request
        if (strpos($request_uri, '/wp-json/') === 0) {
            // Extract the API path
            $api_path = str_replace('/wp-json/', '', $request_uri);
            
            // Check if it's one of our mobile API endpoints
            if (preg_match('/^(api|custom|custom-api|migration)\/v1\//', $api_path)) {
                $this->proxy_to_backend($api_path);
            }
        }
    }
    
    /**
     * Ensure all mobile API routes are properly registered
     */
    public function ensure_api_routes() {
        // This ensures the mobile_app_api plugin routes are loaded
        if (class_exists('Mobile_App_API') || function_exists('register_api_routes')) {
            // Routes should already be registered by the mobile_app_api plugin
            return;
        }
        
        // Fallback: Register essential routes if plugin is not active
        $this->register_fallback_routes();
    }
    
    /**
     * Register fallback routes for essential mobile app functions
     */
    private function register_fallback_routes() {
        // Essential mobile app routes
        register_rest_route('api/v1', 'check-phone-exists/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_check_phone'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('api/v1', 'send-otp/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_send_otp'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('api/v1', 'verify-otp/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_verify_otp'),
            'permission_callback' => '__return_true',
        ));
        
        // Add more essential routes as needed
    }
    
    /**
     * Proxy requests to the actual WordPress backend
     */
    private function proxy_to_backend($api_path) {
        $backend_url = $this->get_backend_url();
        $target_url = $backend_url . '/wp-json/' . $api_path;
        
        // Get request method and data
        $method = $_SERVER['REQUEST_METHOD'];
        $headers = getallheaders();
        $body = file_get_contents('php://input');
        
        // Prepare cURL request
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $target_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $this->prepare_headers($headers),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        
        // Add body for POST/PUT requests
        if (in_array($method, ['POST', 'PUT', 'PATCH']) && !empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        
        // Execute request
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        
        // Set response headers
        http_response_code($http_code);
        header('Content-Type: ' . ($content_type ?: 'application/json'));
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        // Output response
        echo $response;
        exit;
    }
    
    /**
     * Get the backend URL (your actual WordPress installation)
     */
    private function get_backend_url() {
        // Try to determine if we're on the static app or the actual WordPress
        $host = $_SERVER['HTTP_HOST'] ?? '';
        
        if (strpos($host, 'azurestaticapps.net') !== false) {
            // We're on the static app, proxy to actual WordPress
            return 'https://your-actual-wordpress-domain.com'; // Replace with your WordPress URL
        }
        
        // We're on the actual WordPress, use localhost
        return 'http://localhost';
    }
    
    /**
     * Prepare headers for proxy request
     */
    private function prepare_headers($headers) {
        $proxy_headers = [];
        
        foreach ($headers as $key => $value) {
            // Forward important headers
            if (in_array(strtolower($key), ['content-type', 'authorization', 'user-agent'])) {
                $proxy_headers[] = $key . ': ' . $value;
            }
        }
        
        $proxy_headers[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
        $proxy_headers[] = 'X-Proxy-Source: Mobile-API-Interceptor';
        
        return $proxy_headers;
    }
    
    /**
     * Add CORS headers to all API responses
     */
    public function add_cors_headers($served, $result, $request, $server) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        return $served;
    }
    
    /**
     * Fallback functions for essential mobile app operations
     */
    public function fallback_check_phone($request) {
        // Proxy to the actual check_phone_exists function
        return $this->proxy_to_mobile_api('check-phone-exists/', $request);
    }
    
    public function fallback_send_otp($request) {
        // Proxy to the actual send_otp function
        return $this->proxy_to_mobile_api('send-otp/', $request);
    }
    
    public function fallback_verify_otp($request) {
        // Proxy to the actual verify_otp function
        return $this->proxy_to_mobile_api('verify-otp/', $request);
    }
    
    /**
     * Proxy to mobile API functions
     */
    private function proxy_to_mobile_api($endpoint, $request) {
        $backend_url = $this->get_backend_url();
        $target_url = $backend_url . '/wp-json/api/v1/' . $endpoint;
        
        // Make the request using wp_remote_post
        $args = array(
            'method' => $request->get_method(),
            'body' => $request->get_body(),
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        );
        
        $response = wp_remote_request($target_url, $args);
        
        if (is_wp_error($response)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Backend request failed: ' . $response->get_error_message()
            ), 500);
        }
        
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        
        return new WP_REST_Response($decoded ?: $body, wp_remote_retrieve_response_code($response));
    }
}

// Initialize the interceptor
new MobileAPIInterceptor();

// Handle OPTIONS requests for CORS
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        
        return $value;
    });
});
```

## 🔧 **Implementation Steps**

### **Step 1: Choose Your Solution**

**For Azure Static Web Apps (Recommended):**
1. Add the `staticwebapp.config.json` to your static app root
2. Create the Azure Function proxy
3. Deploy the changes

**For WordPress Plugin (Most Reliable):**
1. Create the plugin directory: `/wp-content/plugins/mobile-api-interceptor/`
2. Add the plugin file
3. Activate the plugin in WordPress admin

### **Step 2: Update Configuration**

In the plugin or Azure function, replace:
```
'https://your-actual-wordpress-domain.com'
```
With your actual WordPress backend URL.

### **Step 3: Test the Existing Mobile App Endpoints**

Test that all existing endpoints work without any changes:

```bash
# Test existing mobile app endpoints
curl -X POST "https://yourdomain.com/wp-json/api/v1/check-phone-exists/" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

curl -X POST "https://yourdomain.com/wp-json/api/v1/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

curl -X GET "https://yourdomain.com/wp-json/api/v1/products"

curl -X GET "https://yourdomain.com/wp-json/custom-api/v1/product-category-list/"
```

## 🎯 **Why This Works**

1. **Zero Mobile App Changes**: The exact same API endpoints continue to work
2. **Transparent Proxy**: Mobile apps don't know they're being proxied
3. **Maintains All Functionality**: All existing features continue to work
4. **CORS Handling**: Proper CORS headers for mobile app requests
5. **Error Handling**: Graceful fallbacks if backend is unavailable

## 🚨 **Important Configuration**

1. **Update Backend URL**: Replace `your-actual-wordpress-domain.com` with your real WordPress URL
2. **Activate Plugin**: Don't forget to activate the interceptor plugin
3. **Test All Endpoints**: Verify every mobile app function works
4. **Monitor Logs**: Check for any proxy errors in WordPress/Azure logs

This solution ensures your existing mobile apps continue working exactly as they are, with zero updates required! 🎉

```json
{
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/custom/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/custom-api/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    },
    {
      "route": "/wp-json/migration/v1/*",
      "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      "allowedRoles": ["anonymous"],
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  },
  "globalHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  },
  "forwardingGateway": {
    "allowedForwardedHosts": ["your-wordpress-backend-domain.com"],
    "requiredHeaders": {}
  }
}
```

```javascript
const { app } = require('@azure/functions');

// Your WordPress backend URL
const WORDPRESS_BACKEND = 'https://your-wordpress-backend.com'; // Replace with your actual WordPress URL
const NODE_API_BACKEND = 'http://your-wordpress-server:3001'; // Your Node.js API

app.http('apiProxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'wp-json/{*restOfPath}',
    handler: async (request, context) => {
        const restOfPath = request.params.restOfPath;
        const method = request.method;
        const headers = request.headers;
        
        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            };
        }
        
        try {
            // Determine target URL
            let targetUrl;
            if (restOfPath.startsWith('api/v1/') || 
                restOfPath.startsWith('custom/v1/') || 
                restOfPath.startsWith('custom-api/v1/') ||
                restOfPath.startsWith('migration/v1/')) {
                targetUrl = `${WORDPRESS_BACKEND}/wp-json/${restOfPath}`;
            } else {
                targetUrl = `${WORDPRESS_BACKEND}/wp-json/${restOfPath}`;
            }
            
            // Prepare request options
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Azure-Static-App-Proxy/1.0'
                }
            };
            
            // Forward authorization header if present
            if (headers.authorization) {
                requestOptions.headers.Authorization = headers.authorization;
            }
            
            // Add body for POST/PUT requests
            if (method === 'POST' || method === 'PUT') {
                const body = await request.text();
                if (body) {
                    requestOptions.body = body;
                }
            }
            
            // Add query parameters for GET requests
            if (method === 'GET' && request.url.includes('?')) {
                const queryString = request.url.split('?')[1];
                targetUrl += '?' + queryString;
            }
            
            // Make the proxy request
            const response = await fetch(targetUrl, requestOptions);
            const responseBody = await response.text();
            
            // Try to parse as JSON, fallback to text
            let parsedBody;
            try {
                parsedBody = JSON.parse(responseBody);
            } catch {
                parsedBody = responseBody;
            }
            
            return {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('content-type') || 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
                body: JSON.stringify(parsedBody)
            };
            
        } catch (error) {
            context.log('Proxy error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Proxy request failed',
                    error: error.message
                })
            };
        }
    }
});
```

```plaintext
# API Proxy Rules for Mobile App Compatibility
RewriteEngine On

# Handle CORS preflight requests
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^wp-json/(.*)$ - [R=200,L]

# Proxy API calls to local WordPress if they come from external domain
RewriteCond %{HTTP_HOST} ^your-static-app-domain\.azurestaticapps\.net$ [NC]
RewriteCond %{REQUEST_URI} ^/wp-json/(api|custom|custom-api|migration)/v1/(.*)$
RewriteRule ^wp-json/(.*)$ http://localhost/wp-json/$1 [P,L]

# Add CORS headers for API responses
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

```php
<?php
/**
 * Plugin Name: Mobile API Interceptor
 * Description: Intercepts mobile app API calls and ensures they work regardless of DNS configuration
 * Version: 1.0.0
 * Author: ToyFlix Team
 */

if (!defined('ABSPATH')) {
    exit;
}

class MobileAPIInterceptor {
    
    public function __construct() {
        add_action('init', array($this, 'handle_api_requests'), 1);
        add_action('rest_api_init', array($this, 'ensure_api_routes'));
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers'), 10, 4);
    }
    
    /**
     * Handle direct API requests that bypass WordPress routing
     */
    public function handle_api_requests() {
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        
        // Check if this is an API request
        if (strpos($request_uri, '/wp-json/') === 0) {
            // Extract the API path
            $api_path = str_replace('/wp-json/', '', $request_uri);
            
            // Check if it's one of our mobile API endpoints
            if (preg_match('/^(api|custom|custom-api|migration)\/v1\//', $api_path)) {
                $this->proxy_to_backend($api_path);
            }
        }
    }
    
    /**
     * Ensure all mobile API routes are properly registered
     */
    public function ensure_api_routes() {
        // This ensures the mobile_app_api plugin routes are loaded
        if (class_exists('Mobile_App_API') || function_exists('register_api_routes')) {
            // Routes should already be registered by the mobile_app_api plugin
            return;
        }
        
        // Fallback: Register essential routes if plugin is not active
        $this->register_fallback_routes();
    }
    
    /**
     * Register fallback routes for essential mobile app functions
     */
    private function register_fallback_routes() {
        // Essential mobile app routes
        register_rest_route('api/v1', 'check-phone-exists/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_check_phone'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('api/v1', 'send-otp/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_send_otp'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('api/v1', 'verify-otp/', array(
            'methods' => 'POST',
            'callback' => array($this, 'fallback_verify_otp'),
            'permission_callback' => '__return_true',
        ));
        
        // Add more essential routes as needed
    }
    
    /**
     * Proxy requests to the actual WordPress backend
     */
    private function proxy_to_backend($api_path) {
        $backend_url = $this->get_backend_url();
        $target_url = $backend_url . '/wp-json/' . $api_path;
        
        // Get request method and data
        $method = $_SERVER['REQUEST_METHOD'];
        $headers = getallheaders();
        $body = file_get_contents('php://input');
        
        // Prepare cURL request
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $target_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $this->prepare_headers($headers),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        
        // Add body for POST/PUT requests
        if (in_array($method, ['POST', 'PUT', 'PATCH']) && !empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        
        // Execute request
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        
        // Set response headers
        http_response_code($http_code);
        header('Content-Type: ' . ($content_type ?: 'application/json'));
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        // Output response
        echo $response;
        exit;
    }
    
    /**
     * Get the backend URL (your actual WordPress installation)
     */
    private function get_backend_url() {
        // Try to determine if we're on the static app or the actual WordPress
        $host = $_SERVER['HTTP_HOST'] ?? '';
        
        if (strpos($host, 'azurestaticapps.net') !== false) {
            // We're on the static app, proxy to actual WordPress
            return 'https://your-actual-wordpress-domain.com'; // Replace with your WordPress URL
        }
        
        // We're on the actual WordPress, use localhost
        return 'http://localhost';
    }
    
    /**
     * Prepare headers for proxy request
     */
    private function prepare_headers($headers) {
        $proxy_headers = [];
        
        foreach ($headers as $key => $value) {
            // Forward important headers
            if (in_array(strtolower($key), ['content-type', 'authorization', 'user-agent'])) {
                $proxy_headers[] = $key . ': ' . $value;
            }
        }
        
        $proxy_headers[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');
        $proxy_headers[] = 'X-Proxy-Source: Mobile-API-Interceptor';
        
        return $proxy_headers;
    }
    
    /**
     * Add CORS headers to all API responses
     */
    public function add_cors_headers($served, $result, $request, $server) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        return $served;
    }
    
    /**
     * Fallback functions for essential mobile app operations
     */
    public function fallback_check_phone($request) {
        // Proxy to the actual check_phone_exists function
        return $this->proxy_to_mobile_api('check-phone-exists/', $request);
    }
    
    public function fallback_send_otp($request) {
        // Proxy to the actual send_otp function
        return $this->proxy_to_mobile_api('send-otp/', $request);
    }
    
    public function fallback_verify_otp($request) {
        // Proxy to the actual verify_otp function
        return $this->proxy_to_mobile_api('verify-otp/', $request);
    }
    
    /**
     * Proxy to mobile API functions
     */
    private function proxy_to_mobile_api($endpoint, $request) {
        $backend_url = $this->get_backend_url();
        $target_url = $backend_url . '/wp-json/api/v1/' . $endpoint;
        
        // Make the request using wp_remote_post
        $args = array(
            'method' => $request->get_method(),
            'body' => $request->get_body(),
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        );
        
        $response = wp_remote_request($target_url, $args);
        
        if (is_wp_error($response)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Backend request failed: ' . $response->get_error_message()
            ), 500);
        }
        
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        
        return new WP_REST_Response($decoded ?: $body, wp_remote_retrieve_response_code($response));
    }
}

// Initialize the interceptor
new MobileAPIInterceptor();

// Handle OPTIONS requests for CORS
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            exit(0);
        }
        
        return $value;
    });
});
```

```plaintext
'https://your-actual-wordpress-domain.com'
```

```shellscript
# Test existing mobile app endpoints
curl -X POST "https://yourdomain.com/wp-json/api/v1/check-phone-exists/" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

curl -X POST "https://yourdomain.com/wp-json/api/v1/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}'

curl -X GET "https://yourdomain.com/wp-json/api/v1/products"

curl -X GET "https://yourdomain.com/wp-json/custom-api/v1/product-category-list/"
```

---

**User**

we are using a new db that is from supabase.so in this case how can we do this

---

**Cursor**

Ah, now I understand! You're migrating from WordPress/MySQL to Supabase (PostgreSQL), but the mobile apps are still calling the old WordPress API endpoints. You need to create a bridge that translates the old WordPress API calls to work with your new Supabase database.

Let me analyze the current API structure and create a solution:

Perfect! Now I understand the complete picture. You have:

1. **Mobile apps** calling WordPress REST API endpoints
2. **Old WordPress/MySQL database** with WooCommerce data
3. **New Supabase PostgreSQL database** where you want to migrate
4. **DNS pointing to Azure Static Web App**

You need a **WordPress-to-Supabase API Bridge** that translates the old API calls to work with Supabase. Here's the complete solution:

## 🚀 **Solution: WordPress-to-Supabase API Bridge**

### **Option 1: Node.js API Bridge Server (Recommended)**

Create a new Node.js server that mimics the WordPress API structure but connects to Supabase:

#### **1. Create `supabase-api-bridge.js`:**

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3003;

// Supabase Configuration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Twilio Configuration (from your existing setup - use env vars in production)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+1234567890';

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Supabase API Bridge',
        timestamp: new Date().toISOString(),
        supabase: 'connected'
    });
});

// ============================================================================
// MOBILE APP API ENDPOINTS (WordPress API Compatible)
// ============================================================================

// Check if phone exists
app.post('/wp-json/api/v1/check-phone-exists/', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Query Supabase users table
        const { data: users, error } = await supabase
            .from('users')
            .select('id, phone, email, first_name, last_name')
            .eq('phone', phone)
            .limit(1);
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        const userExists = users && users.length > 0;
        
        res.json({
            success: true,
            user_exists: userExists,
            user: userExists ? users[0] : null
        });
        
    } catch (error) {
        console.error('Check phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// User signup
app.post('/wp-json/api/v1/sign-up/', async (req, res) => {
    try {
        const { email, username, mobile, pincode, first_name, last_name } = req.body;
        
        // Validate required fields
        if (!email || !mobile) {
            return res.status(400).json({
                success: false,
                message: 'Email and mobile are required'
            });
        }
        
        // Check if user already exists
        const { data: existingUsers } = await supabase
            .from('users')
            .select('id')
            .or(`email.eq.${email},phone.eq.${mobile}`)
            .limit(1);
            
        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or phone'
            });
        }
        
        // Create new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                email: email,
                username: username || email.split('@')[0],
                phone: mobile,
                pincode: pincode,
                first_name: first_name,
                last_name: last_name,
                created_at: new Date().toISOString(),
                user_status: 'active'
            }])
            .select()
            .single();
            
        if (error) {
            console.error('User creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
        
        res.json({
            success: true,
            message: 'User created successfully',
            user: newUser
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Generate token (login)
app.post('/wp-json/api/v1/generate-token/', async (req, res) => {
    try {
        const { phone_number, fcm_token } = req.body;
        
        if (!phone_number) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Find user by phone
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone_number)
            .limit(1);
            
        if (error || !users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = users[0];
        
        // Update FCM token if provided
        if (fcm_token) {
            await supabase
                .from('users')
                .update({ fcm_token: fcm_token })
                .eq('id', user.id);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.id, 
                phone: user.phone,
                email: user.email 
            },
            'your-jwt-secret', // Use a secure secret
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
        
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send OTP
app.post('/wp-json/api/v1/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Store OTP in Supabase (with expiry)
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        const { error } = await supabase
            .from('otp_codes')
            .upsert([{
                phone_number: phoneNumber,
                otp_code: otp.toString(),
                expires_at: expiryTime.toISOString(),
                created_at: new Date().toISOString()
            }], { 
                onConflict: 'phone_number' 
            });
            
        if (error) {
            console.error('OTP storage error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to store OTP'
            });
        }
        
        // Send SMS via Twilio
        try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    From: TWILIO_PHONE,
                    To: phoneNumber,
                    Body: `Your ToyFlix OTP code is: ${otp}`
                })
            });
            
            if (response.ok) {
                res.json({
                    success: true,
                    message: 'OTP sent successfully'
                });
            } else {
                throw new Error('Twilio API error');
            }
            
        } catch (twilioError) {
            console.error('Twilio error:', twilioError);
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP'
            });
        }
        
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify OTP
app.post('/wp-json/api/v1/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        
        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }
        
        // Get OTP from Supabase
        const { data: otpRecords, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('otp_code', otp.toString())
            .gt('expires_at', new Date().toISOString())
            .limit(1);
            
        if (error) {
            console.error('OTP verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }
        
        // Delete used OTP
        await supabase
            .from('otp_codes')
            .delete()
            .eq('phone_number', phoneNumber);
            
        res.json({
            success: true,
            message: 'OTP verified successfully'
        });
        
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get products
app.get('/wp-json/api/v1/products', async (req, res) => {
    try {
        const { page = 1, per_page = 20, category, search } = req.query;
        const offset = (page - 1) * per_page;
        
        let query = supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .range(offset, offset + per_page - 1);
            
        if (category) {
            query = query.eq('category_id', category);
        }
        
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        const { data: products, error } = await query;
        
        if (error) {
            console.error('Products query error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
        
        res.json({
            success: true,
            products: products || [],
            pagination: {
                page: parseInt(page),
                per_page: parseInt(per_page),
                total: products ? products.length : 0
            }
        });
        
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user profile
app.get('/wp-json/api/v1/user-profile/', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, first_name, last_name, pincode, created_at')
            .eq('id', decoded.user_id)
            .single();
            
        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: user
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Get subscription details
app.get('/wp-json/api/v1/subscription-details', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                subscription_plans (
                    name,
                    duration_months,
                    price
                )
            `)
            .eq('user_id', decoded.user_id)
            .eq('status', 'active');
            
        if (error) {
            console.error('Subscription query error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch subscriptions'
            });
        }
        
        res.json({
            success: true,
            subscriptions: subscriptions || []
        });
        
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Create order
app.post('/wp-json/api/v1/create-order', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { 
            products, 
            billing_address, 
            shipping_address, 
            payment_method,
            subscription_plan_id 
        } = req.body;
        
        // Calculate total
        let total = 0;
        const orderItems = [];
        
        for (const item of products) {
            const { data: product } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();
                
            if (product) {
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                orderItems.push({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: product.price,
                    total: itemTotal
                });
            }
        }
        
        // Create order
        const { data: order, error } = await supabase
            .from('orders')
            .insert([{
                user_id: decoded.user_id,
                total: total,
                status: 'pending',
                billing_address: billing_address,
                shipping_address: shipping_address,
                payment_method: payment_method,
                subscription_plan_id: subscription_plan_id,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) {
            console.error('Order creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order'
            });
        }
        
        // Create order items
        const orderItemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }));
        
        await supabase
            .from('order_items')
            .insert(orderItemsWithOrderId);
            
        res.json({
            success: true,
            message: 'Order created successfully',
            order: order
        });
        
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================================================
// SUPABASE DATABASE SCHEMA SETUP
// ============================================================================

// Function to create necessary tables in Supabase
async function setupSupabaseTables() {
    console.log('Setting up Supabase tables...');
    
    // Note: You'll need to run these SQL commands in your Supabase SQL editor
    const sqlCommands = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255),
        phone VARCHAR(20) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        pincode VARCHAR(10),
        fcm_token TEXT,
        user_status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- OTP codes table
    CREATE TABLE IF NOT EXISTS otp_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Products table
    CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id UUID,
        age_group VARCHAR(50),
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Subscription plans table
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration_months INTEGER NOT NULL,
        age_group VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subscription_plan_id UUID REFERENCES subscription_plans(id),
        status VARCHAR(50) DEFAULT 'active',
        start_date DATE NOT NULL,
        end_date DATE,
        current_month INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subscription_plan_id UUID REFERENCES subscription_plans(id),
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        billing_address JSONB,
        shipping_address JSONB,
        payment_method VARCHAR(100),
        estimated_delivery_date DATE,
        estimated_pickup_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID REFERENCES orders(id),
        product_id UUID REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    `;
    
    console.log('Run these SQL commands in your Supabase SQL editor:');
    console.log(sqlCommands);
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Supabase API Bridge running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 WordPress API Compatible endpoints available`);
    
    // Show setup instructions
    setupSupabaseTables();
});

module.exports = app;
```

#### **2. Create `package.json` for the bridge server:**

```json
{
  "name": "supabase-api-bridge",
  "version": "1.0.0",
  "description": "WordPress to Supabase API Bridge for ToyFlix mobile apps",
  "main": "supabase-api-bridge.js",
  "scripts": {
    "start": "node supabase-api-bridge.js",
    "dev": "nodemon supabase-api-bridge.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### **Option 2: Azure Static Web App Functions**

Create Azure Functions that proxy to your Supabase API:

#### **Create `api/supabase-proxy/index.js`:**

```javascript
const { app } = require('@azure/functions');
const { createClient } = require('@supabase/supabase-js');

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.http('supabaseProxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'wp-json/{namespace}/{version}/{endpoint}',
    handler: async (request, context) => {
        const { namespace, version, endpoint } = request.params;
        const method = request.method;
        
        // Handle CORS
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        
        try {
            let result;
            
            // Route to appropriate Supabase operations
            if (namespace === 'api' && version === 'v1') {
                result = await handleMobileAPI(endpoint, request, supabase);
            } else if (namespace === 'custom' && version === 'v1') {
                result = await handleCustomAPI(endpoint, request, supabase);
            } else {
                result = { success: false, message: 'Endpoint not found' };
            }
            
            return {
                status: result.status || 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result)
            };
            
        } catch (error) {
            context.log('Proxy error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Internal server error'
                })
            };
        }
    }
});

async function handleMobileAPI(endpoint, request, supabase) {
    const body = await request.json().catch(() => ({}));
    
    switch (endpoint) {
        case 'check-phone-exists/':
            return await checkPhoneExists(body.phone, supabase);
        case 'sign-up/':
            return await signUp(body, supabase);
        case 'generate-token/':
            return await generateToken(body, supabase);
        case 'products':
            return await getProducts(request.query, supabase);
        case 'user-profile/':
            return await getUserProfile(request.headers, supabase);
        default:
            return { success: false, message: 'Endpoint not implemented' };
    }
}

async function checkPhoneExists(phone, supabase) {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, phone, email, first_name, last_name')
        .eq('phone', phone)
        .limit(1);
        
    return {
        success: true,
        user_exists: users && users.length > 0,
        user: users && users.length > 0 ? users[0] : null
    };
}

// Add other handler functions...
```

## 🔧 **Implementation Steps**

### **Step 1: Set up Supabase Database**

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Run SQL Schema**: Copy the SQL commands from the Node.js server and run them in Supabase SQL editor
3. **Get API Keys**: Note your Supabase URL and anon key

### **Step 2: Deploy the API Bridge**

**Option A: Deploy Node.js Server**
```bash
# Install dependencies
npm install

# Update Supabase credentials in the code
# Deploy to your preferred platform (Heroku, Railway, etc.)
npm start
```

**Option B: Use Azure Static Web App Functions**
```bash
# Deploy the Azure Functions to your static web app
# Set environment variables for Supabase credentials
```

### **Step 3: Update DNS/Routing**

Configure your Azure Static Web App to route API calls to the bridge:

```json
{
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "rewrite": "/api/supabase-proxy/api/v1/{params:0}"
    },
    {
      "route": "/wp-json/custom/v1/*", 
      "rewrite": "/api/supabase-proxy/custom/v1/{params:0}"
    }
  ]
}
```

### **Step 4: Migrate Data**

Use your existing migration scripts to transfer data from WordPress/MySQL to Supabase:

```javascript
// Data migration script
const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');

async function migrateData() {
    // Connect to old MySQL database
    const mysqlConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'toyflix_user', 
        password: 'toyflixX1@@',
        database: 'toyflix'
    });
    
    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Migrate users
    const [users] = await mysqlConnection.execute('SELECT * FROM wp_users');
    for (const user of users) {
        await supabase.from('users').insert({
            email: user.user_email,
            username: user.user_login,
            // Map other fields...
        });
    }
    
    // Migrate products, orders, etc.
}
```

## 🎯 **Benefits of This Solution**

1. **Zero Mobile App Changes**: Existing API endpoints work exactly the same
2. **Modern Database**: PostgreSQL with Supabase features
3. **Scalable**: Supabase handles scaling automatically
4. **Real-time**: Built-in real-time subscriptions
5. **Security**: Row-level security and built-in auth
6. **Backup**: Automatic backups and point-in-time recovery

## 🚨 **Important Configuration**

1. **Update Supabase Credentials**: Replace placeholder URLs and keys
2. **Set JWT Secret**: Use a secure secret for token generation
3. **Configure CORS**: Ensure mobile apps can access the API
4. **Test All Endpoints**: Verify every mobile app function works
5. **Migrate Data**: Transfer all existing data to Supabase

This solution gives you the best of both worlds: **modern Supabase backend** with **zero mobile app changes**! 🚀

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3003;

// Supabase Configuration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-supabase-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Twilio Configuration (from your existing setup - use env vars in production)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_PHONE = process.env.TWILIO_PHONE || '+1234567890';

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Supabase API Bridge',
        timestamp: new Date().toISOString(),
        supabase: 'connected'
    });
});

// ============================================================================
// MOBILE APP API ENDPOINTS (WordPress API Compatible)
// ============================================================================

// Check if phone exists
app.post('/wp-json/api/v1/check-phone-exists/', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Query Supabase users table
        const { data: users, error } = await supabase
            .from('users')
            .select('id, phone, email, first_name, last_name')
            .eq('phone', phone)
            .limit(1);
            
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        const userExists = users && users.length > 0;
        
        res.json({
            success: true,
            user_exists: userExists,
            user: userExists ? users[0] : null
        });
        
    } catch (error) {
        console.error('Check phone error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// User signup
app.post('/wp-json/api/v1/sign-up/', async (req, res) => {
    try {
        const { email, username, mobile, pincode, first_name, last_name } = req.body;
        
        // Validate required fields
        if (!email || !mobile) {
            return res.status(400).json({
                success: false,
                message: 'Email and mobile are required'
            });
        }
        
        // Check if user already exists
        const { data: existingUsers } = await supabase
            .from('users')
            .select('id')
            .or(`email.eq.${email},phone.eq.${mobile}`)
            .limit(1);
            
        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or phone'
            });
        }
        
        // Create new user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert([{
                email: email,
                username: username || email.split('@')[0],
                phone: mobile,
                pincode: pincode,
                first_name: first_name,
                last_name: last_name,
                created_at: new Date().toISOString(),
                user_status: 'active'
            }])
            .select()
            .single();
            
        if (error) {
            console.error('User creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
        
        res.json({
            success: true,
            message: 'User created successfully',
            user: newUser
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Generate token (login)
app.post('/wp-json/api/v1/generate-token/', async (req, res) => {
    try {
        const { phone_number, fcm_token } = req.body;
        
        if (!phone_number) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Find user by phone
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone_number)
            .limit(1);
            
        if (error || !users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = users[0];
        
        // Update FCM token if provided
        if (fcm_token) {
            await supabase
                .from('users')
                .update({ fcm_token: fcm_token })
                .eq('id', user.id);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.id, 
                phone: user.phone,
                email: user.email 
            },
            'your-jwt-secret', // Use a secure secret
            { expiresIn: '30d' }
        );
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                first_name: user.first_name,
                last_name: user.last_name
            }
        });
        
    } catch (error) {
        console.error('Token generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send OTP
app.post('/wp-json/api/v1/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);
        
        // Store OTP in Supabase (with expiry)
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        
        const { error } = await supabase
            .from('otp_codes')
            .upsert([{
                phone_number: phoneNumber,
                otp_code: otp.toString(),
                expires_at: expiryTime.toISOString(),
                created_at: new Date().toISOString()
            }], { 
                onConflict: 'phone_number' 
            });
            
        if (error) {
            console.error('OTP storage error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to store OTP'
            });
        }
        
        // Send SMS via Twilio
        try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    From: TWILIO_PHONE,
                    To: phoneNumber,
                    Body: `Your ToyFlix OTP code is: ${otp}`
                })
            });
            
            if (response.ok) {
                res.json({
                    success: true,
                    message: 'OTP sent successfully'
                });
            } else {
                throw new Error('Twilio API error');
            }
            
        } catch (twilioError) {
            console.error('Twilio error:', twilioError);
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP'
            });
        }
        
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify OTP
app.post('/wp-json/api/v1/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        
        if (!phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }
        
        // Get OTP from Supabase
        const { data: otpRecords, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('otp_code', otp.toString())
            .gt('expires_at', new Date().toISOString())
            .limit(1);
            
        if (error) {
            console.error('OTP verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }
        
        if (!otpRecords || otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }
        
        // Delete used OTP
        await supabase
            .from('otp_codes')
            .delete()
            .eq('phone_number', phoneNumber);
            
        res.json({
            success: true,
            message: 'OTP verified successfully'
        });
        
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get products
app.get('/wp-json/api/v1/products', async (req, res) => {
    try {
        const { page = 1, per_page = 20, category, search } = req.query;
        const offset = (page - 1) * per_page;
        
        let query = supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .range(offset, offset + per_page - 1);
            
        if (category) {
            query = query.eq('category_id', category);
        }
        
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        
        const { data: products, error } = await query;
        
        if (error) {
            console.error('Products query error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }
        
        res.json({
            success: true,
            products: products || [],
            pagination: {
                page: parseInt(page),
                per_page: parseInt(per_page),
                total: products ? products.length : 0
            }
        });
        
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user profile
app.get('/wp-json/api/v1/user-profile/', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, first_name, last_name, pincode, created_at')
            .eq('id', decoded.user_id)
            .single();
            
        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: user
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Get subscription details
app.get('/wp-json/api/v1/subscription-details', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { data: subscriptions, error } = await supabase
            .from('subscriptions')
            .select(`
                *,
                subscription_plans (
                    name,
                    duration_months,
                    price
                )
            `)
            .eq('user_id', decoded.user_id)
            .eq('status', 'active');
            
        if (error) {
            console.error('Subscription query error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch subscriptions'
            });
        }
        
        res.json({
            success: true,
            subscriptions: subscriptions || []
        });
        
    } catch (error) {
        console.error('Get subscriptions error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Create order
app.post('/wp-json/api/v1/create-order', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization token required'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, 'your-jwt-secret');
        
        const { 
            products, 
            billing_address, 
            shipping_address, 
            payment_method,
            subscription_plan_id 
        } = req.body;
        
        // Calculate total
        let total = 0;
        const orderItems = [];
        
        for (const item of products) {
            const { data: product } = await supabase
                .from('products')
                .select('price')
                .eq('id', item.product_id)
                .single();
                
            if (product) {
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                orderItems.push({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: product.price,
                    total: itemTotal
                });
            }
        }
        
        // Create order
        const { data: order, error } = await supabase
            .from('orders')
            .insert([{
                user_id: decoded.user_id,
                total: total,
                status: 'pending',
                billing_address: billing_address,
                shipping_address: shipping_address,
                payment_method: payment_method,
                subscription_plan_id: subscription_plan_id,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) {
            console.error('Order creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create order'
            });
        }
        
        // Create order items
        const orderItemsWithOrderId = orderItems.map(item => ({
            ...item,
            order_id: order.id
        }));
        
        await supabase
            .from('order_items')
            .insert(orderItemsWithOrderId);
            
        res.json({
            success: true,
            message: 'Order created successfully',
            order: order
        });
        
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ============================================================================
// SUPABASE DATABASE SCHEMA SETUP
// ============================================================================

// Function to create necessary tables in Supabase
async function setupSupabaseTables() {
    console.log('Setting up Supabase tables...');
    
    // Note: You'll need to run these SQL commands in your Supabase SQL editor
    const sqlCommands = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255),
        phone VARCHAR(20) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        pincode VARCHAR(10),
        fcm_token TEXT,
        user_status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- OTP codes table
    CREATE TABLE IF NOT EXISTS otp_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Products table
    CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category_id UUID,
        age_group VARCHAR(50),
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Subscription plans table
    CREATE TABLE IF NOT EXISTS subscription_plans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration_months INTEGER NOT NULL,
        age_group VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Subscriptions table
    CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subscription_plan_id UUID REFERENCES subscription_plans(id),
        status VARCHAR(50) DEFAULT 'active',
        start_date DATE NOT NULL,
        end_date DATE,
        current_month INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        subscription_plan_id UUID REFERENCES subscription_plans(id),
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        billing_address JSONB,
        shipping_address JSONB,
        payment_method VARCHAR(100),
        estimated_delivery_date DATE,
        estimated_pickup_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id UUID REFERENCES orders(id),
        product_id UUID REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    `;
    
    console.log('Run these SQL commands in your Supabase SQL editor:');
    console.log(sqlCommands);
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Supabase API Bridge running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 WordPress API Compatible endpoints available`);
    
    // Show setup instructions
    setupSupabaseTables();
});

module.exports = app;
```

```json
{
  "name": "supabase-api-bridge",
  "version": "1.0.0",
  "description": "WordPress to Supabase API Bridge for ToyFlix mobile apps",
  "main": "supabase-api-bridge.js",
  "scripts": {
    "start": "node supabase-api-bridge.js",
    "dev": "nodemon supabase-api-bridge.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

```javascript
const { app } = require('@azure/functions');
const { createClient } = require('@supabase/supabase-js');

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.http('supabaseProxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    route: 'wp-json/{namespace}/{version}/{endpoint}',
    handler: async (request, context) => {
        const { namespace, version, endpoint } = request.params;
        const method = request.method;
        
        // Handle CORS
        if (method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
        }
        
        try {
            let result;
            
            // Route to appropriate Supabase operations
            if (namespace === 'api' && version === 'v1') {
                result = await handleMobileAPI(endpoint, request, supabase);
            } else if (namespace === 'custom' && version === 'v1') {
                result = await handleCustomAPI(endpoint, request, supabase);
            } else {
                result = { success: false, message: 'Endpoint not found' };
            }
            
            return {
                status: result.status || 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result)
            };
            
        } catch (error) {
            context.log('Proxy error:', error);
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Internal server error'
                })
            };
        }
    }
});

async function handleMobileAPI(endpoint, request, supabase) {
    const body = await request.json().catch(() => ({}));
    
    switch (endpoint) {
        case 'check-phone-exists/':
            return await checkPhoneExists(body.phone, supabase);
        case 'sign-up/':
            return await signUp(body, supabase);
        case 'generate-token/':
            return await generateToken(body, supabase);
        case 'products':
            return await getProducts(request.query, supabase);
        case 'user-profile/':
            return await getUserProfile(request.headers, supabase);
        default:
            return { success: false, message: 'Endpoint not implemented' };
    }
}

async function checkPhoneExists(phone, supabase) {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, phone, email, first_name, last_name')
        .eq('phone', phone)
        .limit(1);
        
    return {
        success: true,
        user_exists: users && users.length > 0,
        user: users && users.length > 0 ? users[0] : null
    };
}

// Add other handler functions...
```

```shellscript
# Install dependencies
npm install

# Update Supabase credentials in the code
# Deploy to your preferred platform (Heroku, Railway, etc.)
npm start
```

```shellscript
# Deploy the Azure Functions to your static web app
# Set environment variables for Supabase credentials
```

```json
{
  "routes": [
    {
      "route": "/wp-json/api/v1/*",
      "rewrite": "/api/supabase-proxy/api/v1/{params:0}"
    },
    {
      "route": "/wp-json/custom/v1/*", 
      "rewrite": "/api/supabase-proxy/custom/v1/{params:0}"
    }
  ]
}
```

```javascript
// Data migration script
const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');

async function migrateData() {
    // Connect to old MySQL database
    const mysqlConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'toyflix_user', 
        password: 'toyflixX1@@',
        database: 'toyflix'
    });
    
    // Connect to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Migrate users
    const [users] = await mysqlConnection.execute('SELECT * FROM wp_users');
    for (const user of users) {
        await supabase.from('users').insert({
            email: user.user_email,
            username: user.user_login,
            // Map other fields...
        });
    }
    
    // Migrate products, orders, etc.
}
```

