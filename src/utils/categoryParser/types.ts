
import { Database } from "@/integrations/supabase/types";

export type ToyCategory = Database['public']['Enums']['toy_category'];

export interface CategoryMapping {
  mapped: ToyCategory;
  confidence: 'high' | 'medium' | 'low';
  hierarchy: string[];
}

export interface CategoryParseResult {
  primaryCategory: ToyCategory;
  categories: Array<{
    original: string;
    mapped: ToyCategory;
    confidence: 'high' | 'medium' | 'low';
    hierarchy: string[];
  }>;
  categoryConfidence: 'high' | 'medium' | 'low';
  extractedAgeRange: string;
  warnings: string[];
}

export interface CategoryPreview {
  mapped: ToyCategory;
  confidence: 'high' | 'medium' | 'low';
  hierarchy: string[];
  warnings: string[];
}
