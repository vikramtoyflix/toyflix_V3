-- Create otp_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamptz NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_number ON public.otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_otp_code ON public.otp_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can create OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can create OTP verifications" ON public.otp_verifications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can view their own OTP verifications" ON public.otp_verifications
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own OTP verifications" ON public.otp_verifications;
CREATE POLICY "Users can update their own OTP verifications" ON public.otp_verifications
    FOR UPDATE USING (true);

-- Add function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_otp_verifications_updated_at ON public.otp_verifications;
CREATE TRIGGER update_otp_verifications_updated_at
    BEFORE UPDATE ON public.otp_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.otp_verifications TO anon;
GRANT ALL ON public.otp_verifications TO authenticated;
GRANT ALL ON public.otp_verifications TO service_role; 