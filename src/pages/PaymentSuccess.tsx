
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Home, Package } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { AzureDebugInfo } from "@/components/AzureDebugInfo";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const orderId = searchParams.get("order_id");
  const paymentId = searchParams.get("payment_id");

  useEffect(() => {
    // Show success toast on mount
    toast({
      title: "Payment Successful! 🎉",
      description: "Your subscription has been activated successfully.",
      duration: 5000,
    });
  }, [toast]);

  const handleGoToDashboard = () => {
    // Force a hard redirect to ensure auth state is properly checked
    window.location.href = "/dashboard";
  };

  const handleGoHome = () => {
    navigate("/");
  };

  const content = (
    <div className={`${isMobile ? 'pt-4 px-4' : 'pt-20 container mx-auto px-4'} py-8`}>
      <div className="max-w-2xl mx-auto text-center">
        <Card className={`${isMobile ? 'border-0 shadow-lg' : 'border shadow-xl'} bg-gradient-to-br from-green-50 to-emerald-50`}>
          <CardHeader className={`${isMobile ? 'pb-4' : 'pb-6'}`}>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-green-800 mb-2`}>
              Payment Successful!
            </CardTitle>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} text-green-700`}>
              Welcome to the Toyflix family! 🎉
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className={`${isMobile ? 'bg-white p-4' : 'bg-white p-6'} rounded-lg border border-green-200`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-gray-800 mb-4`}>
                What happens next?
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                    Your subscription is now active and ready to use
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                    Go to your dashboard to manage your toy selections
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600`}>
                    Your first toy delivery will arrive within 3-5 business days
                  </p>
                </div>
              </div>
            </div>

            {(orderId || paymentId) && (
              <div className={`${isMobile ? 'bg-gray-50 p-4' : 'bg-gray-50 p-6'} rounded-lg`}>
                <h4 className="font-semibold text-gray-800 mb-2">Payment Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {orderId && (
                    <p><span className="font-medium">Order ID:</span> {orderId}</p>
                  )}
                  {paymentId && (
                    <p><span className="font-medium">Payment ID:</span> {paymentId}</p>
                  )}
                </div>
              </div>
            )}

            <div className={`${isMobile ? 'space-y-3' : 'flex space-x-4'}`}>
              <Button 
                onClick={handleGoToDashboard}
                className={`${isMobile ? 'w-full' : 'flex-1'} bg-primary hover:bg-primary/90 text-white font-semibold py-3`}
              >
                <Package className="w-5 h-5 mr-2" />
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className={`${isMobile ? 'w-full' : 'flex-1'} py-3`}
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Debug info for Azure troubleshooting */}
        <AzureDebugInfo />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Payment Success" showHeader={true} showBottomNav={true}>
        <div className="min-h-screen bg-gray-50">
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {content}
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
