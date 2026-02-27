
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { RollbackService } from './rollbackService';
import { ErrorHandlingService } from './errorHandlingService';

export const useSubmissionErrorHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmissionError = async (
    error: any,
    isNewToy: boolean,
    id?: string,
    originalToyData?: any
  ) => {
    console.error('Error saving toy (admin):', error);
    
    // Revert optimistic update and attempt rollback
    if (!isNewToy && id) {
      await RollbackService.performRollback(queryClient, id, originalToyData);
    }
    
    // Enhanced error message handling
    let userMessage = ErrorHandlingService.getUserFriendlyMessage(error);
    
    // Add specific handling for session/auth errors
    if (error.message.includes('Session expired') || error.message.includes('Authentication required')) {
      userMessage = "Your session has expired. Please log in again.";
      setTimeout(() => navigate('/auth'), 2000);
    } else if (error.message.includes('Admin privileges')) {
      userMessage = "You don't have permission to perform this action. Please contact an administrator.";
    } else if (error.message.includes('connection')) {
      userMessage = "Connection Error: Please check your internet connection and try again.";
    }
    
    toast({
      title: "Save Failed",
      description: userMessage,
      variant: "destructive"
    });
  };

  return {
    handleSubmissionError
  };
};
