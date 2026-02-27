import { Toy } from "@/hooks/useToys";

/**
 * Category ordering as per requirements:
 * 1. Big toys first
 * 2. Educational/STEM toys 
 * 3. Developmental toys
 * 4. Books last
 */
export const CATEGORY_ORDER: Record<string, number> = {
  'big_toys': 1,
  'stem_toys': 2,
  'developmental_toys': 3,
  'books': 4,
  // Fallback for any other categories
  'ride_on_toys': 999, // These are handled separately
};

/**
 * Sort toys by category according to business requirements
 */
export const sortToysByCategory = (toys: Toy[]): Toy[] => {
  return [...toys].sort((a, b) => {
    const orderA = CATEGORY_ORDER[a?.category ?? ''] ?? 998;
    const orderB = CATEGORY_ORDER[b?.category ?? ''] ?? 998;
    if (orderA !== orderB) return orderA - orderB;
    if (Boolean(a?.is_featured) !== Boolean(b?.is_featured)) return b?.is_featured ? 1 : -1;
    const qA = Number(a?.available_quantity) || 0;
    const qB = Number(b?.available_quantity) || 0;
    if (qA !== qB) return qB - qA;
    const doA = Number(a?.display_order) ?? 0;
    const doB = Number(b?.display_order) ?? 0;
    if (doA !== doB) return doA - doB;
    const nameA = typeof a?.name === 'string' ? a.name : '';
    const nameB = typeof b?.name === 'string' ? b.name : '';
    return nameA.localeCompare(nameB);
  });
};

/**
 * Get toys grouped by category with proper ordering
 */
export const groupToysByCategory = (toys: Toy[]): Record<string, Toy[]> => {
  const sorted = sortToysByCategory(toys);
  const grouped: Record<string, Toy[]> = {};
  
  sorted.forEach(toy => {
    if (!grouped[toy.category]) {
      grouped[toy.category] = [];
    }
    grouped[toy.category].push(toy);
  });
  
  return grouped;
};

// Removed getCategoryDisplayName function - use CATEGORY_LABELS from @/constants/categoryMapping instead

/**
 * Debug function to log toy distribution by category
 */
export const logToyDistribution = (toys: Toy[], context: string = ''): void => {
  try {
    if (!Array.isArray(toys) || toys.length === 0) return;
    const distribution = toys.reduce((acc, toy) => {
      const cat = toy?.category ?? 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`🎯 ${context} Toy Distribution:`, { total: toys.length, byCategory: distribution });
  } catch {
    // no-op: never throw from logging
  }
}; 