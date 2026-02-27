import { useQuery } from '@tanstack/react-query';
import { fetchToys, fetchToysByCategory } from './toyQueries';
import { useRealtimeSubscription } from './realtimeSubscription';

export const useToys = () => {
  const queryResult = useQuery({
    queryKey: ['toys'],
    queryFn: fetchToys,
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
    refetchInterval: false, // Disable automatic polling - use real-time subscription instead
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Only refetch if data is stale
    retry: (failureCount, error) => {
      if (failureCount < 2) { // Reduce retry attempts from 3 to 2
        console.log(`Query retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
  });

  // Set up real-time subscription with improved conflict handling
  const { pauseSubscription, resumeSubscription } = useRealtimeSubscription(queryResult.refetch);

  return {
    ...queryResult,
    forceRefresh: () => {
      console.log('Force refreshing toys data...');
      // Pause real-time updates during manual refresh
      pauseSubscription();
      return queryResult.refetch().finally(() => {
        // Resume real-time updates after refresh with longer delay
        setTimeout(resumeSubscription, 1000);
      });
    }
  };
};

export const useToysByCategory = (category?: string) => {
  return useQuery({
    queryKey: ['toys', 'category', category],
    queryFn: () => fetchToysByCategory(category),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (failureCount < 2) {
        console.log(`Category query retry attempt ${failureCount + 1}`);
        return true;
      }
      return false;
    },
  });
};

// Re-export types for convenience
export type { Toy, ToyCategory } from './types';
