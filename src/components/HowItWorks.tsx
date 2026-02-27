import React, { useState } from 'react';
import { imageService } from '@/services/imageService';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield,
  Clock,
  Award,
  RefreshCw,
  Users,
  CheckCircle,
  Heart,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HowItWorks = () => {
  const isMobile = useIsMobile();
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  const handleImageError = () => {
    console.log('Mobile image failed to load, falling back to desktop image');
    setImageError(true);
  };

  const getImageSource = () => {
    // If mobile and no error, use the new mobile image
    if (isMobile && !imageError) {
      return imageService.getImageUrl("/lovable-uploads/09b56475-0359-4f44-8f7c-2d18fc533695.webp", 'carousel');
    }
    // Fall back to desktop image
    return imageService.getImageUrl("/lovable-uploads/ad1402ea-9278-4bb9-b1c2-4ecd096bf175.webp", 'carousel');
  };

  const getAltText = () => {
    if (isMobile && !imageError) {
      return "Why Choose Toyflix - Mobile Benefits with cartoon characters showing Monthly doorstep delivery, STEM toys, No deposits, No damage cost, Quality assurance, and Pocket friendly pricing";
    }
    return "Why Choose Toyflix benefits";
  };

  const benefits = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "100% Safe & Clean",
      description: "Every toy is thoroughly sanitized and safety-tested before delivery",
      color: "text-green-500"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Monthly Surprises",
      description: "Fresh, age-appropriate toys delivered right to your doorstep",
      color: "text-blue-500"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Premium Quality",
      description: "Curated selection of educational and developmental toys",
      color: "text-purple-500"
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: "Monthly Refresh",
      description: "Fresh toys delivered every month to keep learning exciting",
      color: "text-orange-500"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Your Selection",
      description: "You choose 3 toys and 1 book each month from our expert-curated collection",
      color: "text-pink-500"
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "No Hidden Costs",
      description: "Transparent pricing with no damage fees or security deposits",
      color: "text-teal-500"
    }
  ];

  return (
    <section className={`${isMobile ? 'py-6' : 'py-20'} bg-gradient-to-b from-background to-muted/30`}>
      <div className="container mx-auto px-4">
        <div className={`text-center ${isMobile ? 'mb-6' : 'mb-16'}`}>
          <div className="flex justify-center items-center gap-2 mb-6">
            <Heart className="w-6 h-6 text-toy-coral animate-gentle-bounce" />
            <h2 className={`font-comic font-bold text-primary ${isMobile ? 'text-2xl' : 'text-5xl'}`}>
              Why Parents <span className="text-toy-coral">Love</span> Toyflix
            </h2>
            <Star className="w-6 h-6 text-toy-sunshine animate-wiggle" />
          </div>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'} max-w-3xl mx-auto`}>
            Discover the benefits that make Toyflix the perfect choice for modern families
          </p>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3 mb-6' : 'md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16'}`}>
          {benefits.slice(0, isMobile ? 4 : benefits.length).map((benefit, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/50 backdrop-blur-sm">
              <CardContent className={`${isMobile ? 'p-4' : 'p-8'} text-center`}>
                <div className={`inline-flex items-center justify-center ${isMobile ? 'w-10 h-10 mb-3' : 'w-16 h-16 mb-6'} rounded-full bg-gradient-to-br from-muted to-muted/50 ${benefit.color} group-hover:scale-110 transition-transform duration-300`}>
                  {React.cloneElement(benefit.icon, { className: isMobile ? 'w-5 h-5' : 'w-8 h-8' })}
                </div>
                <h3 className={`font-semibold ${isMobile ? 'text-sm mb-1' : 'text-xl mb-3'}`}>{benefit.title}</h3>
                <p className={`text-muted-foreground leading-relaxed ${isMobile ? 'text-xs' : ''}`}>{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show More for Mobile */}
        {isMobile && (
          <div className="text-center mb-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/about')}
              className="text-xs px-4 py-2"
            >
              View All Benefits
            </Button>
          </div>
        )}

        {/* Why Choose Us Image Section - Hidden on mobile to save space */}
        {!isMobile && (
          <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-8 mb-12">
            <div className="flex justify-center mb-8">
              <img
                src={getImageSource()}
                alt={getAltText()}
                onError={handleImageError}
                className="w-full max-w-4xl h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HowItWorks;
