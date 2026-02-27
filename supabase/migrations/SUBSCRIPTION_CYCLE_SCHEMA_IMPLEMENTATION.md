# Subscription Cycle Tracking Schema Implementation

## Overview

This document describes the implementation of subscription cycle tracking schema that provides proper subscription-based toy selection, delivery tracking, and billing alignment.

## Schema Changes Implemented

### 1. Enhanced Subscriptions Table

**New Fields Added:**
```sql
ALTER TABLE public.subscriptions ADD COLUMN:
- cycle_start_date DATE                    -- When current cycle began
- cycle_end_date DATE                      -- When current cycle ends  
- cycle_number INTEGER DEFAULT 1           -- Sequential cycle count since start
- last_selection_date TIMESTAMP            -- When user last selected toys
- next_selection_window_start DATE         -- When next selection opens
- next_selection_window_end DATE           -- When next selection closes
- subscription_start_date DATE             -- Original subscription start
- total_cycles_completed INTEGER DEFAULT 0 -- Total completed cycles
- current_cycle_status TEXT DEFAULT 'active' -- Current cycle status
```

### 2. New Subscription Cycles Table

**Complete cycle history tracking:**
```sql
CREATE TABLE public.subscription_cycles (
    id UUID PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id),
    user_id UUID REFERENCES custom_users(id),
    
    -- Cycle identification
    cycle_number INTEGER NOT NULL,
    cycle_start_date DATE NOT NULL,
    cycle_end_date DATE NOT NULL,
    
    -- Selection window tracking
    selection_window_start DATE NOT NULL,
    selection_window_end DATE NOT NULL,
    selection_opened_at TIMESTAMP WITH TIME ZONE,
    selection_closed_at TIMESTAMP WITH TIME ZONE,
    toys_selected_at TIMESTAMP WITH TIME ZONE,
    
    -- Cycle data
    selected_toys JSONB DEFAULT '[]',
    toys_count INTEGER DEFAULT 0,
    total_toy_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Delivery tracking
    delivery_scheduled_date DATE,
    delivery_actual_date DATE,
    delivery_status TEXT DEFAULT 'pending',
    tracking_number TEXT,
    delivery_address JSONB,
    
    -- Status and completion
    cycle_status TEXT DEFAULT 'upcoming',
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing alignment
    billing_cycle_id TEXT,
    billing_amount DECIMAL(10,2),
    billing_status TEXT DEFAULT 'pending',
    
    -- Plan snapshot
    plan_id_at_cycle TEXT NOT NULL,
    plan_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(subscription_id, cycle_number)
);
```

### 3. Enhanced Queue Orders Table

**New subscription cycle alignment fields:**
```sql
ALTER TABLE public.queue_orders ADD COLUMN:
- subscription_cycle_id UUID REFERENCES subscription_cycles(id)
- subscription_cycle_number INTEGER
- cycle_based_delivery_date DATE  
- subscription_aligned BOOLEAN DEFAULT FALSE
```

## Database Views Created

### 1. Current Cycle Status View
```sql
CREATE VIEW subscription_current_cycle AS
SELECT 
    subscription_id,
    user_id,
    current_cycle_number,
    cycle_progress_percentage,
    current_day_in_cycle,
    days_remaining_in_cycle,
    selection_window_status,
    days_to_selection_window,
    total_days_subscribed
FROM subscriptions 
WHERE status IN ('active', 'paused');
```

### 2. Cycle History View
```sql
CREATE VIEW subscription_cycle_history AS
SELECT 
    cycle_id,
    subscription_id,
    cycle_number,
    cycle_duration_days,
    selection_window_duration,
    delivery_delay_days,
    cycle_completion_days,
    toys_count,
    total_toy_value
FROM subscription_cycles
ORDER BY cycle_number DESC;
```

### 3. Upcoming Cycles View
```sql
CREATE VIEW subscription_upcoming_cycles AS
SELECT 
    subscription_id,
    future_cycle_number,
    future_cycle_start,
    future_cycle_end,
    future_selection_start,
    future_selection_end,
    estimated_delivery_date
FROM subscriptions
WHERE status = 'active';
```

### 4. Selection Windows View
```sql
CREATE VIEW subscription_selection_windows AS
SELECT 
    subscription_id,
    cycle_number,
    selection_window_start,
    selection_window_end,
    window_status,
    days_until_opens,
    days_until_closes,
    days_to_select
FROM subscription_cycles
WHERE cycle_status IN ('upcoming', 'active', 'selection_open');
```

## Functions Created

### 1. Create Subscription Cycle
```sql
SELECT public.create_subscription_cycle(
    p_subscription_id UUID,
    p_cycle_number INTEGER DEFAULT NULL
) RETURNS UUID;
```

### 2. Update Cycle Status
```sql
SELECT public.update_cycle_status(
    p_cycle_id UUID,
    p_new_status TEXT
) RETURNS BOOLEAN;
```

### 3. Record Toy Selection
```sql
SELECT public.record_cycle_toy_selection(
    p_cycle_id UUID,
    p_selected_toys JSONB,
    p_total_value DECIMAL DEFAULT 0.00
) RETURNS BOOLEAN;
```

## Usage Examples

### 1. Get Current Cycle Information
```sql
-- Get current cycle status for a user
SELECT * FROM subscription_current_cycle 
WHERE user_id = 'user-uuid-here';

-- Check if selection window is open
SELECT 
    cycle_number,
    selection_window_status,
    days_to_selection_window
FROM subscription_current_cycle 
WHERE user_id = 'user-uuid-here'
AND selection_window_status = 'open';
```

### 2. Create New Cycle
```sql
-- Create next cycle for a subscription
SELECT create_subscription_cycle('subscription-uuid-here');

-- Create specific cycle number
SELECT create_subscription_cycle('subscription-uuid-here', 5);
```

### 3. Record Toy Selection
```sql
-- Record toys selected for a cycle
SELECT record_cycle_toy_selection(
    'cycle-uuid-here',
    '[
        {"toy_id": "toy1-uuid", "name": "Learning Blocks", "price": 299.00},
        {"toy_id": "toy2-uuid", "name": "Musical Piano", "price": 599.00}
    ]'::jsonb,
    898.00
);
```

### 4. Track Delivery
```sql
-- Update delivery status
UPDATE subscription_cycles 
SET 
    delivery_status = 'shipped',
    tracking_number = 'TRK123456789',
    updated_at = NOW()
WHERE id = 'cycle-uuid-here';

-- Record actual delivery
UPDATE subscription_cycles 
SET 
    delivery_status = 'delivered',
    delivery_actual_date = CURRENT_DATE,
    cycle_status = 'completed',
    completed_at = NOW()
WHERE id = 'cycle-uuid-here';
```

### 5. Get Cycle History
```sql
-- Get user's complete cycle history
SELECT 
    cycle_number,
    cycle_start_date,
    cycle_end_date,
    toys_count,
    delivery_status,
    cycle_completion_days
FROM subscription_cycle_history 
WHERE user_id = 'user-uuid-here'
ORDER BY cycle_number DESC;
```

### 6. Upcoming Cycles Planning
```sql
-- Get next 3 upcoming cycles
SELECT 
    future_cycle_number,
    future_cycle_start,
    future_selection_start,
    estimated_delivery_date
FROM subscription_upcoming_cycles 
WHERE subscription_id = 'subscription-uuid-here'
LIMIT 3;
```

## Integration with Frontend Components

### 1. SubscriptionTimeline Component
```typescript
// The SubscriptionTimeline component uses these views:
const { data: cycleData } = useQuery({
    queryKey: ['subscription-cycles', userId],
    queryFn: () => supabase
        .from('subscription_cycle_history')
        .select('*')
        .eq('user_id', userId)
        .order('cycle_number', { ascending: false })
});
```

### 2. Selection Window Logic
```typescript
// Check current selection window status:
const { data: currentCycle } = useQuery({
    queryKey: ['current-cycle', userId],
    queryFn: () => supabase
        .from('subscription_current_cycle')
        .select('*')
        .eq('user_id', userId)
        .single()
});

const canSelectToys = currentCycle?.selection_window_status === 'open';
```

### 3. Queue Orders Integration
```sql
-- Link queue orders to subscription cycles
INSERT INTO queue_orders (
    user_id,
    subscription_cycle_id,
    subscription_cycle_number,
    selected_toys,
    cycle_based_delivery_date,
    subscription_aligned
) VALUES (
    'user-uuid',
    'cycle-uuid',
    5,
    '[{"toy_id": "toy1"}]'::jsonb,
    '2025-02-15',
    true
);
```

## Performance Considerations

### Indexes Created
```sql
-- Critical indexes for performance
CREATE INDEX idx_subscription_cycles_subscription_id ON subscription_cycles(subscription_id);
CREATE INDEX idx_subscription_cycles_user_id ON subscription_cycles(user_id);
CREATE INDEX idx_subscription_cycles_cycle_dates ON subscription_cycles(cycle_start_date, cycle_end_date);
CREATE INDEX idx_subscription_cycles_selection_window ON subscription_cycles(selection_window_start, selection_window_end);
CREATE INDEX idx_subscription_cycles_status ON subscription_cycles(cycle_status);
```

### Query Optimization
- Views use efficient date calculations
- Indexes support common query patterns
- JSONB fields indexed for toy data queries
- Foreign key relationships properly indexed

## Migration Benefits

### 1. Accurate Cycle Tracking
- Real subscription-based cycle calculation
- Proper selection window timing
- Historical cycle data retention

### 2. Better User Experience
- Accurate progress tracking
- Reliable selection window notifications
- Complete subscription timeline visibility

### 3. Operational Improvements
- Delivery tracking per cycle
- Billing alignment capabilities
- Performance metrics and analytics

### 4. Data Integrity
- Proper foreign key relationships
- Comprehensive audit trails
- Consistent data models

## Security & Permissions

### Row Level Security (RLS)
```sql
-- Users can only see their own cycles
CREATE POLICY "Users can view own subscription cycles" 
ON subscription_cycles FOR SELECT 
USING (user_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role manages subscription cycles" 
ON subscription_cycles FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');
```

### API Access
- Authenticated users: Read own data
- Service role: Full CRUD operations
- Admin users: Read all data for support

## Monitoring & Analytics

### Key Metrics Available
```sql
-- Average cycle completion time
SELECT AVG(cycle_completion_days) as avg_completion_days
FROM subscription_cycle_history 
WHERE completed_at IS NOT NULL;

-- Selection window utilization
SELECT 
    COUNT(*) as total_windows,
    COUNT(toys_selected_at) as used_windows,
    ROUND(COUNT(toys_selected_at) * 100.0 / COUNT(*), 2) as utilization_percentage
FROM subscription_selection_windows;

-- Delivery performance
SELECT 
    delivery_status,
    COUNT(*) as count,
    AVG(delivery_delay_days) as avg_delay_days
FROM subscription_cycle_history 
GROUP BY delivery_status;
```

This schema provides a robust foundation for subscription-based toy selection with comprehensive tracking, analytics, and user experience improvements. 