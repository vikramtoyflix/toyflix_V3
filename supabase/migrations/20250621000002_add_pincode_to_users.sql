-- Add pincode column to custom_users table for Bangalore delivery validation
-- This ensures we collect pincode during signup to validate service area

-- Add pincode column
ALTER TABLE custom_users ADD COLUMN IF NOT EXISTS pincode VARCHAR(6);

-- Add index for efficient pincode-based queries (optional)
CREATE INDEX IF NOT EXISTS idx_custom_users_pincode ON custom_users(pincode);

-- Add comment for documentation
COMMENT ON COLUMN custom_users.pincode IS 'User pincode for delivery area validation (currently Bangalore only)'; 