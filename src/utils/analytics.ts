declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

// Your actual Google Analytics Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-LZ0KCP21VN';

export const initializeGA = () => {
  // Only initialize if not already done and ID is configured
  if (typeof window.gtag !== 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: false // We'll manually send page views
  });

  console.log('✅ Google Analytics initialized');
};

export const trackPageView = (path: string, title: string) => {
  if (typeof window.gtag !== 'undefined' && GA_MEASUREMENT_ID) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title
    });
    
    window.gtag('event', 'page_view', {
      page_title: title,
      page_location: window.location.href,
      page_path: path
    });
  }
};

export const trackEvent = (eventName: string, parameters: any) => {
  if (typeof window.gtag !== 'undefined' && GA_MEASUREMENT_ID) {
    window.gtag('event', eventName, parameters);
  }
};

// SEO-specific tracking events
export const trackSEOEvent = (action: string, details?: any) => {
  trackEvent('seo_interaction', {
    seo_action: action,
    ...details
  });
};

// Track search functionality
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount
  });
};

// Track product interactions
export const trackProductView = (toy: any) => {
  trackEvent('view_item', {
    item_id: toy.id,
    item_name: toy.name,
    item_category: toy.category,
    price: toy.rental_price,
    currency: 'INR'
  });
}; 