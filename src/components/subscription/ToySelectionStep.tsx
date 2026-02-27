import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ToySelectionWizard } from "./ToySelectionWizard";
import { Toy } from "@/hooks/useToys";

interface ToySelectionStepProps {
  selectedPlan: string;
  selectedAgeGroup: string;
  onBack: () => void;
  onComplete: (toys: Toy[]) => void;
}

const ToySelectionStep = ({ 
  selectedPlan, 
  selectedAgeGroup, 
  onBack, 
  onComplete 
}: ToySelectionStepProps) => {
  // Check if this is a Gold pack (no age selection)
  const isGoldPack = selectedPlan && selectedPlan.includes('gold');
  const backButtonText = isGoldPack ? "Back to Plans" : "Back to Age Selection";

  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
          Select Your Monthly Toys
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-4">
          Choose toys for your first month based on your plan and age group
        </p>
      </div>
      
      <div className="mb-3 sm:mb-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          size="sm"
          className="text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backButtonText}
        </Button>
      </div>

      <ToySelectionWizard 
        planId={selectedPlan} 
        ageGroup={selectedAgeGroup}
        onComplete={onComplete}
        isQueueManagement={false}
      />
    </div>
  );
};

export default ToySelectionStep;
