
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ToyBrick, Bot, BrainCircuit, BookOpen, Blocks } from "lucide-react";
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
  'stem_toys': <Bot className="w-4 h-4" />,
  'educational_toys': <BrainCircuit className="w-4 h-4" />,
  'books': <BookOpen className="w-4 h-4" />,
  'developmental_toys': <Blocks className="w-4 h-4" />,
  'ride_on_toys': <ToyBrick className="w-4 h-4" />
};

export const SelectedToysDisplay = ({ stepSelections, onRemove, currentStep }: SelectedToysDisplayProps) => {
  const hasSelections = Object.values(stepSelections).some(toys => toys.length > 0);

  if (!hasSelections) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Selected Toys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(stepSelections).map(([category, toys]) => {
          if (toys.length === 0) return null;
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                {categoryIcons[category]}
                <h3 className="font-medium">{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</h3>
                <Badge variant="secondary">{toys.length} selected</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {toys.map((toy) => (
                  <div key={toy.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {toy.image_url && (
                        <img 
                          src={toy.image_url} 
                          alt={toy.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{toy.name}</p>
                        <p className="text-xs text-muted-foreground">{toy.brand}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(toy.id, category as SubscriptionCategory)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
