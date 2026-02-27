// Enhanced Meta tracking utility that supports both traditional Meta Pixel and Signals Gateway
export function fbqTrack(event: string, params: Record<string, any> = {}) {
  // Traditional Meta Pixel tracking (existing functionality)
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params);
    console.log('📊 Meta Pixel tracked:', event, params);
  }
  
  // New Signals Gateway tracking
  if (typeof window !== 'undefined' && (window as any).cbq) {
    (window as any).cbq('track', event, params);
    console.log('📊 Signals Gateway tracked:', event, params);
  }
}

// Dedicated Signals Gateway tracking function
export function cbqTrack(event: string, params: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && (window as any).cbq) {
    (window as any).cbq('track', event, params);
    console.log('📊 Signals Gateway tracked:', event, params);
  }
}

// Enhanced tracking for both systems
export function trackDualEvent(event: string, params: Record<string, any> = {}) {
  fbqTrack(event, params); // This now handles both fbq and cbq
}

// Comprehensive event tracking functions for Toyflix

export function trackSearch(searchTerm: string, category?: string) {
  fbqTrack('Search', {
    search_string: searchTerm,
    content_category: category || 'toys',
    content_type: 'product'
  });
}

export function trackUserEngagement(action: string, content: string) {
  fbqTrack('Custom', {
    custom_event_type: 'user_engagement',
    action,
    content,
    timestamp: new Date().toISOString()
  });
}

export function trackSubscriptionCancel(planId: string, reason?: string) {
  fbqTrack('Custom', {
    custom_event_type: 'subscription_cancel',
    subscription_plan: planId,
    cancel_reason: reason,
    timestamp: new Date().toISOString()
  });
}

export function trackToyReturn(toyId: string, toyName: string) {
  fbqTrack('Custom', {
    custom_event_type: 'toy_return',
    content_ids: [toyId],
    content_name: toyName,
    content_type: 'product',
    timestamp: new Date().toISOString()
  });
} 