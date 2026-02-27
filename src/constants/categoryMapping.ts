/**
 * Category and Subscription Category Mapping for Toyflix
 * This ensures consistency between category and subscription_category fields
 */

export type ToyCategory = 
  | 'big_toys' 
  | 'stem_toys' 
  | 'educational_toys' 
  | 'books' 
  | 'developmental_toys' 
  | 'ride_on_toys';

export type SubscriptionCategory = ToyCategory;

/**
 * Auto-sync mapping: category → subscription_category
 * Currently identical, but allows for future business logic divergence
 */
export const CATEGORY_SUBSCRIPTION_MAPPING: Record<ToyCategory, SubscriptionCategory> = {
  'big_toys': 'big_toys',
  'stem_toys': 'stem_toys',
  'educational_toys': 'educational_toys',
  'books': 'books',
  'developmental_toys': 'developmental_toys',
  'ride_on_toys': 'ride_on_toys'
} as const;

/**
 * Get corresponding subscription category for a given category
 */
export function getSubscriptionCategoryForCategory(category: ToyCategory): SubscriptionCategory {
  return CATEGORY_SUBSCRIPTION_MAPPING[category] || 'educational_toys';
}

/**
 * Category display labels for UI
 */
export const CATEGORY_LABELS: Record<ToyCategory, string> = {
  'big_toys': 'Big Toys',
  'stem_toys': 'STEM Toys', 
  'educational_toys': 'Educational Toys',
  'books': 'Books',
  'developmental_toys': 'Developmental Toys',
  'ride_on_toys': 'Ride-On Toys'
};

/**
 * All valid category values
 */
export const ALL_CATEGORIES: ToyCategory[] = Object.keys(CATEGORY_SUBSCRIPTION_MAPPING) as ToyCategory[];

/**
 * Default category fallback
 */
export const DEFAULT_CATEGORY: ToyCategory = 'educational_toys';

/**
 * Validate if a category value is valid
 */
export function isValidCategory(value: string): value is ToyCategory {
  return ALL_CATEGORIES.includes(value as ToyCategory);
}

/**
 * Format category for display (convert underscores to spaces and capitalize)
 */
export function formatCategoryForDisplay(category: string): string {
  return CATEGORY_LABELS[category as ToyCategory] || 
         category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
} 