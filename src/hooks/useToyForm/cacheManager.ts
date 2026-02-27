
import { QueryClient } from '@tanstack/react-query';

export const invalidateToyCache = async (queryClient: QueryClient) => {
  console.log('Starting comprehensive cache invalidation...');
  
  try {
    // Invalidate all toy-related queries with more aggressive approach
    console.log('Invalidating main toys query...');
    await queryClient.invalidateQueries({ 
      queryKey: ['toys'],
      exact: false 
    });

    // Also invalidate category-specific queries
    console.log('Invalidating category queries...');
    await queryClient.invalidateQueries({ 
      queryKey: ['toys', 'category'],
      exact: false
    });

    // Force refetch of current queries
    console.log('Refetching active queries...');
    await queryClient.refetchQueries({ 
      queryKey: ['toys'],
      exact: false 
    });

    // Add a small delay to ensure cache is properly cleared
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Cache invalidation completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Cache invalidation failed:', error);
    return { success: false, error };
  }
};

export const optimisticUpdateToyCache = (queryClient: QueryClient, toyId: string, updatedData: any) => {
  console.log('Applying optimistic update for toy:', toyId, updatedData);
  
  try {
    // Update main toys list cache
    queryClient.setQueryData(['toys'], (oldData: any) => {
      if (!oldData) {
        console.log('No existing toys data found for optimistic update');
        return oldData;
      }
      
      const updatedToysData = oldData.map((toy: any) => 
        toy.id === toyId ? { ...toy, ...updatedData } : toy
      );
      
      console.log('Optimistic update applied to main toys cache');
      return updatedToysData;
    });
    
    // Update category-specific cache if it exists
    queryClient.setQueryData(['toys', 'category', 'all'], (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((toy: any) => 
        toy.id === toyId ? { ...toy, ...updatedData } : toy
      );
    });
    
    console.log('Optimistic update applied successfully');
  } catch (error) {
    console.error('Optimistic update failed:', error);
  }
};
