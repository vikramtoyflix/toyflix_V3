
-- Add age_group tracking to subscriptions and toy selection state
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_selection_step INTEGER DEFAULT 1;

-- Create a table to track toy selections for each subscription cycle
CREATE TABLE IF NOT EXISTS subscription_toy_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  cycle_month DATE NOT NULL,
  selection_step INTEGER NOT NULL DEFAULT 1,
  toy_type TEXT NOT NULL, -- 'big_toy', 'stem_toy', 'education_toy', 'book'
  toy_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'selected', 'delivered'
  selected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for subscription_toy_selections
ALTER TABLE subscription_toy_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own toy selections" 
  ON subscription_toy_selections 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own toy selections" 
  ON subscription_toy_selections 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own toy selections" 
  ON subscription_toy_selections 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add age-appropriate filtering to toys table if not exists
ALTER TABLE toys ADD COLUMN IF NOT EXISTS min_age INTEGER;
ALTER TABLE toys ADD COLUMN IF NOT EXISTS max_age INTEGER;

-- Update existing toys with age ranges based on age_range text field
UPDATE toys SET 
  min_age = CASE 
    WHEN age_range LIKE '%0-2%' THEN 0
    WHEN age_range LIKE '%3-5%' THEN 3
    WHEN age_range LIKE '%6-8%' THEN 6
    WHEN age_range LIKE '%9-12%' THEN 9
    WHEN age_range LIKE '%13+%' THEN 13
    ELSE 3
  END,
  max_age = CASE 
    WHEN age_range LIKE '%0-2%' THEN 2
    WHEN age_range LIKE '%3-5%' THEN 5
    WHEN age_range LIKE '%6-8%' THEN 8
    WHEN age_range LIKE '%9-12%' THEN 12
    WHEN age_range LIKE '%13+%' THEN 18
    ELSE 12
  END
WHERE min_age IS NULL OR max_age IS NULL;
