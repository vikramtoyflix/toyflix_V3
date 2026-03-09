import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Toy } from '@/hooks/useToys';
import { PlanService } from '@/services/planService';
import { SubscriptionCategory } from '@/types/toy';

export const useFlowToys = (planId?: string, ageGroup?: string, subscriptionCategory?: SubscriptionCategory, options: { enabled?: boolean } = {}) => {
  const { enabled: isEnabled = true } = options;

  return useQuery({
    queryKey: ['flowToys', planId, ageGroup, subscriptionCategory],
    queryFn: async () => {
      console.log('🎯 useFlowToys - Fetching toys with params:', {
        planId,
        ageGroup,
        subscriptionCategory,
        isEnabled,
        timestamp: new Date().toISOString()
      });

      // Early validation
      if (!planId) {
        console.log('❌ useFlowToys - No planId provided');
        return [];
      }

      // CRITICAL FIX: For Gold pack, ensure we always proceed even if ageGroup is missing
      if (!ageGroup) {
        if (planId === 'gold-pack') {
          console.log('🌟 GOLD PACK FIX: No ageGroup provided but planId is gold-pack, proceeding with "all"');
          // Continue with ageGroup = undefined, Gold pack logic doesn't use it anyway
        } else {
          console.log('❌ useFlowToys - No ageGroup provided');
          return [];
        }
      }

      const plan = PlanService.getPlan(planId);
      console.log('🎯 useFlowToys - Plan service result:', {
        planId,
        plan,
        isPremium: plan ? PlanService.isPremiumPlan(planId) : false
      });
      
      if (!plan) {
        console.log('❌ useFlowToys - Plan not found');
        return [];
      }

      // Gold Pack: No age restrictions but should still filter by subscription category
      if (PlanService.isPremiumPlan(planId)) {
        console.log('🌟 useFlowToys - Gold Pack detected, fetching premium toys');
        
        // Subscription category filtering for Gold pack - use subscription_category column so STEM vs Educational show different toys
        let query = supabase.from('toys').select('*');

        if (subscriptionCategory === 'stem_toys') {
          query = query.eq('subscription_category', 'stem_toys');
        } else if (subscriptionCategory === 'educational_toys') {
          query = query.eq('subscription_category', 'educational_toys');
        } else if (subscriptionCategory === 'developmental_toys') {
          query = query.eq('subscription_category', 'developmental_toys');
        } else if (subscriptionCategory) {
          query = query.eq('subscription_category', subscriptionCategory);
        }

        const { data: rawToys, error } = await query
          .neq('category', 'ride_on_toys') // Still exclude ride-ons
          .order('is_featured', { ascending: false })
          .order('available_quantity', { ascending: false })
          .order('name', { ascending: true });

        let allToys = rawToys || [];

        if (error) {
          console.error('❌ Error fetching Gold Pack toys:', error);
          throw error;
        }

        // Apply plan-based premium toy filtering (Gold Pack gets all toys)
        const planFilteredToys = PlanService.filterToysByPlanAccess(allToys || [], planId);
        console.log('✅ useFlowToys - Gold Pack toys fetched:', {
          totalToys: allToys?.length || 0,
          afterPlanFilter: planFilteredToys.length,
          subscriptionCategory
        });
        
        return planFilteredToys as Toy[];
      }

      // Silver Pack and Discovery Delight: fetch from MAIN toys table by category + age_range
      // so we get ALL developmental/educational/big/books for the age, not limited by age-specific tables
      console.log('🎯 useFlowToys - Fetching from main toys table by category + age for Silver/Discovery');

      try {
        // Match age_range: DB uses "1-2 years", "2-3 years" etc.; app sends "1-2", "2-3"
        const agePattern = `%${ageGroup}%`;
        let query = supabase
          .from('toys')
          .select('*')
          .neq('category', 'ride_on_toys')
          .ilike('age_range', agePattern)
          .order('is_featured', { ascending: false })
          .order('available_quantity', { ascending: false })
          .order('name', { ascending: true });

        // Use subscription_category so STEM step and Educational step show different toys
        // For developmental_toys: no subscription_category filter (show all age-matching toys)
        if (subscriptionCategory === 'stem_toys') {
          query = query.eq('subscription_category', 'stem_toys');
        } else if (subscriptionCategory === 'educational_toys') {
          query = query.eq('subscription_category', 'educational_toys');
        } else if (subscriptionCategory === 'developmental_toys') {
          query = query.eq('subscription_category', 'developmental_toys');
        } else if (subscriptionCategory) {
          query = query.eq('subscription_category', subscriptionCategory);
        }

        const { data: rawMainToys, error } = await query;
        let mainToys = rawMainToys || [];

        if (error) {
          console.error('❌ useFlowToys - Main table query error:', error);
          throw error;
        }

        const toys = (mainToys || []).map((toy: any) => ({
          id: toy.id,
          name: toy.name,
          description: toy.description,
          category: toy.category,
          subscription_category: toy.subscription_category,
          age_range: toy.age_range,
          brand: toy.brand,
          pack: toy.pack,
          retail_price: toy.retail_price,
          rental_price: toy.rental_price,
          image_url: toy.image_url,
          available_quantity: toy.available_quantity,
          total_quantity: toy.total_quantity,
          rating: toy.rating,
          min_age: toy.min_age,
          max_age: toy.max_age,
          show_strikethrough_pricing: toy.show_strikethrough_pricing,
          display_order: toy.display_order,
          is_featured: toy.is_featured,
          created_at: toy.created_at,
          updated_at: toy.updated_at,
        })) as Toy[];

        const planFilteredToys = PlanService.filterToysByPlanAccess(toys, planId);

        console.log('✅ useFlowToys - Main table by category + age:', {
          ageGroup,
          subscriptionCategory,
          mainCount: toys.length,
          afterPlanFilter: planFilteredToys.length,
        });

        return planFilteredToys as Toy[];
      } catch (error) {
        console.error('❌ useFlowToys - Error:', error);
        return [];
      }
    },
    enabled: isEnabled && !!planId && (!!ageGroup || planId === 'gold-pack'),
    // Optimize caching for flow toys
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
