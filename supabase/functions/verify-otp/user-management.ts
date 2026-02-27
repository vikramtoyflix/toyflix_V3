import { corsHeaders } from './types.ts';

export const checkExistingAuthUser = async (supabase: any, phone: string) => {
  console.log('Checking for existing auth user with phone:', phone);
  
  // Use admin API to check if user already exists in auth.users
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Failed to list users:', error);
    return null;
  }

  // Find user by phone in metadata or phone field
  const existingUser = users.users?.find((user: any) => 
    user.phone === phone || user.user_metadata?.phone === phone
  );

  console.log('Existing auth user found:', !!existingUser);
  return existingUser;
};

export const recreateOrphanedProfile = async (supabase: any, user: any, phone: string) => {
  console.log('Recreating orphaned profile for user:', user.id);
  
  // Create or update the profile for the orphaned user
  const { error } = await supabase
    .from('custom_users')
    .upsert({
      id: user.id,
      email: user.email,
      phone: phone,
      phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (error) {
    console.error('Failed to recreate profile:', error);
    throw new Error('Failed to recreate user profile');
  }

  console.log('Profile recreated successfully for user:', user.id);
  return {
    id: user.id,
    email: user.email,
    phone: phone,
    phone_verified: true,
    first_name: null,
    last_name: null
  };
};

export const createUserAccountWithPhone = async (supabase: any, phone: string) => {
  // Generate a temporary email for Supabase auth (required by Supabase)
  const tempEmail = `user_${phone.replace('+', '')}@toyflix.app`;
  const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  console.log('Creating new user account for phone:', phone);
  
  // Create user account with temporary credentials
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: tempEmail,
    password: tempPassword,
    phone: phone,
    user_metadata: {
      phone: phone,
      phone_verified: true
    },
    email_confirm: true // Skip email confirmation
  });

  if (authError || !authData.user) {
    console.error('Failed to create user account:', authError);
    throw new Error('Failed to create user account');
  }

  console.log('User account created successfully:', authData.user.id);

  // Create profile entry for the new user
  const { error: profileError } = await supabase
    .from('custom_users')
    .insert({
      id: authData.user.id,
      email: tempEmail,
      phone: phone,
      phone_verified: true
    });

  if (profileError) {
    console.error('Failed to create profile:', profileError);
    // Don't throw error here as user account was created successfully
  }

  return authData.user;
};
