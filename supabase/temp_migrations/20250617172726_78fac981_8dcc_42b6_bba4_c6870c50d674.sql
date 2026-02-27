
-- Create the toy-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'toy-images',
  'toy-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the toy-images bucket using the correct syntax
CREATE POLICY "Public read access for toy images" ON storage.objects
FOR SELECT USING (bucket_id = 'toy-images');

CREATE POLICY "Admin insert access for toy images" ON storage.objects  
FOR INSERT WITH CHECK (bucket_id = 'toy-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin update access for toy images" ON storage.objects
FOR UPDATE USING (bucket_id = 'toy-images' AND auth.role() = 'authenticated');

CREATE POLICY "Admin delete access for toy images" ON storage.objects
FOR DELETE USING (bucket_id = 'toy-images' AND auth.role() = 'authenticated');
