
-- Create a storage bucket for toy images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'toy-images',
  'toy-images', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for the toy-images bucket
-- Allow public read access to images
CREATE POLICY "Public Access for toy images" ON storage.objects
FOR SELECT USING (bucket_id = 'toy-images');

-- Allow authenticated users to upload images (for now, can be restricted to admins later)
CREATE POLICY "Authenticated users can upload toy images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'toy-images' 
  AND auth.role() = 'authenticated'
);

-- Allow admins to update toy images
CREATE POLICY "Admins can update toy images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'toy-images' 
  AND public.is_user_admin()
);

-- Allow admins to delete toy images
CREATE POLICY "Admins can delete toy images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'toy-images' 
  AND public.is_user_admin()
);
