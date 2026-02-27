
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle } from "lucide-react";

const ConfirmationSuccessContent = () => {
  const { user, loading } = useCustomAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // If user is confirmed and logged in, start countdown to redirect
    if (user && !loading) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/dashboard");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [user, loading, navigate]);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const handleBackToAuth = () => {
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Confirming your email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-primary mb-2">{t('toyflix')}</div>
            <CardTitle className="text-green-600">Email Confirmed!</CardTitle>
            <CardDescription>
              Your email has been successfully confirmed. Welcome to Toyflix!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to your dashboard in {countdown} seconds...
              </p>
              <Button 
                onClick={handleGoToDashboard} 
                className="w-full"
              >
                Go to Dashboard Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">{t('toyflix')}</div>
          <CardTitle>Email Confirmation</CardTitle>
          <CardDescription>
            There was an issue confirming your email. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleBackToAuth} 
            className="w-full"
            variant="outline"
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const ConfirmationSuccess = () => {
  return (
    <LanguageProvider>
      <ConfirmationSuccessContent />
    </LanguageProvider>
  );
};

export default ConfirmationSuccess;
