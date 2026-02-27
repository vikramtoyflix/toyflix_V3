
import { Database } from './types.ts';

type ToyCategory = Database['public']['Enums']['toy_category'];

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

// Enhanced category mapping with hierarchical structure
const categoryMappings: Record<string, CategoryMapping> = {
  // High confidence mappings
  'big toys': { mapped: 'big_toys', confidence: 'high', hierarchy: ['Physical Play', 'Large Items'] },
  'developmental toys': { mapped: 'developmental_toys', confidence: 'high', hierarchy: ['Learning', 'Development'] },
  'developmental toy': { mapped: 'developmental_toys', confidence: 'high', hierarchy: ['Learning', 'Development'] },
  'educational toys': { mapped: 'educational_toys', confidence: 'high', hierarchy: ['Learning', 'Educational'] },
  'educational toy': { mapped: 'educational_toys', confidence: 'high', hierarchy: ['Learning', 'Educational'] },
  'stem toys': { mapped: 'stem_toys', confidence: 'high', hierarchy: ['Learning', 'STEM'] },
  'stem toy': { mapped: 'stem_toys', confidence: 'high', hierarchy: ['Learning', 'STEM'] },
  'ride on toys': { mapped: 'ride_on_toys', confidence: 'high', hierarchy: ['Physical Play', 'Ride-On'] },
  'ride-on toys': { mapped: 'ride_on_toys', confidence: 'high', hierarchy: ['Physical Play', 'Ride-On'] },
  'books': { mapped: 'books', confidence: 'high', hierarchy: ['Learning', 'Literature'] },
  
  // Medium confidence mappings
  'building': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'construction': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'blocks': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  'lego': { mapped: 'developmental_toys', confidence: 'medium', hierarchy: ['Learning', 'Construction'] },
  
  'outdoor': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Outdoor'] },
  'outdoor toys': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Outdoor'] },
  'ride on': { mapped: 'ride_on_toys', confidence: 'medium', hierarchy: ['Physical Play', 'Ride-On'] },
  
  'stem': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'science': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'engineering': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  'robotics': { mapped: 'stem_toys', confidence: 'medium', hierarchy: ['Learning', 'STEM'] },
  
  'creative': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'art': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'craft': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  'musical': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Creative'] },
  
  'puzzles': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Puzzles'] },
  'puzzle': { mapped: 'educational_toys', confidence: 'medium', hierarchy: ['Learning', 'Puzzles'] },
  
  'electronics': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'Technology'] },
  'electronic': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'Technology'] },
  
  // Low confidence fallbacks
  'learning': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'General'] },
  'educational': { mapped: 'educational_toys', confidence: 'low', hierarchy: ['Learning', 'General'] },
  'development': { mapped: 'developmental_toys', confidence: 'low', hierarchy: ['Learning', 'Development'] },
};

// Age range extraction patterns
const agePatterns = [
  { pattern: /(\d+)-(\d+)\s*(?:years?|yrs?|months?)/i, format: (m: RegExpMatchArray) => `${m[1]}-${m[2]} years` },
  { pattern: /(\d+)\+?\s*(?:years?|yrs?)/i, format: (m: RegExpMatchArray) => `${m[1]}+ years` },
  { pattern: /(\d+)\s*(?:months?|mo)/i, format: (m: RegExpMatchArray) => `${Math.ceil(parseInt(m[1]) / 12)} years` },
  { pattern: /toddler/i, format: () => '1-3 years' },
  { pattern: /baby|infant/i, format: () => '0-2 years' },
  { pattern: /preschool/i, format: () => '3-5 years' },
  { pattern: /school age/i, format: () => '6-12 years' },
];

function extractAgeRange(text: string): string {
  for (const { pattern, format } of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      return format(match);
    }
  }
  return "All ages";
}

function findBestCategoryMatch(categories: string[], mode: 'strict' | 'fuzzy' | 'manual' = 'fuzzy'): CategoryMapping | null {
  const categoryText = categories.join(' ').toLowerCase();
  
  // Try exact matches first
  for (const [key, mapping] of Object.entries(categoryMappings)) {
    if (categoryText.includes(key.toLowerCase())) {
      if (mode === 'strict' && mapping.confidence !== 'high') {
        continue; // Skip non-high confidence matches in strict mode
      }
      return mapping;
    }
  }
  
  // In strict mode, reject if no high confidence match found
  if (mode === 'strict') {
    return null;
  }
  
  // Try partial matches for fuzzy mode
  const words = categoryText.split(/\s+/);
  for (const word of words) {
    for (const [key, mapping] of Object.entries(categoryMappings)) {
      if (key.toLowerCase().includes(word) || word.includes(key.toLowerCase())) {
        return mapping;
      }
    }
  }
  
  return null;
}

export function parseHierarchicalCategories(
  categoriesText: string, 
  mode: 'strict' | 'fuzzy' | 'manual' = 'fuzzy'
): CategoryParseResult {
  const warnings: string[] = [];
  
  if (!categoriesText || categoriesText.trim() === '') {
    warnings.push('No categories provided');
    return {
      primaryCategory: 'educational_toys',
      categories: [],
      categoryConfidence: 'low',
      extractedAgeRange: 'All ages',
      warnings
    };
  }
  
  // Split categories by common separators
  const categories = categoriesText.split(/[,;|>\/]/).map(c => c.trim()).filter(Boolean);
  
  // Extract age range from the category text
  const extractedAgeRange = extractAgeRange(categoriesText);
  
  // Find the best category match
  const bestMatch = findBestCategoryMatch(categories, mode);
  
  if (!bestMatch) {
    if (mode === 'strict') {
      warnings.push(`No high confidence category mapping found for "${categoriesText}"`);
      return {
        primaryCategory: 'educational_toys', // This will cause an error in strict mode processing
        categories: [],
        categoryConfidence: 'low',
        extractedAgeRange,
        warnings
      };
    } else {
      warnings.push(`Using fallback category for "${categoriesText}"`);
      return {
        primaryCategory: 'educational_toys',
        categories: [{
          original: categoriesText,
          mapped: 'educational_toys',
          confidence: 'low',
          hierarchy: ['Learning', 'General']
        }],
        categoryConfidence: 'low',
        extractedAgeRange,
        warnings
      };
    }
  }
  
  return {
    primaryCategory: bestMatch.mapped,
    categories: [{
      original: categoriesText,
      mapped: bestMatch.mapped,
      confidence: bestMatch.confidence,
      hierarchy: bestMatch.hierarchy
    }],
    categoryConfidence: bestMatch.confidence,
    extractedAgeRange,
    warnings
  };
}
