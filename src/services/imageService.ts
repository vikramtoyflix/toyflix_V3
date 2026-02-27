
export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Default fallback images for different contexts
const FALLBACK_IMAGES = {
  toy: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?q=80&w=400&auto=format&fit=crop",
  carousel: "https://images.unsplash.com/photo-1566844911516-6e309ed5d155?q=80&w=800&auto=format&fit=crop",
  product: "https://images.unsplash.com/photo-1519619091416-f5d7e5200702?q=80&w=600&auto=format&fit=crop"
};

// Width, quality settings per display context
const TRANSFORM_PARAMS: Record<'toy' | 'carousel' | 'product', { width: number; quality: number }> = {
  toy:      { width: 400,  quality: 75 },
  product:  { width: 600,  quality: 80 },
  carousel: { width: 900,  quality: 80 },
};

/**
 * Converts any Supabase Storage /object/public/ URL into a
 * /render/image/public/ URL that returns WebP at the right size.
 * Works for any bucket (toy-images, products, etc.).
 * Falls back to the original URL if the pattern doesn't match.
 */
function toSupabaseTransformUrl(
  url: string,
  context: 'toy' | 'carousel' | 'product'
): string {
  // Match: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const match = url.match(
    /^(https:\/\/[^/]+\.supabase\.co)\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
  );
  if (!match) return url;

  const [, host, bucket, filePath] = match;
  const { width, quality } = TRANSFORM_PARAMS[context];

  // Supabase image transform endpoint (Pro plan).
  // No &format= param needed — Supabase auto-serves WebP to browsers that send Accept: image/webp.
  return `${host}/storage/v1/render/image/public/${bucket}/${filePath}?width=${width}&quality=${quality}&resize=contain`;
}

export const imageService = {
  /**
   * Get a reliable image URL with fallback chain and optimization
   */
  getImageUrl(originalUrl: string | null | undefined, context: 'toy' | 'carousel' | 'product' = 'toy'): string {
    const url = typeof originalUrl === 'string' ? originalUrl.trim() : '';
    if (!url) {
      return FALLBACK_IMAGES[context];
    }
    const cleanUrl = url;
    
    // If it's a local path (starts with / but not //), return it directly
    if (cleanUrl.startsWith('/') && !cleanUrl.startsWith('//')) {
      return cleanUrl;
    }
    
    // If it's already a valid Unsplash URL, optimize it
    if (cleanUrl.includes('unsplash.com')) {
      return this.optimizeUnsplashUrl(cleanUrl, context);
    }

    // Supabase Storage URL → use image transform API (WebP, right size, Pro plan)
    if (cleanUrl.includes('supabase.co/storage/v1/object/public/')) {
      return toSupabaseTransformUrl(cleanUrl, context);
    }

    // If it looks like a valid URL, return it
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://') || cleanUrl.startsWith('//')) {
      return cleanUrl;
    }

    // Otherwise, log a warning and return fallback
    console.warn(`ImageService: Invalid URL format "${cleanUrl}". Using fallback for context: ${context}`);
    return FALLBACK_IMAGES[context];
  },

  /**
   * Optimize Unsplash URLs with proper parameters
   */
  optimizeUnsplashUrl(url: string, context: 'toy' | 'carousel' | 'product'): string {
    try {
      let validUrl = url;
      if (!validUrl.startsWith('http')) {
        validUrl = `https://${validUrl.replace(/^\/\//, '')}`;
      }
      
      const urlObj = new URL(validUrl);
      
      // Set quality and format parameters
      urlObj.searchParams.set('q', '80');
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('fit', 'crop');
      
      // Set size based on context
      switch (context) {
        case 'carousel':
          urlObj.searchParams.set('w', '800');
          urlObj.searchParams.set('h', '400');
          break;
        case 'product':
          urlObj.searchParams.set('w', '600');
          urlObj.searchParams.set('h', '600');
          break;
        default: // toy
          urlObj.searchParams.set('w', '400');
          urlObj.searchParams.set('h', '400');
      }
      
      return urlObj.toString();
    } catch (e) {
      console.warn(`ImageService: Failed to optimize Unsplash URL "${url}". Using fallback. Error: ${e instanceof Error ? e.message : String(e)}`);
      return FALLBACK_IMAGES[context];
    }
  },

  /**
   * Get fallback image chain for error handling
   */
  getFallbackChain(context: 'toy' | 'carousel' | 'product' = 'toy'): string[] {
    const primary = FALLBACK_IMAGES[context];
    const secondary = FALLBACK_IMAGES.toy; // Always fall back to toy image
    
    return context === 'toy' ? [primary] : [primary, secondary];
  },

  /**
   * Download an image from a URL and upload it to S3 storage.
   * AWS SDK loaded dynamically so it's excluded from the customer-facing bundle.
   */
  async downloadAndUploadImage(imageUrl: string, fileName: string): Promise<ImageUploadResult> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return { success: false, error: `Failed to download image: ${response.statusText}` };
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) return { success: false, error: 'URL does not point to a valid image' };
      const { s3Service } = await import('./s3Service');
      return await s3Service.uploadBlob(blob, fileName);
    } catch (error) {
      return { success: false, error: `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },

  /**
   * Upload a file directly to S3 storage.
   * AWS SDK loaded dynamically so it's excluded from the customer-facing bundle.
   */
  async uploadFile(file: File, fileName?: string): Promise<ImageUploadResult> {
    try {
      const { s3Service } = await import('./s3Service');
      return await s3Service.uploadFile(file, fileName);
    } catch (error) {
      return { success: false, error: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  },

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    return extensions[mimeType] || '.jpg';
  },

  /**
   * Generate a safe filename from toy name
   */
  generateSafeFileName(toyName: string): string {
    return toyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
};
