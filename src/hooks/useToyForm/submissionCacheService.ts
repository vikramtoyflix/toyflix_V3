
import { QueryClient } from '@tanstack/react-query';
import { invalidateToyCache } from './cacheManager';

export class SubmissionCacheService {
  static async refreshCache(queryClient: QueryClient): Promise<{ success: boolean; error?: any }> {
    console.log('Refreshing toy data with enhanced cache invalidation...');
    const cacheResult = await invalidateToyCache(queryClient);
    
    if (!cacheResult.success) {
      console.warn('Cache invalidation had issues:', cacheResult.error);
      return { success: false, error: cacheResult.error };
    }

    // Force refresh after successful save with delay to prevent conflicts
    console.log('Scheduling cache refresh...');
    setTimeout(async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: ['toys'] });
        await queryClient.refetchQueries({ queryKey: ['toys'] });
        console.log('Cache refresh completed successfully');
      } catch (error) {
        console.error('Cache refresh failed:', error);
      }
    }, 1000);

    return { success: true };
  }
}
