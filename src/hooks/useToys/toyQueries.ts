
import { supabase } from '@/integrations/supabase/client';
import { Toy, ToyCategory } from './types';

export const fetchToys = async (): Promise<Toy[]> => {
  console.log('Fetching toys data...');
  const { data, error } = await supabase
    .from('toys')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('name');

  if (error) {
    console.error('Error fetching toys:', error);
    throw error;
  }
  
  console.log('Toys data fetched:', data?.length, 'toys');
  return data as Toy[];
};

export const fetchToysByCategory = async (category?: string): Promise<Toy[]> => {
  console.log('Fetching toys by category:', category);
  let query = supabase.from('toys').select('*');
  
  if (category && category !== 'all') {
    query = query.eq('category', category as ToyCategory);
  }
  
  const { data, error } = await query
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('name');

  if (error) {
    console.error('Error fetching toys by category:', error);
    throw error;
  }
  
  console.log('Toys by category fetched:', data?.length, 'toys');
  return data as Toy[];
};
