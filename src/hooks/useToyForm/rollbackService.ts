
import { QueryClient } from '@tanstack/react-query';
import { fetchToyData } from './toyService';
import { invalidateToyCache } from './cacheManager';

export class RollbackService {
  static async storeOriginalData(
    queryClient: QueryClient, 
    id: string
  ): Promise<any> {
    try {
      const { fetchToyData } = await import('./toyService');
      const original = await queryClient.fetchQuery({
        queryKey: ['toy', id],
        queryFn: () => fetchToyData(id)
      });
      console.log('Stored original toy data for rollback:', original);
      return original;
    } catch (error) {
      console.warn('Could not store original data for rollback:', error);
      return null;
    }
  }

  static async performRollback(
    queryClient: QueryClient,
    toyId: string,
    originalData: any
  ): Promise<void> {
    if (!originalData) {
      console.warn('No original data available for rollback');
      return;
    }

    try {
      console.log('Reverting optimistic update due to error');
      
      // Attempt to restore original data in cache
      queryClient.setQueryData(['toys'], (oldData: any) => {
        if (oldData) {
          return oldData.map((toy: any) => toy.id === toyId ? originalData : toy);
        }
        return oldData;
      });
      
      console.log('Successfully rolled back to original toy data');
      await invalidateToyCache(queryClient);
    } catch (rollbackError) {
      console.error('Failed to rollback to original data:', rollbackError);
    }
  }
}
