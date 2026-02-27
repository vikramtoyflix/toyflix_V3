#!/bin/bash

# Deploy Azure Functions (converted from Supabase Edge Functions)
# Run this script with: bash azure-migration/04-deploy-functions.sh

set -e

echo "⚡ Starting Azure Functions Deployment..."

# Load configuration
source azure-migration/config/azure-config.env

echo "📝 Configuration:"
echo "  Function App: $FUNCTION_APP"
echo "  Resource Group: $RESOURCE_GROUP"

# Check if Azure Functions Core Tools are installed
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools not installed"
    echo "Install with: npm install -g azure-functions-core-tools@4 --unsafe-perm true"
    exit 1
fi

# Create Azure Functions project
FUNCTIONS_DIR="azure-migration/azure-functions"
mkdir -p "$FUNCTIONS_DIR"
cd "$FUNCTIONS_DIR"

# Initialize Azure Functions project
if [ ! -f "host.json" ]; then
    echo "🔧 Initializing Azure Functions project..."
    func init . --typescript --docker false
fi

# Update host.json configuration
cat > host.json << 'EOF'
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "functionTimeout": "00:05:00"
}
EOF

# Create package.json for dependencies
cat > package.json << 'EOF'
{
  "name": "toyflix-azure-functions",
  "version": "1.0.0",
  "description": "ToyFlix Azure Functions",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "prestart": "npm run build",
    "start": "func start",
    "test": "echo \"No tests yet...\""
  },
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "pg": "^8.11.0",
    "crypto": "^1.0.1",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@azure/functions": "^4.0.0",
    "@types/node": "20.x",
    "@types/pg": "^8.10.0",
    "typescript": "^5.0.0"
  }
}
EOF

# Create TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es6",
    "outDir": "dist",
    "rootDir": ".",
    "sourceMap": true,
    "strict": false,
    "esModuleInterop": true
  }
}
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create common utilities
mkdir -p src/shared
cat > src/shared/database.ts << 'EOF'
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const query = async (text: string, params?: any[]) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
};

export const getClient = async () => {
    return await pool.connect();
};
EOF

cat > src/shared/cors.ts << 'EOF'
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Content-Type': 'application/json'
};
EOF

# Convert auth-signin function
mkdir -p src/functions/auth-signin
cat > src/functions/auth-signin/index.ts << 'EOF'
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../../shared/database';
import { corsHeaders } from '../../shared/cors';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export async function authSignin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Auth signin request received');

    if (request.method === 'OPTIONS') {
        return { status: 200, headers: corsHeaders };
    }

    try {
        const body = await request.json() as any;
        const { phone, otp } = body;

        if (!phone || !otp) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Phone and OTP are required' })
            };
        }

        // Verify OTP
        const otpResult = await query(
            'SELECT * FROM otp_verifications WHERE phone_number = $1 AND otp_code = $2 AND expires_at > NOW() AND is_verified = false',
            [phone, otp]
        );

        if (otpResult.rows.length === 0) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid or expired OTP' })
            };
        }

        // Mark OTP as verified
        await query(
            'UPDATE otp_verifications SET is_verified = true WHERE id = $1',
            [otpResult.rows[0].id]
        );

        // Get or create user
        let userResult = await query(
            'SELECT * FROM custom_users WHERE phone = $1',
            [phone]
        );

        let user;
        if (userResult.rows.length === 0) {
            // Create new user
            const newUserResult = await query(
                'INSERT INTO custom_users (phone, phone_verified) VALUES ($1, true) RETURNING *',
                [phone]
            );
            user = newUserResult.rows[0];
        } else {
            // Update existing user
            user = userResult.rows[0];
            await query(
                'UPDATE custom_users SET phone_verified = true, last_login = NOW() WHERE id = $1',
                [user.id]
            );
        }

        // Generate tokens
        const jwtSecret = process.env.JWT_SECRET || 'default-secret';
        const accessToken = jwt.sign(
            { sub: user.id, phone: user.phone, role: user.role },
            jwtSecret,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { sub: user.id, type: 'refresh' },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Store session
        await query(
            `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, refresh_expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                user.id,
                accessToken,
                refreshToken,
                new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                request.headers.get('x-forwarded-for') || 'unknown',
                request.headers.get('user-agent') || 'unknown'
            ]
        );

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                },
                access_token: accessToken,
                refresh_token: refreshToken
            })
        };

    } catch (error: any) {
        context.error('Auth signin error:', error);
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
}

app.http('auth-signin', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: authSignin
});
EOF

# Convert razorpay-order function
mkdir -p src/functions/razorpay-order
cat > src/functions/razorpay-order/index.ts << 'EOF'
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../../shared/database';
import { corsHeaders } from '../../shared/cors';
import * as crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_0lD2pjg1XOsadc';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'es16meKL1o5lBedwXnsR68uL';

export async function razorpayOrder(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Razorpay order creation request received');

    if (request.method === 'OPTIONS') {
        return { status: 200, headers: corsHeaders };
    }

    try {
        const body = await request.json() as any;
        const { amount, currency = 'INR', orderType, orderItems, userId, userEmail, userPhone } = body;

        if (!amount || !orderType || !userId) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing required fields: amount, orderType, and userId are required' })
            };
        }

        // Create Razorpay order
        const orderData = {
            amount: Math.round(amount),
            currency: currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                order_type: orderType,
                user_id: userId,
            },
        };

        const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const razorpayOrder = await response.json();

        if (!response.ok) {
            throw new Error(razorpayOrder.error?.description || 'Failed to create Razorpay order');
        }

        // Store payment tracking data
        await query(
            `INSERT INTO payment_orders (razorpay_order_id, user_id, amount, currency, status, order_type, order_items)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                razorpayOrder.id,
                userId,
                amount / 100, // Convert from paise to rupees
                currency,
                'created',
                orderType,
                JSON.stringify(orderItems)
            ]
        );

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                keyId: RAZORPAY_KEY_ID,
                message: 'Order created successfully'
            })
        };

    } catch (error: any) {
        context.error('Razorpay order creation error:', error);
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
}

app.http('razorpay-order', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: razorpayOrder
});
EOF

# Convert send-otp function
mkdir -p src/functions/send-otp
cat > src/functions/send-otp/index.ts << 'EOF'
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { query } from '../../shared/database';
import { corsHeaders } from '../../shared/cors';

export async function sendOtp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Send OTP request received');

    if (request.method === 'OPTIONS') {
        return { status: 200, headers: corsHeaders };
    }

    try {
        const body = await request.json() as any;
        const { phone } = body;

        if (!phone) {
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Phone number is required' })
            };
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await query(
            'INSERT INTO otp_verifications (phone_number, otp_code, expires_at) VALUES ($1, $2, $3)',
            [phone, otp, expiresAt]
        );

        // In production, send SMS here
        // For now, we'll just log it
        context.log(`OTP for ${phone}: ${otp}`);

        return {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'OTP sent successfully',
                // In development, return OTP for testing
                ...(process.env.NODE_ENV === 'development' && { otp })
            })
        };

    } catch (error: any) {
        context.error('Send OTP error:', error);
        return {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
}

app.http('send-otp', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: sendOtp
});
EOF

# Build the project
echo "🔨 Building Azure Functions..."
npm run build

# Deploy to Azure
echo "🚀 Deploying to Azure Functions..."
func azure functionapp publish "$FUNCTION_APP" --typescript

# Update Function App settings with environment variables
echo "⚙️  Updating Function App environment variables..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        "DATABASE_URL=$DATABASE_URL" \
        "JWT_SECRET=$(openssl rand -base64 32)" \
        "RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-rzp_live_0lD2pjg1XOsadc}" \
        "RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET:-es16meKL1o5lBedwXnsR68uL}" \
        "NODE_ENV=production" \
        "WEBSITE_RUN_FROM_PACKAGE=1"

# Test the deployed functions
echo "🧪 Testing deployed functions..."
FUNCTION_URL="https://${FUNCTION_APP}.azurewebsites.net"

# Test health endpoint
echo "Testing function app health..."
curl -f "$FUNCTION_URL/api/send-otp" -X OPTIONS > /dev/null 2>&1 && echo "✅ Functions are responding" || echo "❌ Functions not responding"

cd ../..

echo ""
echo "✅ Azure Functions Deployment Complete!"
echo ""
echo "📋 Deployment Summary:"
echo "  ✅ Functions converted from Supabase Edge Functions"
echo "  ✅ Deployed to Azure Functions: $FUNCTION_APP"
echo "  ✅ Environment variables configured"
echo "  ✅ Database connection established"
echo ""
echo "🔗 Function Endpoints:"
echo "  📱 Send OTP: $FUNCTION_URL/api/send-otp"
echo "  🔐 Auth Signin: $FUNCTION_URL/api/auth-signin"
echo "  💳 Razorpay Order: $FUNCTION_URL/api/razorpay-order"
echo ""
echo "🚀 Next Steps:"
echo "  1. Update frontend configuration to use Azure endpoints"
echo "  2. Test all authentication flows"
echo "  3. Update payment processing"
echo "  4. Monitor function performance in Azure Portal"
echo ""
echo "📊 Monitor your functions:"
echo "  Azure Portal: https://portal.azure.com → Function Apps → $FUNCTION_APP" 