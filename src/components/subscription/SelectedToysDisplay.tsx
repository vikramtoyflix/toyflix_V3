import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ToyBrick, Bot, BrainCircuit, BookOpen, Package } from "lucide-react";
import { Toy } from "@/hooks/useToys";
import { SubscriptionCategory } from "@/types/toy";
import { CATEGORY_LABELS } from "@/constants/categoryMapping";
import { imageService } from "@/services/imageService";

interface StepSelections {
  [key: string]: Toy[];
}

interface SelectedToysDisplayProps {
  stepSelections: StepSelections;
  onRemove: (toyId: string, subscriptionCategory: SubscriptionCategory) => void;
  currentStep: number;
}

// Use centralized category labels from constants
// const categoryLabels = CATEGORY_LABELS; // We'll use CATEGORY_LABELS directly

const categoryIcons: { [key: string]: React.ReactNode } = {
  'big_toys': <ToyBrick className="w-4 h-4" />,
  'educational_toys': <Bot className="w-4 h-4" />,
  'developmental_toys': <Bot className="w-4 h-4" />,
  'books': <BookOpen className="w-4 h-4" />,
  'stem_toys': <BrainCircuit className="w-4 h-4" />,
  'ride_on_toys': <ToyBrick className="w-4 h-4" />
};

// Selection flow display labels: Step 2=Educational, Step 3=Developmental
const SELECTION_CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORY_LABELS,
  'educational_toys': 'Educational',
  'developmental_toys': 'Developmental',
  'stem_toys': 'Educational',
};

export const SelectedToysDisplay = ({ stepSelections, onRemove, currentStep }: SelectedToysDisplayProps) => {
  const hasSelections = Object.values(stepSelections).some(toys => toys.length > 0);

  if (!hasSelections) {
    return null;
  }

  // Flatten all toys with category into one array for side-by-side layout
  const allToysWithCategory = Object.entries(stepSelections).flatMap(([category, toys]) =>
    toys.map((toy) => ({ toy, category }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Selected Toys</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allToysWithCategory.map(({ toy, category }) => (
            <SelectedToyCard
              key={`${category}-${toy.id}`}
              toy={toy}
              category={category}
              onRemove={onRemove}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

function SelectedToyCard({ toy, category, onRemove }: {
  toy: Toy;
  category: string;
  onRemove: (toyId: string, cat: SubscriptionCategory) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = imageError || !toy.image_url
    ? imageService.getFallbackChain('toy')[0]
    : (toy.image_url || '').replace('/storage/v1/s3/', '/storage/v1/object/public/');

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg min-w-0">
      <div className="w-12 h-12 rounded flex-shrink-0 bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl && imageUrl.startsWith('http') ? (
          <img
            src={imageUrl}
            alt={toy.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Package className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{toy.name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="flex-shrink-0">{categoryIcons[category]}</span>
          <span className="truncate">{SELECTION_CATEGORY_LABELS[category] || CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</span>
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(toy.id, category as SubscriptionCategory)}
        className="h-8 w-8 p-0 flex-shrink-0 text-red-500 hover:text-red-700"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
