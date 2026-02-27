-- URGENT FIX: Remove double domains from image URLs
-- This will fix the broken URLs immediately

-- 1. Fix double domains in toy_images table
UPDATE toy_images 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.cohttps://wucwpyitzqjukcphczhr.supabase.co/',
  'https://wucwpyitzqjukcphczhr.supabase.co/'
)
WHERE image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.cohttps://wucwpyitzqjukcphczhr.supabase.co/%';

-- 2. Fix double domains in toys table
UPDATE toys 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.cohttps://wucwpyitzqjukcphczhr.supabase.co/',
  'https://wucwpyitzqjukcphczhr.supabase.co/'
)
WHERE image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.cohttps://wucwpyitzqjukcphczhr.supabase.co/%';

-- 3. Verify the fix
SELECT 
  'After Double Domain Fix' as status,
  COUNT(*) as total_images,
  COUNT(CASE WHEN image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%' THEN 1 END) as correct_urls,
  COUNT(CASE WHEN image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.cohttps://%' THEN 1 END) as still_broken
FROM toy_images;

-- 4. Show sample fixed URLs
SELECT 
  'Fixed URLs Sample' as info,
  image_url
FROM toy_images 
WHERE image_url LIKE 'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/%'
LIMIT 5;
