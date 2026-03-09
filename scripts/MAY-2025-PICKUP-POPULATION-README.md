# 🚚 May 2025 Pickup Data Population Guide

This guide explains how to populate pickup data for all rental orders from May 2025 using the newly implemented pickup system.

## 📋 Overview

The pickup data population process includes:
- **21+ customers** with delivery dates from May 1-31, 2025
- **Automatic pickup scheduling** 30 days after delivery
- **Complete pickup workflow** integration
- **Phone number synchronization** from user profiles
- **Route optimization** and scheduling

## 🎯 What Gets Created

### 1. **Pickup Requests** (`pickup_requests` table)
- Individual pickup request for each May 2025 order
- Customer details and contact information
- Scheduled pickup dates (30 days after delivery)
- Special instructions from Excel notes

### 2. **Scheduled Pickups** (`scheduled_pickups` table)
- Pickup scheduling with time slots
- Route assignments for drivers
- Capacity management
- Duration estimates

### 3. **System Configuration** (`pickup_system_config` table)
- Pickup system settings
- Capacity limits and timing rules
- Notification preferences

## 🚀 Quick Start

### Prerequisites
1. **Supabase Environment Variables**:
   ```bash
   export VITE_SUPABASE_URL="your-supabase-project-url"
   export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

2. **Node.js** installed (for running the population script)

### One-Command Execution
```bash
cd toy-joy-box-club
./scripts/run-may-2025-pickup-population.sh
```

This script will:
1. ✅ Check environment variables
2. 📋 Guide you through SQL table setup
3. 📦 Install required dependencies
4. 🚚 Populate all May 2025 pickup data
5. 📊 Generate summary report

## 📁 Files Created

| File | Purpose |
|------|---------|
| `ensure-pickup-tables.sql` | Creates all pickup system tables |
| `populate-may-2025-pickup-data.js` | Main population script |
| `run-may-2025-pickup-population.sh` | One-click execution script |

## 👥 May 2025 Customers Included

The script processes 21+ customers with delivery dates from:
- **May 1-31, 2025**
- **Various subscription plans** (6-month Silver/Gold, 7-month plans)
- **Existing pickup notes** from Excel records
- **Phone number integration** from user profiles

### Sample Data Preview:
```
📅 2025-05-01: maitri sheth
📅 2025-05-05: swetha rajshekar, sinshu hegade  
📅 2025-05-06: ritika jindal (pickup completed on 26th mar)
📅 2025-05-08: priya jacob (picked on 28th)
📅 2025-05-09: ashwini anand, veena MC
📅 2025-05-12: chaya devi K
... and 15+ more customers
```

## 🔧 Manual Setup (Alternative)

If you prefer manual setup:

### 1. Create Tables
```sql
-- Execute in Supabase Dashboard → SQL Editor
\i scripts/ensure-pickup-tables.sql
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js
```

### 3. Run Population Script
```bash
node scripts/populate-may-2025-pickup-data.js
```

## 📊 Verification Queries

After population, run these queries in Supabase to verify:

### Check Pickup Requests
```sql
SELECT COUNT(*) as total_pickup_requests FROM pickup_requests;
```

### Check Scheduled Pickups
```sql
SELECT COUNT(*) as total_scheduled_pickups FROM scheduled_pickups;
```

### Pickup Schedule Overview
```sql
SELECT 
    pickup_date, 
    COUNT(*) as pickups_count,
    STRING_AGG(customer_name, ', ') as customers
FROM scheduled_pickups 
GROUP BY pickup_date 
ORDER BY pickup_date;
```

### Customer Phone Verification
```sql
SELECT 
    customer_name,
    customer_phone,
    pickup_date,
    status
FROM pickup_requests 
WHERE pickup_date >= '2025-06-01' 
ORDER BY pickup_date;
```

## 🎛️ System Configuration

The pickup system uses these default settings:

| Setting | Value | Description |
|---------|--------|-------------|
| `advance_notice_days` | 5 | Days advance notice for pickups |
| `max_daily_capacity` | 25 | Maximum pickups per day |
| `pickup_cycle_days` | 30 | Rental cycle length |
| `auto_schedule_enabled` | true | Enable automatic scheduling |
| `default_time_slot` | morning | Default pickup time |

## 🔄 Integration with Existing Systems

The populated data integrates with:

### ✅ **Pickup Management Service**
- Automatic scheduling functions
- Route optimization
- Capacity management
- Notification system

### ✅ **Dispatch System**
- UUID-based toy tracking
- Inventory management
- Return processing workflow

### ✅ **Return Workflow**
- Quality control integration
- Condition assessment
- Inventory restoration

## 📱 Next Steps After Population

1. **Verify Data**: Run verification queries above
2. **Test Notifications**: Send test pickup notifications
3. **Assign Drivers**: Assign drivers to pickup routes
4. **Route Optimization**: Optimize pickup routes by geography
5. **Monitor Capacity**: Track daily pickup capacity usage

## 🚨 Troubleshooting

### Common Issues:

**Environment Variables Not Set**
```bash
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-anon-key"
```

**Tables Don't Exist**
- Execute `ensure-pickup-tables.sql` in Supabase dashboard first

**Node Dependencies Missing**
```bash
npm install @supabase/supabase-js
```

**No Rental Orders Found**
- Check if `rental_orders` table has May 2025 data
- Verify user IDs match between customers and orders

## 📈 Expected Results

After successful execution:
- ✅ **21+ pickup requests** created
- ✅ **21+ scheduled pickups** created  
- ✅ **Customer phone numbers** synchronized
- ✅ **Pickup dates calculated** (June 1-30, 2025)
- ✅ **Route assignments** generated
- ✅ **System configuration** updated

## 🎉 Success Metrics

The script will report:
```
📊 POPULATION SUMMARY
====================================
✅ Rental Orders Processed: 21+
✅ Pickup Requests Created: 21+
✅ Scheduled Pickups Created: 21+
✅ Customers Processed: 21+

📅 PICKUP SCHEDULE OVERVIEW
====================================
📅 2025-06-01: 1 pickup(s)
📅 2025-06-02: 1 pickup(s)
📅 2025-06-05: 2 pickup(s)
... (all June 2025 dates)
```

---

## 🔗 Related Documentation

- [Priority 2 Implementation Guide](../docs/PRIORITY_2_IMPLEMENTATION.md)
- [Pickup Management Service](../src/services/pickupManagementService.ts)
- [Standardized Dispatch Service](../src/services/standardizedDispatchService.ts)
- [Complete Return Workflow](../src/services/completeReturnWorkflowService.ts)

---

**🎯 Goal**: Seamlessly populate pickup data for all May 2025 orders with complete workflow integration and automated scheduling. 