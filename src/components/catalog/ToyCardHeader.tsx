
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Baby, Users, GraduationCap, Gamepad2 } from "lucide-react";

interface ToyCardHeaderProps {
  toy: {
    name: string;
    category: string;
    rating: number;
    age_range: string;
  };
}

const getAgeIcon = (ageRange: string) => {
  const age = ageRange.toLowerCase();
  if (age.includes('0-2') || age.includes('baby')) return Baby;
  if (age.includes('3-5') || age.includes('toddler')) return Users;
  if (age.includes('6-8') || age.includes('school')) return GraduationCap;
  if (age.includes('9+') || age.includes('teen')) return Gamepad2;
  return Users;
};

const getAgeColor = (ageRange: string) => {
  const age = ageRange.toLowerCase();
  if (age.includes('0-2') || age.includes('baby')) return 'bg-age-baby text-toy-coral border-toy-coral/30';
  if (age.includes('3-5') || age.includes('toddler')) return 'bg-age-toddler text-toy-sky border-toy-sky/30';
  if (age.includes('6-8') || age.includes('school')) return 'bg-age-school text-toy-orange border-toy-orange/30';
  if (age.includes('9+') || age.includes('teen')) return 'bg-age-teen text-toy-purple border-toy-purple/30';
  return 'bg-age-preschool text-toy-mint border-toy-mint/30';
};

const getCategoryColor = (category: string) => {
  const categoryColors = {
    'educational': 'bg-toy-mint/20 text-toy-mint border-toy-mint/30',
    'creative': 'bg-toy-coral/20 text-toy-coral border-toy-coral/30',
    'active': 'bg-toy-orange/20 text-toy-orange border-toy-orange/30',
    'puzzle': 'bg-toy-purple/20 text-toy-purple border-toy-purple/30',
    'building': 'bg-toy-sky/20 text-toy-sky border-toy-sky/30',
    'pretend': 'bg-toy-peach/20 text-toy-peach border-toy-peach/30',
    'default': 'bg-toy-sunshine/20 text-toy-sunshine border-toy-sunshine/30'
  };
  
  return categoryColors[category.toLowerCase() as keyof typeof categoryColors] || categoryColors.default;
};

const ToyCardHeader = ({ toy }: ToyCardHeaderProps) => {
  const AgeIcon = getAgeIcon(toy.age_range);
  
  return (
    <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4 md:p-5 lg:p-6">
      <CardTitle className="line-clamp-1 sm:line-clamp-2 text-sm sm:text-base md:text-lg lg:text-xl group-hover:text-primary transition-colors duration-300">
        {toy.name}
      </CardTitle>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge 
            variant="outline" 
            className={`age-badge ${getAgeColor(toy.age_range)} border text-xs font-medium`}
          >
            <AgeIcon className="w-2 h-2 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
            <span className="hidden sm:inline">{toy.age_range}</span>
            <span className="sm:hidden">{toy.age_range.split(' ')[0]}</span>
          </Badge>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Badge 
            variant="outline" 
            className={`${getCategoryColor(toy.category)} border text-xs hidden sm:inline-flex`}
          >
            {toy.category}
          </Badge>
          
          {toy.rating > 0 && (
            <div className="flex items-center bg-toy-sunshine/20 px-1.5 sm:px-2 py-1 rounded-full border border-toy-sunshine/30">
              <Star className="w-2 h-2 sm:w-3 sm:h-3 text-toy-sunshine fill-current" />
              <span className="ml-0.5 sm:ml-1 text-xs font-medium text-toy-sunshine">{toy.rating}</span>
            </div>
          )}
        </div>
      </div>
    </CardHeader>
  );
};

export default ToyCardHeader;
