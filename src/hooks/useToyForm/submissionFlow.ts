
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { ToyFormData } from "@/types/toy";
import { 
  saveToyAdmin,
  saveToyImagesAdmin,
  prepareToyData
} from './toyService';
import { optimisticUpdateToyCache } from './cacheManager';
import { NetworkRetryService } from './networkRetryService';
import { NetworkValidationService } from './networkValidationService';

export const useSubmissionFlow = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const executeSubmission = async (
    formData: ToyFormData,
    primaryImageIndex: number,
    isNewToy: boolean,
    id?: string
  ) => {
    // Check network status before starting
    const { hasConnectivity } = await NetworkValidationService.checkNetworkBeforeSubmission();

    if (!hasConnectivity) {
      throw new Error('Please check your internet connection and try again.');
    }

    console.log('Preparing toy data for submission...');
    const toyData = prepareToyData(formData, primaryImageIndex);
    console.log('Prepared toy data:', toyData);
    
    // Apply optimistic update if editing existing toy
    if (!isNewToy && id) {
      optimisticUpdateToyCache(queryClient, id, toyData);
    }
    
    // Save toy with retry logic and enhanced error handling using admin operations
    console.log('Saving toy to database (admin)...');
    const toyId = await NetworkRetryService.withRetryAndConnectivity(
      async () => {
        const result = await saveToyAdmin(toyData, isNewToy, id);
        console.log('Toy save operation completed with result (admin):', result);
        return result;
      },
      3,
      1000
    );
    
    if (!toyId) {
      throw new Error('Failed to save toy - no ID returned');
    }
    
    console.log('Toy saved successfully with ID (admin):', toyId);

    // Save images if present using admin operations
    if (formData.images.length > 0 && toyId) {
      try {
        console.log('Saving toy images (admin)...');
        await NetworkRetryService.withRetryAndConnectivity(
          () => saveToyImagesAdmin(toyId, formData.images, primaryImageIndex),
          2,
          1000
        );
        console.log('Images saved successfully (admin)');
      } catch (error) {
        console.error('Error saving images (admin):', error);
        toast({
          title: "Partial Success",
          description: "Toy saved but some images may not have been updated. Please try editing again if needed.",
          variant: "destructive"
        });
      }
    }

    return toyId;
  };

  const handleSuccessfulSubmission = (isNewToy: boolean) => {
    toast({
      title: "Success",
      description: `${isNewToy ? "Toy created" : "Toy updated"} successfully!`,
    });

    console.log('Form submission completed successfully (admin)');

    // Navigate back to admin panel toys section after successful save
    setTimeout(() => {
      navigate('/admin?tab=toys');
    }, 1500);
  };

  return {
    executeSubmission,
    handleSuccessfulSubmission
  };
};
