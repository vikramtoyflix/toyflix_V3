// Preload critical resources
export const preloadCriticalResources = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Preload fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preload critical images (favicons only - hero is loaded by carousel)
  const preloadImage = (src: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  };

  // Preload favicons (hero images are lazy-loaded by carousel)
  try {
    preloadImage('/favicon.ico');
  } catch {
    // Ignore preload errors
  }
};

// Optimize images for SEO and performance
export const generateOptimizedImageUrl = (
  originalUrl: string, 
  width?: number, 
  height?: number,
  quality: number = 80
): string => {
  // If using Supabase storage, add optimization parameters
  if (originalUrl.includes('supabase')) {
    const url = new URL(originalUrl);
    const params = new URLSearchParams(url.search);
    
    if (width) params.set('width', width.toString());
    if (height) params.set('height', height.toString());
    params.set('quality', quality.toString());
    params.set('format', 'webp');
    
    url.search = params.toString();
    return url.toString();
  }
  
  // For other CDNs or local images, return as-is
  return originalUrl;
};

// Lazy load images with intersection observer
export const createIntersectionObserver = (callback: IntersectionObserverCallback) => {
  if (typeof window === 'undefined') return null;

  const options = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };

  return new IntersectionObserver(callback, options);
};

// Preload images for better UX
export const preloadImages = (imageUrls: string[]) => {
  if (typeof window === 'undefined') return;

  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

// Monitor Core Web Vitals for SEO
export const monitorCoreWebVitals = () => {
  if (typeof window === 'undefined') return;

  // Monitor Largest Contentful Paint (LCP)
  const observeLCP = () => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        console.log('🎯 LCP (Largest Contentful Paint):', lastEntry.startTime, 'ms');
        
        // Track in analytics if available
        if (typeof window.gtag !== 'undefined') {
          window.gtag('event', 'timing_complete', {
            name: 'LCP',
            value: Math.round(lastEntry.startTime)
          });
        }
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  };

  // Monitor First Input Delay (FID)
  const observeFID = () => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          console.log('🎯 FID (First Input Delay):', entry.processingStart - entry.startTime, 'ms');
          
          // Track in analytics if available
          if (typeof window.gtag !== 'undefined') {
            window.gtag('event', 'timing_complete', {
              name: 'FID',
              value: Math.round(entry.processingStart - entry.startTime)
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    }
  };

  // Monitor Cumulative Layout Shift (CLS)
  const observeCLS = () => {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        console.log('🎯 CLS (Cumulative Layout Shift):', clsValue);
        
        // Track in analytics if available
        if (typeof window.gtag !== 'undefined') {
          window.gtag('event', 'timing_complete', {
            name: 'CLS',
            value: Math.round(clsValue * 1000) / 1000
          });
        }
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  };

  observeLCP();
  observeFID();
  observeCLS();
}; 