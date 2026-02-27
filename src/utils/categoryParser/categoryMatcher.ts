
import { CategoryMapping } from './types';
import { categoryMappings } from './mappings';

export function findBestCategoryMatch(categories: string[], mode: 'strict' | 'fuzzy' | 'manual' = 'fuzzy'): CategoryMapping | null {
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
