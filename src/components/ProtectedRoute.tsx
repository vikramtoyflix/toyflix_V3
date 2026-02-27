
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCustomAuthStatus } from "@/hooks/useCustomAuthStatus";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const {
    isAuthenticated,
    isPhoneVerified,
    isLoading,
    isCompletelySetup,
    isImpersonating
  } = useCustomAuthStatus() as any;
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      return;
    }

    // If phone not verified (and not impersonating), redirect to auth
    if (!isPhoneVerified && !isImpersonating) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      return;
    }
  }, [
    isAuthenticated,
    isPhoneVerified,
    isLoading,
    navigate,
    location.pathname,
    isCompletelySetup,
    isImpersonating
  ]);

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not completely set up (unless impersonating)
  if (!isCompletelySetup) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
