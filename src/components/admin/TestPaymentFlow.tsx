import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { TestTube, CheckCircle, AlertCircle } from 'lucide-react';

export const TestPaymentFlow: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [isTestingOrder, setIsTestingOrder] = useState(false);
  const [isTestingVerify, setIsTestingVerify] = useState(false);
  const queryClient = useQueryClient();

  const testOrderCreation = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid user ID",
        variant: "destructive"
      });
      return;
    }

    setIsTestingOrder(true);
    try {
      console.log('🧪 Testing razorpay-order function...');

      // Call the razorpay-order function with test data
      const { data, error } = await supabase.functions.invoke('razorpay-order', {
        body: {
          amount: 153300, // ₹1533 in paise (Discovery Delight + GST)
          currency: 'INR',
          orderType: 'subscription',
          userId: userId.trim(),
          userEmail: 'test@example.com',
          userPhone: '+919876543210',
          orderItems: {
            planId: 'discovery_delight',
            baseAmount: 1299,
            gstAmount: 234,
            totalAmount: 1533,
            selectedToys: [
              { id: 'test-toy-1', name: 'Test Educational Toy' },
              { id: 'test-toy-2', name: 'Test Building Blocks' }
            ],
            ageGroup: '3-5',
            shippingAddress: {
              address_line1: 'Test Address 123',
              city: 'Test City',
              state: 'Test State',
              zip_code: '123456'
            }
          }
        }
      });

      if (error) {
        console.error('❌ Razorpay order creation failed:', error);
        throw new Error(error.message || 'Failed to create test order');
      }

      console.log('✅ Razorpay order created:', data);
      
      toast({
        title: "Order Creation Successful! ✅",
        description: `Test order ${data.orderId?.slice(0, 8)} created. Check payment_tracking table.`,
      });

    } catch (error: any) {
      console.error('❌ Test order creation failed:', error);
      toast({
        title: "Order Creation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingOrder(false);
    }
  };

  const testPaymentVerification = async () => {
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid user ID",
        variant: "destructive"
      });
      return;
    }

    setIsTestingVerify(true);
    try {
      console.log('🧪 Testing payment verification...');

      // First check if there's a recent payment_tracking entry for this user
      const { data: recentPayments } = await (supabase as any)
        .from('payment_tracking')
        .select('razorpay_order_id, status')
        .eq('user_id', userId.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!recentPayments || recentPayments.length === 0) {
        throw new Error('No payment tracking found for this user. Create an order first.');
      }

      const paymentTrack = recentPayments[0];
      
      if (paymentTrack.status === 'completed') {
        throw new Error('Payment already verified. Check for existing order or subscription.');
      }

      // Call the verification function with test data
      const { data, error } = await supabase.functions.invoke('razorpay-verify', {
        body: {
          razorpay_order_id: paymentTrack.razorpay_order_id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: 'test_signature_for_demo'
        }
      });

      console.log('🔍 Verification response:', { data, error });

      if (error) {
        console.error('❌ Payment verification failed:', error);
        throw new Error(error.message || 'Payment verification failed');
      }

      // Invalidate caches to refresh admin panel
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      
      toast({
        title: "Payment Verification Successful! 🎉",
        description: "Check admin orders and user dashboard for the created order.",
      });

    } catch (error: any) {
      console.error('❌ Test verification failed:', error);
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingVerify(false);
    }
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <TestTube className="w-5 h-5" />
          Test Payment Flow (Debug Tool)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 mb-3">
            <strong>Use this to test the complete payment flow:</strong>
          </p>
          <ul className="text-sm text-blue-700 space-y-1 ml-4">
            <li>• Step 1: Create test order (razorpay-order function)</li>
            <li>• Step 2: Verify test payment (razorpay-verify function)</li>
            <li>• Step 3: Check if order appears in admin panel</li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="testUserId" className="text-blue-800">
            User ID for Testing
          </Label>
          <Input
            id="testUserId"
            type="text"
            placeholder="Enter user UUID to test with"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border-blue-300 focus:border-blue-500"
          />
          <p className="text-xs text-blue-600">
            Get user ID from Users tab or use your own user ID
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={testOrderCreation}
            disabled={!userId.trim() || isTestingOrder}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isTestingOrder ? 'Creating Test Order...' : 'Step 1: Create Test Order'}
          </Button>

          <Button 
            onClick={testPaymentVerification}
            disabled={!userId.trim() || isTestingVerify}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isTestingVerify ? 'Testing Verification...' : 'Step 2: Test Payment Verification'}
          </Button>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 text-amber-800 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Important:</span>
          </div>
          <p className="text-xs text-amber-700">
            This creates real database records for testing. Use carefully and clean up test data if needed.
            Watch the browser console for detailed logs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestPaymentFlow; 