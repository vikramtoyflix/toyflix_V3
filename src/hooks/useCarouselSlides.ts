import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { s3Service } from '@/services/s3Service';

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CarouselSlideInsert = Omit<CarouselSlide, 'id' | 'created_at'>;
export type CarouselSlideUpdate = Partial<CarouselSlideInsert> & { id: string };

const slideQueryKey = ['carouselSlides'];

async function getCarouselSlides() {
  const { data, error } = await supabase
    .from('carousel_slides')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data as CarouselSlide[];
}

async function addCarouselSlide(slide: CarouselSlideInsert) {
  const { data, error } = await supabase.from('carousel_slides').insert([slide]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateCarouselSlide(slide: CarouselSlideUpdate) {
  const { id, ...updateData } = slide;
  const { data, error } = await supabase.from('carousel_slides').update(updateData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function deleteCarouselSlide(id: string) {
  // First, get the image_url to delete from S3 storage
  const { data: slideData, error: fetchError } = await supabase
    .from('carousel_slides')
    .select('image_url')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error('Could not find slide to delete.');
  }

  // Delete from DB
  const { error: deleteDbError } = await supabase.from('carousel_slides').delete().eq('id', id);
  if (deleteDbError) throw new Error(deleteDbError.message);
  
  // Delete from S3 storage
  try {
    if (slideData.image_url) {
      const fileName = s3Service.extractFileNameFromUrl(slideData.image_url);
      if (fileName) {
        const deleteResult = await s3Service.deleteFile(fileName);
        if (!deleteResult.success) {
          console.warn('Warning: Could not delete image from S3 storage:', deleteResult.error);
        }
      }
    }
  } catch (e) {
    console.error("Could not delete image from S3 storage:", e);
  }

  return id;
}

export const useCarouselSlides = () => {
  const queryClient = useQueryClient();

  const { data: slides, isLoading, error } = useQuery<CarouselSlide[]>({
    queryKey: slideQueryKey,
    queryFn: getCarouselSlides,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slideQueryKey });
      queryClient.invalidateQueries({ queryKey: ['homeCarouselSlides'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  };

  const addMutation = useMutation({
    mutationFn: addCarouselSlide,
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        toast.success('Slide added successfully!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateCarouselSlide,
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        toast.success('Slide updated successfully!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCarouselSlide,
    ...mutationOptions,
    onSuccess: () => {
        mutationOptions.onSuccess();
        toast.success('Slide deleted successfully!');
    }
  });

  return {
    slides: slides || [],
    isLoading,
    error,
    addSlide: addMutation.mutateAsync,
    updateSlide: updateMutation.mutateAsync,
    deleteSlide: deleteMutation.mutate,
  };
};

export const useCarouselSlidesAdmin = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSlides = async () => {
    try {
      const { data, error } = await supabase
        .from('carousel_slides')
        .select('*')
        .order('display_order');

      if (error) {
        console.error('Error fetching carousel slides:', error);
        return;
      }

      setSlides(data || []);
    } catch (error) {
      console.error('Error fetching carousel slides:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSlide = async (id: string) => {
    try {
      // Get the slide to extract image URL for deletion
      const slide = slides.find(s => s.id === id);
      if (slide?.image_url) {
        // Extract filename and attempt to delete from S3
        const fileName = s3Service.extractFileNameFromUrl(slide.image_url);
        if (fileName) {
          await s3Service.deleteFile(fileName);
        }
      }

      const { error } = await supabase
        .from('carousel_slides')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      await fetchSlides();
    } catch (error) {
      console.error('Error deleting slide:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  return { slides, isLoading, refetch: fetchSlides, deleteSlide };
};

export async function uploadCarouselImage(file: File): Promise<string> {
  try {
    console.log(`Uploading carousel image: ${file.name}`);
    
    // Use S3 service for carousel image upload
    const result = await s3Service.uploadFile(file, `carousel_${Date.now()}`);
    
    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to upload image to S3');
    }
    
    console.log(`Successfully uploaded carousel image to S3: ${result.url}`);
    return result.url;
  } catch (error) {
    console.error('Error uploading carousel image:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
