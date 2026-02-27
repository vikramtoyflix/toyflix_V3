
import { UserProfile, corsHeaders } from './types.ts';

export const createSuccessResponse = (profile: UserProfile, sessionData: any) => {
  console.log('OTP verified successfully for user:', profile.id, 'session created');
  console.log('Session data received for success response');

  // Extract tokens from the session data
  const accessToken = sessionData?.access_token;
  const refreshToken = sessionData?.refresh_token;

  console.log('Extracted tokens - Access:', !!accessToken, 'Refresh:', !!refreshToken);

  if (!accessToken || !refreshToken) {
    console.error('Missing session tokens in response');
    throw new Error('Failed to generate valid session tokens');
  }

  return new Response(
    JSON.stringify({ 
      message: 'OTP verified successfully',
      user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      redirect_to: 'dashboard'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

export const createNewUserResponse = (phone: string, user: any, sessionData: any) => {
  console.log('New user created for verified phone:', phone);
  console.log('Session data for new user received');

  // Extract tokens from the session data
  const accessToken = sessionData?.access_token;
  const refreshToken = sessionData?.refresh_token;

  console.log('Extracted tokens for new user - Access:', !!accessToken, 'Refresh:', !!refreshToken);

  if (!accessToken || !refreshToken) {
    console.error('Missing session tokens in new user response');
    throw new Error('Failed to generate valid session tokens for new user');
  }

  return new Response(
    JSON.stringify({ 
      message: 'Phone verified and account created',
      user_id: user.id,
      verified_phone: phone,
      action: 'profile_setup_required',
      access_token: accessToken,
      refresh_token: refreshToken,
      redirect_to: 'profile_setup'
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

export const createErrorResponse = (message: string, status: number = 400) => {
  console.error('Creating error response:', message);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};
