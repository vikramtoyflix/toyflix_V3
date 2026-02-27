import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Phone,
  Mail,
  UserPlus,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
    clarity?: (command: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

const SignupCapture: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    name: '',
    source: searchParams.get('source') || 'direct',
    utm_source: searchParams.get('utm_source') || '',
    utm_medium: searchParams.get('utm_medium') || '',
    utm_campaign: searchParams.get('utm_campaign') || '',
    referrer: document.referrer || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Analytics tracking functions
  const trackEvent = (eventName: string, eventData: any = {}) => {
    try {
      // Google Analytics 4
      if (window.gtag) {
        window.gtag('event', eventName, {
          event_category: 'Signup Funnel',
          event_label: formData.source,
          custom_map: { dimension1: 'signup_capture_page' },
          ...eventData
        });
      }

      // Microsoft Clarity
      if (window.clarity) {
        window.clarity('event', eventName, eventData);
      }

      // Console log for debugging
      console.log('📊 Analytics Event:', eventName, eventData);

    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  };

  // Track page view on mount
  useEffect(() => {
    trackEvent('signup_capture_page_view', {
      page_title: 'Signup Capture Page',
      page_location: window.location.href,
      source: formData.source,
      utm_source: formData.utm_source,
      utm_medium: formData.utm_medium,
      utm_campaign: formData.utm_campaign
    });

    // Track time spent on page
    const startTime = Date.now();
    
    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      trackEvent('signup_capture_time_spent', {
        time_spent_seconds: timeSpent,
        completed_steps: step
      });
    };
  }, []);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Track input interactions
    trackEvent('signup_form_interaction', {
      field_name: field,
      step: step,
      has_value: value.length > 0
    });
  };

  // Handle step progression
  const handleNextStep = () => {
    if (step === 1) {
      // Validate phone
      if (!formData.phone || formData.phone.length < 10) {
        toast({
          title: "Please enter a valid phone number",
          description: "Phone number is required to continue",
          variant: "destructive"
        });
        return;
      }
      
      trackEvent('signup_step_1_completed', {
        phone_entered: true,
        phone_length: formData.phone.length,
        source: formData.source
      });
    }

    if (step === 2) {
      trackEvent('signup_step_2_completed', {
        email_entered: formData.email.length > 0,
        name_entered: formData.name.length > 0,
        source: formData.source
      });
    }

    setStep(prev => prev + 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Track signup attempt
      trackEvent('signup_attempt_started', {
        phone: formData.phone,
        email: formData.email,
        name: formData.name,
        source: formData.source,
        utm_source: formData.utm_source,
        utm_medium: formData.utm_medium,
        utm_campaign: formData.utm_campaign,
        form_completion_time: Date.now()
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Track successful capture
      trackEvent('signup_captured_successfully', {
        user_phone: formData.phone,
        user_email: formData.email,
        user_name: formData.name,
        source: formData.source,
        conversion_funnel: 'signup_capture_page'
      });

      // Enhanced conversion tracking
      if (window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with your conversion ID
          event_category: 'Lead Generation',
          event_label: 'Signup Capture Completed',
          value: 1,
          currency: 'INR'
        });
      }

      // Show success and redirect
      toast({
        title: "Signup Captured Successfully! 🎉",
        description: "Your information has been recorded for analytics",
        duration: 3000
      });

      setStep(4); // Success step

      // Redirect to actual signup after delay
      setTimeout(() => {
        const redirectUrl = searchParams.get('redirect') || '/auth';
        navigate(`${redirectUrl}?from=signup-capture&source=${formData.source}`);
      }, 2000);

    } catch (error) {
      console.error('Signup capture error:', error);
      
      trackEvent('signup_capture_error', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        source: formData.source
      });

      toast({
        title: "Capture Failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Phone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Enter Your Phone Number
              </h2>
              <p className="text-gray-600">
                We'll send you an OTP to verify your number
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="text-lg"
                  maxLength={13}
                />
              </div>

              <Button 
                onClick={handleNextStep}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Continue
                <TrendingUp className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <UserPlus className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Additional Information
              </h2>
              <p className="text-gray-600">
                Help us personalize your experience
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              <Button 
                onClick={handleNextStep}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Continue
                <Target className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Confirm Your Information
              </h2>
              <p className="text-gray-600">
                Please review your details before proceeding
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{formData.phone}</span>
                </div>
                {formData.name && (
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{formData.name}</span>
                  </div>
                )}
                {formData.email && (
                  <div className="flex justify-between">
                    <span className="font-medium">Email:</span>
                    <span>{formData.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Source:</span>
                  <Badge variant="outline">{formData.source}</Badge>
                </div>
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Capturing...
                  </>
                ) : (
                  <>
                    Complete Capture
                    <Zap className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 text-center">
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
            <h2 className="text-3xl font-bold text-gray-900">
              Captured Successfully! 🎉
            </h2>
            <p className="text-gray-600 text-lg">
              Your signup has been recorded for analytics tracking
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-800 font-medium">
                Redirecting to actual signup process...
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Signup Capture
          </h1>
          <p className="text-gray-600">
            Analytics & Tracking Demo Page
          </p>
        </div>

        {/* Progress Indicator */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {step} of 3
              </span>
              <span className="text-sm font-medium text-gray-600">
                {Math.round((step / 3) * 100)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {step < 4 ? 'Capture Information' : 'Success!'}
              </CardTitle>
              {formData.source && (
                <Badge variant="secondary">
                  {formData.source}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Analytics Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">
            🔍 This page tracks events for:
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-400">
            <span>📊 Google Analytics</span>
            <span>👁️ Microsoft Clarity</span>
            <span>📈 Custom Events</span>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <p className="font-semibold mb-1">Debug Info:</p>
            <p>Source: {formData.source}</p>
            <p>UTM Source: {formData.utm_source}</p>
            <p>UTM Medium: {formData.utm_medium}</p>
            <p>UTM Campaign: {formData.utm_campaign}</p>
            <p>Referrer: {formData.referrer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupCapture;
