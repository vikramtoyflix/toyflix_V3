
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCatalogCategories = () => {
  return useQuery({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      return data.map(category => category.name);
    },
  });
};
