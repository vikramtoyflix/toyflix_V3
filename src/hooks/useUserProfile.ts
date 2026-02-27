
import { useCustomAuth } from '@/hooks/useCustomAuth';

export const useUserProfile = () => {
  const { user, loading } = useCustomAuth();

  const fetchProfile = async () => {
    // This function can be used to trigger a refresh in CustomAuthProvider if needed.
    // For now, it's a no-op because auth state is managed centrally.
  };

  return { profile: user, loading, refetch: fetchProfile };
};
