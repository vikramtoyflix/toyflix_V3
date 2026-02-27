import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PaymentFlow } from "./PaymentFlow";

interface PaymentStepProps {
  selectedPlan: string;
  selectedToys: any[];
  selectedAgeGroup: string;
  rideOnToyId?: string;
  onBack: () => void;
  isCycleCompletionFlow?: boolean;
  isUpgradeFlow?: boolean;
  isRenewalFlow?: boolean;
  completionReason?: string;
}

const PaymentStep = ({ 
  selectedPlan, 
  selectedToys, 
  selectedAgeGroup, 
  rideOnToyId,
  onBack,
  isCycleCompletionFlow = false,
  isUpgradeFlow = false,
  isRenewalFlow = false,
  completionReason = ''
}: PaymentStepProps) => {
  // User is always authenticated at this point due to ProtectedRoute

  return (
    <div>
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
          Complete Your Subscription
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground px-4">
          Review your selection and complete your toy subscription
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
          Back to Summary
        </Button>
      </div>

      <PaymentFlow 
        selectedPlan={selectedPlan}
        selectedToys={selectedToys}
        ageGroup={selectedAgeGroup}
        rideOnToyId={rideOnToyId}
        onBack={onBack}
        isCycleCompletionFlow={isCycleCompletionFlow}
        isUpgradeFlow={isUpgradeFlow}
        isRenewalFlow={isRenewalFlow}
        completionReason={completionReason}
      />
    </div>
  );
};

export default PaymentStep;
