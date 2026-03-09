-- Fix Image URLs for Egress Optimization
-- This script updates image URLs to use the correct format and prepares them for optimization

-- 1. Fix S3 URLs in toy_images table
UPDATE toy_images 
SET image_url = REPLACE(
  image_url, 
  '/storage/v1/s3/toy-images/', 
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/'
)
WHERE image_url LIKE '%/storage/v1/s3/toy-images/%';

-- 2. Fix relative URLs in toy_images table
UPDATE toy_images 
SET image_url = CONCAT(
  'https://wucwpyitzqjukcphczhr.supabase.co', 
  image_url
)
WHERE image_url LIKE '/storage/v1/object/public/toy-images/%'
AND image_url NOT LIKE 'https://%';

-- 3. Fix S3 URLs in toys table (main image_url field)
UPDATE toys 
SET image_url = REPLACE(
  image_url, 
  '/storage/v1/s3/toy-images/', 
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/'
)
WHERE image_url LIKE '%/storage/v1/s3/toy-images/%';

-- 4. Fix relative URLs in toys table
UPDATE toys 
SET image_url = CONCAT(
  'https://wucwpyitzqjukcphczhr.supabase.co', 
  image_url
)
WHERE image_url LIKE '/storage/v1/object/public/toy-images/%'
AND image_url NOT LIKE 'https://%';

-- 5. Create a function to optimize image URLs (for future use)
CREATE OR REPLACE FUNCTION optimize_image_url(
  original_url TEXT,
  width INTEGER DEFAULT 400,
  height INTEGER DEFAULT 400,
  quality INTEGER DEFAULT 80
) RETURNS TEXT AS $$
BEGIN
  -- Only optimize Supabase storage URLs
  IF original_url LIKE '%supabase.co/storage/v1/object/public/toy-images/%' THEN
    RETURN REPLACE(
      original_url,
      '/storage/v1/object/public/toy-images/',
      '/storage/v1/render/image/public/toy-images/?width=' || width || 
      '&height=' || height || '&quality=' || quality || '&format=webp&resize=cover&'
    );
  END IF;
  
  RETURN original_url;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a view for optimized toy images (for high-traffic queries)
CREATE OR REPLACE VIEW toy_images_optimized AS
SELECT 
  id,
  toy_id,
  optimize_image_url(image_url, 400, 400, 80) as image_url_optimized,
  image_url as image_url_original,
  display_order,
  is_primary,
  created_at,
  updated_at
FROM toy_images;

-- 7. Verify the changes
SELECT 
  'toy_images' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%' THEN 1 END) as correct_format,
  COUNT(CASE WHEN image_url LIKE '%/storage/v1/s3/%' THEN 1 END) as s3_format,
  COUNT(CASE WHEN image_url LIKE '/storage/v1/object/public/%' THEN 1 END) as relative_format
FROM toy_images

UNION ALL

SELECT 
  'toys' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%' THEN 1 END) as correct_format,
  COUNT(CASE WHEN image_url LIKE '%/storage/v1/s3/%' THEN 1 END) as s3_format,
  COUNT(CASE WHEN image_url LIKE '/storage/v1/object/public/%' THEN 1 END) as relative_format
FROM toys
WHERE image_url IS NOT NULL;

-- 8. Sample optimized URLs
SELECT 
  'Sample optimized URLs' as info,
  image_url as original,
  optimize_image_url(image_url) as optimized
FROM toy_images 
WHERE image_url IS NOT NULL 
LIMIT 5;
