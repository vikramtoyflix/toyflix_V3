
import { UserProfile } from './types.ts';

export const findUserProfile = async (supabase: any, phone: string) => {
  console.log('Looking up user profile by phone:', phone);
  
  const { data: profile, error } = await supabase
    .from('custom_users')
    .select('id, email, phone_verified, first_name, last_name')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error('Profile lookup error:', error);
    throw new Error('Failed to find user profile');
  }

  console.log('Profile lookup result:', profile);
  return profile as UserProfile | null;
};

export const updatePhoneVerificationStatus = async (supabase: any, profile: UserProfile) => {
  if (!profile.phone_verified) {
    console.log('Marking phone as verified for user:', profile.id);
    
    const { error } = await supabase
      .from('custom_users')
      .update({ phone_verified: true })
      .eq('id', profile.id);

    if (error) {
      console.error('Failed to mark phone as verified:', error);
      throw new Error('Failed to verify phone');
    }
  }
};
