
import { supabase } from "@/integrations/supabase/client";
import { ToyCategory } from "@/types/toy";
import { getStoredSession } from "@/hooks/auth/storage";

interface BulkOperationResult {
  success: boolean;
  message: string;
  processed?: number;
  failed?: number;
  errors?: string[];
}

class BulkOperationService {
  private async callBulkOperation(operation: string, toyIds: string[], data?: any): Promise<BulkOperationResult> {
    console.log(`🔧 BulkOperationService: Starting ${operation} for ${toyIds.length} toys`);
    console.log('🔧 BulkOperationService: Toy IDs:', toyIds);
    console.log('🔧 BulkOperationService: Additional data:', data);

    try {
      // Get the stored custom auth session
      console.log('🔧 BulkOperationService: Retrieving stored session...');
      const customSession = getStoredSession();
      
      if (!customSession) {
        console.error('❌ BulkOperationService: No custom session found');
        throw new Error('No custom session found. Please sign in again.');
      }

      if (!customSession.access_token) {
        console.error('❌ BulkOperationService: No access token in session');
        throw new Error('No valid authentication session found. Please sign in again.');
      }

      console.log('✅ BulkOperationService: Session found, access_token length:', customSession.access_token.length);
      console.log('🔧 BulkOperationService: Session user:', customSession.user?.id);

      const requestBody = {
        operation,
        toyIds,
        data
      };

      console.log('🔧 BulkOperationService: Calling admin-bulk-operations function...');
      console.log('🔧 BulkOperationService: Request body:', requestBody);

      const { data: result, error } = await supabase.functions.invoke('admin-bulk-operations', {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${customSession.access_token}`,
        },
      });

      console.log('🔧 BulkOperationService: Function response received');
      console.log('🔧 BulkOperationService: Result:', result);
      console.log('🔧 BulkOperationService: Error:', error);

      if (error) {
        console.error('❌ BulkOperationService: Function invocation error:', error);
        throw new Error(error.message || 'Bulk operation failed');
      }

      if (!result) {
        console.error('❌ BulkOperationService: No response from bulk operation service');
        throw new Error('No response from bulk operation service');
      }

      console.log('✅ BulkOperationService: Operation completed successfully');
      return result;

    } catch (error) {
      console.error('❌ BulkOperationService: Exception caught:', error);
      
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('❌ BulkOperationService: Error message:', errorMessage);
        console.error('❌ BulkOperationService: Error stack:', error.stack);
      }

      // Handle specific error cases
      if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
        errorMessage = 'Authentication failed. Please sign out and sign in again.';
      } else if (errorMessage.includes('Admin privileges')) {
        errorMessage = 'Admin privileges required for this operation.';
      } else if (errorMessage.includes('No valid authentication session') || errorMessage.includes('No custom session')) {
        errorMessage = 'Please sign in to perform this operation.';
      }

      return {
        success: false,
        message: errorMessage,
        processed: 0,
        failed: toyIds.length,
        errors: [errorMessage]
      };
    }
  }

  async bulkDeleteToys(toyIds: string[]): Promise<BulkOperationResult> {
    console.log('🚀 BulkOperationService: bulkDeleteToys called with:', toyIds.length, 'toys');
    return this.callBulkOperation('delete', toyIds);
  }

  async bulkUpdateToyCategory(toyIds: string[], category: ToyCategory): Promise<BulkOperationResult> {
    console.log('🚀 BulkOperationService: bulkUpdateToyCategory called');
    return this.callBulkOperation('update-category', toyIds, { category });
  }

  async bulkUpdateToyFeatured(toyIds: string[], featured: boolean): Promise<BulkOperationResult> {
    console.log('🚀 BulkOperationService: bulkUpdateToyFeatured called');
    return this.callBulkOperation('toggle-featured', toyIds, { featured });
  }

  async bulkUpdateToyPrice(toyIds: string[], priceChangePercent: number, isPercentage: boolean = true): Promise<BulkOperationResult> {
    console.log('🚀 BulkOperationService: bulkUpdateToyPrice called');
    const actualPercent = isPercentage ? priceChangePercent : (priceChangePercent * 100);
    return this.callBulkOperation('update-price', toyIds, { priceChangePercent: actualPercent });
  }
}

export const bulkOperationService = new BulkOperationService();
