/**
 * Egress Optimization Utilities
 * 
 * This module provides utilities to reduce Supabase cached egress costs
 * by optimizing image requests and implementing smart caching strategies.
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

export interface EgressStats {
  totalRequests: number;
  estimatedEgress: number; // in MB
  optimizationSavings: number; // percentage
}

/**
 * Optimizes Supabase Storage URLs to reduce egress
 */
export class EgressOptimizer {
  private static readonly SUPABASE_URL = 'https://wucwpyitzqjukcphczhr.supabase.co';
  private static readonly DEFAULT_OPTIONS: ImageOptimizationOptions = {
    quality: 80,
    format: 'webp',
    resize: 'cover'
  };

  /**
   * Optimize a Supabase Storage URL with transformations
   */
  static optimizeStorageUrl(
    originalUrl: string, 
    options: ImageOptimizationOptions = {}
  ): string {
    if (!originalUrl || !originalUrl.includes('supabase.co/storage/v1/object/public/')) {
      return originalUrl;
    }

    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // Extract the path after /storage/v1/object/public/
    const pathMatch = originalUrl.match(/\/storage\/v1\/object\/public\/(.+)/);
    if (!pathMatch) return originalUrl;

    const path = pathMatch[1];
    
    // Build transformation parameters
    const params = new URLSearchParams();
    if (opts.width) params.set('width', opts.width.toString());
    if (opts.height) params.set('height', opts.height.toString());
    if (opts.quality) params.set('quality', opts.quality.toString());
    if (opts.format) params.set('format', opts.format);
    if (opts.resize) params.set('resize', opts.resize);

    // Use Supabase's image transformation API
    const optimizedUrl = `${this.SUPABASE_URL}/storage/v1/render/image/public/${path}?${params.toString()}`;
    
    console.log(`🔧 Egress optimization: ${originalUrl} → ${optimizedUrl}`);
    return optimizedUrl;
  }

  /**
   * Get optimized URL for different contexts
   */
  static getOptimizedUrl(url: string, context: 'thumbnail' | 'card' | 'detail' | 'hero'): string {
    const contextOptions: Record<string, ImageOptimizationOptions> = {
      thumbnail: { width: 150, height: 150, quality: 70 },
      card: { width: 400, height: 400, quality: 80 },
      detail: { width: 800, height: 800, quality: 85 },
      hero: { width: 1200, height: 800, quality: 90 }
    };

    return this.optimizeStorageUrl(url, contextOptions[context]);
  }

  /**
   * Estimate egress savings from optimization
   */
  static estimateEgressSavings(originalSize: number, optimization: ImageOptimizationOptions): number {
    let savings = 0;
    
    // WebP format saves ~25-35%
    if (optimization.format === 'webp') savings += 30;
    
    // AVIF format saves ~50%
    if (optimization.format === 'avif') savings += 50;
    
    // Quality reduction savings
    const quality = optimization.quality || 100;
    if (quality <= 80) savings += 20;
    if (quality <= 70) savings += 35;
    if (quality <= 60) savings += 50;
    
    // Size reduction savings
    if (optimization.width && optimization.width <= 400) savings += 25;
    if (optimization.width && optimization.width <= 200) savings += 50;
    
    return Math.min(savings, 80); // Cap at 80% savings
  }

  /**
   * Batch optimize multiple URLs
   */
  static batchOptimize(
    urls: string[], 
    context: 'thumbnail' | 'card' | 'detail' | 'hero'
  ): string[] {
    return urls.map(url => this.getOptimizedUrl(url, context));
  }

  /**
   * Create a lazy loading image component props
   */
  static getLazyImageProps(url: string, context: 'thumbnail' | 'card' | 'detail' | 'hero') {
    return {
      src: this.getOptimizedUrl(url, context),
      loading: 'lazy' as const,
      decoding: 'async' as const,
      style: { contentVisibility: 'auto' }
    };
  }
}

/**
 * Hook for tracking egress usage (for monitoring)
 */
export const useEgressTracking = () => {
  const trackImageLoad = (url: string, size: number) => {
    // In production, you could send this to analytics
    console.log(`📊 Image loaded: ${url} (${(size / 1024).toFixed(1)}KB)`);
  };

  const trackOptimization = (originalUrl: string, optimizedUrl: string, savings: number) => {
    console.log(`💰 Egress saved: ${savings}% on ${originalUrl}`);
  };

  return { trackImageLoad, trackOptimization };
};

/**
 * Utility to convert existing image URLs in bulk
 */
export const migrateImageUrls = {
  /**
   * Convert S3 URLs to public URLs
   */
  s3ToPublic: (s3Url: string): string => {
    return s3Url.replace('/storage/v1/s3/', '/storage/v1/object/public/');
  },

  /**
   * Add domain to relative URLs
   */
  addDomain: (relativeUrl: string): string => {
    if (relativeUrl.startsWith('http')) return relativeUrl;
    if (relativeUrl.startsWith('/storage/v1/object/public/')) {
      return `https://wucwpyitzqjukcphczhr.supabase.co${relativeUrl}`;
    }
    return relativeUrl;
  },

  /**
   * Batch process URLs from database
   */
  batchProcess: (urls: string[]): string[] => {
    return urls.map(url => {
      const publicUrl = migrateImageUrls.s3ToPublic(url);
      const fullUrl = migrateImageUrls.addDomain(publicUrl);
      return EgressOptimizer.getOptimizedUrl(fullUrl, 'card');
    });
  }
};
