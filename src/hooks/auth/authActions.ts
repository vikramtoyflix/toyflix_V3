import { supabase } from '@/integrations/supabase/client';
import { CustomUser, CustomSession } from './types';
import { saveAuthToStorage, clearAuthStorage, getStoredSession } from './storage';

export const signUp = async (
  phone: string, 
  otp: string, 
  email?: string, 
  firstName?: string, 
  lastName?: string,
  pincode?: string
): Promise<{ error?: string; user?: CustomUser; session?: CustomSession }> => {
  try {
    console.log('🔐 Custom signup for phone:', phone);

    // First verify OTP (you can add your OTP verification logic here)
    // For now, assuming OTP is valid

    // Check if user already exists in custom_users
    const { data: existingUsers, error: checkError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', phone);

    if (checkError) {
      return { error: `Database error: ${checkError.message}` };
    }

    let user: CustomUser;

    if (existingUsers && existingUsers.length > 0) {
      // User exists - update their profile if needed
      const existingUser = existingUsers[0];
      console.log('✅ Existing user found:', existingUser.id);

      const updateData: any = {};
      if (email && email !== existingUser.email) updateData.email = email;
      if (firstName && firstName !== existingUser.first_name) updateData.first_name = firstName;
      if (lastName && lastName !== existingUser.last_name) updateData.last_name = lastName;
      if (pincode && pincode !== existingUser.zip_code) updateData.zip_code = pincode;

      if (Object.keys(updateData).length > 0) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('custom_users')
          .update(updateData)
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) {
          return { error: `Update error: ${updateError.message}` };
        }
        user = updatedUser as CustomUser;
      } else {
        user = existingUser as CustomUser;
      }
    } else {
      // Create new user in custom_users table
      console.log('➕ Creating new user in custom_users');
      const { data: newUser, error: createError } = await supabase
        .from('custom_users')
        .insert({
          phone,
          email: email || '',
          first_name: firstName || '',
          last_name: lastName || '',
          zip_code: pincode || '',
          subscription_active: false,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        return { error: `Create error: ${createError.message}` };
      }
      user = newUser as CustomUser;
    }

    // Create custom session
    const session: CustomSession = {
      access_token: `custom_token_${user.id}_${Date.now()}`,
      refresh_token: `refresh_${user.id}_${Date.now()}`,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
      user: user
    };

    console.log('✅ Custom signup successful for user:', user.id);
    saveAuthToStorage(user, session);
    return { user, session };
  } catch (error: any) {
    console.error('❌ Custom signup error:', error);
    return { error: error.message };
  }
};

export const signIn = async (phone: string, otp: string): Promise<{ error?: string; user?: CustomUser; session?: CustomSession }> => {
  try {
    console.log('🔐 Custom signin for phone:', phone);

    // First verify OTP (you can add your OTP verification logic here)
    // For now, assuming OTP is valid

    // Find user in custom_users table
    const { data: users, error: findError } = await supabase
      .from('custom_users')
      .select('*')
      .eq('phone', phone);

    if (findError) {
      return { error: `Database error: ${findError.message}` };
    }

    if (!users || users.length === 0) {
      return { error: 'User not found. Please sign up first.' };
    }

    const user = users[0] as CustomUser;
    console.log('✅ User found in custom_users:', user.id);

    // Check if user is active
    if (!user.is_active) {
      return { error: 'Account is deactivated. Please contact support.' };
    }

    // Create custom session
    const session: CustomSession = {
      access_token: `custom_token_${user.id}_${Date.now()}`,
      refresh_token: `refresh_${user.id}_${Date.now()}`,
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      token_type: 'Bearer',
      expires_in: 24 * 60 * 60, // 24 hours in seconds
      user: user
    };

    console.log('✅ Custom signin successful for user:', user.id);
    saveAuthToStorage(user, session);
    return { user, session };
  } catch (error: any) {
    console.error('❌ Custom signin error:', error);
    return { error: error.message };
  }
};

export const signOut = async (): Promise<void> => {
  console.log('🔐 Custom signout');
  clearAuthStorage();
};
