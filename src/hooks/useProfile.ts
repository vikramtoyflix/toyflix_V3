
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  subscription_plan: 'Discovery Delight' | 'Silver Pack' | 'Gold Pack PRO' | 'basic' | 'premium' | 'family' | null;
  subscription_active: boolean | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user, session } = useCustomAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user || !session?.access_token) {
        return null;
      }

      // Skip Supabase profile for users with +91 phone numbers (WooCommerce users)
      if (user.phone?.startsWith('+91')) {
        console.log('⏭️ Skipping Supabase profile for WooCommerce user');
        return null;
      }

      const { data, error } = await supabase.rpc('get_user_profile', {
        p_session_token: session.access_token,
      });

      if (error) {
        console.error('Error fetching profile:', error);
        throw new Error(error.message);
      }
      return data as Profile;
    },
    enabled: !!user && !!session?.access_token && !user.phone?.startsWith('+91'),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, session } = useCustomAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user || !session?.access_token) {
        throw new Error('User not authenticated to update profile.');
      }

      const { data, error } = await supabase.rpc('update_user_profile', {
        p_updates: updates,
        p_session_token: session.access_token,
      });

      if (error) {
        console.error('Supabase profile update error:', JSON.stringify(error, null, 2));
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (data, variables) => {
      // Track profile update
      try {
        if (typeof window !== 'undefined' && window.cbq && user?.id) {
          window.cbq('track', 'ProfileUpdated', {
            user_id: user.id,
            updated_fields: Object.keys(variables),
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
};
