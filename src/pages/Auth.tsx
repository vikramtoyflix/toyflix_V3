import { Navigate, useSearchParams } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import SignupFirstAuth from "@/components/auth/SignupFirstAuth";
import { E2EAdminLoginForm } from "@/components/auth/E2EAdminLoginForm";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const Auth = () => {
  const { user, loading } = useCustomAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  // Show loading while checking auth state
  if (loading) {
    const loadingContent = (
      <div className={`min-h-screen flex items-center justify-center ${isMobile ? 'bg-gray-50' : 'bg-gradient-to-br from-primary/10 via-background to-secondary/20'} p-4`}>
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <MobileLayout showHeader={false} showBottomNav={false}>
          {loadingContent}
        </MobileLayout>
      );
    }
    return loadingContent;
  }

  // If user is authenticated, handle redirects
  if (user) {
    // Check for fresh signup redirect to success page
    const isFromSignup = searchParams.get('from') === 'signup';
    if (isFromSignup) {
      // Redirect to signup success page for analytics tracking
      return <Navigate to="/signup-success" replace />;
    }

    // Check for explore more flow
    const isFromExplore = searchParams.get('from') === 'explore';
    if (isFromExplore) {
      // Redirect to toys page after signup from explore more
      return <Navigate to="/toys" replace />;
    }

    // Check for trial flow
    const isFromTrial = searchParams.get('from') === 'trial';
    if (isFromTrial) {
      // Redirect to toys page after trial signup
      return <Navigate to="/toys?trial=active" replace />;
    }

    // Check for lead capture flow
    const isFromLeadCapture = searchParams.get('from') === 'lead-capture';
    if (isFromLeadCapture) {
      // Redirect to pricing page after lead capture
      return <Navigate to="/pricing?lead=captured" replace />;
    }

    // Check for referral flow
    const isFromReferral = searchParams.get('from') === 'referral';
    if (isFromReferral) {
      // Redirect to dashboard after referral signup
      return <Navigate to="/dashboard?referral=active" replace />;
    }

    // Check for redirect parameter — only allow relative paths (no open redirect)
    const redirectTo = searchParams.get('redirect');
    if (redirectTo) {
      const decodedRedirect = decodeURIComponent(redirectTo);
      // Reject absolute URLs (http/https/protocol-relative) to prevent open redirect
      if (decodedRedirect.startsWith('/') && !decodedRedirect.startsWith('//')) {
        return <Navigate to={decodedRedirect} replace />;
      }
    }

    // Check for ride-on toy selection (legacy support)
    const rideOnSelection = sessionStorage.getItem('ride-on-selection');
    if (rideOnSelection) {
      try {
        const selection = JSON.parse(rideOnSelection);
        sessionStorage.removeItem('ride-on-selection');
        if (selection?.toyId) {
          return <Navigate to={`/subscription-flow?rideOnToy=${selection.toyId}`} replace />;
        }
      } catch {
        sessionStorage.removeItem('ride-on-selection');
      }
    }
    
    // Default redirect for authenticated users
    return <Navigate to="/dashboard" replace />;
  }

  // OTP-based auth (SignupFirstAuth) is always the primary path for customers.
  // E2EAdminLoginForm renders only when VITE_E2E_LOGIN_ENABLED=true (E2E builds); production never sets it.
  const authContent = (
    <div className={`min-h-screen flex items-center justify-center ${isMobile ? "bg-background" : "bg-slate-50/50"} p-4 sm:p-6`}>
      <div className="w-full max-w-md space-y-4">
        <E2EAdminLoginForm />
        <SignupFirstAuth />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout showHeader={false} showBottomNav={false}>
        {authContent}
      </MobileLayout>
    );
  }

  return authContent;
};

export default Auth;
