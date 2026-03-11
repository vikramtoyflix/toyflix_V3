import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Home, Package, RefreshCw, Clock, CreditCard, Gift, MapPin, AlertCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatIndianDate } from "@/utils/dateUtils";

interface OrderDetails {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  toys_data: any[];
  shipping_address: any;
  subscription_plan: string;
  order_type: string;
  coupon_code?: string;
  discount_amount?: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  base_amount?: number;
  gst_amount?: number;
}

const OrderSummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useCustomAuth();
  
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(true);

  // Get URL parameters - prioritize the most reliable ones
  const paymentId = searchParams.get("payment_id") || searchParams.get("razorpay_payment_id");
  const orderId = searchParams.get("order_id") || searchParams.get("razorpay_order_id");
  const orderNumber = searchParams.get("order_number");
  
  // Payment info for immediate display
  const paymentAmount = searchParams.get("amount");
  const planId = searchParams.get("plan_id");
  const verificationFailed = searchParams.get("verification") === "failed";

  const fetchOrderDetails = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      console.log('🔍 Fetching order details:', { paymentId, orderId, orderNumber, user_id: user.id });

      let order = null;

      // Single optimized query - try payment ID first (most reliable)
      if (paymentId) {
        const { data, error } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .eq('razorpay_payment_id', paymentId)
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle to handle no results gracefully

        if (!error && data) {
          order = data;
          console.log('✅ Found order by payment ID');
        }
      }

      // Fallback: try razorpay_order_id (orderId from URL) - pending orders have this before payment_id
      if (!order && orderId) {
        const { data: orderByRazorpayId, error: orderByIdError } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .eq('razorpay_order_id', orderId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!orderByIdError && orderByRazorpayId) {
          order = orderByRazorpayId;
          console.log('✅ Found order by razorpay_order_id');
        }
      }

      // Fallback: try most recent order if payment ID search fails
      if (!order) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data, error } = await (supabase as any)
          .from('rental_orders')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          order = data;
          console.log('✅ Found recent order');
        }
      }

      if (order) {
        setOrderDetails(order);
        console.log('✅ Order loaded:', order.order_number);
      } else if (paymentId && orderId && user?.id) {
        // Reconcile: create/update rental_order when verify failed but payment succeeded
        console.log('🔄 Order not found, attempting reconcile...');
        try {
          const { data: reconcileData, error: reconcileError } = await supabase.functions.invoke('razorpay-reconcile', {
            body: {
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              userId: user.id,
            },
          });
          if (reconcileError) {
            console.warn('⚠️ Reconcile failed:', reconcileError.message);
          } else if (reconcileData?.success) {
            console.log('✅ Reconcile succeeded, refetching order...');
            // Refetch - order should now exist
            const { data: refetched } = await (supabase as any)
              .from('rental_orders')
              .select('*')
              .eq('razorpay_payment_id', paymentId)
              .eq('user_id', user.id)
              .maybeSingle();
            if (refetched) {
              setOrderDetails(refetched);
            }
          }
        } catch (reconcileErr) {
          console.warn('⚠️ Reconcile error:', reconcileErr);
        }
      } else {
        console.log('⚠️ Order not found, but payment was successful');
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  useEffect(() => {
    setShowPaymentSuccess(!verificationFailed);
    if (verificationFailed) {
      toast({
        title: "Verification in progress",
        description: "We're confirming your payment. You will not be charged twice. If your order doesn't appear soon, contact support.",
        variant: "default",
        duration: 8000,
      });
    } else {
      toast({
        title: "Payment Successful! 🎉",
        description: "Your payment has been processed successfully. Loading order details...",
        duration: 5000,
      });
    }
    fetchOrderDetails();
  }, [user, verificationFailed]);

  const handleGoToDashboard = () => {
    window.location.href = "/dashboard";
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const formatShippingAddress = (address: any): string => {
    if (!address) return 'Address will be confirmed via SMS/email';
    
    try {
      const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
      const parts = [];
      
      if (parsedAddress.first_name && parsedAddress.last_name) {
        parts.push(`${parsedAddress.first_name} ${parsedAddress.last_name}`);
      }
      
      if (parsedAddress.address_line1 || parsedAddress.address1) {
        parts.push(parsedAddress.address_line1 || parsedAddress.address1);
      }
      
      if (parsedAddress.city) parts.push(parsedAddress.city);
      if (parsedAddress.state) parts.push(parsedAddress.state);
      
      return parts.join(', ');
    } catch {
      return 'Address will be confirmed via SMS/email';
    }
  };

  const content = (
    <div className={`${isMobile ? 'pt-4 px-4' : 'pt-20 container mx-auto px-4'} py-8`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Payment status: success or verification pending */}
        <Card className={`${isMobile ? 'border-0 shadow-lg' : 'border shadow-xl'} mb-6 ${verificationFailed ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-gradient-to-br from-green-50 to-emerald-50'}`}>
          <CardHeader className={`${isMobile ? 'pb-4' : 'pb-6'} text-center`}>
            <div className="flex justify-center mb-4">
              {verificationFailed ? (
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-12 h-12 text-amber-600" />
                </div>
              ) : (
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              )}
            </div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 ${verificationFailed ? 'text-amber-800' : 'text-green-800'}`}>
              {verificationFailed ? "Confirming your payment" : "Payment Successful! 🎉"}
            </CardTitle>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} mb-4 ${verificationFailed ? 'text-amber-700' : 'text-green-700'}`}>
              {verificationFailed
                ? "We couldn't confirm your order automatically. You will not be charged twice. Our team will check and update your order shortly. Contact support if you have questions."
                : "Thank you for your payment! Your order has been confirmed."}
            </p>
            {!verificationFailed && (
              orderDetails ? (
                <Badge variant="default" className="bg-green-600 text-white px-4 py-2 text-lg">
                  Order #{orderDetails.order_number}
                </Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-600 text-white px-4 py-2 text-lg">
                    Payment Confirmed
                  </Badge>
                  {isLoadingOrder && (
                    <p className="text-sm text-green-600">
                      <RefreshCw className="w-4 h-4 inline mr-1 animate-spin" />
                      Loading order details...
                    </p>
                  )}
                </div>
              )
            )}
          </CardHeader>
        </Card>

        {/* Quick Payment Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentAmount && (
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Amount Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{paymentAmount}</p>
                </div>
              )}
              
              {planId && (
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="text-lg font-semibold text-blue-600 capitalize">{planId.replace('-', ' ')}</p>
                </div>
              )}
              
              {paymentId && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Payment ID</p>
                  <p className="text-xs font-mono text-gray-800">{paymentId.slice(-8)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Details (if loaded) */}
        {orderDetails && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Order #</span>
                    <p className="text-gray-900">{orderDetails.order_number}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date</span>
                    <p className="text-gray-900">{formatIndianDate(orderDetails.created_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status</span>
                    <Badge variant="secondary" className="mt-1">{orderDetails.status}</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment</span>
                    <Badge variant="default" className="mt-1">{orderDetails.payment_status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toys (if available) */}
            {orderDetails.toys_data && orderDetails.toys_data.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Your Toys ({orderDetails.toys_data.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {orderDetails.toys_data.slice(0, 4).map((toy: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        {toy.image_url && (
                          <img 
                            src={toy.image_url} 
                            alt={toy.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">{toy.name}</p>
                          <p className="text-xs text-gray-600">{toy.category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orderDetails.toys_data.length > 4 && (
                    <p className="text-sm text-gray-600 mt-2">
                      +{orderDetails.toys_data.length - 4} more toys
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{formatShippingAddress(orderDetails.shipping_address)}</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* What's Next - Always Show */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-green-600 font-medium">Payment Confirmed</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span>Order processing (within 24 hours)</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <span>Dispatch & tracking details via SMS</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                <span>Delivery (3-5 business days)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className={`${isMobile ? 'space-y-3' : 'flex space-x-4'}`}>
          <Button 
            onClick={handleGoToDashboard} 
            className={`${isMobile ? 'w-full' : 'flex-1'} bg-primary hover:bg-primary/90`}
          >
            <Package className="w-4 h-4 mr-2" />
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <Button 
            onClick={handleGoHome} 
            variant="outline" 
            className={`${isMobile ? 'w-full' : 'flex-1'}`}
          >
            <Home className="w-4 h-4 mr-2" />
            Continue Shopping
          </Button>
        </div>

        {/* Order Not Loaded Notice */}
        {!orderDetails && !isLoadingOrder && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 mb-1">
                    Order details are being processed
                  </p>
                  <p className="text-sm text-blue-700">
                    Your payment was successful and your order is confirmed. 
                    Complete order details will be available in your dashboard within a few minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return <MobileLayout>{content}</MobileLayout>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {content}
      <Footer />
    </div>
  );
};

export default OrderSummary; 