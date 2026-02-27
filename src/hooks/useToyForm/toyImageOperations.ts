
import { supabase } from "@/integrations/supabase/client";

export const fetchToyImages = async (id: string) => {
  console.log('Fetching toy images for ID:', id);
  const { data: imageData, error: imageError } = await supabase
    .from('toy_images')
    .select('*')
    .eq('toy_id', id)
    .order('display_order');

  if (imageError && imageError.code !== 'PGRST116') {
    console.warn('Error fetching toy images:', imageError);
  }

  console.log('Fetched toy images:', imageData);
  return imageData || [];
};

export const saveToyImages = async (toyId: string, images: string[], primaryImageIndex: number) => {
  if (images.length === 0) {
    console.log('No images to save');
    return;
  }

  console.log('Starting image save operation:', { toyId, images, primaryImageIndex });

  try {
    // Use a transaction-like approach: first delete, then insert
    console.log('Deleting existing images...');
    const { error: deleteError } = await supabase
      .from('toy_images')
      .delete()
      .eq('toy_id', toyId);

    if (deleteError) {
      console.warn('Warning deleting existing images:', deleteError);
      // Don't throw here as the images might not exist yet
    } else {
      console.log('Successfully deleted existing images');
    }

    // Insert new images with validation
    const imageInserts = images.map((imageUrl, index) => {
      if (!imageUrl || typeof imageUrl !== 'string') {
        throw new Error(`Invalid image URL at index ${index}`);
      }
      return {
        toy_id: toyId,
        image_url: imageUrl,
        display_order: index,
        is_primary: index === primaryImageIndex
      };
    });

    console.log('Inserting new images:', imageInserts);

    const { error: imageError } = await supabase
      .from('toy_images')
      .insert(imageInserts);

    if (imageError) {
      console.error('Error saving images:', imageError);
      throw new Error(`Error saving images: ${imageError.message}`);
    }
    
    console.log('Successfully saved toy images');
  } catch (error) {
    console.error('Image save operation failed:', error);
    throw error;
  }
};
