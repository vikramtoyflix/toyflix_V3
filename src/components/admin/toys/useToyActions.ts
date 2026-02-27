import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { bulkOperationService } from "@/services/bulkOperationService";
import { ToyCategory } from "@/types/toy";

export const useToyActions = (refetch: () => Promise<any>, clearSelection: () => void) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [deletingToyId, setDeletingToyId] = useState<string | null>(null);

  // Debounced refresh to prevent rapid successive refreshes
  const debouncedRefetch = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Debounced refresh error:', error);
    }
  }, [refetch]);

  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    try {
      setIsOperationLoading(true);
      await refetch();
      toast({
        title: "Refreshed",
        description: "Toy list has been refreshed",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error",
        description: "Failed to refresh toy list",
        variant: "destructive"
      });
    } finally {
      setIsOperationLoading(false);
    }
  }, [refetch, toast]);

  const handleEditToy = useCallback((toyId: string) => {
    navigate(`/admin/new-toy-edit/${toyId}`);
  }, [navigate]);

  const handleDeleteToy = useCallback(async (toyId: string) => {
    if (deletingToyId) {
      console.log('Delete operation already in progress, skipping...');
      return;
    }

    setDeletingToyId(toyId);

    try {
      const { error } = await supabase
        .from('toys')
        .delete()
        .eq('id', toyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Toy deleted successfully"
      });
      
      // Use debounced refetch to prevent UI freezing
      setTimeout(() => {
        debouncedRefetch();
      }, 500);
    } catch (error) {
      console.error('Error deleting toy:', error);
      toast({
        title: "Error",
        description: "Failed to delete toy",
        variant: "destructive"
      });
    } finally {
      setDeletingToyId(null);
    }
  }, [deletingToyId, toast, debouncedRefetch]);

  const handleBulkAction = useCallback(async (actionId: string, selectedIds: string[]) => {
    console.log(`🎯 useToyActions: handleBulkAction called with actionId: ${actionId}`);
    console.log(`🎯 useToyActions: selectedIds:`, selectedIds);

    if (isOperationLoading) {
      console.log('Bulk operation already in progress, skipping...');
      return null;
    }

    switch (actionId) {
      case 'delete':
        return {
          title: 'Delete Selected Toys',
          description: 'Are you sure you want to delete the selected toys? This action cannot be undone.',
          actionLabel: 'Delete',
          destructive: true,
          action: async () => {
            console.log('🎯 useToyActions: Starting bulk delete operation...');
            setIsOperationLoading(true);
            
            try {
              console.log('🎯 useToyActions: Calling bulkOperationService.bulkDeleteToys...');
              const result = await bulkOperationService.bulkDeleteToys(selectedIds);
              console.log('🎯 useToyActions: Bulk delete result:', result);
              
              if (result.success) {
                toast({ title: "Success", description: result.message });
                clearSelection();
                // Use debounced refetch to prevent UI freezing
                setTimeout(() => {
                  debouncedRefetch();
                }, 500);
              } else {
                console.error('🎯 useToyActions: Bulk delete failed:', result);
                toast({
                  title: "Error",
                  description: result.message,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('🎯 useToyActions: Bulk delete exception:', error);
              toast({
                title: "Error",
                description: "An unexpected error occurred during bulk delete",
                variant: "destructive"
              });
            } finally {
              setIsOperationLoading(false);
            }
          }
        };

      case 'update-category':
        return {
          inputType: 'select' as const,
          title: 'Update Category',
          description: 'Select the new category for the selected toys:',
          options: [
            { value: 'educational', label: 'Educational' },
            { value: 'creative', label: 'Creative' },
            { value: 'building', label: 'Building' },
            { value: 'electronics', label: 'Electronics' },
            { value: 'stem', label: 'STEM' },
            { value: 'puzzles', label: 'Puzzles' },
            { value: 'outdoor', label: 'Outdoor' }
          ],
          placeholder: 'Select category',
          action: async (category: string) => {
            console.log('🎯 useToyActions: Starting bulk category update...');
            setIsOperationLoading(true);
            
            try {
              const result = await bulkOperationService.bulkUpdateToyCategory(selectedIds, category as ToyCategory);
              
              if (result.success) {
                toast({ title: "Success", description: result.message });
                clearSelection();
                setTimeout(() => {
                  debouncedRefetch();
                }, 500);
              } else {
                toast({
                  title: "Error",
                  description: result.message,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('🎯 useToyActions: Bulk category update exception:', error);
              toast({
                title: "Error",
                description: "An unexpected error occurred during bulk category update",
                variant: "destructive"
              });
            } finally {
              setIsOperationLoading(false);
            }
          }
        };

      case 'toggle-featured':
        return {
          title: 'Toggle Carousel Featured Status',
          description: 'This will toggle the featured status for all selected toys. Featured toys appear in the homepage carousel.',
          actionLabel: 'Update Carousel Status',
          action: async () => {
            console.log('🎯 useToyActions: Starting bulk featured toggle...');
            setIsOperationLoading(true);
            
            try {
              const result = await bulkOperationService.bulkUpdateToyFeatured(selectedIds, true);
              
              if (result.success) {
                toast({ 
                  title: "Carousel Status Updated", 
                  description: "Featured toys will now appear in the homepage carousel." 
                });
                clearSelection();
                setTimeout(() => {
                  debouncedRefetch();
                }, 500);
              } else {
                toast({
                  title: "Error",
                  description: result.message,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('🎯 useToyActions: Bulk featured toggle exception:', error);
              toast({
                title: "Error",
                description: "An unexpected error occurred during bulk featured toggle",
                variant: "destructive"
              });
            } finally {
              setIsOperationLoading(false);
            }
          }
        };

      case 'update-price':
        return {
          inputType: 'percentage' as const,
          title: 'Update Prices',
          description: 'Enter the percentage change for prices (positive to increase, negative to decrease):',
          placeholder: 'e.g., 10 for +10%, -15 for -15%',
          action: async (percentage: string) => {
            console.log('🎯 useToyActions: Starting bulk price update...');
            setIsOperationLoading(true);
            
            try {
              const result = await bulkOperationService.bulkUpdateToyPrice(
                selectedIds, 
                parseFloat(percentage), 
                true
              );
              
              if (result.success) {
                toast({ title: "Success", description: result.message });
                clearSelection();
                setTimeout(() => {
                  debouncedRefetch();
                }, 500);
              } else {
                toast({
                  title: "Error",
                  description: result.message,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('🎯 useToyActions: Bulk price update exception:', error);
              toast({
                title: "Error",
                description: "An unexpected error occurred during bulk price update",
                variant: "destructive"
              });
            } finally {
              setIsOperationLoading(false);
            }
          }
        };

      default:
        console.error('🎯 useToyActions: Unknown action ID:', actionId);
        return null;
    }
  }, [isOperationLoading, toast, clearSelection, debouncedRefetch]);

  return {
    isOperationLoading,
    deletingToyId,
    handleRefresh,
    handleEditToy,
    handleDeleteToy,
    handleBulkAction
  };
};
