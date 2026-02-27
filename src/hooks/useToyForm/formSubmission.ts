
import { validateToyForm } from './formValidation';
import { ToyFormData } from "@/types/toy";
import { RollbackService } from './rollbackService';
import { SubmissionCacheService } from './submissionCacheService';
import { useSessionManager } from './sessionManager';
import { useSubmissionFlow } from './submissionFlow';
import { useSubmissionErrorHandler } from './submissionErrorHandler';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

export const useFormSubmission = (isNewToy: boolean, id?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { 
    refreshSessionIfNeeded, 
    validateAdminAccess, 
    roleLoading, 
    hasValidSession, 
    sessionInfo 
  } = useSessionManager();
  const { executeSubmission, handleSuccessfulSubmission } = useSubmissionFlow();
  const { handleSubmissionError } = useSubmissionErrorHandler();

  const submitForm = async (
    formData: ToyFormData, 
    primaryImageIndex: number,
    setIsLoading: (loading: boolean) => void
  ) => {
    console.log('Form submission started with data:', formData);
    
    // Validate form
    const validationError = validateToyForm(formData);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    let originalToyData = null;

    try {
      // Refresh session if needed
      await refreshSessionIfNeeded();

      // Validate admin access
      validateAdminAccess();

      // Store original data for rollback if editing existing toy
      if (!isNewToy && id) {
        originalToyData = await RollbackService.storeOriginalData(queryClient, id);
      }

      // Execute the submission
      await executeSubmission(formData, primaryImageIndex, isNewToy, id);

      // Enhanced cache refresh
      const cacheResult = await SubmissionCacheService.refreshCache(queryClient);
      
      if (!cacheResult.success) {
        toast({
          title: "Success with Warning",
          description: `${isNewToy ? "Toy created" : "Toy updated"} successfully. Please refresh the page if changes don't appear immediately.`,
        });
      } else {
        handleSuccessfulSubmission(isNewToy);
      }

    } catch (error) {
      // Handle retry case for role verification
      if (error.message.includes('Role verification in progress')) {
        toast({
          title: "Loading",
          description: "Please wait while we verify your permissions...",
        });
        // Retry after a short delay
        setTimeout(() => submitForm(formData, primaryImageIndex, setIsLoading), 1000);
        return;
      }

      // Handle all other errors
      await handleSubmissionError(error, isNewToy, id, originalToyData);
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    submitForm, 
    isLoading: roleLoading,
    hasValidSession,
    sessionInfo
  };
};
