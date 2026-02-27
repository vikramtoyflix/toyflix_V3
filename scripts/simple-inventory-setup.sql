-- Simple Inventory Management Setup
-- Copy and paste each section separately into Supabase SQL Editor

-- SECTION 1: Populate original_toy_id (run this first)
UPDATE toys_1_2_years SET original_toy_id = toys.id FROM toys WHERE toys_1_2_years.name = toys.name AND toys_1_2_years.original_toy_id IS NULL;
UPDATE toys_2_3_years SET original_toy_id = toys.id FROM toys WHERE toys_2_3_years.name = toys.name AND toys_2_3_years.original_toy_id IS NULL;
UPDATE toys_3_4_years SET original_toy_id = toys.id FROM toys WHERE toys_3_4_years.name = toys.name AND toys_3_4_years.original_toy_id IS NULL;
UPDATE toys_4_6_years SET original_toy_id = toys.id FROM toys WHERE toys_4_6_years.name = toys.name AND toys_4_6_years.original_toy_id IS NULL;
UPDATE toys_6_8_years SET original_toy_id = toys.id FROM toys WHERE toys_6_8_years.name = toys.name AND toys_6_8_years.original_toy_id IS NULL;

-- SECTION 2: Create indexes (run this second)
CREATE INDEX IF NOT EXISTS idx_toys_1_2_years_original_toy_id ON toys_1_2_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_2_3_years_original_toy_id ON toys_2_3_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_3_4_years_original_toy_id ON toys_3_4_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_4_6_years_original_toy_id ON toys_4_6_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_6_8_years_original_toy_id ON toys_6_8_years(original_toy_id);
CREATE INDEX IF NOT EXISTS idx_toys_inventory ON toys(available_quantity, total_quantity);

-- SECTION 3: Verification query (run this to check results)
SELECT 
    'toys_1_2_years' as table_name,
    COUNT(*) as total_toys,
    COUNT(original_toy_id) as linked_toys,
    COUNT(*) - COUNT(original_toy_id) as unlinked_toys
FROM toys_1_2_years
UNION ALL
SELECT 
    'toys_2_3_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_2_3_years
UNION ALL
SELECT 
    'toys_3_4_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_3_4_years
UNION ALL
SELECT 
    'toys_4_6_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_4_6_years
UNION ALL
SELECT 
    'toys_6_8_years',
    COUNT(*),
    COUNT(original_toy_id),
    COUNT(*) - COUNT(original_toy_id)
FROM toys_6_8_years; 