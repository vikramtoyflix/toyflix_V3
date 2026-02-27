import { ToyCategory } from "@/types/toy";
import { ToyFormData } from "@/types/toy";

export const parsePack = (pack: string | string[] | null): string[] => {
  if (Array.isArray(pack)) return pack;
  if (typeof pack === 'string' && pack.trim()) {
    try {
      // Try to parse as JSON array first
      return JSON.parse(pack);
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return pack.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return ['standard'];
};

export const parseCategory = (category: string | string[] | null): string[] => {
  if (Array.isArray(category)) return category;
  if (typeof category === 'string' && category.trim()) {
    try {
      // Try to parse as JSON array first
      return JSON.parse(category);
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return category.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return ['educational_toys'];
};

export const parseAgeRange = (ageRange: string | string[] | null): string[] => {
  if (Array.isArray(ageRange)) return ageRange;
  if (typeof ageRange === 'string' && ageRange.trim()) {
    try {
      // Try to parse as JSON array first
      return JSON.parse(ageRange);
    } catch {
      // If JSON parsing fails, treat as comma-separated string
      return ageRange.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return ['2-4 years'];
};

export const parseImages = (imageData: any[], imageUrl: string | null): { images: string[], primaryIndex: number } => {
  let images: string[] = [];
  let primaryIndex = 0;
  
  console.log('🖼️ Parsing toy images:', { imageData, imageUrl });
  
  if (imageData && imageData.length > 0) {
    // Process images from toy_images table
    console.log('📸 Found toy_images data:', imageData);
    
    // Sort by display_order to maintain proper sequence
    const sortedImages = [...imageData].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    images = sortedImages.map(img => img.image_url).filter(Boolean);
    
    // Find primary image index
    const primaryImage = sortedImages.find(img => img.is_primary);
    if (primaryImage) {
      primaryIndex = sortedImages.findIndex(img => img.is_primary);
      // Ensure primaryIndex is valid
      if (primaryIndex < 0) primaryIndex = 0;
    }
    
    console.log('✅ Processed images from toy_images table:', {
      images: images.length,
      primaryIndex,
      primaryUrl: images[primaryIndex]
    });
  } else if (imageUrl && imageUrl.trim()) {
    // Fallback to single image from toys table
    console.log('📷 Using fallback image_url from toys table:', imageUrl);
    images = [imageUrl.trim()];
    primaryIndex = 0;
  } else {
    console.log('❌ No images found for toy');
  }
  
  // Validate primaryIndex is within bounds
  if (primaryIndex >= images.length) {
    console.warn('⚠️ Primary index out of bounds, resetting to 0');
    primaryIndex = 0;
  }
  
  const result = { images, primaryIndex };
  console.log('🎯 Final parsed images result:', result);
  
  return result;
};
