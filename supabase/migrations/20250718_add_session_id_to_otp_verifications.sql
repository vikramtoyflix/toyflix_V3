-- Add session_id column to otp_verifications table
ALTER TABLE otp_verifications 
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS provider varchar(50) DEFAULT '2factor';

-- Add index on session_id for faster lookups during verification
CREATE INDEX IF NOT EXISTS idx_otp_verifications_session_id ON otp_verifications(session_id);

-- Add index on the combination of phone_number and session_id for faster verification queries
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_session ON otp_verifications(phone_number, session_id);

COMMENT ON COLUMN otp_verifications.session_id IS 'Session ID returned by the OTP service provider for verification';
COMMENT ON COLUMN otp_verifications.provider IS 'The service provider used for sending OTP (2factor, twilio, etc)'; 