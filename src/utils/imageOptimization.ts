/**
 * Image optimization utilities for better performance and user experience
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  progressive?: boolean;
}

export interface OptimizedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

/**
 * Compress and resize an image using Canvas API
 */
export const compressImage = async (
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> => {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
    format = 'jpeg',
    progressive = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate optimal dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateOptimalDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the resized image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to blob with specified quality and format
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const dataUrl = canvas.toDataURL(`image/${format}`, quality);
          const compressionRatio = ((file.size - blob.size) / file.size) * 100;

          resolve({
            blob,
            dataUrl,
            width: newWidth,
            height: newHeight,
            originalSize: file.size,
            optimizedSize: blob.size,
            compressionRatio
          });
        },
        `image/${format}`,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
export const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  // Scale down if image is larger than max dimensions
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
};

/**
 * Create a thumbnail from an image file
 */
export const createThumbnail = async (
  file: File,
  size: number = 150
): Promise<string> => {
  const result = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'jpeg'
  });

  return result.dataUrl;
};

/**
 * Generate multiple sizes of an image for responsive display
 */
export const generateResponsiveImages = async (
  file: File
): Promise<{
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
}> => {
  const [thumbnail, small, medium, large] = await Promise.all([
    createThumbnail(file, 150),
    compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.7 }),
    compressImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.8 }),
    compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 })
  ]);

  return {
    thumbnail,
    small: small.dataUrl,
    medium: medium.dataUrl,
    large: large.dataUrl
  };
};

/**
 * Check if WebP format is supported by the browser
 */
export const isWebPSupported = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Get optimal image format based on browser support
 */
export const getOptimalFormat = (): 'webp' | 'jpeg' => {
  return isWebPSupported() ? 'webp' : 'jpeg';
};

/**
 * Preload an image for better user experience
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate image file type and size
 */
export const validateImageFile = (
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'] } = options;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size too large. Maximum size: ${formatFileSize(maxSize)}`
    };
  }

  return { valid: true };
}; 