import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Gift, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCustomAuth } from '@/hooks/useCustomAuth';

const SignupSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCustomAuth();

  useEffect(() => {
    // Track successful signup completion for analytics
    const trackSignupSuccess = () => {
      // Google Analytics 4 - Signup Completion
      if (window.gtag) {
        window.gtag('event', 'sign_up', {
          method: 'phone_otp',
          event_category: 'User Registration',
          event_label: 'Successful Signup',
          value: 1,
          custom_parameters: {
            user_id: user?.id,
            signup_method: 'phone_verification',
            completion_timestamp: new Date().toISOString()
          }
        });

        // Track as conversion
        window.gtag('event', 'conversion', {
          send_to: 'AW-CONVERSION_ID/SIGNUP_CONVERSION', // Replace with your conversion ID
          event_category: 'Conversion',
          event_label: 'User Signup Completed',
          value: 1,
          currency: 'INR'
        });
      }

      // Microsoft Clarity - Custom Event
      if (window.clarity) {
        window.clarity('event', 'signup_completed_successfully', {
          user_id: user?.id,
          signup_method: 'phone_otp',
          completion_timestamp: new Date().toISOString(),
          user_phone: user?.phone,
          user_name: `${user?.first_name} ${user?.last_name}`.trim()
        });
      }

      // Facebook Pixel - CompleteRegistration
      if (window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          content_name: 'Toyflix User Registration',
          status: 'completed',
          content_category: 'signup',
          value: 0,
          currency: 'INR'
        });

        // Also track as Lead
        window.fbq('track', 'Lead', {
          content_name: 'Toyflix New User',
          content_category: 'user_acquisition',
          value: 0,
          currency: 'INR'
        });
      }

      console.log('📊 Signup success analytics events tracked for user:', user?.id);
    };

    // Track analytics immediately
    if (user) {
      trackSignupSuccess();
    }

    // Auto-redirect to toys page after 3 seconds
    const redirectTimer = setTimeout(() => {
      navigate('/toys', { replace: true });
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [user, navigate]);

  const handleContinue = () => {
    navigate('/toys', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Toyflix! 🎉
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. Get ready to discover amazing toys for your children!
          </p>

          {/* User Info */}
          {user && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Welcome, {user.first_name}!</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Phone: {user.phone}
              </p>
            </div>
          )}

          {/* Next Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3 text-left">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <span className="text-sm text-gray-700">Browse our premium toy collection</span>
            </div>
            
            <div className="flex items-center space-x-3 text-left">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">2</span>
              </div>
              <span className="text-sm text-gray-700">Choose a subscription plan</span>
            </div>
            
            <div className="flex items-center space-x-3 text-left">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-bold text-sm">3</span>
              </div>
              <span className="text-sm text-gray-700">Start your toy rental journey</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            size="lg"
          >
            <Gift className="w-5 h-5 mr-2" />
            Explore Toys Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Auto-redirect notice */}
          <p className="text-xs text-gray-500 mt-4">
            You'll be redirected automatically in a few seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupSuccess;
