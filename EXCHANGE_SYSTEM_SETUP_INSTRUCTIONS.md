# 🚀 ToyFlix Exchange System Setup Instructions

## 📋 Quick Setup Guide

Follow these steps to set up and populate the intelligent dispatch & pickup system:

### **Step 1: Database Setup**
Run the database schema in Supabase SQL Editor:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/wucwpyitzqjukcphczhr
2. **Click "SQL Editor"** in the left sidebar
3. **Copy and paste the entire script** from [`sql_migrations/toy_exchange_system_schema.sql`](sql_migrations/toy_exchange_system_schema.sql)
4. **Click "Run"** - This creates all necessary tables, functions, and triggers

### **Step 2: Populate Exchange Operations**
Run the population script to create exchange operations from existing orders:

```bash
# Set your Supabase service key (get from Supabase Dashboard → Settings → API)
export SUPABASE_SERVICE_KEY="your-supabase-service-key-here"

# Run the population script
node scripts/populate-exchange-operations.js
```

**What this script does:**
- ✅ Fetches rental orders from last 30 days
- ✅ Analyzes each order and determines exchange type (EXCHANGE/PICKUP_ONLY/DISPATCH_ONLY/FIRST_DELIVERY)
- ✅ Creates exchange operations with realistic scheduling
- ✅ Sets up pincode-day assignments
- ✅ Creates capacity management records
- ✅ Populates sample data if no orders exist

### **Step 3: Access Admin Interface**
1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to Admin Panel**:
   - Go to: http://localhost:8082/admin
   - Sign in with admin credentials
   - Navigate to: **Orders & Subscriptions** → **Exchange Management**

### **Step 4: Configure Pincode Assignments**
1. **Go to**: **Orders & Subscriptions** → **Pincode Management**
2. **Add your service pincodes** with day assignments
3. **Configure capacity limits** for each area
4. **Organize by zones** (North, South, East, West, Central Bangalore)

## 🎯 System Features

### **Exchange Management Dashboard**
- **Day-wise Operations**: View all exchanges organized by service day
- **Real-time Statistics**: Live counts of exchanges, pickups, dispatches
- **Status Management**: Update operation status with one click
- **Detailed Views**: Complete exchange information and toy details
- **Bulk Operations**: Process multiple exchanges efficiently

### **Subscription Plan Support**
- **Discovery Delight**: Monthly toy exchanges (4 toys)
- **Silver Pack**: 6-month plan with pause/resume (pickup-only/dispatch-only)
- **Gold Pack PRO**: Premium 6-month plan with pause/resume
- **Ride-On Pack**: Monthly ride-on toy rental

### **Operation Types**
- **🔄 EXCHANGE**: Pickup old toys + Dispatch new toys (same visit)
- **📦 PICKUP_ONLY**: Collect toys for subscription pause
- **🚚 DISPATCH_ONLY**: Deliver toys for subscription resume/first orders
- **🎁 FIRST_DELIVERY**: Initial delivery for new customers

### **Intelligent Features**
- **Auto-Classification**: Orders automatically classified as SUB/QU/REGULAR
- **Smart Scheduling**: Operations scheduled based on pincode-day assignments
- **Capacity Management**: Prevents overbooking with time slot management
- **Workflow Integration**: Seamless integration with existing order lifecycle

## 🔧 Troubleshooting

### **No Operations Showing?**
1. **Check Database**: Ensure the SQL schema was executed successfully
2. **Run Population Script**: Execute the populate script to create operations from existing orders
3. **Check Date Filter**: Make sure you're viewing the correct day/date
4. **Verify Orders**: Ensure you have rental orders in the system

### **Pincode Not Assigned?**
1. **Go to Pincode Management**: Add pincode-day assignments
2. **Default Assignment**: System defaults to Monday if pincode not found
3. **Bulk Import**: Use the bulk import feature for multiple pincodes

### **Service Key Issues?**
1. **Get Service Key**: Supabase Dashboard → Settings → API → service_role key
2. **Set Environment Variable**: `export SUPABASE_SERVICE_KEY="your-key"`
3. **Check Permissions**: Ensure service key has admin permissions

## 📊 Sample Data

If you don't have existing orders, the script will create sample exchange operations:
- **Monday**: Exchange operation (Silver Pack customer)
- **Tuesday**: Pickup-only operation (Gold Pack pause)
- **Wednesday**: Dispatch-only operation (Silver Pack resume)
- **Thursday**: First delivery (Discovery Delight new customer)

## 🎉 System Ready

Once setup is complete, you'll have:
- ✅ **Intelligent exchange operations** populated from real order data
- ✅ **Day-wise organization** with pincode-based routing
- ✅ **Complete CRUD interface** for admin team
- ✅ **Pause/resume workflows** for Silver/Gold plans
- ✅ **Bulk operations** for efficient management
- ✅ **Real-time dashboard** with live statistics

The system is now ready to handle your toy rental dispatch and pickup operations with intelligent automation and efficient admin interfaces!