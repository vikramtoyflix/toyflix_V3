
-- First, update any existing toys that use the old category values to map them to new valid values
-- Map old categories to new subscription categories
UPDATE toys SET category = 'educational_toys' WHERE category = 'building';
UPDATE toys SET category = 'educational_toys' WHERE category = 'electronics';
UPDATE toys SET category = 'stem_toys' WHERE category = 'stem';
UPDATE toys SET category = 'educational_toys' WHERE category = 'creative';
UPDATE toys SET category = 'educational_toys' WHERE category = 'puzzles';
UPDATE toys SET category = 'big_toys' WHERE category = 'outdoor';
UPDATE toys SET category = 'educational_toys' WHERE category = 'educational';
UPDATE toys SET category = 'educational_toys' WHERE category = 'age_wise_toys';
UPDATE toys SET category = 'educational_toys' WHERE category = 'uncategorized';

-- Create a new enum with only the 6 subscription category values
CREATE TYPE toy_category_new AS ENUM (
  'big_toys',
  'stem_toys', 
  'educational_toys',
  'books',
  'developmental_toys',
  'ride_on_toys'
);

-- Update the toys table to use the new enum
ALTER TABLE toys ALTER COLUMN category TYPE toy_category_new USING category::text::toy_category_new;

-- Drop the old enum and rename the new one
DROP TYPE toy_category;
ALTER TYPE toy_category_new RENAME TO toy_category;
