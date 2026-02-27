
import { EnhancedMappedToyData, ImportResults } from './types.ts'
import { parseEnhancedCSVRow, parseCSVRow, parseDirectCSVRow } from './dataProcessing.ts'
import { validateToyData } from './validation.ts'
import { processImageForToy } from './imageUtils.ts'

export interface ImportOptions {
  csvData: any[];
  downloadImages: boolean;
  skipDuplicates: boolean;
  enhanced: boolean;
  categoryMappingMode?: string;
  importMode?: string;
  clearExistingData: boolean;
}

async function saveToyImages(toyId: string, images: string[], supabaseAdmin: any): Promise<void> {
  if (images.length === 0) return;

  try {
    // Delete existing images for this toy
    const { error: deleteError } = await supabaseAdmin
      .from('toy_images')
      .delete()
      .eq('toy_id', toyId);

    if (deleteError) {
      console.warn('Warning deleting existing toy images:', deleteError);
    }

    // Insert new images
    const imageInserts = images.map((imageUrl, index) => ({
      toy_id: toyId,
      image_url: imageUrl,
      display_order: index,
      is_primary: index === 0
    }));

    const { error: imageError } = await supabaseAdmin
      .from('toy_images')
      .insert(imageInserts);

    if (imageError) {
      console.error('Error saving toy images:', imageError);
      throw new Error(`Error saving images: ${imageError.message}`);
    }
    
    console.log(`Successfully saved ${images.length} images for toy ${toyId}`);
  } catch (error) {
    console.error('Image save operation failed:', error);
    throw error;
  }
}

async function clearExistingData(supabaseAdmin: any): Promise<void> {
  console.log('Starting to clear existing toy data...');
  
  try {
    // Delete toy_images first (to avoid foreign key constraints)
    console.log('Deleting toy images...');
    const { error: deleteImagesError } = await supabaseAdmin
      .from('toy_images')
      .delete()
      .neq('toy_id', '00000000-0000-0000-0000-000000000000');

    if (deleteImagesError) {
      console.error('Failed to clear toy images:', deleteImagesError);
      throw new Error(`Failed to clear toy images: ${deleteImagesError.message}`);
    }
    console.log('Successfully deleted toy images');

    // Delete toys
    console.log('Deleting toys...');
    const { error: deleteToysError } = await supabaseAdmin
      .from('toys')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteToysError) {
      console.error('Failed to clear toys:', deleteToysError);
      throw new Error(`Failed to clear toys: ${deleteToysError.message}`);
    }
    console.log('Successfully deleted toys');
  } catch (error) {
    console.error('Clear data operation failed:', error);
    throw error;
  }
}

export async function processCSVImport(
  options: ImportOptions,
  supabaseAdmin: any
): Promise<ImportResults> {
  const { csvData, downloadImages, skipDuplicates, enhanced, categoryMappingMode, importMode, clearExistingData: shouldClearData } = options;
  
  const mode = importMode || (enhanced ? 'enhanced' : 'basic');
  console.log(`Starting ${mode} admin CSV import, ${csvData.length} rows`);

  const results: ImportResults = {
    successful: 0,
    failed: 0,
    errors: [],
    imported: [],
    imageErrors: [],
    duplicatesSkipped: 0
  };

  // Clear existing data if requested for direct import
  if (shouldClearData && mode === 'direct') {
    try {
      await clearExistingData(supabaseAdmin);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw new Error('Failed to clear existing data');
    }
  }

  // Get existing toys for duplicate detection
  let existingToys: Set<string> = new Set();
  if (skipDuplicates && !shouldClearData) {
    const { data: toys } = await supabaseAdmin
      .from('toys')
      .select('name, sku, brand');
    
    if (toys) {
      toys.forEach((toy: any) => {
        existingToys.add(toy.name.toLowerCase());
        if (toy.sku) existingToys.add(toy.sku.toLowerCase());
        // For direct import, also check name + brand combination
        if (toy.brand) existingToys.add(`${toy.name.toLowerCase()}|${toy.brand.toLowerCase()}`);
      });
    }
  }

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    
    try {
      let mappedToy: EnhancedMappedToyData;
      
      // Choose parsing method based on import mode
      switch (mode) {
        case 'direct':
          mappedToy = parseDirectCSVRow(row);
          break;
        case 'enhanced':
          mappedToy = parseEnhancedCSVRow(row, { downloadImages, categoryMappingMode });
          break;
        default:
          mappedToy = parseCSVRow(row, { downloadImages });
      }

      const validationErrors = validateToyData(mappedToy);

      if (validationErrors.length > 0) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${validationErrors.join(', ')}`);
        continue;
      }

      // Check for duplicates
      if (skipDuplicates && !shouldClearData) {
        const nameMatch = existingToys.has(mappedToy.name.toLowerCase());
        const skuMatch = mappedToy.sku && existingToys.has(mappedToy.sku.toLowerCase());
        const nameBrandMatch = mappedToy.brand && existingToys.has(`${mappedToy.name.toLowerCase()}|${mappedToy.brand.toLowerCase()}`);
        
        if (nameMatch || skuMatch || nameBrandMatch) {
          results.duplicatesSkipped++;
          console.log(`Skipping duplicate: ${mappedToy.name}`);
          continue;
        }
      }

      // Process images if download option is enabled
      let finalToyData = mappedToy;
      let processedImages: string[] = mappedToy.all_images || [];
      
      if (downloadImages && mappedToy.all_images && mappedToy.all_images.length > 0) {
        console.log(`Processing ${mappedToy.all_images.length} images for toy: ${mappedToy.name}`);
        try {
          const downloadedImages: string[] = [];
          
          for (let imgIndex = 0; imgIndex < mappedToy.all_images.length; imgIndex++) {
            const imageUrl = mappedToy.all_images[imgIndex];
            try {
              const imageResult = await processImageForToy(
                { ...mappedToy, image_url: imageUrl }, 
                true, 
                supabaseAdmin
              );
              
              if (imageResult.updatedToyData.image_url) {
                downloadedImages.push(imageResult.updatedToyData.image_url);
              }
              
              if (imageResult.imageError) {
                results.imageErrors.push(`Row ${i + 2} (${mappedToy.name}) Image ${imgIndex + 1}: ${imageResult.imageError}`);
              }
            } catch (imageError) {
              results.imageErrors.push(`Row ${i + 2} (${mappedToy.name}) Image ${imgIndex + 1}: Download failed`);
              console.error('Image processing error:', imageError);
            }
          }
          
          processedImages = downloadedImages;
          finalToyData = {
            ...mappedToy,
            image_url: downloadedImages[0] || mappedToy.image_url
          };
        } catch (imageError) {
          results.imageErrors.push(`Row ${i + 2} (${mappedToy.name}): Image processing failed`);
          console.error('Image processing error:', imageError);
        }
      }

      // Remove all_images from final data before inserting into toys table
      const { all_images, ...toyDataForInsert } = finalToyData;

      // Insert into toys table
      const { data: insertedToy, error: insertError } = await supabaseAdmin
        .from('toys')
        .insert(toyDataForInsert)
        .select()
        .single();

      if (insertError) {
        results.failed++;
        let errorMessage = insertError.message;
        
        if (insertError.message.includes('duplicate')) {
          errorMessage = 'Toy already exists in database';
        }
        
        results.errors.push(`Row ${i + 2}: ${errorMessage}`);
        console.error('Database insert error:', insertError);
      } else {
        // Save images to toy_images table if we have multiple images
        if (processedImages.length > 0) {
          try {
            await saveToyImages(insertedToy.id, processedImages, supabaseAdmin);
          } catch (imageError) {
            console.error('Failed to save toy images:', imageError);
            results.imageErrors.push(`Row ${i + 2} (${mappedToy.name}): Failed to save images to gallery`);
          }
        }

        results.successful++;
        results.imported.push(finalToyData);
        console.log(`Successfully imported: ${finalToyData.name}`);
        
        // Add to existing toys set for duplicate detection
        if (skipDuplicates) {
          existingToys.add(finalToyData.name.toLowerCase());
          if (finalToyData.sku) existingToys.add(finalToyData.sku.toLowerCase());
          if (finalToyData.brand) existingToys.add(`${finalToyData.name.toLowerCase()}|${finalToyData.brand.toLowerCase()}`);
        }
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${i + 2}: Processing error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Row processing error:', error);
    }
  }

  console.log(`Import completed: ${results.successful} successful, ${results.failed} failed, ${results.duplicatesSkipped} duplicates skipped`);
  return results;
}
