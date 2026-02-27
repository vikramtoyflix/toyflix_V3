import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlanService } from '@/services/planService';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { Toy } from './useToys';
import { SubscriptionCategory } from '@/types/toy';
import { queryAgeSpecificTable, getAgeTableName } from '@/hooks/useToysWithAgeBands';

export const useSubscriptionToys = (subscriptionCategory?: SubscriptionCategory, options: { enabled?: boolean } = {}) => {
  const { data: subscriptionData } = useUserSubscription();
  const { enabled: isEnabled = true } = options;

  return useQuery({
    queryKey: ['subscriptionToys', subscriptionData?.subscription?.plan_id, subscriptionData?.subscription?.age_group, subscriptionCategory],
    queryFn: async () => {
      if (!subscriptionData?.subscription) {
        return [];
      }

      const { subscription } = subscriptionData;
      const plan = PlanService.getPlan(subscription.plan_id);
      
      if (!plan) return [];

      // Gold Pack: No age or category restrictions - use main table
      if (PlanService.isPremiumPlan(subscription.plan_id)) {
        let query = supabase.from('toys').select('*');

        // Filter by subscription category if specified
        if (subscriptionCategory) {
          query = query.eq('subscription_category', subscriptionCategory);
        }

        const { data: allToys, error } = await query
          .neq('category', 'ride_on_toys') // Still exclude ride-ons
          .order('is_featured', { ascending: false })
          .order('available_quantity', { ascending: false })
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching Gold Pack subscription toys:', error);
          throw error;
        }

        // Apply plan-based premium toy filtering (Gold Pack gets all toys)
        const planFilteredToys = PlanService.filterToysByPlanAccess(allToys || [], subscription.plan_id);
        
        return planFilteredToys as Toy[];
      }

      // Silver Pack: Use age-specific table + category filtering
      if (!subscription.age_group) {
        return [];
      }

      try {
        // Use age-specific table for Silver Pack
        const tableName = getAgeTableName(subscription.age_group);
        if (!tableName) {
          // Fallback to main table with age filtering if no age-specific table
          let query = supabase.from('toys').select('*');

          // Filter by subscription category if specified
          if (subscriptionCategory) {
            query = query.eq('subscription_category', subscriptionCategory);
          }

          const { data: allToys, error } = await query
            .neq('category', 'ride_on_toys');

          if (error) throw error;

          // Apply age filtering using simple matching as fallback
          const ageFilteredToys = (allToys || []).filter(toy => {
            if (!toy.age_range) return false;
            
            // Simple age range matching for fallback
            const toyAgeRange = toy.age_range.toLowerCase();
            return toyAgeRange.includes(subscription.age_group);
          });

          return PlanService.filterToysByPlanAccess(ageFilteredToys, subscription.plan_id) as Toy[];
        }

        // Fetch from age-specific table
        const ageSpecificToys = await queryAgeSpecificTable(tableName);

        // Apply category filtering if specified
        let categoryFilteredToys = ageSpecificToys;
        if (subscriptionCategory) {
          categoryFilteredToys = ageSpecificToys.filter(toy => toy.subscription_category === subscriptionCategory);
        }

        // Apply plan-based premium toy filtering
        const planFilteredToys = PlanService.filterToysByPlanAccess(categoryFilteredToys, subscription.plan_id);
        
        return planFilteredToys as Toy[];

      } catch (error) {
        console.error('Error fetching toys from age-specific table:', error);
        
        // Fallback to main table with original logic
        let query = supabase.from('toys').select('*');

        // Filter by subscription category if specified
        if (subscriptionCategory) {
          query = query.eq('subscription_category', subscriptionCategory);
        }

        const { data: allToys, error: fallbackError } = await query;

        if (fallbackError) {
          console.error('Error fetching subscription toys (fallback):', fallbackError);
          throw fallbackError;
        }

        // Apply age filtering using simple matching as fallback
        const ageFilteredToys = (allToys || []).filter(toy => {
          if (toy.category === 'ride_on_toys') return false;
          
          if (subscription.age_group) {
            if (!toy.age_range) return false;
            const toyAgeRange = toy.age_range.toLowerCase();
            return toyAgeRange.includes(subscription.age_group);
          }
          return true; // If no age group specified, include all toys
        });

        // Apply plan-based premium toy filtering
        const planFilteredToys = PlanService.filterToysByPlanAccess(ageFilteredToys, subscription.plan_id);
        
        return planFilteredToys as Toy[];
      }
    },
    enabled: isEnabled && !!subscriptionData?.subscription,
    // Optimize caching for subscription toys
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
