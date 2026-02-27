import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { imageService } from "@/services/imageService";
import { useState, useRef, useEffect } from "react";

interface AgeGroupSelectionStepProps {
  selectedAgeGroup: string;
  setSelectedAgeGroup: (age: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

const AgeGroupSelectionStep = ({ 
  selectedAgeGroup, 
  setSelectedAgeGroup, 
  onBack, 
  onContinue 
}: AgeGroupSelectionStepProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const ageGroups = [
    { 
      value: "1-2", 
      label: "6m-2 years", 
      illustration: "/images/age-groups/baby-1-2-years.png",
      bgColor: "bg-pink-50 hover:bg-pink-100", 
      borderColor: "border-pink-200",
      selectedBorderColor: "border-pink-400",
      textColor: "text-pink-700"
    },
    { 
      value: "2-3", 
      label: "2-3 years", 
      illustration: "/images/age-groups/toddler-2-3-years.png",
      bgColor: "bg-blue-50 hover:bg-blue-100", 
      borderColor: "border-blue-200",
      selectedBorderColor: "border-blue-400",
      textColor: "text-blue-700"
    },
    { 
      value: "3-4", 
      label: "3-4 years", 
      illustration: "/images/age-groups/child-3-4-years.png",
      bgColor: "bg-purple-50 hover:bg-purple-100", 
      borderColor: "border-purple-200",
      selectedBorderColor: "border-purple-400",
      textColor: "text-purple-700"
    },
    { 
      value: "4-6", 
      label: "4-6 years", 
      illustration: "/images/age-groups/child-4-6-years.png",
      bgColor: "bg-green-50 hover:bg-green-100", 
      borderColor: "border-green-200",
      selectedBorderColor: "border-green-400",
      textColor: "text-green-700"
    },
    { 
      value: "6-8", 
      label: "6-8 years", 
      illustration: "/images/age-groups/child-6-8-years.png",
      bgColor: "bg-amber-50 hover:bg-amber-100", 
      borderColor: "border-amber-200",
      selectedBorderColor: "border-amber-400",
      textColor: "text-amber-700"
    }
  ];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Failed to load image: ${e.currentTarget.src}`);
    if (!e.currentTarget.src.includes('deafult-child.png')) {
      e.currentTarget.src = "/images/age-groups/deafult-child.png";
    } else {
      e.currentTarget.src = imageService.getImageUrl(null, 'toy');
    }
  };

  const handleAgeGroupSelect = (value: string) => {
    // Prevent processing if already processing
    if (isProcessing) {
      return;
    }

    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // If clicking the same age group again, proceed immediately
    if (value === selectedAgeGroup) {
      setIsProcessing(true);
      navigationTimeoutRef.current = setTimeout(() => {
        onContinue();
        setIsProcessing(false);
        navigationTimeoutRef.current = null;
      }, 200); // Short delay for visual feedback
      return;
    }

    // First time selection - set age group and proceed
    setSelectedAgeGroup(value);
    setIsProcessing(true);
    
    // Add a small delay to show the selection animation before proceeding
    navigationTimeoutRef.current = setTimeout(() => {
      onContinue();
      setIsProcessing(false);
      navigationTimeoutRef.current = null;
    }, 600); // Reduced delay for better UX
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 sm:mb-10 lg:mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-5 lg:mb-6 playful-heading text-gray-800">
          Select Child's Age Group
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
          {isProcessing 
            ? "Great choice! Loading toys for this age group..." 
            : "This helps us curate age-appropriate toys for your child's development stage"
          }
        </p>
      </div>
      
      <div className="mb-8 sm:mb-10 lg:mb-12 space-y-3 sm:space-y-4">
        {ageGroups.map((age) => {
          const isSelected = selectedAgeGroup === age.value;
          const isCurrentlyProcessing = isProcessing && isSelected;
          return (
            <div
              key={age.value}
              onClick={() => handleAgeGroupSelect(age.value)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select age group ${age.label}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAgeGroupSelect(age.value);
                }
              }}
              className={`
                flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 
                ${age.bgColor} 
                ${isSelected ? age.selectedBorderColor : age.borderColor}
                ${isCurrentlyProcessing ? 'opacity-90' : 'cursor-pointer'}
                ${!isCurrentlyProcessing ? 'hover:scale-102 hover:shadow-lg' : ''}
                ${isProcessing && !isSelected ? 'opacity-60 pointer-events-none' : ''}
                transition-all duration-300 transform
                ${isSelected ? 'shadow-xl scale-102 ring-2 ring-opacity-20' : ''}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              `}
            >
              {/* Image */}
              <div className={`flex-shrink-0 ${isCurrentlyProcessing ? 'animate-pulse' : 'animate-gentle-bounce'}`}>
                <img 
                  src={imageService.getImageUrl(age.illustration, 'toy')}
                  alt={`Child aged ${age.label}`}
                  className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 object-cover rounded-full"
                  onError={handleImageError}
                />
              </div>
              
              {/* Text Content */}
              <div className="flex-1">
                <span className={`text-lg sm:text-xl lg:text-2xl font-bold ${age.textColor} font-comic`}>
                  {age.label}
                </span>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {isCurrentlyProcessing ? "Loading toys..." : "Perfect for this age group"}
                </p>
              </div>
              
              {/* Selection Indicator */}
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-r from-${age.textColor.replace('text-', '')} to-${age.textColor.replace('text-', '')}/80 flex items-center justify-center ${isCurrentlyProcessing ? 'animate-spin' : ''}`}>
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center px-4">
        <Button 
          variant="outline" 
          onClick={onBack} 
          disabled={isProcessing}
          className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full border-2 border-gray-300 hover:border-gray-400 transition-all duration-300 w-full sm:w-auto disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onContinue} 
          disabled={!selectedAgeGroup || isProcessing}
          className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-yellow-900 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
        >
          {isProcessing ? "Loading..." : "Continue"}
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default AgeGroupSelectionStep;
