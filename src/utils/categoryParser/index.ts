
import { CategoryParseResult, CategoryPreview } from './types';
import { extractAgeRange } from './ageExtractor';
import { findBestCategoryMatch } from './categoryMatcher';

export * from './types';
export * from './mappings';
export * from './ageExtractor';
export * from './categoryMatcher';

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

export function generateCategoryMappingPreview(
  categoriesText: string,
  mode: 'strict' | 'fuzzy' | 'manual' = 'fuzzy'
): CategoryPreview {
  const result = parseHierarchicalCategories(categoriesText, mode);
  
  return {
    mapped: result.primaryCategory,
    confidence: result.categoryConfidence,
    hierarchy: result.categories[0]?.hierarchy || ['Learning', 'General'],
    warnings: result.warnings
  };
}
