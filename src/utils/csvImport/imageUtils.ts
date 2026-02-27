
export const cleanImageUrls = (images: string): string[] => {
  if (!images || typeof images !== 'string') return [];
  
  // Split by common separators and clean each URL
  const imageUrls = images.split(/[,;|\n]/).map(url => {
    if (!url) return null;
    
    let cleanUrl = url.trim();
    
    // Remove HTML tags if present
    cleanUrl = cleanUrl.replace(/<[^>]*>/g, '');
    
    // Remove quotes
    cleanUrl = cleanUrl.replace(/["']/g, '');
    
    // Validate URL format
    if (!cleanUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      return null;
    }
    
    return cleanUrl;
  }).filter(Boolean);
  
  return imageUrls as string[];
};
