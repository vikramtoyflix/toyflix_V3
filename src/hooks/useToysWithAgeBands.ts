import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Toy } from './useToys';
import { sortToysByCategory, logToyDistribution } from '@/utils/toyOrdering';

/**
 * Hook to get all toys without age-based filtering restrictions
 */
export const useToysWithAgeBands = () => {
  return useQuery({
    queryKey: ['toys-all-no-age-filter'],
    queryFn: async (): Promise<Toy[]> => {
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      const toys = (data || []).map(toy => ({
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

      return sortToysByCategory(toys);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get the table name for a specific age group
 */
export function getAgeTableName(ageGroup: string): string | null {
  const ageTableMap: Record<string, string> = {
    '1-2': 'toys_1_2_years',
    '2-3': 'toys_2_3_years',
    '3-4': 'toys_3_4_years',
    '4-6': 'toys_4_6_years',
    '6-8': 'toys_6_8_years',
  };
  
  return ageTableMap[ageGroup] || null;
}

/**
 * Fetch from age-specific tables using Supabase client (not raw fetch) so Android WebView
 * and Capacitor use the same code path and avoid CORS/origin issues.
 */
export async function queryAgeSpecificTable(tableName: string): Promise<Toy[]> {
  try {
    type AgeTableName = 'toys_1_2_years' | 'toys_2_3_years' | 'toys_3_4_years' | 'toys_4_6_years' | 'toys_6_8_years';
    const { data: ageTableData, error: ageError } = await supabase
      .from(tableName as AgeTableName)
      .select('name')
      .neq('category', 'ride_on_toys')
      .order('is_featured', { ascending: false })
      .order('available_quantity', { ascending: false })
      .order('name', { ascending: true });

    if (ageError) throw ageError;
    if (!ageTableData || ageTableData.length === 0) return [];

    const toyNames = ageTableData.map((toy: { name?: string }) => toy.name).filter(Boolean) as string[];
    if (toyNames.length === 0) return [];

    const { data: mainTableToys, error } = await supabase
      .from('toys')
      .select('*')
      .in('name', toyNames)
      .neq('category', 'ride_on_toys');

    if (error) throw error;

    const toys = (mainTableToys || []).map((toy: any) => ({
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

    const sortedToys = sortToysByCategory(toys);
    logToyDistribution(sortedToys, `Age Table: ${tableName}`);
    
    return sortedToys;
    
  } catch (error) {
    throw error;
  }
}

/** Query key for homepage Featured Toys – used for prefetch so carousel has data on first load/refresh. */
export const HOMEPAGE_TOYS_QUERY_KEY = ['toys-age-table-direct', undefined] as const;

/** Fetches toys for homepage (all ages). Used for prefetch and by useToysForAgeGroup. */
export async function fetchHomepageToys(): Promise<Toy[]> {
  const { data, error } = await supabase
    .from('toys')
    .select('*')
    .neq('category', 'ride_on_toys')
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;

  const toys = (data || []).map((toy: any) => ({
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

  const sorted = sortToysByCategory(toys);
  logToyDistribution(sorted, 'Homepage toys');
  return sorted;
}

/**
 * Hook to get toys from age-specific tables directly with proper category ordering
 */
export const useToysForAgeGroup = (ageGroup?: string) => {
  return useQuery({
    queryKey: ['toys-age-table-direct', ageGroup],
    queryFn: async (): Promise<Toy[]> => {
      if (!ageGroup || ageGroup === 'all' || ageGroup === '') {
        return fetchHomepageToys();
      }

      const tableName = getAgeTableName(ageGroup);
      if (!tableName) return [];

      try {
        return await queryAgeSpecificTable(tableName);
      } catch {
        const { data, error: fallbackError } = await supabase
          .from('toys')
          .select('*')
          .neq('category', 'ride_on_toys')
          .order('is_featured', { ascending: false })
          .order('name', { ascending: true });

        if (fallbackError) throw fallbackError;

        const toys = (data || []).map(toy => ({
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

        return sortToysByCategory(toys);
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  });
};

/**
 * Hook to get toys by category without age-based filtering restrictions
 */
export const useToysWithAgeBandsByCategory = (category?: string) => {
  return useQuery({
    queryKey: ['toys-category-no-age-filter', category],
    queryFn: async (): Promise<Toy[]> => {
      let query = supabase.from('toys').select('*');
      
      if (category && category !== 'all') {
        query = query.eq('category', category as any);
      }
      
      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      
      const toys = (data || []).map(toy => ({
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

      return sortToysByCategory(toys);
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get toy counts for all age groups (for debugging and display)
 */
export const useAgeGroupToysCounts = () => {
  return useQuery({
    queryKey: ['age-groups-toy-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const ageGroups = ['1-2', '2-3', '3-4', '4-6', '6-8'];
      const counts: Record<string, number> = {};
      
      for (const ageGroup of ageGroups) {
        const tableName = getAgeTableName(ageGroup);
        if (tableName) {
          try {
            const toys = await queryAgeSpecificTable(tableName);
            counts[ageGroup] = toys.length;
          } catch {
            counts[ageGroup] = 0;
          }
        }
      }
      
      return counts;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get toys grouped by age groups with counts
 */
export const useToysGroupedByAge = () => {
  return useQuery({
    queryKey: ['toys-grouped-by-age'],
    queryFn: async (): Promise<Record<string, Toy[]>> => {
      const ageGroups = ['1-2', '2-3', '3-4', '4-6', '6-8'];
      const grouped: Record<string, Toy[]> = {};
      
      for (const ageGroup of ageGroups) {
        const tableName = getAgeTableName(ageGroup);
        if (tableName) {
          try {
            grouped[ageGroup] = await queryAgeSpecificTable(tableName);
          } catch {
            grouped[ageGroup] = [];
          }
        }
      }
      
      return grouped;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
