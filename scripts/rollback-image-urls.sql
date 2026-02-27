-- ROLLBACK SCRIPT: If images are still broken, run this to revert changes
-- This script will help identify and fix any URL issues

-- 1. Check current URL formats
SELECT 
  'Current URL Analysis' as info,
  COUNT(*) as total_images,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%' THEN 1 END) as correct_public_urls,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/render/image/public/toy-images/%' THEN 1 END) as render_urls,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as null_or_empty,
  COUNT(CASE WHEN image_url NOT LIKE 'https://%' THEN 1 END) as non_https_urls
FROM toy_images;

-- 2. Show sample problematic URLs
SELECT 
  'Problematic URLs' as category,
  image_url,
  CASE 
    WHEN image_url IS NULL THEN 'NULL'
    WHEN image_url = '' THEN 'EMPTY'
    WHEN image_url NOT LIKE 'https://%' THEN 'NOT_HTTPS'
    WHEN image_url LIKE '%render/image%' THEN 'RENDER_URL'
    ELSE 'OTHER'
  END as issue_type
FROM toy_images 
WHERE image_url IS NULL 
   OR image_url = '' 
   OR image_url NOT LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%'
LIMIT 10;

-- 3. Fix any malformed render URLs back to public URLs
UPDATE toy_images 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/render/image/public/toy-images/?width=400&height=400&resize=cover&quality=80&format=webp&',
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/'
)
WHERE image_url LIKE '%/storage/v1/render/image/public/toy-images/%';

-- 4. Fix any URLs that might have double domains
UPDATE toy_images 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/',
  'https://wucwpyitzqjukcphczhr.supabase.co/'
)
WHERE image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/%';

-- 5. Same fixes for toys table
UPDATE toys 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/render/image/public/toy-images/?width=400&height=400&resize=cover&quality=80&format=webp&',
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/'
)
WHERE image_url LIKE '%/storage/v1/render/image/public/toy-images/%';

UPDATE toys 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/',
  'https://wucwpyitzqjukcphczhr.supabase.co/'
)
WHERE image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/%';

-- 6. Verify the fixes
SELECT 
  'After Rollback Fix' as info,
  COUNT(*) as total_images,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%' THEN 1 END) as correct_public_urls,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/render/image/public/toy-images/%' THEN 1 END) as render_urls,
  COUNT(CASE WHEN image_url IS NULL OR image_url = '' THEN 1 END) as null_or_empty
FROM toy_images;

-- 7. Test a few URLs manually
SELECT 
  'Test URLs' as info,
  image_url,
  LENGTH(image_url) as url_length
FROM toy_images 
WHERE image_url IS NOT NULL 
LIMIT 5;
