
import { supabase } from "@/integrations/supabase/client";

export const fetchToyImages = async (id: string) => {
  const { data: imageData, error: imageError } = await supabase
    .from('toy_images')
    .select('*')
    .eq('toy_id', id)
    .order('display_order');

  if (imageError && imageError.code !== 'PGRST116') {
    console.warn('Error fetching toy images:', imageError);
  }

  return imageData || [];
};

export const saveToyImages = async (toyId: string, images: string[], primaryImageIndex: number) => {
  if (images.length === 0) return;

  try {
    // Fetch existing images so we can merge rather than blindly overwrite
    const { data: existing } = await supabase
      .from('toy_images')
      .select('image_url')
      .eq('toy_id', toyId);

    const existingUrls = new Set((existing || []).map(r => r.image_url));

    // Separate new images (not yet in DB) from already-saved ones
    const newImages = images.filter(url => url && typeof url === 'string' && !existingUrls.has(url));

    // Delete only rows whose URLs are no longer in the submitted list
    // (i.e., the admin explicitly removed them)
    const submittedUrls = new Set(images.filter(Boolean));
    const toDelete = (existing || []).filter(r => !submittedUrls.has(r.image_url));

    if (toDelete.length > 0) {
      await supabase
        .from('toy_images')
        .delete()
        .eq('toy_id', toyId)
        .in('image_url', toDelete.map(r => r.image_url));
    }

    // Insert only genuinely new images
    if (newImages.length > 0) {
      const startOrder = existing ? existing.length - toDelete.length : 0;
      const imageInserts = newImages.map((imageUrl, i) => ({
        toy_id: toyId,
        image_url: imageUrl,
        display_order: startOrder + i,
        is_primary: images.indexOf(imageUrl) === primaryImageIndex,
      }));

      const { error: insertError } = await supabase
        .from('toy_images')
        .insert(imageInserts);

      if (insertError) throw new Error(`Error saving images: ${insertError.message}`);
    }

    // Update is_primary flag for the designated primary image
    await supabase
      .from('toy_images')
      .update({ is_primary: false })
      .eq('toy_id', toyId);

    if (images[primaryImageIndex]) {
      await supabase
        .from('toy_images')
        .update({ is_primary: true })
        .eq('toy_id', toyId)
        .eq('image_url', images[primaryImageIndex]);
    }

  } catch (error) {
    console.error('Image save operation failed:', error);
    throw error;
  }
};
