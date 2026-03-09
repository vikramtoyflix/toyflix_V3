
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCustomAuthStatus } from "@/hooks/useCustomAuthStatus";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const {
    isAuthenticated,
    isPhoneVerified,
    isAdmin,
    isLoading,
    needsPhoneVerification,
    isCompletelySetup,
    isImpersonating,
    user
  } = useCustomAuthStatus() as any;
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AdminRoute check:', { 
      isAuthenticated,
      isPhoneVerified,
      isAdmin,
      isLoading,
      needsPhoneVerification,
      isCompletelySetup,
      isImpersonating,
      currentPath: location.pathname,
      user: user,
      role: user?.role
    });

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to auth');
      navigate("/auth", { replace: true });
      return;
    }

    if (needsPhoneVerification && !isImpersonating) {
      console.log('Phone not verified, redirecting for verification');
      navigate("/auth", { replace: true });
      return;
    }

    // 🎭 During impersonation, don't enforce admin role (admin is impersonating regular user)
    if (!isAdmin && !isImpersonating) {
      console.log('User does not have admin role, redirecting to dashboard. User:', user);
      navigate("/dashboard", { replace: true });
      return;
    }

    console.log('Admin access granted for:', location.pathname, 'User:', user, isImpersonating ? '(via impersonation)' : '');
  }, [
    isAuthenticated,
    isPhoneVerified,
    isAdmin,
    isLoading,
    needsPhoneVerification,
    isCompletelySetup,
    isImpersonating,
    navigate,
    location.pathname,
    user
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying admin access...</p>
          {user && (
            <p className="mt-2 text-sm text-muted-foreground">
              Checking permissions for {user.phone || user.email}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!isCompletelySetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-muted-foreground">Please complete your account setup to continue.</p>
          <button
            type="button"
            onClick={() => navigate("/auth?redirect=" + encodeURIComponent(location.pathname + location.search))}
            className="text-primary font-medium underline hover:no-underline"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isImpersonating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-lg font-medium text-foreground mb-2">Admin access could not be verified</p>
          <p className="text-sm text-muted-foreground mb-4">
            If you are an admin, try signing out and signing in again, or refresh the page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
