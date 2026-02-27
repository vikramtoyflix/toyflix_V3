
export const generateUserSession = async (supabase: any, userId: string) => {
  console.log('Generating session for user ID:', userId);
  
  try {
    // Get the user data first
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      console.error('Failed to get user:', userError);
      throw new Error('User not found');
    }

    console.log('Retrieved user data successfully');

    // Use the admin API to generate a recovery link which contains valid tokens
    const { data: recoveryData, error: recoveryError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: userData.user.email
    });

    if (recoveryError || !recoveryData) {
      console.error('Failed to generate recovery link:', recoveryError);
      throw new Error('Failed to generate session tokens');
    }

    console.log('Recovery link generated successfully');

    // Extract the token from the recovery link
    const recoveryUrl = recoveryData.properties?.action_link;
    if (!recoveryUrl) {
      console.error('No action link in recovery response');
      throw new Error('Failed to extract recovery link');
    }

    // Parse the URL to extract the access_token and refresh_token
    const url = new URL(recoveryUrl);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Failed to extract tokens from recovery URL');
      throw new Error('Failed to extract session tokens from recovery link');
    }

    console.log('Session tokens extracted successfully from recovery link');

    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userData.user,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: userData.user,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expiresAt
      }
    };

  } catch (error) {
    console.error('Error in generateUserSession:', error);
    throw new Error(`Session generation failed: ${error.message}`);
  }
};
