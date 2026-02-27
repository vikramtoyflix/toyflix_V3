// Google Tag Manager integration for ToyFlix
// Your existing GTM Container ID from the old website
const GTM_CONTAINER_ID = import.meta.env.VITE_GTM_CONTAINER_ID || 'GTM-57M5SSR';

export const initializeGTM = () => {
  // Only initialize if not already done and ID is configured
  if (typeof window.dataLayer !== 'undefined' || !GTM_CONTAINER_ID) {
    return;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // GTM script injection
  const script = document.createElement('script');
  script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;
  
  document.head.appendChild(script);

  // Add noscript fallback to body
  const noscript = document.createElement('noscript');
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.appendChild(noscript);

  console.log('✅ Google Tag Manager initialized with container:', GTM_CONTAINER_ID);
};

// Push events to GTM dataLayer
export const pushToDataLayer = (event: any) => {
  if (typeof window.dataLayer !== 'undefined') {
    window.dataLayer.push(event);
  }
};

// E-commerce tracking events (maintain compatibility with old website)
export const trackPurchase = (transactionData: any) => {
  pushToDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: transactionData.transaction_id,
      value: transactionData.value,
      currency: 'INR',
      items: transactionData.items
    }
  });
};

export const trackAddToCart = (item: any) => {
  pushToDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'INR',
      value: item.price,
      items: [item]
    }
  });
};

export const trackViewItem = (item: any) => {
  pushToDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'INR',
      value: item.price,
      items: [item]
    }
  });
};

// Custom events for ToyFlix business logic
export const trackSubscriptionEvent = (eventName: string, subscriptionData: any) => {
  pushToDataLayer({
    event: 'subscription_action',
    subscription_event: eventName,
    subscription_plan: subscriptionData.plan,
    subscription_value: subscriptionData.value,
    user_id: subscriptionData.user_id
  });
}; 