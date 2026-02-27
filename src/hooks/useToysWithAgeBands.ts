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
      console.log('🧸 Fetching all toys without age restrictions...');
      
      const { data, error } = await supabase
        .from('toys')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching toys:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} toys without age filtering`);
      
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

      // Apply category ordering
      const sortedToys = sortToysByCategory(toys);
      logToyDistribution(sortedToys, 'All Toys (No Age Filter)');
      
      return sortedToys;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
 * Execute raw SQL query to access age-specific tables directly
 * Then fetch the corresponding toys from the main toys table to ensure proper ID mapping
 */
export async function queryAgeSpecificTable(tableName: string): Promise<Toy[]> {
  try {
    // Get Supabase configuration
    const supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY';
    
    // First, get toy names from the age-specific table
    const ageTableResponse = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?category=neq.ride_on_toys&order=is_featured.desc,available_quantity.desc,name.asc&select=name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!ageTableResponse.ok) {
      throw new Error(`HTTP error! status: ${ageTableResponse.status} - ${ageTableResponse.statusText}`);
    }

    const ageTableData = await ageTableResponse.json();
    
    if (!ageTableData || ageTableData.length === 0) {
      console.log(`✅ No toys found in ${tableName}`);
      return [];
    }

    // Extract toy names
    const toyNames = ageTableData.map((toy: any) => toy.name);
    console.log(`📋 Found ${toyNames.length} toy names in ${tableName}`);

    // Now fetch the complete toy data from the main toys table using the names
    // This ensures we get the correct IDs that match the toy_images table
    const { data: mainTableToys, error } = await supabase
      .from('toys')
      .select('*')
      .in('name', toyNames)
      .neq('category', 'ride_on_toys');

    if (error) {
      console.error(`❌ Error fetching from main toys table:`, error);
      throw error;
    }

    console.log(`✅ Successfully fetched ${mainTableToys?.length || 0} toys from main table for ${tableName}`);
    
    // Transform the data to ensure it matches the Toy interface
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

    // IMPORTANT: Apply category ordering as per requirements
    const sortedToys = sortToysByCategory(toys);
    logToyDistribution(sortedToys, `Age Table: ${tableName}`);
    
    return sortedToys;
    
  } catch (error) {
    console.error(`❌ Failed to query ${tableName}:`, error);
    throw error;
  }
}

/**
 * Hook to get toys from age-specific tables directly with proper category ordering
 * UPDATED: Better defaults for homepage usage
 */
export const useToysForAgeGroup = (ageGroup?: string) => {
  return useQuery({
    queryKey: ['toys-age-table-direct', ageGroup],
    queryFn: async (): Promise<Toy[]> => {
      // DEFAULT BEHAVIOR: When no age group specified (homepage), show all toys with category ordering
      if (!ageGroup || ageGroup === 'all' || ageGroup === '') {
        console.log('🎯 No specific age group - fetching all toys with category ordering...');
        
        const { data, error } = await supabase
          .from('toys')
          .select('*')
          .neq('category', 'ride_on_toys')
          .order('is_featured', { ascending: false })
          .order('name', { ascending: true });

        if (error) {
          console.error('❌ Error fetching all toys:', error);
          throw error;
        }

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

        // Apply category ordering
        const sortedToys = sortToysByCategory(toys);
        logToyDistribution(sortedToys, 'All Ages (Default)');
        console.log(`✅ Fetched ${sortedToys.length} toys (all ages, excluding ride-on, category ordered)`);
        
        return sortedToys;
      }

      // AGE-SPECIFIC BEHAVIOR: Use age-specific tables
      const tableName = getAgeTableName(ageGroup);
      if (!tableName) {
        console.warn(`⚠️ No table found for age group: ${ageGroup}`);
        return [];
      }

      console.log(`🎯 Fetching toys from ${tableName} for age group: ${ageGroup}`);
      
      try {
        // Use direct table access with category ordering
        const toys = await queryAgeSpecificTable(tableName);
        console.log(`✅ Successfully fetched ${toys.length} toys from ${tableName} with category ordering`);
        return toys;
        
      } catch (error) {
        console.error(`❌ Failed to query ${tableName} directly:`, error);
        
        // Fallback to regular toys table if direct access fails
        console.log(`🔄 Fallback: Fetching all toys for age group ${ageGroup}`);
        const { data, error: fallbackError } = await supabase
          .from('toys')
          .select('*')
          .neq('category', 'ride_on_toys')
          .order('is_featured', { ascending: false })
          .order('name', { ascending: true });

        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          throw fallbackError;
        }

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

        // Apply category ordering even in fallback
        const sortedToys = sortToysByCategory(toys);
        logToyDistribution(sortedToys, `Fallback for ${ageGroup}`);
        console.log(`⚠️ Fallback: Showing ${sortedToys.length} toys for age group ${ageGroup} with category ordering`);
        
        return sortedToys;
      }
    },
    enabled: true, // Always enabled - will handle defaults internally
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to get toys by category without age-based filtering restrictions
 */
export const useToysWithAgeBandsByCategory = (category?: string) => {
  return useQuery({
    queryKey: ['toys-category-no-age-filter', category],
    queryFn: async (): Promise<Toy[]> => {
      console.log('🧸 Fetching toys by category without age restrictions:', category);
      
      let query = supabase
        .from('toys')
        .select('*');
      
      if (category && category !== 'all') {
        // Type cast the category to match the enum values
        query = query.eq('category', category as any);
      }
      
      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching toys by category:', error);
        throw error;
      }
      
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

      // Apply category ordering
      const sortedToys = sortToysByCategory(toys);
      logToyDistribution(sortedToys, `Category: ${category}`);
      console.log(`✅ Fetched ${sortedToys.length} toys for category: ${category} without age filtering, with category ordering`);
      
      return sortedToys;
    },
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
      
      console.log('📊 Fetching toy counts for all age groups (including unavailable)...');
      
      for (const ageGroup of ageGroups) {
        const tableName = getAgeTableName(ageGroup);
        if (tableName) {
          try {
            const toys = await queryAgeSpecificTable(tableName);
            const availableToys = toys.filter(toy => toy.available_quantity > 0);
            counts[ageGroup] = toys.length;
            console.log(`✅ ${ageGroup}: ${toys.length} total toys (${availableToys.length} available, ${toys.length - availableToys.length} unavailable)`);
          } catch (error) {
            console.error(`❌ Failed to get count for ${ageGroup}:`, error);
            counts[ageGroup] = 0;
          }
        }
      }
      
      return counts;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
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
      
      console.log('🎯 Fetching toys grouped by age with category ordering...');
      
      for (const ageGroup of ageGroups) {
        const tableName = getAgeTableName(ageGroup);
        if (tableName) {
          try {
            const toys = await queryAgeSpecificTable(tableName);
            grouped[ageGroup] = toys; // Already sorted by category in queryAgeSpecificTable
            console.log(`✅ ${ageGroup}: ${toys.length} toys loaded with category ordering`);
          } catch (error) {
            console.error(`❌ Failed to load toys for ${ageGroup}:`, error);
            grouped[ageGroup] = [];
          }
        }
      }
      
      return grouped;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
}; 