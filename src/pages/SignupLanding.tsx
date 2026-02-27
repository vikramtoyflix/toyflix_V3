import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  Target,
  Gift,
  Star,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import SignupAnalyticsService from '@/services/signupAnalyticsService';

const SignupLanding: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract URL parameters
  const source = searchParams.get('source') || 'direct';
  const utmSource = searchParams.get('utm_source') || '';
  const utmMedium = searchParams.get('utm_medium') || '';
  const utmCampaign = searchParams.get('utm_campaign') || '';
  const utmContent = searchParams.get('utm_content') || '';
  const utmTerm = searchParams.get('utm_term') || '';

  useEffect(() => {
    // Initialize analytics session
    SignupAnalyticsService.initializeSession(source, {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm
    });

    // Track landing page view
    SignupAnalyticsService.trackEvent('signup_landing_page_view', {
      source,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      page_type: 'landing_page'
    });

    // Track page performance
    SignupAnalyticsService.trackPageTiming();
  }, [source, utmSource, utmMedium, utmCampaign, utmContent, utmTerm]);

  const handleStartSignup = () => {
    // Track signup initiation
    SignupAnalyticsService.trackEvent('signup_initiated_from_landing', {
      source,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      cta_clicked: 'start_signup'
    });

    // Navigate to signup capture with all parameters
    const params = new URLSearchParams();
    params.set('source', source);
    if (utmSource) params.set('utm_source', utmSource);
    if (utmMedium) params.set('utm_medium', utmMedium);
    if (utmCampaign) params.set('utm_campaign', utmCampaign);
    if (utmContent) params.set('utm_content', utmContent);
    if (utmTerm) params.set('utm_term', utmTerm);

    navigate(`/signup-capture?${params.toString()}`);
  };

  const handleDirectSignup = () => {
    // Track direct signup
    SignupAnalyticsService.trackEvent('direct_signup_clicked', {
      source,
      cta_clicked: 'direct_signup'
    });

    // Navigate directly to auth
    navigate(`/auth?from=signup-landing&source=${source}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                ToyJoyBox - Premium Toy Rentals
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Source: <span className="font-medium">{source}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Gift className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join ToyJoyBox Today!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Discover amazing toys for your children with our premium subscription service. 
            Get started in just a few simple steps!
          </p>
          
          {/* Special Offer Display for Campaigns */}
          {(utmSource || utmMedium || utmCampaign) && (
            <div className="bg-green-50 rounded-lg p-4 max-w-md mx-auto mb-8 border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 mb-2">
                🎉 Special Offer Available!
              </h3>
              <p className="text-xs text-green-700">
                You're eligible for exclusive benefits through our {utmCampaign || 'special'} campaign.
              </p>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center p-6">
            <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Premium Toys</h3>
            <p className="text-gray-600">Curated selection of high-quality educational toys</p>
          </Card>
          
          <Card className="text-center p-6">
            <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Age-Appropriate</h3>
            <p className="text-gray-600">Toys matched to your child's developmental stage</p>
          </Card>
          
          <Card className="text-center p-6">
            <Target className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Flexible Plans</h3>
            <p className="text-gray-600">Choose from monthly, quarterly, or annual subscriptions</p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-8">
            Choose how you'd like to proceed with your signup
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Analytics Signup */}
            <Card className="p-6 border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-0">
                <div className="text-center">
                  <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Analytics Signup
                  </h3>
                  <p className="text-blue-700 text-sm mb-4">
                    Complete signup with full analytics tracking for Microsoft Clarity and Google Analytics
                  </p>
                  <Button 
                    onClick={handleStartSignup}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Start Analytics Signup
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Direct Signup */}
            <Card className="p-6 border-2 border-green-200 bg-green-50">
              <CardContent className="p-0">
                <div className="text-center">
                  <div className="bg-green-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Direct Signup
                  </h3>
                  <p className="text-green-700 text-sm mb-4">
                    Go directly to the regular signup process without additional tracking
                  </p>
                  <Button 
                    onClick={handleDirectSignup}
                    variant="outline"
                    className="w-full border-green-600 text-green-700 hover:bg-green-100"
                    size="lg"
                  >
                    Regular Signup
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Benefits List */}
          <div className="mt-8 text-left max-w-md mx-auto">
            <h4 className="font-semibold text-gray-900 mb-4 text-center">
              What you'll get:
            </h4>
            <div className="space-y-2">
              {[
                'Curated toy selection for your child',
                'Flexible subscription plans',
                'Free delivery and returns',
                'Educational activity guides',
                'Customer support'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              🔧 Debug Information
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Source:</strong> {source}</p>
              <p><strong>UTM Source:</strong> {utmSource || 'None'}</p>
              <p><strong>UTM Medium:</strong> {utmMedium || 'None'}</p>
              <p><strong>UTM Campaign:</strong> {utmCampaign || 'None'}</p>
              <p><strong>UTM Content:</strong> {utmContent || 'None'}</p>
              <p><strong>UTM Term:</strong> {utmTerm || 'None'}</p>
              <p><strong>Referrer:</strong> {document.referrer || 'Direct'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignupLanding;
