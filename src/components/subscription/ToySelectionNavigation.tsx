import { Button } from "@/components/ui/button";

interface ToySelectionNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceedToNextStep: boolean;
  isAllStepsComplete: boolean;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onComplete: () => void;
}

const ToySelectionNavigation = ({
  currentStep,
  totalSteps,
  canProceedToNextStep,
  isAllStepsComplete,
  onPreviousStep,
  onNextStep,
  onComplete
}: ToySelectionNavigationProps) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-4 z-50">
      <div className="container mx-auto max-w-7xl">
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onPreviousStep}
            disabled={currentStep === 1}
            size="lg"
          >
            Previous Step
          </Button>
          
          {currentStep === totalSteps ? (
            <Button 
              onClick={() => {
                onComplete();
              }}
              disabled={!isAllStepsComplete}
              size="lg"
              className="px-8"
            >
              Complete Selection
            </Button>
          ) : (
            <Button 
              onClick={() => {
                onNextStep();
              }}
              disabled={!canProceedToNextStep}
              size="lg"
              className="px-8"
            >
              Next Step
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToySelectionNavigation;
