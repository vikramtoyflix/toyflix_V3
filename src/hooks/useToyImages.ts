import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

/**
 * Fetches ALL toy images in a single query and returns a map of toy_id -> images[].
 * Use this at the carousel/list level so each card doesn't fire its own query.
 */
export const useBulkToyImages = (toyIds: string[]) => {
  return useQuery({
    queryKey: ['toy-images-bulk', toyIds.slice().sort().join(',')],
    queryFn: async (): Promise<Record<string, ToyImage[]>> => {
      if (!toyIds.length) return {};

      const { data, error } = await supabase
        .from('toy_images')
        .select('id, toy_id, image_url, display_order, is_primary')
        .in('toy_id', toyIds)
        .order('display_order');

      if (error) {
        console.warn('Error fetching bulk toy images:', error);
        return {};
      }

      // Group by toy_id
      const map: Record<string, ToyImage[]> = {};
      (data || []).forEach((img) => {
        if (!map[img.toy_id]) map[img.toy_id] = [];
        map[img.toy_id].push(img as ToyImage);
      });
      return map;
    },
    enabled: toyIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  });
};

// Alias kept for backward compatibility with RelatedProducts
export const useMultipleToyImages = useBulkToyImages;
