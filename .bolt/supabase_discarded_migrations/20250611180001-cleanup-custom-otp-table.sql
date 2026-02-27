
-- Since we're now using Supabase's native phone authentication,
-- we can deprecate the custom otp_verifications table
-- We'll keep it for now in case of rollback needs, but mark it as deprecated

-- Add a comment to indicate this table is deprecated
COMMENT ON TABLE public.otp_verifications IS 'DEPRECATED: This table is no longer used. Supabase native phone auth is now being used instead.';

-- Optional: You can drop this table later once you're confident the migration is successful
-- DROP TABLE IF EXISTS public.otp_verifications;
