// Meta Pixel (Facebook Pixel) integration for ToyFlix
// Using your existing Pixel ID from WordPress site
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '1689797184752629';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const initializeMetaPixel = () => {
  // Only initialize if not already done
  if (typeof window.fbq !== 'undefined' || !META_PIXEL_ID) {
    return;
  }

  // Meta Pixel base code (simplified for TypeScript compatibility)
  const script = document.createElement('script');
  script.innerHTML = `!function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${META_PIXEL_ID}');
  fbq('track', 'PageView');`;
  document.head.appendChild(script);

  // Add noscript fallback
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1"/>`;
  document.body.appendChild(noscript);

  console.log('✅ Meta Pixel initialized with ID:', META_PIXEL_ID);
};

// Track custom events
export const trackMetaEvent = (eventName: string, parameters?: any) => {
  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', eventName, parameters);
  }
};

// Track standard e-commerce events
export const trackViewContent = (contentData: {
  content_ids: string[];
  content_name: string;
  content_type: string;
  value: number;
  currency: string;
}) => {
  trackMetaEvent('ViewContent', contentData);
};

export const trackAddToCart = (cartData: {
  content_ids: string[];
  content_name: string;
  content_type: string;
  value: number;
  currency: string;
}) => {
  trackMetaEvent('AddToCart', cartData);
};

export const trackInitiateCheckout = (checkoutData: {
  content_ids: string[];
  value: number;
  currency: string;
  num_items: number;
}) => {
  trackMetaEvent('InitiateCheckout', checkoutData);
};

export const trackPurchase = (purchaseData: {
  content_ids: string[];
  value: number;
  currency: string;
  order_id: string;
}) => {
  trackMetaEvent('Purchase', purchaseData);
};

export const trackCompleteRegistration = (registrationData?: {
  content_name?: string;
  value?: number;
  currency?: string;
}) => {
  trackMetaEvent('CompleteRegistration', registrationData);
};

export const trackLead = (leadData?: {
  content_name?: string;
  value?: number;
  currency?: string;
}) => {
  trackMetaEvent('Lead', leadData);
};

// Advanced tracking for ToyFlix specific events
export const trackSubscriptionStart = (subscriptionData: {
  subscription_plan: string;
  value: number;
  predicted_ltv?: number;
}) => {
  trackMetaEvent('Subscribe', {
    content_name: subscriptionData.subscription_plan,
    value: subscriptionData.value,
    currency: 'INR',
    predicted_ltv: subscriptionData.predicted_ltv
  });
};

export const trackToyRental = (toyData: {
  toy_id: string;
  toy_name: string;
  rental_price: number;
  toy_category: string;
}) => {
  trackMetaEvent('ViewContent', {
    content_ids: [toyData.toy_id],
    content_name: toyData.toy_name,
    content_type: 'product',
    value: toyData.rental_price,
    currency: 'INR',
    content_category: toyData.toy_category
  });
};

// Hash function for privacy-compliant data (matching your WordPress implementation)
export const hashData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Server-side event tracking (for future implementation)
export const trackServerSideEvent = async (eventData: {
  event_name: string;
  user_data?: {
    email?: string;
    phone?: string;
  };
  custom_data?: any;
}) => {
  // Note: This would require a backend API endpoint to send to Facebook Conversions API
  // since we can't expose the access token in frontend code
  
  const payload = {
    event_name: eventData.event_name,
    event_time: Math.floor(Date.now() / 1000),
    user_data: {} as any,
    custom_data: eventData.custom_data || {},
    action_source: 'website'
  };

  // Hash user data for privacy compliance
  if (eventData.user_data?.email) {
    payload.user_data.em = await hashData(eventData.user_data.email);
  }
  if (eventData.user_data?.phone) {
    payload.user_data.ph = await hashData(eventData.user_data.phone);
  }

  console.log('📊 Server-side event payload prepared:', payload);
  // TODO: Send to backend API endpoint that forwards to Facebook Conversions API
  
  return payload;
}; 