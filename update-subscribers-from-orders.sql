-- ========================================
-- UPDATE SUBSCRIBERS FROM ORDER DATA
-- ========================================
-- This SQL updates custom_users.subscription_active and subscription_plan
-- based on analysis of rental_orders data.
-- 
-- Logic:
-- 1. Users with orders in last 60 days = Active subscribers
-- 2. Users with future rental_end_date = Active subscribers  
-- 3. Extract subscription_plan from most recent order
-- ========================================

-- Step 1: Create a temporary view with subscription analysis
CREATE OR REPLACE VIEW temp_subscription_analysis AS
WITH user_order_analysis AS (
  SELECT 
    ro.user_id,
    MAX(ro.created_at) as most_recent_order_date,
    MAX(ro.rental_end_date) as latest_rental_end_date,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN ro.status IN ('delivered', 'active', 'confirmed', 'shipped') THEN 1 END) as active_orders_count,
    COUNT(CASE WHEN ro.rental_end_date >= CURRENT_DATE THEN 1 END) as future_orders_count,
    MAX(ro.cycle_number) as max_cycle_number,
    -- Get subscription plan from most recent order (prefer non-null)
    COALESCE(
      (SELECT subscription_plan 
       FROM rental_orders r2 
       WHERE r2.user_id = ro.user_id 
       AND r2.subscription_plan IS NOT NULL 
       ORDER BY r2.created_at DESC 
       LIMIT 1),
      (SELECT subscription_plan 
       FROM rental_orders r3 
       WHERE r3.user_id = ro.user_id 
       ORDER BY r3.created_at DESC 
       LIMIT 1),
      'basic'::text
    ) as subscription_plan
  FROM rental_orders ro
  GROUP BY ro.user_id
),
subscription_status AS (
  SELECT 
    user_id,
    subscription_plan,
    total_orders,
    active_orders_count,
    future_orders_count,
    max_cycle_number,
    most_recent_order_date,
    latest_rental_end_date,
    -- Determine if user should be marked as active subscriber
    CASE 
      WHEN most_recent_order_date >= (CURRENT_DATE - INTERVAL '60 days') 
           AND (active_orders_count > 0 OR future_orders_count > 0) 
      THEN true
      ELSE false
    END as should_be_active_subscriber
  FROM user_order_analysis
)
SELECT * FROM subscription_status;

-- Step 2: Show analysis before update
SELECT 
  'BEFORE UPDATE - Subscription Analysis' as analysis_step,
  COUNT(*) as total_users_with_orders,
  COUNT(CASE WHEN should_be_active_subscriber THEN 1 END) as should_be_active,
  COUNT(CASE WHEN NOT should_be_active_subscriber THEN 1 END) as should_be_inactive
FROM temp_subscription_analysis;

-- Step 3: Show plan distribution
SELECT 
  'PLAN DISTRIBUTION' as analysis_step,
  subscription_plan,
  COUNT(*) as user_count,
  COUNT(CASE WHEN should_be_active_subscriber THEN 1 END) as active_count
FROM temp_subscription_analysis
GROUP BY subscription_plan
ORDER BY user_count DESC;

-- Step 4: Update custom_users table
UPDATE custom_users 
SET 
  subscription_active = temp_subscription_analysis.should_be_active_subscriber,
  subscription_plan = CASE 
    WHEN temp_subscription_analysis.subscription_plan ILIKE '%Discovery%'
    THEN 'Discovery Delight'::subscription_plan
    WHEN temp_subscription_analysis.subscription_plan ILIKE '%Silver%' OR temp_subscription_analysis.subscription_plan = 'silver-pack'
    THEN 'Silver Pack'::subscription_plan
    WHEN temp_subscription_analysis.subscription_plan ILIKE '%Gold%' OR temp_subscription_analysis.subscription_plan ILIKE '%PRO%'
    THEN 'Gold Pack PRO'::subscription_plan
    ELSE 'Discovery Delight'::subscription_plan
  END,
  updated_at = NOW()
FROM temp_subscription_analysis
WHERE custom_users.id = temp_subscription_analysis.user_id;

-- Step 5: Show results after update
SELECT 
  'AFTER UPDATE - Results' as result_step,
  COUNT(*) as total_users,
  COUNT(CASE WHEN subscription_active = true THEN 1 END) as active_subscribers,
  COUNT(CASE WHEN subscription_active = false THEN 1 END) as inactive_users,
  COUNT(CASE WHEN subscription_active IS NULL THEN 1 END) as null_subscription_status
FROM custom_users
WHERE id IN (SELECT user_id FROM temp_subscription_analysis);

-- Step 6: Show active subscriber plan breakdown
SELECT 
  'ACTIVE SUBSCRIBER PLANS' as result_step,
  subscription_plan,
  COUNT(*) as subscriber_count
FROM custom_users
WHERE subscription_active = true
GROUP BY subscription_plan
ORDER BY subscriber_count DESC;

-- Step 7: Show sample active subscribers
SELECT 
  'SAMPLE ACTIVE SUBSCRIBERS' as result_step,
  first_name,
  SUBSTRING(phone, 1, 6) || 'XXXX' as masked_phone,
  subscription_plan,
  subscription_active
FROM custom_users
WHERE subscription_active = true
LIMIT 5;

-- Step 8: Show users who would see Next Cycle feature
WITH next_cycle_eligible_users AS (
  SELECT 
    cu.id,
    cu.first_name,
    cu.subscription_plan,
    cu.subscription_active,
    ro.rental_start_date,
    ro.rental_end_date,
    -- Calculate cycle progress
    CASE 
      WHEN ro.rental_start_date IS NOT NULL AND ro.rental_end_date IS NOT NULL
      THEN (CURRENT_DATE - ro.rental_start_date::date) + 1
      ELSE 0
    END as current_cycle_day,
    CASE 
      WHEN ro.rental_end_date IS NOT NULL
      THEN (ro.rental_end_date::date - CURRENT_DATE)
      ELSE 0  
    END as days_until_next_cycle
  FROM custom_users cu
  JOIN rental_orders ro ON cu.id = ro.user_id
  WHERE cu.subscription_active = true
    AND ro.rental_end_date >= CURRENT_DATE
    AND ro.status IN ('delivered', 'active', 'confirmed')
  ORDER BY ro.created_at DESC
)
SELECT 
  'NEXT CYCLE FEATURE ELIGIBLE' as feature_step,
  COUNT(*) as total_eligible_users,
  COUNT(CASE WHEN current_cycle_day >= 20 THEN 1 END) as can_queue_now,
  COUNT(CASE WHEN current_cycle_day < 20 THEN 1 END) as too_early_to_queue,
  ROUND(AVG(current_cycle_day), 1) as avg_cycle_day,
  ROUND(AVG(days_until_next_cycle), 1) as avg_days_remaining
FROM next_cycle_eligible_users;

-- Step 9: Clean up
DROP VIEW IF EXISTS temp_subscription_analysis;

-- Step 10: Summary message
SELECT 
  '🎉 SUBSCRIPTION UPDATE COMPLETED!' as final_message,
  'Users with active subscriptions will now see the Next Cycle Queue feature in their dashboard.' as next_steps; 