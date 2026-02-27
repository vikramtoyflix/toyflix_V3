import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToySelectionService } from "@/services/toySelectionService";
import { PlanService } from "@/services/planService";
import { Toy } from "@/hooks/useToys";
import { SubscriptionCategory } from "@/types/toy";
import { fbqTrack } from "@/utils/fbq";

interface StepSelections {
  [key: string]: Toy[];
}

export const useToySelectionLogic = (planId: string) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepSelections, setStepSelections] = useState<StepSelections>({});
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  // Memoize expensive calculations
  const plan = useMemo(() => PlanService.getPlan(planId), [planId]);
  const selectionSteps = useMemo(() => ToySelectionService.getSelectionSteps(), []);
  const currentStepInfo = useMemo(() => ToySelectionService.getStepInfo(currentStep), [currentStep]);

  // Memoize the step requirement calculation
  const getStepRequirement = useCallback((step: number): number => {
    if (!plan) return 1;
    
    switch (step) {
      case 1: // Big Toys
        return plan.features.bigToys;
      case 2: // STEM Toys
        return plan.features.stemToys;
      case 3: // Educational Toys
        return plan.features.educationalToys;
      case 4: // Books
        return plan.features.books;
      default:
        return 1;
    }
  }, [plan]);

  // Memoize current step selections
  const getCurrentStepSelections = useCallback((): Toy[] => {
    if (!currentStepInfo) return [];
    return stepSelections[currentStepInfo.subscriptionCategory] || [];
  }, [currentStepInfo, stepSelections]);

  // Memoize all selected toys
  const getAllSelectedToys = useCallback((): Toy[] => {
    return Object.values(stepSelections).flat();
  }, [stepSelections]);

  // Memoize step completion check
  const isStepComplete = useCallback((step: number): boolean => {
    const stepInfo = ToySelectionService.getStepInfo(step);
    if (!stepInfo) return false;
    
    const selections = stepSelections[stepInfo.subscriptionCategory] || [];
    const required = getStepRequirement(step);
    return selections.length >= required;
  }, [stepSelections, getStepRequirement]);

  // Memoize can proceed check
  const canProceedToNextStep = useCallback((): boolean => {
    return isStepComplete(currentStep);
  }, [isStepComplete, currentStep]);

  const handleToySelect = useCallback((toy: Toy, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentStepInfo) {
      return;
    }
    
    const currentSelections = getCurrentStepSelections();
    const required = getStepRequirement(currentStep);
    
    // FIXED: Check if toy is already selected in ANY step, not just current step
    const allSelectedToys = getAllSelectedToys();
    const isAlreadySelectedInAnyStep = allSelectedToys.some(t => t.id === toy.id);
    
    // Check if toy is already selected in current step
    const isSelectedInCurrentStep = currentSelections.some(t => t.id === toy.id);
    
    if (isSelectedInCurrentStep) {
      // Remove toy from current step
      const updatedSelections = currentSelections.filter(t => t.id !== toy.id);
      setStepSelections(prev => ({
        ...prev,
        [currentStepInfo.subscriptionCategory]: updatedSelections
      }));
      
      // 📊 Track toy removal for Meta Signals Gateway
      fbqTrack('RemoveFromCart', {
        content_ids: [toy.id],
        content_name: toy.name,
        content_type: 'product',
        value: toy.rental_price || 0,
        currency: 'INR',
        content_category: currentStepInfo.subscriptionCategory,
        selection_step: currentStep,
        total_selected: updatedSelections.length
      });
    } else if (isAlreadySelectedInAnyStep) {
      // FIXED: Prevent selecting the same toy in a different step
      toast({
        title: "Duplicate Selection",
        description: "This toy is already selected in another category. Each toy can only be selected once.",
        variant: "destructive",
      });
    } else if (currentSelections.length < required) {
      // Add toy to current step
      const updatedSelections = [...currentSelections, toy];
      setStepSelections(prev => ({
        ...prev,
        [currentStepInfo.subscriptionCategory]: updatedSelections
      }));
      
      // 📊 Track toy selection for Meta Signals Gateway
      fbqTrack('AddToCart', {
        content_ids: [toy.id],
        content_name: toy.name,
        content_type: 'product',
        value: toy.rental_price || 0,
        currency: 'INR',
        content_category: currentStepInfo.subscriptionCategory,
        selection_step: currentStep,
        total_selected: updatedSelections.length,
        step_required: required
      });
    } else {
      toast({
        title: "Selection Limit Reached",
        description: `You can only select ${required} toy(s) for this step.`,
        variant: "destructive",
      });
    }
  }, [currentStepInfo, getCurrentStepSelections, getAllSelectedToys, getStepRequirement, currentStep, toast]);

  const handleRemoveFromStep = useCallback((toyId: string, subscriptionCategory: SubscriptionCategory) => {
    setStepSelections(prev => ({
      ...prev,
      [subscriptionCategory]: (prev[subscriptionCategory] || []).filter(t => t.id !== toyId)
    }));
  }, []);

  const handleComplete = useCallback(() => {
    // Simple approach: check if all steps are complete
    const allStepsComplete = selectionSteps.every((_, index) => {
      const stepNum = index + 1;
      return isStepComplete(stepNum);
    });
    
    if (allStepsComplete) {
      setIsComplete(true);
    } else {
      // Log which steps are incomplete for debugging
      selectionSteps.forEach((step, index) => {
        const stepNum = index + 1;
        const stepComplete = isStepComplete(stepNum);
        const stepInfo = ToySelectionService.getStepInfo(stepNum);
        const stepRequired = getStepRequirement(stepNum);
        const stepSelectionCount = stepInfo ? (stepSelections[stepInfo.subscriptionCategory] || []).length : 0;
        console.log(`  Step ${stepNum} (${stepInfo?.description}): ${stepSelectionCount}/${stepRequired} - ${stepComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
      });
      
      toast({
        title: "Selection Incomplete",
        description: "Please complete all toy selection steps before proceeding.",
        variant: "destructive",
      });
    }
  }, [selectionSteps, isStepComplete, stepSelections, getStepRequirement, toast]);

  const handleNextStep = useCallback(() => {
    console.log('🔥 useToySelectionLogic - handleNextStep called');
    console.log('🔥 useToySelectionLogic - Current step:', currentStep);
    console.log('🔥 useToySelectionLogic - Total steps:', selectionSteps.length);
    console.log('🔥 useToySelectionLogic - Can proceed:', canProceedToNextStep());
    
    if (canProceedToNextStep()) {
      if (currentStep < selectionSteps.length) {
        console.log('🔥 useToySelectionLogic - Moving to next step:', currentStep + 1);
        setCurrentStep(currentStep + 1);
      } else {
        console.log('🔥 useToySelectionLogic - Reached end of steps, calling handleComplete');
        // We've reached the end of all steps, complete the selection
        handleComplete();
      }
    } else {
      const required = getStepRequirement(currentStep);
      console.log('🔥 useToySelectionLogic - Cannot proceed, showing toast. Required:', required);
      toast({
        title: "Selection Required",
        description: `Please select ${required} toy(s) for this step before proceeding.`,
        variant: "destructive",
      });
    }
  }, [canProceedToNextStep, currentStep, selectionSteps.length, getStepRequirement, toast, handleComplete]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Memoize the return object
  const returnValue = useMemo(() => ({
    currentStep,
    stepSelections,
    isComplete,
    selectionSteps,
    currentStepInfo,
    getStepRequirement,
    getCurrentStepSelections,
    getAllSelectedToys,
    isStepComplete,
    canProceedToNextStep,
    handleToySelect,
    handleRemoveFromStep,
    handleNextStep,
    handlePreviousStep,
    handleComplete,
  }), [
    currentStep,
    stepSelections,
    isComplete,
    selectionSteps,
    currentStepInfo,
    getStepRequirement,
    getCurrentStepSelections,
    getAllSelectedToys,
    isStepComplete,
    canProceedToNextStep,
    handleToySelect,
    handleRemoveFromStep,
    handleNextStep,
    handlePreviousStep,
    handleComplete,
  ]);

  return returnValue;
};
