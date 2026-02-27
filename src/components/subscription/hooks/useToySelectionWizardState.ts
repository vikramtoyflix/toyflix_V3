import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToySelectionLogic } from "@/hooks/useToySelectionLogic";
import { useSubscriptionToys } from "@/hooks/useSubscriptionToys";
import { useFlowToys } from "@/hooks/useFlowToys";

interface UseToySelectionWizardStateProps {
  planId: string;
  ageGroup: string;
  isQueueManagement: boolean;
}

export const useToySelectionWizardState = ({ 
  planId, 
  ageGroup, 
  isQueueManagement 
}: UseToySelectionWizardStateProps) => {
  const isMobile = useIsMobile();
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  
  const toySelectionLogic = useToySelectionLogic(planId);
  const {
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
  } = toySelectionLogic;

  // Debug the parameters being passed
  console.log('🔍 useToySelectionWizardState - Hook parameters:', {
    planId,
    ageGroup,
    currentStepInfo: currentStepInfo?.subscriptionCategory,
    isQueueManagement,
    currentStep,
    timestamp: new Date().toISOString()
  });

  // CRITICAL FIX: Use flowToys as primary hook since subscription data may be missing
  const flowToys = useFlowToys(
    planId || 'silver-pack', 
    ageGroup || '3-4', 
    currentStepInfo?.subscriptionCategory || 'big_toys',
    { enabled: true } // Always enable flowToys
  );
  
  const subscriptionToys = useSubscriptionToys(currentStepInfo?.subscriptionCategory, { enabled: isQueueManagement });

  // Smart fallback logic: Use flowToys as primary, subscriptionToys as fallback
  const primaryToys = flowToys.data && flowToys.data.length > 0 ? flowToys : subscriptionToys;
  const { data: toys, isLoading } = primaryToys;

  console.log('🔧 useToySelectionWizardState - Fallback logic:', {
    flowToysCount: flowToys.data?.length || 0,
    subscriptionToysCount: subscriptionToys.data?.length || 0,
    usingFlowToys: primaryToys === flowToys,
    isQueueManagement
  });

  // Debug toy loading results
  console.log('🧸 useToySelectionWizardState - Toy loading results:', {
    toysCount: toys?.length || 0,
    isLoading,
    isQueueManagement,
    hookUsed: isQueueManagement ? 'subscriptionToys' : 'flowToys',
    planId,
    ageGroup,
    category: currentStepInfo?.subscriptionCategory
  });

  // Memoize the current selections to prevent unnecessary recalculations
  const currentSelections = useMemo(() => {
    return getCurrentStepSelections();
  }, [getCurrentStepSelections]);

  // Memoize the requirement calculation
  const requirement = useMemo(() => {
    return getStepRequirement(currentStep);
  }, [getStepRequirement, currentStep]);

  // Memoize the floating button visibility logic
  const shouldShowFloatingButton = useMemo(() => {
    // No longer need floating button logic - using sticky button after toy grid
    return false;
  }, []);

  // Optimize the floating button visibility effect
  useEffect(() => {
    if (shouldShowFloatingButton !== showFloatingButton) {
      setShowFloatingButton(shouldShowFloatingButton);
    }
  }, [shouldShowFloatingButton, showFloatingButton]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    isMobile,
    showFloatingButton,
    setShowFloatingButton,
    toys,
    isLoading,
    ...toySelectionLogic,
  }), [
    isMobile,
    showFloatingButton,
    toys,
    isLoading,
    toySelectionLogic,
  ]);

  return returnValue;
};
