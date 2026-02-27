-- ========================================
-- UPDATE SUBSCRIPTION PLAN ENUM
-- ========================================
-- This script updates the subscription_plan enum to match 
-- the actual plan names used in your system
-- ========================================

-- Step 1: Add the real subscription plan names to the enum
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'Discovery Delight';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'Silver Pack';  
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'Gold Pack PRO';

-- Step 2: Show current enum values
SELECT 
  'Current enum values:' as step,
  enumlabel as plan_name
FROM pg_enum 
WHERE enumtypid = 'subscription_plan'::regtype
ORDER BY enumsortorder;

-- Step 3: Show current distribution before update
SELECT 
  'BEFORE UPDATE' as step,
  subscription_plan,
  COUNT(*) as user_count
FROM custom_users
WHERE subscription_plan IS NOT NULL
GROUP BY subscription_plan
ORDER BY user_count DESC;

-- Step 4: Update users to use the correct enum values based on rental_orders data
WITH user_real_plans AS (
  SELECT 
    user_id,
    normalized_plan
  FROM (
    SELECT 
      ro.user_id,
      -- Normalize the subscription plan names
      CASE 
        WHEN ro.subscription_plan ILIKE '%Discovery%' THEN 'Discovery Delight'
        WHEN ro.subscription_plan ILIKE '%Silver%' OR ro.subscription_plan = 'silver-pack' THEN 'Silver Pack'
        WHEN ro.subscription_plan ILIKE '%Gold%' OR ro.subscription_plan ILIKE '%PRO%' THEN 'Gold Pack PRO'
        ELSE 'Discovery Delight' -- default for any other cases
      END as normalized_plan,
      ROW_NUMBER() OVER (PARTITION BY ro.user_id ORDER BY ro.created_at DESC) as rn
    FROM rental_orders ro
    WHERE ro.subscription_plan IS NOT NULL
  ) ranked
  WHERE rn = 1
)
UPDATE custom_users 
SET 
  subscription_plan = user_real_plans.normalized_plan::subscription_plan,
  updated_at = NOW()
FROM user_real_plans
WHERE custom_users.id = user_real_plans.user_id;

-- Step 5: Show results after update
SELECT 
  'AFTER UPDATE' as step,
  subscription_plan,
  COUNT(*) as user_count,
  COUNT(CASE WHEN subscription_active = true THEN 1 END) as active_subscribers
FROM custom_users
WHERE subscription_plan IS NOT NULL
GROUP BY subscription_plan
ORDER BY user_count DESC;

-- Step 6: Show sample users with their real plan names
SELECT 
  'SAMPLE USERS WITH REAL PLANS' as step,
  first_name,
  SUBSTRING(phone, 1, 6) || 'XXXX' as masked_phone,
  subscription_plan,
  subscription_active
FROM custom_users
WHERE subscription_plan IS NOT NULL
  AND subscription_active = true
LIMIT 8;

-- Step 7: Summary
SELECT 
  '🎉 ENUM UPDATE COMPLETED!' as final_message,
  'Subscription plans now use real plan names instead of generic basic/premium/family' as improvement; 