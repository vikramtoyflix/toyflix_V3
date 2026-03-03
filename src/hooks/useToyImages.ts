import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

const BULK_CHUNK_SIZE = 100;

/**
 * Fetches ALL toy images in batched queries and returns a map of toy_id -> images[].
 * Use this at the carousel/list level so each card doesn't fire its own query.
 * Batches IDs (100 per request) to avoid limits and keep one fast load for the page.
 */
export const useBulkToyImages = (toyIds: string[]) => {
  return useQuery({
    queryKey: ['toy-images-bulk', toyIds.slice().sort().join(',')],
    queryFn: async (): Promise<Record<string, ToyImage[]>> => {
      if (!toyIds.length) return {};

      const uniqueIds = [...new Set(toyIds)];
      const chunks: string[][] = [];
      for (let i = 0; i < uniqueIds.length; i += BULK_CHUNK_SIZE) {
        chunks.push(uniqueIds.slice(i, i + BULK_CHUNK_SIZE));
      }

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const { data, error } = await supabase
            .from('toy_images')
            .select('id, toy_id, image_url, display_order, is_primary')
            .in('toy_id', chunk)
            .order('display_order');
          if (error) {
            console.warn('Error fetching bulk toy images chunk:', error);
            return [];
          }
          return (data || []) as ToyImage[];
        })
      );

      const map: Record<string, ToyImage[]> = {};
      results.flat().forEach((img) => {
        if (!map[img.toy_id]) map[img.toy_id] = [];
        map[img.toy_id].push(img);
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
