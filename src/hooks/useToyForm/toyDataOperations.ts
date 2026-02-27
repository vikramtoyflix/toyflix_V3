
import { supabase } from "@/integrations/supabase/client";
import { validateToyData } from './toyDataValidation';

export const fetchToyData = async (id: string) => {
  console.log('Fetching toy data for ID:', id);
  const { data: toyData, error: toyError } = await supabase
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
  
  console.log('Fetched toy data:', toyData);
  return toyData;
};

export const saveToy = async (toyData: any, isNewToy: boolean, id?: string) => {
  console.log('Starting toy save operation:', { toyData, isNewToy, id });
  
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
    console.log('✅ Cleaned toy data to be saved:', JSON.stringify(cleanToyData, null, 2));

    if (isNewToy) {
      console.log('Creating new toy...');
      
      // ABSOLUTE FINAL CHECK - Force remove toy_id right before database operation
      if ('toy_id' in cleanToyData) {
        console.error('🚨 EMERGENCY: toy_id field detected right before database insert! Force removing...');
        console.error('🚨 Data that would cause error:', JSON.stringify(cleanToyData, null, 2));
        delete cleanToyData.toy_id;
      }
      
      // Log the final data being sent to database
      console.log('🔥 FINAL DATA TO DATABASE:', JSON.stringify(cleanToyData, null, 2));
      
      const { data: newToy, error } = await supabase
        .from('toys')
        .insert(cleanToyData)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Database error creating toy:', error);
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
        console.error('No toy created - insert may have been filtered by RLS');
        throw new Error('Failed to create toy - no data returned. Please check your permissions.');
      }
      
      console.log('Successfully created new toy:', newToy);
      return newToy.id;
    } else {
      if (!id) {
        throw new Error('Toy ID is required for updates');
      }
      
      console.log('Updating existing toy with ID:', id);
      
      // First check if the toy exists and we have permission to update it
      const { data: existingToy, error: checkError } = await supabase
        .from('toys')
        .select('id, name')
        .eq('id', id)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing toy:', checkError);
        throw new Error(`Failed to verify toy exists: ${checkError.message}`);
      }
      
      if (!existingToy) {
        throw new Error('Toy not found or you do not have permission to update it');
      }
      
      console.log('Existing toy found, proceeding with update:', existingToy);
      
      // ABSOLUTE FINAL CHECK - Force remove toy_id right before database operation
      if ('toy_id' in cleanToyData) {
        console.error('🚨 EMERGENCY: toy_id field detected right before database update! Force removing...');
        console.error('🚨 Data that would cause error:', JSON.stringify(cleanToyData, null, 2));
        delete cleanToyData.toy_id;
      }
      
      // Log the final data being sent to database
      console.log('🔥 FINAL DATA TO DATABASE:', JSON.stringify(cleanToyData, null, 2));
      
      const { data: updatedToy, error } = await supabase
        .from('toys')
        .update(cleanToyData)
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('Database error updating toy:', error);
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
        console.error('No toy updated - update may have been filtered by RLS or toy not found');
        throw new Error('Failed to update toy - no data returned. Please check the toy exists and you have permission to update it.');
      }
      
      console.log('Successfully updated toy:', updatedToy);
      return id;
    }
  } catch (error) {
    console.error('Toy save operation failed:', error);
    throw error;
  }
};
