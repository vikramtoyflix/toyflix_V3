import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Toy } from './types';

export const useRideOnToys = () => {
  return useQuery({
    queryKey: ['toys', 'ride-on'],
    queryFn: async (): Promise<Toy[]> => {
      console.log('Fetching ride-on toys data...');
      
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .eq('category', 'ride_on_toys')
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('name');

      if (error) {
        console.error('Error fetching ride-on toys:', error);
        throw error;
      }
      
      console.log('Ride-on toys data fetched:', data?.length, 'toys');
      return data as Toy[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Don't auto-refetch since data doesn't change often
    retry: (failureCount, error) => {
      if (failureCount < 2) {
        console.log(`Ride-on toys query retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
  });
};
