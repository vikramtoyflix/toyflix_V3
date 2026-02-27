
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QueryClient } from '@tanstack/react-query';
import { signOut as customSignOut } from '@/hooks/auth/authActions';

export const createSignOutService = (
  toast: ReturnType<typeof useToast>['toast'],
  queryClient?: QueryClient
) => {
  const signOut = async () => {
    try {
      // Clear all cached queries before signing out
      if (queryClient) {
        queryClient.clear();
        queryClient.invalidateQueries();
      }

      // Track user logout
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          window.cbq('track', 'Logout', {
            user_id: userId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      await customSignOut();
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error('Signout exception:', error);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return { signOut };
};
