
CREATE TABLE public.carousel_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_link TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a trigger to automatically update the 'updated_at' timestamp on any change.
CREATE TRIGGER handle_carousel_slides_updated_at
  BEFORE UPDATE ON public.carousel_slides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security to control access to the slides.
ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;

-- This policy allows anyone to view the active slides in the carousel.
CREATE POLICY "Enable public read access for active slides"
ON public.carousel_slides
FOR SELECT
USING (is_active = true);

-- This policy allows administrators to create, view, update, and delete slides.
CREATE POLICY "Admins can manage carousel slides"
ON public.carousel_slides
FOR ALL
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());
