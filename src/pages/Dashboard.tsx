import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import RentalOrdersOnlyDashboard from "@/components/dashboard/RentalOrdersOnlyDashboard";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import ImpersonationBanner from "@/components/admin/ImpersonationBanner";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { user } = useCustomAuth();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const queryClient = useQueryClient();

  // Debug: Log user info and impersonation status
  useEffect(() => {
    console.log('🏠 Dashboard - Current user:', {
      id: user?.id,
      role: user?.role,
      name: user?.first_name || 'Unknown',
      isImpersonating: localStorage.getItem('admin_impersonation_session') !== null
    });
  }, [user]);

  // Check if user just completed a payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success') === 'true';
    const sessionPaymentSuccess = sessionStorage.getItem('payment_success') === 'true';
    
    if (paymentSuccess || sessionPaymentSuccess) {
      setShowPaymentSuccess(true);
      
      // Force refresh of dashboard data after payment
      queryClient.invalidateQueries({ queryKey: ['supabase-dashboard'] });
      
      // Clear the success indicators
      if (paymentSuccess) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      sessionStorage.removeItem('payment_success');
      
      // Auto-hide the success message after 10 seconds
      const timer = setTimeout(() => {
        setShowPaymentSuccess(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  const content = (
    <ProtectedRoute>
      <ImpersonationBanner />
      <div className={`min-h-screen ${isMobile ? 'bg-gray-50' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`} style={{paddingTop: 'var(--impersonation-banner-height, 0px)'}}>
        {!isMobile && <DashboardHeader />}
        
        {/* Payment Success Banner */}
        {showPaymentSuccess && (
          <div className={`${isMobile ? 'px-4 pt-4' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4'}`}>
            <Card className="border-green-200 bg-green-50">
              <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} bg-green-500 rounded-full flex items-center justify-center`}>
                      <Zap className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-white`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium text-green-800`}>
                      Payment Successful! 🎉
                    </h3>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-green-700 mt-1`}>
                      Your subscription is now active. Your dashboard is updating with the latest information.
                    </p>
                  </div>
                  <Badge variant="default" className={`${isMobile ? 'text-xs px-2' : ''} bg-green-600`}>
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard */}
        <div className={isMobile ? '' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'}>
          <RentalOrdersOnlyDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Dashboard" showHeader={true} showBottomNav={true}>
        {content}
      </MobileLayout>
    );
  }

  return content;
};

export default Dashboard;
