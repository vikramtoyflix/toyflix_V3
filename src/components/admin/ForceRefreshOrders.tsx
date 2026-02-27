import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const ForceRefreshOrders: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleForceRefresh = async () => {
    toast({
      title: "🔄 Force Refreshing...",
      description: "Clearing all caches and reloading order data",
    });

    try {
      // Clear all React Query caches
      queryClient.clear();
      
      // Invalidate all queries
      await queryClient.invalidateQueries();
      
      // Force refetch specific order queries
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['admin-orders'] }),
        queryClient.refetchQueries({ queryKey: ['rental-orders'] }),
        queryClient.refetchQueries({ queryKey: ['user-orders'] }),
        queryClient.refetchQueries({ queryKey: ['subscription-tracking'] }),
        queryClient.refetchQueries({ queryKey: ['payment-orders'] }),
      ]);

      toast({
        title: "✅ Cache Cleared!",
        description: "All order data has been refreshed. Orders should now be visible.",
      });

    } catch (error) {
      toast({
        title: "❌ Refresh Failed",
        description: "Error clearing cache. Try a browser hard refresh.",
        variant: "destructive",
      });
    }
  };

  const handleHardRefresh = () => {
    toast({
      title: "🔄 Hard Refresh",
      description: "Forcing browser reload...",
    });
    
    // Clear browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force hard reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="w-5 h-5" />
          Order Display Issues? Force Refresh
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-800 mb-3">
            If orders are not appearing in the admin panel or dashboard, the issue is likely a cache problem.
            Your orders ARE in the database - this forces the frontend to refresh.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={handleForceRefresh}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear React Cache
            </Button>
            
            <Button 
              onClick={handleHardRefresh}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hard Browser Refresh
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-orange-600 space-y-1">
          <p><strong>Alternative methods:</strong></p>
          <p>• Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)</p>
          <p>• Open browser Dev Tools → Right-click refresh → "Empty Cache and Hard Reload"</p>
          <p>• Try opening admin panel in incognito/private browser window</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForceRefreshOrders; 