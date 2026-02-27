
-- Let's create test data with proper UUID format
-- First, let's add some sample categories if they don't exist
INSERT INTO public.categories (name, description, is_active) VALUES
('Building Blocks', 'Construction and building toys', true),
('Educational Games', 'Learning and educational toys', true),
('Action Figures', 'Character and action figure toys', true),
('Board Games', 'Family board games and puzzles', true),
('Art & Craft', 'Creative and artistic toys', true)
ON CONFLICT (name) DO NOTHING;

-- Add sample toys with different packs and categories (using proper UUIDs)
INSERT INTO public.toys (id, name, description, category, age_range, min_age, max_age, brand, pack, rental_price, retail_price, total_quantity, available_quantity, rating) VALUES
-- Standard pack toys
('11111111-1111-1111-1111-111111111111', 'LEGO Classic Bricks', 'Classic LEGO building blocks set', 'building', '4-12 years', 4, 12, 'LEGO', 'standard', 299.00, 1999.00, 10, 8, 4.5),
('22222222-2222-2222-2222-222222222222', 'Alphabet Learning Puzzle', 'Educational alphabet puzzle', 'educational', '3-6 years', 3, 6, 'Melissa & Doug', 'standard', 199.00, 899.00, 15, 12, 4.3),
('33333333-3333-3333-3333-333333333333', 'Crayola Art Set', 'Complete art and coloring set', 'creative', '5-10 years', 5, 10, 'Crayola', 'standard', 249.00, 1299.00, 8, 6, 4.4),

-- Big pack toys
('44444444-4444-4444-4444-444444444444', 'Remote Control Car', 'High-speed RC racing car', 'electronics', '8-15 years', 8, 15, 'Hot Wheels', 'big', 599.00, 3999.00, 5, 3, 4.6),
('55555555-5555-5555-5555-555555555555', 'Kids Kitchen Set', 'Complete play kitchen with accessories', 'creative', '3-8 years', 3, 8, 'Little Tikes', 'big', 799.00, 5999.00, 3, 2, 4.7),

-- Premium pack toys
('66666666-6666-6666-6666-666666666666', 'Arduino Robotics Kit', 'Advanced robotics learning kit', 'stem', '10-16 years', 10, 16, 'Arduino', 'premium', 1299.00, 8999.00, 2, 1, 4.8),
('77777777-7777-7777-7777-777777777777', 'Electric Ride-On Car', 'Battery-powered ride-on vehicle', 'outdoor', '3-7 years', 3, 7, 'Power Wheels', 'premium', 1999.00, 15999.00, 2, 2, 4.9);

-- Create some sample payment orders for testing payment flow
INSERT INTO public.payment_orders (id, amount, currency, order_type, status, order_items, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1178.82, 'INR', 'subscription', 'completed', '{"plan": "discovery_delight", "age_group": "3-6"}', '2024-12-01'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2358.82, 'INR', 'subscription', 'pending', '{"plan": "silver_pack", "age_group": "6-9"}', '2025-01-11');
