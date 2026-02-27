-- Optional: create testimonials table so /rest/v1/testimonials returns 200 instead of 404.
-- If you don't run this, the app still works using Storage/default video testimonials.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  child_age text,
  video_url text,
  video_path text,
  display_order int DEFAULT 0,
  location text,
  rating int DEFAULT 5,
  text text,
  avatar text,
  plan_type text,
  created_at timestamptz DEFAULT now()
);

-- Allow public read for homepage carousel
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON public.testimonials FOR SELECT
  USING (true);

-- Optional: add some seed rows (edit names/urls as needed)
-- INSERT INTO public.testimonials (name, location, rating, text, display_order)
-- VALUES ('Customer', 'Bangalore', 5, 'Great experience!', 1);

COMMENT ON TABLE public.testimonials IS 'Optional. Homepage testimonials; app falls back to Storage/defaults if table is missing.';
