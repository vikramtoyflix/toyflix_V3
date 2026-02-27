
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAccessControl, AccessLevel } from '@/hooks/useAccessControl';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessGuardProps {
  children: ReactNode;
  requiredLevel: AccessLevel;
  fallbackComponent?: ReactNode;
}

const AccessGuard = ({ 
  children, 
  requiredLevel,
  fallbackComponent
}: AccessGuardProps) => {
  const { hasAccess, isLoading, redirectTo, reason } = useAccessControl(requiredLevel);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }

    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertDescription className="text-center">
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="mb-4">{reason || 'You do not have permission to access this resource.'}</p>
            <div className="flex justify-center gap-4">
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
              <Button onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};

export default AccessGuard;
