import ToyGrid from "@/components/catalog/ToyGrid";
import { SelectedToysDisplay } from "./SelectedToysDisplay";
import ToySelectionProgress from "./ToySelectionProgress";
import ToySelectionStepInfo from "./ToySelectionStepInfo";
import ToySelectionComplete from "./ToySelectionComplete";
import ToySelectionNavigation from "./ToySelectionNavigation";
import { isFOMOStep, getFOMOTagLabelForStep } from "@/constants/fomoSelection";
import { Toy } from "@/hooks/useToys";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Rocket, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

import { useToySelectionWizardState } from "./hooks/useToySelectionWizardState";
import { useToySelectionWizardHandlers } from "./hooks/useToySelectionWizardHandlers";
import React from "react";

// Age group validation function
const validateAndNormalizeAgeGroup = (ageGroup: string): string => {
  if (!ageGroup) return '3-4'; // Default fallback
  
  // Handle special cases
  if (ageGroup === 'all') return 'all';
  if (['1-2', '2-3', '3-4', '4-6', '6-8'].includes(ageGroup)) return ageGroup;
  
  // Handle common invalid formats
  const mappings: { [key: string]: string } = {
    '3-5': '3-4',
    '5-7': '4-6',
    '7-9': '6-8',
    '4-5': '3-4',
    '5-6': '4-6',
    '6-7': '6-8',
    '1-3': '2-3',
    '2-4': '3-4'
  };
  
  if (mappings[ageGroup]) {
    console.log(`✅ ToySelectionWizard - Age group mapping: "${ageGroup}" → "${mappings[ageGroup]}"`);
    return mappings[ageGroup];
  }
  
  // Try to parse age ranges like "3-5" or "4-6"
  const ageRangeMatch = ageGroup.match(/^(\d+)-(\d+)$/);
  if (ageRangeMatch) {
    const minAge = parseInt(ageRangeMatch[1]);
    const maxAge = parseInt(ageRangeMatch[2]);
    
    let normalizedAgeGroup: string;
    if (minAge <= 2) normalizedAgeGroup = '1-2';
    else if (minAge <= 3) normalizedAgeGroup = '2-3';
    else if (minAge <= 4) normalizedAgeGroup = '3-4';
    else if (minAge <= 6) normalizedAgeGroup = '4-6';
    else normalizedAgeGroup = '6-8';
    
    console.log(`✅ ToySelectionWizard - Intelligent mapping: "${ageGroup}" → "${normalizedAgeGroup}" (based on min age: ${minAge})`);
    return normalizedAgeGroup;
  }
  
  // Final fallback
  console.log(`⚠️ ToySelectionWizard - Could not parse age group "${ageGroup}", using fallback: "3-4"`);
  return '3-4';
};

interface ToySelectionWizardProps {
  planId: string;
  ageGroup: string;
  onComplete: (toys: Toy[]) => void;
  isQueueManagement?: boolean;
}

export const ToySelectionWizard = ({ 
  planId, 
  ageGroup, 
  onComplete, 
  isQueueManagement = false 
}: ToySelectionWizardProps) => {
  const [isPopupDismissed, setIsPopupDismissed] = React.useState(false);
  const prevStepRef = React.useRef(1);

  // CRITICAL FIX: Ensure Gold pack always gets 'all' age group
  let validatedAgeGroup: string;
  if (planId === 'gold-pack' && (!ageGroup || ageGroup === '')) {
    console.log('🌟 GOLD PACK EMERGENCY FIX: ageGroup was empty, setting to "all"');
    validatedAgeGroup = 'all';
  } else {
    validatedAgeGroup = validateAndNormalizeAgeGroup(ageGroup);
  }
  
  // Add debugging for age group changes
  React.useEffect(() => {
    console.log('🎯 ToySelectionWizard - Age group changed:', {
      originalAgeGroup: ageGroup,
      validatedAgeGroup,
      planId,
      isQueueManagement,
      timestamp: new Date().toISOString()
    });
  }, [ageGroup, validatedAgeGroup, planId, isQueueManagement]);
  
  const {
    isMobile,
    toys,
    isLoading,
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
    handleComplete
  } = useToySelectionWizardState({ planId, ageGroup: validatedAgeGroup, isQueueManagement });

  const {
    handleAddToWishlist,
    handleViewProduct,
    handleMobileToySelect,
  } = useToySelectionWizardHandlers({
    currentStep,
    selectionSteps,
    isStepComplete,
    getStepRequirement,
    handleToySelect,
    handleComplete,
    handleNextStep,
  });

  const handleFinalComplete = () => {
    const allSelectedToys = getAllSelectedToys();
    onComplete(allSelectedToys);
  };

  const currentSelections = getCurrentStepSelections();
  const requirement = getStepRequirement(currentStep);
  const canProceed = canProceedToNextStep();
  const isAllStepsComplete = selectionSteps.every((_, index) => isStepComplete(index + 1));
  const isFinalStep = currentStep === selectionSteps.length;
  const isFinalStepComplete = isFinalStep && isStepComplete(currentStep);

  // Scroll to top when advancing to next step so the new step loads from top
  React.useEffect(() => {
    if (currentStep > prevStepRef.current) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      prevStepRef.current = currentStep;
    } else {
      prevStepRef.current = currentStep;
    }
  }, [currentStep]);

  // Debug toy loading state
  React.useEffect(() => {
    console.log('🧸 ToySelectionWizard - Toys state:', {
      toysCount: toys?.length || 0,
      isLoading,
      originalAgeGroup: ageGroup,
      validatedAgeGroup,
      planId,
      currentStep,
      currentStepInfo: currentStepInfo?.subscriptionCategory,
      timestamp: new Date().toISOString()
    });
  }, [toys, isLoading, ageGroup, validatedAgeGroup, planId, currentStep, currentStepInfo]);

  // Reset popup dismissed state when step changes or when user selects/deselects toys
  React.useEffect(() => {
    setIsPopupDismissed(false);
  }, [currentStep, currentSelections.length]);

  if (isComplete) {
    return (
      <ToySelectionComplete 
        selectedToys={getAllSelectedToys()}
        onComplete={handleFinalComplete}
        isQueueManagement={isQueueManagement}
      />
    );
  }

  return (
    <div className={cn("relative w-full min-w-0", isMobile ? "space-y-4 pb-4" : "space-y-8 pb-24")} style={!isMobile && currentSelections.length > 0 ? { paddingBottom: "5.5rem" } : undefined}>
      <ToySelectionProgress 
        currentStep={currentStep}
        totalSteps={selectionSteps.length}
        completedSteps={selectionSteps.filter((_, index) => isStepComplete(index + 1)).length}
      />

      {currentStepInfo && (
        <ToySelectionStepInfo 
          stepInfo={currentStepInfo}
          ageGroup={validatedAgeGroup}
          isQueueManagement={isQueueManagement}
          required={requirement}
          selected={currentSelections.length}
          planId={planId}
        />
      )}

      {/* Hide selected toys display on mobile to save space */}
      {!isMobile && (
        <SelectedToysDisplay 
          stepSelections={stepSelections}
          onRemove={handleRemoveFromStep}
          currentStep={currentStep}
        />
      )}

      {/* Trending Toys Banner - below step info, above toys */}
      <div className="flex justify-center mb-4 md:mb-6">
        <div
          className="relative inline-flex items-center justify-center gap-2 px-6 py-3 md:px-8 md:py-4 rounded-full bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 shadow-md"
          style={{ boxShadow: "0 4px 14px rgba(56, 189, 248, 0.2)" }}
        >
          <Star className="absolute -top-1 right-8 w-3 h-3 text-amber-400 fill-amber-400" />
          <Star className="absolute top-1 right-16 w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
          <Star className="absolute -top-0.5 left-12 w-2.5 h-2.5 text-amber-300 fill-amber-300" />
          <Star className="absolute top-2 left-20 w-2 h-2 text-yellow-300 fill-yellow-300" />
          <Star className="absolute -bottom-0.5 right-12 w-2 h-2 text-amber-400/80 fill-amber-400/80" />
          <Rocket className="w-5 h-5 md:w-6 md:h-6 text-blue-500 flex-shrink-0" />
          <span className="font-bold text-base md:text-xl text-slate-800 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" />
            Trending Toys This Month
          </span>
        </div>
      </div>

      <ToyGrid 
        toys={toys || []}
        isLoading={isLoading}
        onToyAction={handleMobileToySelect}
        onAddToWishlist={handleAddToWishlist}
        onViewProduct={handleViewProduct}
        isSubscriptionView={true}
        selectedToyIds={currentSelections.map(t => t.id)}
        showOutOfStock={true}
        getToyTagLabel={
          currentStepInfo && isFOMOStep(currentStepInfo.subscriptionCategory)
            ? (toy: Toy, index: number) =>
                getFOMOTagLabelForStep(
                  currentStepInfo!.subscriptionCategory as 'educational_toys' | 'developmental_toys' | 'books',
                  index
                )
            : undefined
        }
        useColoredTags={!!(currentStepInfo && isFOMOStep(currentStepInfo.subscriptionCategory))}
      />

      {/* Mobile Next Step Button - Centered popup in middle of screen */}
      {isMobile && currentSelections.length > 0 && !isPopupDismissed && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" />
          
          {/* Centered popup */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Selection Progress</h3>
                <button
                  onClick={() => setIsPopupDismissed(true)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Progress section */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    currentSelections.length >= requirement 
                      ? 'bg-green-100 scale-110' 
                      : 'bg-blue-100'
                  }`}>
                    {currentSelections.length >= requirement ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <span className="text-blue-600 font-bold text-lg">
                        {currentSelections.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {currentSelections.length}/{requirement} toys selected
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentSelections.length >= requirement 
                        ? (isFinalStep ? '🎉 Ready to complete selection!' : '✨ Ready for next step!')
                        : `Select ${requirement - currentSelections.length} more toy${requirement - currentSelections.length > 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min((currentSelections.length / requirement) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Action button */}
              <Button
                disabled={!canProceed}
                className={`w-full py-3 text-lg font-semibold transition-all duration-300 ${
                  canProceed 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-105' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (isFinalStep && isFinalStepComplete) {
                    handleComplete();
                  } else {
                    handleNextStep();
                  }
                }}
              >
                {isFinalStep && isFinalStepComplete ? '🎉 Complete Selection' : '➡️ Next Step'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Small floating indicator when popup is dismissed but user can proceed */}
      {isMobile && currentSelections.length > 0 && isPopupDismissed && canProceed && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <button
            onClick={() => setIsPopupDismissed(false)}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 shadow-lg animate-pulse"
          >
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Desktop: fixed bottom bar so Next step is visible without scrolling */}
      {!isMobile && currentSelections.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="container mx-auto max-w-7xl px-4 py-3">
            <div className="flex justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {currentSelections.length}/{requirement} selected
                {isFinalStep && isFinalStepComplete && " — Ready to complete!"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentStep === 1}
                  size="lg"
                >
                  Previous
                </Button>
                {isFinalStep ? (
                  <Button
                    onClick={handleComplete}
                    disabled={!isFinalStepComplete}
                    size="lg"
                    className="px-6"
                  >
                    Complete Selection
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextStep}
                    disabled={!canProceed}
                    size="lg"
                    className="px-6"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop in-flow navigation (when no selection yet, so layout is unchanged) */}
      {!isMobile && currentSelections.length === 0 && (
        <ToySelectionNavigation
          currentStep={currentStep}
          totalSteps={selectionSteps.length}
          canProceedToNextStep={canProceed}
          isAllStepsComplete={isAllStepsComplete}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
};
