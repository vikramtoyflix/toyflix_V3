import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubscriptionAccessGuardProps {
  children: ReactNode;
  requireActiveSubscription?: boolean;
}

const SubscriptionAccessGuard = ({ 
  children, 
  requireActiveSubscription = false 
}: SubscriptionAccessGuardProps) => {
  const accessLevel = requireActiveSubscription ? 'subscribed' : 'verified';
  const { hasAccess, isLoading, redirectTo, reason } = useAccessControl(accessLevel);
  const { user } = useCustomAuth();
  const navigate = useNavigate();

  const handleSubscribeClick = () => {
    if (!user) {
      navigate('/auth?redirect=%2Fsubscription-flow');
    } else {
      navigate('/subscription-flow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Loading...</h3>
          <p className="text-muted-foreground">Checking your subscription status...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription className="text-center">
            <h3 className="text-lg font-semibold mb-2">Catalog Access Notice</h3>
            <p className="mb-4">{reason}</p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
              {requireActiveSubscription && (
                <Button onClick={handleSubscribeClick}>
                  Subscribe Now
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionAccessGuard;
