
import { Database } from "@/integrations/supabase/types";

export type ToyCategory = Database['public']['Enums']['toy_category'];
export type SubscriptionCategory = Database['public']['Enums']['subscription_category'];

export interface ToyImage {
  id: string;
  toy_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToyFormData {
  name: string;
  description: string;
  category: ToyCategory[];
  subscription_category: SubscriptionCategory;
  age_range: string[];
  brand: string;
  pack: string[];
  retail_price: string;
  rental_price: string;
  image_url: string;
  images: string[];
  total_quantity: string;
  available_quantity: string;
  rating: string;
  show_strikethrough_pricing: boolean;
  display_order: string;
  is_featured: boolean;
}

export const subscriptionPacks = [
  'Discovery Delight',
  'Silver Pack',
  'Gold Pack'
];

export const ageRangeOptions = [
  '6m-2 years',
  '2-3 years',
  '3-4 years',
  '4-6 years',
  '6-8 years',
  '8-10 years',
  '10+ years'
];

// Updated to reflect that both category and subscription_category now have the same values
export const subscriptionCategoryOptions = [
  { value: 'big_toys', label: 'Big Toys' },
  { value: 'educational_toys', label: 'Educational' },
  { value: 'developmental_toys', label: 'Developmental' },
  { value: 'books', label: 'Books' },
  { value: 'stem_toys', label: 'STEM Toys (legacy)' },
  { value: 'ride_on_toys', label: 'Ride On Toys' }
];

// Now that toy_category and subscription_category are identical, we can export the same options for both
export const toyCategoryOptions = subscriptionCategoryOptions;
