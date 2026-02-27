import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Package, 
  Truck, 
  Calendar, 
  Shield, 
  CheckCircle, 
  Award, 
  Star, 
  Sparkles, 
  Clock, 
  Heart,
  Gift,
  ArrowRight,
  Play,
  Users,
  Zap,
  BadgeCheck
} from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const CampaignLanding = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    childAge: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [viewerCount, setViewerCount] = useState(47);

  // Simulate live viewer count for urgency
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(35, Math.min(65, prev + change));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (!formData.childAge) newErrors.childAge = "Please select your child's age";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      trackEvent('campaign_lead_submitted', {
        campaign: 'landing_page',
        child_age: formData.childAge,
        source: 'campaign_landing',
      });

      const { error } = await supabase
        .from('campaign_leads' as any)
        .insert([{
          name: formData.name,
          phone: formData.phone.replace(/\s+/g, ''),
          child_age: formData.childAge,
          source: 'campaign_landing',
          created_at: new Date().toISOString(),
        }])
        .select();

      if (error) {
        console.error('Error storing lead:', error);
        trackEvent('campaign_lead_fallback', {
          name: formData.name,
          phone: formData.phone,
          child_age: formData.childAge,
        });
      }

      toast.success('Success! 🎉', {
        description: "We'll send you the FREE toy list via WhatsApp shortly!",
      });

      trackEvent('campaign_conversion_success', {
        campaign: 'landing_page',
        child_age: formData.childAge,
      });

      setTimeout(() => navigate('/pricing'), 2000);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Something went wrong', {
        description: 'Please try again or call us directly.',
      });
      trackEvent('campaign_conversion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const testimonials = [
    { name: 'Ananya R.', location: 'Whitefield', text: "Best decision ever! My house is so much tidier and my daughter is always excited for new toys!", rating: 5 },
    { name: 'Rahul S.', location: 'Koramangala', text: "Fantastic service! The quality of toys is amazing. My son loves the LEGO sets!", rating: 5 },
    { name: 'Priya M.', location: 'HSR Layout', text: "No more wasted money on toys that get boring. Toyflix is a lifesaver for our family!", rating: 5 },
    { name: 'Vikram K.', location: 'Indiranagar', text: "Incredible value! We've saved so much money and our kids are happier than ever.", rating: 5 },
    { name: 'Sneha T.', location: 'Jayanagar', text: "The delivery team is so punctual and the toys are always spotlessly clean. Highly recommend!", rating: 5 },
  ];

  return (
    <>
      <Helmet>
        <title>Get New Toys Every Month - Toyflix Toy Rental | Bangalore</title>
        <meta name="description" content="Give your child new toys every month without buying! Premium toy rental service in Bangalore. No clutter, no waste, just endless fun. Get your FREE toy list now!" />
        <meta name="keywords" content="toy rental bangalore, toy subscription, educational toys, toy library, rent toys bangalore" />
      </Helmet>

      <div className="min-h-screen bg-white overflow-x-hidden">
        {/* Floating Announcement Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white py-2.5 px-4">
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm md:text-base font-medium">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>🎄 New Year Special: <strong>First Month FREE</strong> + Free Delivery!</span>
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] p-2 rounded-xl">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] bg-clip-text text-transparent">
                  Toyflix
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="font-medium">{viewerCount} parents viewing</span>
                  </div>
                </div>
                <Button 
                  onClick={scrollToForm}
                  className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] hover:from-[#FF5252] hover:to-[#FF7043] text-white font-semibold shadow-lg shadow-orange-200"
                >
                  Get Free List
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
            <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-40 right-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative container mx-auto px-4 py-8 md:py-16">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-7xl mx-auto">
              
              {/* Left Content */}
              <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                {/* Trust Badge */}
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-md border border-orange-100">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                        {['A', 'R', 'P', 'V'][i]}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    <strong className="text-[#FF6B6B]">2,500+</strong> happy families in Bangalore
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                  New Toys Every Month
                  <span className="block mt-2 bg-gradient-to-r from-[#FF6B6B] via-[#FF8E53] to-[#FFD93D] bg-clip-text text-transparent">
                    Without Buying!
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="text-xl md:text-2xl text-gray-600 font-medium max-w-xl mx-auto lg:mx-0">
                  Premium toys delivered to your door. 
                  <span className="text-[#FF6B6B] font-semibold"> Save ₹10,000+/year</span> on toys your kids will actually play with.
                </p>

                {/* Quick Benefits */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  {[
                    { icon: Truck, text: 'Free Delivery' },
                    { icon: Shield, text: 'Sanitized Toys' },
                    { icon: Zap, text: 'Cancel Anytime' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gray-100">
                      <item.icon className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>

                {/* Social Proof Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {[
                    { number: '500+', label: 'Premium Toys' },
                    { number: '4.9★', label: 'Parent Rating' },
                    { number: '₹1,299', label: 'For 4 toys/mo' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center lg:text-left">
                      <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.number}</div>
                      <div className="text-sm text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Mobile CTA */}
                <div className="lg:hidden pt-4">
                  <Button
                    onClick={scrollToForm}
                    size="lg"
                    className="w-full bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] hover:from-[#FF5252] hover:to-[#FF7043] text-white font-bold text-lg py-7 shadow-xl shadow-orange-200 rounded-2xl"
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    Get Your FREE Toy List
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Right Form */}
              <div className="order-1 lg:order-2" id="signup-form">
                <div className="relative">
                  {/* Urgency Badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 animate-bounce">
                      <Clock className="w-4 h-4" />
                      Limited Time: First Month FREE!
                    </div>
                  </div>

                  {/* Form Card */}
                  <div className="bg-gradient-to-br from-[#4169E1] via-[#5B7FE8] to-[#7B68EE] rounded-3xl p-6 md:p-8 shadow-2xl shadow-blue-200/50 border border-white/20">
                    {/* Form Header */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
                        <Gift className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Get Your FREE Toy List
                      </h2>
                      <p className="text-white/80 text-sm">
                        Age-appropriate toys curated just for your child! 🎁
                      </p>
                    </div>

                    {/* Live Activity */}
                    <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 mb-6">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                      </span>
                      <span className="text-white/90 text-sm">
                        <strong>12 parents</strong> signed up in the last hour
                      </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Input
                          type="text"
                          placeholder="👋 Your Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`bg-white/95 text-gray-900 placeholder:text-gray-500 h-14 text-lg rounded-xl border-0 shadow-inner ${errors.name ? 'ring-2 ring-red-400' : ''}`}
                          disabled={isSubmitting}
                        />
                        {errors.name && <p className="text-xs text-yellow-200 mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <Input
                          type="tel"
                          placeholder="📱 WhatsApp Number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`bg-white/95 text-gray-900 placeholder:text-gray-500 h-14 text-lg rounded-xl border-0 shadow-inner ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                          disabled={isSubmitting}
                          maxLength={10}
                        />
                        {errors.phone && <p className="text-xs text-yellow-200 mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <Select
                          value={formData.childAge}
                          onValueChange={(value) => setFormData({ ...formData, childAge: value })}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className={`bg-white/95 text-gray-900 h-14 text-lg rounded-xl border-0 shadow-inner ${errors.childAge ? 'ring-2 ring-red-400' : ''}`}>
                            <SelectValue placeholder="👶 Child's Age" />
                          </SelectTrigger>
                          <SelectContent>
                            {['0-1', '1-2', '2-3', '3-4', '4-5', '5-6', '6-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12+'].map((age) => (
                              <SelectItem key={age} value={age}>{age} years</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.childAge && <p className="text-xs text-yellow-200 mt-1">{errors.childAge}</p>}
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-lg py-7 shadow-lg shadow-green-500/30 rounded-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Sending...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            🎁 YES! Send My FREE Toy List
                          </span>
                        )}
                      </button>

                      {/* Trust Indicators */}
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-white/80 text-xs">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> No Deposit
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> No Damage Fee
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Cancel Anytime
                        </span>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Logos */}
        <section className="py-8 bg-white border-y border-gray-100">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-gray-500 mb-6 font-medium">PREMIUM BRANDS YOUR KIDS WILL LOVE</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {['LEGO', 'Fisher-Price', 'Melissa & Doug', 'Hot Wheels', 'Barbie'].map((brand) => (
                <div key={brand} className="text-xl md:text-2xl font-bold text-gray-400">{brand}</div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                SIMPLE AS 1-2-3
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How <span className="text-[#FF6B6B]">Toyflix</span> Works
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Getting started is super easy. Here's how you can start your toy adventure today!
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { 
                  step: '1', 
                  icon: Package, 
                  title: 'Choose Your Plan', 
                  desc: 'Pick a subscription that fits your family. Get 4 toys every month for just ₹1,299.',
                  color: 'from-orange-400 to-pink-400'
                },
                { 
                  step: '2', 
                  icon: Truck, 
                  title: 'We Deliver to You', 
                  desc: 'Sanitized premium toys delivered free to your doorstep within 24 hours.',
                  color: 'from-emerald-400 to-teal-400'
                },
                { 
                  step: '3', 
                  icon: Calendar, 
                  title: 'Swap When Ready', 
                  desc: 'When your child is done playing, swap for new toys anytime. Unlimited exchanges!',
                  color: 'from-blue-400 to-purple-400'
                },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                    <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl mb-6 shadow-lg`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute top-6 right-6 text-6xl font-bold text-gray-100 group-hover:text-gray-200 transition-colors">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-[#FF6B6B]/5 via-white to-[#FFD93D]/5">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-pink-100 text-pink-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                ❤️ LOVED BY PARENTS
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Join <span className="text-[#FF6B6B]">2,500+</span> Happy Families
              </h2>
              <p className="text-gray-600 text-lg">
                See what Bangalore parents are saying about Toyflix
              </p>
            </div>

            {/* Testimonial Carousel */}
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="absolute -top-4 -left-4 text-6xl text-[#FFD93D]">"</div>
                
                <div className="text-center">
                  <div className="flex justify-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 fill-[#FFD93D] text-[#FFD93D]" />
                    ))}
                  </div>
                  
                  <p className="text-xl md:text-2xl text-gray-700 italic mb-8 leading-relaxed">
                    "{testimonials[activeTestimonial].text}"
                  </p>
                  
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF6B6B] to-[#FFD93D] flex items-center justify-center text-white text-xl font-bold">
                      {testimonials[activeTestimonial].name[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-900">{testimonials[activeTestimonial].name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <BadgeCheck className="w-4 h-4 text-blue-500" />
                        Verified Parent • {testimonials[activeTestimonial].location}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Testimonial Dots */}
                <div className="flex justify-center gap-2 mt-8">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTestimonial(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === activeTestimonial 
                          ? 'bg-[#FF6B6B] w-8' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
              {[
                { number: '2,500+', label: 'Happy Families', icon: Users },
                { number: '50,000+', label: 'Toys Delivered', icon: Package },
                { number: '4.9/5', label: 'Parent Rating', icon: Star },
                { number: '98%', label: 'Would Recommend', icon: Heart },
              ].map((stat, i) => (
                <div key={i} className="text-center bg-white rounded-2xl p-6 shadow-lg shadow-gray-100 border border-gray-100">
                  <stat.icon className="w-8 h-8 mx-auto mb-3 text-[#FF6B6B]" />
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 md:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                WHY TOYFLIX?
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                The Smarter Way to <span className="text-[#FF6B6B]">Play</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { icon: Gift, title: 'Save ₹10,000+/Year', desc: 'Why buy when you can rent premium toys at a fraction of the cost?', color: 'bg-orange-100 text-orange-600' },
                { icon: Shield, title: '100% Sanitized', desc: 'Every toy is thoroughly cleaned and sanitized using child-safe methods.', color: 'bg-blue-100 text-blue-600' },
                { icon: Truck, title: 'Free Delivery', desc: 'Free doorstep delivery and pickup across all Bangalore locations.', color: 'bg-emerald-100 text-emerald-600' },
                { icon: Calendar, title: 'Swap Anytime', desc: 'Tired of a toy? Swap it for a new one whenever you want!', color: 'bg-purple-100 text-purple-600' },
                { icon: Award, title: 'Premium Brands', desc: 'LEGO, Fisher-Price, Melissa & Doug - only the best for your child.', color: 'bg-pink-100 text-pink-600' },
                { icon: Heart, title: 'Zero Clutter', desc: 'No more overflowing toy boxes. Keep only what your child loves.', color: 'bg-yellow-100 text-yellow-600' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100">
                  <div className={`flex-shrink-0 w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B6B] via-[#FF8E53] to-[#FFD93D]"></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          <div className="relative container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <span className="inline-block bg-white/20 backdrop-blur text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                🎉 LIMITED TIME OFFER
              </span>
              
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                Ready to Give Your Child
                <span className="block">Endless Joy?</span>
              </h2>
              
              <p className="text-xl text-white/90 mb-8">
                Join thousands of happy families. Get your FREE personalized toy list now!
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="bg-white text-[#FF6B6B] hover:bg-gray-100 font-bold text-lg px-10 py-7 shadow-xl rounded-2xl transition-all duration-300 hover:scale-105"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Get FREE Toy List
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              <p className="text-white/80 text-sm mt-6 flex items-center justify-center gap-4 flex-wrap">
                <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> No Credit Card</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> No Commitment</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 100% Free</span>
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] p-2 rounded-xl">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Toyflix</span>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>Premium Toy Rental in Bangalore</span>
                <span>•</span>
                <span>📞 +91 98765 43210</span>
              </div>
              
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} Toyflix. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </>
  );
};

export default CampaignLanding;
