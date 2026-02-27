
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { ToyFormData } from "@/types/toy";
import { ToyFormState, ToyFormActions } from './types';
import { loadToyFormData } from './formDataLoader';
import { useFormSubmission } from './formSubmission';

export const useToyForm = (id?: string, isNewToy = false): ToyFormState & ToyFormActions => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ToyFormData>({
    name: '',
    description: '',
    category: [],
    subscription_category: 'educational_toys',
    age_range: [],
    brand: '',
    pack: [],
    retail_price: '',
    rental_price: '',
    image_url: '',
    images: [],
    total_quantity: '',
    available_quantity: '',
    rating: '',
    show_strikethrough_pricing: true,
    display_order: '',
    is_featured: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

  const { submitForm, isLoading: roleLoading, hasValidSession, sessionInfo } = useFormSubmission(isNewToy, id);

  // Load toy data for editing
  useEffect(() => {
    const loadData = async () => {
      if (id && !isNewToy) {
        try {
          setIsLoading(true);
          console.log('Loading toy data for editing, ID:', id);
          const loadedData = await loadToyFormData(id);
          console.log('Loaded toy data:', loadedData);
          // Extract formData and primaryImageIndex from the returned object
          const { primaryImageIndex: loadedPrimaryIndex, ...toyFormData } = loadedData;
          setFormData(toyFormData);
          setPrimaryImageIndex(loadedPrimaryIndex);
        } catch (error) {
          console.error('Error loading toy data:', error);
          toast({
            title: "Error",
            description: "Failed to load toy data. Please try again.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [id, isNewToy, toast]);

  // Check session validity - only show warning after initial load and role verification
  useEffect(() => {
    // Only show warning if:
    // 1. Not a new toy (editing existing)
    // 2. Not in loading state (role verification complete)
    // 3. Session is actually invalid
    // 4. We have session info (not still loading)
    if (!isNewToy && !roleLoading && !hasValidSession && sessionInfo.user && sessionInfo.session) {
      console.log('Session validation failed after role loading completed:', sessionInfo);
      
      // Add a small delay to prevent false positives during rapid state changes
      const warningTimeout = setTimeout(() => {
        toast({
          title: "Session Warning",
          description: "Your session may have expired. Please save your work and refresh if needed.",
          variant: "destructive"
        });
      }, 1000);

      return () => clearTimeout(warningTimeout);
    }
  }, [hasValidSession, sessionInfo, isNewToy, roleLoading, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional session check before submission
    if (!hasValidSession) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please refresh the page and log in again.",
        variant: "destructive"
      });
      return;
    }
    
    await submitForm(formData, primaryImageIndex, setIsLoading);
  };

  return {
    formData,
    setFormData,
    isLoading: isLoading || roleLoading,
    primaryImageIndex,
    setPrimaryImageIndex,
    handleSubmit
  };
};
