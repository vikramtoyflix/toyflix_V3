
import { EnhancedMappedToyData } from './types';
import { imageService } from "@/services/imageService";

export const processImagesForToy = async (
  toyData: EnhancedMappedToyData, 
  allImageUrls: string[],
  downloadImages: boolean
): Promise<{ updatedToyData: EnhancedMappedToyData; processedImages: string[]; imageErrors?: string[] }> => {
  if (!downloadImages || allImageUrls.length === 0) {
    return { 
      updatedToyData: toyData, 
      processedImages: allImageUrls.slice(0, 1) // Keep only first URL if not downloading
    };
  }

  const processedImages: string[] = [];
  const imageErrors: string[] = [];

  for (let i = 0; i < Math.min(allImageUrls.length, 5); i++) { // Limit to 5 images
    try {
      const fileName = imageService.generateSafeFileName(toyData.name);
      const result = await imageService.downloadAndUploadImage(allImageUrls[i], `${fileName}_${i + 1}`);
      
      if (result.success && result.url) {
        processedImages.push(result.url);
      } else {
        imageErrors.push(`Image ${i + 1}: ${result.error || 'Failed to process'}`);
      }
    } catch (error) {
      imageErrors.push(`Image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    updatedToyData: {
      ...toyData,
      image_url: processedImages[0] || toyData.image_url
    },
    processedImages,
    imageErrors: imageErrors.length > 0 ? imageErrors : undefined
  };
};
