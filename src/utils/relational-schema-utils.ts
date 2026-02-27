/**
 * Utility functions for the new relational toy schema
 * Handles PostgreSQL ranges, age filtering, and category management
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  AgeBand, 
  ToyCategory, 
  ToyWithDetails, 
  ToySearchParams, 
  AgeFilterOptions,
  ParsedAgeRange,
  CreateAgeBandInput,
  CreateCategoryInput,
  UpdateToyRelationsInput
} from '@/types/relational-schema';

/**
 * Parse PostgreSQL int4range string to min/max months
 * "[12,24)" -> { min_months: 12, max_months: 23 }
 */
export function parsePostgresRange(rangeStr: string): ParsedAgeRange {
  const match = rangeStr.match(/\[(\d+),(\d+)\)/);
  if (!match) {
    throw new Error(`Invalid PostgreSQL range format: ${rangeStr}`);
  }
  
  const min_months = parseInt(match[1]);
  const max_months = parseInt(match[2]) - 1; // PostgreSQL ranges are half-open
  
  return {
    min_months,
    max_months,
    label: `${Math.floor(min_months / 12)}-${Math.ceil(max_months / 12)} years`
  };
}

/**
 * Convert age in months to PostgreSQL int4range
 * 18 months -> "[18,19)"
 */
export function monthsToPostgresRange(months: number): string {
  return `[${months},${months + 1})`;
}

/**
 * Convert age range (min, max months) to PostgreSQL int4range
 * (12, 24) -> "[12,25)"
 */
export function createPostgresRange(minMonths: number, maxMonths: number): string {
  return `[${minMonths},${maxMonths + 1})`;
}

/**
 * Check if a child's age (in months) falls within a PostgreSQL range
 */
export function isAgeInRange(childAgeMonths: number, rangeStr: string): boolean {
  const { min_months, max_months } = parsePostgresRange(rangeStr);
  return childAgeMonths >= min_months && childAgeMonths <= max_months;
}

/**
 * Get toys suitable for a specific child age using the new relational schema
 */
export async function getToysForAge(ageMonths: number, options: AgeFilterOptions = { target_age_months: ageMonths }) {
  const { data, error } = await supabase
    .rpc('get_toys_for_age_months', { target_age_months: ageMonths });
  
  if (error) {
    console.error('Error fetching toys for age:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get toys for specific age and category using the new schema
 */
export async function getToysForAgeAndCategory(ageMonths: number, categorySlug: string) {
  const { data, error } = await supabase
    .rpc('get_toys_for_age_and_category', { 
      target_age_months: ageMonths,
      category_slug: categorySlug 
    });
  
  if (error) {
    console.error('Error fetching toys for age and category:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get all active age bands
 */
export async function getAgeBands(): Promise<AgeBand[]> {
  const { data, error } = await supabase
    .from('age_bands')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) {
    console.error('Error fetching age bands:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get all active categories with hierarchy support
 */
export async function getCategories(): Promise<ToyCategory[]> {
  const { data, error } = await supabase
    .from('toy_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  
  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get toys with all their age bands and categories using the view
 */
export async function getToysWithDetails(filters?: ToySearchParams): Promise<ToyWithDetails[]> {
  let query = supabase
    .from('toys_with_details')
    .select('*');
  
  // Apply filters
  if (filters?.available_only) {
    query = query.gt('available_quantity', 0);
  }
  
  if (filters?.featured_only) {
    query = query.eq('is_featured', true);
  }
  
  if (filters?.brand) {
    query = query.ilike('brand', `%${filters.brand}%`);
  }
  
  if (filters?.min_price) {
    query = query.gte('retail_price', filters.min_price);
  }
  
  if (filters?.max_price) {
    query = query.lte('retail_price', filters.max_price);
  }
  
  if (filters?.search_term) {
    query = query.or(`name.ilike.%${filters.search_term}%,description.ilike.%${filters.search_term}%`);
  }
  
  // Apply sorting
  if (filters?.sort_by) {
    const direction = filters.sort_order === 'desc' ? { ascending: false } : { ascending: true };
    query = query.order(filters.sort_by, direction);
  } else {
    query = query.order('display_order').order('name');
  }
  
  // Apply pagination
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching toys with details:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Advanced toy search with age range filtering
 */
export async function searchToysWithAgeFilter(
  searchParams: ToySearchParams,
  childAgeMonths?: number
): Promise<ToyWithDetails[]> {
  // If child age is specified, get toys suitable for that age first
  if (childAgeMonths) {
    const ageAppropriateData = await getToysForAge(childAgeMonths);
    const toyIds = ageAppropriateData.map(toy => toy.toy_id);
    
    if (toyIds.length === 0) {
      return [];
    }
    
    // Filter toys based on age appropriateness and other criteria
    let query = supabase
      .from('toys_with_details')
      .select('*')
      .in('id', toyIds);
    
    // Apply additional filters from searchParams
    if (searchParams.available_only) {
      query = query.gt('available_quantity', 0);
    }
    
    if (searchParams.categories && searchParams.categories.length > 0) {
      // Filter by category slugs that overlap with toy's categories
      const { data: categoryData } = await supabase
        .from('toy_categories')
        .select('slug')
        .in('category_id', searchParams.categories);
      
      if (categoryData && categoryData.length > 0) {
        const categorySlugs = categoryData.map(c => c.slug);
        query = query.overlaps('category_slugs', categorySlugs);
      }
    }
    
    const { data, error } = await query
      .order('display_order')
      .order('name');
    
    if (error) {
      console.error('Error searching toys with age filter:', error);
      throw error;
    }
    
    return data || [];
  }
  
  // If no child age specified, use regular search
  return getToysWithDetails(searchParams);
}

/**
 * Create a new age band (Admin function)
 */
export async function createAgeBand(input: CreateAgeBandInput): Promise<AgeBand> {
  const ageRange = createPostgresRange(input.min_months, input.max_months);
  
  const { data, error } = await supabase
    .from('age_bands')
    .insert({
      label: input.label,
      age_range: ageRange,
      description: input.description,
      display_order: input.display_order || 0
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating age band:', error);
    throw error;
  }
  
  return data;
}

/**
 * Create a new category (Admin function)
 */
export async function createCategory(input: CreateCategoryInput): Promise<ToyCategory> {
  const { data, error } = await supabase
    .from('toy_categories')
    .insert(input)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating category:', error);
    throw error;
  }
  
  return data;
}

/**
 * Update toy's age bands and categories (Admin function)
 */
export async function updateToyRelations(input: UpdateToyRelationsInput): Promise<void> {
  // Start a transaction to update both age bands and categories
  
  // Delete existing relations
  const [ageBandDelete, categoryDelete] = await Promise.all([
    supabase
      .from('toy_age_band')
      .delete()
      .eq('toy_id', input.toy_id),
    supabase
      .from('toy_category_bridge')
      .delete()
      .eq('toy_id', input.toy_id)
  ]);
  
  if (ageBandDelete.error) {
    console.error('Error deleting toy age bands:', ageBandDelete.error);
    throw ageBandDelete.error;
  }
  
  if (categoryDelete.error) {
    console.error('Error deleting toy categories:', categoryDelete.error);
    throw categoryDelete.error;
  }
  
  // Insert new relations
  const ageBandInserts = input.age_band_ids.map(age_band_id => ({
    toy_id: input.toy_id,
    age_band_id
  }));
  
  const categoryInserts = input.category_ids.map(category_id => ({
    toy_id: input.toy_id,
    category_id
  }));
  
  const [ageBandInsert, categoryInsert] = await Promise.all([
    ageBandInserts.length > 0 ? supabase
      .from('toy_age_band')
      .insert(ageBandInserts) : Promise.resolve({ error: null }),
    categoryInserts.length > 0 ? supabase
      .from('toy_category_bridge')
      .insert(categoryInserts) : Promise.resolve({ error: null })
  ]);
  
  if (ageBandInsert.error) {
    console.error('Error inserting toy age bands:', ageBandInsert.error);
    throw ageBandInsert.error;
  }
  
  if (categoryInsert.error) {
    console.error('Error inserting toy categories:', categoryInsert.error);
    throw categoryInsert.error;
  }
}

/**
 * Convert legacy age range string to age band IDs
 * "6m-2 years, 2-3 years" -> [2, 3] (age_band_ids)
 */
export async function legacyAgeRangeToAgeBandIds(legacyAgeRange: string): Promise<number[]> {
  const ageBands = await getAgeBands();
  const ageBandIds: number[] = [];
  
  // Parse legacy format and match to age bands
  const ranges = legacyAgeRange.split(',').map(r => r.trim().toLowerCase());
  
  for (const range of ranges) {
    for (const ageBand of ageBands) {
      if (range.includes(ageBand.label.toLowerCase())) {
        ageBandIds.push(ageBand.age_band_id);
        break;
      }
    }
  }
  
  return ageBandIds;
}

/**
 * Helper to get toys count by category
 */
export async function getToysCountByCategory(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('toy_category_bridge')
    .select(`
      category_id,
      toy_categories!inner(name)
    `);
  
  if (error) {
    console.error('Error getting toys count by category:', error);
    return {};
  }
  
  const counts: Record<string, number> = {};
  data.forEach(item => {
    const categoryName = (item as any).toy_categories.name;
    counts[categoryName] = (counts[categoryName] || 0) + 1;
  });
  
  return counts;
} 