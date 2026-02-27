import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Truck, Shield, Clock, Phone, Mail } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { BangaloreLocalSchema } from "@/components/seo/BangaloreLocalSchema";
import { BangaloreGeoTarget, useBangaloreContent } from "@/components/seo/BangaloreGeoTarget";
import { GoogleMyBusinessSchema } from "@/components/seo/GoogleMyBusinessSchema";
import { useIsMobile } from "@/hooks/use-mobile";
import { FEATURE_FLAGS } from "@/config/features";

const Bangalore = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { localContent } = useBangaloreContent();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const bangaloreAreas = [
    "Whitefield", "Electronic City", "HSR Layout", "Koramangala", "Indiranagar",
    "Marathahalli", "BTM Layout", "Jayanagar", "Rajajinagar", "Malleshwaram",
    "Frazer Town", "Ulsoor", "Sadashivanagar", "Basavanagudi", "JP Nagar"
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      location: "Koramangala",
      rating: 5,
      text: "Toyflix made my daughter's birthday special! Fresh toys every month, delivered right to our doorstep in Bangalore."
    },
    {
      name: "Rajesh Kumar",
      location: "Whitefield",
      rating: 5,
      text: "Best toy rental service in Bangalore. Safe, sanitized toys and excellent customer service. Highly recommended!"
    },
    {
      name: "Meera Patel",
      location: "HSR Layout",
      rating: 5,
      text: "My twins love the educational toys from Toyflix. Great variety and perfect for their age group."
    }
  ];

  return (
    <BangaloreGeoTarget>
      {/* Enhanced SEO for Bangalore */}
      {FEATURE_FLAGS.SEO_META_TAGS && (
        <SEOHead
          title="Toyflix Bangalore - Premium Toy Rental Service in Bengaluru | Educational Toys"
          description="Leading toy rental service in Bangalore. Safe, sanitized educational toys delivered monthly across Bengaluru. Free delivery in Whitefield, Koramangala, HSR Layout, Electronic City & more. Book now!"
          canonical="https://toyflix.in/bangalore"
        />
      )}

      {/* Local Business Schema for Bangalore */}
      <BangaloreLocalSchema />
      <GoogleMyBusinessSchema />

      {/* Breadcrumb Schema */}
      {FEATURE_FLAGS.SEO_STRUCTURED_DATA && (
        <StructuredData
          type="breadcrumb"
          breadcrumbs={[
            { name: 'Home', url: 'https://toyflix.in' },
            { name: 'Bangalore', url: 'https://toyflix.in/bangalore' }
          ]}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative container mx-auto px-4 text-center">
            <div className="flex items-center justify-center mb-6">
              <MapPin className="w-8 h-8 mr-3" />
              <h1 className="text-4xl md:text-6xl font-bold">
                Toyflix <span className="text-yellow-300">Bangalore</span>
              </h1>
            </div>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed">
              Get <span className="text-yellow-300 font-bold">fresh educational toys</span> delivered to your Bangalore home every month.
              <br className="hidden md:block" />
              No buying costs • No storage hassles • Just <span className="text-yellow-300 font-bold">₹999/month</span> for premium learning toys
            </p>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto text-blue-100">
              🎯 Curated by child development experts • 🚚 Free delivery across Bangalore • 🛡️ 100% sanitized & safe
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                🎯 Fresh Toys Monthly
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                💰 Save ₹10,000+ Yearly
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                🚚 Free Bangalore Delivery
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-white/20 text-white border-white/30">
                🧠 Age-Appropriate Learning
              </Badge>
            </div>
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg px-8 py-4"
              onClick={() => navigate('/subscription-flow')}
            >
              Start Monthly Toy Subscription 🚀
            </Button>
            <p className="text-sm md:text-base text-blue-100 mt-4 max-w-2xl mx-auto">
              Choose your plan • Get toys delivered • Enjoy learning • Return & get new toys
            </p>
          </div>
        </section>

        {/* Service Areas */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Toy Rental Service Across Bangalore
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {bangaloreAreas.map((area) => (
                <Card key={area} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-semibold text-sm md:text-base">{area}</h3>
                    <p className="text-xs text-muted-foreground">Free Delivery</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Toyflix Bangalore */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Parents in Bangalore Choose Toyflix
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-xl font-bold mb-3">100% Safe & Sanitized</h3>
                  <p className="text-muted-foreground">
                    All toys are thoroughly cleaned and disinfected before delivery to Bangalore homes
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-bold mb-3">Free Delivery</h3>
                  <p className="text-muted-foreground">
                    Complimentary delivery across all Bangalore neighborhoods within 24-48 hours
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <Star className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                  <h3 className="text-xl font-bold mb-3">Educational Toys</h3>
                  <p className="text-muted-foreground">
                    Age-appropriate educational toys that promote learning and development
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-xl font-bold mb-3">Flexible Plans</h3>
                  <p className="text-muted-foreground">
                    Monthly subscription with easy cancellation and plan modification options
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What Bangalore Parents Say
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center">
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {testimonial.location}, Bangalore
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Ready to Start Toy Rental in Bangalore?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of Bangalore families who trust Toyflix for their children's educational entertainment
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                size="lg"
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                onClick={() => navigate('/subscription-flow')}
              >
                Start Subscription Now
              </Button>
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                <span className="text-lg">+91-8000000000</span>
              </div>
            </div>
            <p className="text-sm opacity-90">
              Serving Bangalore • Free Delivery • Safe & Sanitized Toys • Educational Content
            </p>
          </div>
        </section>
      </div>
    </BangaloreGeoTarget>
  );
};

export default Bangalore;