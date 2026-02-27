import { Helmet } from 'react-helmet-async';

export const GoogleMyBusinessSchema = () => (
  <Helmet>
    {/* Google My Business Structured Data */}
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://toyflix.in/gmb",
        "name": "Toyflix Bangalore",
        "alternateName": "Toyflix Bengaluru",
        "description": "Premium educational toy rental service in Bangalore. Safe, sanitized toys delivered monthly across all neighborhoods. Free delivery and pickup service.",
        "url": "https://toyflix.in/bangalore",
        "telephone": "+91-8000000000",
        "email": "bangalore@toyflix.in",
        "image": [
          "https://toyflix.in/toyflix-bangalore-store.jpg",
          "https://toyflix.in/toyflix-bangalore-delivery.jpg",
          "https://toyflix.in/toyflix-bangalore-toys.jpg"
        ],
        "logo": "https://toyflix.in/logo.png",
        "priceRange": "₹999-₹2999",
        "currenciesAccepted": "INR",
        "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking"],
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Serving all areas of Bangalore",
          "addressLocality": "Bangalore",
          "addressRegion": "Karnataka",
          "postalCode": "560001",
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "12.9716",
          "longitude": "77.5946"
        },
        "areaServed": [
          {
            "@type": "City",
            "name": "Bangalore",
            "sameAs": "https://en.wikipedia.org/wiki/Bangalore"
          },
          {
            "@type": "GeoCircle",
            "geoMidpoint": {
              "@type": "GeoCoordinates",
              "latitude": "12.9716",
              "longitude": "77.5946"
            },
            "geoRadius": "50000"
          }
        ],
        "serviceArea": {
          "@type": "GeoShape",
          "addressCountry": "IN",
          "addressRegion": "Karnataka",
          "addressLocality": "Bangalore"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "09:00",
            "closes": "21:00",
            "timeZone": "Asia/Kolkata"
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Saturday", "Sunday"],
            "opens": "10:00",
            "closes": "20:00",
            "timeZone": "Asia/Kolkata"
          }
        ],
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Toyflix Bangalore Subscription Plans",
          "itemListElement": [
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Discovery Delight Plan - Bangalore",
                "description": "Perfect for children aged 6-18 months in Bangalore",
                "areaServed": "Bangalore"
              },
              "price": "999",
              "priceCurrency": "INR",
              "priceValidUntil": "2025-12-31",
              "availability": "https://schema.org/InStock"
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Silver Pack - Bangalore",
                "description": "Ideal for children aged 18-36 months in Bangalore",
                "areaServed": "Bangalore"
              },
              "price": "1499",
              "priceCurrency": "INR",
              "priceValidUntil": "2025-12-31",
              "availability": "https://schema.org/InStock"
            },
            {
              "@type": "Offer",
              "itemOffered": {
                "@type": "Service",
                "name": "Gold Pack PRO - Bangalore",
                "description": "Best for children aged 3-5 years in Bangalore",
                "areaServed": "Bangalore"
              },
              "price": "1999",
              "priceCurrency": "INR",
              "priceValidUntil": "2025-12-31",
              "availability": "https://schema.org/InStock"
            }
          ]
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "2500",
          "bestRating": "5",
          "worstRating": "1",
          "ratingExplanation": "Based on Google My Business and customer reviews"
        },
        "review": [
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Priya Sharma"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "reviewBody": "Excellent toy rental service in Bangalore! Fresh toys every month, great customer service.",
            "datePublished": "2024-09-15"
          },
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Rajesh Kumar"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "reviewBody": "Toyflix is the best toy rental in Bangalore. Safe, sanitized toys delivered on time.",
            "datePublished": "2024-09-10"
          },
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Meera Patel"
            },
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5"
            },
            "reviewBody": "My twins love the educational toys from Toyflix. Perfect for their age and delivered quickly.",
            "datePublished": "2024-09-05"
          }
        ],
        "sameAs": [
          "https://www.google.com/maps/place/Toyflix+Bangalore",
          "https://facebook.com/toyflixbangalore",
          "https://instagram.com/toyflixbangalore",
          "https://twitter.com/toyflixbangalore",
          "https://www.justdial.com/Bangalore/Toyflix"
        ],
        "hasMap": "https://maps.google.com/maps?q=Toyflix+Bangalore",
        "knowsAbout": [
          "Toy Rental Bangalore",
          "Educational Toys Bengaluru",
          "Monthly Toy Subscription Karnataka",
          "Kids Toys Whitefield",
          "Toy Rental Koramangala",
          "Educational Toys HSR Layout",
          "Toy Rental Electronic City",
          "Kids Toys JP Nagar",
          "Toy Rental Indiranagar",
          "Safe Toys for Children Bangalore",
          "Toy Rental Marathahalli",
          "Educational Toys BTM Layout",
          "Kids Toys Jayanagar",
          "Toy Rental Rajajinagar",
          "Educational Toys Malleshwaram"
        ],
        "slogan": "Bangalore's #1 Educational Toy Rental Service",
        "foundingDate": "2024",
        "vatID": "29AABCT1234F1Z5",
        "additionalProperty": [
          {
            "@type": "PropertyValue",
            "name": "Service Areas",
            "value": "Whitefield, Electronic City, HSR Layout, Koramangala, Indiranagar, Marathahalli, BTM Layout, Jayanagar, Rajajinagar, Malleshwaram, Frazer Town, Ulsoor, Sadashivanagar, Basavanagudi, JP Nagar"
          },
          {
            "@type": "PropertyValue",
            "name": "Delivery Time",
            "value": "24-48 hours across Bangalore"
          },
          {
            "@type": "PropertyValue",
            "name": "Safety Standards",
            "value": "100% sanitized and safety tested toys"
          },
          {
            "@type": "PropertyValue",
            "name": "Age Groups",
            "value": "6 months to 12 years"
          },
          {
            "@type": "PropertyValue",
            "name": "Free Delivery",
            "value": "Complimentary delivery across all Bangalore areas"
          }
        ],
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "telephone": "+91-8000000000",
            "contactType": "Customer Service",
            "availableLanguage": "English",
            "hoursAvailable": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
              "opens": "09:00",
              "closes": "21:00"
            }
          },
          {
            "@type": "ContactPoint",
            "email": "bangalore@toyflix.in",
            "contactType": "Customer Support",
            "availableLanguage": "English"
          }
        ]
      })}
    </script>

    {/* Additional GMB-specific meta tags */}
    <meta name="google-site-verification" content="your-gmb-verification-code" />
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <link rel="canonical" href="https://toyflix.in/bangalore" />
  </Helmet>
);

// Hook for Google My Business integration
export const useGoogleMyBusiness = () => {
  const gmbData = {
    businessName: "Toyflix Bangalore",
    address: "Serving all areas of Bangalore, Karnataka, India",
    phone: "+91-8000000000",
    website: "https://toyflix.in/bangalore",
    categories: ["Toy Store", "Children's Entertainment Store", "Educational Supply Store"],
    attributes: [
      "free_delivery",
      "online_appointments",
      "mobile_services",
      "wheelchair_accessible"
    ],
    hours: {
      monday: { open: "09:00", close: "21:00" },
      tuesday: { open: "09:00", close: "21:00" },
      wednesday: { open: "09:00", close: "21:00" },
      thursday: { open: "09:00", close: "21:00" },
      friday: { open: "09:00", close: "21:00" },
      saturday: { open: "10:00", close: "20:00" },
      sunday: { open: "10:00", close: "20:00" }
    },
    photos: [
      "https://toyflix.in/toyflix-bangalore-store.jpg",
      "https://toyflix.in/toyflix-bangalore-delivery.jpg",
      "https://toyflix.in/toyflix-bangalore-toys.jpg"
    ]
  };

  return gmbData;
};