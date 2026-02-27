
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

interface CatalogFiltersProps {
  selectedAge: string;
  setSelectedAge: (age: string) => void;
}

const CatalogFilters = ({ 
  selectedAge, 
  setSelectedAge
}: CatalogFiltersProps) => {
  const ageRanges = useMemo(() => [
    { value: "1-2", label: "1-2 YR" },
    { value: "2-3", label: "2-3 YR" },
    { value: "3-4", label: "3-4 YR" },
    { value: "4-6", label: "4-6 YR" },
    { value: "6-8", label: "6-8 YR" }
  ], []);

  // Set default to "1-2" if no valid selection
  if (!ageRanges.some(range => range.value === selectedAge)) {
    setSelectedAge("1-2");
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3 justify-center">
        {ageRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => setSelectedAge(range.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedAge === range.value
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CatalogFilters;
