import { formatAgeRanges } from '@/utils/ageRangeUtils';

interface AgeRangeDisplayProps {
  ageRange: string;
  className?: string;
}

export const AgeRangeDisplay = ({ ageRange, className = "" }: AgeRangeDisplayProps) => {
  const formattedRange = formatAgeRanges(ageRange);
  
  return (
    <span className={`text-sm text-muted-foreground ${className}`}>
      {formattedRange}
    </span>
  );
}; 