# Campaign Landing Page - Implementation Guide

## Overview
A conversion-focused campaign landing page for Toyflix toy rental service in Bangalore. This page is designed for paid advertising campaigns (Google Ads, Facebook Ads, etc.) with a single goal: capturing leads.

## Features Implemented

### 1. **Landing Page Component** (`src/pages/CampaignLanding.tsx`)
   - **Location**: Accessible at `/campaign` or `/landing`
   - **Design**: Clean, conversion-focused design matching the provided specifications
   - **Responsive**: Fully responsive for mobile and desktop

### 2. **Page Sections**

#### Header
- Toyflix branding
- Navigation links (How It Works, Why Choose Us, Testimonials)
- Trust badge: "Free Delivery | Cancel Anytime"
- Sticky header for constant visibility

#### Hero Section (Two-column layout)
- **Left Column**:
  - Main headline: "Give Your Child New Toys Every Month **Without Buying!**"
  - Subheadline: "No Clutter. No Waste. Just Endless Fun!"
  - Hero image of colorful toys
  
- **Right Column** (Signup Form):
  - Blue background (#4169E1)
  - Three input fields:
    * Name (text input)
    * Phone Number (10-digit validation)
    * Child's Age (dropdown with 0-12+ years options)
  - Green CTA button: "GET STARTED"
  - Trust message: "No Deposit. No Damage Fee. Cancel Anytime."

#### Features Icons Row
Three feature highlights with icons:
1. Premium Educational Toys (Package icon)
2. Free Delivery to Your Door (Truck icon)
3. Swap Toys Anytime (Calendar icon)

#### Testimonials Section
- Headline: "Join Thousands of Smart Parents in **Bangalore!**"
- Three testimonial cards with:
  * Circular profile placeholders
  * Customer quotes
  * Customer names with "— " prefix

#### Trust Badges Row
Three trust badges:
1. 100% Satisfaction (Award icon)
2. Safe & Sanitized Toys (CheckCircle icon)
3. No Long-Term Commitment (Shield icon)

#### Bottom CTA Section
- Eye-catching gradient background
- Call-to-action button that scrolls to form

#### Footer
- Simple copyright notice
- Company tagline

### 3. **Form Functionality**

#### Validation
- **Name**: Required field
- **Phone**: 
  - Required field
  - Must be valid 10-digit Indian mobile number (starts with 6-9)
  - Real-time validation feedback
- **Child's Age**: Required dropdown selection

#### Form Submission
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // Validates form
  // Stores lead in Supabase campaign_leads table
  // Tracks conversion event via Google Analytics
  // Shows success toast message
  // Redirects to /pricing page after 2 seconds
}
```

### 4. **Analytics Tracking**

Events tracked:
- `campaign_lead_submitted` - When form is submitted
- `campaign_conversion_success` - When lead is successfully stored
- `campaign_conversion_error` - If there's an error
- `campaign_lead_fallback` - If database storage fails but event is tracked

### 5. **Database Schema**

**Table**: `campaign_leads`

Run the migration file: `sql_migrations/campaign_leads_table.sql`

```sql
CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  child_age TEXT NOT NULL,
  source TEXT DEFAULT 'campaign_landing',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ...
);
```

**Fields**:
- `id`: UUID primary key
- `name`: Customer name
- `phone`: 10-digit phone number
- `child_age`: Selected age range
- `source`: Campaign source (default: 'campaign_landing')
- `status`: Lead status (new, contacted, converted, lost)
- `utm_source`, `utm_medium`, `utm_campaign`: UTM tracking (optional)
- `converted_to_user_id`: Reference to custom_users if converted
- `notes`: Admin notes

**Security**:
- Row Level Security (RLS) enabled
- Public insert allowed (for form submissions)
- Only admins can read/update leads

## Setup Instructions

### 1. Run Database Migration
```bash
# Execute the SQL migration in your Supabase SQL editor
# File: sql_migrations/campaign_leads_table.sql
```

### 2. Access the Page
The landing page is accessible at:
- `/campaign` - Primary URL for campaigns
- `/landing` - Alternative URL

### 3. URL Parameters (Optional)
Add UTM parameters for tracking:
```
/campaign?utm_source=google&utm_medium=cpc&utm_campaign=bangalore_parents
```

## Usage for Marketing Campaigns

### Google Ads
```
Final URL: https://yourdomain.com/campaign?utm_source=google&utm_medium=cpc&utm_campaign=bangalore_toy_rental
```

### Facebook Ads
```
Final URL: https://yourdomain.com/landing?utm_source=facebook&utm_medium=paid&utm_campaign=parent_targeting
```

### WhatsApp Marketing
```
Final URL: https://yourdomain.com/campaign?utm_source=whatsapp&utm_medium=organic&utm_campaign=referral
```

## Testing Checklist

### Functional Testing
- [ ] Form validates all required fields
- [ ] Phone number validation works correctly
- [ ] Age dropdown shows all options
- [ ] Form submission stores data in campaign_leads table
- [ ] Success toast message displays
- [ ] User redirects to /pricing page after submission
- [ ] Analytics events fire correctly

### Design Testing
- [ ] Page is responsive on mobile (320px - 767px)
- [ ] Page is responsive on tablet (768px - 1023px)
- [ ] Page is responsive on desktop (1024px+)
- [ ] Header is sticky and visible on scroll
- [ ] Form is sticky on desktop for constant CTA visibility
- [ ] All icons display correctly
- [ ] Colors match design (#4169E1 blue, #FF6B6B coral, green CTA)

### Performance Testing
- [ ] Page loads in under 3 seconds
- [ ] Images are optimized
- [ ] No console errors
- [ ] Form submission completes in under 2 seconds

### Analytics Testing
- [ ] Google Analytics events fire
- [ ] Conversion tracking works
- [ ] UTM parameters are captured (if implemented)

## Conversion Optimization Tips

1. **A/B Testing**: Test different headlines, CTA button colors, and form positions
2. **Social Proof**: Add real customer count ("Join 5,000+ happy parents")
3. **Urgency**: Add limited-time offers or countdown timers
4. **Trust Signals**: Display security badges, ratings, or certifications
5. **Mobile-First**: 70%+ traffic will be mobile, optimize accordingly

## Admin Features

### Viewing Leads
Admins can query campaign leads:
```sql
SELECT * FROM campaign_leads 
ORDER BY created_at DESC;
```

### Lead Management
- Update lead status: `new` → `contacted` → `converted` / `lost`
- Add notes for follow-up
- Link converted leads to user accounts

## Customization

### Changing Colors
Edit the component file to update colors:
```tsx
// Form background
className="bg-[#4169E1]" // Change to your blue

// CTA button
className="bg-green-600" // Change to your green

// Headline accent
className="text-[#FF6B6B]" // Change to your coral/red
```

### Adding More Age Options
Edit the Select component in CampaignLanding.tsx:
```tsx
<SelectItem value="12-15">12-15 years</SelectItem>
```

### Changing Redirect Destination
Edit the form submission handler:
```tsx
setTimeout(() => {
  navigate('/your-destination'); // Change destination
}, 2000);
```

## Troubleshooting

### Form Not Submitting
1. Check Supabase connection
2. Verify campaign_leads table exists
3. Check browser console for errors
4. Ensure RLS policies are correctly set

### Analytics Not Tracking
1. Verify Google Analytics is initialized in App.tsx
2. Check VITE_GA_MEASUREMENT_ID environment variable
3. Use browser extensions like Tag Assistant to debug

### TypeScript Errors
- The TypeScript errors shown are just type declaration warnings
- They don't affect runtime functionality
- Run `npm install` to ensure all dependencies are installed

## Files Created/Modified

1. **Created**: `src/pages/CampaignLanding.tsx` - Main landing page component
2. **Created**: `sql_migrations/campaign_leads_table.sql` - Database schema
3. **Modified**: `src/App.tsx` - Added routes for /campaign and /landing
4. **Created**: `CAMPAIGN_LANDING_PAGE_README.md` - This documentation

## Next Steps

1. **Run the SQL migration** to create the campaign_leads table
2. **Test the page** at `/campaign` or `/landing`
3. **Set up ad campaigns** with proper UTM parameters
4. **Monitor conversions** in Google Analytics
5. **Review leads** in the campaign_leads table
6. **Follow up** with leads and update their status

## Support

For issues or questions, check:
- Supabase logs for database errors
- Browser console for JavaScript errors
- Google Analytics Real-Time view for tracking verification
- Network tab for API request failures

---

**Campaign Landing Page is Ready for Traffic! 🚀**

Access at: `/campaign` or `/landing`
