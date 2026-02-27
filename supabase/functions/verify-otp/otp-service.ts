
import { OTPRecord } from './types.ts';

export const validateRequest = (phone: string, otp: string) => {
  if (!phone || !otp) {
    return { isValid: false, error: 'Phone number and OTP are required' };
  }
  return { isValid: true };
};

export const findValidOTP = async (supabase: any, phone: string, otp: string) => {
  console.log('Verifying OTP for phone:', phone, 'with OTP:', otp);

  // First, let's check what OTP records exist for this phone
  const { data: allOtpRecords, error: allError } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone_number', phone)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('Error checking OTP records:', allError);
  } else {
    console.log('All OTP records for phone:', phone, allOtpRecords);
    console.log('Current time:', new Date().toISOString());
  }

  const { data: otpRecord, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone_number', phone)
    .eq('otp_code', otp)
    .eq('is_verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('OTP lookup error:', error);
    throw new Error('Failed to verify OTP');
  }

  if (!otpRecord) {
    console.log('No valid OTP found for phone:', phone, 'with OTP:', otp);
    
    // Let's also check if there's an OTP that matches but is expired or already verified
    const { data: expiredOtp } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone_number', phone)
      .eq('otp_code', otp)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (expiredOtp) {
      console.log('Found matching OTP but it is:', {
        expired: new Date(expiredOtp.expires_at) <= new Date(),
        already_verified: expiredOtp.is_verified,
        expires_at: expiredOtp.expires_at,
        is_verified: expiredOtp.is_verified
      });
      
      if (expiredOtp.is_verified) {
        throw new Error('OTP has already been used');
      } else if (new Date(expiredOtp.expires_at) <= new Date()) {
        throw new Error('OTP has expired');
      }
    }
    
    throw new Error('Invalid or expired OTP');
  }

  console.log('Found valid OTP record:', otpRecord.id);
  return otpRecord as OTPRecord;
};

export const markOTPAsVerified = async (supabase: any, otpId: string) => {
  const { error } = await supabase
    .from('otp_verifications')
    .update({ 
      is_verified: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', otpId);

  if (error) {
    console.error('Failed to update OTP record:', error);
    throw new Error('Failed to verify OTP');
  }

  console.log('OTP marked as verified');
};
