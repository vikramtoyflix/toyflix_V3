import React from 'react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomAuth } from '@/hooks/useCustomAuth';

const ClearWaterfallCache = () => {
  const queryClient = useQueryClient();
  const { user } = useCustomAuth();

  const clearWaterfallCache = () => {
    // Clear the specific waterfall query
    queryClient.removeQueries({ 
      queryKey: ['user-data-waterfall'] 
    });
    
    // Also clear any WooCommerce related queries
    queryClient.removeQueries({ 
      predicate: (query) => 
        query.queryKey.some(key => 
          typeof key === 'string' && key.includes('woocommerce')
        )
    });
    
    console.log('🧹 Cleared waterfall cache for debugging');
    
    // Trigger immediate refresh
    window.location.reload();
  };

  const testWaterfallDirectly = async () => {
    if (!user?.phone) {
      console.log('❌ No user phone available');
      return;
    }

    console.log('🧪 Testing waterfall directly...');
    console.log('📱 User phone:', user.phone);
    
    try {
      // Test the service directly
      const { StaticWebAppWooCommerceService } = await import('@/services/staticWebAppWooCommerceService');
      const result = await StaticWebAppWooCommerceService.getCompleteUserProfile(user.phone);
      
      console.log('🔍 Direct service test result:', result);
      
      if (result?.success && result?.user) {
        console.log('✅ Service works! WooCommerce user found:', result.user.display_name);
      } else {
        console.log('❌ Service returned no user data');
      }
      
    } catch (error) {
      console.error('💥 Direct service test failed:', error);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold text-yellow-800 mb-2">🔧 Waterfall Debug Tools</h3>
      
      <div className="space-y-2">
        <p className="text-sm text-yellow-700">
          Current user: {user?.phone || 'No phone'} | 
          ID: {user?.id || 'No ID'}
        </p>
        
        <div className="space-x-2">
          <Button 
            onClick={clearWaterfallCache}
            variant="outline"
            size="sm"
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            🧹 Clear Cache & Reload
          </Button>
          
          <Button 
            onClick={testWaterfallDirectly}
            variant="outline"
            size="sm"
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            🧪 Test Service Directly
          </Button>
        </div>
        
        <p className="text-xs text-yellow-600">
          1. Clear cache to force fresh waterfall check<br/>
          2. Test service directly to bypass React Query caching<br/>
          3. Check browser console for detailed logs
        </p>
      </div>
    </div>
  );
};

export default ClearWaterfallCache; 