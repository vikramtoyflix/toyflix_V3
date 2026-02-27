-- Step 2: Create toy_categories table with hierarchical support
-- Run this in Supabase SQL Editor

-- Create enhanced categories table (replace enum approach)
CREATE TABLE IF NOT EXISTS toy_categories (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id INTEGER REFERENCES toy_categories(category_id),
  icon VARCHAR(100),
  color VARCHAR(7), -- hex color code
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS toy_categories_parent_idx ON toy_categories(parent_id);
CREATE INDEX IF NOT EXISTS toy_categories_active_idx ON toy_categories(is_active);
CREATE INDEX IF NOT EXISTS toy_categories_slug_idx ON toy_categories(slug);

-- Populate categories based on current enum values plus expansions
INSERT INTO toy_categories (name, slug, description, display_order, color) VALUES
  ('Big Toys', 'big-toys', 'Large play equipment and ride-on toys', 1, '#FF6B6B'),
  ('STEM Toys', 'stem-toys', 'Science, Technology, Engineering, Math toys', 2, '#4ECDC4'),
  ('Educational Toys', 'educational-toys', 'Learning and development focused toys', 3, '#45B7D1'),
  ('Books', 'books', 'Educational books and reading materials', 4, '#96CEB4'),
  ('Developmental Toys', 'developmental-toys', 'Toys for skill development', 5, '#FFEAA7'),
  ('Ride-On Toys', 'ride-on-toys', 'Bikes, scooters, and riding toys', 6, '#DDA0DD'),
  ('Creative Arts', 'creative-arts', 'Art supplies and creative play', 7, '#F8BBD0'),
  ('Building & Construction', 'building-construction', 'LEGO, blocks, building sets', 8, '#FFAB91'),
  ('Puzzles & Games', 'puzzles-games', 'Brain teasers and board games', 9, '#C5E1A5'),
  ('Outdoor Play', 'outdoor-play', 'Sports and outdoor activities', 10, '#81C784'),
  ('Musical Instruments', 'musical-instruments', 'Music toys and instruments', 11, '#BA68C8'),
  ('Action Figures', 'action-figures', 'Character toys and collectibles', 12, '#FFB74D')
ON CONFLICT (name) DO NOTHING;

-- Add subcategories for hierarchical structure
INSERT INTO toy_categories (name, slug, description, parent_id, display_order) VALUES
  ('LEGO Sets', 'lego-sets', 'All LEGO building sets', 
   (SELECT category_id FROM toy_categories WHERE slug = 'building-construction'), 1),
  ('Wooden Blocks', 'wooden-blocks', 'Traditional wooden building blocks', 
   (SELECT category_id FROM toy_categories WHERE slug = 'building-construction'), 2),
  ('Science Kits', 'science-kits', 'Experiment and science learning kits', 
   (SELECT category_id FROM toy_categories WHERE slug = 'stem-toys'), 1),
  ('Coding Toys', 'coding-toys', 'Programming and coding learning toys', 
   (SELECT category_id FROM toy_categories WHERE slug = 'stem-toys'), 2)
ON CONFLICT (name) DO NOTHING;

-- Add RLS policies
ALTER TABLE toy_categories ENABLE ROW LEVEL SECURITY;

-- Public read access for categories
CREATE POLICY "Categories are publicly readable" ON toy_categories FOR SELECT USING (is_active = TRUE);

-- Admin-only write access
CREATE POLICY "Admins can manage categories" ON toy_categories FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.jwt() ->> 'user_role' = 'admin'
);

-- Add comment for documentation
COMMENT ON TABLE toy_categories IS 'Hierarchical category system supporting multiple categories per toy'; 