
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface ToySelectionProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number;
}

const ToySelectionProgress = ({ currentStep, totalSteps, completedSteps = 0 }: ToySelectionProgressProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Monthly Toy Selection</span>
          <div className="flex items-center gap-2">
            {completedSteps > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Check className="w-3 h-3" />
                {completedSteps} Complete
              </Badge>
            )}
            <Badge variant="outline">
              Step {currentStep} of {totalSteps}
            </Badge>
          </div>
        </CardTitle>
        <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
      </CardHeader>
    </Card>
  );
};

export default ToySelectionProgress;
