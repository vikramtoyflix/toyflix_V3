
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { validateToyData } from './toyDataValidation';

export const fetchToyDataAdmin = async (id: string) => {
  console.log('Fetching toy data for ID (admin):', id);
  const { data: toyData, error: toyError } = await supabaseAdmin
    .from('toys')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (toyError) {
    console.error('Error fetching toy data:', toyError);
    throw new Error(`Failed to fetch toy data: ${toyError.message}`);
  }
  
  if (!toyData) {
    console.error('No toy found with ID:', id);
    throw new Error(`Toy not found with ID: ${id}`);
  }
  
  console.log('Fetched toy data (admin):', toyData);
  return toyData;
};

export const saveToyAdmin = async (toyData: any, isNewToy: boolean, id?: string) => {
  console.log('Starting toy save operation (admin):', { toyData, isNewToy, id });
  
  try {
    // Additional safety validation - transform toy_id to id for toys table
    const cleanToyData = { ...toyData };
    
    // Transform toy_id to id for toys table (toys table uses 'id', other tables use 'toy_id')
    if ('toy_id' in cleanToyData) {
      console.log('🔄 Found toy_id field, transforming to id for toys table');
      cleanToyData.id = cleanToyData.toy_id;
      delete cleanToyData.toy_id;
    }
    
    // Remove other potential problematic fields for updates
    const invalidFields = ['created_at', 'updated_at'];
    invalidFields.forEach(field => {
      if (field in cleanToyData && !isNewToy) {
        console.warn(`⚠️ Removing ${field} field from update data`);
        delete cleanToyData[field];
      }
    });
    
    // For new toys, remove id field (it will be auto-generated)
    if (isNewToy && 'id' in cleanToyData) {
      console.log('🆕 Removing id field for new toy (will be auto-generated)');
      delete cleanToyData.id;
    }
    
    // Validate data before attempting to save
    validateToyData(cleanToyData);
    
    // FINAL SAFETY CHECK - Remove toy_id if it somehow got added again
    if ('toy_id' in cleanToyData) {
      console.error('🚨 CRITICAL: toy_id field found again after transformation! Removing it...');
      console.error('🚨 Data before final cleanup:', JSON.stringify(cleanToyData, null, 2));
      delete cleanToyData.toy_id;
    }
    
    // Additional check for any fields not in the toys table schema
    const VALID_FIELDS = ['name', 'description', 'category', 'subscription_category', 'age_range', 'brand', 'pack', 'retail_price', 'rental_price', 'image_url', 'total_quantity', 'available_quantity', 'rating', 'show_strikethrough_pricing', 'display_order', 'is_featured', 'created_at', 'updated_at', 'id'];
    const extraInvalidFields = Object.keys(cleanToyData).filter(field => !VALID_FIELDS.includes(field));
    if (extraInvalidFields.length > 0) {
      console.error('🚨 CRITICAL: Invalid fields detected:', extraInvalidFields);
      extraInvalidFields.forEach(field => {
        console.error(`🚨 Removing invalid field: ${field} = ${cleanToyData[field]}`);
        delete cleanToyData[field];
      });
    }

    // Log the exact data being sent
    console.log('✅ Cleaned toy data to be saved (admin):', JSON.stringify(cleanToyData, null, 2));

    if (isNewToy) {
      console.log('Creating new toy (admin)...');
      
      // ABSOLUTE FINAL CHECK - Force remove toy_id right before database operation
      if ('toy_id' in cleanToyData) {
        console.error('🚨 EMERGENCY: toy_id field detected right before database insert! Force removing...');
        console.error('🚨 Data that would cause error:', JSON.stringify(cleanToyData, null, 2));
        delete cleanToyData.toy_id;
      }
      
      // Log the final data being sent to database
      console.log('🔥 FINAL DATA TO DATABASE (admin):', JSON.stringify(cleanToyData, null, 2));
      
      const { data: newToy, error } = await supabaseAdmin
        .from('toys')
        .insert(cleanToyData)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Database error creating toy (admin):', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Provide more specific error messages
        if (error.code === '23505') {
          throw new Error('A toy with this name already exists');
        } else if (error.code === '23514') {
          throw new Error('Invalid data provided - please check all fields');
        } else if (error.code === '23503') {
          throw new Error('Invalid category or reference data');
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          throw new Error(`Database schema error: ${error.message}`);
        }
        throw new Error(`Failed to create toy: ${error.message}`);
      }
      
      if (!newToy || !newToy.id) {
        console.error('No toy created - unexpected error');
        throw new Error('Failed to create toy - no data returned.');
      }
      
      console.log('Successfully created new toy (admin):', newToy);
      return newToy.id;
    } else {
      if (!id) {
        throw new Error('Toy ID is required for updates');
      }
      
      console.log('Updating existing toy with ID (admin):', id);
      
      // First check if the toy exists
      const { data: existingToy, error: checkError } = await supabaseAdmin
        .from('toys')
        .select('id, name')
        .eq('id', id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing toy (admin):', checkError);
        throw new Error(`Failed to verify toy exists: ${checkError.message}`);
      }
      
      if (!existingToy) {
        throw new Error('Toy not found');
      }
      
      console.log('Existing toy found, proceeding with update (admin):', existingToy);
      
      // ABSOLUTE FINAL CHECK - Force remove toy_id right before database operation
      if ('toy_id' in cleanToyData) {
        console.error('🚨 EMERGENCY: toy_id field detected right before database update! Force removing...');
        console.error('🚨 Data that would cause error:', JSON.stringify(cleanToyData, null, 2));
        delete cleanToyData.toy_id;
      }
      
      // Log the final data being sent to database
      console.log('🔥 FINAL DATA TO DATABASE (admin):', JSON.stringify(cleanToyData, null, 2));
      
      const { data: updatedToy, error } = await supabaseAdmin
        .from('toys')
        .update(cleanToyData)
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Database error updating toy (admin):', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          sentData: cleanToyData
        });
        
        // Provide more specific error messages
        if (error.code === '23505') {
          throw new Error('A toy with this name already exists');
        } else if (error.code === '23514') {
          throw new Error('Invalid data provided - please check all fields');
        } else if (error.code === '23503') {
          throw new Error('Invalid category or reference data');
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          throw new Error(`Database schema error: ${error.message}. This usually means the form is trying to save a field that doesn't exist in the database.`);
        }
        throw new Error(`Failed to update toy: ${error.message}`);
      }
      
      if (!updatedToy) {
        console.error('No toy updated - unexpected error');
        throw new Error('Failed to update toy - no data returned.');
      }
      
      console.log('Successfully updated toy (admin):', updatedToy);
      return id;
    }
  } catch (error) {
    console.error('Toy save operation failed (admin):', error);
    throw error;
  }
};

export const fetchToyImagesAdmin = async (id: string) => {
  console.log('Fetching toy images for ID (admin):', id);
  const { data: imageData, error: imageError } = await supabaseAdmin
    .from('toy_images')
    .select('*')
    .eq('toy_id', id)
    .order('display_order');

  if (imageError && imageError.code !== 'PGRST116') {
    console.warn('Error fetching toy images (admin):', imageError);
  }

  console.log('Fetched toy images (admin):', imageData);
  return imageData || [];
};

export const saveToyImagesAdmin = async (toyId: string, images: string[], primaryImageIndex: number) => {
  if (images.length === 0) {
    console.log('No images to save (admin)');
    return;
  }

  console.log('Starting image save operation (admin):', { toyId, images, primaryImageIndex });

  try {
    // Use a transaction-like approach: first delete, then insert
    console.log('Deleting existing images (admin)...');
    const { error: deleteError } = await supabaseAdmin
      .from('toy_images')
      .delete()
      .eq('toy_id', toyId);

    if (deleteError) {
      console.warn('Warning deleting existing images (admin):', deleteError);
      // Don't throw here as the images might not exist yet
    } else {
      console.log('Successfully deleted existing images (admin)');
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

    console.log('Inserting new images (admin):', imageInserts);

    const { error: imageError } = await supabaseAdmin
      .from('toy_images')
      .insert(imageInserts);

    if (imageError) {
      console.error('Error saving images (admin):', imageError);
      throw new Error(`Error saving images: ${imageError.message}`);
    }
    
    console.log('Successfully saved toy images (admin)');
  } catch (error) {
    console.error('Image save operation failed (admin):', error);
    throw error;
  }
};
