
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useAdminRequests = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createCancellationRequest = async (userId: string, reason?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: userId,
          request_type: 'subscription_cancellation',
          status: 'pending',
          details: { reason }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Cancellation Request Submitted",
        description: "Your subscription cancellation request has been sent to our admin team. You will receive an email confirmation within 24 hours.",
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit cancellation request. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createPauseRequest = async (userId: string, months: number, reason: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: userId,
          request_type: 'subscription_pause',
          status: 'pending',
          details: { months, reason }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pause Request Submitted",
        description: "Your subscription pause request has been sent to our admin team. You will be notified once it's reviewed.",
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit pause request. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createConcernRequest = async (userId: string, subject: string, message: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: userId,
          request_type: 'general_concern',
          status: 'pending',
          details: { subject, message }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Concern Submitted",
        description: "Your concern has been sent to our admin team. We will get back to you shortly.",
      });

      return { success: true, data };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit your concern. Please try again.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createCancellationRequest,
    createPauseRequest,
    createConcernRequest,
    isLoading
  };
};
