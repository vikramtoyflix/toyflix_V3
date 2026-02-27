
-- Create enum for subscription categories
CREATE TYPE subscription_category AS ENUM ('big_toys', 'stem_toys', 'educational_toys');

-- Add subscription_category column to toys table
ALTER TABLE toys ADD COLUMN subscription_category subscription_category;

-- Update existing toys with default subscription categories based on current category
-- This is a rough mapping to get started - you can adjust these manually later
UPDATE toys SET subscription_category = 'big_toys' WHERE category IN ('outdoor', 'building');
UPDATE toys SET subscription_category = 'stem_toys' WHERE category IN ('stem', 'electronics', 'puzzles');
UPDATE toys SET subscription_category = 'educational_toys' WHERE category IN ('educational', 'creative');

-- For any remaining toys without subscription_category, set to educational_toys as default
UPDATE toys SET subscription_category = 'educational_toys' WHERE subscription_category IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE toys ALTER COLUMN subscription_category SET NOT NULL;
