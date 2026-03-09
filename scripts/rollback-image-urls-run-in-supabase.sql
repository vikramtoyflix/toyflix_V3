-- Run this entire file in Supabase Dashboard → SQL Editor → New query. Paste all, then Run.

-- Step 1: Fix toy_images – convert render URLs to object/public (stops image transform usage)
UPDATE toy_images 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/render/image/public/toy-images/?width=400&height=400&resize=cover&quality=80&format=webp&',
  'https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/toy-images/'
)
WHERE image_url LIKE '%/storage/v1/render/image/public/toy-images/%';

UPDATE toy_images 
SET image_url = REPLACE(
  image_url,
  'https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/',
  'https://wucwpyitzqjukcphczhr.supabase.co/'
)
WHERE image_url LIKE '%https://wucwpyitzqjukcphczhr.supabase.co/https://wucwpyitzqjukcphczhr.supabase.co/%';

-- Step 2: Same fixes for toys table
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

-- Step 3: Check result (optional – you’ll see counts in the result)
SELECT 
  (SELECT COUNT(*) FROM toy_images WHERE image_url LIKE '%/render/image/public/%') as toy_images_still_render,
  (SELECT COUNT(*) FROM toys WHERE image_url LIKE '%/render/image/public/%') as toys_still_render;
