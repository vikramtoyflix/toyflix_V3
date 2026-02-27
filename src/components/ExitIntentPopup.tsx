import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { Gift, Clock, Star, ArrowRight, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { fbqTrack } from '@/utils/fbq';
import { DropTrackingService } from '@/services/dropTrackingService';

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  planId?: string;
  totalAmount?: number;
}

const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({
  isOpen,
  onClose,
  currentPage = 'unknown',
  planId,
  totalAmount
}) => {
  const navigate = useNavigate();
  const { user } = useCustomAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'offer' | 'capture' | 'success'>('offer');

  // Track popup view
  useEffect(() => {
    if (isOpen) {
      // Track with Facebook Pixel
      fbqTrack('ViewContent', {
        content_name: 'Exit Intent Popup',
        content_category: 'exit_intent_offer',
        value: totalAmount || 0,
        currency: 'INR'
      });

      // Track with drop tracking service
      DropTrackingService.trackJourneyEvent({
        userId: user?.id,
        sessionId: DropTrackingService.getSessionId(),
        eventType: 'exit_intent_popup_shown',
        eventData: {
          currentPage,
          planId,
          totalAmount,
          hasUser: !!user
        }
      });

      console.log('🎯 Exit intent popup shown:', { currentPage, planId, totalAmount });
    }
  }, [isOpen, currentPage, planId, totalAmount, user?.id]);

  const handleContinue = () => {
    if (user) {
      // User is logged in, redirect to subscription flow
      handleRedirect();
    } else {
      // User not logged in, capture email/phone first
      setStep('capture');
    }

    // Track continue attempt
    fbqTrack('Lead', {
      content_name: 'Exit Intent Continue',
      value: totalAmount || 1299,
      currency: 'INR',
      content_category: 'exit_intent_conversion'
    });

    DropTrackingService.trackJourneyEvent({
      userId: user?.id,
      sessionId: DropTrackingService.getSessionId(),
      eventType: 'exit_intent_continue',
      eventData: {
        currentPage,
        planId,
        totalAmount,
        hasUser: !!user,
        step: user ? 'direct_redirect' : 'capture_info'
      }
    });
  };

  const handleRedirect = () => {
    // Redirect based on current context
    if (planId) {
      navigate(`/subscription-flow?plan=${planId}`);
    } else {
      navigate('/subscription-flow');
    }
    
    onClose();
    
    toast.success('Continue to subscription to explore our plans.');
  };

  const handleSubmitInfo = async () => {
    if (!email && !phone) {
      toast.error('Please provide either email or phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      // Track lead capture
      fbqTrack('CompleteRegistration', {
        content_name: 'Exit Intent Lead Capture',
        value: 0,
        currency: 'INR',
        content_category: 'exit_intent_lead'
      });

      DropTrackingService.trackJourneyEvent({
        userId: user?.id,
        sessionId: DropTrackingService.getSessionId(),
        eventType: 'exit_intent_info_captured',
        eventData: {
          email: !!email,
          phone: !!phone,
          currentPage,
          planId
        }
      });

      // Redirect to subscription flow
      handleRedirect();
      
      setStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting exit intent form:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Track popup dismissal
    DropTrackingService.trackJourneyEvent({
      userId: user?.id,
      sessionId: DropTrackingService.getSessionId(),
      eventType: 'exit_intent_popup_dismissed',
      eventData: {
        currentPage,
        planId,
        totalAmount,
        step
      }
    });

    onClose();
  };

  const renderOfferStep = () => (
    <div className="text-center space-y-6">
      {/* Header with urgency */}
      <div className="relative">
        <div className="absolute -top-3 -right-3">
          <Badge variant="destructive" className="animate-pulse">
            <Clock className="w-3 h-3 mr-1" />
            Limited Time
          </Badge>
        </div>
        <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
          <Gift className="w-10 h-10 text-orange-600" />
        </div>
      </div>

      {/* Main offer */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Wait! Don't Miss Out! 🎉
        </h2>
        <p className="text-lg text-gray-600 mb-4">
          Explore our amazing toy subscription plans
        </p>
      </div>

      {/* Value proposition */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">1000+</div>
              <div className="text-sm text-gray-600">Happy Families</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">₹260+</div>
              <div className="text-sm text-gray-600">You'll Save</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">30 Days</div>
              <div className="text-sm text-gray-600">Fresh Toys</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social proof */}
      <div className="flex items-center justify-center space-x-1 text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
        <span className="text-sm text-gray-600 ml-2">4.8/5 from 500+ reviews</span>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button 
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 text-lg"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Continue to Subscription
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        
        <p className="text-xs text-gray-500">
          ⏰ Limited time offer • No commitment required
        </p>
      </div>

      {/* Testimonial */}
      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <p className="text-sm text-gray-700 italic">
          "ToyFlix saved us from toy clutter chaos! My daughter gets excited every month for new toys."
        </p>
        <p className="text-xs text-gray-500 mt-2">- Priya M., Mumbai</p>
      </div>
    </div>
  );

  const renderCaptureStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
        <Gift className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Almost There! 🎯
        </h2>
        <p className="text-gray-600 mb-4">
          Just one more step to continue to subscription
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-center"
          />
        </div>
        
        <div className="text-center text-sm text-gray-500">or</div>
        
        <div>
          <Input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-center"
          />
        </div>

        <Button 
          onClick={handleSubmitInfo}
          disabled={isSubmitting || (!email && !phone)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              Continue to Subscription
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500">
          We'll redirect you to complete your subscription
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
        <Gift className="w-10 h-10 text-green-600" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-green-900 mb-2">
          🎉 Redirecting...
        </h2>
        <p className="text-gray-600">
          You're being redirected to complete your subscription
        </p>
      </div>

      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Special Offer</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        {step === 'offer' && renderOfferStep()}
        {step === 'capture' && renderCaptureStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
