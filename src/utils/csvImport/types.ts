
export interface CSVRow {
  ID: string;
  Name: string;
  Description: string;
  'Short description': string;
  'Regular price': string;
  'Sale price': string;
  Categories: string;
  Tags: string;
  Images: string;
  'In stock?': string;
  Stock: string;
  Brands: string;
  SKU: string;
  'Meta: _wc_facebook_enhanced_catalog_attributes_age_range': string;
  'Meta: _wc_facebook_enhanced_catalog_attributes_minimum_weight': string;
  'Meta: _wc_facebook_enhanced_catalog_attributes_maximum_weight': string;
}

export interface EnhancedMappedToyData {
  name: string;
  description: string;
  category: string;
  age_range: string;
  brand: string | null;
  pack: string | null;
  retail_price: number | null;
  rental_price: number | null;
  image_url: string | null;
  all_images?: string[];
  total_quantity: number;
  available_quantity: number;
  rating: number;
  min_age: number | null;
  max_age: number | null;
  sku?: string;
  category_confidence?: 'high' | 'medium' | 'low';
  category_hierarchy?: string[];
  original_categories?: string;
}

export interface ImportOptions {
  downloadImages: boolean;
  clearExistingData: boolean;
  skipDuplicates: boolean;
  categoryMappingMode: 'strict' | 'fuzzy' | 'manual';
}

export interface ImportResults {
  successful: number;
  failed: number;
  errors: string[];
  imported: EnhancedMappedToyData[];
  imageErrors: string[];
  duplicatesSkipped: number;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  categoryMappings: { [key: string]: { mapped: string; confidence: string; count: number; hierarchy?: string[] } };
  sampleToys: EnhancedMappedToyData[];
  warnings: string[];
  categoryParsingIssues: string[];
}
