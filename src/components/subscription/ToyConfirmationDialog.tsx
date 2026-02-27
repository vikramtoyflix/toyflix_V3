
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Toy } from '@/hooks/useToys';
import { ToySelectionStep } from '@/services/toySelectionService';

interface ToyConfirmationDialogProps {
  selectedToy: Toy;
  stepInfo: ToySelectionStep;
  isSelecting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ToyConfirmationDialog = ({ 
  selectedToy, 
  stepInfo, 
  isSelecting, 
  onConfirm, 
  onCancel 
}: ToyConfirmationDialogProps) => {
  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Toy Selection</DialogTitle>
        </DialogHeader>
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={selectedToy.image_url || "/placeholder.svg"} 
                alt={selectedToy.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div>
                <h4 className="font-semibold">{selectedToy.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedToy.category}</p>
              </div>
            </div>
            <p className="text-sm mb-4">
              Are you sure you want to select "{selectedToy.name}" for {stepInfo.description.toLowerCase()}?
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={onConfirm}
                disabled={isSelecting}
              >
                {isSelecting ? "Selecting..." : "Confirm Selection"}
              </Button>
              <Button 
                variant="outline" 
                onClick={onCancel}
                disabled={isSelecting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ToyConfirmationDialog;
