
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NetworkService } from '@/services/networkService';

export const createResilientSignInService = (toast: ReturnType<typeof useToast>['toast']) => {
  const getErrorMessage = (error: any): string => {
    const message = error?.message || error?.toString() || 'Unknown error';
    
    // Map technical errors to user-friendly messages
    if (message.includes('Load failed') || message.includes('fetch')) {
      return 'Connection failed. Please check your internet connection and try again.';
    }
    
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    
    if (message.includes('Too many requests')) {
      return 'Too many sign-in attempts. Please wait a moment before trying again.';
    }
    
    return message;
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting resilient signin for:', email);
      
      // Check initial connectivity
      const isOnline = await NetworkService.checkConnectivity();
      if (!isOnline) {
        const offlineError = new Error('No internet connection. Please check your connection and try again.');
        toast({
          title: "Connection Error",
          description: offlineError.message,
          variant: "destructive",
        });
        return { error: offlineError };
      }

      // Attempt sign-in with retry logic
      const result = await NetworkService.withRetry(
        async () => {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (error) {
            throw error;
          }
          
          return data;
        },
        2, // Max 2 retries for auth (total 3 attempts)
        1500 // 1.5 second backoff
      );

      console.log('Resilient signin successful');
      return { error: null };

    } catch (error: any) {
      console.error('Resilient signin error:', error);
      
      const userMessage = getErrorMessage(error);
      
      toast({
        title: "Sign in failed",
        description: userMessage,
        variant: "destructive",
      });

      return { error };
    }
  };

  return { signIn };
};
