import { Helmet } from 'react-helmet-async';
import { Toy } from '@/hooks/useToys';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  toy?: Toy;
  page?: 'home' | 'product' | 'toys' | 'pricing' | 'about';
}

export const SEOHead = ({ 
  title, 
  description, 
  image, 
  canonical, 
  toy, 
  page = 'home' 
}: SEOHeadProps) => {
  // Smart title generation based on context
  const pageTitle = title || generatePageTitle(toy, page);
  const pageDescription = description || generatePageDescription(toy, page);
  const pageImage = image || (toy?.image_url) || '/toyflix-social-image.jpg';
  const pageCanonical = canonical || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : '');

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={pageCanonical} />
      
      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={pageCanonical} />
      <meta property="og:type" content={toy ? 'product' : 'website'} />
      <meta property="og:site_name" content="Toyflix India" />
      <meta property="og:locale" content="en_IN" />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <link rel="canonical" href={pageCanonical} />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      
      {/* Product-specific meta */}
      {toy && (
        <>
          <meta property="product:price:amount" content={toy.rental_price?.toString()} />
          <meta property="product:price:currency" content="INR" />
          <meta property="product:availability" content={toy.available_quantity > 0 ? 'in stock' : 'out of stock'} />
        </>
      )}
    </Helmet>
  );
};

// Helper functions for title/description generation
const generatePageTitle = (toy?: Toy, page?: string): string => {
  if (toy) {
    return `${toy.name} - Rent Premium Toys | Toyflix India`;
  }
  
  switch (page) {
    case 'home':
      return 'Toyflix India - Premium Toy Rental Subscription Service';
    case 'toys':
      return 'Browse Premium Toys for Rent | Toyflix India';
    case 'pricing':
      return 'Subscription Plans & Pricing | Toyflix India';
    case 'about':
      return 'About Toyflix - Premium Toy Rental Service | India';
    default:
      return 'Toyflix India - Creating Precious Memories';
  }
};

const generatePageDescription = (toy?: Toy, page?: string): string => {
  if (toy) {
    return `Rent ${toy.name} for ₹${toy.rental_price}/month. Safe, sanitized, premium toys delivered to your door. Age: ${toy.age_range}. Free delivery across India.`;
  }
  
  switch (page) {
    case 'home':
      return 'Rent premium toys for kids with Toyflix. Monthly subscription boxes with educational and fun toys delivered to your home. Safe, sanitized, and age-appropriate.';
    case 'toys':
      return 'Browse our collection of 1000+ premium toys for rent. Educational toys, building blocks, ride-on toys and more. Monthly subscriptions available.';
    case 'pricing':
      return 'Choose the perfect toy rental subscription plan for your child. Flexible monthly plans starting from ₹999. Free delivery across India.';
    case 'about':
      return 'Toyflix is India\'s leading toy rental service. Premium toys, monthly subscriptions, safe sanitization, and convenient home delivery.';
    default:
      return 'Premium toy rental subscription service in India. Safe, sanitized toys delivered to your door.';
  }
}; 