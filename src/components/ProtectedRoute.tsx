import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCustomAuthStatus } from "@/hooks/useCustomAuthStatus";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LOADING_TIMEOUT_MS = 12000;

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const {
    isAuthenticated,
    isPhoneVerified,
    isLoading,
    isCompletelySetup,
    isImpersonating
  } = useCustomAuthStatus() as any;

  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) return;
    setLoadingTimedOut(false);
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

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
        <div className="w-full max-w-md text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">
            {loadingTimedOut ? "Taking longer than usual…" : "Checking authentication…"}
          </p>
          {loadingTimedOut && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-primary font-medium underline hover:no-underline"
              >
                Refresh page
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-muted-foreground text-sm underline hover:no-underline"
              >
                Go to home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // When not fully set up, show a message instead of blank screen
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

  return <>{children}</>;
};

export default ProtectedRoute;
