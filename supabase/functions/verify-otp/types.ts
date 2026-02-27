
export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface OTPRecord {
  id: string;
  phone_number: string;
  otp_code: string;
  expires_at: string;
  is_verified: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone_verified: boolean;
  first_name?: string;
  last_name?: string;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
