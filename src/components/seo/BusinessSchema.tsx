import { Helmet } from 'react-helmet-async';

export const BusinessSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Toyflix India",
        "description": "Premium toy rental subscription service for children in India. Safe, sanitized educational toys delivered monthly.",
        "url": "https://toyflix.in",
        "logo": "https://toyflix.in/logo.png",
        "image": "https://toyflix.in/toyflix-social-image.jpg",
        "telephone": "+91-8000000000",
        "email": "support@toyflix.in",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "IN",
          "addressRegion": "India"
        },
        "areaServed": {
          "@type": "Country",
          "name": "India"
        },
        "serviceType": "Toy Rental Subscription Service",
        "priceRange": "₹999-₹2999",
        "paymentAccepted": ["Credit Card", "Debit Card", "UPI", "Net Banking"],
        "currenciesAccepted": "INR",
        "openingHours": "Mo-Su 09:00-21:00",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "1250",
          "bestRating": "5",
          "worstRating": "1"
        },
        "sameAs": [
          "https://facebook.com/toyflix",
          "https://instagram.com/toyflix",
          "https://twitter.com/toyflix"
        ]
      })}
    </script>
  </Helmet>
);