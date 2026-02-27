import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const useToyImages = (toyId: string) => {
  const [images, setImages] = useState<ToyImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!toyId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: imageData, error } = await supabase
          .from('toy_images')
          .select('*')
          .eq('toy_id', toyId)
          .order('display_order');

        if (error && error.code !== 'PGRST116') {
          console.warn('Error fetching toy images:', error);
          setError(error.message);
        }

        if (imageData && imageData.length > 0) {
          setImages(imageData);
        } else {
          setImages([]);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [toyId]);

  return { data: images, isLoading, error };
};

export const useToyPrimaryImage = (toyId: string) => {
  return useQuery({
    queryKey: ['toy-primary-image', toyId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('toy_images')
        .select('image_url')
        .eq('toy_id', toyId)
        .eq('is_primary', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching primary toy image:', error);
      }

      return data?.image_url || null;
    },
    enabled: !!toyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useMultipleToyImages = (toyIds: string[]) => {
  return useQuery({
    queryKey: ['multiple-toy-images', toyIds],
    queryFn: async (): Promise<Record<string, ToyImage[]>> => {
      if (toyIds.length === 0) return {};

      const { data, error } = await supabase
        .from('toy_images')
        .select('*')
        .in('toy_id', toyIds)
        .order('display_order');

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching multiple toy images:', error);
      }

      // Group images by toy_id
      const groupedImages: Record<string, ToyImage[]> = {};
      (data || []).forEach(image => {
        if (!groupedImages[image.toy_id]) {
          groupedImages[image.toy_id] = [];
        }
        groupedImages[image.toy_id].push(image);
      });

      return groupedImages;
    },
    enabled: toyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}; 