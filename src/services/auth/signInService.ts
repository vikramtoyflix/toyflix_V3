
import { useToast } from '@/hooks/use-toast';

export const createSignInService = (toast: ReturnType<typeof useToast>['toast']) => {
  const signIn = async (email: string, password: string) => {
    console.warn('signInWithPassword is deprecated and part of the old auth system. Please use OTP flow.');
    toast({
      title: "Sign in method deprecated",
      description: "Please use the phone number sign in.",
      variant: "destructive",
    });
    return { error: { message: 'Deprecated sign in method.' } };
  };

  return { signIn };
};
