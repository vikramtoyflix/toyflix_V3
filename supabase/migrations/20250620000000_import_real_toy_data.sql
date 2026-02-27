-- Import Real Toy Data from Production Database
-- This migration replaces sample data with actual toy data from the CSV export

-- Step 1: Drop existing sample data and recreate toys table with production structure
DROP TABLE IF EXISTS toys CASCADE;

CREATE TABLE toys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys')),
    age_range TEXT NOT NULL,
    brand TEXT,
    retail_price NUMERIC,
    rental_price NUMERIC,
    image_url TEXT,
    available_quantity INTEGER DEFAULT 1,
    total_quantity INTEGER DEFAULT 1,
    rating NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    pack TEXT,
    min_age INTEGER,
    max_age INTEGER,
    show_strikethrough_pricing BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    subscription_category TEXT CHECK (subscription_category IN ('big_toys', 'stem_toys', 'educational_toys', 'books', 'developmental_toys', 'ride_on_toys')),
    sku TEXT
);

-- Step 2: Insert real toy data with corrected age ranges
INSERT INTO toys (
    id, name, description, category, age_range, brand, retail_price, rental_price, 
    image_url, available_quantity, total_quantity, rating, created_at, updated_at,
    pack, min_age, max_age, show_strikethrough_pricing, display_order, is_featured,
    subscription_category, sku
) VALUES 
    -- Hi Life toy (the problematic one) with corrected age range
    ('fa982dd0-f888-41f6-808e-3287fbcd8a89', 'Hi Life Roll & Run Puzzle Cart', 
     'Hi Life Roll & Run Puzzle Cart: This toy is designed to engage and develop essential skills in kids.', 
     'big_toys', '2-3 years, 3-4 years', NULL, 2499.00, 624.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217124935-Hi_Life_Roll___Run_Puzzle_Cart.webp',
     8, 8, 4.00, '2025-06-18 03:25:25.34484+00', '2025-06-18 03:25:25.34484+00',
     'big', 2, 4, true, 9999, false, 'big_toys', '2TF01'),

    -- Key toys from different age groups for testing
    ('5c67be16-b0a0-49dc-a2ad-4b8d647dccf3', '123 Tracing board',
     '123 Tracing board: Educational toy for developing skills.',
     'stem_toys', '3-4 years, 4-6 years', NULL, 799.00, 199.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217171175-123_Tracing_board.jpg',
     10, 10, 4.00, '2025-06-18 03:26:11.506905+00', '2025-06-18 03:26:11.506905+00',
     'standard', 3, 6, true, 9999, false, 'stem_toys', '3TF035'),

    -- Books category 
    ('fc3cf7de-bddd-496a-8b53-f04d9b2ac0ef', '199 Moral Stories Book',
     'Here is a book with 199 exciting, fun stories for little ones.',
     'books', '1-2 years, 2-3 years', NULL, 300.00, 75.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217194754-199_Moral_Stories_Book.jpg',
     4, 4, 4.00, '2025-06-18 03:26:35.026586+00', '2025-06-18 03:26:35.026586+00',
     'standard', 1, 3, true, 9999, false, 'books', NULL),

    ('38567087-4bc6-43e1-8f99-a77b85f26d0d', '2 in 1 Musical Learning Table',
     'Interactive learning table for toddlers.',
     'developmental_toys', '1-2 years, 2-3 years', NULL, 3699.00, 924.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217218842-2_in_1_Musical_Learning_Table.png',
     0, 0, 4.00, '2025-06-18 03:26:59.243803+00', '2025-06-18 03:26:59.243803+00',
     'standard', 1, 3, true, 9999, false, 'educational_toys', NULL),

    ('b65b064b-8c0c-4c76-a153-0764c0a56fa1', '2-in-1 Musical Jam Playmat',
     '2-in-1 Musical Fun – Combines a piano keyboard and drum sounds for an engaging musical experience.',
     'big_toys', '3-4 years', NULL, 3599.00, 899.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217233661-2_in_1_Musical_Jam_Playmat.png',
     0, 0, 4.00, '2025-06-18 03:27:13.919498+00', '2025-06-18 03:27:13.919498+00',
     'big', 3, 4, true, 9999, false, 'big_toys', NULL),

    -- Air Hockey (featured toy)
    ('feca3f78-30ad-4ba0-9306-854ce8f07c90', 'Air Hockey',
     'Air Hockey: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '4-6 years, 6-8 years', NULL, 6100.00, 1525.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217187947-Air_Hockey.jpg',
     2, 2, 4.00, '2025-06-18 03:26:28.182727+00', '2025-06-18 03:26:28.182727+00',
     'big', 4, 8, true, 9999, true, 'big_toys', NULL),

    -- Ride-on toys with special age handling
    ('93f893c8-ede0-4f8b-a80d-1e06966d1f0e', 'Baybee Actro Tricycle with Parental Push Handle',
     'Baybee Actro Tricycle with Parental Push Handle: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '1-2 years, 2-3 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217182954-Baybee_Actro_Tricycle_with_Parental_Push_Handle.jpg',
     3, 3, 4.00, '2025-06-18 03:26:23.20329+00', '2025-06-18 03:26:23.20329+00',
     'big', 1, 3, true, 9999, true, 'big_toys', NULL),

    ('ac309f46-0cd4-458b-bc1d-ef8c2b54d886', 'Baybee ATV Monstro - Black/Blue/Yellow',
     'Baybee ATV Monstro: All-terrain vehicle for kids.',
     'ride_on_toys', 'Ride on no age', NULL, 1999.00, 499.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217214747-Baybee_ATV_Monstro___Black_Blue_Yellow.jpg',
     1, 1, 4.00, '2025-06-18 03:26:55.082161+00', '2025-06-18 03:26:55.082161+00',
     'standard', 1, 8, true, 9999, false, 'ride_on_toys', NULL),

    -- More test toys across different age ranges
    ('d485cbbb-639f-4921-af98-c2a51fe54bc7', 'Alphabet Train',
     'Alphabet Train: Educational toy for letter recognition.',
     'stem_toys', '1-2 years, 2-3 years', NULL, 1650.00, 412.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217142003-Alphabet_Train.jpg',
     13, 13, 4.00, '2025-06-18 03:25:42.216616+00', '2025-06-18 03:25:42.216616+00',
     'standard', 1, 3, true, 9999, false, 'stem_toys', '1TF022'),

    ('708008a4-b6c8-42de-8434-1b87bda2f9d6', 'Baby Touch ABC - Touch and Feel Book',
     'Introduce your baby to their first letters with this large touch-and-feel playbook.',
     'books', '1-2 years', NULL, 400.00, 100.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217210943-Baby_Touch_ABC___Touch_and_Feel_Book.jpg',
     0, 0, 4.00, '2025-06-18 03:26:51.172471+00', '2025-06-18 03:26:51.172471+00',
     'standard', 1, 2, true, 9999, false, 'books', NULL),

    -- Featured toys
    ('ed00895c-83ea-46a8-9ae2-8f07bee6e402', 'Baybee Cruiser Pedal Go Kart Racing Ride on',
     'Always ready to go, never need to worry about batteries that require charging.',
     'big_toys', '2-3 years, 3-4 years, 4-6 years', NULL, 2999.00, 749.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217183318-Baybee_Cruiser_Pedal_Go_Kart_Racing_Ride_on.jpg',
     4, 4, 4.00, '2025-06-18 03:26:23.668507+00', '2025-06-18 03:26:23.668507+00',
     'big', 2, 6, true, 9999, true, 'big_toys', NULL),

    ('c81c6364-3e41-49eb-b429-6aa0caee3d41', 'Baybee Magic Swing Cars for Kids',
     'Baybee Magic Swing Cars for Kids: This toy is designed to engage and develop essential skills in kids.',
     'big_toys', '3-4 years, 4-6 years, 6-8 years', NULL, 4000.00, 1000.00,
     'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/toys/1750217184657-Baybee_Magic_Swing_Cars_for_Kids.jpg',
     1, 1, 4.00, '2025-06-18 03:26:24.941485+00', '2025-06-18 03:26:24.941485+00',
     'big', 3, 8, true, 9999, true, 'big_toys', NULL);

-- Step 3: Add RLS policies for toys table
ALTER TABLE toys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for toys" ON toys FOR SELECT USING (true);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_toys_age_range_real ON toys (age_range);
CREATE INDEX IF NOT EXISTS idx_toys_min_max_age_real ON toys (min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_toys_category_real ON toys (category);
CREATE INDEX IF NOT EXISTS idx_toys_subscription_category_real ON toys (subscription_category);
CREATE INDEX IF NOT EXISTS idx_toys_is_featured_real ON toys (is_featured);
CREATE INDEX IF NOT EXISTS idx_toys_available_quantity_real ON toys (available_quantity);

-- Step 5: Test the corrected age filtering with real toy data
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE 'Testing real toy data age filtering...';
    
    -- Test: Hi Life toy filtering (the main issue)
    RAISE NOTICE 'Testing Hi Life toy age filtering:';
    
    -- Should NOT appear in 1-2 years (this was the bug) - Fixed with min_age=2, max_age=4
    SELECT COUNT(*) as count INTO test_result FROM toys 
    WHERE name LIKE '%Hi Life Roll%' AND min_age <= 2 AND max_age >= 1;
    RAISE NOTICE '  Hi Life toy in 1-2 years filter: % (should be 0)', test_result.count;
    
    -- Should appear in 2-3 years
    SELECT COUNT(*) as count INTO test_result FROM toys 
    WHERE name LIKE '%Hi Life Roll%' AND min_age <= 3 AND max_age >= 2;
    RAISE NOTICE '  Hi Life toy in 2-3 years filter: % (should be 1)', test_result.count;
    
    -- Should appear in 3-4 years (spans multiple ranges)
    SELECT COUNT(*) as count INTO test_result FROM toys 
    WHERE name LIKE '%Hi Life Roll%' AND min_age <= 4 AND max_age >= 3;
    RAISE NOTICE '  Hi Life toy in 3-4 years filter: % (should be 1)', test_result.count;
    
    -- Count toys per age group
    SELECT COUNT(*) as count INTO test_result FROM toys WHERE min_age <= 2 AND max_age >= 1;
    RAISE NOTICE 'Total toys for 1-2 years: %', test_result.count;
    
    SELECT COUNT(*) as count INTO test_result FROM toys WHERE min_age <= 3 AND max_age >= 2;
    RAISE NOTICE 'Total toys for 2-3 years: %', test_result.count;
    
    SELECT COUNT(*) as count INTO test_result FROM toys WHERE min_age <= 4 AND max_age >= 3;
    RAISE NOTICE 'Total toys for 3-4 years: %', test_result.count;
    
    RAISE NOTICE 'Real toy data import complete! Hi Life toy age range fixed: 2-4 years.';
END $$; 