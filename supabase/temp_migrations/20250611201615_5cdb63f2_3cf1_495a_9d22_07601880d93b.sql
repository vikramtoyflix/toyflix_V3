
-- Fix cycle initialization for existing subscriptions without proper cycle dates
UPDATE subscriptions 
SET 
  current_cycle_start = CURRENT_DATE,
  current_cycle_end = CURRENT_DATE + INTERVAL '30 days',
  cycle_status = 'selection'
WHERE current_cycle_start IS NULL OR current_cycle_end IS NULL;

-- Ensure user entitlements exist for all active subscriptions
INSERT INTO user_entitlements (
  user_id, 
  subscription_id, 
  standard_toys_remaining, 
  big_toys_remaining, 
  books_remaining, 
  premium_toys_remaining,
  value_cap_remaining,
  toys_in_possession,
  selection_window_active,
  next_billing_date
)
SELECT 
  s.user_id,
  s.id,
  CASE 
    WHEN s.plan_id = 'discovery-delight' THEN 2
    WHEN s.plan_id = 'silver-pack' THEN 3
    WHEN s.plan_id = 'gold-pack' THEN 4
    ELSE 2
  END,
  CASE 
    WHEN s.plan_id = 'discovery-delight' THEN 0
    WHEN s.plan_id = 'silver-pack' THEN 1
    WHEN s.plan_id = 'gold-pack' THEN 1
    ELSE 0
  END,
  CASE 
    WHEN s.plan_id = 'discovery-delight' THEN 1
    WHEN s.plan_id = 'silver-pack' THEN 2
    WHEN s.plan_id = 'gold-pack' THEN 3
    ELSE 1
  END,
  CASE 
    WHEN s.plan_id = 'gold-pack' THEN 1
    ELSE 0
  END,
  CASE 
    WHEN s.plan_id = 'discovery-delight' THEN 1500
    WHEN s.plan_id = 'silver-pack' THEN 3000
    WHEN s.plan_id = 'gold-pack' THEN 5000
    ELSE 1500
  END,
  false,
  true,
  s.current_period_end
FROM subscriptions s
WHERE s.status = 'active' 
AND NOT EXISTS (
  SELECT 1 FROM user_entitlements ue 
  WHERE ue.subscription_id = s.id
);
