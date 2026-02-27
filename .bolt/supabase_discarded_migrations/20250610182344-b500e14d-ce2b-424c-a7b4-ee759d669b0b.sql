
-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert existing categories from the enum into the new table
INSERT INTO public.categories (name, description) VALUES
  ('building', 'Construction and building toys'),
  ('electronics', 'Electronic toys and gadgets'),
  ('stem', 'Science, Technology, Engineering, and Math toys'),
  ('creative', 'Arts, crafts, and creative play items'),
  ('puzzles', 'Jigsaw puzzles and brain teasers'),
  ('outdoor', 'Outdoor play equipment and sports toys'),
  ('educational', 'Learning-focused toys and materials');

-- Add RLS policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Categories are publicly readable" 
  ON public.categories 
  FOR SELECT 
  USING (true);

-- Only authenticated users can insert categories (admin check can be added later)
CREATE POLICY "Authenticated users can create categories" 
  ON public.categories 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update categories
CREATE POLICY "Authenticated users can update categories" 
  ON public.categories 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Only authenticated users can delete categories
CREATE POLICY "Authenticated users can delete categories" 
  ON public.categories 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create function to count toys per category
CREATE OR REPLACE FUNCTION get_toy_count_by_category(category_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  toy_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO toy_count
  FROM toys 
  WHERE category::text = category_name;
  
  RETURN COALESCE(toy_count, 0);
END;
$$;
