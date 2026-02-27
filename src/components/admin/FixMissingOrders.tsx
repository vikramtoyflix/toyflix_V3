import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const FixMissingOrders: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateOrder = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid user ID",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      console.log('🔄 Creating order for user:', userId);

      // Call the backup order creation function
      const { data, error } = await supabase.functions.invoke('create-order-from-subscription', {
        body: { userId: userId.trim() }
      });

      if (error) {
        console.error('❌ Error creating order:', error);
        throw new Error(error.message || 'Failed to create order');
      }

      console.log('✅ Order creation response:', data);

      // Invalidate caches to refresh the admin panel
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      
      toast({
        title: "Order Created! 🎉",
        description: data.message || `Order ${data.orderId?.slice(0, 8)} created successfully`,
      });

      // Clear the input
      setUserId('');

    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      toast({
        title: "Failed to Create Order",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-5 h-5" />
          Fix Missing Orders (Temporary Tool)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-100 p-4 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800 mb-3">
            <strong>Use this tool if:</strong>
          </p>
          <ul className="text-sm text-amber-700 space-y-1 ml-4">
            <li>• A user completed payment successfully</li>
            <li>• Their subscription is active in the dashboard</li>
            <li>• But no order appears in the admin panel</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="userId" className="text-amber-800">
            User ID
          </Label>
          <Input
            id="userId"
            type="text"
            placeholder="Enter user UUID (from custom_users table)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border-amber-300 focus:border-amber-500"
          />
          <p className="text-xs text-amber-600">
            Find the user ID in the Users tab → View user details
          </p>
        </div>

        <Button 
          onClick={handleCreateOrder}
          disabled={!userId.trim() || isCreating}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isCreating ? 'Creating Order...' : 'Create Order from Subscription'}
        </Button>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">How it works:</span>
          </div>
          <p className="text-xs text-green-700">
            This tool finds the user's active subscription and creates the missing order record for admin tracking. 
            It won't charge the user again or affect their existing subscription.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FixMissingOrders; 