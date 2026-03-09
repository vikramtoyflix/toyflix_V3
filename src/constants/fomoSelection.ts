/**
 * FOMO (Fear of Missing Out) feature for toy selection.
 * Surfaces high-inventory toys first on STEM, Educational, and Books steps
 * so inventory circulates and we don't have idle stock.
 * Not shown on Big Toys step.
 */

export type SubscriptionCategory = 'big_toys' | 'stem_toys' | 'educational_toys' | 'developmental_toys' | 'books';

/** Steps that show FOMO tags (not Big Toys). Step 2=Educational, Step 3=Developmental, Step 4=Books. */
export const FOMO_SELECTION_STEPS: SubscriptionCategory[] = [
  'educational_toys',
  'developmental_toys',
  'books',
];

export function isFOMOStep(category: string | undefined): category is SubscriptionCategory {
  return !!category && FOMO_SELECTION_STEPS.includes(category as SubscriptionCategory);
}

/** Number of toys to show in the first row of the FOMO section. */
export const FOMO_FIRST_ROW_COUNT = 4;
/** Number of toys to show in the second row (if any). */
export const FOMO_SECOND_ROW_COUNT = 4;

/** Section title + subline per step (unused when banner section removed; kept for any future use). */
export const FOMO_SECTION_COPY: Record<
  SubscriptionCategory,
  { title: string; subline: string; icon: string }
> = {
  big_toys: { title: '', subline: '', icon: '' },
  stem_toys: {
    title: "Parents' Favourite Learning Toys",
    subline: "Chosen by 500+ Toyflix parents this month",
    icon: "📚",
  },
  educational_toys: {
    title: "Parents' Favourite Learning Toys",
    subline: "Chosen by 500+ Toyflix parents this month",
    icon: "📚",
  },
  developmental_toys: {
    title: "Parents' Top Picks for Development",
    subline: "Helping kids build key skills across Bangalore",
    icon: "🏆",
  },
  books: {
    title: "Parents' Favourite Reads",
    subline: "Chosen by 500+ Toyflix parents this month",
    icon: "📚",
  },
};

/** Toy tag types for social proof (legacy - use getFOMOTagLabelForStep for step-specific labels). */
export type FOMOToyTag = 'high_demand' | 'parent_favourite' | 'bestseller';

export const FOMO_TOY_TAG_LABELS: Record<FOMOToyTag, string> = {
  high_demand: "🔥 High Demand",
  parent_favourite: "⭐ Parent Favourite",
  bestseller: "🏆 Toyflix Bestseller",
};

/** Step-specific FOMO tag labels. Rank 0–3 map to first 4 toys in banner. */
export const FOMO_TAG_LABELS_BY_STEP: Record<
  'stem_toys' | 'educational_toys' | 'books',
  [string, string, string, string]
> = {
  stem_toys: ['Toyflix Bestseller', 'Learning Favourite', 'Expert Pick', 'Top Learning Toy'],
  educational_toys: ['🏆 Toyflix Bestseller', '🔥 High Demand', '⭐ Kids Favourite', '🚀 Trending Toy'],
  books: ['Must-Read for Kids', 'Top Learning Book', 'Storytime Favourite', "Parents' Choice"],
};

/** Get emoji for FOMO tag by label. High Demand uses 🔥 (not brain). */
export function getFOMOEmojiForLabel(label: string | undefined | null): string {
  if (!label || typeof label !== 'string') return '⭐';
  const clean = label.replace(/^(⭐|🏆|🔥|🚀|📚)\s*/, '').toLowerCase();
  if (clean.includes('high demand')) return '🔥';
  if (clean.includes('learning favourite') || clean.includes('expert pick')) return '🧠';
  if (clean.includes('bestseller')) return '⭐';
  if (clean.includes('top learning toy') || clean.includes('top learning book')) return '🏆';
  if (clean.includes('trending')) return '🚀';
  if (clean.includes('kids favourite') || clean.includes("parents' choice")) return '⭐';
  if (clean.includes('must-read') || clean.includes('storytime')) return '📚';
  return '⭐'; // fallback
}

/** Get FOMO tag label for a step and rank. Returns null for rank >= 4. */
export function getFOMOTagLabelForStep(
  category: 'educational_toys' | 'developmental_toys' | 'books',
  rank: number
): string | null {
  const labels = FOMO_TAG_LABELS_BY_STEP[category];
  if (!labels || rank < 0 || rank >= labels.length) return null;
  return labels[rank];
}

/** Assign a tag by rank (0 = first by inventory). One tag per toy in banner. */
export function getFOMOTagForRank(rank: number): FOMOToyTag | null {
  if (rank === 0) return 'bestseller';
  if (rank === 1) return 'high_demand';
  if (rank === 2 || rank === 3) return 'parent_favourite';
  return null;
}
