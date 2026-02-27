import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

interface BangaloreGeoTargetProps {
  children: React.ReactNode;
}

export const BangaloreGeoTarget = ({ children }: BangaloreGeoTargetProps) => {
  const [isBangaloreUser, setIsBangaloreUser] = useState(false);
  const [userLocation, setUserLocation] = useState<string>('');

  useEffect(() => {
    // Check if user is in Bangalore based on IP geolocation
    const checkLocation = async () => {
      try {
        // Get user's IP-based location
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        // Check if user is in Bangalore or Karnataka
        const isInBangalore = data.city?.toLowerCase().includes('bangalore') ||
                             data.city?.toLowerCase().includes('bengaluru') ||
                             data.region_code === 'KA';

        setIsBangaloreUser(isInBangalore);
        setUserLocation(data.city || '');
      } catch (error) {
        console.log('Geo-targeting check failed:', error);
        // Default to showing Bangalore content for testing
        setIsBangaloreUser(true);
      }
    };

    checkLocation();
  }, []);

  return (
    <>
      {/* Dynamic Geo-Targeting Meta Tags */}
      <Helmet>
        {isBangaloreUser && (
          <>
            {/* Location-specific meta tags for Bangalore users */}
            <meta name="geo.region" content="IN-KA" />
            <meta name="geo.placename" content="Bangalore" />
            <meta name="geo.position" content="12.9716;77.5946" />
            <meta name="ICBM" content="12.9716, 77.5946" />

            {/* Enhanced local keywords for Bangalore users */}
            <meta name="keywords" content="toy rental Bangalore, toy rental Bengaluru, educational toys Bangalore, monthly toy subscription Bangalore, kids toys Whitefield, toy rental Koramangala, educational toys HSR Layout, toy rental Electronic City, kids toys JP Nagar, toy rental Indiranagar, toy rental Marathahalli, educational toys BTM Layout, kids toys Jayanagar, toy rental Rajajinagar, educational toys Malleshwaram" />

            {/* Local business information */}
            <meta name="DC.title" content="Toyflix Bangalore - Premium Toy Rental Service" />
            <meta name="DC.creator" content="Toyflix India" />
            <meta name="DC.subject" content="Toy Rental Service Bangalore" />
            <meta name="DC.description" content="Leading educational toy rental service in Bangalore. Safe, sanitized toys delivered monthly across all neighborhoods." />
          </>
        )}

        {/* Structured data for local SEO */}
        {isBangaloreUser && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "Toyflix Bangalore - Premium Toy Rental Service",
              "description": "Leading educational toy rental service in Bangalore. Safe, sanitized toys delivered monthly across all neighborhoods.",
              "url": "https://toyflix.in",
              "inLanguage": "en-IN",
              "about": {
                "@type": "LocalBusiness",
                "name": "Toyflix Bangalore",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Bangalore",
                  "addressRegion": "Karnataka",
                  "addressCountry": "IN"
                },
                "areaServed": "Bangalore"
              },
              "spatialCoverage": {
                "@type": "Place",
                "name": "Bangalore",
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": "12.9716",
                  "longitude": "77.5946"
                }
              }
            })}
          </script>
        )}
      </Helmet>

      {/* Render children with location context */}
      {children}
    </>
  );
};

// Hook to get Bangalore-specific content
export const useBangaloreContent = () => {
  const [isBangaloreUser, setIsBangaloreUser] = useState(false);

  useEffect(() => {
    const checkLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        const isInBangalore = data.city?.toLowerCase().includes('bangalore') ||
                             data.city?.toLowerCase().includes('bengaluru') ||
                             data.region_code === 'KA';

        setIsBangaloreUser(isInBangalore);
      } catch (error) {
        // Default to Bangalore content for testing
        setIsBangaloreUser(true);
      }
    };

    checkLocation();
  }, []);

  return {
    isBangaloreUser,
    localContent: isBangaloreUser ? {
      title: "Toyflix Bangalore - Premium Toy Rental Service",
      subtitle: "Bangalore's #1 Educational Toy Rental Service",
      ctaText: "Start Toy Rental in Bangalore",
      areas: ["Whitefield", "Koramangala", "HSR Layout", "Electronic City", "Indiranagar"],
      phone: "+91-8000000000",
      email: "bangalore@toyflix.in"
    } : {
      title: "Toyflix India - Premium Toy Rental Service",
      subtitle: "India's Leading Educational Toy Rental Service",
      ctaText: "Start Toy Rental",
      areas: ["Delhi", "Mumbai", "Bangalore", "Chennai", "Pune"],
      phone: "+91-8000000000",
      email: "support@toyflix.in"
    }
  };
};