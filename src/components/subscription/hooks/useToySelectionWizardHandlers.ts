import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Toy } from "@/hooks/useToys";
import { ToySelectionStep } from "@/services/toySelectionService";

interface UseToySelectionWizardHandlersProps {
  currentStep: number;
  selectionSteps: ToySelectionStep[];
  isStepComplete: (step: number) => boolean;
  getStepRequirement: (step: number) => number;
  handleToySelect: (toy: Toy, e: React.MouseEvent) => void;
  handleComplete: () => void;
  handleNextStep: () => void;
}

export const useToySelectionWizardHandlers = ({
  currentStep,
  selectionSteps,
  isStepComplete,
  getStepRequirement,
  handleToySelect,
  handleComplete,
  handleNextStep,
}: UseToySelectionWizardHandlersProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddToWishlist = (toyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Added to Wishlist",
      description: "Toy added to your wishlist!",
    });
  };

  const handleViewProduct = (toyId: string) => {
    // Store subscription flow context for proper back navigation
    sessionStorage.setItem('subscription-flow-context', JSON.stringify({
      fromSubscriptionFlow: true,
      currentStep,
      planId: '', // Will be passed from parent if needed
      ageGroup: '', // Will be passed from parent if needed
      isQueueManagement: false
    }));
    navigate(`/toys/${toyId}`);
  };

  const handleMobileToySelect = (toy: Toy, e: React.MouseEvent) => {
    handleToySelect(toy, e);
    // The useEffect will handle showing the floating button
  };

  const handleFloatingButtonNext = () => {
    console.log('🔥 ToySelectionWizard - handleFloatingButtonNext called');
    console.log('🔥 Current step:', currentStep, 'Total steps:', selectionSteps.length);
    console.log('🔥 Is final step:', currentStep === selectionSteps.length);
    console.log('🔥 Is current step complete:', isStepComplete(currentStep));
    
    // Check if we're on the final step and it's complete
    const isFinalStep = currentStep === selectionSteps.length;
    const isCurrentStepComplete = isStepComplete(currentStep);
    
    if (isFinalStep && isCurrentStepComplete) {
      console.log('🔥 ToySelectionWizard - Final step complete, calling handleComplete');
      handleComplete();
    } else if (currentStep < selectionSteps.length && isCurrentStepComplete) {
      console.log('🔥 ToySelectionWizard - Can proceed to next step, calling handleNextStep');
      handleNextStep();
    } else {
      console.log('🔥 ToySelectionWizard - Cannot proceed, showing error');
      const required = getStepRequirement(currentStep);
      toast({
        title: "Selection Required",
        description: `Please select ${required} toy(s) for this step before proceeding.`,
        variant: "destructive",
      });
    }
  };

  const handleFloatingButtonDismiss = () => {
    // No floating button to dismiss
  };

  return {
    handleAddToWishlist,
    handleViewProduct,
    handleMobileToySelect,
    handleFloatingButtonNext,
    handleFloatingButtonDismiss,
  };
};
