
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ShoppingCart } from 'lucide-react';
import { Toy } from '@/hooks/useToys';

interface ToySelectionCompleteProps {
  selectedToys: Toy[];
  onComplete?: () => void;
  isQueueManagement?: boolean;
}

const ToySelectionComplete = ({ 
  selectedToys, 
  onComplete,
  isQueueManagement = false 
}: ToySelectionCompleteProps) => {
  const handleCompleteClick = () => {
    console.log('🔥 ToySelectionComplete - Complete button clicked');
    console.log('🔥 ToySelectionComplete - onComplete function:', !!onComplete);
    console.log('🔥 ToySelectionComplete - isQueueManagement:', isQueueManagement);
    if (onComplete) {
      console.log('🔥 ToySelectionComplete - Calling onComplete');
      onComplete();
      console.log('🔥 ToySelectionComplete - onComplete called successfully');
    } else {
      console.log('🔥 ToySelectionComplete - No onComplete function provided');
    }
  };

  console.log('🔥 ToySelectionComplete - Rendering with:', { selectedToysCount: selectedToys.length, hasOnComplete: !!onComplete, isQueueManagement });

  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">
            {isQueueManagement ? 'Toys Selected!' : 'Selection Complete!'}
          </h2>
          <p className="text-green-700">
            {isQueueManagement 
              ? 'Your toy box has been updated for this month.'
              : 'You have successfully selected all your toys for this month.'
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Selected Toys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedToys.map((toy, index) => (
              <div key={toy.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <img
                  src={toy.image_url || "/placeholder.svg"}
                  alt={toy.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="font-semibold">{toy.name}</h4>
                  <p className="text-sm text-muted-foreground">{toy.category}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Selection #{index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {onComplete && (
        <div className="text-center">
          <Button onClick={handleCompleteClick} size="lg" className="px-8 py-4">
            {isQueueManagement ? (
              <>
                Proceed to Order
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Review Selection
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ToySelectionComplete;
