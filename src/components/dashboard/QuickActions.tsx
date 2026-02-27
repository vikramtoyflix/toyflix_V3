
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ClipboardList, History, PauseCircle, HelpCircle, User, Settings } from 'lucide-react';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import PauseSubscriptionDialog from './PauseSubscriptionDialog';
import RaiseConcernDialog from './RaiseConcernDialog';
import EditProfileDialog from './EditProfileDialog';

const QuickActions = () => {
  const navigate = useNavigate();
  const { data: subscriptionData, isLoading: isSubscriptionLoading } = useUserSubscription();
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isConcernDialogOpen, setIsConcernDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const plan = subscriptionData?.plan;
  const canPause = !isSubscriptionLoading && plan && plan.features.pauseMonthsAllowed > 0;
  const isAdmin = !isRoleLoading && userRole === 'admin';

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate('/toys')} variant="outline" className="flex-col h-24">
              <BookOpen className="w-6 h-6 mb-2" />
              <span>View Catalog</span>
            </Button>
            <Button onClick={() => setIsProfileDialogOpen(true)} variant="outline" className="flex-col h-24">
              <User className="w-6 h-6 mb-2" />
              <span>Edit Profile</span>
            </Button>
            <Button onClick={() => navigate('/order-history')} variant="outline" className="flex-col h-24" disabled>
              <History className="w-6 h-6 mb-2" />
              <span>Order History</span>
            </Button>
            
            {canPause && (
              <Button onClick={() => setIsPauseDialogOpen(true)} variant="outline" className="flex-col h-24">
                <PauseCircle className="w-6 h-6 mb-2" />
                <span>Pause Plan</span>
              </Button>
            )}

            <Button 
              onClick={() => {
                // Import WhatsApp service dynamically
                import('@/services/whatsappService').then(({ WhatsAppService }) => {
                  WhatsAppService.openGeneralSupport({
                    inquiry: 'I need help with my ToyJoyBox subscription'
                  });
                });
              }} 
              variant="outline" 
              className="flex-col h-24"
            >
              <HelpCircle className="w-6 h-6 mb-2" />
              <span>WhatsApp Support</span>
            </Button>

            <Button onClick={() => navigate('/pricing')} variant="outline" className="flex-col h-24">
              <ClipboardList className="w-6 h-6 mb-2" />
              <span>View Plans</span>
            </Button>

            {isAdmin && (
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex-col h-24">
                <Settings className="w-6 h-6 mb-2" />
                <span>Admin Panel</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {canPause && plan && (
        <PauseSubscriptionDialog 
          open={isPauseDialogOpen} 
          onOpenChange={setIsPauseDialogOpen} 
          maxPauseMonths={plan.features.pauseMonthsAllowed} 
        />
      )}
      <RaiseConcernDialog
        open={isConcernDialogOpen}
        onOpenChange={setIsConcernDialogOpen}
      />
      <EditProfileDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </>
  );
};

export default QuickActions;
