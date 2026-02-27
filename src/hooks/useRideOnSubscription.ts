import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useCustomAuth } from './useCustomAuth';

// Simplified types for ride-on subscriptions
export interface RideOnPlan {
  id: 'ride_on_fixed';
  name: 'Ride-On Monthly';
  description: 'Single ride-on toy rental with no age restrictions';
  basePrice: 1999; // ₹1999
  gstRate: 18; // 18%
  totalPrice: 2359; // ₹2359 (1999 + 18% GST)
  duration: 1; // monthly
  features: {
    toyLimit: 1;
    ageRestrictions: false;
    premiumToys: false;
    books: 0;
  };
}

export interface SimpleRideOnSubscription {
  id: string;
  user_id: string;
  toy_id: string;
  toy_name: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  monthly_amount: number; // ₹1999
  gst_amount: number; // 18% GST
  total_amount: number; // ₹2359
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

// Fixed ride-on plan configuration
export const RIDE_ON_PLAN: RideOnPlan = {
  id: 'ride_on_fixed',
  name: 'Ride-On Monthly',
  description: 'Single ride-on toy rental with no age restrictions',
  basePrice: 1999,
  gstRate: 18,
  totalPrice: 2359,
  duration: 1,
  features: {
    toyLimit: 1,
    ageRestrictions: false,
    premiumToys: false,
    books: 0,
  },
};

export const useRideOnSubscription = () => {
  const { user } = useCustomAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's current ride-on subscription
  const { data: rideOnSubscription, isLoading: isLoadingRideOn, error } = useQuery({
    queryKey: ['rideOnSubscription', user?.id],
    queryFn: async (): Promise<SimpleRideOnSubscription | null> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Use raw SQL query to be safe until columns are added
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused'])
        .limit(1);

      if (error) {
        return null; // Return null instead of throwing for now
      }

      // Filter for ride-on subscriptions (when column exists)
      const rideOnSub = data?.find((sub: any) => 
        sub.subscription_type === 'ride_on' || 
        sub.plan_id === 'ride_on_fixed'
      );

      if (!rideOnSub) {
        return null;
      }

      // Transform to SimpleRideOnSubscription format
      return {
        id: rideOnSub.id,
        user_id: rideOnSub.user_id,
        toy_id: (rideOnSub as any).ride_on_toy_id || 'unknown',
        toy_name: 'Ride-On Toy', // Will be filled from toy lookup
        status: rideOnSub.status as 'active' | 'paused' | 'cancelled' | 'expired',
        start_date: rideOnSub.start_date,
        end_date: rideOnSub.end_date,
        monthly_amount: RIDE_ON_PLAN.basePrice,
        gst_amount: Math.round(RIDE_ON_PLAN.basePrice * RIDE_ON_PLAN.gstRate / 100),
        total_amount: RIDE_ON_PLAN.totalPrice,
        auto_renew: rideOnSub.auto_renew || true,
        created_at: rideOnSub.created_at,
        updated_at: rideOnSub.updated_at,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });

  // Check if user can add ride-on subscription (limit: 1)
  const canAddRideOn = !rideOnSubscription;

  // Create ride-on subscription mutation
  const createRideOnSubscription = useMutation({
    mutationFn: async ({ toyId }: { toyId: string }) => {
      console.log('🏍️ [Hook] Starting createRideOnSubscription mutation');
      console.log('🏍️ [Hook] Input toyId:', toyId);
      console.log('🏍️ [Hook] User ID:', user?.id);
      console.log('🏍️ [Hook] Current rideOnSubscription:', rideOnSubscription);
      
      if (!user?.id) {
        console.log('❌ [Hook] No user ID - throwing error');
        throw new Error('User not authenticated');
      }
      
      if (rideOnSubscription) {
        console.log('❌ [Hook] User already has ride-on subscription - throwing error');
        throw new Error('User already has an active ride-on subscription');
      }

      console.log('🏍️ [Hook] Creating ride-on subscription for toy:', toyId);

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      console.log('🏍️ [Hook] Calculated dates:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      // First try with basic columns only (without new ride-on columns)
      const basicSubscriptionData = {
        user_id: user.id,
        plan_id: 'ride_on_fixed', // Fixed plan ID for ride-on
        status: 'active',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        current_period_start: startDate.toISOString().split('T')[0],
        current_period_end: endDate.toISOString().split('T')[0],
        pause_balance: 0,
        auto_renew: true,
      };

      console.log('🏍️ [Hook] Basic subscription data:', basicSubscriptionData);

      console.log('🔄 [Hook] Attempting basic insert first...');
      const { data: basicData, error: basicError } = await supabase
        .from('subscriptions')
        .insert(basicSubscriptionData)
        .select()
        .single();

      if (basicError) {
        console.error('❌ [Hook] Basic insert failed:', basicError);
        console.error('❌ [Hook] Error details:', {
          message: basicError.message,
          code: basicError.code,
          details: basicError.details,
          hint: basicError.hint
        });
        throw basicError;
      }

      console.log('✅ [Hook] Basic ride-on subscription created:', basicData);

      // Try to update with ride-on specific columns if they exist
      if (basicData?.id) {
        console.log('🔄 [Hook] Attempting to update with ride-on columns...');
        try {
          const { data: updatedData, error: updateError } = await supabase
            .from('subscriptions')
            .update({
              subscription_type: 'ride_on',
              ride_on_toy_id: toyId
            } as any)
            .eq('id', basicData.id)
            .select()
            .single();

          if (updateError) {
            console.log('⚠️ [Hook] Update with new columns failed (columns may not exist yet):', updateError.message);
            // Don't throw - the basic subscription was created successfully
            return basicData;
          } else {
            console.log('✅ [Hook] Successfully updated with ride-on columns:', updatedData);
            return updatedData;
          }
        } catch (updateErr) {
          console.log('⚠️ [Hook] Update attempt failed, but basic subscription exists:', updateErr);
          return basicData;
        }
      }

      return basicData;
    },
    onSuccess: (data) => {
      console.log('🎉 [Hook] Mutation onSuccess - invalidating queries');
      console.log('🎉 [Hook] Success data:', data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['rideOnSubscription'] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptionStatus'] });
      queryClient.invalidateQueries({ queryKey: ['canAddRideOn'] });
      
      toast({
        title: 'Ride-On Subscription Created!',
        description: 'Your ride-on toy subscription is now active.',
      });
    },
    onError: (error: any) => {
      console.error('❌ [Hook] Mutation onError:', error);
      console.error('❌ [Hook] Error details:', {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        name: error.name,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({
        title: 'Failed to create subscription',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    rideOnSubscription,
    canAddRideOn,
    rideOnPlan: RIDE_ON_PLAN,
    
    // Loading states
    isLoadingRideOn,
    
    // Mutations
    createRideOnSubscription: createRideOnSubscription.mutateAsync,
    isCreating: createRideOnSubscription.isPending,
    
    // Error
    error,
  };
}; 