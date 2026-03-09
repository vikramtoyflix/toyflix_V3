
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ToyBrick, Bot, BrainCircuit, BookOpen } from "lucide-react";
import { Toy } from "@/hooks/useToys";
import { SubscriptionCategory } from "@/types/toy";
import { CATEGORY_LABELS } from "@/constants/categoryMapping";

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
            <div
              key={`${category}-${toy.id}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg min-w-0"
            >
              {toy.image_url && (
                <img
                  src={toy.image_url}
                  alt={toy.name}
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
              )}
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
