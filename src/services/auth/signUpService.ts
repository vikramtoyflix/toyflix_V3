
import { supabase } from '@/integrations/supabase/client';

export const createSignUpService = (toast: any) => {
  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    phone?: string
  ) => {
    console.warn('email/password signUp is deprecated. Please use OTP flow.');
    toast({
      title: "Sign up method deprecated",
      description: "Please use the phone number sign up.",
      variant: "destructive",
    });
    return { error: { message: 'Deprecated sign up method.' } };
  };

  return { signUp };
};
