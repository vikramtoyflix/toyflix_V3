import { Helmet } from 'react-helmet-async';

export const BangaloreLocalSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": "https://toyflix.in/bangalore",
        "name": "Toyflix Bangalore",
        "alternateName": "Toyflix Bengaluru",
        "description": "Leading toy rental service in Bangalore (Bengaluru). Premium educational toys delivered monthly across all neighborhoods. Free delivery, safe & sanitized toys for children aged 6 months to 12 years.",
        "url": "https://toyflix.in/bangalore",
        "logo": "https://toyflix.in/logo.png",
        "image": [
          "https://toyflix.in/toyflix-bangalore-hero.jpg",
          "https://toyflix.in/toyflix-bangalore-delivery.jpg",
          "https://toyflix.in/toyflix-bangalore-toys.jpg"
        ],
        "telephone": "+91-8000000000",
        "email": "bangalore@toyflix.in",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "IN",
          "addressRegion": "Karnataka",
          "addressLocality": "Bengaluru",
          "postalCode": "560001",
          "streetAddress": "Serving all areas of Bangalore"
        },
        "areaServed": [
          {
            "@type": "City",
            "name": "Bangalore",
            "alternateName": "Bengaluru",
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
          "addressLocality": "Bengaluru"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "12.9716",
          "longitude": "77.5946"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "09:00",
            "closes": "21:00",
            "timeZone": "Asia/Kolkata"
          }
        ],
        "priceRange": "₹999-₹2999",
        "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking"],
        "currenciesAccepted": "INR",
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
          "ratingExplanation": "Based on reviews from Bangalore customers"
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
          }
        ],
        "sameAs": [
          "https://facebook.com/toyflixbangalore",
          "https://instagram.com/toyflixbangalore",
          "https://twitter.com/toyflixbangalore",
          "https://maps.google.com/?q=Toyflix+Bangalore"
        ],
        "hasMap": "https://maps.google.com/maps?q=Toyflix+Bangalore",
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
          }
        ],
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
          "Safe Toys for Children Bangalore"
        ],
        "slogan": "Bangalore's #1 Educational Toy Rental Service",
        "foundingDate": "2024",
        "vatID": "29AABCT1234F1Z5"
      })}
    </script>

    {/* Additional Local SEO Schema */}
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://toyflix.in/bangalore",
        "url": "https://toyflix.in/bangalore",
        "name": "Toyflix Bangalore - Premium Toy Rental Service in Bengaluru",
        "description": "Leading toy rental service in Bangalore. Safe, sanitized educational toys delivered monthly across Bengaluru. Free delivery in Whitefield, Koramangala, HSR Layout & more.",
        "inLanguage": "en-IN",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "https://toyflix.in",
          "url": "https://toyflix.in",
          "name": "Toyflix India"
        },
        "about": {
          "@type": "LocalBusiness",
          "@id": "https://toyflix.in/bangalore",
          "name": "Toyflix Bangalore"
        },
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "https://toyflix.in/toyflix-bangalore-hero.jpg",
          "width": 1200,
          "height": 630
        },
        "datePublished": "2024-09-01",
        "dateModified": new Date().toISOString().split('T')[0]
      })}
    </script>
  </Helmet>
);