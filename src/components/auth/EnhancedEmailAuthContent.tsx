
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import NetworkStatusIndicator from "@/components/ui/NetworkStatusIndicator";
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface EnhancedEmailAuthContentProps {
  isLogin: boolean;
  setIsLogin: (value: boolean) => void;
  isSubmitting: boolean;
  formData: any;
  setFormData: (data: any) => void;
  formErrors: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoBack: () => void;
  lastError?: string | null;
  onRetry?: () => void;
}

const EnhancedEmailAuthContent = ({
  isLogin,
  setIsLogin,
  isSubmitting,
  formData,
  setFormData,
  formErrors,
  handleInputChange,
  handleSubmit,
  handleGoBack,
  lastError,
  onRetry
}: EnhancedEmailAuthContentProps) => {
  const { hasConnectivity } = useNetworkStatus();

  const showRetryButton = lastError && (
    lastError.includes('Connection') || 
    lastError.includes('Load failed') ||
    lastError.includes('fetch')
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="text-2xl font-bold text-primary mb-2">Toyflix</div>
        <CardTitle>{isLogin ? "Welcome back!" : "Create your account"}</CardTitle>
        <CardDescription>
          {isLogin ? "Sign in to continue to your dashboard" : "Join Toyflix and start your toy rental journey"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NetworkStatusIndicator />
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              disabled={isSubmitting || !hasConnectivity}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={isSubmitting || !hasConnectivity}
              className="w-full"
            />
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required
                  disabled={isSubmitting || !hasConnectivity}
                  className={`w-full ${formErrors.passwordMismatch ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    required
                    disabled={isSubmitting || !hasConnectivity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    required
                    disabled={isSubmitting || !hasConnectivity}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 1234567890"
                  required
                  disabled={isSubmitting || !hasConnectivity}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, agreeToTerms: checked })
                  }
                  disabled={isSubmitting || !hasConnectivity}
                  className={formErrors.termsNotAgreed ? 'border-red-500' : ''}
                />
                <Label htmlFor="agreeToTerms" className="text-sm">
                  I agree to the Terms of Service and Privacy Policy
                </Label>
              </div>
            </>
          )}

          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !hasConnectivity}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </Button>

            {showRetryButton && onRetry && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={onRetry}
                disabled={isSubmitting || !hasConnectivity}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
            )}
          </div>
        </form>

        <div className="text-center space-y-2">
          <Button
            type="button"
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            disabled={isSubmitting}
            className="text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={handleGoBack}
            disabled={isSubmitting}
            className="text-sm w-full"
          >
            Back to main page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedEmailAuthContent;
