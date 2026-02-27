
import { CSVRow, EnhancedMappedToyData, ImportOptions } from './types';
import { parseHierarchicalCategories } from '../categoryParser';
import { cleanImageUrls } from './imageUtils';

// Enhanced pack extraction
const extractPack = (categories: string, name: string): string | null => {
  const searchText = `${categories} ${name}`.toLowerCase();
  
  if (searchText.includes('big toy') || searchText.includes('large')) return 'big';
  if (searchText.includes('premium') || searchText.includes('deluxe')) return 'premium';
  if (searchText.includes('mini') || searchText.includes('small')) return 'mini';
  return 'standard';
};

// Clean HTML and decode entities
const cleanDescription = (desc: string): string => {
  if (!desc) return '';
  return desc
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

// Parse age range for min/max
const parseAgeRange = (ageRange: string): { min_age: number | null; max_age: number | null } => {
  const match = ageRange.match(/(\d+)-(\d+)/);
  if (match) {
    return {
      min_age: parseInt(match[1]),
      max_age: parseInt(match[2])
    };
  }
  
  const singleMatch = ageRange.match(/(\d+)/);
  if (singleMatch) {
    const age = parseInt(singleMatch[1]);
    return {
      min_age: age,
      max_age: age + 1
    };
  }
  
  return { min_age: null, max_age: null };
};

export const parseEnhancedCSVRow = (row: CSVRow, options: ImportOptions): EnhancedMappedToyData => {
  // Use hierarchical category parsing
  const categoryResult = parseHierarchicalCategories(
    row.Categories || '', 
    options.categoryMappingMode || 'fuzzy'
  );
  
  // Handle strict mode where category might be null due to low confidence
  if (options.categoryMappingMode === 'strict' && categoryResult.categoryConfidence !== 'high') {
    throw new Error(`No high confidence category mapping found for "${row.Categories}" in strict mode`);
  }
  
  // Prioritize age range from hierarchical parsing, then meta field, then fallback
  let finalAgeRange = categoryResult.extractedAgeRange;
  if (finalAgeRange === "All ages" && row['Meta: _wc_facebook_enhanced_catalog_attributes_age_range']) {
    finalAgeRange = row['Meta: _wc_facebook_enhanced_catalog_attributes_age_range'].trim();
  }

  const { min_age, max_age } = parseAgeRange(finalAgeRange);
  const imageUrls = cleanImageUrls(row.Images || '');

  return {
    name: row.Name?.trim() || 'Unnamed Toy',
    description: cleanDescription(row.Description || row['Short description'] || ''),
    category: categoryResult.primaryCategory,
    category_confidence: categoryResult.categoryConfidence,
    category_hierarchy: categoryResult.categories.map(c => c.hierarchy.join(' > ')),
    original_categories: row.Categories,
    age_range: finalAgeRange,
    brand: row.Brands?.trim() || null,
    pack: extractPack(row.Categories || '', row.Name || ''),
    retail_price: row['Regular price'] ? parseFloat(row['Regular price']) : null,
    rental_price: row['Sale price'] ? parseFloat(row['Sale price']) : null,
    image_url: imageUrls[0] || null,
    all_images: imageUrls,
    total_quantity: row.Stock ? parseInt(row.Stock) : 1,
    available_quantity: row['In stock?'] === '1' ? (row.Stock ? parseInt(row.Stock) : 1) : 0,
    rating: 4.0,
    min_age,
    max_age,
    sku: row.SKU?.trim() || row.ID?.trim() || null,
  };
};
