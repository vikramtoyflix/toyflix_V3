import { Helmet } from 'react-helmet-async';

export const FAQSchema = () => (
  <Helmet>
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Toyflix toy rental work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Toyflix delivers a curated selection of premium educational toys to your doorstep every month. You keep the toys for the rental period, then return them to get new toys. It's a subscription service that provides fresh educational content for your child every month."
            }
          },
          {
            "@type": "Question",
            "name": "Are the toys safe and sanitized?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, all Toyflix toys undergo thorough sanitization and safety checks before delivery. We follow strict hygiene protocols and only rent toys that meet international safety standards. Each toy is cleaned, disinfected, and inspected before being sent to the next family."
            }
          },
          {
            "@type": "Question",
            "name": "What age groups do you cater to?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Toyflix offers toys for children aged 6 months to 12 years. We have different subscription plans with age-appropriate toys including educational toys, building blocks, ride-on toys, and creative play items suitable for each developmental stage."
            }
          },
          {
            "@type": "Question",
            "name": "How much does Toyflix cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Toyflix subscription plans start from ₹999 per month. We offer different plans based on the number of toys and age groups. All plans include free delivery across India, toy sanitization, and insurance coverage for the toys during rental."
            }
          },
          {
            "@type": "Question",
            "name": "How do I return the toys?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "When your rental period ends, you'll receive a prepaid return label. Simply pack the toys in the provided box and drop them at the nearest courier pickup point. Our logistics partner will collect the toys and deliver your next set of toys."
            }
          },
          {
            "@type": "Question",
            "name": "Can I choose specific toys for my child?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! Toyflix offers both curated selections and customization options. You can specify your child's interests, developmental needs, and preferred toy types. Our educational specialists help create personalized toy collections for optimal learning and fun."
            }
          }
        ]
      })}
    </script>
  </Helmet>
);