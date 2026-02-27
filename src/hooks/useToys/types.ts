
import { Database } from '@/integrations/supabase/types';

export interface Toy {
  id: string;
  name: string;
  description: string | null;
  category: string;
  age_range: string;
  brand: string | null;
  pack: string | null;
  retail_price: number | null;
  rental_price: number | null;
  image_url: string | null;
  available_quantity: number;
  total_quantity: number;
  rating: number;
  min_age: number | null;
  max_age: number | null;
  show_strikethrough_pricing: boolean;
  display_order: number;
  is_featured: boolean;
}

export type ToyCategory = Database['public']['Enums']['toy_category'];
