import { Toy } from '@/hooks/useToys';

interface StructuredDataProps {
  toy?: Toy;
  type: 'product' | 'organization' | 'website' | 'breadcrumb';
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export const StructuredData = ({ toy, type, breadcrumbs }: StructuredDataProps) => {
  let schemaData: any = {};

  switch (type) {
    case 'product':
      if (toy) {
        schemaData = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": toy.name,
          "description": toy.description,
          "image": toy.image_url,
          "brand": {
            "@type": "Brand",
            "name": toy.brand || "Toyflix"
          },
          "offers": {
            "@type": "Offer",
            "price": toy.rental_price,
            "priceCurrency": "INR",
            "availability": toy.available_quantity > 0 
              ? "https://schema.org/InStock" 
              : "https://schema.org/OutOfStock",
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            "seller": {
              "@type": "Organization",
              "name": "Toyflix India"
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": toy.rating || 4.5,
            "reviewCount": 150
          },
          "category": toy.category,
          "sku": toy.id
        };
      }
      break;

    case 'organization':
      schemaData = {
        "@context": "https://schema.org/",
        "@type": "Organization",
        "name": "Toyflix India",
        "url": "https://toyflix.in",
        "logo": "https://toyflix.in/logo.png",
        "description": "Premium toy rental subscription service in India",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-8000000000",
          "contactType": "Customer Service"
        },
        "sameAs": [
          "https://facebook.com/toyflix",
          "https://instagram.com/toyflix",
          "https://twitter.com/toyflix"
        ]
      };
      break;

    case 'website':
      schemaData = {
        "@context": "https://schema.org/",
        "@type": "WebSite",
        "name": "Toyflix India",
        "url": "https://toyflix.in",
        "description": "Premium toy rental subscription service in India",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://toyflix.in/toys?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      };
      break;

    case 'breadcrumb':
      if (breadcrumbs) {
        schemaData = {
          "@context": "https://schema.org/",
          "@type": "BreadcrumbList",
          "itemListElement": breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
          }))
        };
      }
      break;
  }

  if (!schemaData["@context"]) {
    return null;
  }

  return (
    <script 
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}; 