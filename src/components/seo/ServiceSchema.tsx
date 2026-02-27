import { Helmet } from 'react-helmet-async';

export const ServiceSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": "Toyflix Toy Rental Subscription",
        "description": "Premium educational toy rental subscription service for children aged 6 months to 12 years. Monthly delivery of safe, sanitized toys with free shipping across India.",
        "provider": {
          "@type": "Organization",
          "name": "Toyflix India",
          "url": "https://toyflix.in",
          "logo": "https://toyflix.in/logo.png",
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+91-8000000000",
            "contactType": "Customer Service",
            "availableLanguage": "English"
          }
        },
        "areaServed": {
          "@type": "Country",
          "name": "India"
        },
        "serviceType": "Toy Rental Subscription",
        "category": "Children's Education & Entertainment",
        "offers": [
          {
            "@type": "Offer",
            "name": "Discovery Delight Plan",
            "description": "Perfect for children aged 6-18 months",
            "price": "999",
            "priceCurrency": "INR",
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            "availability": "https://schema.org/InStock"
          },
          {
            "@type": "Offer",
            "name": "Silver Pack",
            "description": "Ideal for children aged 18-36 months",
            "price": "1499",
            "priceCurrency": "INR",
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            "availability": "https://schema.org/InStock"
          },
          {
            "@type": "Offer",
            "name": "Gold Pack PRO",
            "description": "Best for children aged 3-5 years",
            "price": "1999",
            "priceCurrency": "INR",
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            "availability": "https://schema.org/InStock"
          }
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Toyflix Subscription Plans",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Monthly Toy Delivery",
                "description": "Fresh educational toys delivered every month"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Free Sanitization",
                "description": "All toys are thoroughly cleaned and sanitized"
              }
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Free Shipping",
                "description": "Complimentary delivery across India"
              }
            }
          ]
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "1250",
          "bestRating": "5",
          "worstRating": "1"
        },
        "additionalProperty": [
          {
            "@type": "PropertyValue",
            "name": "Age Range",
            "value": "6 months - 12 years"
          },
          {
            "@type": "PropertyValue",
            "name": "Delivery Time",
            "value": "2-3 business days"
          },
          {
            "@type": "PropertyValue",
            "name": "Return Policy",
            "value": "Easy returns with prepaid labels"
          }
        ]
      })}
    </script>
  </Helmet>
);