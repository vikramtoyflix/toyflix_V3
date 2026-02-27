
import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user';

export const useUserRole = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'user';
      
      // The role is now on the user object from custom auth
      if (user.role) {
        return user.role;
      }

      // As a fallback, query the function, though the user object should be the source of truth
      const { data, error } = await supabase
        .rpc('get_user_role_secure', { user_id_param: user.id });
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'user'; // Default to 'user' on error
      }
      
      return data as UserRole;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
