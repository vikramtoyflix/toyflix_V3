
-- Create toy_images table for multiple images per toy
CREATE TABLE IF NOT EXISTS toy_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  toy_id UUID NOT NULL REFERENCES toys(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_toy_images_toy_id ON toy_images(toy_id);
CREATE INDEX IF NOT EXISTS idx_toy_images_display_order ON toy_images(toy_id, display_order);

-- Create storage bucket for toy images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('toy-images', 'toy-images', true)
ON CONFLICT (id) DO NOTHING;

-- Migrate existing toy images to new system (only if table is empty)
INSERT INTO toy_images (toy_id, image_url, display_order, is_primary)
SELECT id, image_url, 0, true
FROM toys 
WHERE image_url IS NOT NULL AND image_url != ''
AND NOT EXISTS (SELECT 1 FROM toy_images WHERE toy_id = toys.id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_toy_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_toy_images_updated_at ON toy_images;
CREATE TRIGGER update_toy_images_updated_at
    BEFORE UPDATE ON toy_images
    FOR EACH ROW
    EXECUTE PROCEDURE update_toy_images_updated_at();
