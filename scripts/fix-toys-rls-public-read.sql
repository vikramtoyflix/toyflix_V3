-- Fix: Ensure toys table allows public read (anon key) so website can load toys.
-- Run this in Supabase Dashboard → SQL Editor if toys stopped loading.

ALTER TABLE public.toys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for toys" ON public.toys;
DROP POLICY IF EXISTS "Public read toys" ON public.toys;
DROP POLICY IF EXISTS "Public can read toys" ON public.toys;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.toys;

CREATE POLICY "Public read access for toys"
  ON public.toys
  FOR SELECT
  USING (true);
