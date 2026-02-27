import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useNavigate } from "react-router-dom";
import { useUserFlow } from "@/hooks/useUserFlow";
import Header from "@/components/Header";
import QueueManagement from "@/components/subscription/QueueManagement";
import SubscriptionFlowContent from "@/components/subscription/SubscriptionFlowContent";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const SubscriptionFlow = () => {
  const { user } = useCustomAuth();
  const navigate = useNavigate();
  const { flowType } = useUserFlow();
  const isMobile = useIsMobile();

  // Authentication is now required - ProtectedRoute ensures user is authenticated

  // For authenticated users, check their flow type
  if (user) {
    // Existing user with subscription - show queue management
    if (flowType === 'existing_user_manage_queue') {
      const queueContent = (
        <div className={`${isMobile ? 'pt-4' : 'pt-20'} container mx-auto px-4 py-8`}>
          <QueueManagement />
        </div>
      );

      if (isMobile) {
        return (
          <MobileLayout title="Manage Queue" showHeader={true} showBottomNav={true}>
            <div className="min-h-screen bg-gray-50">
              {queueContent}
            </div>
          </MobileLayout>
        );
      }

      return (
        <div className="min-h-screen bg-background">
          <Header />
          {queueContent}
        </div>
      );
    }

    // Existing user but cannot manage queue
    if (flowType === 'existing_user_no_access') {
      const noAccessContent = (
        <div className={`${isMobile ? 'pt-4' : 'pt-20'} container mx-auto px-4 text-center`}>
          <h1 className="text-2xl font-bold mb-4">Queue Management</h1>
          <p className="text-muted-foreground mb-6">
            You can only modify your toy selection during the selection window (Day 24-30 of your cycle).
          </p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      );

      if (isMobile) {
        return (
          <MobileLayout title="Queue Management" showHeader={true} showBottomNav={true}>
            <div className="min-h-screen bg-gray-50">
              {noAccessContent}
            </div>
          </MobileLayout>
        );
      }

      return (
        <div className="min-h-screen bg-background">
          <Header />
          {noAccessContent}
        </div>
      );
    }
  }

  // Since authentication is required, user is always authenticated here
  if (isMobile) {
    return (
      <MobileLayout title="Subscribe" showHeader={true} showBottomNav={true}>
        <div className="min-h-screen bg-gray-50">
          <SubscriptionFlowContent />
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SubscriptionFlowContent />
    </div>
  );
};

export default SubscriptionFlow; 