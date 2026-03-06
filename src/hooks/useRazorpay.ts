import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionService } from '@/services/subscriptionService';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initializePayment = async (paymentData: {
    amount: number;
    currency?: string;
    orderType: 'subscription' | 'one_time';
    orderItems?: any;
    description?: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make a payment.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Initializing payment with data:', paymentData);

      // Create order via edge function
      const { data: orderResponse, error } = await supabase.functions.invoke('razorpay-order', {
        body: {
          amount: paymentData.amount,
          currency: paymentData.currency || 'INR',
          orderType: paymentData.orderType,
          orderItems: paymentData.orderItems,
          userId: user.id,
          userEmail: user.email,
          userPhone: user.phone,
        },
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message);
      }

      if (!orderResponse.success) {
        console.error('❌ Order creation failed:', orderResponse.error);
        throw new Error(orderResponse.error);
      }

      console.log('✅ Order created:', orderResponse);

      // Track payment initialization
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'InitiateCheckout', {
            user_id: user.id,
            order_id: orderResponse.orderId,
            value: paymentData.amount / 100,
            currency: paymentData.currency || 'INR',
            order_type: paymentData.orderType,
            plan_id: paymentData.orderItems?.planId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        console.log('🔄 Loading Razorpay script...');
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        });
        console.log('✅ Razorpay script loaded');
      }

      // Configure Razorpay options
      const options = {
        key: orderResponse.keyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Toyflix',
        description: paymentData.description || 'Payment for Toyflix services',
        order_id: orderResponse.orderId,
        handler: async (response: any) => {
          try {
            console.log('✅ Payment successful, verifying...', response);

            // Verify payment with better error handling
            try {
              const { data: verifyResponse, error: verifyError } = await supabase.functions.invoke('razorpay-verify', {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                  userEmail: user.email,
                  orderItems: paymentData.orderItems,
                },
              });

              if (verifyError) {
                console.error('❌ Payment verification failed:', verifyError);
                
                // Track payment failure
                try {
                  if (typeof window !== 'undefined' && window.cbq) {
                    window.cbq('track', 'PaymentFailed', {
                      user_id: user.id,
                      order_id: response.razorpay_order_id,
                      payment_id: response.razorpay_payment_id,
                      error_type: 'verification_error',
                      error_message: verifyError.message,
                      timestamp: new Date().toISOString()
                    });
                  }
                } catch (error) {
                  console.error('Analytics tracking error:', error);
                }
                
                toast({
                  title: "Confirming your order...",
                  description: "Taking you to your order details.",
                });
                // Still send user to order summary with payment details so they're not stuck
                queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
                queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
                sessionStorage.setItem('payment_success', 'true');
                setTimeout(() => {
                  window.location.href = `/order-summary?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
                }, 800);
                return;
              }

              if (!verifyResponse.success) {
                console.error('❌ Payment verification unsuccessful:', verifyResponse.error);
                
                // Track payment failure
                try {
                  if (typeof window !== 'undefined' && window.cbq) {
                    window.cbq('track', 'PaymentFailed', {
                      user_id: user.id,
                      order_id: response.razorpay_order_id,
                      payment_id: response.razorpay_payment_id,
                      error_type: 'verification_unsuccessful',
                      error_message: verifyResponse.error,
                      timestamp: new Date().toISOString()
                    });
                  }
                } catch (error) {
                  console.error('Analytics tracking error:', error);
                }
                
                toast({
                  title: "Confirming your order...",
                  description: "Taking you to your order details.",
                });
                // Still send user to order summary with payment details
                queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
                queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
                sessionStorage.setItem('payment_success', 'true');
                setTimeout(() => {
                  window.location.href = `/order-summary?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
                }, 800);
                return;
              }

              console.log('✅ Payment verified successfully:', verifyResponse);

              // Track successful payment
              try {
                if (typeof window !== 'undefined' && window.cbq) {
                  window.cbq('track', 'Purchase', {
                    user_id: user.id,
                    transaction_id: response.razorpay_payment_id,
                    value: paymentData.amount / 100,
                    currency: 'INR',
                    order_id: response.razorpay_order_id,
                    payment_method: 'razorpay',
                    order_type: paymentData.orderType,
                    plan_id: paymentData.orderItems?.planId,
                    upgrade_type: paymentData.orderItems?.upgradeType,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (error) {
                console.error('Analytics tracking error:', error);
              }

              // Invalidate subscription queries to refresh data
              queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
              queryClient.invalidateQueries({ queryKey: ['subscription-status'] });

              // Handle different order types
              if (paymentData.orderItems?.upgradeType === 'plan_change') {
                // Plan upgrade payment completed - now perform the actual upgrade
                console.log('🔄 Processing plan upgrade after payment...');
                
                try {
                  const { SubscriptionUpgrade } = await import('@/services/subscription/subscriptionUpgrade');
                  const upgradeResult = await SubscriptionUpgrade.upgradePlan(user.id, paymentData.orderItems.planId);
                  
                  if (upgradeResult.success) {
                    toast({
                      title: "Plan Upgraded Successfully! 🎉",
                      description: "Payment completed and your plan has been upgraded with cycle preservation.",
                    });
                    
                    // Navigate to dashboard after successful upgrade
                    setTimeout(() => {
                      window.location.href = '/dashboard';
                    }, 2000);
                  } else {
                    throw new Error(upgradeResult.message || 'Failed to complete plan upgrade');
                  }
                } catch (upgradeError: any) {
                  console.error('❌ Plan upgrade failed after payment:', upgradeError);
                  toast({
                    title: "Plan Upgrade Failed",
                    description: `Payment was successful but plan upgrade failed: ${upgradeError.message}. Please contact support.`,
                    variant: "destructive",
                  });
                }
              } else {
                // Regular subscription or other order types
                toast({
                  title: "Payment Successful! 🎉",
                  description: "Your payment has been processed successfully.",
                });

                // Navigate based on order type (short delay so success page appears quickly)
                if (paymentData.orderType === 'subscription') {
                  setTimeout(() => {
                    navigate('/payment-success', { 
                      state: { 
                        orderId: verifyResponse.orderId,
                        amount: paymentData.amount / 100,
                        planId: paymentData.orderItems?.planId
                      }
                    });
                  }, 800);
                } else {
                  setTimeout(() => {
                    navigate('/dashboard');
                  }, 800);
                }
              }

            } catch (verifyException) {
            console.error('❌ Payment verification exception:', verifyException);
            
            // Log the full payment details for debugging
            console.log('💳 Payment Details for Support:', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              amount: paymentData.amount,
              user_id: user.id,
              timestamp: new Date().toISOString()
            });
            
            // Payment was successful in Razorpay, but verification had issues
            // Invalidate caches anyway to check if subscription was created
            queryClient.invalidateQueries({ queryKey: ['subscription-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['entitlements-tracking'] });
            
            toast({
              title: "Payment Successful! ✅",
              description: "Redirecting to your order details...",
            });
            
            // Set payment success flag and redirect to order summary
            sessionStorage.setItem('payment_success', 'true');
            setTimeout(() => {
              window.location.href = `/order-summary?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
            }, 800);
            return;
          }

            console.log('✅ Payment verified and subscription created successfully');

            // Always invalidate caches and show success (even for edge cases)
            queryClient.invalidateQueries({ queryKey: ['subscription-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['entitlements-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['user-orders'] });
            queryClient.invalidateQueries({ queryKey: ['current-rentals'] });

            // Note: Order record is already created by razorpay-verify function
            // No need to create duplicate orders here

            toast({
              title: "Payment Successful! 🎉",
              description: "Redirecting to your order details...",
            });

            // Set payment success flag for order summary
            sessionStorage.setItem('payment_success', 'true');

            // Navigate to order summary to show order details (short delay so success page appears quickly)
            setTimeout(() => {
              window.location.href = `/order-summary?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
            }, 800);

          } catch (error: any) {
            console.error('❌ Payment processing failed:', error);
            toast({
              title: "Payment Processing Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user.first_name || '',
          email: user.email || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            console.log('⚠️ Payment cancelled by user');
            
            // Track payment cancellation
            try {
              if (typeof window !== 'undefined' && window.cbq) {
                window.cbq('track', 'CancelCheckout', {
                  user_id: user.id,
                  order_id: orderResponse.orderId,
                  value: paymentData.amount / 100,
                  currency: paymentData.currency || 'INR',
                  order_type: paymentData.orderType,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (error) {
              console.error('Analytics tracking error:', error);
            }
            
            toast({
              title: "Payment Cancelled",
              description: "Payment was cancelled by user.",
              variant: "destructive",
            });
          },
        },
      };

      console.log('🔄 Opening Razorpay modal with options:', {
        ...options,
        key: '***' + options.key.slice(-4),
      });

      const rzp = new window.Razorpay(options);
      
      // Track checkout modal opened
      try {
        if (typeof window !== 'undefined' && window.cbq) {
          window.cbq('track', 'CheckoutStarted', {
            user_id: user.id,
            order_id: orderResponse.orderId,
            value: paymentData.amount / 100,
            currency: paymentData.currency || 'INR',
            order_type: paymentData.orderType,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
      
      rzp.open();

    } catch (error: any) {
      console.error('❌ Payment initialization failed:', error);
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initializePayment,
    isLoading,
  };
};
