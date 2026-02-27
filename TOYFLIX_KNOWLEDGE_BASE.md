# 🎯 ToyFlix Platform - Comprehensive Knowledge Base

## 📋 Table of Contents
1. [Platform Overview](#platform-overview)
2. [Business Model](#business-model)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [User Flows & Journeys](#user-flows--journeys)
6. [Authentication System](#authentication-system)
7. [Payment Processing](#payment-processing)
8. [Subscription Management](#subscription-management)
9. [Inventory Management](#inventory-management)
10. [Admin Dashboard](#admin-dashboard)
11. [External Integrations](#external-integrations)
12. [Development Environment](#development-environment)
13. [Deployment Architecture](#deployment-architecture)
14. [Key Features](#key-features)
15. [Technical Stack](#technical-stack)

---

## 🎯 Platform Overview

**ToyFlix** is a subscription-based toy rental platform that allows parents to rent educational toys for their children on a monthly basis. The platform operates similar to Netflix but for toys - customers subscribe to plans, select toys appropriate for their child's age, receive them at home, and return them for new toys in the next cycle.

### Core Value Proposition
- **Educational Focus**: Curated toys for child development
- **Age-Appropriate**: Toys filtered by child's age group (1-2 years, 2-3 years, etc.)
- **Convenience**: Home delivery and pickup service
- **Cost-Effective**: Access to expensive toys without purchasing
- **Hygiene**: Professional cleaning and sanitization

---

## 💰 Business Model

### Subscription Plans
1. **Discovery Delight**: ₹1,299/month
   - 3 educational toys + 1 book
   - Monthly delivery cycle
   - Basic plan for new customers

2. **Silver Pack**: ₹5,999/6 months
   - 3 toys + 1 book + access to big toys
   - 6-month commitment
   - Better value proposition

3. **Gold Pack PRO**: ₹7,999/6 months
   - Premium toys with no age restrictions
   - Access to all toy categories
   - Highest tier with maximum flexibility

### Revenue Streams
- **Subscription Fees**: Primary revenue from monthly/6-monthly plans
- **GST**: 18% GST on all transactions
- **Late Return Fees**: Charges for toys not returned on time
- **Damage Fees**: Charges for damaged toys beyond normal wear

### Operational Model
- **30-Day Cycles**: Each subscription cycle lasts 30 days
- **Selection Window**: Days 24-34 of each cycle for next toy selection
- **Delivery & Pickup**: Coordinated logistics for toy exchange
- **Inventory Management**: Real-time tracking of toy availability

---

## 🏗️ System Architecture

### Frontend Architecture
```
React 18 + TypeScript + Vite
├── Pages (26 pages)
│   ├── Index.tsx (Landing page)
│   ├── Auth.tsx (Authentication)
│   ├── Dashboard.tsx (User dashboard)
│   ├── SubscriptionFlow.tsx (Subscription wizard)
│   ├── ToySelection.tsx (Toy selection interface)
│   ├── Admin.tsx (Admin panel)
│   └── ...
├── Components (19+ components)
│   ├── Auth components
│   ├── Admin components
│   ├── UI components (shadcn/ui)
│   └── Mobile components
├── Hooks (69+ custom hooks)
│   ├── Authentication hooks
│   ├── Data fetching hooks
│   ├── Subscription hooks
│   └── Inventory hooks
├── Services (46+ services)
│   ├── Supabase integration
│   ├── Payment processing
│   ├── Subscription management
│   └── External API services
└── Utils (16+ utilities)
    ├── Analytics
    ├── SEO optimization
    └── Helper functions
```

### Backend Architecture
```
Supabase (PostgreSQL) + Edge Functions
├── Database (43+ tables)
│   ├── Core tables (users, toys, orders)
│   ├── Subscription tables
│   ├── Payment tables
│   └── Admin tables
├── Edge Functions (26+ functions)
│   ├── Authentication functions
│   ├── Payment functions
│   ├── Notification functions
│   └── Integration functions
├── Real-time subscriptions
├── Row Level Security (RLS)
└── Database triggers & functions
```

---

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
- **`custom_users`**: Primary user table with profile information
- **`user_sessions`**: Session management for authentication
- **`otp_verifications`**: OTP-based phone verification
- **`user_permission_roles`**: Role-based access control
- **`user_role_assignments`**: User-role mappings

#### Toys & Inventory
- **`toys`**: Main toy catalog with inventory tracking
- **`toy_inventory`**: Detailed inventory management
- **`toy_images`**: Toy image management
- **`toys_1_2_years`, `toys_2_3_years`, etc.**: Age-specific toy tables
- **`categories`**: Toy categorization
- **`inventory_movements`**: Audit trail for inventory changes

#### Orders & Subscriptions
- **`orders`**: Order management
- **`order_items`**: Individual toy selections per order
- **`rental_orders`**: Rental-specific order data
- **`subscriptions`**: Subscription records
- **`subscription_cycles`**: Cycle management
- **`user_entitlements`**: Monthly toy allowances

#### Payments
- **`payment_orders`**: Payment transaction records
- **`payment_tracking`**: Payment status tracking
- **`billing_records`**: Billing history

#### Admin & Management
- **`admin_audit_logs`**: Admin action tracking
- **`pickup_routes`**: Delivery route management
- **`scheduled_pickups`**: Pickup scheduling
- **`notification_logs`**: Communication tracking

### Key Relationships
```sql
custom_users (1) → (M) subscriptions
subscriptions (1) → (M) subscription_cycles
subscription_cycles (1) → (M) orders
orders (1) → (M) order_items
order_items (M) → (1) toys
toys (1) → (1) toy_inventory
```

### Order System Architecture

#### **Order Types**
The ToyFlix platform supports multiple order types to handle different business scenarios:

1. **`subscription`** - Regular subscription orders (most common)
   - Monthly Discovery Delight orders
   - 6-month Silver Pack and Gold Pack PRO orders
   - Recurring subscription cycles with toy selection

2. **`one_time`** - Single purchase orders
   - Non-recurring toy rentals
   - Special occasion orders
   - Gift orders without subscription

3. **`trial`** - Trial subscription orders
   - Free or discounted trial periods
   - New customer onboarding
   - Limited-time promotional offers

4. **`ride_on`** - Premium ride-on toy orders
   - High-value ride-on toys (bikes, cars, etc.)
   - Special pricing and handling
   - Extended rental periods

#### **Order Tables**

1. **`rental_orders`** - Main order table
   - Primary order management system
   - Handles all order types above
   - Complete order lifecycle tracking
   - Legacy WooCommerce order migration

2. **`queue_orders`** - Subscription modification orders
   - Next cycle toy selections
   - Mid-cycle toy changes
   - Emergency queue modifications
   - Separate from main orders for better tracking
   
   **Queue Order Types:**
   - `next_cycle` - Selection for next delivery cycle
   - `modification` - Modification of existing queue
   - `emergency_change` - Emergency queue change

3. **`orders`** - Legacy order table (being phased out)
   - Original order system
   - Being migrated to rental_orders
   - Maintained for backward compatibility

#### **Order Statuses**
Orders progress through multiple status stages:

**Primary Statuses:**
- `pending` - Order created, awaiting confirmation
- `confirmed` - Order confirmed, payment processed
- `processing` - Order being prepared for shipment
- `packed` - Toys packed, ready for dispatch
- `shipped` - Order dispatched to customer
- `out_for_delivery` - Order out for delivery
- `delivered` - Order successfully delivered
- `active` - Subscription order currently active
- `returned` - Toys returned by customer
- `completed` - Order lifecycle completed
- `cancelled` - Order cancelled
- `refunded` - Order refunded

**Queue Order Statuses:**
- `processing` - Queue order being processed
- `confirmed` - Queue selection confirmed
- `preparing` - Toys being prepared
- `shipped` - Queue order shipped
- `delivered` - Queue order delivered
- `cancelled` - Queue order cancelled

#### **Payment Statuses**
- `pending` - Payment not yet processed
- `processing` - Payment being processed
- `completed` - Payment successful
- `paid` - Payment confirmed
- `failed` - Payment failed
- `cancelled` - Payment cancelled
- `refunded` - Payment refunded
- `partially_refunded` - Partial refund processed

#### **Return Statuses**
- `not_returned` - Toys not yet returned
- `pending` - Return in progress
- `partial` - Some toys returned
- `complete` - All toys returned
- `overdue` - Return overdue
- `lost` - Toys reported lost
- `damaged` - Toys returned damaged

#### **Delivery Statuses**
- `pending` - Delivery not yet assigned
- `assigned` - Delivery assigned to driver
- `picked_up` - Order picked up from warehouse
- `in_transit` - Order in transit to customer
- `out_for_delivery` - Order out for final delivery
- `delivered` - Order successfully delivered
- `failed` - Delivery failed
- `returned` - Order returned to warehouse

#### **Order Management Features**
- **Cycle Management**: 30-day rental cycles with automatic progression
- **Selection Windows**: Days 24-34 for next cycle toy selection
- **Inventory Integration**: Real-time inventory deduction on order confirmation
- **Payment Integration**: Razorpay payment gateway with multiple methods
- **Delivery Tracking**: Complete delivery lifecycle management
- **Return Processing**: Automated return handling and inventory restoration
- **Admin Controls**: Comprehensive admin tools for order management

---

## 🚶 User Flows & Journeys

### New User Registration Flow
1. **Landing Page** (`/`) → User discovers ToyFlix
2. **Pricing Page** (`/pricing`) → User selects subscription plan
3. **Authentication** (`/auth`) → Phone OTP verification
4. **Profile Completion** → Name, email, address collection
5. **Subscription Flow** (`/subscription-flow`) → Plan confirmation
6. **Toy Selection** (`/select-toys`) → Age group & toy selection
7. **Payment** → Razorpay integration
8. **Confirmation** (`/confirmation-success`) → Order confirmation
9. **Dashboard** (`/dashboard`) → User dashboard access

### Existing User Login Flow
1. **Authentication** (`/auth`) → Phone number entry
2. **OTP Verification** → SMS OTP verification
3. **Dashboard Redirect** → Automatic redirect to dashboard
4. **Subscription Management** → View current subscription
5. **Toy Selection** (if in selection window) → Select next cycle toys

### Subscription Cycle Flow
1. **Cycle Start** (Day 1) → New 30-day cycle begins
2. **Toy Delivery** (Days 1-7) → Current toys delivered
3. **Usage Period** (Days 8-23) → Customer uses toys
4. **Selection Window** (Days 24-34) → Select next cycle toys
5. **Pickup Scheduling** (Days 28-30) → Schedule toy return
6. **Cycle End** (Day 30) → Cycle completes, new cycle starts

### Admin Management Flow
1. **Admin Login** → Role-based authentication
2. **Dashboard Overview** → Key metrics and alerts
3. **User Management** → Customer administration
4. **Inventory Management** → Toy stock management
5. **Order Processing** → Order fulfillment
6. **Analytics** → Business intelligence

---

## 🔐 Authentication System

### Phone-Based Authentication
- **Primary Method**: Phone number + OTP
- **OTP Provider**: 2Factor API integration
- **Session Management**: JWT tokens with refresh mechanism
- **Multi-Format Support**: Handles +91, 91, and plain number formats

### User Roles
- **`user`**: Regular customers (default)
- **`admin`**: Administrative access
- **Role-Based Permissions**: Granular permission system

### Security Features
- **Session Expiration**: 4-hour session timeout
- **Refresh Tokens**: Automatic token refresh
- **Device Tracking**: Device information logging
- **IP Tracking**: IP address logging for security
- **Rate Limiting**: OTP request rate limiting

### Authentication Flow
```typescript
// Phone OTP Flow
1. sendOTP(phone) → 2Factor API → SMS sent
2. verifyOTP(phone, otp) → Verification → JWT token
3. Session creation → Database session record
4. Auto-refresh → Token refresh before expiry
```

---

## 💳 Payment Processing

### Razorpay Integration
- **Gateway**: Razorpay payment gateway
- **Supported Methods**: Cards, UPI, Net Banking, Wallets
- **Currency**: INR (Indian Rupees)
- **GST Calculation**: Automatic 18% GST addition

### Payment Flow
1. **Order Creation** → Create Razorpay order
2. **Payment Interface** → Razorpay checkout modal
3. **Payment Processing** → Customer completes payment
4. **Signature Verification** → Server-side verification
5. **Order Confirmation** → Database updates
6. **Subscription Activation** → Entitlements creation

### Payment Tables
- **`payment_orders`**: Payment transaction records
- **`payment_tracking`**: Detailed payment tracking
- **`billing_records`**: Subscription billing history

### Security
- **Signature Verification**: HMAC SHA256 signature validation
- **Webhook Handling**: Razorpay webhook processing
- **PCI Compliance**: No card data storage

---

## 📅 Subscription Management

### Cycle Management
- **Cycle Duration**: 30 days per cycle
- **Selection Window**: Days 24-34 for next toy selection
- **Auto-Close**: Selection window auto-closes after day 34
- **Manual Control**: Admin can manually open/close selection windows

### Subscription States
- **`active`**: Normal subscription state
- **`paused`**: Temporarily paused subscription
- **`cancelled`**: Cancelled subscription
- **`expired`**: Expired subscription

### Entitlements System
```typescript
interface UserEntitlements {
  standard_toys_remaining: number;
  big_toys_remaining: number;
  books_remaining: number;
  premium_toys_remaining: number;
  value_cap_remaining: number;
  early_access: boolean;
  reservation_enabled: boolean;
}
```

### Subscription Operations
- **Plan Changes**: Upgrade/downgrade plans
- **Pause/Resume**: Temporary subscription pausing
- **Extensions**: Add free days/months
- **Cancellations**: Subscription termination

---

## 📦 Inventory Management

### Inventory Tracking
- **Real-Time Updates**: Live inventory tracking
- **Multi-Status Tracking**: Available, rented, reserved, damaged
- **Age-Specific Tables**: Separate tables for different age groups
- **Automatic Deduction**: Inventory reduced on order confirmation

### Inventory States
- **`available_quantity`**: Ready for rental
- **`rented_quantity`**: Currently with customers
- **`total_quantity`**: Total inventory count
- **`reorder_level`**: Minimum stock threshold

### Inventory Operations
- **Stock Adjustments**: Manual inventory updates
- **Damage Tracking**: Track damaged toys
- **Reorder Alerts**: Low stock notifications
- **Movement Logging**: Complete audit trail

### Automation Features
- **Order Integration**: Automatic inventory deduction on orders
- **Return Processing**: Automatic inventory restoration on returns
- **Status-Based Logic**: Different actions for different order statuses
- **Overselling Prevention**: Prevents negative inventory

---

## 👨‍💼 Admin Dashboard

### Dashboard Categories
1. **Dashboard**: Overview, analytics, order dashboard
2. **User Management**: Customer administration, role management
3. **Inventory Management**: Stock control, movements, alerts
4. **Order Management**: Order processing, tracking
5. **Subscription Management**: Subscription administration
6. **Pickup Management**: Delivery route management
7. **System Management**: Settings, integrations

### Key Features
- **Real-Time Analytics**: Live business metrics
- **User Impersonation**: Admin can switch to user view
- **Bulk Operations**: Mass updates and operations
- **Advanced Filtering**: Complex data filtering
- **Export Capabilities**: Data export functionality
- **Audit Trails**: Complete action logging

### Admin Tools
- **Inventory Dashboard**: Stock management interface
- **Order Processing**: Order fulfillment tools
- **Customer Support**: User management tools
- **Analytics**: Business intelligence dashboard
- **System Monitoring**: Health checks and alerts

---

## 🔗 External Integrations

### Payment Gateway
- **Razorpay**: Primary payment processor
- **API Keys**: Live and test environment keys
- **Webhooks**: Payment status updates
- **Signature Verification**: Security validation

### SMS/OTP Services
- **2Factor**: OTP delivery service
- **WhatsApp Business API**: Customer communication
- **SMS Gateway**: Backup SMS service

### CRM Integration
- **Freshworks CRM**: Customer relationship management
- **Contact Sync**: Automatic contact creation
- **Lifecycle Tracking**: Customer journey tracking
- **Communication History**: Interaction logging

### Analytics & Tracking
- **Google Analytics**: Web analytics
- **Google Tag Manager**: Tag management
- **Meta Pixel**: Facebook advertising pixel
- **Core Web Vitals**: Performance monitoring

### Cloud Services
- **Supabase**: Backend-as-a-Service
- **Azure Static Web Apps**: Frontend hosting
- **Azure Functions**: Serverless functions
- **Azure VM**: Legacy database hosting

---

## 🛠️ Development Environment

### Local Development Setup
```bash
# Prerequisites
Node.js 18+
npm or yarn
Git

# Installation
git clone <repository>
cd toy-joy-box-club
npm install

# Environment Variables
cp .env.example .env.local
# Configure Supabase, Razorpay, and other API keys

# Development Server
npm run dev
# Runs on http://localhost:5173
```

### Environment Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://wucwpyitzqjukcphczhr.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase_anon_key>

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=<razorpay_key_id>

# Feature Flags
VITE_ENHANCED_USER_MANAGEMENT=true
VITE_SUBSCRIPTION_MANAGEMENT=true
VITE_PROMOTIONAL_OFFERS=true

# Analytics
VITE_GA_MEASUREMENT_ID=<google_analytics_id>
VITE_GTM_ID=<google_tag_manager_id>
```

### Development Tools
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first CSS
- **shadcn/ui**: Component library

---

## 🚀 Deployment Architecture

### Production Environment
```
Azure Static Web Apps (Frontend)
├── React Application
├── Built-in API Routes
└── Environment Variables

Supabase (Backend)
├── PostgreSQL Database
├── Edge Functions
├── Real-time Subscriptions
└── Authentication

Azure VM (Legacy)
├── WordPress Database
├── WooCommerce Data
└── Migration Support
```

### Deployment Process
1. **Build**: `npm run build` creates production build
2. **Deploy**: GitHub Actions deploys to Azure Static Web Apps
3. **API Routes**: Azure Functions handle API requests
4. **Database**: Supabase manages all data operations
5. **CDN**: Global content delivery network

### Environment-Specific Features
- **Development**: Direct API calls to localhost
- **Production**: API routes through Static Web App
- **Staging**: Separate environment for testing
- **CORS Handling**: Environment-specific CORS configuration

---

## ✨ Key Features

### Customer Features
- **Phone-Based Registration**: Simple OTP-based signup
- **Age-Appropriate Toys**: Filtered by child's age
- **Subscription Management**: Plan changes, pausing, cancellation
- **Toy Selection**: Interactive toy selection wizard
- **Order Tracking**: Real-time order status updates
- **Payment Integration**: Secure payment processing
- **Mobile Responsive**: Optimized for mobile devices

### Admin Features
- **Comprehensive Dashboard**: Business overview and analytics
- **User Management**: Customer administration tools
- **Inventory Control**: Real-time stock management
- **Order Processing**: Order fulfillment workflow
- **Pickup Management**: Delivery route optimization
- **Analytics**: Business intelligence and reporting
- **Bulk Operations**: Mass data operations

### Technical Features
- **Real-Time Updates**: Live data synchronization
- **Offline Support**: Service worker implementation
- **SEO Optimization**: Search engine optimization
- **Performance Monitoring**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error logging
- **Security**: Role-based access control

---

## 🔧 Technical Stack

### Frontend Stack
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern component library
- **React Query**: Data fetching and caching
- **React Router**: Client-side routing
- **React Hook Form**: Form management

### Backend Stack
- **Supabase**: Backend-as-a-Service
- **PostgreSQL**: Primary database
- **Edge Functions**: Serverless functions
- **Real-time**: WebSocket connections
- **Row Level Security**: Database security

### DevOps & Deployment
- **Azure Static Web Apps**: Frontend hosting
- **Azure Functions**: Serverless API
- **GitHub Actions**: CI/CD pipeline
- **Supabase CLI**: Database management
- **npm/yarn**: Package management

### External Services
- **Razorpay**: Payment processing
- **2Factor**: SMS/OTP service
- **Freshworks**: CRM integration
- **Google Analytics**: Web analytics
- **WhatsApp Business**: Customer communication

---

## 📚 Additional Resources

### Documentation Files
- `docs/SUBSCRIPTION_FLOW_STATUS.md`: Subscription flow documentation
- `docs/HYBRID_WOOCOMMERCE_APPROACH.md`: Legacy integration approach
- `INVENTORY_MANAGEMENT_SYSTEM_COMPLETE.md`: Inventory system details
- `FRESHWORKS_INTEGRATION_GUIDE.md`: CRM integration guide
- `AZURE_DEPLOYMENT_GUIDE.md`: Deployment instructions

### Database Files
- `database_schema.sql`: Complete database schema
- `supabase/migrations/`: Database migration files
- `scripts/`: Database utility scripts

### Configuration Files
- `src/config/`: Application configuration
- `src/constants/`: Application constants
- `.env.example`: Environment variable template

---

## 🎯 Business Context for AI Agents

When working with this codebase, AI agents should understand:

1. **Business Priority**: Customer experience and subscription retention
2. **Data Sensitivity**: Handle customer data with privacy compliance
3. **Financial Transactions**: Payment processing requires careful validation
4. **Inventory Accuracy**: Stock levels must be precisely maintained
5. **Subscription Logic**: Complex cycle management with timing dependencies
6. **Mobile-First**: Majority of users access via mobile devices
7. **Indian Market**: Localized for Indian customers (INR, phone formats)
8. **Family-Focused**: Child safety and educational value are paramount

### Common Development Patterns
- **Service Layer**: Business logic in service classes
- **Hook Pattern**: Custom React hooks for data operations
- **Type Safety**: Comprehensive TypeScript usage
- **Error Handling**: Graceful error handling with user feedback
- **Loading States**: Proper loading indicators for async operations
- **Responsive Design**: Mobile-first responsive design
- **Performance**: Optimized for fast loading and smooth interactions

This knowledge base provides comprehensive context for AI agents to understand and work effectively with the ToyFlix platform codebase.
